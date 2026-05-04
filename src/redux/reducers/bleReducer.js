// src/redux/reducers/bleReducer.js
//
// Stores ALL BLE state including every firmware response type.
//
// Key fields:
//   sensorData        — latest sensor reading (from TEST:START or FINAL_RESULT)
//   testStarted       — true after {"TEST":"STARTED"} received
//   motorStatus       — 'idle'|'running'|'stopped' (from CHECKMOTORSTATUS or TEST:STOPPED)
//   lastDeviceError   — last ERROR string from firmware (cleared on reconnect)
//   calibrationStatus — last CALIBRATION_STATUS string from device
//   finalResult       — full result from FINAL_RESULT command (separate from sensorData)
//   handshakeStatus   — null|'pending'|'success'|'failed'

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

const MAX_LOGS = 300;

const EMPTY_SENSOR = {
  pH: null, // firmware "pH"
  TDS: null, // firmware "TDS"
  phVoltage: null, // firmware "pHVoltage"
  ecVoltage: null, // firmware "ECVoltage"
  temperature: null, // firmware "temperature"
  temperatureFallback: false,
  raw: '',
  timestamp: 0,
  receivedCount: 0,
};

const init = {
  // Adapter
  bleAdapterState: 'Unknown',

  // Scan
  scanning: false,
  devices: [],

  // Connection
  connected: false,
  connecting: false,
  connectingDeviceId: null,
  device: null,
  error: null,

  // UUID config
  bleConfig: null,

  // Handshake — ← {"STATUS":"BLE_CONNECTED"} or {"HANDSHAKE":"ACK"}
  handshakeStatus: null, // null | 'pending' | 'success' | 'failed'
  handshakeRaw: null,

  // Sensor data — ← {"pH":...,"TDS":...,...}  from TEST:START result
  sensorData: EMPTY_SENSOR,
  lastReceived: null,

  // Test started status — ← {"TEST":"STARTED"}  immediate ACK to TEST:START
  testStarted: false,

  // Motor status — ← {"MOTORSTATUS":"RUNNING"|"STOPPED"}  from CHECKMOTORSTATUS
  //              — ← {"TEST":"STOPPED"}  from TEST:STOP
  // 'idle' = not yet started, 'running' = firmware confirmed running,
  // 'stopped' = firmware confirmed stopped or test finished
  motorStatus: 'idle',

  // Device errors — ← {"ERROR":"..."}  unsolicited
  lastDeviceError: null,

  // Calibration status — ← {"CALIBRATION_STATUS":"PH_4_DONE"|...|"ALL_DONE"}
  calibrationStatus: null,

  // Final result — ← {"FINAL_RESULT":{...}}  from GET_FINAL_RESULT command
  // Stored separately from sensorData so screens can distinguish the source.
  finalResult: null,

  // Command tracking
  lastCmd: null,
  lastCmdError: null,

  // calibration points for graphing and interpolation
  calibrationPoints: {
    PH: {},
    EC: {},
  },

  // Debug log ring buffer
  debugLogs: [],
};

export default function bleReducer(state = init, action) {
  switch (action.type) {
    case BLE_STATE_CHANGED:
      return { ...state, bleAdapterState: action.payload };

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

    case BLE_CONNECT_REQUEST:
      return {
        ...state,
        connecting: true,
        connectingDeviceId: action.payload,
        error: null,
        bleConfig: null,
        handshakeStatus: null,
        handshakeRaw: null,
        testStarted: false,
        motorStatus: 'idle',
        lastDeviceError: null,
        calibrationStatus: null,
        finalResult: null,
      };
    case BLE_CONNECT_SUCCESS:
      return {
        ...state,
        connecting: false,
        connectingDeviceId: null,
        connected: true,
        device: action.payload,
        error: null,
      };
    case BLE_CONNECT_FAILED:
      return {
        ...state,
        connecting: false,
        connectingDeviceId: null,
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
        connectingDeviceId: null,
        handshakeStatus: null,
        handshakeRaw: null,
        sensorData: EMPTY_SENSOR,
        lastReceived: null,
        testStarted: false,
        motorStatus: 'idle',
        lastDeviceError: null,
        calibrationStatus: null,
        finalResult: null,
        lastCmd: null,
        lastCmdError: null,
      };
    case BLE_CONFIG_RESOLVED:
      return { ...state, bleConfig: action.payload };

    case BLE_HANDSHAKE_START:
      return { ...state, handshakeStatus: 'pending', handshakeRaw: null };
    case BLE_HANDSHAKE_SUCCESS:
      return {
        ...state,
        handshakeStatus: 'success',
        handshakeRaw: action.payload,
      };
    case BLE_HANDSHAKE_FAILED:
      return { ...state, handshakeStatus: 'failed' };

    // ← {"pH":...,"TDS":...,...}  from TEST:START ~60 s result
    case BLE_DATA_RECEIVED:
      return {
        ...state,
        sensorData: action.payload,
        lastReceived: Date.now(),
        motorStatus: 'stopped',
      };

    // ← {"TEST":"STARTED"}  immediate ACK to TEST:START
    case BLE_TEST_STARTED:
      return {
        ...state,
        testStarted: true,
        motorStatus: 'running',
        lastDeviceError: null,
      };

    // ← {"TEST":"STOPPED"}  response to TEST:STOP
    case BLE_TEST_STOPPED:
      return { ...state, testStarted: false, motorStatus: 'stopped' };

    // ← {"MOTORSTATUS":"RUNNING"|"STOPPED"}  from CHECKMOTORSTATUS poll
    case BLE_MOTOR_STATUS:
      return { ...state, motorStatus: action.payload };

    // ← {"ERROR":"..."}  unsolicited device error
    case BLE_DEVICE_ERROR:
      return { ...state, lastDeviceError: action.payload };

    // ← {"CALIBRATION_STATUS":"..."}  response to CALIBRATION_STATUS query
    case BLE_CALIBRATION_STATUS:
      return { ...state, calibrationStatus: action.payload };

    // ← {"FINAL_RESULT":{...}}  response to FINAL_RESULT command
    // Updates BOTH finalResult AND sensorData so result screen always has fresh data
    case BLE_FINAL_RESULT:
      return {
        ...state,
        finalResult: action.payload,
        sensorData: action.payload,
        lastReceived: Date.now(),
      };

    case BLE_CMD_SENT:
      return { ...state, lastCmd: action.payload, lastCmdError: null };
    case BLE_CMD_FAILED:
      return { ...state, lastCmdError: action.payload };

    case BLE_DEBUG_LOG:
      return {
        ...state,
        debugLogs: [action.payload, ...state.debugLogs.slice(0, MAX_LOGS - 1)],
      };
    case BLE_DEBUG_CLEAR:
      return { ...state, debugLogs: [] };
    case CAL_POINT_DONE: {
      const { type, value, voltage } = action.payload;

      return {
        ...state,

        // ✅ update sensorData also (IMPORTANT for live UI)
        sensorData: {
          ...state.sensorData,
          ...(type === 'PH' ? { phVoltage: voltage } : { ecVoltage: voltage }),
          receivedCount: state.sensorData.receivedCount + 1,
        },
        // ✅ store calibration history
        calibrationPoints: {
          ...state.calibrationPoints,
          [type]: {
            ...state.calibrationPoints[type],
            [value]: voltage,
          },
        },
      };
    }
    default:
      return state;
  }
}
