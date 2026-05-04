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

import { cmdStartTest, cmdStopTest } from './bleActions';

import { MOTOR_DURATION } from '../reducers/phTestReducer';

// ─── Module-level timer ref ───────────────────────────────────────────────────
let _motorInterval = null;

// ─── Test lifecycle ───────────────────────────────────────────────────────────

/** Reset motor + result state. Call when MixerScreen mounts. */
export const testReset = () => ({ type: TEST_RESET });

/**
 * Start the motor:
 *  1. Sends {"TEST":"START"} to firmware via BLE
 *  2. Starts a local 60-second countdown in Redux
 *  3. Auto-completes when countdown hits 0
 */
export const startMotor = () => async dispatch => {
  clearInterval(_motorInterval);

  // Send JSON command — firmware starts motor + will send sensor data when done
  await dispatch(cmdStartTest()); // → {"TEST":"START"}

  dispatch({ type: TEST_MOTOR_START });

  // Local UI countdown (mirrors the 60 s firmware timer)
  _motorInterval = setInterval(() => {
    dispatch({ type: TEST_MOTOR_TICK });
  }, 1000);

  setTimeout(() => {
    clearInterval(_motorInterval);
    dispatch({ type: TEST_MOTOR_DONE });
  }, MOTOR_DURATION * 1000);
};

/**
 * Stop motor early (UI only — firmware handles its own timeout).
 * Does NOT send a BLE command; the firmware will time out on its own.
 */
export const stopMotorEarly = () => async dispatch => {
  clearInterval(_motorInterval);
  await dispatch(cmdStopTest()); // → {"TEST":"STOP"}
  dispatch({ type: TEST_MOTOR_DONE });
};

/**
 * Save the final sensor result into Redux and increment test count.
 * Called automatically from PHECResultScreen when BLE data arrives.
 */
export const saveTestResult = result => dispatch => {
  dispatch({ type: TEST_RESULTS_RECEIVED, payload: result });
  dispatch({ type: TEST_SAVED });
};

// ─── pH calibration ───────────────────────────────────────────────────────────

/**
 * Send a pH calibration command to firmware and record the probe voltage.
 *
 * Flow:
 *   1. Sends {"CALIBERATE":"PH","value":4} via BLE
 *   2. Firmware replies {"CALIBERATE":"PH","STATUS":"DONE","value":"4.00"}
 *      → bleActions dispatches CAL_POINT_DONE (handled in reducer)
 *   3. We also store the voltage the screen captured locally
 *
 * @param {4|7|9} standardPH  known buffer solution value
 * @param {number|null} voltage  probe voltage from sensorData (null = skipped)
 */
export const savePhPoint = (standardPH, voltage) => async dispatch => {
  dispatch({ type: CAL_PH_POINT_SAVED, payload: { standardPH, voltage } });
};

// ─── EC calibration ───────────────────────────────────────────────────────────

/**
 * Send an EC calibration command and record the probe voltage.
 *
 * @param {0.0|1.413|12.88} standardEC  known conductivity standard (dS/m)
 * @param {number|null} voltage
 */
export const saveEcPoint = (standardEC, voltage) => async dispatch => {
  dispatch({ type: CAL_EC_POINT_SAVED, payload: { standardEC, voltage } });
};

/**
 * Persist calibration to device flash.
 * Firmware stores the values; we mark lastCalibrated in Redux.
 * Note: firmware doesn't have a separate save command in current protocol —
 * each CALIBERATE command is saved immediately. This action just marks Redux.
 */
export const persistCalibration = () => dispatch => {
  dispatch({ type: CAL_SAVED_TO_DEVICE });
};

/** Reset calibration points in Redux (does NOT reset device flash). */
export const resetCalibration = () => ({ type: CAL_RESET });
