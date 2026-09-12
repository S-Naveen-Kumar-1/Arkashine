// src/redux/actions/bleActions.js
//
// ─── Firmware UUIDs ──────────────────────────────────────────────────────────
//   Service : 12345678-1234-1234-1234-1234567890ab
//   Data    : abcd1234-5678-1234-5678-1234567890ab  (WRITE + NOTIFY same char)
//

import { BleManager } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import { Alert } from 'react-native';
import { showMessage } from 'react-native-flash-message';

import {
  BLE_STATE_CHANGED,
  BLE_SCAN_START,
  BLE_SCAN_STOP,
  BLE_DEVICE_FOUND,
  BLE_CONNECT_REQUEST,
  BLE_CONNECT_SUCCESS,
  BLE_CONNECT_FAILED,
  BLE_DISCONNECT,
  BLE_DATA_RECEIVED,
  BLE_CONFIG_RESOLVED,
  BLE_DEBUG_LOG,
  BLE_DEBUG_CLEAR,
  BLE_CMD_SENT,
  BLE_CMD_FAILED,
  BLE_HANDSHAKE_START,
  BLE_HANDSHAKE_SUCCESS,
  BLE_HANDSHAKE_FAILED,
  BLE_TEST_STARTED,
  BLE_TEST_STOPPED,
  BLE_MOTOR_STATUS,
  BLE_DEVICE_ERROR,
  BLE_CALIBRATION_STATUS,
  BLE_FINAL_RESULT,
  BLE_MIXING_COMPLETE, // ← NEW: add this to src/config/actionTypes.js
  BLE_PRINT_STATUS, // ← NEW: add this to src/config/actionTypes.js
  CAL_POINT_DONE,
} from '../../config/actionTypes';
import { requestBLEPermissions } from '../../utils/permissions';

const FIRMWARE_SERVICE_UUID = '12345678-1234-1234-1234-1234567890ab';
const FIRMWARE_DATA_UUID = 'abcd1234-5678-1234-5678-1234567890ab';

export const bleManager = new BleManager();

let _device = null,
  _config = null,
  _notifySub = null;
let _reconnectTimer = null,
  _scanTimer = null,
  _dataCount = 0;

let _chunkBuffer = '';

// ─── FIX: mixing-completion tracking (module scope — survives remounts) ───
// _prevMotorStatus: last MOTORSTATUS we saw, so we can detect a
//   running -> stopped transition (as opposed to e.g. stopped -> stopped,
//   which is just a redundant/duplicate notification).
// _userStoppedMotor: set true right before we send PHTEST:"STOP" ourselves,
//   so the resulting running -> stopped transition is NOT misread as
//   "the mix finished naturally".
let _prevMotorStatus = null;
let _userStoppedMotor = false;

// ─── Mock/simulated device mode (dev-only) ─────────────────────────────────
// Lets a developer walk through the soil-test / pH-test screen flow without
// a real SoiLENZ device in range. When active, _sendJSON short-circuits into
// _mockSendJSON below instead of writing to a real BLE characteristic, and
// synthesizes the same firmware reply strings a real device would send —
// fed through the existing parsePayload() so every reducer/dispatch path
// behaves exactly as it does for a real connection. Only the transport is
// faked; nothing else about the app needs to know mock mode exists.
let _mockMode = false;
export function isMockModeActive() {
  return _mockMode;
}
const _mock = {
  motorRunning: false,
  motorStartedAt: 0,
  motorDurationMs: 6000,
  soilMotorRunning: false,
  soilMotorStartedAt: 0,
  soilMotorDurationMs: 6000,
  sensorRunning: false,
  sensorStartedAt: 0,
  sensorDurationMs: 6000,
};

// ─── Ack-wait timers — so "waiting for the device" never hangs silently ────
// Cleared as soon as the matching notification arrives; if they fire, the
// device never confirmed in time and we tell the user instead of leaving
// them stuck on a spinner/countdown that may not reflect reality.
const HANDSHAKE_ACK_TIMEOUT_MS = 10_000;
const MOTOR_ACK_TIMEOUT_MS = 8_000;
const SOIL_RESULT_TIMEOUT_MS = 10_000;
// Firmware's motor pulse (_run_mixing_workflow) only runs for MOTORSPEED=200ms
// and sends MIXING_COMPLETED right after — this timeout is generous slack for
// that, NOT the app's separate ~60s soak-time UI wait (those are unrelated).
const MIXING_ACK_TIMEOUT_MS = 5_000;
let _handshakeTimer = null;
let _phMotorAckTimer = null;
let _soilMotorAckTimer = null;
let _soilResultAckTimer = null;
let _soilMixingAckTimer = null;

function _clearHandshakeTimer() {
  if (_handshakeTimer) {
    clearTimeout(_handshakeTimer);
    _handshakeTimer = null;
  }
}

function _armHandshakeTimer(dispatch) {
  _clearHandshakeTimer();
  _handshakeTimer = setTimeout(() => {
    _handshakeTimer = null;
    dispatch(ac.handshakeFailed());
    dispatch(ac.log('HANDSHAKE', '❌ No response within timeout'));
    showMessage({
      message: 'No response from device',
      description: "Check it's powered on and in range, then reconnect.",
      type: 'danger',
      duration: 4000,
    });
  }, HANDSHAKE_ACK_TIMEOUT_MS);
}

function _clearPhMotorAckTimer() {
  if (_phMotorAckTimer) {
    clearTimeout(_phMotorAckTimer);
    _phMotorAckTimer = null;
  }
}

function _armPhMotorAckTimer(dispatch) {
  _clearPhMotorAckTimer();
  _phMotorAckTimer = setTimeout(() => {
    _phMotorAckTimer = null;
    showMessage({
      message: 'No confirmation from device',
      description: 'The motor may not have started. Please try again.',
      type: 'danger',
      duration: 4000,
    });
  }, MOTOR_ACK_TIMEOUT_MS);
}

function _clearSoilMotorAckTimer() {
  if (_soilMotorAckTimer) {
    clearTimeout(_soilMotorAckTimer);
    _soilMotorAckTimer = null;
  }
}

function _armSoilMotorAckTimer(dispatch) {
  _clearSoilMotorAckTimer();
  _soilMotorAckTimer = setTimeout(() => {
    _soilMotorAckTimer = null;
    showMessage({
      message: 'No confirmation from device',
      description: 'The soil test may not have started. Please try again.',
      type: 'danger',
      duration: 4000,
    });
  }, MOTOR_ACK_TIMEOUT_MS);
}

function _clearSoilResultAckTimer() {
  if (_soilResultAckTimer) {
    clearTimeout(_soilResultAckTimer);
    _soilResultAckTimer = null;
  }
}

