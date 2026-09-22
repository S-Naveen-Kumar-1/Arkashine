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

// PHBottle link/unlink
export const SOIL_LINK_PHBOTTLE_REQUEST = 'SOIL_LINK_PHBOTTLE_REQUEST';
export const SOIL_LINK_PHBOTTLE_SUCCESS = 'SOIL_LINK_PHBOTTLE_SUCCESS';
export const SOIL_LINK_PHBOTTLE_FAIL = 'SOIL_LINK_PHBOTTLE_FAIL';
export const SOIL_UNLINK_PHBOTTLE_REQUEST = 'SOIL_UNLINK_PHBOTTLE_REQUEST';
export const SOIL_UNLINK_PHBOTTLE_SUCCESS = 'SOIL_UNLINK_PHBOTTLE_SUCCESS';
export const SOIL_UNLINK_PHBOTTLE_FAIL = 'SOIL_UNLINK_PHBOTTLE_FAIL';

// Plot boundaries (Soil Lens Map)
export const SOIL_PLOTS_LIST_REQUEST = 'SOIL_PLOTS_LIST_REQUEST';
export const SOIL_PLOTS_LIST_SUCCESS = 'SOIL_PLOTS_LIST_SUCCESS';
export const SOIL_PLOTS_LIST_FAIL = 'SOIL_PLOTS_LIST_FAIL';
export const SOIL_PLOTS_ADD_REQUEST = 'SOIL_PLOTS_ADD_REQUEST';
export const SOIL_PLOTS_ADD_SUCCESS = 'SOIL_PLOTS_ADD_SUCCESS';
export const SOIL_PLOTS_ADD_FAIL = 'SOIL_PLOTS_ADD_FAIL';

export const testReset = () => ({ type: 'TEST_RESET' });

// Links this SoiLENZ reading to an existing PHBottle reading, syncing
// ph/ec from it. If this would overwrite different pH/EC values (or
// replace an existing link), the backend returns 409 with a `warning` —
// re-call with confirm=true once the caller has shown that to the user.
export function linkPhBottle(deviceId, callId, phBottleId, confirm = false) {
  return {
    type: SOIL_LINK_PHBOTTLE_REQUEST,
    payload: {
      request: {
        method: 'POST',
        url: `/api/mobile/devices/${deviceId}/soilsaathi/${callId}/link-ph-bottle/`,
        data: { ph_bottle_id: phBottleId, confirm },
      },
    },
  };
}

export function unlinkPhBottle(deviceId, callId) {
  return {
    type: SOIL_UNLINK_PHBOTTLE_REQUEST,
    payload: {
      request: {
        method: 'DELETE',
        url: `/api/mobile/devices/${deviceId}/soilsaathi/${callId}/link-ph-bottle/`,
      },
    },
  };
}

// A SoiLENZ reading can have more than one saved plot boundary.
export function listSoilPlots(deviceId, callId) {
  return {
    type: SOIL_PLOTS_LIST_REQUEST,
    payload: {
      request: {
        method: 'GET',
        url: `/api/mobile/devices/${deviceId}/soilsaathi/${callId}/plots/`,
      },
    },
  };
}

export function addSoilPlot(deviceId, callId, { name, geometry }) {
  return {
    type: SOIL_PLOTS_ADD_REQUEST,
    payload: {
      request: {
        method: 'POST',
        url: `/api/mobile/devices/${deviceId}/soilsaathi/${callId}/plots/`,
        data: { name, geometry },
      },
    },
  };
}

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
    // Only present for soil-partner tests started from a farmer's page —
    // regular (non-partner) BLE flows have no farmerId to send.
    ...(meta.farmerId ? { farmer_id: meta.farmerId } : {}),

    area_name: meta.areaName ?? 'Test Area',
    tag: meta.tag ?? '',

    ph: r.ph ?? r.pH ?? 0,
    ec: r.ec ?? r.EC ?? 0,
    electrical_conduction: r.ec ?? r.EC ?? r.electrical_conduction ?? 0,
    oc: r.OC ?? r.oc ?? 0,

    nitrogen: r.N ?? r.nitrogen ?? 0,
    phosphorous: r.P ?? r.phosphorous ?? r.phosphorus ?? 0,
    potassium: r.K ?? r.potassium ?? 0,
    calcium: r.Ca ?? r.calcium ?? 0,
    magnesium: r.Mg ?? r.magnesium ?? 0,
    sulphur: r.S ?? r.sulphur ?? r.sulfur ?? 0,
    zinc: r.Zn ?? r.zinc ?? 0,
    manganese: r.Mn ?? r.manganese ?? 0,
    iron: r.Fe ?? r.iron ?? 0,
    copper: r.Cu ?? r.copper ?? 0,
    boron: r.B ?? r.boron ?? 0,

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

// The report is generated on-demand server-side and can take 45-50s,
// well past the shared axios client's default 15s timeout — override it
// per-request instead of raising the timeout for every API call.
const PDF_REQUEST_TIMEOUT_MS = 90000;

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
        timeout: PDF_REQUEST_TIMEOUT_MS,

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
        timeout: PDF_REQUEST_TIMEOUT_MS,

        headers: {
          Accept: '*/*',
        },
      },
    },
  };
}