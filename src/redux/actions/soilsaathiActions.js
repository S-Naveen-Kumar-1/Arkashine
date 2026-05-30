// src/redux/actions/soilsaathiActions.js

export const SOIL_LIST_REQUEST = 'SOIL_LIST_REQUEST';
export const SOIL_LIST_SUCCESS = 'SOIL_LIST_SUCCESS';
export const SOIL_LIST_FAIL = 'SOIL_LIST_FAIL';

export const SOIL_CREATE_REQUEST = 'SOIL_CREATE_REQUEST';
export const SOIL_CREATE_SUCCESS = 'SOIL_CREATE_SUCCESS';
export const SOIL_CREATE_FAIL = 'SOIL_CREATE_FAIL';

export const SOIL_DETAIL_REQUEST = 'SOIL_DETAIL_REQUEST';
export const SOIL_DETAIL_SUCCESS = 'SOIL_DETAIL_SUCCESS';
export const SOIL_DETAIL_FAIL = 'SOIL_DETAIL_FAIL';

export const SOIL_RECS_REQUEST = 'SOIL_RECS_REQUEST';
export const SOIL_RECS_SUCCESS = 'SOIL_RECS_SUCCESS';
export const SOIL_RECS_FAIL = 'SOIL_RECS_FAIL';

export const SOIL_AI_RECS_REQUEST = 'SOIL_AI_RECS_REQUEST';
export const SOIL_AI_RECS_SUCCESS = 'SOIL_AI_RECS_SUCCESS';
export const SOIL_AI_RECS_FAIL = 'SOIL_AI_RECS_FAIL';

export const SOIL_CLEAR = 'SOIL_CLEAR';
export const SOIL_SET_CURRENT_ID = 'SOIL_SET_CURRENT_ID';
// PDF DOWNLOAD
export const SOIL_PDF_REQUEST = 'SOIL_PDF_REQUEST';
export const SOIL_PDF_SUCCESS = 'SOIL_PDF_SUCCESS';
export const SOIL_PDF_FAIL = 'SOIL_PDF_FAIL';
export const testReset = () => ({ type: 'TEST_RESET' });

export function listSoilReadings(deviceId) {
  return {
    type: SOIL_LIST_REQUEST,
    payload: {
      request: {
        method: 'GET',
        url: `/api/mobile/devices/${deviceId}/soilsaathi/`,
      },
    },
  };
}

export function createSoilReading(deviceId, data) {
  return {
    type: SOIL_CREATE_REQUEST,
    payload: {
      request: {
        method: 'POST',
        url: `/api/mobile/devices/${deviceId}/soilsaathi/create/`,
        data,
      },
    },
  };
}

export function getSoilDetail(deviceId, callId) {
  return {
    type: SOIL_DETAIL_REQUEST,
    payload: {
      request: {
        method: 'GET',
        url: `/api/mobile/devices/${deviceId}/soilsaathi/${callId}/`,
      },
    },
  };
}

export function getSoilRecommendations(deviceId, callId) {
  return {
    type: SOIL_RECS_REQUEST,
    payload: {
      request: {
        method: 'GET',
        url: `/api/mobile/devices/${deviceId}/soilsaathi/recommendations/`,
        params: { call_id: callId },
      },
    },
  };
}

export function getSoilAIRecommendations(deviceId, callId) {
  return {
    type: SOIL_AI_RECS_REQUEST,
    payload: {
      request: {
        method: 'GET',
        url: `/api/mobile/devices/${deviceId}/soilsaathi/ai-recommendation/`,
        params: { call_id: callId },
      },
    },
  };
}

export function buildSoilPayload(results, meta = {}) {
  const r = results ?? {}; // ✅ handle null safely

  return {
    area_name: meta.areaName ?? 'Test Area',
    tag: meta.tag ?? '',

    ph: r.ph ?? 0,
    ec: r.ec ?? 0,
    electrical_conduction: r.ec ?? 0,
    oc: r.oc ?? 0,

    nitrogen: r.N ?? 0,
    phosphorous: r.P ?? 0,
    potassium: r.K ?? 0,
    calcium: r.Ca ?? 0,
    magnesium: r.Mg ?? 0,
    sulphur: r.S ?? 0,
    zinc: r.Zn ?? 0,
    manganese: r.Mn ?? 0,
    iron: r.Fe ?? 0,
    copper: r.Cu ?? 0,
    boron: r.B ?? 0,

    crop_type: meta.cropType ?? 'arabica_coffee',
    latitude: meta.latitude ?? 0,
    longitude: meta.longitude ?? 0,
  };
}

// soil map
export function predictSoil({ lat, lon, polygon = [] }) {
  return {
    type: 'PREDICT_SOIL',
    payload: {
      request: {
        url: '/api/predict/',
        method: 'POST',
        data: {
          lat,
          lon,
          polygon,
        },
      },
    },
  };
}

export function downloadSoilRecommendationPDF(
  deviceId,
  callId,
  token,
) {
  return {
    type: SOIL_PDF_REQUEST,
    payload: {
      request: {
        method: 'GET',
        url: `/api/mobile/devices/${deviceId}/soilsaathi/${callId}/recommendation-pdf/`,
        responseType: 'arraybuffer',

        headers: {
          Accept: '*/*',
        },
      },
    },
  };
}
export function downloadSoilDetailPDF(
  deviceId,
  callId,
  token,
) {
  return {
    type: SOIL_PDF_REQUEST,
    payload: {
      request: {
        method: 'GET',
        url: `/api/mobile/devices/${deviceId}/soilsaathi/${callId}/recommendation-pdf/`,
        responseType: 'arraybuffer',

        headers: {
          Accept: '*/*',
        },
      },
    },
  };
}