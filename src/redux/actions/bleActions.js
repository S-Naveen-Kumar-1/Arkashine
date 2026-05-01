// src/redux/actions/bleActions.js
//
// Single source of truth for ALL BLE operations.
// BleManager lives here as a module-level singleton.
// _connectedDevice and _bleConfig are JS refs (not serialisable → not in Redux).
// Redux stores only serialisable metadata: device { id, name }, bleConfig UUIDs, sensorData.

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
} from '../../config/actionTypes';

// ─── Singleton BleManager ────────────────────────────────────────────────────
export const bleManager = new BleManager();

// ─── Module-level live refs (NOT in Redux — cannot serialise BLE objects) ────
let _device = null; // live BleDevice
let _config = null; // { serviceUUID, notifyUUID, writeUUID }
let _notifySub = null;
let _reconnectTimer = null;
let _scanTimer = null;
let _dataCount = 0;

// ─── Plain action creators ───────────────────────────────────────────────────
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

// ─── Monitor Bluetooth adapter state ─────────────────────────────────────────
export const initBLE = () => dispatch => {
  bleManager.onStateChange(state => {
    dispatch(ac.bleStateChanged(state));
    dispatch(ac.log('BLE', `Adapter → ${state}`));
  }, true);
};

// ─── Scan ─────────────────────────────────────────────────────────────────────
const SCAN_TIMEOUT = 15_000;

export const startScan = () => dispatch => {
  dispatch(ac.scanStart());
  dispatch(ac.log('SCAN', 'Starting device scan…'));

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
  }, SCAN_TIMEOUT);
};

export const stopScan = () => dispatch => {
  clearTimeout(_scanTimer);
  bleManager.stopDeviceScan();
  dispatch(ac.scanStop());
  dispatch(ac.log('SCAN', 'Stopped by user'));
};

// ─── Data parser ─────────────────────────────────────────────────────────────
function parsePayload(bytes, dispatch) {
  const raw = bytes.toString('utf-8').trim();
  const timestamp = Date.now();
  _dataCount += 1;
  dispatch(ac.log('DATA', `#${_dataCount} RAW: ${raw}`));

  const base = {
    ec: null,
    ph: null,
    voltage: null,
    status: null,
    timer: null,
    raw,
    timestamp,
    receivedCount: _dataCount,
  };

  // ── Try JSON first ──────────────────────────────────────────
  try {
    const j = JSON.parse(raw);
    const p = {
      ...base,
      ec: j.ec ?? j.EC ?? null,
      ph: j.ph ?? j.pH ?? null,
      voltage: j.voltage ?? j.v ?? null,
      status: j.status ?? null,
      timer: j.timer ?? j.time ?? null,
    };
    dispatch(
      ac.log(
        'DATA',
        `JSON → EC=${p.ec} pH=${p.ph} V=${p.voltage} status=${p.status}`,
      ),
    );
    return p;
  } catch (_) {}

  // ── Try key=value CSV (e.g. "ph=6.45,ec=1.23,voltage=0.198") ──
  const r = { ...base };
  for (const pair of raw.split(',')) {
    const [k, v] = pair.split('=');
    if (!k || v === undefined) continue;
    const key = k.trim().toLowerCase();
    const val = v.trim();
    switch (key) {
      case 'ec':
      case 'ec_dsm':
        r.ec = parseFloat(val);
        break;
      case 'ph':
        r.ph = parseFloat(val);
        break;
      case 'voltage':
      case 'v':
        r.voltage = parseFloat(val);
        break;
      case 'status':
        r.status = val;
        break;
      case 'timer':
      case 'time':
        r.timer = parseInt(val, 10);
        break;
    }
  }
  if (r.ec !== null || r.ph !== null || r.voltage !== null) {
    dispatch(ac.log('DATA', `KV → EC=${r.ec} pH=${r.ph} V=${r.voltage}`));
    return r;
  }

  dispatch(ac.log('DATA', 'Unknown format — raw string only'));
  return r;
}

