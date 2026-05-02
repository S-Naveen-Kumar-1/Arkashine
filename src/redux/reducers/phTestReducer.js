// src/redux/reducers/phTestReducer.js
import {
  TEST_RESET,
  TEST_POUR_DETECTED,
  TEST_TIMER_START,
  TEST_TIMER_TICK,
  TEST_TIMER_DONE,
  TEST_SENSOR_START,
  TEST_SENSOR_TICK,
  TEST_SENSOR_DONE,
  TEST_MOTOR_START,
  TEST_MOTOR_TICK,
  TEST_MOTOR_DONE,
  TEST_READING_START,
  TEST_RESULTS_RECEIVED,
  TEST_SAVED,
} from '../../config/actionTypes';

export const MOTOR_DURATION = 60; // seconds — pH/EC mixer
export const TIMER_DURATION = 180; // seconds — soil settle timer
export const SENSOR_DURATION = 30; // seconds — sensor scan countdown

const init = {
  // ── Soil test — pour + settle timer ──────────────────────
  pourDetected: false,
  timerLeft: TIMER_DURATION,
  timerTotal: TIMER_DURATION,
  timerDone: false,

  // ── Soil test — sensor scan phase ─────────────────────────
  sensorRunning: false,
  sensorDone: false,
  sensorLeft: SENSOR_DURATION,
  sensorTotal: SENSOR_DURATION,

  // ── pH/EC test — motor mixer phase ────────────────────────
  motorState: 'idle', // 'idle' | 'running' | 'done'
  motorTimeLeft: MOTOR_DURATION,
  motorStartedAt: null,

  // ── Reading phase (pH/EC after motor) ─────────────────────
  readingState: 'idle', // 'idle' | 'reading' | 'done'
  readingStartedAt: null,

  // ── Final results ─────────────────────────────────────────
  results: null, // { ph, ec, voltage, timestamp, raw, … }
  testCount: 0,
  savedAt: null,
  history: [], // last 100 results
};

export default function testReducer(state = init, action) {
  switch (action.type) {
    case TEST_RESET:
      return {
        ...state,
        pourDetected: false,
        timerLeft: TIMER_DURATION,
        timerDone: false,
        sensorRunning: false,
        sensorDone: false,
        sensorLeft: SENSOR_DURATION,
        motorState: 'idle',
        motorTimeLeft: MOTOR_DURATION,
        motorStartedAt: null,
        readingState: 'idle',
        readingStartedAt: null,
        results: null,
        savedAt: null,
      };

    // ── Pour + settle timer (soil test) ─────────────────────
    case TEST_POUR_DETECTED:
      return { ...state, pourDetected: true };

    case TEST_TIMER_START:
      return {
        ...state,
        timerLeft: TIMER_DURATION,
        timerTotal: TIMER_DURATION,
        timerDone: false,
      };

    case TEST_TIMER_TICK:
      return {
        ...state,
        timerLeft: Math.max(0, state.timerLeft - 1),
      };

    case TEST_TIMER_DONE:
      return { ...state, timerDone: true, timerLeft: 0 };

    // ── Sensor scan phase (soil test) ────────────────────────
    case TEST_SENSOR_START:
      return {
        ...state,
        sensorRunning: true,
        sensorDone: false,
        sensorLeft: SENSOR_DURATION,
        sensorTotal: SENSOR_DURATION,
      };

    case TEST_SENSOR_TICK:
      return {
        ...state,
        sensorLeft: Math.max(0, state.sensorLeft - 1),
      };

    case TEST_SENSOR_DONE:
      return {
        ...state,
        sensorRunning: false,
        sensorDone: true,
        sensorLeft: 0,
      };

    // ── Motor mixer phase (pH/EC test) ──────────────────────
    case TEST_MOTOR_START:
      return {
        ...state,
        motorState: 'running',
        motorTimeLeft: MOTOR_DURATION,
        motorStartedAt: Date.now(),
      };

    case TEST_MOTOR_TICK:
      return { ...state, motorTimeLeft: Math.max(0, state.motorTimeLeft - 1) };

    case TEST_MOTOR_DONE:
      return { ...state, motorState: 'done', motorTimeLeft: 0 };

    // ── Reading phase (pH/EC after motor) ───────────────────
    case TEST_READING_START:
      return {
        ...state,
        readingState: 'reading',
        readingStartedAt: Date.now(),
        results: null,
      };

    // ── Results received from BLE ────────────────────────────
    case TEST_RESULTS_RECEIVED:
      return {
        ...state,
        readingState: 'done',
        sensorDone: true,
        sensorRunning: false,
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
