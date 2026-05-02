// src/redux/actions/bleActions.js
//
// Single source of truth for ALL BLE operations.
// BleManager lives here as a module-level singleton.
//
// Firmware: ESP32_S3_BLE
//   • Commands are JSON objects  e.g. {"TEST":"START"}
//   • Calibration:  {"CALIBERATE":"PH","value":4.50}
//                   {"CALIBERATE":"EC","value":500}
//   • Responses are JSON objects (see firmware docs)
//
// UUIDs are hardcoded to match firmware (Config namespace in firmware source):
//   kServiceUuid  = "12345678-1234-1234-1234-1234567890ab"
//   kDataUuid     = "abcd1234-5678-1234-5678-1234567890ab"

// ─── Firmware UUIDs ───────────────────────────────────────────────────────────
const FIRMWARE_SERVICE_UUID = '12345678-1234-1234-1234-1234567890ab';
const FIRMWARE_DATA_UUID = 'abcd1234-5678-1234-5678-1234567890ab';

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
} from '../../config/actionTypes';
import { requestBLEPermissions } from '../../utils/permissions';

// ─── Singleton BleManager ─────────────────────────────────────────────────────
export const bleManager = new BleManager();

// ─── Module-level live refs (not serialisable → not in Redux) ─────────────────
let _device = null; // live BleDevice
let _config = null; // { serviceUUID, notifyUUID, writeUUID }
let _notifySub = null;
let _reconnectTimer = null;
let _scanTimer = null;
let _dataCount = 0;

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

// ─── Init BLE adapter monitor ─────────────────────────────────────────────────
export const initBLE = () => dispatch => {
  bleManager.onStateChange(state => {
    dispatch(ac.bleStateChanged(state));
    dispatch(ac.log('BLE', `Adapter → ${state}`));
  }, true);
};

// ─── Scan ─────────────────────────────────────────────────────────────────────
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

      if (device) {
        dispatch(
          ac.deviceFound({
            id: device.id,
            name: device.name || device.localName || 'Unknown Device',
            rssi: device.rssi,
            localName: device.localName,
          }),
        );
      }
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

// ─── UUID resolution — hardcoded to firmware constants ────────────────────────
// The ESP32 firmware exposes one custom service + one characteristic
// (WRITE | NOTIFY on the same UUID). We hardcode these instead of
// auto-detecting, which previously grabbed generic BLE system UUIDs
// (0x1801 / 0x2a05) instead of the ArkaShine custom service.
async function resolveUUIDs(conn, dispatch) {
  dispatch(ac.log('UUID', 'Using hardcoded firmware UUIDs…'));
  dispatch(ac.log('UUID', `  Service : ${FIRMWARE_SERVICE_UUID}`));
  dispatch(ac.log('UUID', `  Char    : ${FIRMWARE_DATA_UUID}`));

  // Optional: verify the service actually exists on this device
  try {
    const services = await conn.services();
    const found = services.some(
      s => s.uuid.toLowerCase() === FIRMWARE_SERVICE_UUID.toLowerCase(),
    );
    if (!found) {
      dispatch(
        ac.log(
          'UUID',
          `WARNING: service ${FIRMWARE_SERVICE_UUID} not advertised — ` +
            `found: ${services.map(s => s.uuid).join(', ')}`,
        ),
      );
      // Proceed anyway — some stacks report UUIDs in short/different form
    }
  } catch (e) {
    dispatch(ac.log('UUID', `Service check skipped: ${e.message}`));
  }

  const cfg = {
    serviceUUID: FIRMWARE_SERVICE_UUID,
    notifyUUID: FIRMWARE_DATA_UUID,
    writeUUID: FIRMWARE_DATA_UUID, // same char handles WRITE + NOTIFY
  };

  dispatch(ac.log('UUID', 'Resolved ✅'));
  return cfg;
}

