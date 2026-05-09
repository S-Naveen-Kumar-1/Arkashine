// src/redux/reducers/calibrationReducer.js
import {
  CAL_PH_POINT_SAVED,
  CAL_EC_POINT_SAVED,
  CAL_SAVED_TO_DEVICE,
  CAL_RESET,
  CAL_POINT_DONE, // FIX: added — this is what bleActions dispatches on DONE
} from '../../config/actionTypes';

const PH_DEFAULTS = [
  { standardPH: 4, voltage: null, capturedAt: null },
  { standardPH: 7, voltage: null, capturedAt: null },
  { standardPH: 9, voltage: null, capturedAt: null },
];

const EC_DEFAULTS = [
  { standardEC: 0.0, voltage: null, capturedAt: null },
  { standardEC: 1.413, voltage: null, capturedAt: null },
  { standardEC: 12.88, voltage: null, capturedAt: null },
];

const init = {
  phPoints: PH_DEFAULTS,
  ecPoints: EC_DEFAULTS,
  savedAt: null,
  lastCalibrated: null,
};

export default function calibrationReducer(state = init, action) {
  switch (action.type) {
    // Dispatched manually by handleCapture / handleSkip in the screen
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

    // FIX: dispatched automatically by bleActions.parsePayload when firmware
    // responds with {"CALIBERATE":"PH","STATUS":"DONE","value":4,"pHVoltage":...}
    // Without this case, calibration.phPoints voltages stayed null forever and
    // CalibrationSummaryScreen always showed 0/3 points.
    case CAL_POINT_DONE: {
      const { type, value, voltage } = action.payload;
      if (type === 'PH') {
        return {
          ...state,
          phPoints: state.phPoints.map(p =>
            p.standardPH === value
              ? { ...p, voltage, capturedAt: Date.now() }
              : p,
          ),
        };
      }
      if (type === 'EC') {
        return {
          ...state,
          ecPoints: state.ecPoints.map(p =>
            p.standardEC === value
              ? { ...p, voltage, capturedAt: Date.now() }
              : p,
          ),
        };
      }
      return state;
    }

    case CAL_SAVED_TO_DEVICE:
      return {
        ...state,
        savedAt: Date.now(),
        lastCalibrated: new Date().toISOString(),
      };

    case CAL_RESET:
      return { ...init };

    default:
      return state;
  }
}
