// src/redux/reducers/soilsaathiReducer.js

import {
  SOIL_LIST_REQUEST,
  SOIL_CREATE_REQUEST,
  SOIL_DETAIL_REQUEST,
  SOIL_RECS_REQUEST,
  SOIL_AI_RECS_REQUEST,
  SOIL_CLEAR,
  SOIL_SET_CURRENT_ID,
} from '../actions/soilsaathiActions';

export const SENSOR_DURATION = 60;
export const MOTOR_DURATION = 180;

// ─── INITIAL STATE ──────────────────────────────────────────────────────────
const init = {
  phase: 'idle',
  timerTotal: 0,
  timerLeft: 0,
  timerDone: false,
  timerStartedAt: null,
  motorState: 'Idle',
  sensorState: 'Idle',
  motorStateFromBle: null,
  sensorStateFromBle: null,
  bleResultData: null,

  createStatus: 'idle',
  createError: null,
  detailStatus: 'idle',
  detailError: null,
  currentRecord: null,
  currentId: null,
  listStatus: 'idle',
  listError: null,
  list: [],
  listMeta: { count: 0, totalPages: 1, page: 1 },
  recsStatus: 'idle',
  recsError: null,
  recommendations: null,
  aiRecsStatus: 'idle',
  aiRecsError: null,
  aiRecommendations: null,

  // ── SENSOR CALIBRATION ──────────────────────────────────────────────────
  calibrationPhase: 'idle',      // 'idle' | 'reading' | 'done' | 'error'
  calibrationPoint: null,
  calibrationNutrients: [],
  calibrationResults: null,
  calibrationError: null,
  calibrationTable: null,
  calibrationProgress: null,     // { nutrient, point, phase, loop, total }
  calibrationLiveChannels: {},   // { A: 123.4, B: 98.7, ... }
};

