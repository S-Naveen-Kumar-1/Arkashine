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
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      },
    },
  };
}