function _armSoilResultAckTimer(dispatch) {
  _clearSoilResultAckTimer();
  _soilResultAckTimer = setTimeout(() => {
    _soilResultAckTimer = null;
    dispatch({
      type: 'SOIL_RESULT_ERROR',
      payload: 'No result received from the device within the expected time.',
    });
    showMessage({
      message: 'No result received from device',
      description: 'The soil test result never arrived. Please try fetching again.',
      type: 'danger',
      duration: 4000,
    });
  }, SOIL_RESULT_TIMEOUT_MS);
}

function _clearSoilMixingAckTimer() {
  if (_soilMixingAckTimer) {
    clearTimeout(_soilMixingAckTimer);
    _soilMixingAckTimer = null;
  }
}

function _armSoilMixingAckTimer(dispatch) {
  _clearSoilMixingAckTimer();
  _soilMixingAckTimer = setTimeout(() => {
    _soilMixingAckTimer = null;
    dispatch({ type: 'SOIL_MOTOR_STATE', payload: { data: 'mixing_error' } });
    showMessage({
      message: 'Motor pulse not confirmed',
      description: 'The device started but never confirmed the mix — the motor may not have run.',
      type: 'warning',
      duration: 4000,
    });
  }, MIXING_ACK_TIMEOUT_MS);
}

// ─── FIX: self-healing balanced-JSON scanner ───────────────────────────────
// Replaces the old _isCompleteJSON + _extractFirstJSON pair. The old scanner
// could have its brace-depth counter go negative on a single stray '}' (a
// dropped/garbled byte, a mid-chunk split, etc) and would then NEVER see
// depth === 0 again for the rest of the session, since it rescanned the
// whole accumulated buffer — including the poison byte — on every call.
// That silently froze all future dispatches (status/progress/result), which
// is exactly what caused calibrationPhase to get stuck on repeated
// recalibrate cycles. This version resyncs instead of permanently jamming.
function _findBalancedJSON(str) {
  const start = str.indexOf('{');
  if (start === -1) return { status: 'no-object' };

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < str.length; i++) {
    const ch = str[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\' && inString) {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth < 0) {
        // Stray closing brace — unrecoverable from `start`. Drop through
        // this brace and let the caller retry from the next '{' instead of
        // poisoning depth for every future call.
        return { status: 'resync', remainder: str.slice(i + 1) };
      }
      if (depth === 0) {
        return {
          status: 'complete',
          jsonStr: str.slice(start, i + 1),
          remainder: str.slice(i + 1).trim(),
        };
      }
    }
  }
  return { status: 'incomplete' };
}

// Safety valve: if the buffer grows huge without ever completing an object,
// something is permanently desynced. Nuke it rather than hanging forever.
const MAX_BUFFER_LEN = 8000;

// ─── FIX: call this before starting any new calibration/test cycle so
// nothing left over from a previous run/disconnect can poison the new one.
export function resetBleParserBuffer() {
  _chunkBuffer = '';
}

// ─── Action creators ──────────────────────────────────────────────────────────
export const ac = {
  bleStateChanged: s => ({ type: BLE_STATE_CHANGED, payload: s }),
  scanStart: () => ({ type: BLE_SCAN_START }),
  scanStop: () => ({ type: BLE_SCAN_STOP }),
  deviceFound: d => ({ type: BLE_DEVICE_FOUND, payload: d }),
  connectRequest: id => ({ type: BLE_CONNECT_REQUEST, payload: id }),
  connectSuccess: d => ({ type: BLE_CONNECT_SUCCESS, payload: d }),
  connectFailed: e => ({ type: BLE_CONNECT_FAILED, payload: e }),
  disconnect: () => ({ type: BLE_DISCONNECT }),
  dataReceived: d => ({ type: BLE_DATA_RECEIVED, payload: d }),
  configResolved: c => ({ type: BLE_CONFIG_RESOLVED, payload: c }),
  cmdSent: cmd => ({ type: BLE_CMD_SENT, payload: cmd }),
  cmdFailed: err => ({ type: BLE_CMD_FAILED, payload: err }),
  debugClear: () => ({ type: BLE_DEBUG_CLEAR }),
  handshakeStart: () => ({ type: BLE_HANDSHAKE_START }),
  handshakeSuccess: raw => ({ type: BLE_HANDSHAKE_SUCCESS, payload: raw }),
  handshakeFailed: () => ({ type: BLE_HANDSHAKE_FAILED }),
  testStarted: () => ({ type: BLE_TEST_STARTED }),
  testStopped: () => ({ type: BLE_TEST_STOPPED }),
  motorStatus: s => ({ type: BLE_MOTOR_STATUS, payload: s }),
  deviceError: e => ({ type: BLE_DEVICE_ERROR, payload: e }),
  calibrationStatus: s => ({ type: BLE_CALIBRATION_STATUS, payload: s }),
  finalResult: r => ({ type: 'PH_FINAL_RESULT', payload: r }),
  // ← NEW: stage-1 (EC-only) mix result, kept separate from finalResult
  ecResult: r => ({ type: 'PH_EC_RESULT', payload: r }),
  // ← NEW
  mixingComplete: v => ({ type: BLE_MIXING_COMPLETE, payload: v }),
  // ← NEW: { status: 'printing' | 'done' | 'error', message? }
  printStatus: s => ({ type: BLE_PRINT_STATUS, payload: s }),

  log: (tag, message) => ({
    type: BLE_DEBUG_LOG,
    payload: {
      id: Date.now() + Math.random(),
      time: new Date().toLocaleTimeString(),
      tag,
      message,
      fullText: `[${tag}] ${message}`,
    },
  }),
};

export const initBLE = () => dispatch => {
  bleManager.onStateChange(state => {
    dispatch(ac.bleStateChanged(state));
    dispatch(ac.log('BLE', `Adapter → ${state}`));
  }, true);
};

const SCAN_TIMEOUT_MS = 15_000;

export const startScan = () => async dispatch => {
  const granted = await requestBLEPermissions();
  if (!granted) {
    dispatch(ac.log('SCAN', 'Permissions denied'));
    return;
  }
  dispatch(ac.scanStart());
  dispatch(ac.log('SCAN', 'Starting…'));
  bleManager.startDeviceScan(
    null,
    { allowDuplicates: false },
    (err, device) => {
      if (err) {
        dispatch(ac.log('SCAN', `Error: ${err.message}`));
        dispatch(ac.scanStop());
        return;
      }
      if (device)
        dispatch(
          ac.deviceFound({
            id: device.id,
            name: device.name || device.localName || 'Unknown Device',
            rssi: device.rssi,
            localName: device.localName,
          }),
        );
    },
  );
  _scanTimer = setTimeout(() => {
    bleManager.stopDeviceScan();
    dispatch(ac.scanStop());
    dispatch(ac.log('SCAN', 'Auto-stopped after 15 s'));
  }, SCAN_TIMEOUT_MS);
};

export const stopScan = () => dispatch => {
  clearTimeout(_scanTimer);
  bleManager.stopDeviceScan();
  dispatch(ac.scanStop());
  dispatch(ac.log('SCAN', 'Stopped'));
};