export default function soilsaathiReducer(state = init, action) {
  switch (action.type) {
    case 'TEST_RESET':
    case 'LOGOUT_REQUEST':
    case SOIL_CLEAR:
      return { ...init };

    // ── BLE / phase state ──────────────────────────────────────────────────
    case 'SOIL_MOTOR_STATE':
      return { ...state, motorState: action.payload.data };
    case 'SOIL_SENSOR_STATE':
      return { ...state, sensorState: action.payload.data };
    case 'SOIL_MOTOR_STATE_FROM_BLE':
      return { ...state, motorStateFromBle: action.payload.data };
    case 'SOIL_SENSOR_STATE_FROM_BLE':
      return { ...state, sensorStateFromBle: action.payload.data };
    case 'SOIL_BLE_RESULT':
      return { ...state, bleResultData: action.payload };

    // ── CRUD ──────────────────────────────────────────────────────────────
    case SOIL_CREATE_REQUEST:
      return { ...state, createStatus: 'loading', createError: null };
    case `${SOIL_CREATE_REQUEST}_SUCCESS`:
      return {
        ...state,
        createStatus: 'success',
        currentRecord: action.payload.data,
        currentId: action.payload.data?.id ?? null,
      };
    case `${SOIL_CREATE_REQUEST}_FAIL`:
      return {
        ...state,
        createStatus: 'error',
        createError: action.error?.message ?? action.payload ?? 'Create failed',
      };

    case SOIL_DETAIL_REQUEST:
      return { ...state, detailStatus: 'loading', detailError: null };
    case `${SOIL_DETAIL_REQUEST}_SUCCESS`:
      return {
        ...state,
        detailStatus: 'success',
        currentRecord: action.payload.data,
      };
    case `${SOIL_DETAIL_REQUEST}_FAIL`:
      return {
        ...state,
        detailStatus: 'error',
        detailError: action.error?.message ?? action.payload,
      };

    case SOIL_LIST_REQUEST:
      return { ...state, listStatus: 'loading', listError: null };
    case `${SOIL_LIST_REQUEST}_SUCCESS`: {
      const d = action.payload.data;
      return {
        ...state,
        listStatus: 'success',
        list: d?.results ?? [],
        listMeta: {
          count: d?.count ?? 0,
          totalPages: d?.total_pages ?? 1,
          page: d?.page ?? 1,
        },
      };
    }
    case `${SOIL_LIST_REQUEST}_FAIL`:
      return {
        ...state,
        listStatus: 'error',
        listError: action.error?.message ?? action.payload,
      };

    case SOIL_RECS_REQUEST:
      return { ...state, recsStatus: 'loading', recsError: null };
    case `${SOIL_RECS_REQUEST}_SUCCESS`:
      return {
        ...state,
        recsStatus: 'success',
        recommendations: action.payload.data,
      };
    case `${SOIL_RECS_REQUEST}_FAIL`:
      return {
        ...state,
        recsStatus: 'error',
        recsError:
          action.error?.message ??
          action.payload ??
          'Failed to load recommendations',
      };

    case SOIL_AI_RECS_REQUEST:
      return { ...state, aiRecsStatus: 'loading', aiRecsError: null };
    case `${SOIL_AI_RECS_REQUEST}_SUCCESS`:
      return {
        ...state,
        aiRecsStatus: 'success',
        aiRecommendations: action.payload.data,
      };
    case `${SOIL_AI_RECS_REQUEST}_FAIL`:
      return {
        ...state,
        aiRecsStatus: 'error',
        aiRecsError:
          action.error?.message ??
          action.payload ??
          'Failed to load AI recommendation',
      };

    case SOIL_SET_CURRENT_ID:
      return { ...state, currentId: action.payload };

    // ── SENSOR CALIBRATION ──────────────────────────────────────────────────
    case 'SOIL_CALIBRATION_START':
      console.log('[REDUCER] START');
      return {
        ...state,
        calibrationPhase: 'reading',
        calibrationResults: null,
        calibrationError: null,
        calibrationProgress: null,
        calibrationLiveChannels: {},
      };

    case 'SOIL_CALIBRATION_STOPPED':
      console.log('[REDUCER] STOPPED');
      return {
        ...state,
        calibrationPhase: 'idle',
        calibrationProgress: null,
        calibrationLiveChannels: {},
      };

    case 'SOIL_CALIBRATION_STATUS': {
      const raw = (action.payload?.status ?? '').toString().toUpperCase();
      console.log('[REDUCER] STATUS:', raw);
      const map = {
        IDLE: 'idle',
        READING: 'reading',
        DONE: 'done',
        ERROR: 'error',
        STOPPED: 'idle',
      };
      return {
        ...state,
        calibrationPhase: map[raw] ?? state.calibrationPhase,
      };
    }

    // ─── FIX: Live per-loop progress ──────────────────────────────────────
    case 'SOIL_CALIBRATION_PROGRESS': {
      console.log('[REDUCER] PROGRESS:', action.payload.loop, '/', action.payload.total);
      return {
        ...state,
        calibrationPhase: 'reading',
        calibrationProgress: {
          nutrient: action.payload.nutrient,
          point: action.payload.point,
          phase: action.payload.phase || 'spectral',
          loop: Number(action.payload.loop) || 0,
          total: Number(action.payload.total) || 100,
        },
        calibrationLiveChannels: {
          ...state.calibrationLiveChannels,
          ...action.payload.channels,
        },
      };
    }

    // ─── FIX: CALIBRATION RESULT ──────────────────────────────────────────
    case 'SOIL_CALIBRATION_RESULT': {
      console.log('[REDUCER] RESULT:', action.payload);
      return {
        ...state,
        calibrationPhase: action.payload.error ? 'error' : 'done',
        calibrationPoint: action.payload.point,
        calibrationNutrients: action.payload.nutrients || [],
        calibrationResults: action.payload.results || {},
        calibrationError: action.payload.error ?? null,
        calibrationProgress: null,
      };
    }

    case 'SOIL_CALIBRATION_COMPLETE': {
      console.log('[REDUCER] COMPLETE');
      return {
        ...state,
        calibrationPhase: 'done',
        calibrationProgress: null,
      };
    }

    case 'SOIL_CALIBRATION_DATA': {
      console.log('[REDUCER] DATA received');
      return { ...state, calibrationTable: action.payload };
    }

    default:
      return state;
  }
}