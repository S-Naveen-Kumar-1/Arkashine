import { applyMiddleware, combineReducers, legacy_createStore } from 'redux';
import authReducer from './reducers/authReducer';
import bleReducer from './reducers/bleReducer';
import testReducer from './reducers/testReducer';
import farmerReducer from './reducers/farmerReducer';
import reportReducer from './reducers/reportReducer';
import themeReducer from './reducers/themeReducer';
import calibrationReducer from './reducers/calibrationReducer';

import { thunk } from 'redux-thunk';
import axiosMiddleware from 'redux-axios-middleware';
import { BASE_URL } from '../ApiConfig';
import axios from 'axios';
const combinerReducers = combineReducers({
  auth: authReducer,
  ble: bleReducer,
  test: testReducer,
  farmer: farmerReducer,
  report: reportReducer,
  theme: themeReducer,
  calibration: calibrationReducer,
});

const client = axios.create({
  baseURL: BASE_URL,
});
export const store = legacy_createStore(
  combinerReducers,
  applyMiddleware(
    thunk,
    axiosMiddleware(client, { returnRejectedPromiseOnError: true }),
  ),
);