async function resolveUUIDs(conn, dispatch) {
  dispatch(ac.log('UUID', `Service: ${FIRMWARE_SERVICE_UUID}`));
  dispatch(ac.log('UUID', `Char   : ${FIRMWARE_DATA_UUID}`));
  try {
    const services = await conn.services();
    const found = services.some(
      s => s.uuid.toLowerCase() === FIRMWARE_SERVICE_UUID.toLowerCase(),
    );
    if (!found)
      dispatch(
        ac.log(
          'UUID',
          `WARNING: not found. Present: ${services
            .map(s => s.uuid)
            .join(', ')}`,
        ),
      );
  } catch (e) {
    dispatch(ac.log('UUID', `Verify skipped: ${e.message}`));
  }
  return {
    serviceUUID: FIRMWARE_SERVICE_UUID,
    notifyUUID: FIRMWARE_DATA_UUID,
    writeUUID: FIRMWARE_DATA_UUID,
  };
}

// Schedules `parsePayload` on a synthesized reply, exactly as if it had
// arrived over the real notify characteristic — same dispatches, same
// timers cleared, same reducers updated.
function _mockReply(obj, dispatch, delayMs = 400) {
  setTimeout(() => {
    parsePayload(JSON.stringify(obj), dispatch);
  }, delayMs);
}

async function _mockSendJSON(payload, dispatch) {
  const jsonStr = JSON.stringify(payload);
  dispatch(ac.log('CMD', `→ ${jsonStr} (simulated)`));
  dispatch(ac.cmdSent(jsonStr));

  if (payload.HANDSHAKE === 'HELLO') {
    _mockReply({ HANDSHAKE: 'ACK' }, dispatch, 500);
  } else if (
    payload.PHTEST === 'START_EC' ||
    payload.PHTEST === 'START_PH' ||
    payload.PHTEST === 'START'
  ) {
    _mock.motorRunning = true;
    _mock.motorStartedAt = Date.now();
    const started =
      payload.PHTEST === 'START_PH'
        ? 'STARTED_PH'
        : payload.PHTEST === 'START_EC'
        ? 'STARTED_EC'
        : 'STARTED';
    _mockReply({ PHTEST: started }, dispatch, 400);
  } else if (payload.PHTEST === 'STOP') {
    _mock.motorRunning = false;
    _mockReply({ PHTEST: 'STOPPED' }, dispatch, 300);
  } else if (payload.CHECKMOTORSTATUS !== undefined) {
    const running =
      _mock.motorRunning &&
      Date.now() - _mock.motorStartedAt < _mock.motorDurationMs;
    if (_mock.motorRunning && !running) _mock.motorRunning = false;
    _mockReply({ MOTORSTATUS: running ? 'running' : 'stopped' }, dispatch, 200);
  } else if (payload.EC_RESULT !== undefined) {
    _mockReply({ EC_RESULT: { ec: 1.42, ecVoltage: 0.87 } }, dispatch, 400);
  } else if (payload.FINAL_RESULT !== undefined) {
    _mockReply(
      {
        FINAL_RESULT: {
          pH: 6.8,
          EC: 1.42,
          pHVoltage: 2.05,
          ECVoltage: 0.87,
          temperature: 27.4,
        },
      },
      dispatch,
      400,
    );
  } else if (payload.CALIBERATE !== undefined) {
    const type = payload.CALIBERATE;
    const voltage = (Math.random() * 0.5 + 1.5).toFixed(3);
    _mockReply(
      {
        CALIBERATE: type,
        STATUS: 'DONE',
        value: payload.value,
        ...(type === 'PH' ? { pHVoltage: voltage } : { ECVoltage: voltage }),
      },
      dispatch,
      600,
    );
  } else if (payload.CALIBRATION_STATUS !== undefined) {
    _mockReply({ CALIBRATION_STATUS: 'done' }, dispatch, 300);
  } else if (payload.SOILTEST === 'START') {
    _mock.soilMotorRunning = true;
    _mock.soilMotorStartedAt = Date.now();
    _mockReply({ SOILTEST: 'STARTED' }, dispatch, 400);
    _mockReply({ SOILTEST: 'MIXING_COMPLETED' }, dispatch, 600);
  } else if (payload.SOILTEST === 'STOP') {
    _mock.soilMotorRunning = false;
    _mockReply({ SOILTEST: 'STOPPED' }, dispatch, 200);
  } else if (payload.CHECKSOILMOTORSTATUS !== undefined) {
    const running =
      _mock.soilMotorRunning &&
      Date.now() - _mock.soilMotorStartedAt < _mock.soilMotorDurationMs;
    if (_mock.soilMotorRunning && !running) _mock.soilMotorRunning = false;
    _mockReply(
      { SOILMOTORSTATUS: running ? 'RUNNING' : 'STOPPED' },
      dispatch,
      200,
    );
  } else if (payload.SOILSENSOR === 'READ') {
    _mock.sensorRunning = true;
    _mock.sensorStartedAt = Date.now();
  } else if (payload.CHECKSOILSENSORSTATUS !== undefined) {
    let status;
    if (!_mock.sensorRunning) {
      status = 'NOT_STARTED';
    } else if (Date.now() - _mock.sensorStartedAt < _mock.sensorDurationMs) {
      status = 'READING';
    } else {
      status = 'SENSOR_READING_DONE';
      _mock.sensorRunning = false;
    }
    _mockReply({ SOILSENSORSTATUS: status }, dispatch, 200);
  } else if (payload.SOILRESULT === 'GET') {
    _mockReply(
      {
        FINALSOILRESULT: {
          ph: 6.8,
          ec: 1.2,
          OC: 0.65,
          N: 280,
          P: 22,
          K: 190,
          Ca: 8.4,
          Mg: 2.1,
          S: 12,
          Fe: 4.8,
          Mn: 3.2,
          Cu: 0.9,
          Zn: 1.1,
          B: 0.4,
        },
      },
      dispatch,
      500,
    );
  } else if (payload.SOILPRINT === 'START') {
    _mockReply({ SOILPRINT: 'STARTED' }, dispatch, 200);
    _mockReply({ SOILPRINT: 'DONE' }, dispatch, 1200);
  }
  return true;
}