// ─── Data / notification parser ───────────────────────────────────────────────
// Handles incoming JSON from firmware:
//
//  {"STATUS":"BLE_CONNECTED"}
//  {"pH":"7.12","TDS":"486.34","temperature":"25.00","temperatureFallback":false,
//   "pHVoltage":"2.4935","ECVoltage":"0.9720"}
//  {"CALIBERATE":"PH","STATUS":"DONE","value":"4.50"}
//  {"CALIBERATE":"EC","STATUS":"DONE","value":"500.00"}
//  {"ERROR":"NO_COMMAND_RECEIVED"}  (and other error variants)
function parsePayload(bytes, dispatch) {
  const raw = bytes.toString('utf-8').trim();
  dispatch(ac.log('DATA', `RAW RECV: "${raw}"`));

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (_) {
    dispatch(ac.log('DATA', `Non-JSON payload — ignoring: "${raw}"`));
    return null;
  }

  // ── BLE connected status ───────────────────────────────────
  if (parsed.STATUS === 'BLE_CONNECTED') {
    dispatch(ac.log('STATUS', 'BLE_CONNECTED received'));
    dispatch(ac.handshakeSuccess(raw));
    return null;
  }

  // ── Calibration complete ───────────────────────────────────
  if (parsed.CALIBERATE && parsed.STATUS === 'DONE') {
    dispatch(
      ac.log(
        'CAL',
        `${parsed.CALIBERATE} calibration DONE — value=${parsed.value}`,
      ),
    );
    return null; // not sensor data
  }

  // ── Error responses ────────────────────────────────────────
  if (parsed.ERROR) {
    dispatch(ac.log('ERROR', `Device error: ${parsed.ERROR}`));
    return null;
  }

  // ── Sensor reading ─────────────────────────────────────────
  // {"pH":"7.12","TDS":"486.34","temperature":"25.00",
  //  "temperatureFallback":false,"pHVoltage":"2.4935","ECVoltage":"0.9720"}
  if (parsed.pH !== undefined || parsed.TDS !== undefined) {
    _dataCount += 1;
    const reading = {
      ec: parsed.TDS !== undefined ? parseFloat(parsed.TDS) : null,
      ph: parsed.pH !== undefined ? parseFloat(parsed.pH) : null,
      voltage:
        parsed.pHVoltage !== undefined ? parseFloat(parsed.pHVoltage) : null,
      ecVoltage:
        parsed.ECVoltage !== undefined ? parseFloat(parsed.ECVoltage) : null,
      temperature:
        parsed.temperature !== undefined
          ? parseFloat(parsed.temperature)
          : null,
      temperatureFallback: parsed.temperatureFallback ?? false,
      status: null,
      timer: null,
      raw,
      timestamp: Date.now(),
      receivedCount: _dataCount,
    };
    dispatch(
      ac.log(
        'DATA',
        `Reading #${_dataCount} → pH=${reading.ph} TDS=${reading.ec} Temp=${reading.temperature}°C`,
      ),
    );
    return reading;
  }

  dispatch(ac.log('DATA', `Unhandled JSON — ignoring: "${raw}"`));
  return null;
}

// ─── Subscribe to BLE notifications ──────────────────────────────────────────
function startNotifications(device, cfg, dispatch) {
  dispatch(
    ac.log('NOTIFY', `Subscribing  S:${cfg.serviceUUID}  C:${cfg.notifyUUID}`),
  );
  _notifySub?.remove();

  _notifySub = device.monitorCharacteristicForService(
    cfg.serviceUUID,
    cfg.notifyUUID,
    (err, char) => {
      if (err) {
        dispatch(ac.log('NOTIFY', `Error: ${err.message}`));
        return;
      }
      if (!char?.value) return;
      try {
        const bytes = Buffer.from(char.value, 'base64');
        const parsed = parsePayload(bytes, dispatch);
        if (parsed) dispatch(ac.dataReceived(parsed));
      } catch (e) {
        dispatch(ac.log('NOTIFY', `Parse error: ${e.message}`));
      }
    },
  );
  dispatch(ac.log('NOTIFY', 'Subscribed ✅'));
}

