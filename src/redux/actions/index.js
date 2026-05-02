// src/redux/actions/index.js
import {
  LOGIN_REQUEST,
  LOGIN_SUCCESS,
  LOGIN_FAILED,
  REGISTER_REQUEST,
  REGISTER_SUCCESS,
  REGISTER_FAILED,
  LOGOUT_REQUEST,
  THEME_TOGGLE,
  BLE_SCAN_START,
  BLE_SCAN_STOP,
  BLE_DEVICE_FOUND,
  BLE_CONNECT_REQUEST,
  BLE_CONNECT_SUCCESS,
  BLE_CONNECT_FAILED,
  BLE_DISCONNECT,
  BLE_DATA_RECEIVED,
  TEST_RESET,
  TEST_POUR_DETECTED,
  TEST_TIMER_START,
  TEST_TIMER_TICK,
  TEST_TIMER_DONE,
  TEST_SENSOR_START,
  TEST_SENSOR_TICK,
  TEST_SENSOR_DONE,
  TEST_RESULTS_RECEIVED,
  FARMER_SAVE,
  FARMER_LOCATION_SET,
  REPORT_SAVE,
  REPORT_LANGUAGE_SET,
} from '../../config/actionTypes';

import axios from 'axios';

export function loginUser({ username, password }) {
  return {
    type: 'LOGIN_USER',
    payload: {
      request: {
        url: '/api/mobile/auth/login/',
        method: 'POST',
        data: {
          username,
          password,
        },
      },
    },
  };
}
export function registerUser({
  username,
  password,
  email,
  first_name,
  last_name,
  phone,
}) {
  return {
    type: 'REGISTER_USER',
    payload: {
      request: {
        url: '/api/mobile/auth/register/',
        method: 'POST',
        data: {
          username,
          password,
          email,
          first_name,
          last_name,
          phone,
        },
      },
    },
  };
}

export const clearAuthError = () => ({
  type: 'CLEAR_AUTH_ERROR',
});
export const logoutUser = () => ({ type: LOGOUT_REQUEST });

// ── THEME ────────────────────────────────────────────────────
export const toggleTheme = () => ({ type: THEME_TOGGLE });
export function getUserDevices(token) {
  return {
    type: 'GET_USER_DEVICES',
    payload: {
      request: {
        url: '/api/mobile/devices/',
        method: 'GET',
      },
    },
  };
}

// ── BLE ──────────────────────────────────────────────────────
export const bleDeviceFound = d => ({ type: BLE_DEVICE_FOUND, payload: d });
export const bleConnectReq = () => ({ type: BLE_CONNECT_REQUEST });
export const bleConnectOk = d => ({ type: BLE_CONNECT_SUCCESS, payload: d });
export const bleConnectFail = e => ({ type: BLE_CONNECT_FAILED, payload: e });
export const bleDisconnect = () => ({ type: BLE_DISCONNECT });
export const bleDataReceived = d => ({ type: BLE_DATA_RECEIVED, payload: d });
export const bleScanStart = () => ({ type: BLE_SCAN_START });
export const bleScanStop = () => ({ type: BLE_SCAN_STOP });

// ── TEST FLOW ────────────────────────────────────────────────
export const testReset = () => ({ type: TEST_RESET });
export const testPourDetected = () => ({ type: TEST_POUR_DETECTED });

export const startSettleTimer = () => dispatch => {
  dispatch({ type: TEST_TIMER_START });
  const interval = setInterval(() => {
    dispatch({ type: TEST_TIMER_TICK });
  }, 1000);
  setTimeout(() => {
    clearInterval(interval);
    dispatch({ type: TEST_TIMER_DONE });
  }, 180000);
};

export const startSensorCountdown = onTick => dispatch => {
  dispatch({ type: TEST_SENSOR_START });
  let elapsed = 0;
  const interval = setInterval(() => {
    elapsed++;
    const liveData = onTick ? onTick() : {};
    dispatch({ type: TEST_SENSOR_TICK, payload: liveData });
    if (elapsed >= 30) {
      clearInterval(interval);
      dispatch({ type: TEST_SENSOR_DONE });
    }
  }, 1000);
};

// ── FARMER ───────────────────────────────────────────────────
export const saveFarmer = data => ({ type: FARMER_SAVE, payload: data });
export const setLocation = location => ({
  type: FARMER_LOCATION_SET,
  payload: location,
});

// ── REPORT ───────────────────────────────────────────────────
export const saveReport = data => ({ type: REPORT_SAVE, payload: data });
export const setLanguage = lang => ({
  type: REPORT_LANGUAGE_SET,
  payload: lang,
});