async function _sendJSON(payload, dispatch) {
  if (_mockMode) return _mockSendJSON(payload, dispatch);
  if (!_device || !_config) {
    dispatch(ac.log('CMD', 'Not connected — dropped'));
    return false;
  }
  const jsonStr = JSON.stringify(payload);
  const b64 = Buffer.from(jsonStr, 'utf-8').toString('base64');
  dispatch(ac.log('CMD', `→ ${jsonStr}`));
  console.log('[BLE SEND]', jsonStr);
  try {
    await _device.writeCharacteristicWithResponseForService(
      _config.serviceUUID,
      _config.writeUUID,
      b64,
    );
    dispatch(ac.log('CMD', '✅ sent (with-response)'));
    dispatch(ac.cmdSent(jsonStr));
    return true;
  } catch (e1) {
    dispatch(ac.log('CMD', `with-response failed: ${e1.message}`));
  }
  try {
    await _device.writeCharacteristicWithoutResponseForService(
      _config.serviceUUID,
      _config.writeUUID,
      b64,
    );
    dispatch(ac.log('CMD', '✅ sent (without-response)'));
    dispatch(ac.cmdSent(jsonStr));
    return true;
  } catch (e2) {
    const msg = `Both write methods failed: ${e2.message}`;
    dispatch(ac.log('CMD', `❌ ${msg}`));
    dispatch(ac.cmdFailed(msg));
    showMessage({
      message: 'Command failed to send',
      description: 'Check the Bluetooth connection and try again.',
      type: 'danger',
    });
    return false;
  }
}

const normalizeSoil = data => {
  const result = {};
  Object.keys(data).forEach(k => {
    result[k] = data[k] != null ? Number(data[k]) : null;
  });
  return result;
};

function _buildReading(src, raw) {
  _dataCount += 1;
  return {
    ph: src.pH != null ? parseFloat(src.pH) : (src.ph != null ? parseFloat(src.ph) : null),
    ec: src.ec != null ? parseFloat(src.ec) : (src.EC != null ? parseFloat(src.EC) : (src.TDS != null ? parseFloat(src.TDS) : null)),
    voltage: src.pHVoltage != null ? parseFloat(src.pHVoltage) : (src.phVoltage != null ? parseFloat(src.phVoltage) : (src.voltage != null ? parseFloat(src.voltage) : null)),
    ecVoltage: src.ECVoltage != null ? parseFloat(src.ECVoltage) : (src.ecVoltage != null ? parseFloat(src.ecVoltage) : null),
    temperature: src.temperature != null ? parseFloat(src.temperature) : null,
    temperatureFallback: src.temperatureFallback ?? false,
    raw,
    timestamp: Date.now(),
    receivedCount: _dataCount,
  };
}

// ─── FIX: single place that decides "did the mix cycle just complete?" ────
// Called every time we see a MOTORSTATUS notification. Compares against the
// previous status to find a running -> stopped edge, and checks whether we
// ourselves triggered that stop (via cmdStopPhTestMotor). If neither, the
// motor stopped on its own — i.e. it finished — so we dispatch
// mixingComplete(true). This lives here instead of in MixerScreen so it
// keeps working correctly no matter which screen is mounted (or not) when
// the firmware reports it.
function _handleMotorStatusTransition(newStatus, dispatch) {
  const prev = _prevMotorStatus;
  const wasRunning = prev === 'running';
  const isNowStopped = newStatus === 'stopped';

  if (wasRunning && isNowStopped) {
    if (_userStoppedMotor) {
      dispatch(
        ac.log(
          'MOTOR',
          'Stop confirmed (user-initiated) — not marking complete',
        ),
      );
      dispatch(ac.mixingComplete(false));
    } else {
      dispatch(ac.log('MOTOR', 'Motor stopped naturally — mixing complete ✅'));
      dispatch(ac.mixingComplete(true));
    }
  }

  // Starting a new run clears any previous completion flag.
  if (newStatus === 'running') {
    dispatch(ac.mixingComplete(false));
  }

  _userStoppedMotor = false;
  _prevMotorStatus = newStatus;
}

