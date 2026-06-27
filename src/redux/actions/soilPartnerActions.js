// src/redux/actions/soilPartnerActions.js

export const SP_ENQUIRY_REQUEST = 'SP_ENQUIRY_REQUEST';
export const SP_ENQUIRY_SUCCESS = 'SP_ENQUIRY_SUCCESS';
export const SP_ENQUIRY_FAIL = 'SP_ENQUIRY_FAIL';
export const SP_ENQUIRY_RESET = 'SP_ENQUIRY_RESET';

// ─── 1. Fetch farmers list ────────────────────────────────────────────────────
export function fetchFarmers() {
  return {
    type: 'SP_FETCH_FARMERS_REQUEST',
    payload: {
      request: { url: '/api/mobile/farmers/', method: 'GET' },
    },
  };
}

// ─── 2. Fetch single farmer detail ───────────────────────────────────────────
export function fetchFarmerDetail(farmerId) {
  return {
    type: 'SP_FETCH_FARMER_DETAIL_REQUEST',
    payload: {
      request: { url: `/api/mobile/farmers/${farmerId}/`, method: 'GET' },
    },
  };
}

// ─── 3. Add / register a farmer ──────────────────────────────────────────────
export function addFarmer(farmerData) {
  const form = new FormData();
  Object.entries(farmerData).forEach(([key, val]) => {
    if (val != null && val !== '') form.append(key, val);
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

// ─── 4. Reset add-farmer state ────────────────────────────────────────────────
export function resetAddFarmer() {
  return { type: 'SP_ADD_FARMER_RESET' };
}

// ─── 5. Update farmer status ──────────────────────────────────────────────────
// POST /api/mobile/farmers/{id}/status/
// body: { status: 'registered' | 're_registered' | 'sample_collected' | 'testing_done' | 'report_delivered' }
export function updateFarmerStatus(farmerId, status) {
  return {
    type: 'SP_UPDATE_STATUS_REQUEST',
    payload: {
      request: {
        url: `/api/mobile/farmers/${farmerId}/status/`,
        method: 'POST',
        data: { status },
      },
    },
  };
}

export function resetUpdateStatus() {
  return { type: 'SP_UPDATE_STATUS_RESET' };
}

// ─── 6. Upload / replace farmer image ────────────────────────────────────────
// POST /api/mobile/farmers/{id}/image/
// multipart/form-data, field: farmer_image
export function uploadFarmerImage(farmerId, imageFile) {
  const form = new FormData();
  form.append('farmer_image', {
    uri: imageFile.uri,
    type: imageFile.type ?? 'image/jpeg',
    name: imageFile.fileName ?? `farmer_${farmerId}.jpg`,
  });
  return {
    type: 'SP_UPLOAD_IMAGE_REQUEST',
    payload: {
      request: {
        url: `/api/mobile/farmers/${farmerId}/image/`,
        method: 'POST',
        data: form,
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    },
  };
}

export function resetUploadImage() {
  return { type: 'SP_UPLOAD_IMAGE_RESET' };
}

// ─── 7. Update farmer details (PATCH) ────────────────────────────────────────
// PATCH /api/mobile/farmers/{id}/update/
// All fields optional; send only changed fields
export function updateFarmerDetails(farmerId, changes) {
  const form = new FormData();
  Object.entries(changes).forEach(([key, val]) => {
    if (val != null && val !== '') form.append(key, val);
  });
  return {
    type: 'SP_UPDATE_FARMER_REQUEST',
    payload: {
      request: {
        url: `/api/mobile/farmers/${farmerId}/update/`,
        method: 'PATCH',
        data: form,
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    },
  };
}

export function resetUpdateFarmer() {
  return { type: 'SP_UPDATE_FARMER_RESET' };
}

// ─── 8. Check if Aadhaar already registered ──────────────────────────────────
// GET /api/mobile/farmers/check-aadhaar/?aadhaar=XXXXXXXXXXXX
export function checkAadhaar(aadhaar) {
  return {
    type: 'SP_CHECK_AADHAAR_REQUEST',
    payload: {
      request: {
        url: '/api/mobile/farmers/check-aadhaar/',
        method: 'GET',
        params: { aadhaar },
      },
    },
  };
}

export function resetCheckAadhaar() {
  return { type: 'SP_CHECK_AADHAAR_RESET' };
}

// ─── 9. Fetch payment history ─────────────────────────────────────────────────
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

// ─── 10. Soil Partner enquiry ─────────────────────────────────────────────────
export function submitSoilPartnerEnquiry(data) {
  return {
    type: SP_ENQUIRY_REQUEST,
    payload: {
      request: {
        url: '/api/mobile/auth/soil-partner-enquiry/',
        method: 'POST',
        data,
      },
    },
  };
}

export function resetSoilPartnerEnquiry() {
  return { type: SP_ENQUIRY_RESET };
}

// ─── 11. Delete farmer image ──────────────────────────────────────────────────
// DELETE /api/mobile/farmers/{id}/image/
export function deleteFarmerImage(farmerId) {
  return {
    type: 'SP_DELETE_IMAGE_REQUEST',
    payload: {
      request: {
        url: `/api/mobile/farmers/${farmerId}/image/delete/`,
        method: 'DELETE',
      },
    },
  };
}

export function resetDeleteImage() {
  return { type: 'SP_DELETE_IMAGE_RESET' };
}

// ─── 12. Fetch farmer API calls / readings ────────────────────────────────────
// GET /api/mobile/farmers/{id}/api-calls/
export function fetchFarmerApiCalls(
  farmerId,
  { page = 1, perDevice = 20 } = {},
) {
  return {
    type: 'SP_FARMER_API_CALLS_REQUEST',
    payload: {
      request: {
        url: `/api/mobile/farmers/${farmerId}/api-calls/`,
        method: 'GET',
        params: { page, per_device: perDevice },
      },
    },
  };
}

export function resetFarmerApiCalls() {
  return { type: 'SP_FARMER_API_CALLS_RESET' };
}
