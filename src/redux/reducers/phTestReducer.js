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

const init = {
  results: null,
  testCount: 0,
  savedAt: null,
  history: [],

  phPoints: PH_DEFAULTS,

  ecPoints: EC_DEFAULTS,

  lastCalibrated: null,
  finalPhResult: null,
  calibrationPoints: {
    PH: {},
    EC: {},
  },
};

// ─── Reducer ──────────────────────────────────────────────────────────────────
export default function phTestReducer(state = init, action) {
  switch (action.type) {
    case TEST_RESET:
      return {
        ...state,
        motorState: 'idle',
        motorTimeLeft: MOTOR_DURATION,
        motorStartedAt: null,
        results: null,
        savedAt: null,
      };

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

    case 'PH_FINAL_RESULT':
      return {
        ...state,
        finalPhResult: action.payload,
      };

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

    case CAL_POINT_DONE: {
      const { type, value, voltage } = action.payload;

      return {
        ...state,

        // ✅ store calibration history
        calibrationPoints: {
          ...state.calibrationPoints,
          [type]: {
            ...state.calibrationPoints[type],
            [value]: voltage,
          },
        },
      };
    }

    case 'CAL_POINT_RESET':
      return {
        ...state,

        calibrationPoints: {
          PH: {},
          EC: {},
        },
      };

    case 'CAL_SAVED_TO_DEVICE':
      return {
        ...state,
        lastCalibrated: new Date().toISOString(),
      };
    case 'CAL_RESET':
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