function parsePayload(jsonStr, dispatch) {
  const raw = jsonStr.trim();
  dispatch(ac.log('DATA', `← RECV: ${raw}`));
  console.log('[BLE RECV]', raw);

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (_) {
    dispatch(ac.log('DATA', `Non-JSON ignored: ${raw}`));
    return null;
  }

  if (parsed.STATUS === 'BLE_CONNECTED') {
    dispatch(ac.log('HANDSHAKE', '← BLE_CONNECTED ✅'));
    _clearHandshakeTimer();
    dispatch(ac.handshakeSuccess(raw));
    showMessage({ message: 'Device verified ✅', type: 'success', duration: 1500 });
    return null;
  }

  if (parsed.HANDSHAKE === 'ACK') {
    dispatch(ac.log('HANDSHAKE', '← HANDSHAKE ACK ✅'));
    _clearHandshakeTimer();
    dispatch(ac.handshakeSuccess(raw));
    showMessage({ message: 'Device verified ✅', type: 'success', duration: 1500 });
    return null;
  }

  if (
    parsed.PHTEST === 'STARTED' ||
    parsed.PHTEST === 'STARTED_EC' ||
    parsed.PHTEST === 'STARTED_PH'
  ) {
    dispatch(ac.log('TEST', `← PHTEST ${parsed.PHTEST}`));
    _clearPhMotorAckTimer();
    dispatch(ac.testStarted());
    showMessage({ message: 'Motor started ✅', type: 'success', duration: 1500 });
    return null;
  }

  if (parsed.PHTEST === 'STOPPED') {
    dispatch(ac.log('TEST', '← PHTEST STOPPED'));
    _clearPhMotorAckTimer();
    dispatch(ac.testStopped());
    _handleMotorStatusTransition('stopped', dispatch);
    dispatch(ac.motorStatus('stopped'));
    return null;
  }

  if (parsed.MOTORSTATUS !== undefined) {
    const s = parsed.MOTORSTATUS.toLowerCase();
    dispatch(ac.log('MOTOR', `← MOTORSTATUS: ${s}`));
    _handleMotorStatusTransition(s, dispatch);
    dispatch(ac.motorStatus(s));
    return null;
  }

  // ─── Print status ──────────────────────────────────────────────────────
  // NOTE: this is checked before the generic `parsed.ERROR` handler below
  // on purpose — the firmware sends print failures as
  // {"SOILPRINT":"ERROR","MESSAGE":"..."} (no top-level "ERROR" key) so
  // this never actually collides with it, but keeping the check early
  // means it can't accidentally get shadowed if that ever changes.
  if (parsed.SOILPRINT === 'STARTED') {
    dispatch(ac.log('PRINT', '← SOILPRINT STARTED'));
    dispatch(ac.printStatus({ status: 'printing' }));
    return null;
  }
  if (parsed.SOILPRINT === 'DONE') {
    dispatch(ac.log('PRINT', '← SOILPRINT DONE'));
    dispatch(ac.printStatus({ status: 'done' }));
    return null;
  }
  // Firmware sends the printed-to-console-only fallback (no physical
  // printer attached) as its own status, distinct from DONE/ERROR.
  if (parsed.SOILPRINT === 'PRINTED_CONSOLE') {
    dispatch(
      ac.log('PRINT', `← SOILPRINT PRINTED_CONSOLE: ${parsed.message || ''}`),
    );
    dispatch(
      ac.printStatus({
        status: 'done',
        message: parsed.message || 'Printed to console only',
      }),
    );
    return null;
  }
  if (parsed.SOILPRINT === 'ERROR') {
    // Firmware's actual key is lowercase "message" (not "MESSAGE").
    const errMsg = parsed.message || parsed.MESSAGE || 'unknown';
    dispatch(ac.log('PRINT', `← SOILPRINT ERROR: ${errMsg}`));
    dispatch(ac.printStatus({ status: 'error', message: errMsg }));
    return null;
  }

  if (parsed.CALIBERATE && parsed.STATUS === 'DONE') {
    const type = parsed.CALIBERATE;
    const value = parseFloat(parsed.value);
    const voltage =
      type === 'PH'
        ? parseFloat(parsed.pHVoltage)
        : parseFloat(parsed.ECVoltage);
    dispatch(ac.log('CAL', `← ${type} DONE — value=${value}`));
    dispatch({ type: CAL_POINT_DONE, payload: { type, value, voltage } });
    showMessage({
      message: `${type} calibration point confirmed ✅`,
      type: 'success',
      duration: 1500,
    });
    return null;
  }

  if (parsed.CALIBRATION_STATUS !== undefined) {
    dispatch(
      ac.log('CAL', `← CALIBRATION_STATUS: ${parsed.CALIBRATION_STATUS}`),
    );
    dispatch(ac.calibrationStatus(parsed.CALIBRATION_STATUS));
    return null;
  }

  if (parsed.FINAL_RESULT && typeof parsed.FINAL_RESULT === 'object') {
    const reading = _buildReading(parsed.FINAL_RESULT, raw);
    dispatch(ac.log('FINAL', `← FINAL_RESULT pH=${reading.ph}`));
    dispatch(ac.finalResult(reading));
    showMessage({ message: 'Results received ✅', type: 'success', duration: 1500 });
    return reading;
  }

  // ← {"EC_RESULT":{"ec":...,"ecVoltage":...}}  stage-1 (EC-only) mix result
  if (parsed.EC_RESULT && typeof parsed.EC_RESULT === 'object') {
    const ec = parsed.EC_RESULT.ec != null ? parseFloat(parsed.EC_RESULT.ec) : null;
    const ecVoltage =
      parsed.EC_RESULT.ecVoltage != null
        ? parseFloat(parsed.EC_RESULT.ecVoltage)
        : null;
    dispatch(ac.log('FINAL', `← EC_RESULT ec=${ec}`));
    dispatch(ac.ecResult({ ec, ecVoltage }));
    showMessage({ message: 'EC result received ✅', type: 'success', duration: 1500 });
    return null;
  }

  if (parsed.ERROR) {
    dispatch(ac.log('ERROR', `← Device ERROR: ${parsed.ERROR}`));
    dispatch(ac.deviceError(parsed.ERROR));
    // Covers {"FINALSOILRESULT":null,"ERROR":"No result yet"} — a definitive
    // reply, so stop waiting instead of letting the ack timer also fire.
    if ('FINALSOILRESULT' in parsed) {
      _clearSoilResultAckTimer();
      dispatch({ type: 'SOIL_RESULT_ERROR', payload: parsed.ERROR });
    }
    return null;
  }

  if (parsed.pH !== undefined || parsed.TDS !== undefined) {
    const reading = _buildReading(parsed, raw);
    dispatch(ac.log('DATA', `← Sensor #${_dataCount} pH=${reading.ph}`));
    return reading;
  }

  // ─── Soil test messages ───────────────────────────────────────────────────
  if (parsed.SOILTEST === 'STARTED') {
    _clearSoilMotorAckTimer();
    _armSoilMixingAckTimer(dispatch);
    dispatch(ac.motorStatus('running'));
    dispatch({ type: 'SOIL_MOTOR_STATE', payload: { data: 'running' } });
    showMessage({ message: 'Motor started ✅', type: 'success', duration: 1500 });
  }
  if (parsed.SOILTEST === 'MIXING_COMPLETED') {
    _clearSoilMixingAckTimer();
    dispatch({
      type: 'SOIL_MOTOR_STATE',
      payload: { data: 'mixing completed' },
    });
  }
  // ← real device ack for {"SOILTEST":"STOP"}, previously unhandled/ignored
  if (parsed.SOILTEST === 'STOPPED') {
    dispatch(ac.log('TEST', '← SOILTEST STOPPED'));
    dispatch(ac.motorStatus('stopped'));
    dispatch({ type: 'SOIL_MOTOR_STATE', payload: { data: 'stopped' } });
  }
  if (parsed.SOILMOTORSTATUS === 'RUNNING')
    dispatch({
      type: 'SOIL_MOTOR_STATE_FROM_BLE',
      payload: { data: 'running' },
    });
  if (parsed.SOILMOTORSTATUS === 'NOT_STARTED')
    dispatch({
      type: 'SOIL_MOTOR_STATE_FROM_BLE',
      payload: { data: 'not_started' },
    });
  if (parsed.SOILMOTORSTATUS === 'STOPPED')
    dispatch({
      type: 'SOIL_MOTOR_STATE_FROM_BLE',
      payload: { data: 'stopped' },
    });

  if (parsed.SOILSENSORSTATUS === 'READING')
    dispatch({
      type: 'SOIL_SENSOR_STATE_FROM_BLE',
      payload: { data: 'reading' },
    });
  if (parsed.SOILSENSORSTATUS === 'RUNNING')
    dispatch({
      type: 'SOIL_SENSOR_STATE_FROM_BLE',
      payload: { data: 'running' },
    });
  if (parsed.SOILSENSORSTATUS === 'NOT_STARTED')
    dispatch({
      type: 'SOIL_SENSOR_STATE_FROM_BLE',
      payload: { data: 'not_started' },
    });
  if (parsed.SOILSENSORSTATUS === 'SENSOR_READING_DONE')
    dispatch({
      type: 'SOIL_SENSOR_STATE_FROM_BLE',
      payload: { data: 'sensor_reading_done' },
    });
  if (parsed.SOILSENSORSTATUS === 'STOPPED')
    dispatch({
      type: 'SOIL_SENSOR_STATE_FROM_BLE',
      payload: { data: 'stopped' },
    });

  // ─── Soil calibration messages ─────────────────────────────────────────────
  if (parsed.SOILCALIBRATION === 'STARTED') {
    console.log('[BLE] SOILCALIBRATION STARTED');
    dispatch(ac.log('CAL', '← SOILCALIBRATION STARTED'));
    dispatch({ type: 'SOIL_CALIBRATION_START', payload: { data: 'started' } });
    return null;
  }

  if (parsed.SOILCALIBRATION === 'STOPPED') {
    console.log('[BLE] SOILCALIBRATION STOPPED');
    dispatch(ac.log('CAL', '← SOILCALIBRATION STOPPED'));
    dispatch({
      type: 'SOIL_CALIBRATION_STOPPED',
      payload: { data: 'stopped' },
    });
    return null;
  }

  if (parsed.SOILCALIBRATION === 'COMPLETE') {
    console.log('[BLE] SOILCALIBRATION COMPLETE');
    dispatch(ac.log('CAL', '← SOILCALIBRATION COMPLETE'));
    dispatch({
      type: 'SOIL_CALIBRATION_COMPLETE',
      payload: { data: 'complete' },
    });
    return null;
  }

  if (parsed.SOILCALIBRATIONPROGRESS !== undefined) {
    const p = parsed.SOILCALIBRATIONPROGRESS || {};
    console.log(
      '[BLE] PROGRESS:',
      p.nutrient,
      p.point,
      p.phase,
      p.loop,
      '/',
      p.total,
    );
    dispatch(
      ac.log(
        'CAL',
        `← progress ${p.nutrient}/${p.point} ${p.phase} loop ${p.loop}/${p.total}`,
      ),
    );
    dispatch({
      type: 'SOIL_CALIBRATION_PROGRESS',
      payload: {
        nutrient: p.nutrient || null,
        point: p.point || null,
        phase: p.phase || 'spectral',
        loop: Number(p.loop) || 0,
        total: Number(p.total) || 100,
        channels: p.channels || {},
      },
    });
    return null;
  }

  if (parsed.SOILCALIBRATIONSTATUS !== undefined) {
    const status = parsed.SOILCALIBRATIONSTATUS;
    console.log('[BLE] STATUS:', status);
    dispatch(ac.log('CAL', `← SOILCALIBRATIONSTATUS: ${status}`));
    dispatch({ type: 'SOIL_CALIBRATION_STATUS', payload: { status } });
    dispatch(ac.calibrationStatus(status));
    return null;
  }

  if (parsed.SOILCALIBRATE && parsed.SOILCALIBRATE.status === 'DONE') {
    const point = parsed.SOILCALIBRATE.point;
    const nutrients = parsed.SOILCALIBRATE.nutrients || [];
    const results = parsed.SOILCALIBRATE.results || {};
    console.log('[BLE] RESULT DONE:', point, nutrients);
    dispatch(ac.log('CAL', `← SOILCALIBRATE DONE point=${point}`));
    dispatch({
      type: 'SOIL_CALIBRATION_RESULT',
      payload: { point, nutrients, results, error: null },
    });
    return null;
  }

  if (parsed.SOILCALIBRATE && parsed.SOILCALIBRATE.status === 'ERROR') {
    console.log('[BLE] RESULT ERROR:', parsed.ERROR);
    dispatch(
      ac.log('CAL', `← SOILCALIBRATE ERROR: ${parsed.ERROR || 'unknown'}`),
    );
    dispatch({
      type: 'SOIL_CALIBRATION_RESULT',
      payload: {
        point: parsed.SOILCALIBRATE.point,
        nutrients: parsed.SOILCALIBRATE.nutrients || [],
        results: {},
        error: parsed.ERROR || 'Calibration failed',
      },
    });
    return null;
  }

  if (parsed.SOILCALIBRATIONDATA !== undefined) {
    console.log('[BLE] DATA received');
    dispatch(ac.log('CAL', '← SOILCALIBRATIONDATA received'));
    dispatch({
      type: 'SOIL_CALIBRATION_DATA',
      payload: parsed.SOILCALIBRATIONDATA,
    });
    return null;
  }

  if (parsed.FINALSOILRESULT && typeof parsed.FINALSOILRESULT === 'object') {
    _clearSoilResultAckTimer();
    dispatch({
      type: 'SOIL_BLE_RESULT',
      payload: normalizeSoil(parsed.FINALSOILRESULT),
    });
    return parsed.FINALSOILRESULT;
  }

  dispatch(ac.log('DATA', `← Unhandled JSON ignored: ${raw}`));
  return null;
}

