// src/store/reducers/bleReducer.js
import {
  BLE_SCAN_START,
  BLE_SCAN_STOP,
  BLE_DEVICE_FOUND,
  BLE_CONNECT_REQUEST,
  BLE_CONNECT_SUCCESS,
  BLE_CONNECT_FAILED,
  BLE_DISCONNECT,
  BLE_DATA_RECEIVED,
} from '../../config/actionTypes';

const init = {
  scanning: false,
  devices: [],
  device: null,
  connected: false,
  connecting: false,
  error: null,
  rawPayload: null,
  lastReceived: null,
};

export default function bleReducer(state = init, action) {
  switch (action.type) {
    case BLE_SCAN_START:
      return { ...state, scanning: true, devices: [] };
    case BLE_SCAN_STOP:
      return { ...state, scanning: false };
    case BLE_DEVICE_FOUND:
      return state.devices.find(d => d.id === action.payload.id)
        ? state
        : { ...state, devices: [...state.devices, action.payload] };
    case BLE_CONNECT_REQUEST:
      return { ...state, connecting: true, error: null };
    case BLE_CONNECT_SUCCESS:
      return {
        ...state,
        connecting: false,
        connected: true,
        device: action.payload,
      };
    case BLE_CONNECT_FAILED:
      return { ...state, connecting: false, error: action.payload };
    case BLE_DISCONNECT:
      return { ...state, connected: false, device: null };
    case BLE_DATA_RECEIVED:
      return { ...state, rawPayload: action.payload, lastReceived: Date.now() };
    default:
      return state;
  }
}
