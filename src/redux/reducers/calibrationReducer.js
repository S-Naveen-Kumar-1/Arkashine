// src/redux/reducers/calibrationReducer.js
import {
  CAL_PH_POINT_SAVED,
  CAL_EC_POINT_SAVED,
  CAL_SAVED_TO_DEVICE,
  CAL_RESET,
} from '../../config/actionTypes';

// phPoints / ecPoints:  array of { standardPH/EC, voltage, capturedAt }
// voltage = null means the point was skipped

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
  savedAt: null, // timestamp when CAL_SAVED_TO_DEVICE
  lastCalibrated: null, // ISO string
};

export default function calibrationReducer(state = init, action) {
  switch (action.type) {
    case CAL_PH_POINT_SAVED: {
      // payload: { standardPH, voltage }
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
