// src/redux/actions/reportsActions.js
//
// Uses the axios-middleware action shape:
//   { type, payload: { request: { url, method, params } } }
//
import { REPORTS_ACTION_TYPES } from '../reducers/reportsReducer';

const {
  REPORTS_FETCH_DEVICES_REQUEST,
  REPORTS_FETCH_DEVICES_SUCCESS,
  REPORTS_FETCH_DEVICES_FAILURE,
  REPORTS_FETCH_READINGS_REQUEST,
  REPORTS_FETCH_READINGS_SUCCESS,
  REPORTS_FETCH_READINGS_FAILURE,
  REPORTS_FETCH_READING_REQUEST,
  REPORTS_FETCH_READING_SUCCESS,
  REPORTS_FETCH_READING_FAILURE,
  REPORTS_CLEAR_READING,
  REPORTS_RESET,
} = REPORTS_ACTION_TYPES;

// ─── 1. Fetch all devices ─────────────────────────────────────────────────────
// GET /api/mobile/devices/
// Optional ?type= filter (soilsaathi | ph_bottle | atmo_sense | soil_life)
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
    // Middleware resolves these on success / failure:
    onSuccess: REPORTS_FETCH_DEVICES_SUCCESS,
    onFailure: REPORTS_FETCH_DEVICES_FAILURE,
  };
}

// ─── 2. Fetch readings for a device (paginated) ───────────────────────────────
// GET /api/mobile/devices/{device_id}/api-calls/?page=1&per_page=20
export function fetchDeviceReadings(deviceId, page = 1, perPage = 20) {
  return dispatch => {
    dispatch({ type: REPORTS_FETCH_READINGS_REQUEST, payload: { deviceId } });

    return dispatch({
      type: REPORTS_FETCH_READINGS_REQUEST,
      payload: {
        request: {
          url: `/api/mobile/devices/${deviceId}/api-calls/`,
          method: 'GET',
          params: { page, per_page: perPage },
        },
      },
      // Carry deviceId through so reducer can key the result
      meta: { deviceId },
      onSuccess: data => ({
        type: REPORTS_FETCH_READINGS_SUCCESS,
        payload: { deviceId, data },
      }),
      onFailure: error => ({
        type: REPORTS_FETCH_READINGS_FAILURE,
        payload: {
          deviceId,
          error: error?.message || 'Failed to load readings',
        },
      }),
    });
  };
}

// ─── 3. Fetch single reading detail ──────────────────────────────────────────
// GET /api/mobile/devices/{device_id}/api-calls/{reading_id}/
export function fetchReadingDetail(deviceId, readingId) {
  return dispatch => {
    dispatch({
      type: REPORTS_FETCH_READING_REQUEST,
      payload: { deviceId, readingId },
    });

    return dispatch({
      type: REPORTS_FETCH_READING_REQUEST,
      payload: {
        request: {
          url: `/api/mobile/devices/${deviceId}/api-calls/${readingId}/`,
          method: 'GET',
        },
      },
      onSuccess: data => ({
        type: REPORTS_FETCH_READING_SUCCESS,
        payload: data,
      }),
      onFailure: error => ({
        type: REPORTS_FETCH_READING_FAILURE,
        payload: error?.message || 'Failed to load reading',
      }),
    });
  };
}

// ─── 4. Clear selected reading ────────────────────────────────────────────────
export function clearSelectedReading() {
  return { type: REPORTS_CLEAR_READING };
}

// ─── 5. Reset entire reports state ───────────────────────────────────────────
export function resetReports() {
  return { type: REPORTS_RESET };
}
