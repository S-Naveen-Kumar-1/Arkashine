// src/redux/reducers/testReducer.js
import {
  TEST_RESET,
  TEST_MOTOR_START,
  TEST_MOTOR_TICK,
  TEST_MOTOR_DONE,
  TEST_READING_START,
  TEST_RESULTS_RECEIVED,
  TEST_SAVED,
} from '../../config/actionTypes';

export const MOTOR_DURATION = 60; // seconds

const init = {
  // Motor phase
  motorState: 'idle', // 'idle' | 'running' | 'done'
  motorTimeLeft: MOTOR_DURATION,
  motorStartedAt: null,

  // Reading phase
  readingState: 'idle', // 'idle' | 'reading' | 'done'
  readingStartedAt: null,

  // Final results
  results: null, // { ph, ec, voltage, timestamp, raw }
  testCount: 0, // increments every TEST_SAVED
  savedAt: null,

  // History log
  history: [], // array of result objects
};

export default function testReducer(state = init, action) {
  switch (action.type) {
    case TEST_RESET:
      return {
        ...state,
        motorState: 'idle',
        motorTimeLeft: MOTOR_DURATION,
        motorStartedAt: null,
        readingState: 'idle',
        readingStartedAt: null,
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

    case TEST_READING_START:
      return {
        ...state,
        readingState: 'reading',
        readingStartedAt: Date.now(),
        results: null,
      };

    case TEST_RESULTS_RECEIVED:
      return {
        ...state,
        readingState: 'done',
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

    default:
      return state;
  }
}
