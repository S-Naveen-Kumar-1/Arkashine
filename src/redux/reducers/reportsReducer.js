// src/redux/reducers/reportsReducer.js
//
// Action types follow axios-middleware convention:
//   REQUEST  → dispatched immediately
//   REQUEST_SUCCESS → dispatched when axios resolves (payload = response.data)
//   REQUEST_FAIL    → dispatched when axios rejects  (error)

const REPORTS_FETCH_DEVICES_REQUEST = 'REPORTS_FETCH_DEVICES_REQUEST';
const REPORTS_FETCH_DEVICES_REQUEST_SUCCESS =
  'REPORTS_FETCH_DEVICES_REQUEST_SUCCESS';
const REPORTS_FETCH_DEVICES_REQUEST_FAIL = 'REPORTS_FETCH_DEVICES_REQUEST_FAIL';

const REPORTS_FETCH_READINGS_REQUEST = 'REPORTS_FETCH_READINGS_REQUEST';
const REPORTS_FETCH_READINGS_REQUEST_SUCCESS =
  'REPORTS_FETCH_READINGS_REQUEST_SUCCESS';
const REPORTS_FETCH_READINGS_REQUEST_FAIL =
  'REPORTS_FETCH_READINGS_REQUEST_FAIL';

const REPORTS_FETCH_READING_REQUEST = 'REPORTS_FETCH_READING_REQUEST';
const REPORTS_FETCH_READING_REQUEST_SUCCESS =
  'REPORTS_FETCH_READING_REQUEST_SUCCESS';
const REPORTS_FETCH_READING_REQUEST_FAIL = 'REPORTS_FETCH_READING_REQUEST_FAIL';

const REPORTS_CLEAR_READING = 'REPORTS_CLEAR_READING';
const REPORTS_RESET = 'REPORTS_RESET';

export const REPORTS_ACTION_TYPES = {
  REPORTS_FETCH_DEVICES_REQUEST,
  REPORTS_FETCH_READINGS_REQUEST,
  REPORTS_FETCH_READING_REQUEST,
  REPORTS_CLEAR_READING,
  REPORTS_RESET,
};

// ─── Initial state ────────────────────────────────────────────────────────────
const init = {
  devices: [],
  devicesLoading: false,
  devicesError: null,
  devicesMeta: { count: 0, total_pages: 1, page: 1, per_page: 50 },

  // Readings keyed by deviceId: { [id]: { data, loading, error, meta } }
  readingsByDevice: {},

  selectedReading: null,
  selectedReadingLoading: false,
  selectedReadingError: null,
};

// ─── Helper: extract deviceId from axios-middleware action ────────────────────
// axios-middleware puts the original action in action.meta.previousAction
function getDeviceId(action) {
  return action?.meta?.previousAction?.meta?.deviceId;
}

// ─── Reducer ──────────────────────────────────────────────────────────────────
export default function reportsReducer(state = init, action) {
  switch (action.type) {
    case 'LOGOUT_REQUEST':
      return { ...init };

    // ── Devices ──────────────────────────────────────────────────────────────
    case REPORTS_FETCH_DEVICES_REQUEST:
      return { ...state, devicesLoading: true, devicesError: null };

    case REPORTS_FETCH_DEVICES_REQUEST_SUCCESS: {
      const d = action.payload.data ?? action.payload;
      return {
        ...state,
        devicesLoading: false,
        devices: d.results ?? [],
        devicesMeta: {
          count: d.count ?? 0,
          total_pages: d.total_pages ?? 1,
          page: d.page ?? 1,
          per_page: d.per_page ?? 50,
        },
      };
    }

    case REPORTS_FETCH_DEVICES_REQUEST_FAIL:
      return {
        ...state,
        devicesLoading: false,
        devicesError: action.error?.message ?? 'Failed to load devices',
      };

    // ── Readings list ────────────────────────────────────────────────────────
    case REPORTS_FETCH_READINGS_REQUEST: {
      // deviceId lives on the action itself (set in fetchDeviceReadings)
      const deviceId = action.meta?.deviceId;
      if (!deviceId) return state;
      const prev = state.readingsByDevice[deviceId] || {};
      return {
        ...state,
        readingsByDevice: {
          ...state.readingsByDevice,
          [deviceId]: { ...prev, loading: true, error: null },
        },
      };
    }

    case REPORTS_FETCH_READINGS_REQUEST_SUCCESS: {
      const deviceId = getDeviceId(action);
      if (!deviceId) return state;
      const d = action.payload.data ?? action.payload;
      return {
        ...state,
        readingsByDevice: {
          ...state.readingsByDevice,
          [deviceId]: {
            loading: false,
            error: null,
            data: d.results ?? [],
            meta: {
              count: d.count ?? 0,
              total_pages: d.total_pages ?? 1,
              page: d.page ?? 1,
              per_page: d.per_page ?? 20,
              next: d.next ?? null,
              previous: d.previous ?? null,
            },
          },
        },
      };
    }

    case REPORTS_FETCH_READINGS_REQUEST_FAIL: {
      const deviceId = getDeviceId(action);
      if (!deviceId) return state;
      const prev = state.readingsByDevice[deviceId] || {};
      return {
        ...state,
        readingsByDevice: {
          ...state.readingsByDevice,
          [deviceId]: {
            ...prev,
            loading: false,
            error: action.error?.message ?? 'Failed to load readings',
          },
        },
      };
    }

    // ── Single reading ────────────────────────────────────────────────────────
    case REPORTS_FETCH_READING_REQUEST:
      return {
        ...state,
        selectedReadingLoading: true,
        selectedReadingError: null,
        selectedReading: null,
      };

    case REPORTS_FETCH_READING_REQUEST_SUCCESS: {
      const d = action.payload.data ?? action.payload;
      return {
        ...state,
        selectedReadingLoading: false,
        selectedReading: d,
      };
    }

    case REPORTS_FETCH_READING_REQUEST_FAIL:
      return {
        ...state,
        selectedReadingLoading: false,
        selectedReadingError: action.error?.message ?? 'Failed to load reading',
      };

    case REPORTS_CLEAR_READING:
      return {
        ...state,
        selectedReading: null,
        selectedReadingError: null,
        selectedReadingLoading: false,
      };

    case REPORTS_RESET:
      return { ...init };

    default:
      return state;
  }
}
