// src/config/actionTypes.js

// ── AUTH ─────────────────────────────────────────────────────
export const LOGIN_REQUEST = 'LOGIN_REQUEST';
export const LOGIN_SUCCESS = 'LOGIN_SUCCESS';
export const LOGIN_FAILED = 'LOGIN_FAILED';
export const REGISTER_REQUEST = 'REGISTER_REQUEST';
export const REGISTER_SUCCESS = 'REGISTER_SUCCESS';
export const REGISTER_FAILED = 'REGISTER_FAILED';
export const LOGOUT_REQUEST = 'LOGOUT_REQUEST';

// ── THEME ────────────────────────────────────────────────────
export const THEME_TOGGLE = 'THEME_TOGGLE';

// ── BLE ADAPTER ──────────────────────────────────────────────
export const BLE_STATE_CHANGED = 'BLE_STATE_CHANGED';

// ── BLE SCAN ─────────────────────────────────────────────────
export const BLE_SCAN_START = 'BLE_SCAN_START';
export const BLE_SCAN_STOP = 'BLE_SCAN_STOP';
export const BLE_DEVICE_FOUND = 'BLE_DEVICE_FOUND';

// ── BLE CONNECTION ───────────────────────────────────────────
export const BLE_CONNECT_REQUEST = 'BLE_CONNECT_REQUEST';
export const BLE_CONNECT_SUCCESS = 'BLE_CONNECT_SUCCESS';
export const BLE_CONNECT_FAILED = 'BLE_CONNECT_FAILED';
export const BLE_DISCONNECT = 'BLE_DISCONNECT';
export const BLE_CONFIG_RESOLVED = 'BLE_CONFIG_RESOLVED'; // dynamic UUIDs stored

// ── BLE DATA ─────────────────────────────────────────────────
export const BLE_DATA_RECEIVED = 'BLE_DATA_RECEIVED';

// ── BLE COMMANDS ─────────────────────────────────────────────
export const BLE_CMD_SENT = 'BLE_CMD_SENT';
export const BLE_CMD_FAILED = 'BLE_CMD_FAILED';

// ── DEBUG LOGS ───────────────────────────────────────────────
export const BLE_DEBUG_LOG = 'BLE_DEBUG_LOG';
export const BLE_DEBUG_CLEAR = 'BLE_DEBUG_CLEAR';

// ── CALIBRATION ───────────────────────────────────────────────
export const CAL_PH_POINT_SAVED = 'CAL_PH_POINT_SAVED';
export const CAL_EC_POINT_SAVED = 'CAL_EC_POINT_SAVED';
export const CAL_SAVED_TO_DEVICE = 'CAL_SAVED_TO_DEVICE';
export const CAL_RESET = 'CAL_RESET';

// ── TEST FLOW ────────────────────────────────────────────────
export const TEST_RESET = 'TEST_RESET';
export const TEST_MOTOR_START = 'TEST_MOTOR_START';
export const TEST_MOTOR_TICK = 'TEST_MOTOR_TICK';
export const TEST_MOTOR_DONE = 'TEST_MOTOR_DONE';
export const TEST_READING_START = 'TEST_READING_START';
export const TEST_RESULTS_RECEIVED = 'TEST_RESULTS_RECEIVED';
export const TEST_SAVED = 'TEST_SAVED';

// ── FARMER ───────────────────────────────────────────────────
export const FARMER_SAVE = 'FARMER_SAVE';
export const FARMER_LOCATION_SET = 'FARMER_LOCATION_SET';

// ── REPORT ───────────────────────────────────────────────────
export const REPORT_SAVE = 'REPORT_SAVE';
export const REPORT_LANGUAGE_SET = 'REPORT_LANGUAGE_SET';
