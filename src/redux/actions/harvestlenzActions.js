// src/redux/actions/harvestlenzActions.js

export const FETCH_HARVESTLENZ_SCANS_REQUEST = 'FETCH_HARVESTLENZ_SCANS_REQUEST';
export const FETCH_HARVESTLENZ_SCANS_SUCCESS = 'FETCH_HARVESTLENZ_SCANS_SUCCESS';
export const FETCH_HARVESTLENZ_SCANS_FAIL = 'FETCH_HARVESTLENZ_SCANS_FAIL';

export const FETCH_HARVESTLENZ_DETAIL_REQUEST = 'FETCH_HARVESTLENZ_DETAIL_REQUEST';
export const FETCH_HARVESTLENZ_DETAIL_SUCCESS = 'FETCH_HARVESTLENZ_DETAIL_SUCCESS';
export const FETCH_HARVESTLENZ_DETAIL_FAIL = 'FETCH_HARVESTLENZ_DETAIL_FAIL';

export const SCAN_FRUIT_REQUEST = 'SCAN_FRUIT_REQUEST';
export const SCAN_FRUIT_SUCCESS = 'SCAN_FRUIT_SUCCESS';
export const SCAN_FRUIT_FAIL = 'SCAN_FRUIT_FAIL';
export const CLEAR_HARVEST_SCAN_RESULT = 'CLEAR_HARVEST_SCAN_RESULT';

export const FETCH_HARVESTLENZ_STATS_REQUEST = 'FETCH_HARVESTLENZ_STATS_REQUEST';
export const FETCH_HARVESTLENZ_STATS_SUCCESS = 'FETCH_HARVESTLENZ_STATS_SUCCESS';
export const FETCH_HARVESTLENZ_STATS_FAIL = 'FETCH_HARVESTLENZ_STATS_FAIL';

export const FETCH_HARVESTLENZ_FRUITS_REQUEST = 'FETCH_HARVESTLENZ_FRUITS_REQUEST';
export const FETCH_HARVESTLENZ_FRUITS_SUCCESS = 'FETCH_HARVESTLENZ_FRUITS_SUCCESS';
export const FETCH_HARVESTLENZ_FRUITS_FAIL = 'FETCH_HARVESTLENZ_FRUITS_FAIL';

export const fetchHarvestLenzScans = (deviceId, page = 1, perPage = 20) => ({
  types: [
    FETCH_HARVESTLENZ_SCANS_REQUEST,
    FETCH_HARVESTLENZ_SCANS_SUCCESS,
    FETCH_HARVESTLENZ_SCANS_FAIL,
  ],
  payload: {
    request: {
      url: `/api/mobile/devices/${deviceId}/harvestlenz/`,
      method: 'GET',
      params: { page, per_page: perPage },
    },
  },
});

export const fetchHarvestLenzDetail = (deviceId, callId) => ({
  types: [
    FETCH_HARVESTLENZ_DETAIL_REQUEST,
    FETCH_HARVESTLENZ_DETAIL_SUCCESS,
    FETCH_HARVESTLENZ_DETAIL_FAIL,
  ],
  payload: {
    request: {
      url: `/api/mobile/devices/${deviceId}/harvestlenz/${callId}/`,
      method: 'GET',
    },
  },
});

export const scanFruitPhoto = (deviceId, formData) => ({
  types: [SCAN_FRUIT_REQUEST, SCAN_FRUIT_SUCCESS, SCAN_FRUIT_FAIL],
  payload: {
    request: {
      url: `/api/mobile/devices/${deviceId}/harvestlenz/scan/`,
      method: 'POST',
      data: formData,
      // Grading runs one CNN pass per fruit (and loads the model on first
      // use), so it can take well over the default 15 s client timeout.
      timeout: 60000,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  },
});

export const clearHarvestScanResult = () => ({
  type: CLEAR_HARVEST_SCAN_RESULT,
});

export const fetchHarvestLenzStats = deviceId => ({
  types: [
    FETCH_HARVESTLENZ_STATS_REQUEST,
    FETCH_HARVESTLENZ_STATS_SUCCESS,
    FETCH_HARVESTLENZ_STATS_FAIL,
  ],
  payload: {
    request: {
      url: `/api/mobile/devices/${deviceId}/harvestlenz/stats/`,
      method: 'GET',
    },
  },
});

export const fetchHarvestLenzFruits = () => ({
  types: [
    FETCH_HARVESTLENZ_FRUITS_REQUEST,
    FETCH_HARVESTLENZ_FRUITS_SUCCESS,
    FETCH_HARVESTLENZ_FRUITS_FAIL,
  ],
  payload: {
    request: {
      url: '/api/mobile/harvestlenz/fruits/',
      method: 'GET',
    },
  },
});
