// src/redux/actions/bleActions.js
//
// Single source of truth for ALL BLE operations.
// BleManager lives here as a module-level singleton.
// UUIDs are NEVER hardcoded — resolved by scanning the connected device at
// runtime (same auto-detect strategy as BLEContext).
//
// Firmware: ESP32_S3_BLE
//   • One characteristic: PROPERTY_WRITE | PROPERTY_NOTIFY (same UUID)
//   • Responds to every write with  "ACK: <value>"
//   • Handshake: app sends "ARKASHINE_DEVICE" → firmware replies "ACK: ARKASHINE_DEVICE"

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
  // payload = device id so the reducer knows which row to spin
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

export const startScan = () => dispatch => {
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

// ─── UUID auto-detection ──────────────────────────────────────────────────────
// Mirrors the AUTO mode in BLEContext exactly:
//   • Iterate every service → every characteristic.
//   • Pick the first notifiable/indicatable char as notifyUUID.
//   • Pick the first writable char as writeUUID.
//   • On ESP32_S3_BLE the same characteristic carries WRITE + NOTIFY so
//     notifyUUID === writeUUID.
async function resolveUUIDs(conn, dispatch) {
  dispatch(ac.log('UUID', 'Auto-detecting UUIDs…'));
  const services = await conn.services();

  for (const svc of services) {
    dispatch(ac.log('UUID', `  Service: ${svc.uuid}`));
    const chars = await svc.characteristics();
    let notifyUUID = null;
    let writeUUID = null;

    for (const c of chars) {
      const flags = [
        c.isNotifiable && 'NOTIFY',
        c.isIndicatable && 'INDICATE',
        c.isWritableWithResponse && 'WRITE',
        c.isWritableWithoutResponse && 'WRITE_NR',
        c.isReadable && 'READ',
      ]
        .filter(Boolean)
        .join('|');

      dispatch(ac.log('UUID', `    Char: ${c.uuid}  [${flags}]`));

      if (!notifyUUID && (c.isNotifiable || c.isIndicatable))
        notifyUUID = c.uuid;
      if (
        !writeUUID &&
        (c.isWritableWithResponse || c.isWritableWithoutResponse)
      )
        writeUUID = c.uuid;
    }

    if (notifyUUID) {
      const cfg = {
        serviceUUID: svc.uuid,
        notifyUUID,
        writeUUID: writeUUID || notifyUUID,
      };
      dispatch(ac.log('UUID', `Resolved →`));
      dispatch(ac.log('UUID', `  Service : ${cfg.serviceUUID}`));
      dispatch(ac.log('UUID', `  Notify  : ${cfg.notifyUUID}`));
      dispatch(ac.log('UUID', `  Write   : ${cfg.writeUUID}`));
      return cfg;
    }
  }

  dispatch(ac.log('UUID', 'ERROR: no notifiable characteristic found'));
  return null;
}

// ─── Data / notification parser ───────────────────────────────────────────────
// Handles four kinds of incoming data from the firmware:
//
//  1. "ARKASHINE_TRUE"           → handshake success (custom firmware)
//  2. "ACK: ARKASHINE_DEVICE"    → handshake success (current ACK firmware)
//  3. "ACK: <other>"             → command acknowledgement, not sensor data
//  4. JSON  { ec, ph, voltage }  → sensor reading
//  5. key=value CSV  ph=6.45,... → sensor reading
function parsePayload(bytes, dispatch) {
  const raw = bytes.toString('utf-8').trim();
  dispatch(ac.log('DATA', `RAW RECV: "${raw}"`));

  // ── 1. Handshake success (custom firmware) ─────────────────
  if (raw === 'ARKASHINE_TRUE') {
    dispatch(ac.handshakeSuccess(raw));
    dispatch(ac.log('HANDSHAKE', 'ARKASHINE_TRUE ✅'));
    return null; // not sensor data
  }

  // ── 2. Handshake ACK (current ESP32 test firmware) ─────────
  if (raw === 'ACK: ARKASHINE_DEVICE') {
    dispatch(ac.handshakeSuccess(raw));
    dispatch(ac.log('HANDSHAKE', `ACK confirmed ✅  raw="${raw}"`));
    return null;
  }

  // ── 3. Generic ACK — command confirmed, no sensor payload ──
  if (raw.startsWith('ACK:')) {
    dispatch(ac.log('CMD', `ACK received: "${raw}"`));
    return null;
  }

  // ── 4. JSON sensor data ────────────────────────────────────
  _dataCount += 1;
  const timestamp = Date.now();
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
        `JSON #${_dataCount} → EC=${p.ec} pH=${p.ph} V=${p.voltage}`,
      ),
    );
    return p;
  } catch (_) {}

  // ── 5. key=value CSV ───────────────────────────────────────
  const r = { ...base };
  for (const pair of raw.split(',')) {
    const [k, v] = pair.split('=');
    if (!k || v === undefined) continue;
    switch (k.trim().toLowerCase()) {
      case 'ec':
      case 'ec_dsm':
        r.ec = parseFloat(v);
        break;
      case 'ph':
        r.ph = parseFloat(v);
        break;
      case 'voltage':
      case 'v':
        r.voltage = parseFloat(v);
        break;
      case 'status':
        r.status = v.trim();
        break;
      case 'timer':
      case 'time':
        r.timer = parseInt(v, 10);
        break;
    }
  }
  if (r.ec !== null || r.ph !== null || r.voltage !== null) {
    dispatch(
      ac.log(
        'DATA',
        `KV #${_dataCount} → EC=${r.ec} pH=${r.ph} V=${r.voltage}`,
      ),
    );
    return r;
  }

  dispatch(ac.log('DATA', `Unknown format — ignoring: "${raw}"`));
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
        // Only push sensor data to Redux; handshake / ACK are handled inside parsePayload
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
  dispatch(ac.connectRequest(rawDevice.id)); // tells reducer which device is connecting
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

    // Subscribe BEFORE sending handshake so we catch the ACK
    startNotifications(conn, cfg, dispatch);

    // Handshake — firmware replies "ACK: ARKASHINE_DEVICE"
    dispatch(ac.handshakeStart());
    dispatch(ac.log('HANDSHAKE', 'Sending ARKASHINE_DEVICE…'));
    await _sendCmd('ARKASHINE_DEVICE', '', dispatch);

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
          await _sendCmd('ARKASHINE_DEVICE', '', dispatch);
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

