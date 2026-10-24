// src/redux/actions/leaflenzActions.js

export const FETCH_LEAFLENZ_SCANS_REQUEST = 'FETCH_LEAFLENZ_SCANS_REQUEST';
export const FETCH_LEAFLENZ_SCANS_SUCCESS = 'FETCH_LEAFLENZ_SCANS_SUCCESS';
export const FETCH_LEAFLENZ_SCANS_FAIL = 'FETCH_LEAFLENZ_SCANS_FAIL';

export const FETCH_LEAFLENZ_DETAIL_REQUEST = 'FETCH_LEAFLENZ_DETAIL_REQUEST';
export const FETCH_LEAFLENZ_DETAIL_SUCCESS = 'FETCH_LEAFLENZ_DETAIL_SUCCESS';
export const FETCH_LEAFLENZ_DETAIL_FAIL = 'FETCH_LEAFLENZ_DETAIL_FAIL';

export const SCAN_LEAF_REQUEST = 'SCAN_LEAF_REQUEST';
export const SCAN_LEAF_SUCCESS = 'SCAN_LEAF_SUCCESS';
export const SCAN_LEAF_FAIL = 'SCAN_LEAF_FAIL';
export const CLEAR_SCAN_RESULT = 'CLEAR_SCAN_RESULT';

export const FETCH_LEAFLENZ_STATS_REQUEST = 'FETCH_LEAFLENZ_STATS_REQUEST';
export const FETCH_LEAFLENZ_STATS_SUCCESS = 'FETCH_LEAFLENZ_STATS_SUCCESS';
export const FETCH_LEAFLENZ_STATS_FAIL = 'FETCH_LEAFLENZ_STATS_FAIL';

export const FETCH_LEAFLENZ_DISEASES_REQUEST = 'FETCH_LEAFLENZ_DISEASES_REQUEST';
export const FETCH_LEAFLENZ_DISEASES_SUCCESS = 'FETCH_LEAFLENZ_DISEASES_SUCCESS';
export const FETCH_LEAFLENZ_DISEASES_FAIL = 'FETCH_LEAFLENZ_DISEASES_FAIL';

export const fetchLeafLenzScans = (deviceId, page = 1, perPage = 20) => ({
  types: [
    FETCH_LEAFLENZ_SCANS_REQUEST,
    FETCH_LEAFLENZ_SCANS_SUCCESS,
    FETCH_LEAFLENZ_SCANS_FAIL,
  ],
  payload: {
    request: {
      url: `/api/mobile/devices/${deviceId}/leaflenz/`,
      method: 'GET',
      params: { page, per_page: perPage },
    },
  },
});

export const fetchLeafLenzDetail = (deviceId, callId) => ({
  types: [
    FETCH_LEAFLENZ_DETAIL_REQUEST,
    FETCH_LEAFLENZ_DETAIL_SUCCESS,
    FETCH_LEAFLENZ_DETAIL_FAIL,
  ],
  payload: {
    request: {
      url: `/api/mobile/devices/${deviceId}/leaflenz/${callId}/`,
      method: 'GET',
    },
  },
});

export const scanLeafPhoto = (deviceId, formData) => ({
  types: [SCAN_LEAF_REQUEST, SCAN_LEAF_SUCCESS, SCAN_LEAF_FAIL],
  payload: {
    request: {
      url: `/api/mobile/devices/${deviceId}/leaflenz/scan/`,
      method: 'POST',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  },
});

export const clearScanResult = () => ({
  type: CLEAR_SCAN_RESULT,
});

export const fetchLeafLenzStats = deviceId => ({
  types: [
    FETCH_LEAFLENZ_STATS_REQUEST,
    FETCH_LEAFLENZ_STATS_SUCCESS,
    FETCH_LEAFLENZ_STATS_FAIL,
  ],
  payload: {
    request: {
      url: `/api/mobile/devices/${deviceId}/leaflenz/stats/`,
      method: 'GET',
    },
  },
});

export const fetchLeafLenzDiseases = () => ({
  types: [
    FETCH_LEAFLENZ_DISEASES_REQUEST,
    FETCH_LEAFLENZ_DISEASES_SUCCESS,
    FETCH_LEAFLENZ_DISEASES_FAIL,
  ],
  payload: {
    request: {
      url: '/api/mobile/leaflenz/diseases/',
      method: 'GET',
    },
  },
});
