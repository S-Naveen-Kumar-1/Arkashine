const initialState = {
  devices: [],
  loadingDevices: false,
  devicesError: null,
  userDeviceDetails: null,
  selectedProduct: null,
};

const deviceReducer = (state = initialState, action) => {
  switch (action.type) {
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
    default:
      return state;
  }
};

export default deviceReducer;
