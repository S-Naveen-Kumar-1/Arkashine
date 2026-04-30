// src/store/reducers/testReducer.js
import {
  TEST_RESET,
  TEST_POUR_DETECTED,
  TEST_TIMER_START,
  TEST_TIMER_TICK,
  TEST_TIMER_DONE,
  TEST_SENSOR_START,
  TEST_SENSOR_TICK,
  TEST_SENSOR_DONE,
  TEST_RESULTS_RECEIVED,
} from '../../config/actionTypes';

const TIMER_TOTAL = 180;
const SENSOR_TOTAL = 30;

const initTest = {
  step: 'intro', // intro | pour | timer | sensor | results
  pourDetected: false,
  timerTotal: TIMER_TOTAL,
  timerLeft: TIMER_TOTAL,
  timerRunning: false,
  timerDone: false,
  sensorTotal: SENSOR_TOTAL,
  sensorLeft: SENSOR_TOTAL,
  sensorRunning: false,
  sensorDone: false,
  livePH: null,
  liveEC: null,
  results: null,
};

export function testReducer(state = initTest, action) {
  switch (action.type) {
    case TEST_RESET:
      return { ...initTest };
    case TEST_POUR_DETECTED:
      return { ...state, pourDetected: true, step: 'pour' };
    case TEST_TIMER_START:
      return { ...state, timerRunning: true, step: 'timer' };
    case TEST_TIMER_TICK:
      return { ...state, timerLeft: Math.max(0, state.timerLeft - 1) };
    case TEST_TIMER_DONE:
      return { ...state, timerRunning: false, timerDone: true, step: 'sensor' };
    case TEST_SENSOR_START:
      return { ...state, sensorRunning: true };
    case TEST_SENSOR_TICK: {
      const payload = action.payload || {};
      return {
        ...state,
        sensorLeft: Math.max(0, state.sensorLeft - 1),
        livePH: payload.ph ?? state.livePH,
        liveEC: payload.ec ?? state.liveEC,
      };
    }
    case TEST_SENSOR_DONE:
      return {
        ...state,
        sensorRunning: false,
        sensorDone: true,
        step: 'results',
      };
    case TEST_RESULTS_RECEIVED:
      return { ...state, results: action.payload, step: 'results' };
    default:
      return state;
  }
}

export default testReducer;
