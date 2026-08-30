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

export const SOIL_FERT_REC_REQUEST = 'SOIL_FERT_REC_REQUEST';
export const SOIL_FERT_REC_SUCCESS = 'SOIL_FERT_REC_SUCCESS';
export const SOIL_FERT_REC_FAIL = 'SOIL_FERT_REC_FAIL';

export const SOIL_CROP_MATCH_REQUEST = 'SOIL_CROP_MATCH_REQUEST';
export const SOIL_CROP_MATCH_SUCCESS = 'SOIL_CROP_MATCH_SUCCESS';
export const SOIL_CROP_MATCH_FAIL = 'SOIL_CROP_MATCH_FAIL';

export const SOIL_YIELD_OPTIONS_REQUEST = 'SOIL_YIELD_OPTIONS_REQUEST';
export const SOIL_YIELD_OPTIONS_SUCCESS = 'SOIL_YIELD_OPTIONS_SUCCESS';
export const SOIL_YIELD_OPTIONS_FAIL = 'SOIL_YIELD_OPTIONS_FAIL';

export const SOIL_YIELD_PREDICT_REQUEST = 'SOIL_YIELD_PREDICT_REQUEST';
export const SOIL_YIELD_PREDICT_SUCCESS = 'SOIL_YIELD_PREDICT_SUCCESS';
export const SOIL_YIELD_PREDICT_FAIL = 'SOIL_YIELD_PREDICT_FAIL';

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

export function getSoilFertilizerRecommendation(deviceId, callId, state, crop) {
  const params = {};
  if (callId) params.call_id = callId;
  if (state) params.state = state;
  if (crop) params.crop = crop;
  return {
    type: SOIL_FERT_REC_REQUEST,
    payload: {
      request: {
        method: 'GET',
        url: `/api/mobile/devices/${deviceId}/soilsaathi/fertilizer-recommendation/`,
        params,
      },
    },
  };
}

export function getSoilCropMatch(deviceId, callId, state) {
  const params = {};
  if (callId) params.call_id = callId;
  if (state) params.state = state;
  return {
    type: SOIL_CROP_MATCH_REQUEST,
    payload: {
      request: {
        method: 'GET',
        url: `/api/mobile/devices/${deviceId}/soilsaathi/crop-recommendation/`,
        params,
      },
    },
  };
}

export function getSoilYieldOptions(deviceId, callId) {
  const params = {};
  if (callId) params.call_id = callId;
  return {
    type: SOIL_YIELD_OPTIONS_REQUEST,
    payload: {
      request: {
        method: 'GET',
        url: `/api/mobile/devices/${deviceId}/soilsaathi/yield-options/`,
        params,
      },
    },
  };
}

export function getSoilYieldPrediction(
  deviceId,
  { callId, district, crop, soc, pH, N, P, K } = {},
) {
  const params = { district, crop };
  if (callId) params.call_id = callId;
  if (soc !== undefined && soc !== null && soc !== '') params.soc = soc;
  if (pH !== undefined && pH !== null && pH !== '') params.pH = pH;
  if (N !== undefined && N !== null && N !== '') params.N = N;
  if (P !== undefined && P !== null && P !== '') params.P = P;
  if (K !== undefined && K !== null && K !== '') params.K = K;

  return {
    type: SOIL_YIELD_PREDICT_REQUEST,
    payload: {
      request: {
        method: 'GET',
        url: `/api/mobile/devices/${deviceId}/soilsaathi/yield-prediction/`,
        params,
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
        url: `/api/mobile/devices/${deviceId}/soilsaathi/${callId}/pdf/`,
        responseType: 'arraybuffer',

        headers: {
          Accept: '*/*',
        },
      },
    },
  };
}