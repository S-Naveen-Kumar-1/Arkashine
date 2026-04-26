import {
  LOGIN_FAILED,
  LOGIN_REQUEST,
  LOGIN_SUCCESS,
  LOGOUT_REQUEST,
  REGISTER_FAILED,
  REGISTER_REQUEST,
  REGISTER_SUCCESS,
} from '../../config/actionTypes';

const initialState = {
  loading: false,
  user: null,
  token: null,
  refreshToken: null,
  error: null,
  status: null,
  isLoggedIn: false,
};

export default function authReducer(state = initialState, action) {
  switch (action.type) {
    case 'LOGIN_USER':
      return {
        ...state,
        loading: true,
        error: null,
      };

    case 'LOGIN_USER_SUCCESS':
      return {
        ...state,
        loading: false,
        user: action.payload?.data?.user ?? null,
        token: action.payload?.data?.access ?? null,
        refreshToken: action.payload?.data?.refresh ?? null,
        isLoggedIn: true,
        error: null,
      };

    case 'LOGIN_USER_FAIL':
      return {
        ...state,
        loading: false,
        error:
          action.payload?.error?.response?.data?.detail ||
          action.error?.response?.data?.detail ||
          action.payload?.error?.message ||
          'Login failed',
      };
    default:
      return state;
  }
}
