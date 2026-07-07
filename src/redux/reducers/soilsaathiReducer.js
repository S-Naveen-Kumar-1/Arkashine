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

const init = {
  // ── Phase / BLE control ──────────────────────────────────────────────────────
  phase: 'idle', // 'idle' | 'motor' | 'sensor'
  timerTotal: 0,
  timerLeft: 0,
  timerDone: false,
  timerStartedAt: null,
  motorState: 'Idle', // 'Idle' | 'running' | 'done'
  sensorState: 'Idle',
  motorStateFromBle: null,
  sensorStateFromBle: null,
  bleResultData: null,

  // ── CRUD ────────────────────────────────────────────────────────────────────
  createStatus: 'idle', // 'idle' | 'loading' | 'success' | 'error'
  createError: null,

  detailStatus: 'idle',
  detailError: null,
  currentRecord: null,
  currentId: null,

  listStatus: 'idle',
  listError: null,
  list: [],
  listMeta: { count: 0, totalPages: 1, page: 1 },

  recsStatus: 'idle', // 'idle' | 'loading' | 'success' | 'error'
  recsError: null,
  recommendations: null,

  aiRecsStatus: 'idle', // 'idle' | 'loading' | 'success' | 'error'
  aiRecsError: null,
  aiRecommendations: null,

  // ── Sensor calibration (BLANK / MIN / MID / MAX) ────────────────────────────
  calibrationPhase: 'idle', // 'idle' | 'reading' | 'done' | 'error'
  calibrationPoint: null, // 'blank' | 'min' | 'mid' | 'max'
  calibrationNutrients: [], // nutrient keys in the last/current batch, e.g. ['N','P','K']
  calibrationResults: null, // { [nutrientKey]: { saved, values, error } }
  calibrationError: null,
  calibrationTable: null, // full table from SOILCALIBRATIONDATA GET: { OC: {blank,min,mid,max}, ... }
};

export default function soilsaathiReducer(state = init, action) {
  switch (action.type) {
    // ── Reset / logout ──────────────────────────────────────────────────────────
    case 'TEST_RESET':
    case 'LOGOUT_REQUEST':
    case SOIL_CLEAR:
      return { ...init };

    // ── BLE / phase state ───────────────────────────────────────────────────────
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

    // ── CREATE ──────────────────────────────────────────────────────────────────
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

    // ── DETAIL ──────────────────────────────────────────────────────────────────
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

    // ── LIST ────────────────────────────────────────────────────────────────────
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

    // ── RECOMMENDATIONS ─────────────────────────────────────────────────────────
    case SOIL_RECS_REQUEST:
      return { ...state, recsStatus: 'loading', recsError: null };

    case `${SOIL_RECS_REQUEST}_SUCCESS`:
      return {
        ...state,
        recsStatus: 'success',
        recommendations: action.payload.data, // full API response object
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

    // ── AI RECOMMENDATIONS ──────────────────────────────────────────────────────
    case SOIL_AI_RECS_REQUEST:
      return { ...state, aiRecsStatus: 'loading', aiRecsError: null };

    case `${SOIL_AI_RECS_REQUEST}_SUCCESS`:
      return {
        ...state,
        aiRecsStatus: 'success',
        aiRecommendations: action.payload.data, // full AI API response object
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

    // ── MISC ────────────────────────────────────────────────────────────────────
    case SOIL_SET_CURRENT_ID:
      return { ...state, currentId: action.payload };

    // ── SENSOR CALIBRATION ───────────────────────────────────────────────────────
    case 'SOIL_CALIBRATION_START':
      return {
        ...state,
        calibrationPhase: 'reading',
        calibrationResults: null,
        calibrationError: null,
      };

    case 'SOIL_CALIBRATION_STOPPED':
      return {
        ...state,
        calibrationPhase: 'idle',
      };

    case 'SOIL_CALIBRATION_STATUS': {
      const raw = (action.payload?.status ?? '').toString().toUpperCase();
      const map = { IDLE: 'idle', READING: 'reading', DONE: 'done', ERROR: 'error' };
      return {
        ...state,
        calibrationPhase: map[raw] ?? state.calibrationPhase,
      };
    }

    case 'SOIL_CALIBRATION_RESULT':
      return {
        ...state,
        calibrationPhase: action.payload.error ? 'error' : 'done',
        calibrationPoint: action.payload.point,
        calibrationNutrients: action.payload.nutrients,
        calibrationResults: action.payload.results,
        calibrationError: action.payload.error ?? null,
      };

    case 'SOIL_CALIBRATION_COMPLETE':
      return { ...state, calibrationPhase: 'done' };

    // Full calibration table (all nutrients × all levels) returned by
    // { SOILCALIBRATIONDATA: "GET" }. Kept in its own field so a batch
    // result never overwrites the full table, and vice versa.
    case 'SOIL_CALIBRATION_DATA':
      return { ...state, calibrationTable: action.payload };

    default:
      return state;
  }
}