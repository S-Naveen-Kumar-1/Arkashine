// src/config/actionTypes.js

// ── AUTH ─────────────────────────────────────────────────────
export const LOGIN_REQUEST          = 'LOGIN_REQUEST';
export const LOGIN_SUCCESS          = 'LOGIN_SUCCESS';
export const LOGIN_FAILED           = 'LOGIN_FAILED';

export const REGISTER_REQUEST       = 'REGISTER_REQUEST';
export const REGISTER_SUCCESS       = 'REGISTER_SUCCESS';
export const REGISTER_FAILED        = 'REGISTER_FAILED';

export const LOGOUT_REQUEST         = 'LOGOUT_REQUEST';

// ── BLE ──────────────────────────────────────────────────────
export const BLE_SCAN_START         = 'BLE_SCAN_START';
export const BLE_SCAN_STOP          = 'BLE_SCAN_STOP';
export const BLE_DEVICE_FOUND       = 'BLE_DEVICE_FOUND';
export const BLE_CONNECT_REQUEST    = 'BLE_CONNECT_REQUEST';
export const BLE_CONNECT_SUCCESS    = 'BLE_CONNECT_SUCCESS';
export const BLE_CONNECT_FAILED     = 'BLE_CONNECT_FAILED';
export const BLE_DISCONNECT         = 'BLE_DISCONNECT';
export const BLE_DATA_RECEIVED      = 'BLE_DATA_RECEIVED';
export const BLE_COMMAND_SEND       = 'BLE_COMMAND_SEND';

// ── TEST FLOW ────────────────────────────────────────────────
export const TEST_RESET             = 'TEST_RESET';
export const TEST_POUR_DETECTED     = 'TEST_POUR_DETECTED';
export const TEST_TIMER_START       = 'TEST_TIMER_START';
export const TEST_TIMER_TICK        = 'TEST_TIMER_TICK';
export const TEST_TIMER_DONE        = 'TEST_TIMER_DONE';
export const TEST_SENSOR_START      = 'TEST_SENSOR_START';
export const TEST_SENSOR_TICK       = 'TEST_SENSOR_TICK';
export const TEST_SENSOR_DONE       = 'TEST_SENSOR_DONE';
export const TEST_RESULTS_RECEIVED  = 'TEST_RESULTS_RECEIVED';

// ── FARMER ───────────────────────────────────────────────────
export const FARMER_SAVE            = 'FARMER_SAVE';
export const FARMER_LOCATION_GET    = 'FARMER_LOCATION_GET';
export const FARMER_LOCATION_SET    = 'FARMER_LOCATION_SET';

// ── REPORT ───────────────────────────────────────────────────
export const REPORT_SAVE            = 'REPORT_SAVE';
export const REPORT_PRINT_REQUEST   = 'REPORT_PRINT_REQUEST';
export const REPORT_PRINT_SUCCESS   = 'REPORT_PRINT_SUCCESS';
export const REPORT_LANGUAGE_SET    = 'REPORT_LANGUAGE_SET';

// ── THEME ────────────────────────────────────────────────────
export const THEME_TOGGLE           = 'THEME_TOGGLE';