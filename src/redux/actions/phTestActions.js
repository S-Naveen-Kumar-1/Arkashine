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
import { cmdPHMotorStart, cmdPHMotorStop, cmdReadSensors } from './bleActions';
import { MOTOR_DURATION } from '../reducers/phTestReducer';

export const testReset = () => ({ type: TEST_RESET });

let _motorInterval = null;

export const startMotor = () => async dispatch => {
  clearInterval(_motorInterval);

  // Send command to hardware
  await dispatch(cmdPHMotorStart(MOTOR_DURATION));

  dispatch({ type: TEST_MOTOR_START });

  _motorInterval = setInterval(() => {
    dispatch({ type: TEST_MOTOR_TICK });
  }, 1000);

  setTimeout(() => {
    clearInterval(_motorInterval);
    dispatch({ type: TEST_MOTOR_DONE });
    dispatch(cmdPHMotorStop());
  }, MOTOR_DURATION * 1000);
};

export const stopMotorEarly = () => dispatch => {
  clearInterval(_motorInterval);
  dispatch({ type: TEST_MOTOR_DONE });
};

export const saveTestResult = result => dispatch => {
  dispatch({ type: TEST_RESULTS_RECEIVED, payload: result });
  dispatch({ type: TEST_SAVED });
};

export function createSoilReading({}) {
  return {
    type: '',
    payload: {
      request: {
        url: '/api/mobile/devices/',
        method: 'POST',
      },
    },
  };
}
