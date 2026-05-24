// src/redux/actions/phTestActions.js
//
// All actions for the pH/EC test flow:
//   motor control, calibration capture, result saving
//
// BLE commands are imported from bleActions — this file handles
// the Redux state side only (timers, saving, etc.)

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
} from '../../config/actionTypes';

export const testReset = () => ({ type: TEST_RESET });

export const saveTestResult = result => dispatch => {
  dispatch({ type: TEST_RESULTS_RECEIVED, payload: result });
  dispatch({ type: TEST_SAVED });
};

export const savePhPoint = (standardPH, voltage) => async dispatch => {
  dispatch({ type: CAL_PH_POINT_SAVED, payload: { standardPH, voltage } });
};

export const saveEcPoint = (standardEC, voltage) => async dispatch => {
  dispatch({ type: CAL_EC_POINT_SAVED, payload: { standardEC, voltage } });
};

export const persistCalibration = () => dispatch => {
  dispatch({ type: CAL_SAVED_TO_DEVICE });
};

export const resetCalibration = () => ({ type: CAL_RESET });
export const finalPhResult = r => ({
  type: 'PH_FINAL_RESULT',
  payload: r,
});

export function createPHBottleReading({
  device_id,
  field1, // pH Value
  field2, // pH Voltage (mV)
  field3, // EC Value (mS/cm)
  field4, // EC Voltage (mV)
  tag = '',
}) {
  return {
    type: 'CREATE_PH_BOTTLE_READING',
    payload: {
      request: {
        url: `/api/mobile/devices/${device_id}/ph-bottle/create/`,
        method: 'POST',
        data: {
          field1,
          field2,
          field3,
          field4,
          tag,
        },
      },
    },
  };
}
