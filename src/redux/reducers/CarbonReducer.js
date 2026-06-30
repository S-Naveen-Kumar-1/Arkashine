// redux-axios-middleware automatically dispatches:
//   CALCULATE_CARBON          → pending
//   CALCULATE_CARBON_SUCCESS  → fulfilled  (action.payload.data = axios response data)
//   CALCULATE_CARBON_FAIL     → rejected   (action.error)

const initialState = {
  calculation: {
    loading: false,
    data: null,
    error: null,
  },
  recommendations: {
    loading: false,
    data: null,
    error: null,
  },
};

export default function carbonReducer(state = initialState, action) {
  switch (action.type) {

    // ── Calculate Carbon ───────────────────────────────────────────────
    case 'CALCULATE_CARBON':
      return {
        ...state,
        calculation: { loading: true, data: null, error: null },
      };

    case 'CALCULATE_CARBON_SUCCESS':
      return {
        ...state,
        calculation: { loading: false, data: action.payload.data, error: null },
      };

    case 'CALCULATE_CARBON_FAIL':
      return {
        ...state,
        calculation: {
          loading: false,
          data: null,
          error: action.error?.response?.data?.error || action.error?.message || 'Request failed',
        },
      };

    // ── Analyze Farm / Recommendations ────────────────────────────────
    case 'ANALYZE_FARM':
      return {
        ...state,
        recommendations: { loading: true, data: null, error: null },
      };

    case 'ANALYZE_FARM_SUCCESS':
      return {
        ...state,
        recommendations: { loading: false, data: action.payload.data, error: null },
      };

    case 'ANALYZE_FARM_FAIL':
      return {
        ...state,
        recommendations: {
          loading: false,
          data: null,
          error: action.error?.response?.data?.error || action.error?.message || 'Request failed',
        },
      };

    // ── Reset ──────────────────────────────────────────────────────────
    case 'CARBON_RESET':
      return initialState;

    default:
      return state;
  }
}