// src/redux/reducers/leaflenzReducer.js

import {
  FETCH_LEAFLENZ_SCANS_REQUEST,
  FETCH_LEAFLENZ_SCANS_SUCCESS,
  FETCH_LEAFLENZ_SCANS_FAIL,
  FETCH_LEAFLENZ_DETAIL_REQUEST,
  FETCH_LEAFLENZ_DETAIL_SUCCESS,
  FETCH_LEAFLENZ_DETAIL_FAIL,
  SCAN_LEAF_REQUEST,
  SCAN_LEAF_SUCCESS,
  SCAN_LEAF_FAIL,
  CLEAR_SCAN_RESULT,
  FETCH_LEAFLENZ_STATS_REQUEST,
  FETCH_LEAFLENZ_STATS_SUCCESS,
  FETCH_LEAFLENZ_STATS_FAIL,
  FETCH_LEAFLENZ_DISEASES_REQUEST,
  FETCH_LEAFLENZ_DISEASES_SUCCESS,
  FETCH_LEAFLENZ_DISEASES_FAIL,
} from '../actions/leaflenzActions';

const initialState = {
  // Scans List
  scans: [],
  scansPagination: null,
  scansLoading: false,
  scansError: null,

  // Single Scan Detail
  scanDetail: null,
  scanDetailLoading: false,
  scanDetailError: null,

  // Active Scan Submission
  scanUploading: false,
  scanResult: null,
  scanError: null,

  // Device Stats
  stats: null,
  statsLoading: false,
  statsError: null,

  // Disease Encyclopedia
  diseases: null,
  diseasesLoading: false,
  diseasesError: null,
};

export default function leaflenzReducer(state = initialState, action) {
  switch (action.type) {
    // ── List Scans ──
    case FETCH_LEAFLENZ_SCANS_REQUEST:
      return { ...state, scansLoading: true, scansError: null };
    case FETCH_LEAFLENZ_SCANS_SUCCESS: {
      const data = action.payload?.data;
      const results = data?.results || (Array.isArray(data) ? data : []);
      return {
        ...state,
        scansLoading: false,
        scans: results,
        scansPagination: data?.pagination || null,
        scansError: null,
      };
    }
    case FETCH_LEAFLENZ_SCANS_FAIL:
      return {
        ...state,
        scansLoading: false,
        scansError: action.error?.response?.data?.detail || 'Failed to load scans',
      };

    // ── Single Scan Detail ──
    case FETCH_LEAFLENZ_DETAIL_REQUEST:
      return { ...state, scanDetailLoading: true, scanDetailError: null };
    case FETCH_LEAFLENZ_DETAIL_SUCCESS:
      return {
        ...state,
        scanDetailLoading: false,
        scanDetail: action.payload?.data,
        scanDetailError: null,
      };
    case FETCH_LEAFLENZ_DETAIL_FAIL:
      return {
        ...state,
        scanDetailLoading: false,
        scanDetailError: action.error?.response?.data?.detail || 'Failed to load scan detail',
      };

    // ── Leaf Photo Scan (Upload & Inference) ──
    case SCAN_LEAF_REQUEST:
      return { ...state, scanUploading: true, scanError: null, scanResult: null };
    case SCAN_LEAF_SUCCESS:
      return {
        ...state,
        scanUploading: false,
        scanResult: action.payload?.data,
        scanError: null,
      };
    case SCAN_LEAF_FAIL:
      return {
        ...state,
        scanUploading: false,
        scanError: action.error?.response?.data?.detail || 'Leaf analysis failed. Please try again.',
      };
    case CLEAR_SCAN_RESULT:
      return { ...state, scanResult: null, scanError: null, scanUploading: false };

    // ── Stats ──
    case FETCH_LEAFLENZ_STATS_REQUEST:
      return { ...state, statsLoading: true, statsError: null };
    case FETCH_LEAFLENZ_STATS_SUCCESS:
      return {
        ...state,
        statsLoading: false,
        stats: action.payload?.data,
        statsError: null,
      };
    case FETCH_LEAFLENZ_STATS_FAIL:
      return {
        ...state,
        statsLoading: false,
        statsError: action.error?.response?.data?.detail || 'Failed to load device stats',
      };

    // ── Disease Encyclopedia ──
    case FETCH_LEAFLENZ_DISEASES_REQUEST:
      return { ...state, diseasesLoading: true, diseasesError: null };
    case FETCH_LEAFLENZ_DISEASES_SUCCESS:
      return {
        ...state,
        diseasesLoading: false,
        diseases: action.payload?.data,
        diseasesError: null,
      };
    case FETCH_LEAFLENZ_DISEASES_FAIL:
      return {
        ...state,
        diseasesLoading: false,
        diseasesError: action.error?.response?.data?.detail || 'Failed to load disease encyclopedia',
      };

    case 'LOGOUT_REQUEST':
      return initialState;

    default:
      return state;
  }
}
