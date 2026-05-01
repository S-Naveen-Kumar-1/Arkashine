// src/redux/reducers/reportReducer.js
import { REPORT_SAVE, REPORT_LANGUAGE_SET } from '../../config/actionTypes';

const initReport = {
  saved: null,
  language: 'English',
  printStatus: null,
};

export function reportReducer(state = initReport, action) {
  switch (action.type) {
    case REPORT_SAVE:
      return { ...state, saved: action.payload };
    case REPORT_LANGUAGE_SET:
      return { ...state, language: action.payload };
    default:
      return state;
  }
}

export default reportReducer;
