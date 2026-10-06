const initialState = {
  devices: [],
  loadingDevices: false,
  devicesError: null,
  userDeviceDetails: null,
  selectedProduct: null,
  // Device chosen for the current test run, keyed by testDeviceKey()
  // ('ph_bottle' / 'soilsaathi') — the pH flow continues into a SoiLENZ
  // test, so both can be set at once. See ActiveDeviceBanner.
  activeTestDevices: {},
};

const deviceReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'LOGOUT_REQUEST':
      return { ...initialState };

    case 'GET_USER_DEVICES':
      return { ...state, loadingDevices: true };

    case 'GET_USER_DEVICES_SUCCESS':
      return {
        ...state,
        loadingDevices: false,
        devices: action.payload.data.results,
        userDeviceDetails: action.payload.data,
      };

    case 'GET_USER_DEVICES_FAIL':
      return {
        ...state,
        loadingDevices: false,
        devicesError: action.error,
      };
    case 'SET_SELECTED_PRODUCT':
      return {
        ...state,
        selectedProduct: action.payload,
      };
    case 'SET_ACTIVE_TEST_DEVICE':
      return {
        ...state,
        activeTestDevices: {
          ...state.activeTestDevices,
          [action.payload.key]: action.payload.device,
        },
      };
    case 'CLEAR_ACTIVE_TEST_DEVICES':
      return { ...state, activeTestDevices: {} };
    default:
      return state;
  }
};

export default deviceReducer;
