// src/redux/store.js

import { applyMiddleware, combineReducers, legacy_createStore } from 'redux';
import { thunk } from 'redux-thunk';
import axios from 'axios';
import axiosMiddleware from 'redux-axios-middleware';

import { BASE_URL } from '../ApiConfig';

// reducers
import authReducer from './reducers/authReducer';
import bleReducer from './reducers/bleReducer';
import testReducer from './reducers/testReducer';
import farmerReducer from './reducers/farmerReducer';
import reportReducer from './reducers/reportReducer';
import themeReducer from './reducers/themeReducer';
import calibrationReducer from './reducers/calibrationReducer';
import deviceReducer from './reducers/deviceReducer';
import soilsaathiReducer from './reducers/soilsaathiReducer';

// ─────────────────────────────────────────
// Combine reducers
// ─────────────────────────────────────────
const rootReducer = combineReducers({
  auth: authReducer,
  ble: bleReducer,
  test: testReducer,
  farmer: farmerReducer,
  report: reportReducer,
  theme: themeReducer,
  calibration: calibrationReducer,
  userDevices: deviceReducer,
  soilsaathi: soilsaathiReducer,
});

// ─────────────────────────────────────────
// Axios client
// ─────────────────────────────────────────
const client = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

// ─────────────────────────────────────────
// Store
// ─────────────────────────────────────────
export const store = legacy_createStore(
  rootReducer,
  applyMiddleware(
    thunk,
    axiosMiddleware(client, {
      returnRejectedPromiseOnError: true,
    }),
  ),
);

// ─────────────────────────────────────────
// Attach token automatically
// ─────────────────────────────────────────
client.interceptors.request.use(
  config => {
    try {
      const state = store.getState();
      const token = state?.auth?.token;

      console.log('Attaching token to request:', token ? 'Yes' : 'No');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.log('Token attach error:', e);
    }

    return config;
  },
  error => Promise.reject(error),
);

// ─────────────────────────────────────────
// Optional: handle 401 globally
// ─────────────────────────────────────────
client.interceptors.response.use(
  response => response,
  error => {
    if (error?.response?.status === 401) {
      console.log('Unauthorized - token expired');

      // optional: logout user
      // store.dispatch({ type: 'LOGOUT' });
    }

    return Promise.reject(error);
  },
);
