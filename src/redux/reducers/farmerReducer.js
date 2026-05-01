// src/redux/reducers/farmerReducer.js
import { FARMER_SAVE, FARMER_LOCATION_SET } from '../../config/actionTypes';

const initFarmer = {
  name: '',
  phone: '',
  crop: '',
  location: null,
};

export function farmerReducer(state = initFarmer, action) {
  switch (action.type) {
    case FARMER_SAVE:
      return { ...state, ...action.payload };
    case FARMER_LOCATION_SET:
      return { ...state, location: action.payload };
    default:
      return state;
  }
}

export default farmerReducer;
