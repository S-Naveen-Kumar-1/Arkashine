// src/redux/actions/bleActions.js
//
// ─── Firmware UUIDs ──────────────────────────────────────────────────────────
//   Service : 12345678-1234-1234-1234-1234567890ab
//   Data    : abcd1234-5678-1234-5678-1234567890ab  (WRITE + NOTIFY same char)
//
// ═════════════════════════════════════════════════════════════════════════════
//  COMPLETE TWO-WAY COMMUNICATION MAP
// ═════════════════════════════════════════════════════════════════════════════
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
  finalResult: r => ({ type: BLE_FINAL_RESULT, payload: r }),
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

// Build a normalised sensor reading object from any firmware source
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

// ─── Notification parser — handles every firmware → app message ───────────────
function parsePayload(bytes, dispatch) {
  const raw = bytes.toString('utf-8').trim();
  dispatch(ac.log('DATA', `← RECV: ${raw}`));
  console.log('[BLE RECV]', raw);

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (_) {
    dispatch(ac.log('DATA', `Non-JSON ignored: ${raw}`));
    return null;
  }

  // 1. {"STATUS":"BLE_CONNECTED"} — auto on link-up
  if (parsed.STATUS === 'BLE_CONNECTED') {
    dispatch(ac.log('HANDSHAKE', '← BLE_CONNECTED ✅'));
    dispatch(ac.handshakeSuccess(raw));
    return null;
  }

  // 2. {"HANDSHAKE":"ACK"} — response to {"HANDSHAKE":"HELLO"}
  if (parsed.HANDSHAKE === 'ACK') {
    dispatch(ac.log('HANDSHAKE', '← HANDSHAKE ACK ✅'));
    dispatch(ac.handshakeSuccess(raw));
    return null;
  }

  // 3. {"TEST":"STARTED"} — immediate ACK to {"TEST":"START"}
  if (parsed.TEST === 'STARTED') {
    dispatch(ac.log('TEST', '← TEST STARTED — motor now running'));
    dispatch(ac.testStarted());
    return null;
  }

  // 4. {"TEST":"STOPPED"} — response to {"TEST":"STOP"}
  if (parsed.TEST === 'STOPPED') {
    dispatch(ac.log('TEST', '← TEST STOPPED'));
    dispatch(ac.testStopped());
    dispatch(ac.motorStatus('stopped'));
    return null;
  }

  // 5. {"MOTORSTATUS":"RUNNING"|"STOPPED"} — response to CHECKMOTORSTATUS
  if (parsed.MOTORSTATUS !== undefined) {
    const s = parsed.MOTORSTATUS.toLowerCase();
    dispatch(ac.log('MOTOR', `← MOTORSTATUS: ${s}`));
    dispatch(ac.motorStatus(s));
    return null;
  }

  // 6. {"CALIBERATE":"PH"|"EC","STATUS":"DONE","value":"4.00"}
  if (parsed.CALIBERATE && parsed.STATUS === 'DONE') {
    const type = parsed.CALIBERATE; // PH or EC
    const value = parseFloat(parsed.value);

    // ✅ extract correct voltage
    const voltage =
      type === 'PH'
        ? parseFloat(parsed.pHVoltage)
        : parseFloat(parsed.ECVoltage);

    dispatch(
      ac.log('CAL', `← ${type} DONE — value=${value}, voltage=${voltage}`),
    );

    dispatch({
      type: CAL_POINT_DONE,
      payload: {
        type, // PH / EC
        value, // 4 / 7 / 1.413
        voltage, // REAL voltage
      },
    });

    return null;
  }
  // 7. {"CALIBRATION_STATUS":"..."} — response to CALIBRATION_STATUS query
  if (parsed.CALIBRATION_STATUS !== undefined) {
    dispatch(
      ac.log('CAL', `← CALIBRATION_STATUS: ${parsed.CALIBRATION_STATUS}`),
    );
    dispatch(ac.calibrationStatus(parsed.CALIBRATION_STATUS));
    return null;
  }

  // 8. {"FINAL_RESULT":{...}} — response to FINAL_RESULT command
  if (parsed.FINAL_RESULT && typeof parsed.FINAL_RESULT === 'object') {
    const reading = _buildReading(parsed.FINAL_RESULT, raw);
    dispatch(
      ac.log(
        'FINAL',
        `← FINAL_RESULT pH=${reading.ph} TDS=${reading.ec} T=${reading.temperature}°C`,
      ),
    );
    dispatch(ac.finalResult(reading)); // stored in finalResult AND sensorData via reducer
    return reading;
  }

  // 9. {"ERROR":"..."} — unsolicited device errors
  if (parsed.ERROR) {
    dispatch(ac.log('ERROR', `← Device ERROR: ${parsed.ERROR}`));
    dispatch(ac.deviceError(parsed.ERROR));
    return null;
  }

  // 10. Sensor reading — {"pH":"7.12","TDS":"486.34",...} — from TEST:START result
  if (parsed.pH !== undefined || parsed.TDS !== undefined) {
    const reading = _buildReading(parsed, raw);
    dispatch(
      ac.log(
        'DATA',
        `← Sensor #${_dataCount} pH=${reading.ph} TDS=${reading.ec} pHV=${reading.voltage}V ECV=${reading.ecVoltage}V T=${reading.temperature}°C`,
      ),
    );
    return reading;
  }

  // soil test
  if (parsed.SOILTEST == 'STARTED') {
    dispatch({ type: 'SOIL_MOTOR_STATE', payload: { data: 'running' } });
  }
  if (parsed.SOILTEST == 'MIXING_COMPLETED') {
    dispatch({
      type: 'SOIL_MOTOR_STATE',
      payload: { data: 'mixing completed' },
    });
  }

  if (parsed.SOILMOTORSTATUS == 'RUNNING') {
    dispatch({
      type: 'SOIL_MOTOR_STATE_FROM_BLE',
      payload: { data: 'running' },
    });
  }
  if (parsed.SOILMOTORSTATUS == 'NOT_STARTED') {
    dispatch({
      type: 'SOIL_MOTOR_STATE_FROM_BLE',
      payload: { data: 'not_started' },
    });
  }
  if (parsed.SOILMOTORSTATUS == 'STOPPED') {
    dispatch({
      type: 'SOIL_MOTOR_STATE_FROM_BLE',
      payload: { data: 'stopped' },
    });
  }

  if (parsed.SOILSENSORSTATUS == 'READING') {
    dispatch({
      type: 'SOIL_SENSOR_STATE_FROM_BLE',
      payload: { data: 'reading' },
    });
  }
  if (parsed.SOILSENSORSTATUS == 'RUNNING') {
    dispatch({
      type: 'SOIL_SENSOR_STATE_FROM_BLE',
      payload: { data: 'running' },
    });
  }
  if (parsed.SOILSENSORSTATUS == 'NOT_STARTED') {
    dispatch({
      type: 'SOIL_SENSOR_STATE_FROM_BLE',
      payload: { data: 'not_started' },
    });
  }

  if (parsed.SOILSENSORSTATUS == 'SENSOR_READING_DONE') {
    dispatch({
      type: 'SOIL_SENSOR_STATE_FROM_BLE',
      payload: { data: 'sensor_reading_done' },
    });
  }

  if (parsed.SOILSENSORSTATUS == 'STOPPED') {
    dispatch({
      type: 'SOIL_SENSOR_STATE_FROM_BLE',
      payload: { data: 'stopped' },
    });
  }
  if (parsed.FINALSOILRESULT && typeof parsed.FINALSOILRESULT === 'object') {
    dispatch({
      type: 'SOIL_BLE_RESULT',
      payload: normalizeSoil(parsed.FINALSOILRESULT),
    });
    return parsed.FINALSOILRESULT;
  }
  dispatch(ac.log('DATA', `← Unhandled JSON ignored: ${raw}`));
  return null;
}