// ─── Internal write helper ────────────────────────────────────────────────────
// Tries WRITE_WITH_RESPONSE first (matches ESP32 PROPERTY_WRITE), then without.
async function _sendCmd(command, params, dispatch) {
  if (!_device || !_config) {
    dispatch(ac.log('CMD', 'Not connected'));
    return false;
  }
  // console.log(`_sendCmd: ${command}  params: ${params}`);
  const cmdStr = params ? `${command}:${params}` : command;
  const b64 = Buffer.from(cmdStr, 'utf-8').toString('base64');
  dispatch(ac.log('CMD', `→ "${cmdStr}"`));
  console.log(`_sendCmd: cmdStr="${cmdStr}",b64="${b64}"`);  

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

// ─── Public command thunks ────────────────────────────────────────────────────

/** Retrigger handshake manually */
export const cmdHandshake = () => async dispatch => {
  dispatch(ac.handshakeStart());
  dispatch(ac.log('HANDSHAKE', 'Sending ARKASHINE_DEVICE…'));
  await _sendCmd('ARKASHINE_DEVICE', '', dispatch);
};

// ── pH / EC test ──────────────────────────────────────────────────────────────

/** Request a single pH + EC + voltage reading */
export const cmdReadSensors = () => dispatch =>
  _sendCmd('READ_SENSORS', '', dispatch);

/** Start continuous data stream */
export const cmdStartStream = () => dispatch =>
  _sendCmd('STREAM_START', '', dispatch);

/** Stop continuous stream */
export const cmdStopStream = () => dispatch =>
  _sendCmd('STREAM_STOP', '', dispatch);

// ── Soil test — motor control ─────────────────────────────────────────────────

/** Run mixing motor for N seconds (default 60) */
export const cmdMotorStart =
  (seconds = 60) =>
  dispatch =>
    _sendCmd('MOTOR_ON', String(seconds), dispatch);

/** Stop motor immediately */
export const cmdMotorStop = () => dispatch =>
  _sendCmd('MOTOR_OFF', '', dispatch);

// ── Calibration ───────────────────────────────────────────────────────────────

/** pH calibration point — standardPH: 4 | 7 | 9 */
export const cmdCalibratePhPoint = standardPH => dispatch =>
  _sendCmd('CAL_PH', String(standardPH), dispatch);

/** EC calibration point — standardEC: 0.0 | 1.413 | 12.88 */
export const cmdCalibrateEcPoint = standardEC => dispatch =>
  _sendCmd('CAL_EC', String(standardEC), dispatch);

/** Save calibration to device flash */
export const cmdSaveCalibration = () => dispatch =>
  _sendCmd('CAL_SAVE', '', dispatch);

/** Wipe calibration from device flash */
export const cmdResetCalibration = () => dispatch =>
  _sendCmd('CAL_RESET', '', dispatch);

/** Retrieve stored calibration from device */
export const cmdGetCalibration = () => dispatch =>
  _sendCmd('CAL_GET', '', dispatch);

// ── Misc ──────────────────────────────────────────────────────────────────────

/** Clear the Redux debug log */
export const clearDebugLog = () => dispatch => dispatch(ac.debugClear());