// ─── Start BLE notifications ──────────────────────────────────────────────────
function startNotifications(device, cfg, dispatch) {
  dispatch(ac.log('NOTIFY', `Monitoring ${cfg.serviceUUID.slice(0, 8)}…`));
  _notifySub?.remove();

  _notifySub = device.monitorCharacteristicForService(
    cfg.serviceUUID,
    cfg.notifyUUID,
    (err, char) => {
      if (err) {
        dispatch(ac.log('NOTIFY', `Error: ${err.message}`));
        return;
      }
      if (char?.value) {
        try {
          const bytes = Buffer.from(char.value, 'base64');
          const parsed = parsePayload(bytes, dispatch);
          dispatch(ac.dataReceived(parsed));
        } catch (e) {
          dispatch(ac.log('NOTIFY', `Parse error: ${e.message}`));
        }
      }
    },
  );
  dispatch(ac.log('NOTIFY', 'Monitor active ✅'));
}

// ─── Resolve UUIDs dynamically from the connected device ─────────────────────
// Scans all services → finds first notifiable characteristic.
// No hardcoded UUIDs needed.
async function resolveUUIDs(conn, dispatch) {
  dispatch(ac.log('UUID', 'Scanning services…'));
  const services = await conn.services();

  for (const svc of services) {
    const chars = await svc.characteristics();

    for (const c of chars) {
      const canNotify = c.isNotifiable || c.isIndicatable;
      const canWrite = c.isWritableWithResponse || c.isWritableWithoutResponse;

      dispatch(
        ac.log(
          'UUID',
          `Char: ${c.uuid} → notify=${canNotify} write=${canWrite}`,
        ),
      );

      // 🔥 BEST CASE: SAME CHARACTERISTIC
      if (canNotify && canWrite) {
        const cfg = {
          serviceUUID: svc.uuid,
          notifyUUID: c.uuid,
          writeUUID: c.uuid,
        };

        dispatch(ac.log('UUID', `✅ Using SAME char for read/write`));
        return cfg;
      }
    }
  }

  dispatch(ac.log('UUID', 'ERROR: no valid characteristic found'));
  return null;
}
// ─── Connect ──────────────────────────────────────────────────────────────────
export const connectDevice = rawDevice => async dispatch => {
  dispatch(ac.connectRequest(rawDevice.id));
  dispatch(ac.log('CONNECT', `→ ${rawDevice.name || rawDevice.id}`));

  // Stop scan first
  clearTimeout(_scanTimer);
  bleManager.stopDeviceScan();
  dispatch(ac.scanStop());

  try {
    const conn = await bleManager.connectToDevice(rawDevice.id, {
      timeout: 12000,
    });
    dispatch(ac.log('CONNECT', 'Connected ✅ — discovering services…'));
    await conn.discoverAllServicesAndCharacteristics();
    dispatch(ac.log('CONNECT', 'Discovery complete'));

    const cfg = await resolveUUIDs(conn, dispatch);
    if (!cfg) {
      await conn.cancelConnection();
      dispatch(ac.connectFailed('Could not resolve BLE characteristics'));
      Alert.alert(
        'Connection Failed',
        'No usable BLE characteristic found on device.',
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
    startNotifications(conn, cfg, dispatch);

    // ── Handshake: ping the device ─────────────────────────────
    // await _sendCmd('PING', '', dispatch);
    await _sendCmd('arkashineDevice', '', dispatch);
    dispatch(ac.log('HANDSHAKE', 'Sent arkashineDevice'));
    setTimeout(() => {
      dispatch((_, getState) => {
        const { handshakeStatus } = getState().ble;

        if (handshakeStatus !== 'success') {
          dispatch(ac.log('HANDSHAKE', '❌ Failed (timeout)'));
          dispatch({ type: 'BLE_HANDSHAKE_FAILED' });
        }
      });
    }, 2000);
    // ── Disconnect handler ─────────────────────────────────────
    conn.onDisconnected(() => {
      dispatch(ac.log('DISCONNECT', 'Device disconnected'));
      dispatch(ac.disconnect());
      _notifySub?.remove();
      _notifySub = null;
      _device = null;
      _config = null;

      // Auto-reconnect after 3 s
      _reconnectTimer = setTimeout(async () => {
        try {
          dispatch(ac.log('RECONNECT', 'Attempting reconnect…'));
          const r = await bleManager.connectToDevice(conn.id, {
            timeout: 8_000,
          });
          await r.discoverAllServicesAndCharacteristics();
          const newCfg = await resolveUUIDs(r, dispatch);
          if (newCfg) {
            _device = r;
            _config = newCfg;
            dispatch(ac.configResolved(newCfg));
            dispatch(ac.connectSuccess({ id: r.id, name: r.name }));
            startNotifications(r, newCfg, dispatch);
            await _sendCmd('arkashineDevice', '', dispatch);
            dispatch(ac.log('HANDSHAKE', 'Sent arkashineDevice (reconnect)'));
            dispatch(ac.log('RECONNECT', 'Success ✅'));
          }
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

// ─── Internal write helper ────────────────────────────────────────────────────
// Tries write-with-response first (ESP32 PROPERTY_WRITE), then without-response.
async function _sendCmd(command, params, dispatch) {
  if (!_device || !_config) {
    dispatch(ac.log('CMD', 'Not connected — cannot send'));
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
    dispatch(ac.log('CMD', `✅ OK (with-response): ${cmdStr}`));
    dispatch(ac.cmdSent(cmdStr));
    return true;
  } catch (e1) {
    dispatch(ac.log('CMD', `Write-with-response failed: ${e1.message}`));
  }

  try {
    await _device.writeCharacteristicWithoutResponseForService(
      _config.serviceUUID,
      _config.writeUUID,
      b64,
    );
    dispatch(ac.log('CMD', `✅ OK (without-response): ${cmdStr}`));
    dispatch(ac.cmdSent(cmdStr));
    return true;
  } catch (e2) {
    const msg = `Both write methods failed: ${e2.message}`;
    dispatch(ac.log('CMD', `❌ ${msg}`));
    dispatch(ac.cmdFailed(msg));
    return false;
  }
}

// ─── Public command thunks ────────────────────────────────────────────────────
// All commands follow the pattern:  COMMAND:params  or just  COMMAND
// These match the ESP32 firmware command strings.

/** Handshake / health check */
export const cmdPing = () => dispatch => _sendCmd('PING', '', dispatch);

/** Start mixing motor for N seconds */
export const cmdMotorStart =
  (seconds = 60) =>
  dispatch =>
    _sendCmd('MOTOR_ON', String(seconds), dispatch);

/** Stop motor immediately */
export const cmdMotorStop = () => dispatch =>
  _sendCmd('MOTOR_OFF', '', dispatch);

/** Request a single pH + EC + voltage reading */
export const cmdReadSensors = () => dispatch =>
  _sendCmd('READ_SENSORS', '', dispatch);

/** Begin continuous streaming of sensor data */
export const cmdStartStream = () => dispatch =>
  _sendCmd('STREAM_START', '', dispatch);

/** Stop streaming */
export const cmdStopStream = () => dispatch =>
  _sendCmd('STREAM_STOP', '', dispatch);

/**
 * pH calibration point.
 * Tells the device: "I'm in pH X buffer — capture your voltage now."
 * standardPH: 4 | 7 | 9
 */
export const cmdCalibratePhPoint = standardPH => dispatch =>
  _sendCmd('CAL_PH', String(standardPH), dispatch);

/**
 * EC calibration point.
 * standardEC: '0.0' | '1.413' | '12.88'
 */
export const cmdCalibrateEcPoint = standardEC => dispatch =>
  _sendCmd('CAL_EC', String(standardEC), dispatch);

/** Persist all calibration data to device flash */
export const cmdSaveCalibration = () => dispatch =>
  _sendCmd('CAL_SAVE', '', dispatch);

/** Wipe calibration data from device flash */
export const cmdResetCalibration = () => dispatch =>
  _sendCmd('CAL_RESET', '', dispatch);

/** Request device to send its stored calibration data */
export const cmdGetCalibration = () => dispatch =>
  _sendCmd('CAL_GET', '', dispatch);

// ─── Clear debug log ──────────────────────────────────────────────────────────
export const clearDebugLog = () => dispatch => dispatch(ac.debugClear());
