// src/redux/actions/soilPartnerActions.js

// ─── 1. Fetch farmers list ────────────────────────────────────────────────────
export function fetchFarmers() {
  return {
    type: 'SP_FETCH_FARMERS_REQUEST',
    payload: {
      request: {
        url: '/api/mobile/farmers/',
        method: 'GET',
      },
    },
  };
}

// ─── 2. Fetch single farmer detail ───────────────────────────────────────────
// GET /api/mobile/farmers/{id}/
export function fetchFarmerDetail(farmerId) {
  return {
    type: 'SP_FETCH_FARMER_DETAIL_REQUEST',
    payload: {
      request: {
        url: `/api/mobile/farmers/${farmerId}/`,
        method: 'GET',
      },
    },
  };
}

// ─── 3. Add / register a farmer ───────────────────────────────────────────────
export function addFarmer(farmerData) {
  if (farmerData.farmer_image) {
    const form = new FormData();
    Object.entries(farmerData).forEach(([key, val]) => {
      if (val != null) form.append(key, val);
    });
    return {
      type: 'SP_ADD_FARMER_REQUEST',
      payload: {
        request: {
          url: '/api/mobile/farmers/create/',
          method: 'POST',
          data: form,
          headers: { 'Content-Type': 'multipart/form-data' },
        },
      },
    };
  }
  return {
    type: 'SP_ADD_FARMER_REQUEST',
    payload: {
      request: {
        url: '/api/mobile/farmers/create/',
        method: 'POST',
        data: farmerData,
      },
    },
  };
}

// ─── 4. Reset add-farmer state ────────────────────────────────────────────────
export function resetAddFarmer() {
  return { type: 'SP_ADD_FARMER_RESET' };
}

// ─── 5. Fetch payment history ─────────────────────────────────────────────────
export function fetchPayments(filters = {}) {
  const params = {};
  if (filters.status) params.status = filters.status;
  if (filters.date_from) params.date_from = filters.date_from;
  if (filters.date_to) params.date_to = filters.date_to;
  if (filters.paid_from) params.paid_from = filters.paid_from;
  if (filters.paid_to) params.paid_to = filters.paid_to;

  return {
    type: 'SP_FETCH_PAYMENTS_REQUEST',
    payload: {
      request: {
        url: '/api/mobile/account/payment-history/',
        method: 'GET',
        params,
      },
    },
  };
}
