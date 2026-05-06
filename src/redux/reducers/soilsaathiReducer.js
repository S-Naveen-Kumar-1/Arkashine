// src/redux/reducers/soilsaathiReducer.js
import {
  SOIL_LIST_REQUEST,
  SOIL_LIST_SUCCESS,
  SOIL_LIST_FAIL,
  SOIL_CREATE_REQUEST,
  SOIL_CREATE_SUCCESS,
  SOIL_CREATE_FAIL,
  SOIL_DETAIL_REQUEST,
  SOIL_DETAIL_SUCCESS,
  SOIL_DETAIL_FAIL,
  SOIL_RECS_REQUEST,
  SOIL_RECS_SUCCESS,
  SOIL_RECS_FAIL,
  SOIL_AI_RECS_REQUEST,
  SOIL_AI_RECS_SUCCESS,
  SOIL_AI_RECS_FAIL,
  SOIL_CLEAR,
  SOIL_SET_CURRENT_ID,
} from '../actions/soilsaathiActions';
export const SENSOR_DURATION = 60;
export const MOTOR_DURATION = 180;
const init = {
  // ── Phase control ─────────────────────────────
  phase: 'idle', // 'idle' | 'motor' | 'sensor'

  timerTotal: 0,
  timerLeft: 0,
  timerDone: false,
  timerStartedAt: null,

  motorState: 'Idle', // 'idle' | 'running' | 'done'
  sensorState: 'Idle',
  motorStateFromBle: null,
  sensorStateFromBle: null,

  bleResultData: null,
  // ── Existing fields (unchanged) ───────────────
  createStatus: 'idle',
  createError: null,
  currentRecord: null,
  currentId: null,
  detailStatus: 'idle',
  detailError: null,
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
};

export default function soilsaathiReducer(state = init, action) {
  switch (action.type) {
    case 'TEST_RESET':
      return {
        ...init,
      };

    case 'SOIL_MOTOR_STATE': {
      return {
        ...state,
        motorState: action.payload.data,
      };
    }
    case 'SOIL_SENSOR_STATE': {
      return {
        ...state,
        sensorState: action.payload.data,
      };
    }
    case 'SOIL_MOTOR_STATE_FROM_BLE': {
      return {
        ...state,
        motorStateFromBle: action.payload.data,
      };
    }
    case 'SOIL_SENSOR_STATE_FROM_BLE': {
      return {
        ...state,
        sensorStateFromBle: action.payload.data,
      };
    }

    case 'SOIL_BLE_RESULT':
      return {
        ...state,
        bleResultData: action.payload,
      };

    // ─── CREATE ─────────────────────────────
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

    // ─── DETAIL ─────────────────────────────
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

    // ─── LIST ───────────────────────────────
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

    // ─── RECOMMENDATIONS ────────────────────
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
        recsError: action.error?.message ?? action.payload,
      };

    // ─── AI RECOMMENDATIONS ────────────────
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
        aiRecsError: action.error?.message ?? action.payload,
      };

    // ─── MISC ──────────────────────────────
    case SOIL_SET_CURRENT_ID:
      return { ...state, currentId: action.payload };

    case SOIL_CLEAR:
      return { ...init };

    default:
      return state;
  }
}
