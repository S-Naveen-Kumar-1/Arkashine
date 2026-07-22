// src/redux/actions/bleActions.js
//
// ─── Firmware UUIDs ──────────────────────────────────────────────────────────
//   Service : 12345678-1234-1234-1234-1234567890ab
//   Data    : abcd1234-5678-1234-5678-1234567890ab  (WRITE + NOTIFY same char)
//
import { BleManager } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import { Alert } from 'react-native';

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

async function _sendJSON(payload, dispatch) {
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
    ph: src.pH != null ? parseFloat(src.pH) : null,
    ec: src.TDS != null ? parseFloat(src.TDS) : null,
    voltage: src.pHVoltage != null ? parseFloat(src.pHVoltage) : null,
    ecVoltage: src.ECVoltage != null ? parseFloat(src.ECVoltage) : null,
    temperature: src.temperature != null ? parseFloat(src.temperature) : null,
    temperatureFallback: src.temperatureFallback ?? false,
    raw,
    timestamp: Date.now(),
    receivedCount: _dataCount,
  };
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
    dispatch(ac.handshakeSuccess(raw));
    return null;
  }

  if (parsed.HANDSHAKE === 'ACK') {
    dispatch(ac.log('HANDSHAKE', '← HANDSHAKE ACK ✅'));
    dispatch(ac.handshakeSuccess(raw));
    return null;
  }

  if (parsed.PHTEST === 'STARTED') {
    dispatch(ac.log('TEST', '← PHTEST STARTED'));
    dispatch(ac.testStarted());
    return null;
  }

  if (parsed.PHTEST === 'STOPPED') {
    dispatch(ac.log('TEST', '← PHTEST STOPPED'));
    dispatch(ac.testStopped());
    dispatch(ac.motorStatus('stopped'));
    return null;
  }

  if (parsed.MOTORSTATUS !== undefined) {
    const s = parsed.MOTORSTATUS.toLowerCase();
    dispatch(ac.log('MOTOR', `← MOTORSTATUS: ${s}`));
    dispatch(ac.motorStatus(s));
    return null;
  }

  if (parsed.CALIBERATE && parsed.STATUS === 'DONE') {
    const type = parsed.CALIBERATE;
    const value = parseFloat(parsed.value);
    const voltage = type === 'PH' ? parseFloat(parsed.pHVoltage) : parseFloat(parsed.ECVoltage);
    dispatch(ac.log('CAL', `← ${type} DONE — value=${value}`));
    dispatch({ type: CAL_POINT_DONE, payload: { type, value, voltage } });
    return null;
  }

  if (parsed.CALIBRATION_STATUS !== undefined) {
    dispatch(ac.log('CAL', `← CALIBRATION_STATUS: ${parsed.CALIBRATION_STATUS}`));
    dispatch(ac.calibrationStatus(parsed.CALIBRATION_STATUS));
    return null;
  }

  if (parsed.FINAL_RESULT && typeof parsed.FINAL_RESULT === 'object') {
    const reading = _buildReading(parsed.FINAL_RESULT, raw);
    dispatch(ac.log('FINAL', `← FINAL_RESULT pH=${reading.ph}`));
    dispatch(ac.finalResult(reading));
    return reading;
  }

  if (parsed.ERROR) {
    dispatch(ac.log('ERROR', `← Device ERROR: ${parsed.ERROR}`));
    dispatch(ac.deviceError(parsed.ERROR));
    return null;
  }

  if (parsed.pH !== undefined || parsed.TDS !== undefined) {
    const reading = _buildReading(parsed, raw);
    dispatch(ac.log('DATA', `← Sensor #${_dataCount} pH=${reading.ph}`));
    return reading;
  }

  // ─── Soil test messages ───────────────────────────────────────────────────
  if (parsed.SOILTEST === 'STARTED')
    dispatch({ type: 'SOIL_MOTOR_STATE', payload: { data: 'running' } });
  if (parsed.SOILTEST === 'MIXING_COMPLETED')
    dispatch({ type: 'SOIL_MOTOR_STATE', payload: { data: 'mixing completed' } });

  if (parsed.SOILMOTORSTATUS === 'RUNNING')
    dispatch({ type: 'SOIL_MOTOR_STATE_FROM_BLE', payload: { data: 'running' } });
  if (parsed.SOILMOTORSTATUS === 'NOT_STARTED')
    dispatch({ type: 'SOIL_MOTOR_STATE_FROM_BLE', payload: { data: 'not_started' } });
  if (parsed.SOILMOTORSTATUS === 'STOPPED')
    dispatch({ type: 'SOIL_MOTOR_STATE_FROM_BLE', payload: { data: 'stopped' } });

  if (parsed.SOILSENSORSTATUS === 'READING')
    dispatch({ type: 'SOIL_SENSOR_STATE_FROM_BLE', payload: { data: 'reading' } });
  if (parsed.SOILSENSORSTATUS === 'RUNNING')
    dispatch({ type: 'SOIL_SENSOR_STATE_FROM_BLE', payload: { data: 'running' } });
  if (parsed.SOILSENSORSTATUS === 'NOT_STARTED')
    dispatch({ type: 'SOIL_SENSOR_STATE_FROM_BLE', payload: { data: 'not_started' } });
  if (parsed.SOILSENSORSTATUS === 'SENSOR_READING_DONE')
    dispatch({ type: 'SOIL_SENSOR_STATE_FROM_BLE', payload: { data: 'sensor_reading_done' } });
  if (parsed.SOILSENSORSTATUS === 'STOPPED')
    dispatch({ type: 'SOIL_SENSOR_STATE_FROM_BLE', payload: { data: 'stopped' } });

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
    dispatch({ type: 'SOIL_CALIBRATION_STOPPED', payload: { data: 'stopped' } });
    return null;
  }

  if (parsed.SOILCALIBRATION === 'COMPLETE') {
    console.log('[BLE] SOILCALIBRATION COMPLETE');
    dispatch(ac.log('CAL', '← SOILCALIBRATION COMPLETE'));
    dispatch({ type: 'SOIL_CALIBRATION_COMPLETE', payload: { data: 'complete' } });
    return null;
  }

  if (parsed.SOILCALIBRATIONPROGRESS !== undefined) {
    const p = parsed.SOILCALIBRATIONPROGRESS || {};
    console.log('[BLE] PROGRESS:', p.nutrient, p.point, p.phase, p.loop, '/', p.total);
    dispatch(ac.log('CAL', `← progress ${p.nutrient}/${p.point} ${p.phase} loop ${p.loop}/${p.total}`));
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
    dispatch(ac.log('CAL', `← SOILCALIBRATE ERROR: ${parsed.ERROR || 'unknown'}`));
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
    dispatch({ type: 'SOIL_CALIBRATION_DATA', payload: parsed.SOILCALIBRATIONDATA });
    return null;
  }

  if (parsed.FINALSOILRESULT && typeof parsed.FINALSOILRESULT === 'object') {
    dispatch({ type: 'SOIL_BLE_RESULT', payload: normalizeSoil(parsed.FINALSOILRESULT) });
    return parsed.FINALSOILRESULT;
  }

  dispatch(ac.log('DATA', `← Unhandled JSON ignored: ${raw}`));
  return null;
}

