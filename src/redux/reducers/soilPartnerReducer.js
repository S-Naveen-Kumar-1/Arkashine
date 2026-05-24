// src/redux/reducers/soilPartnerReducer.js

const init = {
  // Farmers list
  farmers: [],
  farmersCount: 0,
  farmersLoading: false,
  farmersError: null,

  // Farmer detail
  farmerDetail: null,
  farmerDetailLoading: false,
  farmerDetailError: null,

  // Add farmer
  addFarmerLoading: false,
  addFarmerError: null,
  addFarmerSuccess: false,

  // Payments
  payments: [],
  paymentsMeta: {
    count: 0,
    total_amount: '0',
    paid_amount: '0',
    pending_amount: '0',
    paid_count: 0,
    pending_count: 0,
  },
  paymentsLoading: false,
  paymentsError: null,
};

export default function soilPartnerReducer(state = init, action) {
  switch (action.type) {
    case 'LOGOUT_REQUEST':
      return { ...init };

    // ── Fetch farmers list ────────────────────────────────────────────────
    case 'SP_FETCH_FARMERS_REQUEST':
      return { ...state, farmersLoading: true, farmersError: null };

    case 'SP_FETCH_FARMERS_REQUEST_SUCCESS': {
      const d = action.payload?.data ?? action.payload;
      return {
        ...state,
        farmersLoading: false,
        farmers: d?.results ?? [],
        farmersCount: d?.count ?? 0,
      };
    }

    case 'SP_FETCH_FARMERS_REQUEST_FAIL':
      return {
        ...state,
        farmersLoading: false,
        farmersError:
          action.error?.response?.data?.detail ??
          action.error?.message ??
          'Failed to load farmers',
      };

    // ── Farmer detail ─────────────────────────────────────────────────────
    case 'SP_FETCH_FARMER_DETAIL_REQUEST':
      return {
        ...state,
        farmerDetailLoading: true,
        farmerDetailError: null,
        farmerDetail: null,
      };

    case 'SP_FETCH_FARMER_DETAIL_REQUEST_SUCCESS': {
      const d = action.payload?.data ?? action.payload;
      return { ...state, farmerDetailLoading: false, farmerDetail: d };
    }

    case 'SP_FETCH_FARMER_DETAIL_REQUEST_FAIL':
      return {
        ...state,
        farmerDetailLoading: false,
        farmerDetailError:
          action.error?.response?.data?.detail ??
          action.error?.message ??
          'Failed to load farmer',
      };

    // ── Add farmer ────────────────────────────────────────────────────────
    case 'SP_ADD_FARMER_REQUEST':
      return {
        ...state,
        addFarmerLoading: true,
        addFarmerError: null,
        addFarmerSuccess: false,
      };

    case 'SP_ADD_FARMER_REQUEST_SUCCESS': {
      const newFarmer = action.payload?.data ?? action.payload;
      return {
        ...state,
        addFarmerLoading: false,
        addFarmerSuccess: true,
        farmers: [newFarmer, ...state.farmers],
        farmersCount: state.farmersCount + 1,
      };
    }

    case 'SP_ADD_FARMER_REQUEST_FAIL':
      return {
        ...state,
        addFarmerLoading: false,
        addFarmerSuccess: false,
        addFarmerError:
          action.error?.response?.data ??
          action.error?.message ??
          'Failed to add farmer',
      };

    case 'SP_ADD_FARMER_RESET':
      return {
        ...state,
        addFarmerLoading: false,
        addFarmerError: null,
        addFarmerSuccess: false,
      };

    // ── Payments ──────────────────────────────────────────────────────────
    case 'SP_FETCH_PAYMENTS_REQUEST':
      return { ...state, paymentsLoading: true, paymentsError: null };

    case 'SP_FETCH_PAYMENTS_REQUEST_SUCCESS': {
      const d = action.payload?.data ?? action.payload;
      return {
        ...state,
        paymentsLoading: false,
        payments: d?.payments ?? [],
        paymentsMeta: {
          count: d?.count ?? 0,
          total_amount: d?.total_amount ?? '0',
          paid_amount: d?.paid_amount ?? '0',
          pending_amount: d?.pending_amount ?? '0',
          paid_count: d?.paid_count ?? 0,
          pending_count: d?.pending_count ?? 0,
        },
      };
    }

    case 'SP_FETCH_PAYMENTS_REQUEST_FAIL':
      return {
        ...state,
        paymentsLoading: false,
        paymentsError:
          action.error?.response?.data?.detail ??
          action.error?.message ??
          'Failed to load payments',
      };

    case 'LOGOUT_REQUEST':
      return { ...init };

    default:
      return state;
  }
}
