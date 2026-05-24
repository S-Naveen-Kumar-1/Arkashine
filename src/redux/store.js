// src/redux/store.js

import { applyMiddleware, combineReducers, legacy_createStore } from 'redux';
import { thunk } from 'redux-thunk';
import axios from 'axios';
import axiosMiddleware from 'redux-axios-middleware';

import { BASE_URL } from '../ApiConfig';

import authReducer from './reducers/authReducer';
import bleReducer from './reducers/bleReducer';
import phTestReducer from './reducers/phTestReducer';
import themeReducer from './reducers/themeReducer';
import deviceReducer from './reducers/deviceReducer';
import soilsaathiReducer from './reducers/soilsaathiReducer';
import calibrationReducer from './reducers/calibrationReducer';
import reportsReducer from './reducers/reportsReducer';
import soilPartnerReducer from './reducers/soilPartnerReducer';

const rootReducer = combineReducers({
  auth:        authReducer,
  ble:         bleReducer,
  phtest:      phTestReducer,
  theme:       themeReducer,
  calibration: calibrationReducer,
  userDevices: deviceReducer,
  soilsaathi:  soilsaathiReducer,
  reports:     reportsReducer,
  soilPartner: soilPartnerReducer, 
});

// ─── Axios client ─────────────────────────────────────────────────────────────
export const client = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

// ─── Store ────────────────────────────────────────────────────────────────────
export const store = legacy_createStore(
  rootReducer,
  applyMiddleware(
    thunk,
    axiosMiddleware(client, {
      returnRejectedPromiseOnError: true,
    }),
  ),
);

// ─── Request interceptor — attach access token ────────────────────────────────
client.interceptors.request.use(
  config => {
    try {
      const token = store.getState()?.auth?.token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn('[Auth] Token attach error:', e.message);
    }
    return config;
  },
  error => Promise.reject(error),
);

// ─── Response interceptor — refresh token on 401 ─────────────────────────────
//
// Flow:
//   1. Request fails with 401
//   2. We check if we have a refreshToken in Redux state
//   3. Call POST /api/mobile/auth/refresh/ with { refresh }
//   4. If successful → store new access token → retry original request
//   5. If refresh also fails → dispatch LOGOUT → reject
//
// _isRefreshing prevents multiple parallel requests all triggering refresh.
// _failedQueue holds requests that came in while refresh was in progress.

let _isRefreshing = false;
let _failedQueue  = [];

function processQueue(error, token = null) {
  _failedQueue.forEach(p => {
    if (error) p.reject(error);
    else p.resolve(token);
  });
  _failedQueue = [];
}

client.interceptors.response.use(
  response => response,

  async error => {
    const originalRequest = error.config;

    // Only handle 401 and only retry once (_retry flag)
    if (error?.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Don't try to refresh the refresh call itself — that would loop
    if (originalRequest.url?.includes('/auth/refresh/')) {
      store.dispatch({ type: 'LOGOUT_REQUEST' });
      return Promise.reject(error);
    }

    // If a refresh is already in progress, queue this request
    if (_isRefreshing) {
      return new Promise((resolve, reject) => {
        _failedQueue.push({ resolve, reject });
      })
        .then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return client(originalRequest);
        })
        .catch(err => Promise.reject(err));
    }

    originalRequest._retry = true;
    _isRefreshing = true;

    const refreshToken = store.getState()?.auth?.refreshToken;

    if (!refreshToken) {
      _isRefreshing = false;
      store.dispatch({ type: 'LOGOUT_REQUEST' });
      return Promise.reject(error);
    }

    try {
      const { data } = await axios.post(
        `${BASE_URL}/api/mobile/auth/refresh/`,
        { refresh: refreshToken },
      );

      const newAccessToken = data.access;

      // Save new access token to Redux
      store.dispatch({
        type: 'AUTH_TOKEN_REFRESHED',
        payload: { token: newAccessToken },
      });

      // Update default header for future requests
      client.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;

      // Retry all queued requests with new token
      processQueue(null, newAccessToken);

      // Retry the original failed request
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return client(originalRequest);

    } catch (refreshError) {
      processQueue(refreshError, null);
      store.dispatch({ type: 'LOGOUT_REQUEST' });
      return Promise.reject(refreshError);
    } finally {
      _isRefreshing = false;
    }
  },
);