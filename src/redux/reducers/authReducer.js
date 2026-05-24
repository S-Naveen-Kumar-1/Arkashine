const init = {
  loading: false,
  user: null,
  token: null,
  refreshToken: null,
  error: null,
  status: null,
  isLoggedIn: false,
};

export default function authReducer(state = init, action) {
  switch (action.type) {
    case 'LOGIN_USER':
      return {
        ...state,
        loading: true,
        error: null,
      };

    case 'LOGIN_USER_SUCCESS': {
      const data = action.payload?.data ?? action.payload;

      return {
        ...state,
        loading: false,
        isLoggedIn: true,
        token: data?.access ?? null,
        refreshToken: data?.refresh ?? null,
        user: data?.user ?? null,
        error: null,
      };
    }

    case 'LOGIN_USER_FAIL':
      return {
        ...state,
        loading: false,
        isLoggedIn: false,
        token: null,
        refreshToken: null,
        error:
          action.error?.response?.data?.detail ??
          action.error?.message ??
          'Login failed',
      };

    // RESTORE LOGIN FROM ASYNCSTORAGE
    case 'RESTORE_LOGIN':
      return {
        ...state,
        isLoggedIn: true,
        token: action.payload?.token ?? null,
        refreshToken: action.payload?.refreshToken ?? null,
        user: action.payload?.user ?? null,
        loading: false,
        error: null,
      };

    case 'REGISTER_USER':
      return {
        ...state,
        loading: true,
        error: null,
      };

    case 'REGISTER_USER_SUCCESS':
      const data = action.payload?.data ?? action.payload;
      return {
        ...state,
        loading: false,
        isLoggedIn: true,
        token: data?.access ?? null,
        refreshToken: data?.refresh ?? null,
        user: data?.user ?? null,
        error: null,
      };

    case 'REGISTER_USER_FAIL':
      return {
        ...state,
        loading: false,
        error:
          action.error?.response?.data?.detail ??
          action.error?.message ??
          'Registration failed',
      };

    case 'AUTH_TOKEN_REFRESHED':
      return {
        ...state,
        token: action.payload?.token ?? state.token,
      };

    case 'LOGOUT_REQUEST':
      return { ...init };

    case 'CLEAR_AUTH_ERROR':
      return {
        ...state,
        error: null,
      };

    default:
      return state;
  }
}