// ─── FIX: rewritten notify loop using the self-healing scanner ─────────────
function startNotifications(device, cfg, dispatch) {
  _notifySub?.remove();
  _chunkBuffer = '';
  dispatch(ac.log('NOTIFY', `Subscribing S:${cfg.serviceUUID} C:${cfg.notifyUUID}`));

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
          dispatch(ac.log('RAW', `Buffer exceeded ${MAX_BUFFER_LEN}B — resyncing (desync detected)`));
          console.warn('[BLE] Buffer desync — clearing', _chunkBuffer.length, 'bytes');
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
            dispatch(ac.log('RAW', `INCOMPLETE(${_chunkBuffer.length}B) — waiting for next chunk…`));
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
            dispatch(ac.log('RAW', `REMAINDER(${remainder.length}B) → ${remainder}`));

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
    const conn = await bleManager.connectToDevice(rawDevice.id, { timeout: 12_000 });
    dispatch(ac.log('CONNECT', 'Connected — discovering services…'));
    await conn.discoverAllServicesAndCharacteristics();

    try {
      const negotiatedMtu = await conn.requestMTU(512);
      dispatch(ac.log('CONNECT', `MTU negotiated: ${negotiatedMtu}`));
    } catch (mtuErr) {
      dispatch(ac.log('CONNECT', `MTU request failed (non-fatal): ${mtuErr.message}`));
    }

    const cfg = await resolveUUIDs(conn, dispatch);
    _device = conn;
    _config = cfg;
    _dataCount = 0;
    dispatch(ac.configResolved(cfg));
    dispatch(ac.connectSuccess({ id: conn.id, name: conn.name || rawDevice.name }));
    startNotifications(conn, cfg, dispatch);
    dispatch(ac.handshakeStart());
    dispatch(ac.log('HANDSHAKE', '→ {"HANDSHAKE":"HELLO"}'));
    await _sendJSON({ HANDSHAKE: 'HELLO' }, dispatch);

    conn.onDisconnected(() => {
      dispatch(ac.log('DISCONNECT', 'Device disconnected'));
      dispatch(ac.disconnect());
      _notifySub?.remove();
      _notifySub = null;
      _device = null;
      _config = null;
      _chunkBuffer = '';
      _reconnectTimer = setTimeout(async () => {
        try {
          dispatch(ac.log('RECONNECT', 'Attempting…'));
          const r = await bleManager.connectToDevice(conn.id, { timeout: 8_000 });
          await r.discoverAllServicesAndCharacteristics();

          try {
            const mtu = await r.requestMTU(512);
            dispatch(ac.log('RECONNECT', `MTU negotiated: ${mtu}`));
          } catch (mtuErr) {
            dispatch(ac.log('RECONNECT', `MTU request failed (non-fatal): ${mtuErr.message}`));
          }

          const newCfg = await resolveUUIDs(r, dispatch);
          _device = r;
          _config = newCfg;
          dispatch(ac.configResolved(newCfg));
          dispatch(ac.connectSuccess({ id: r.id, name: r.name }));
          startNotifications(r, newCfg, dispatch);
          dispatch(ac.handshakeStart());
          await _sendJSON({ HANDSHAKE: 'HELLO' }, dispatch);
          dispatch(ac.log('RECONNECT', 'Success ✅'));
        } catch (e) {
          dispatch(ac.log('RECONNECT', `Failed: ${e.message}`));
        }
      }, 3_000);
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
  dispatch(ac.disconnect());
};

// ph test ble commands
export const cmdStartPhTestMotor = () => dispatch => _sendJSON({ PHTEST: 'START' }, dispatch);
export const cmdStopPhTestMotor = () => dispatch => _sendJSON({ PHTEST: 'STOP' }, dispatch);
export const cmdCheckMotorStatus = () => dispatch =>
  _sendJSON({ CHECKMOTORSTATUS: 'CHECKMOTORSTATUS' }, dispatch);
export const cmdCalibratePhPoint = standardPH => dispatch =>
  _sendJSON({ CALIBERATE: 'PH', value: Number(standardPH) }, dispatch);
export const cmdCalibrateEcPoint = standardEC => dispatch =>
  _sendJSON({ CALIBERATE: 'EC', value: Number(standardEC) }, dispatch);
export const cmdCheckCalibrationStatus = () => dispatch =>
  _sendJSON({ CALIBRATION_STATUS: true }, dispatch);
export const cmdGetFinalResult = () => dispatch => _sendJSON({ FINAL_RESULT: 'FINAL_RESULT' }, dispatch);
export const clearDebugLog = () => dispatch => dispatch(ac.debugClear());

// ─── Soil test commands ───────────────────────────────────────────────────────
export const cmdStartSoilTest = () => dispatch => _sendJSON({ SOILTEST: 'START' }, dispatch);
export const cmdStopSoilTest = () => dispatch => _sendJSON({ SOILTEST: 'STOP' }, dispatch);
export const cmdCheckSoilMotorStatus = () => dispatch =>
  _sendJSON({ CHECKSOILMOTORSTATUS: 'CHECKSOILMOTORSTATUS' }, dispatch);
export const cmdStartSoilSensor = () => dispatch => _sendJSON({ SOILSENSOR: 'READ' }, dispatch);
export const cmdCheckSoilSensorStatus = () => dispatch =>
  _sendJSON({ CHECKSOILSENSORSTATUS: 'CHECKSOILSENSORSTATUS' }, dispatch);
export const cmdGetSoilResult = () => dispatch => _sendJSON({ SOILRESULT: 'GET' }, dispatch);

// ─── Soil calibration commands ─────────────────────────────────────────────────
// FIX: resetBleParserBuffer() before every START — nothing from a previous
// run/disconnect can bleed into and poison the new cycle's parsing.
export const cmdStartSoilCalibration = (nutrients, point, value) => dispatch => {
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

export const cmdStopSoilCalibration = () => dispatch => _sendJSON({ SOILCALIBRATION: 'STOP' }, dispatch);
export const cmdCheckSoilCalibrationStatus = () => dispatch =>
  _sendJSON({ SOILCALIBRATIONSTATUS: true }, dispatch);
export const cmdGetSoilCalibrationData = () => dispatch => _sendJSON({ SOILCALIBRATIONDATA: 'GET' }, dispatch);