// ─── Connect ──────────────────────────────────────────────────────────────────
export const connectDevice = rawDevice => async dispatch => {
  dispatch(ac.connectRequest(rawDevice.id));
  dispatch(ac.log('CONNECT', `→ ${rawDevice.name || rawDevice.id}`));

  clearTimeout(_scanTimer);
  bleManager.stopDeviceScan();
  dispatch(ac.scanStop());

  try {
    const conn = await bleManager.connectToDevice(rawDevice.id, {
      timeout: 12_000,
    });
    dispatch(ac.log('CONNECT', 'TCP link up — discovering services…'));
    await conn.discoverAllServicesAndCharacteristics();
    dispatch(ac.log('CONNECT', 'Discovery complete'));

    const cfg = await resolveUUIDs(conn, dispatch);
    if (!cfg) {
      await conn.cancelConnection();
      dispatch(
        ac.connectFailed('No usable BLE characteristic found on device'),
      );
      Alert.alert(
        'Connection Failed',
        'Could not find a notify/write characteristic.\nMake sure the ArkaShine firmware is running.',
      );
      return;
    }

    _device = conn;
    _config = cfg;
    _dataCount = 0;

    dispatch(ac.configResolved(cfg));
    dispatch(
      ac.connectSuccess({ id: conn.id, name: conn.name || rawDevice.name }),
    );

    // Subscribe BEFORE sending handshake so we catch {"STATUS":"BLE_CONNECTED"}
    startNotifications(conn, cfg, dispatch);

    // Firmware will reply with {"STATUS":"BLE_CONNECTED"} on connection
    dispatch(ac.handshakeStart());
    dispatch(ac.log('HANDSHAKE', 'Waiting for BLE_CONNECTED status…'));

    // Auto-reconnect on drop
    conn.onDisconnected(() => {
      dispatch(ac.log('DISCONNECT', 'Device disconnected'));
      dispatch(ac.disconnect());
      _notifySub?.remove();
      _notifySub = null;
      _device = null;
      _config = null;

      _reconnectTimer = setTimeout(async () => {
        try {
          dispatch(ac.log('RECONNECT', 'Attempting…'));
          const r = await bleManager.connectToDevice(conn.id, {
            timeout: 8_000,
          });
          await r.discoverAllServicesAndCharacteristics();
          const newCfg = await resolveUUIDs(r, dispatch);
          if (!newCfg) {
            dispatch(ac.log('RECONNECT', 'UUID resolve failed'));
            return;
          }
          _device = r;
          _config = newCfg;
          dispatch(ac.configResolved(newCfg));
          dispatch(ac.connectSuccess({ id: r.id, name: r.name }));
          startNotifications(r, newCfg, dispatch);
          dispatch(ac.handshakeStart());
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

// ─── Disconnect ───────────────────────────────────────────────────────────────
export const disconnectDevice = () => dispatch => {
  dispatch(ac.log('DISCONNECT', 'User initiated'));
  clearTimeout(_reconnectTimer);
  clearTimeout(_scanTimer);
  _notifySub?.remove();
  _notifySub = null;
  _device?.cancelConnection();
  _device = null;
  _config = null;
  dispatch(ac.disconnect());
};

// ─── Internal write helpers ───────────────────────────────────────────────────

/**
 * _sendCmd — legacy plain-string protocol (kept for handshake compatibility).
 * Builds "COMMAND:params" or just "COMMAND", encodes as base64, writes to BLE.
 */
async function _sendCmd(command, params, dispatch) {
  if (!_device || !_config) {
    dispatch(ac.log('CMD', 'Not connected'));
    return false;
  }
  const cmdStr = params ? `${command}:${params}` : command;
  const b64 = Buffer.from(cmdStr, 'utf-8').toString('base64');
  dispatch(ac.log('CMD', `→ "${cmdStr}"`));

  try {
    await _device.writeCharacteristicWithResponseForService(
      _config.serviceUUID,
      _config.writeUUID,
      b64,
    );
    dispatch(ac.log('CMD', `✅ sent (with-response)`));
    dispatch(ac.cmdSent(cmdStr));
    return true;
  } catch (e1) {
    dispatch(ac.log('CMD', `write-with-response failed: ${e1.message}`));
  }

  try {
    await _device.writeCharacteristicWithoutResponseForService(
      _config.serviceUUID,
      _config.writeUUID,
      b64,
    );
    dispatch(ac.log('CMD', `✅ sent (without-response)`));
    dispatch(ac.cmdSent(cmdStr));
    return true;
  } catch (e2) {
    const msg = `Both write methods failed: ${e2.message}`;
    dispatch(ac.log('CMD', `❌ ${msg}`));
    dispatch(ac.cmdFailed(msg));
    return false;
  }
}

/**
 * _sendJSON — new firmware JSON protocol.
 * Serialises an object to JSON, encodes as base64, writes to BLE.
 * e.g. _sendJSON({ TEST: 'START' }, dispatch)
 *      _sendJSON({ CALIBERATE: 'PH', value: 4 }, dispatch)
 */
async function _sendJSON(payload, dispatch) {
  if (!_device || !_config) {
    dispatch(ac.log('CMD', 'Not connected'));
    return false;
  }
  const jsonStr = JSON.stringify(payload);
  const b64 = Buffer.from(jsonStr, 'utf-8').toString('base64');
  dispatch(ac.log('CMD', `→ JSON: ${jsonStr}`));

  try {
    await _device.writeCharacteristicWithResponseForService(
      _config.serviceUUID,
      _config.writeUUID,
      b64,
    );
    dispatch(ac.log('CMD', `✅ sent (with-response)`));
    dispatch(ac.cmdSent(jsonStr));
    return true;
  } catch (e1) {
    dispatch(ac.log('CMD', `write-with-response failed: ${e1.message}`));
  }

  try {
    await _device.writeCharacteristicWithoutResponseForService(
      _config.serviceUUID,
      _config.writeUUID,
      b64,
    );
    dispatch(ac.log('CMD', `✅ sent (without-response)`));
    dispatch(ac.cmdSent(jsonStr));
    return true;
  } catch (e2) {
    const msg = `Both write methods failed: ${e2.message}`;
    dispatch(ac.log('CMD', `❌ ${msg}`));
    dispatch(ac.cmdFailed(msg));
    return false;
  }
}

// ─── Public command thunks ────────────────────────────────────────────────────

/** Retrigger handshake manually (no-op for new firmware — connection triggers it automatically) */
export const cmdHandshake = () => async dispatch => {
  dispatch(ac.handshakeStart());
  dispatch(
    ac.log('HANDSHAKE', 'Manual handshake — waiting for BLE_CONNECTED…'),
  );
};

// ── pH / EC test ──────────────────────────────────────────────────────────────

/**
 * Start a full soil test.
 * Device starts the mixing motor for 60 s (LED blue),
 * then reads pH / TDS / temperature (LED yellow)
 * and replies with a sensor-reading JSON.
 *
 * Sends: {"TEST":"START"}
 */
export const cmdReadSensors = () => dispatch =>
  _sendJSON({ TEST: 'START' }, dispatch);

/** Start continuous data stream (plain-string, kept for compatibility) */
export const cmdStartStream = () => dispatch =>
  _sendCmd('STREAM_START', '', dispatch);

/** Stop continuous stream (plain-string, kept for compatibility) */
export const cmdStopStream = () => dispatch =>
  _sendCmd('STREAM_STOP', '', dispatch);

// ── Soil test — motor control ─────────────────────────────────────────────────

/**
 * Start soil test (motor + read sequence).
 * Sends: {"TEST":"START"}
 * The motor duration is controlled by the firmware (60 s).
 */
export const cmdMotorStart = () => dispatch =>
  _sendJSON({ TEST: 'START' }, dispatch);

/** Stop motor immediately (plain-string fallback) */
export const cmdMotorStop = () => dispatch =>
  _sendCmd('MOTOR_OFF', '', dispatch);

// ── Calibration ───────────────────────────────────────────────────────────────

/**
 * pH calibration point.
 * standardPH: 4 | 7 | 9  (number)
 *
 * Sends: {"CALIBERATE":"PH","value":4}
 * Device replies: {"CALIBERATE":"PH","STATUS":"DONE","value":"4.00"}
 */
export const cmdCalibratePhPoint = standardPH => dispatch =>
  _sendJSON({ CALIBERATE: 'PH', value: Number(standardPH) }, dispatch);

/**
 * EC calibration point.
 * standardEC: 0 | 500 | ... (number — use raw µS/cm or dS/m per your solution label)
 *
 * Sends: {"CALIBERATE":"EC","value":500}
 * Device replies: {"CALIBERATE":"EC","STATUS":"DONE","value":"500.00"}
 */
export const cmdCalibrateEcPoint = standardEC => dispatch =>
  _sendJSON({ CALIBERATE: 'EC', value: Number(standardEC) }, dispatch);

/** Save calibration to device flash (plain-string, kept for compatibility) */
export const cmdSaveCalibration = () => dispatch =>
  _sendCmd('CAL_SAVE', '', dispatch);

/** Wipe calibration from device flash (plain-string, kept for compatibility) */
export const cmdResetCalibration = () => dispatch =>
  _sendCmd('CAL_RESET', '', dispatch);

/** Retrieve stored calibration from device (plain-string, kept for compatibility) */
export const cmdGetCalibration = () => dispatch =>
  _sendCmd('CAL_GET', '', dispatch);

// ── Misc ──────────────────────────────────────────────────────────────────────

/** Clear the Redux debug log */
export const clearDebugLog = () => dispatch => dispatch(ac.debugClear());
