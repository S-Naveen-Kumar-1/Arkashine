// src/redux/reducers/soilPartnerReducer.js

import { SP_ENQUIRY_REQUEST } from '../actions/soilPartnerActions';

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

  // Update status
  updateStatusLoading: false,
  updateStatusSuccess: false,
  updateStatusError: null,

  // Upload image
  uploadImageLoading: false,
  uploadImageSuccess: false,
  uploadImageError: null,

  // Update farmer details
  updateFarmerLoading: false,
  updateFarmerSuccess: false,
  updateFarmerError: null,

  // Aadhaar check
  aadhaarCheck: null,
  aadhaarCheckLoading: false,
  aadhaarCheckError: null,

  // Delete image
  deleteImageLoading: false,
  deleteImageSuccess: false,
  deleteImageError: null,

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
        // Keep existing farmerDetail so UI doesn't flash during refresh
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

    // ── Update farmer status ──────────────────────────────────────────────
    case 'SP_UPDATE_STATUS_REQUEST':
      return {
        ...state,
        updateStatusLoading: true,
        updateStatusSuccess: false,
        updateStatusError: null,
      };

    case 'SP_UPDATE_STATUS_REQUEST_SUCCESS': {
      const d = action.payload?.data ?? action.payload;
      // Optimistically update farmerDetail.status so UI reflects immediately
      return {
        ...state,
        updateStatusLoading: false,
        updateStatusSuccess: true,
        updateStatusError: null,
        farmerDetail: state.farmerDetail
          ? {
              ...state.farmerDetail,
              status: d?.status ?? state.farmerDetail.status,
            }
          : state.farmerDetail,
      };
    }

    case 'SP_UPDATE_STATUS_REQUEST_FAIL':
      return {
        ...state,
        updateStatusLoading: false,
        updateStatusSuccess: false,
        updateStatusError:
          action.error?.response?.data?.detail ??
          action.error?.response?.data ??
          action.error?.message ??
          'Status update failed',
      };

    case 'SP_UPDATE_STATUS_RESET':
      return {
        ...state,
        updateStatusLoading: false,
        updateStatusSuccess: false,
        updateStatusError: null,
      };

    // ── Upload farmer image ───────────────────────────────────────────────
    case 'SP_UPLOAD_IMAGE_REQUEST':
      return {
        ...state,
        uploadImageLoading: true,
        uploadImageSuccess: false,
        uploadImageError: null,
      };

    case 'SP_UPLOAD_IMAGE_REQUEST_SUCCESS': {
      const d = action.payload?.data ?? action.payload;
      return {
        ...state,
        uploadImageLoading: false,
        uploadImageSuccess: true,
        uploadImageError: null,
        farmerDetail: state.farmerDetail
          ? {
              ...state.farmerDetail,
              farmer_image: d?.farmer_image ?? state.farmerDetail.farmer_image,
            }
          : state.farmerDetail,
      };
    }

    case 'SP_UPLOAD_IMAGE_REQUEST_FAIL':
      return {
        ...state,
        uploadImageLoading: false,
        uploadImageSuccess: false,
        uploadImageError:
          action.error?.response?.data?.detail ??
          action.error?.message ??
          'Image upload failed',
      };

    case 'SP_UPLOAD_IMAGE_RESET':
      return {
        ...state,
        uploadImageLoading: false,
        uploadImageSuccess: false,
        uploadImageError: null,
      };

    // ── Update farmer details ─────────────────────────────────────────────
    case 'SP_UPDATE_FARMER_REQUEST':
      return {
        ...state,
        updateFarmerLoading: true,
        updateFarmerSuccess: false,
        updateFarmerError: null,
      };

    case 'SP_UPDATE_FARMER_REQUEST_SUCCESS': {
      const d = action.payload?.data ?? action.payload;
      return {
        ...state,
        updateFarmerLoading: false,
        updateFarmerSuccess: true,
        updateFarmerError: null,
        farmerDetail: d ?? state.farmerDetail,
        // Also update in the list if present
        farmers: state.farmers.map(f => (f.id === d?.id ? { ...f, ...d } : f)),
      };
    }

    case 'SP_UPDATE_FARMER_REQUEST_FAIL':
      return {
        ...state,
        updateFarmerLoading: false,
        updateFarmerSuccess: false,
        updateFarmerError:
          action.error?.response?.data ??
          action.error?.message ??
          'Update failed',
      };

    case 'SP_UPDATE_FARMER_RESET':
      return {
        ...state,
        updateFarmerLoading: false,
        updateFarmerSuccess: false,
        updateFarmerError: null,
      };

    // ── Aadhaar check ─────────────────────────────────────────────────────
    case 'SP_CHECK_AADHAAR_REQUEST':
      return {
        ...state,
        aadhaarCheckLoading: true,
        aadhaarCheck: null,
        aadhaarCheckError: null,
      };

    case 'SP_CHECK_AADHAAR_REQUEST_SUCCESS': {
      const d = action.payload?.data ?? action.payload;
      return {
        ...state,
        aadhaarCheckLoading: false,
        aadhaarCheck: d,
        aadhaarCheckError: null,
      };
    }

    case 'SP_CHECK_AADHAAR_REQUEST_FAIL':
      return {
        ...state,
        aadhaarCheckLoading: false,
        aadhaarCheck: null,
        aadhaarCheckError: action.error?.message ?? 'Check failed',
      };

    case 'SP_CHECK_AADHAAR_RESET':
      return {
        ...state,
        aadhaarCheck: null,
        aadhaarCheckLoading: false,
        aadhaarCheckError: null,
      };

    // ── Delete farmer image ───────────────────────────────────────────────
    case 'SP_DELETE_IMAGE_REQUEST':
      return {
        ...state,
        deleteImageLoading: true,
        deleteImageSuccess: false,
        deleteImageError: null,
      };

    case 'SP_DELETE_IMAGE_REQUEST_SUCCESS':
      return {
        ...state,
        deleteImageLoading: false,
        deleteImageSuccess: true,
        deleteImageError: null,
        farmerDetail: state.farmerDetail
          ? { ...state.farmerDetail, farmer_image: null }
          : state.farmerDetail,
      };

    case 'SP_DELETE_IMAGE_REQUEST_FAIL':
      return {
        ...state,
        deleteImageLoading: false,
        deleteImageSuccess: false,
        deleteImageError:
          action.error?.response?.data?.detail ??
          action.error?.message ??
          'Delete failed',
      };

    case 'SP_DELETE_IMAGE_RESET':
      return {
        ...state,
        deleteImageLoading: false,
        deleteImageSuccess: false,
        deleteImageError: null,
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

    // ── Soil Partner Enquiry ──────────────────────────────────────────────
    case 'SP_ENQUIRY_REQUEST':
      return { ...state, status: 'loading', error: null };

    case 'SP_ENQUIRY_REQUEST_SUCCESS':
      return { ...state, status: 'success', error: null };

    case 'SP_ENQUIRY_REQUEST_FAIL': {
      const is409 =
        action.error?.response?.status === 409 ||
        action.payload?.status === 409;
      return {
        ...state,
        status: is409 ? 'duplicate' : 'error',
        error: action.error?.message ?? action.payload ?? 'Submission failed',
      };
    }

    case 'SP_ENQUIRY_RESET':
      return { ...init };

    default:
      return state;
  }
}
