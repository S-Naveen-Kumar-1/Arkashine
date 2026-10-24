// src/redux/reducers/harvestlenzReducer.js

import {
  FETCH_HARVESTLENZ_SCANS_REQUEST,
  FETCH_HARVESTLENZ_SCANS_SUCCESS,
  FETCH_HARVESTLENZ_SCANS_FAIL,
  FETCH_HARVESTLENZ_DETAIL_REQUEST,
  FETCH_HARVESTLENZ_DETAIL_SUCCESS,
  FETCH_HARVESTLENZ_DETAIL_FAIL,
  SCAN_FRUIT_REQUEST,
  SCAN_FRUIT_SUCCESS,
  SCAN_FRUIT_FAIL,
  CLEAR_HARVEST_SCAN_RESULT,
  FETCH_HARVESTLENZ_STATS_REQUEST,
  FETCH_HARVESTLENZ_STATS_SUCCESS,
  FETCH_HARVESTLENZ_STATS_FAIL,
  FETCH_HARVESTLENZ_FRUITS_REQUEST,
  FETCH_HARVESTLENZ_FRUITS_SUCCESS,
  FETCH_HARVESTLENZ_FRUITS_FAIL,
} from '../actions/harvestlenzActions';

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

  // Supported Fruits Encyclopedia
  fruits: null,
  fruitsLoading: false,
  fruitsError: null,
};

export default function harvestlenzReducer(state = initialState, action) {
  switch (action.type) {
    // ── List Scans ──
    case FETCH_HARVESTLENZ_SCANS_REQUEST:
      return { ...state, scansLoading: true, scansError: null };
    case FETCH_HARVESTLENZ_SCANS_SUCCESS: {
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
    case FETCH_HARVESTLENZ_SCANS_FAIL:
      return {
        ...state,
        scansLoading: false,
        scansError: action.error?.response?.data?.detail || 'Failed to load harvest scans',
      };

    // ── Single Scan Detail ──
    case FETCH_HARVESTLENZ_DETAIL_REQUEST:
      return { ...state, scanDetailLoading: true, scanDetailError: null };
    case FETCH_HARVESTLENZ_DETAIL_SUCCESS:
      return {
        ...state,
        scanDetailLoading: false,
        scanDetail: action.payload?.data,
        scanDetailError: null,
      };
    case FETCH_HARVESTLENZ_DETAIL_FAIL:
      return {
        ...state,
        scanDetailLoading: false,
        scanDetailError:
          action.error?.response?.data?.detail || 'Failed to load harvest scan detail',
      };

    // ── Fruit Photo Scan (Upload & Inference) ──
    case SCAN_FRUIT_REQUEST:
      return { ...state, scanUploading: true, scanError: null, scanResult: null };
    case SCAN_FRUIT_SUCCESS:
      return {
        ...state,
        scanUploading: false,
        scanResult: action.payload?.data,
        scanError: null,
      };
    case SCAN_FRUIT_FAIL:
      return {
        ...state,
        scanUploading: false,
        scanError:
          action.error?.response?.data?.detail ||
          'Fruit grading analysis failed. Please try again.',
      };
    case CLEAR_HARVEST_SCAN_RESULT:
      return { ...state, scanResult: null, scanError: null, scanUploading: false };

    // ── Device Stats ──
    case FETCH_HARVESTLENZ_STATS_REQUEST:
      return { ...state, statsLoading: true, statsError: null };
    case FETCH_HARVESTLENZ_STATS_SUCCESS:
      return {
        ...state,
        statsLoading: false,
        stats: action.payload?.data,
        statsError: null,
      };
    case FETCH_HARVESTLENZ_STATS_FAIL:
      return {
        ...state,
        statsLoading: false,
        statsError: action.error?.response?.data?.detail || 'Failed to load stats',
      };

    // ── Supported Fruits Encyclopedia ──
    case FETCH_HARVESTLENZ_FRUITS_REQUEST:
      return { ...state, fruitsLoading: true, fruitsError: null };
    case FETCH_HARVESTLENZ_FRUITS_SUCCESS:
      return {
        ...state,
        fruitsLoading: false,
        fruits: action.payload?.data?.fruits || action.payload?.data || [],
        fruitsError: null,
      };
    case FETCH_HARVESTLENZ_FRUITS_FAIL:
      return {
        ...state,
        fruitsLoading: false,
        fruitsError:
          action.error?.response?.data?.detail || 'Failed to load supported fruits',
      };

    default:
      return state;
  }
}