// ─── FIX: rewritten notify loop using the self-healing scanner ─────────────
function startNotifications(device, cfg, dispatch) {
  _notifySub?.remove();
  _chunkBuffer = '';
  dispatch(
    ac.log('NOTIFY', `Subscribing S:${cfg.serviceUUID} C:${cfg.notifyUUID}`),
  );

  _notifySub = device.monitorCharacteristicForService(
    cfg.serviceUUID,
    cfg.notifyUUID,
    async (err, char) => {
      if (err) {
        dispatch(ac.log('NOTIFY', `Error: ${err.message}`));
        return;
      }
      if (!char?.value) return;

      try {
        const chunk = Buffer.from(char.value, 'base64').toString('utf-8');
        dispatch(ac.log('RAW', `CHUNK(${chunk.length}B) → ${chunk}`));
        console.log('[BLE RAW CHUNK]', chunk);

        _chunkBuffer += chunk;

        if (_chunkBuffer.length > MAX_BUFFER_LEN) {
          dispatch(
            ac.log(
              'RAW',
              `Buffer exceeded ${MAX_BUFFER_LEN}B — resyncing (desync detected)`,
            ),
          );
          console.warn(
            '[BLE] Buffer desync — clearing',
            _chunkBuffer.length,
            'bytes',
          );
          _chunkBuffer = '';
          return;
        }

        while (true) {
          const result = _findBalancedJSON(_chunkBuffer);

          if (result.status === 'no-object') {
            _chunkBuffer = '';
            break;
          }
          if (result.status === 'incomplete') {
            dispatch(
              ac.log(
                'RAW',
                `INCOMPLETE(${_chunkBuffer.length}B) — waiting for next chunk…`,
              ),
            );
            break;
          }
          if (result.status === 'resync') {
            dispatch(ac.log('RAW', 'Stray brace detected — resyncing parser'));
            console.warn('[BLE] Stray brace — resyncing');
            _chunkBuffer = result.remainder;
            continue;
          }

          // status === 'complete'
          const { jsonStr, remainder } = result;
          _chunkBuffer = remainder;

          dispatch(ac.log('RAW', `FULL JSON → ${jsonStr}`));
          console.log('[BLE FULL JSON]', jsonStr);

          if (remainder.length > 0)
            dispatch(
              ac.log('RAW', `REMAINDER(${remainder.length}B) → ${remainder}`),
            );

          const reading = parsePayload(jsonStr, dispatch);
          if (reading) dispatch(ac.dataReceived(reading));

          // Yield one macrotask so React commits THIS message's state
          // before the next buffered message is processed — fixes the
          // batched-dispatch UI lag from earlier.
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      } catch (e) {
        dispatch(ac.log('NOTIFY', `Parse error: ${e.message}`));
        _chunkBuffer = '';
      }
    },
  );

  dispatch(ac.log('NOTIFY', 'Subscribed ✅'));
}

export const connectDevice = rawDevice => async dispatch => {
  dispatch(ac.connectRequest(rawDevice.id));
  dispatch(ac.log('CONNECT', `→ ${rawDevice.name || rawDevice.id}`));
  clearTimeout(_scanTimer);
  bleManager.stopDeviceScan();
  dispatch(ac.scanStop());
  try {
    const conn = await bleManager.connectToDevice(rawDevice.id, {
      timeout: 8_000,
    });
    dispatch(ac.log('CONNECT', 'Connected — discovering services…'));
    await conn.discoverAllServicesAndCharacteristics();

    // Request MTU non-blocking so it doesn't add delay on Android
    conn.requestMTU(512).then(mtu => {
      dispatch(ac.log('CONNECT', `MTU negotiated: ${mtu}`));
    }).catch(mtuErr => {
      dispatch(ac.log('CONNECT', `MTU request non-fatal: ${mtuErr.message}`));
    });

    const cfg = {
      serviceUUID: FIRMWARE_SERVICE_UUID,
      notifyUUID: FIRMWARE_DATA_UUID,
      writeUUID: FIRMWARE_DATA_UUID,
    };
    _device = conn;
    _config = cfg;
    _dataCount = 0;
    dispatch(ac.configResolved(cfg));
    dispatch(
      ac.connectSuccess({ id: conn.id, name: conn.name || rawDevice.name }),
    );
    startNotifications(conn, cfg, dispatch);
    dispatch(ac.handshakeStart());
    dispatch(ac.log('HANDSHAKE', '→ {"HANDSHAKE":"HELLO"}'));
    showMessage({
      message: 'Connecting…',
      description: 'Waiting for device handshake',
      type: 'info',
      duration: 2000,
    });
    _armHandshakeTimer(dispatch);
    _sendJSON({ HANDSHAKE: 'HELLO' }, dispatch);

    conn.onDisconnected(() => {
      dispatch(ac.log('DISCONNECT', 'Device disconnected'));
      dispatch(ac.disconnect());
      // Surface the drop immediately, whatever flow/screen is in progress
      // (mixing, sensor read, print, calibration, …) — a stuck spinner
      // waiting on a notification that will now never arrive is worse
      // than an explicit "disconnected" message.
      _clearHandshakeTimer();
      _clearPhMotorAckTimer();
      _clearSoilMotorAckTimer();
      _clearSoilResultAckTimer();
      _clearSoilMixingAckTimer();
      showMessage({
        message: 'Device disconnected',
        description: 'Bluetooth connection lost. Attempting to reconnect…',
        type: 'danger',
        duration: 4000,
      });
      _notifySub?.remove();
      _notifySub = null;
      _device = null;
      _config = null;
      _chunkBuffer = '';
      _reconnectTimer = setTimeout(async () => {
        try {
          dispatch(ac.log('RECONNECT', 'Attempting…'));
          const r = await bleManager.connectToDevice(conn.id, {
            timeout: 6_000,
          });
          await r.discoverAllServicesAndCharacteristics();

          r.requestMTU(512).catch(() => {});

          const newCfg = {
            serviceUUID: FIRMWARE_SERVICE_UUID,
            notifyUUID: FIRMWARE_DATA_UUID,
            writeUUID: FIRMWARE_DATA_UUID,
          };
          _device = r;
          _config = newCfg;
          dispatch(ac.configResolved(newCfg));
          dispatch(ac.connectSuccess({ id: r.id, name: r.name }));
          startNotifications(r, newCfg, dispatch);
          dispatch(ac.handshakeStart());
          _armHandshakeTimer(dispatch);
          _sendJSON({ HANDSHAKE: 'HELLO' }, dispatch);
          dispatch(ac.log('RECONNECT', 'Success ✅'));
        } catch (e) {
          dispatch(ac.log('RECONNECT', `Failed: ${e.message}`));
        }
      }, 2_000);
    });
  } catch (e) {
    dispatch(ac.log('CONNECT', `Error: ${e.message}`));
    dispatch(ac.connectFailed(e.message));
    Alert.alert('Connection Failed', e.message);
  }
};

export const disconnectDevice = () => dispatch => {
  dispatch(ac.log('DISCONNECT', 'User initiated'));
  clearTimeout(_reconnectTimer);
  clearTimeout(_scanTimer);
  _notifySub?.remove();
  _notifySub = null;
  _chunkBuffer = '';
  _device?.cancelConnection();
  _device = null;
  _config = null;
  _mockMode = false;
  dispatch(ac.disconnect());
};

// ─── Simulated device (dev-only) ───────────────────────────────────────────
// Skips real scanning/pairing entirely and fakes a successful connect +
// handshake so the soil-test / pH-test screen flow can be exercised without
// a physical SoiLENZ in range. See _mockSendJSON above for the simulated
// firmware replies this drives once commands start flowing.
export const connectMockDevice = () => async dispatch => {
  const mockId = 'MOCK-SOILENZ-0001';
  const cfg = {
    serviceUUID: FIRMWARE_SERVICE_UUID,
    notifyUUID: FIRMWARE_DATA_UUID,
    writeUUID: FIRMWARE_DATA_UUID,
  };
  _mockMode = true;
  _device = null;
  _config = cfg;
  _dataCount = 0;
  dispatch(ac.connectRequest(mockId));
  dispatch(ac.log('CONNECT', 'Simulated device — no real BLE hardware'));
  await new Promise(resolve => setTimeout(resolve, 300));
  dispatch(ac.configResolved(cfg));
  dispatch(
    ac.connectSuccess({ id: mockId, name: 'SoiLENZ (Simulated)' }),
  );
  dispatch(ac.handshakeStart());
  _armHandshakeTimer(dispatch);
  _sendJSON({ HANDSHAKE: 'HELLO' }, dispatch);
};

// ph test ble commands
// ─── EC-only mix (stage 1 of the two-stage ph-bottle procedure) ───────────
// Does NOT set motorStatus optimistically — the real {"PHTEST":"STARTED_EC"}
// ack (handled in parsePayload) is what flips motorStatus to 'running', so
// the UI never shows "running" before the device actually confirms it.
export const cmdStartPhTestMotorEc = () => async dispatch => {
  _userStoppedMotor = false;
  dispatch(ac.mixingComplete(false));
  showMessage({
    message: 'Start command sent',
    description: 'Waiting for device to begin EC mixing…',
    type: 'info',
    duration: 2000,
  });
  _armPhMotorAckTimer(dispatch);
  const ok = await _sendJSON({ PHTEST: 'START_EC' }, dispatch);
  if (!ok) _clearPhMotorAckTimer();
  return ok;
};

// ─── pH-only mix (stage 2, after the user swaps in the pH meter) ──────────
export const cmdStartPhTestMotorPh = () => async dispatch => {
  _userStoppedMotor = false;
  dispatch(ac.mixingComplete(false));
  showMessage({
    message: 'Start command sent',
    description: 'Waiting for device to begin pH mixing…',
    type: 'info',
    duration: 2000,
  });
  _armPhMotorAckTimer(dispatch);
  const ok = await _sendJSON({ PHTEST: 'START_PH' }, dispatch);
  if (!ok) _clearPhMotorAckTimer();
  return ok;
};

// Kept as an alias for any existing call site expecting the old single-stage
// behavior (e.g. TimerScreen's pre-soil-test mix) — defaults to the EC stage,
// which is what this command used to do end-to-end.
export const cmdStartPhTestMotor = () => cmdStartPhTestMotorEc();

export const cmdStopPhTestMotor = () => async dispatch => {
  _userStoppedMotor = true;
  _prevMotorStatus = 'stopped';
  _clearPhMotorAckTimer();
  dispatch(ac.motorStatus('stopped'));
  dispatch(ac.mixingComplete(false));
  showMessage({ message: 'Stop command sent', type: 'info', duration: 1500 });
  return _sendJSON({ PHTEST: 'STOP' }, dispatch);
};

export const cmdCheckMotorStatus = () => dispatch =>
  _sendJSON({ CHECKMOTORSTATUS: 'CHECKMOTORSTATUS' }, dispatch);
export const cmdCalibratePhPoint = standardPH => dispatch => {
  showMessage({
    message: 'Waiting for device to confirm calibration point…',
    type: 'info',
    duration: 2000,
  });
  return _sendJSON({ CALIBERATE: 'PH', value: Number(standardPH) }, dispatch);
};
export const cmdCalibrateEcPoint = standardEC => dispatch => {
  showMessage({
    message: 'Waiting for device to confirm calibration point…',
    type: 'info',
    duration: 2000,
  });
  return _sendJSON({ CALIBERATE: 'EC', value: Number(standardEC) }, dispatch);
};
export const cmdCheckCalibrationStatus = () => dispatch =>
  _sendJSON({ CALIBRATION_STATUS: true }, dispatch);
export const cmdGetFinalResult = () => dispatch => {
  showMessage({ message: 'Fetching results…', type: 'info', duration: 2000 });
  return _sendJSON({ FINAL_RESULT: 'FINAL_RESULT' }, dispatch);
};
// ─── Stage-1 EC-only result fetch ──────────────────────────────────────────
export const cmdGetEcResult = () => dispatch => {
  showMessage({ message: 'Fetching EC result…', type: 'info', duration: 2000 });
  return _sendJSON({ EC_RESULT: 'EC_RESULT' }, dispatch);
};
export const clearDebugLog = () => dispatch => dispatch(ac.debugClear());

// ─── Retry a stuck handshake without a full reconnect ──────────────────────
export const retryHandshake = () => dispatch => {
  dispatch(ac.handshakeStart());
  dispatch(ac.log('HANDSHAKE', '→ retry {"HANDSHAKE":"HELLO"}'));
  showMessage({
    message: 'Retrying…',
    description: 'Waiting for device handshake',
    type: 'info',
    duration: 2000,
  });
  _armHandshakeTimer(dispatch);
  return _sendJSON({ HANDSHAKE: 'HELLO' }, dispatch);
};

// ─── Soil test commands ───────────────────────────────────────────────────────
export const cmdStartSoilTest = () => async dispatch => {
  _userStoppedMotor = false;
  showMessage({
    message: 'Start command sent',
    description: 'Waiting for device to begin the soil test…',
    type: 'info',
    duration: 2000,
  });
  _armSoilMotorAckTimer(dispatch);
  const ok = await _sendJSON({ SOILTEST: 'START' }, dispatch);
  if (!ok) _clearSoilMotorAckTimer();
  return ok;
};

export const cmdStopSoilTest = () => dispatch => {
  _userStoppedMotor = true;
  _prevMotorStatus = 'stopped';
  _clearSoilMotorAckTimer();
  _clearSoilMixingAckTimer();
  dispatch(ac.motorStatus('stopped'));
  dispatch({ type: 'SOIL_MOTOR_STATE', payload: { data: 'Stopped' } });
  showMessage({ message: 'Stop command sent', type: 'info', duration: 1500 });
  return _sendJSON({ SOILTEST: 'STOP' }, dispatch);
};
export const cmdCheckSoilMotorStatus = () => dispatch =>
  _sendJSON({ CHECKSOILMOTORSTATUS: 'CHECKSOILMOTORSTATUS' }, dispatch);
export const cmdStartSoilSensor = () => dispatch =>
  _sendJSON({ SOILSENSOR: 'READ' }, dispatch);
export const cmdCheckSoilSensorStatus = () => dispatch =>
  _sendJSON({ CHECKSOILSENSORSTATUS: 'CHECKSOILSENSORSTATUS' }, dispatch);
export const cmdGetSoilResult = () => async dispatch => {
  dispatch({ type: 'SOIL_RESULT_ERROR', payload: null });
  _armSoilResultAckTimer(dispatch);
  const ok = await _sendJSON({ SOILRESULT: 'GET' }, dispatch);
  if (!ok) _clearSoilResultAckTimer();
  return ok;
};

// ─── FIX: PRINT SOIL RESULT — pure trigger, no payload ──────────────────────
// Previously this sent the full report (all nutrients + fertilizer schedule
// text + the AI insights paragraph) as one BLE characteristic write. That
// easily exceeded a single write's usable ATT payload (~509B even at a
// negotiated 512 MTU — react-native-ble-plx does not auto-chunk writes), so
// the write silently failed/truncated. The Pi's fragment buffer then never
// saw a complete JSON object, so it never replied at all — that's why the
// print button spun forever and the printer never started.
//
// Fix: the Raspberry Pi already has this exact reading's data in memory
// (same globals its own on-screen "PRINT RECEIPT" button uses), so this is
// now just a trigger. See _run_ble_soil_print_workflow() in main_ble.py.
export const cmdPrintSoilResult = () => dispatch =>
  _sendJSON({ SOILPRINT: 'START' }, dispatch);

// ─── Soil calibration commands ─────────────────────────────────────────────────
// FIX: resetBleParserBuffer() before every START — nothing from a previous
// run/disconnect can bleed into and poison the new cycle's parsing.
export const cmdStartSoilCalibration =
  (nutrients, point, value) => dispatch => {
    resetBleParserBuffer();
    return _sendJSON(
      {
        SOILCALIBRATION: 'START',
        nutrients: Array.isArray(nutrients) ? nutrients : [nutrients],
        point,
        ...(value != null ? { value } : {}),
      },
      dispatch,
    );
  };

export const cmdStopSoilCalibration = () => dispatch =>
  _sendJSON({ SOILCALIBRATION: 'STOP' }, dispatch);
export const cmdCheckSoilCalibrationStatus = () => dispatch =>
  _sendJSON({ SOILCALIBRATIONSTATUS: true }, dispatch);
export const cmdGetSoilCalibrationData = () => dispatch =>
  _sendJSON({ SOILCALIBRATIONDATA: 'GET' }, dispatch);