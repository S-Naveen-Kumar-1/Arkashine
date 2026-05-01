// src/redux/actions/testActions.js
import {
  TEST_RESET,
  TEST_MOTOR_START,
  TEST_MOTOR_TICK,
  TEST_MOTOR_DONE,
  TEST_READING_START,
  TEST_RESULTS_RECEIVED,
  TEST_SAVED,
} from '../../config/actionTypes';
import { cmdMotorStart, cmdMotorStop, cmdReadSensors } from './bleActions';
import { MOTOR_DURATION } from '../reducers/testReducer';

export const testReset = () => ({ type: TEST_RESET });

let _motorInterval = null;

/**
 * Start the mixing motor:
 * 1. Send BLE command to hardware
 * 2. Start a local countdown in Redux
 * 3. After MOTOR_DURATION s → dispatch TEST_MOTOR_DONE
 */
export const startMotor = () => async dispatch => {
  clearInterval(_motorInterval);

  // Send command to hardware
  await dispatch(cmdMotorStart(MOTOR_DURATION));

  dispatch({ type: TEST_MOTOR_START });

  _motorInterval = setInterval(() => {
    dispatch({ type: TEST_MOTOR_TICK });
  }, 1000);

  setTimeout(() => {
    clearInterval(_motorInterval);
    dispatch({ type: TEST_MOTOR_DONE });
    dispatch(cmdMotorStop());
  }, MOTOR_DURATION * 1000);
};

export const stopMotorEarly = () => dispatch => {
  clearInterval(_motorInterval);
  dispatch({ type: TEST_MOTOR_DONE });
  dispatch(cmdMotorStop());
};

/**
 * Request a sensor reading.
 * The BLE notification listener in bleActions will push data to Redux (BLE_DATA_RECEIVED).
 * This action marks the reading phase as started and sends the command.
 */
export const requestReading = () => async dispatch => {
  dispatch({ type: TEST_READING_START });
  await dispatch(cmdReadSensors());
};

/**
 * Called by PHECResultScreen once sensorData arrives with pH + EC.
 * Saves to test.results and increments testCount.
 */
export const saveTestResult = result => dispatch => {
  dispatch({ type: TEST_RESULTS_RECEIVED, payload: result });
  dispatch({ type: TEST_SAVED });
};
