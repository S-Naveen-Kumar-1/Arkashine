// src/redux/actions/calibrationActions.js
import {
  CAL_PH_POINT_SAVED,
  CAL_EC_POINT_SAVED,
  CAL_SAVED_TO_DEVICE,
  CAL_RESET,
} from '../../config/actionTypes';
import {
  cmdCalibratePhPoint,
  cmdCalibrateEcPoint,
  cmdSaveCalibration,
  cmdResetCalibration,
} from './bleActions';

/**
 * Capture a pH calibration point.
 * 1. Sends BLE command so device captures voltage at this buffer.
 * 2. Stores the voltage returned from BLE notification in Redux.
 *
 * voltage — value read from sensorData.voltage after the command response
 */
export const savePhPoint = (standardPH, voltage) => async dispatch => {
  await dispatch(cmdCalibratePhPoint(standardPH));
  dispatch({ type: CAL_PH_POINT_SAVED, payload: { standardPH, voltage } });
};

/**
 * Capture an EC calibration point.
 */
export const saveEcPoint = (standardEC, voltage) => async dispatch => {
  await dispatch(cmdCalibrateEcPoint(standardEC));
  dispatch({ type: CAL_EC_POINT_SAVED, payload: { standardEC, voltage } });
};

/**
 * Persist all calibration to device flash.
 */
export const persistCalibration = () => async dispatch => {
  await dispatch(cmdSaveCalibration());
  dispatch({ type: CAL_SAVED_TO_DEVICE });
};

/**
 * Reset calibration on both device and in Redux.
 */
export const resetCalibration = () => async dispatch => {
  await dispatch(cmdResetCalibration());
  dispatch({ type: CAL_RESET });
};
