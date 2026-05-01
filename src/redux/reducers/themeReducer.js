// src/redux/reducers/themeReducer.js
import { THEME_TOGGLE } from '../../config/actionTypes';

const initTheme = { isDark: false };

export function themeReducer(state = initTheme, action) {
  switch (action.type) {
    case THEME_TOGGLE:
      return { isDark: !state.isDark };
    default:
      return state;
  }
}

export default themeReducer;
