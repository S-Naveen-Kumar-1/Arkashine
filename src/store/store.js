import { applyMiddleware, combineReducers, legacy_createStore } from 'redux';
import authReducer from './reducers/authReducer';
import bleReducer from './reducers/bleReducer';
import testReducer from './reducers/testReducer';
import farmerReducer from './reducers/farmerReducer';
import reportReducer from './reducers/reportReducer';
import themeReducer from './reducers/themeReducer';

import { thunk } from 'redux-thunk';
import axios from 'axios';
import axiosMiddleware from 'redux-axios-middleware';
import { BASE_URL } from '../ApiConfig';
const combinerReducers = combineReducers({
  auth: authReducer,
  ble: bleReducer,
  test: testReducer,
  farmer: farmerReducer,
  report: reportReducer,
  theme: themeReducer, // ✅ THIS KEY IS CRITICAL
});

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});
export const store = legacy_createStore(
  combinerReducers,
  applyMiddleware(
    thunk,
    axiosMiddleware(client, { returnRejectedPromiseOnError: true }),
  ),
);
