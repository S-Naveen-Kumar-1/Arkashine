// src/store/reducers/authReducer.js
import {
  LOGIN_REQUEST,
  LOGIN_SUCCESS,
  LOGIN_FAILED,
  REGISTER_REQUEST,
  REGISTER_SUCCESS,
  REGISTER_FAILED,
  LOGOUT_REQUEST,
} from '../../config/actionTypes';

const initialState = {
  loading: false,
  user: null,
  token: null,
  error: null,
  status: null,
};

export default function authReducer(state = initialState, action) {
  switch (action.type) {
    case LOGIN_REQUEST:
    case REGISTER_REQUEST:
      return { ...state, loading: true, error: null, status: null };

    case LOGIN_SUCCESS:
    case REGISTER_SUCCESS:
      return {
        ...state,
        loading: false,
        status: 'success',
        user: action.payload.user,
        token: action.payload.token,
        error: null,
      };

    case LOGIN_FAILED:
    case REGISTER_FAILED:
      return {
        ...state,
        loading: false,
        status: 'failed',
        error: action.payload,
      };

    case LOGOUT_REQUEST:
      return { ...initialState };

    default:
      return state;
  }
}
