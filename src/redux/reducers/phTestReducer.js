// src/redux/reducers/phTestReducer.js

import {
  TEST_RESET,
  TEST_MOTOR_START,
  TEST_MOTOR_TICK,
  TEST_MOTOR_DONE,
  TEST_RESULTS_RECEIVED,
  TEST_SAVED,
  CAL_PH_POINT_SAVED,
  CAL_EC_POINT_SAVED,
  CAL_SAVED_TO_DEVICE,
  CAL_RESET,
  CAL_POINT_DONE,
} from '../../config/actionTypes';

export const MOTOR_DURATION = 60; 
const PH_DEFAULTS = [
  { standardPH: 4, voltage: null, confirmedValue: null, capturedAt: null },
  { standardPH: 7, voltage: null, confirmedValue: null, capturedAt: null },
  { standardPH: 9, voltage: null, confirmedValue: null, capturedAt: null },
];
const EC_DEFAULTS = [
  { standardEC: 0.0, voltage: null, confirmedValue: null, capturedAt: null },
  { standardEC: 1.413, voltage: null, confirmedValue: null, capturedAt: null },
  { standardEC: 12.88, voltage: null, confirmedValue: null, capturedAt: null },
];

// ─── Initial state ────────────────────────────────────────────────────────────
const init = {
  // ── Motor phase ─────────────────────────────────────────────────────────
  motorState: 'idle', // 'idle' | 'running' | 'done'
  motorTimeLeft: MOTOR_DURATION,
  motorStartedAt: null,

  // ── Test results (from firmware after motor finishes) ────────────────────
  // Populated by BLE_DATA_RECEIVED forwarded through TEST_RESULTS_RECEIVED
  results: null, // { ph, ec, voltage, ecVoltage, temperature, temperatureFallback, raw, timestamp }
  testCount: 0,
  savedAt: null,
  history: [], // last 100 results

  // ── pH calibration points ────────────────────────────────────────────────
  phPoints: PH_DEFAULTS,

  // ── EC calibration points ────────────────────────────────────────────────
  ecPoints: EC_DEFAULTS,

  // ── Calibration metadata ─────────────────────────────────────────────────
  lastCalibrated: null, // ISO string — last time calibration was saved to device
};

// ─── Reducer ──────────────────────────────────────────────────────────────────
export default function phTestReducer(state = init, action) {
  switch (action.type) {
    // ── Full test reset (call before starting MixerScreen) ───────────────
    case TEST_RESET:
      return {
        ...state,
        motorState: 'idle',
        motorTimeLeft: MOTOR_DURATION,
        motorStartedAt: null,
        results: null,
        savedAt: null,
      };

    // ── Motor phase ──────────────────────────────────────────────────────
    case TEST_MOTOR_START:
      return {
        ...state,
        motorState: 'running',
        motorTimeLeft: MOTOR_DURATION,
        motorStartedAt: Date.now(),
      };

    case TEST_MOTOR_TICK:
      return {
        ...state,
        motorTimeLeft: Math.max(0, state.motorTimeLeft - 1),
      };

    case TEST_MOTOR_DONE:
      return { ...state, motorState: 'done', motorTimeLeft: 0 };

    // ── Results from firmware ────────────────────────────────────────────
    // Payload: { ph, ec, voltage, ecVoltage, temperature, temperatureFallback, raw }
    case TEST_RESULTS_RECEIVED:
      return {
        ...state,
        results: { ...action.payload, timestamp: Date.now() },
      };

    case TEST_SAVED:
      return {
        ...state,
        savedAt: Date.now(),
        testCount: state.testCount + 1,
        history: [
          { ...state.results, savedAt: Date.now() },
          ...state.history.slice(0, 99),
        ],
      };

    // ── pH calibration ───────────────────────────────────────────────────
    // Fired by app when user captures a voltage reading locally
    case CAL_PH_POINT_SAVED: {
      const { standardPH, voltage } = action.payload;
      return {
        ...state,
        phPoints: state.phPoints.map(p =>
          p.standardPH === standardPH
            ? { ...p, voltage, capturedAt: Date.now() }
            : p,
        ),
      };
    }

    // ── EC calibration ───────────────────────────────────────────────────
    case CAL_EC_POINT_SAVED: {
      const { standardEC, voltage } = action.payload;
      return {
        ...state,
        ecPoints: state.ecPoints.map(p =>
          p.standardEC === standardEC
            ? { ...p, voltage, capturedAt: Date.now() }
            : p,
        ),
      };
    }

    // ── CAL_POINT_DONE — device confirmed the calibration point ──────────
    // payload: { type: 'PH'|'EC', value: number }
    // Stores the device-confirmed value alongside the probe voltage
    case CAL_POINT_DONE: {
      const { type, value } = action.payload;
      if (type === 'PH') {
        // Find the point that was most recently awaiting confirmation
        const pending = state.phPoints.find(
          p => p.capturedAt !== null && p.confirmedValue === null,
        );
        if (!pending) return state;
        return {
          ...state,
          phPoints: state.phPoints.map(p =>
            p.standardPH === pending.standardPH
              ? { ...p, confirmedValue: value }
              : p,
          ),
        };
      }
      if (type === 'EC') {
        const pending = state.ecPoints.find(
          p => p.capturedAt !== null && p.confirmedValue === null,
        );
        if (!pending) return state;
        return {
          ...state,
          ecPoints: state.ecPoints.map(p =>
            p.standardEC === pending.standardEC
              ? { ...p, confirmedValue: value }
              : p,
          ),
        };
      }
      return state;
    }

    // ── Saved to device flash ────────────────────────────────────────────
    case CAL_SAVED_TO_DEVICE:
      return {
        ...state,
        lastCalibrated: new Date().toISOString(),
      };

    // ── Reset calibration only (keep test history) ───────────────────────
    case CAL_RESET:
      return {
        ...state,
        phPoints: PH_DEFAULTS,
        ecPoints: EC_DEFAULTS,
        lastCalibrated: null,
      };

    default:
      return state;
  }
}
