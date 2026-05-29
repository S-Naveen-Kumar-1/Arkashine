// src/redux/actions/reportsActions.js

import { REPORTS_ACTION_TYPES } from '../reducers/reportsReducer';

const {
  REPORTS_FETCH_DEVICES_REQUEST,
  REPORTS_FETCH_READINGS_REQUEST,
  REPORTS_FETCH_READING_REQUEST,
  FETCH_DEVICE_FIELD_SCHEMA,
  REPORTS_CLEAR_READING,
  REPORTS_RESET,
} = REPORTS_ACTION_TYPES;

// GET /api/mobile/devices/
export function fetchReportDevices(type = null) {
  return {
    type: REPORTS_FETCH_DEVICES_REQUEST,
    payload: {
      request: {
        url: '/api/mobile/devices/',
        method: 'GET',
        params: type ? { type } : {},
      },
    },
  };
}

// GET /api/mobile/devices/{device_id}/api-calls/?page=1&per_page=20
export function fetchDeviceReadings(deviceId, page = 1, perPage = 20) {
  return {
    type: REPORTS_FETCH_READINGS_REQUEST,
    meta: { deviceId },
    payload: {
      request: {
        url: `/api/mobile/devices/${deviceId}/api-calls/`,
        method: 'GET',
        params: { page, per_page: perPage },
      },
    },
  };
}

// GET /api/mobile/devices/{device_id}/api-calls/{reading_id}/
export function fetchReadingDetail(deviceId, readingId) {
  return {
    type: REPORTS_FETCH_READING_REQUEST,
    meta: { deviceId, readingId },
    payload: {
      request: {
        url: `/api/mobile/devices/${deviceId}/api-calls/${readingId}/`,
        method: 'GET',
      },
    },
  };
}

// GET /api/mobile/device-types/{type_key}/field-schema/
// Valid type_key: soilsaathi | atmo_sense | soil_life | ph_bottle
export function fetchDeviceFieldSchema(type_key) {
  return {
    type: FETCH_DEVICE_FIELD_SCHEMA,
    meta: { type_key },
    payload: {
      request: {
        url: `/api/mobile/device-types/${type_key}/field-schema/`,
        method: 'GET',
      },
    },
  };
}

export function clearSelectedReading() {
  return { type: REPORTS_CLEAR_READING };
}
export function resetReports() {
  return { type: REPORTS_RESET };
}