function startNotifications(device, cfg, dispatch) {
  _notifySub?.remove();
  dispatch(
    ac.log('NOTIFY', `Subscribing S:${cfg.serviceUUID} C:${cfg.notifyUUID}`),
  );
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
        const reading = parsePayload(bytes, dispatch);
        if (reading) dispatch(ac.dataReceived(reading));
      } catch (e) {
        dispatch(ac.log('NOTIFY', `Parse error: ${e.message}`));
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
      timeout: 12_000,
    });
    dispatch(ac.log('CONNECT', 'Connected — discovering services…'));
    await conn.discoverAllServicesAndCharacteristics();
    const cfg = await resolveUUIDs(conn, dispatch);
    _device = conn;
    _config = cfg;
    _dataCount = 0;
    dispatch(ac.configResolved(cfg));
    dispatch(
      ac.connectSuccess({ id: conn.id, name: conn.name || rawDevice.name }),
    );
    startNotifications(conn, cfg, dispatch);
    // → {"HANDSHAKE":"HELLO"}   ← {"STATUS":"BLE_CONNECTED"} or {"HANDSHAKE":"ACK"}
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
      _reconnectTimer = setTimeout(async () => {
        try {
          dispatch(ac.log('RECONNECT', 'Attempting…'));
          const r = await bleManager.connectToDevice(conn.id, {
            timeout: 8_000,
          });
          await r.discoverAllServicesAndCharacteristics();
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
  _device?.cancelConnection();
  _device = null;
  _config = null;
  dispatch(ac.disconnect());
};

// ═════════════════════════════════════════════════════════════════════════════
//  PUBLIC COMMAND THUNKS
// ═════════════════════════════════════════════════════════════════════════════

// 1. Start Test
// →  {"TEST":"START"}
// ←  {"TEST":"STARTED"}  (immediate)
// ←  {pH,TDS,temperature,temperatureFallback,pHVoltage,ECVoltage}  (~60 s later)
export const cmdStartTest = () => dispatch =>
  _sendJSON({ TEST: 'START' }, dispatch);

// 2. Stop Test
// →  {"TEST":"STOP"}
// ←  {"TEST":"STOPPED"}
export const cmdStopTest = () => dispatch =>
  _sendJSON({ TEST: 'STOP' }, dispatch);

// 3. Check Motor Status
// →  {"CHECKMOTORSTATUS":"CHECKMOTORSTATUS"}
// ←  {"MOTORSTATUS":"RUNNING"} or {"MOTORSTATUS":"STOPPED"}
export const cmdCheckMotorStatus = () => dispatch =>
  _sendJSON({ CHECKMOTORSTATUS: 'CHECKMOTORSTATUS' }, dispatch);

// 4. Calibrate pH Point
// →  {"CALIBERATE":"PH","value":4}   (4 | 7 | 9)
// ←  {"CALIBERATE":"PH","STATUS":"DONE","value":"4.00"}
export const cmdCalibratePhPoint = standardPH => dispatch =>
  _sendJSON({ CALIBERATE: 'PH', value: Number(standardPH) }, dispatch);

// 5. Calibrate EC Point
// →  {"CALIBERATE":"EC","value":1.413}   (0.0 | 1.413 | 12.88)
// ←  {"CALIBERATE":"EC","STATUS":"DONE","value":"1.41"}
export const cmdCalibrateEcPoint = standardEC => dispatch =>
  _sendJSON({ CALIBERATE: 'EC', value: Number(standardEC) }, dispatch);

// 6. Check Calibration Status
// →  {"CALIBRATION_STATUS":true}
// ←  {"CALIBRATION_STATUS":"PH_4_DONE"|...|"ALL_DONE"|"NOT_CALIBRATED"}
export const cmdCheckCalibrationStatus = () => dispatch =>
  _sendJSON({ CALIBRATION_STATUS: true }, dispatch);

// 7. Get Final Result
// →  {"FINAL_RESULT":"RESULT"}
// ←  {"FINAL_RESULT":{pH,TDS,temperature,pHVoltage,ECVoltage}}
export const cmdGetFinalResult = () => dispatch =>
  _sendJSON({ FINAL_RESULT: 'FINAL_RESULT' }, dispatch);

export const clearDebugLog = () => dispatch => dispatch(ac.debugClear());

//soil tests

export const cmdStartSoilTest = () => dispatch =>
  _sendJSON({ SOILTEST: 'START' }, dispatch);
export const cmdStopSoilTest = () => dispatch =>
  _sendJSON({ SOILTEST: 'STOP' }, dispatch);

export const cmdCheckSoilMotorStatus = () => dispatch =>
  _sendJSON({ CHECKSOILMOTORSTATUS: 'CHECKSOILMOTORSTATUS' }, dispatch);

export const cmdStartSoilSensor = () => dispatch =>
  _sendJSON({ SOILSENSOR: 'READ' }, dispatch);
export const cmdCheckSoilSensorStatus = () => dispatch =>
  _sendJSON({ CHECKSOILSENSORSTATUS: 'CHECKSOILSENSORSTATUS' }, dispatch);

export const cmdGetSoilResult = () => dispatch =>
  _sendJSON({ SOILRESULT: 'GET' }, dispatch);
