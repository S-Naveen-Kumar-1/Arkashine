// src/redux/reducers/bleReducer.js
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

const MAX_LOGS = 300;

const init = {
  bleAdapterState: 'Unknown',

  // Scan
  scanning: false,
  devices: [],

  // Connection
  connected: false,
  connecting: false,
  device: null, // { id, name } — serialisable only
  error: null,
  connectingDeviceId: null,
  // Dynamic UUID config (auto-detected from device)
  bleConfig: null, // { serviceUUID, notifyUUID, writeUUID }

  // Latest sensor data from device
  sensorData: {
    ec: null,
    ph: null,
    voltage: null,
    status: null,
    timer: null,
    raw: '',
    timestamp: 0,
    receivedCount: 0,
  },
  rawPayload: null,
  lastReceived: null,

  // Command tracking
  lastCmd: null,
  lastCmdError: null,

  // Debug log ring buffer
  debugLogs: [],
  handshakeStatus: 'idle',
  handshakeRaw: null,
};

export default function bleReducer(state = init, action) {
  switch (action.type) {
    case BLE_STATE_CHANGED:
      return { ...state, bleAdapterState: action.payload };

    // ── Scan ──────────────────────────────────────────────────
    case BLE_SCAN_START:
      return { ...state, scanning: true, devices: [], error: null };

    case BLE_SCAN_STOP:
      return { ...state, scanning: false };

    case BLE_DEVICE_FOUND: {
      const idx = state.devices.findIndex(d => d.id === action.payload.id);
      if (idx !== -1) {
        const updated = [...state.devices];
        updated[idx] = { ...updated[idx], rssi: action.payload.rssi };
        return { ...state, devices: updated };
      }
      return { ...state, devices: [...state.devices, action.payload] };
    }

    // ── Connection ────────────────────────────────────────────
    case BLE_CONNECT_REQUEST:
      return {
        ...state,
        connecting: true,
        connectingDeviceId: action.payload, // 🔥 add this
        error: null,
        bleConfig: null,
      };

    case BLE_CONNECT_SUCCESS:
      return {
        ...state,
        connecting: false,
        connected: true,
        device: action.payload,
        handshakeStatus: 'waiting',
        error: null,
      };

    case BLE_CONNECT_FAILED:
      return {
        ...state,
        connecting: false,
        connected: false,
        device: null,
        error: action.payload,
      };

    case BLE_DISCONNECT:
      return {
        ...state,
        connected: false,
        device: null,
        bleConfig: null,
        sensorData: { ...init.sensorData },
        lastCmd: null,
        lastCmdError: null,
        handshakeStatus: 'idle', // 🔥 ADD
        handshakeRaw: null, // 🔥 ADD
      };

    case BLE_CONFIG_RESOLVED:
      return { ...state, bleConfig: action.payload };

    // ── Data ──────────────────────────────────────────────────
    case BLE_DATA_RECEIVED: {
      const raw = action.payload.raw;

      let status = state.handshakeStatus;
      let handshakeRaw = state.handshakeRaw;

      if (raw?.toLowerCase().trim() === 'connectiontrue') {
        status = 'success';
        handshakeRaw = raw;
      }

      return {
        ...state,
        sensorData: action.payload,
        rawPayload: raw,
        lastReceived: Date.now(),
        handshakeStatus: status,
        handshakeRaw,
      };
    }

    // ── Commands ──────────────────────────────────────────────
    case BLE_CMD_SENT:
      return { ...state, lastCmd: action.payload, lastCmdError: null };

    case BLE_CMD_FAILED:
      return { ...state, lastCmdError: action.payload };

    // ── Debug ─────────────────────────────────────────────────
    case BLE_DEBUG_LOG:
      return {
        ...state,
        debugLogs: [action.payload, ...state.debugLogs.slice(0, MAX_LOGS - 1)],
      };

    case BLE_DEBUG_CLEAR:
      return { ...state, debugLogs: [] };
    case 'BLE_HANDSHAKE_FAILED':
      return {
        ...state,
        handshakeStatus: 'failed',
      };
    default:
      return state;
  }
}
