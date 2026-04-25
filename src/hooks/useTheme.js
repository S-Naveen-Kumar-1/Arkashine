// src/hooks/useTheme.js
import { useSelector } from 'react-redux';
import { lightTheme, darkTheme } from '../theme';

export default function useTheme() {
  const isDark = useSelector(s => s.theme.isDark);
  return isDark ? darkTheme : lightTheme;
}

// src/utils/nutrients.js
export const CROPS = [
  'Rice', 'Wheat', 'Maize', 'Cotton', 'Sugarcane',
  'Soybean', 'Groundnut', 'Sunflower', 'Barley',
  'Jowar', 'Bajra', 'Tomato', 'Onion', 'Potato',
];

export const LANGUAGES = [
  'English', 'Hindi', 'Kannada', 'Tamil',
  'Telugu', 'Marathi', 'Bengali', 'Gujarati',
];

export function getNutrientStatus(nutrient, value) {
  const ranges = {
    ph:  { low: 5.5, high: 7.5 },
    ec:  { low: 0.4, high: 2.0 },
    N:   { low: 140, high: 280 },
    P:   { low: 11,  high: 22  },
    K:   { low: 110, high: 280 },
  };
  const r = ranges[nutrient];
  if (!r || value == null) return { label: 'N/A', color: '#94A3B8', level: 'na' };
  if (value < r.low)  return { label: 'Low',    color: '#EF4444', level: 'low'    };
  if (value > r.high) return { label: 'High',   color: '#F59E0B', level: 'high'   };
  return                     { label: 'Medium', color: '#22C55E', level: 'medium' };
}

export function getRecommendations(results, crop) {
  // Per-day recommendation schedule based on results
  const days = [];
  if (!results) return days;

  const nStatus = getNutrientStatus('N', results.N);
  const pStatus = getNutrientStatus('P', results.P);
  const kStatus = getNutrientStatus('K', results.K);
  const phStatus = getNutrientStatus('ph', results.ph);

  if (nStatus.level === 'low') {
    days.push({ day: 1,  action: 'Apply Urea',           qty: '50 kg/acre', type: 'fertilizer', icon: '🌱' });
    days.push({ day: 21, action: 'Top-dress Urea',        qty: '25 kg/acre', type: 'fertilizer', icon: '🌱' });
  }
  if (pStatus.level === 'low') {
    days.push({ day: 1,  action: 'Apply DAP',             qty: '50 kg/acre', type: 'fertilizer', icon: '⚗️' });
  }
  if (kStatus.level === 'low') {
    days.push({ day: 1,  action: 'Apply MOP',             qty: '25 kg/acre', type: 'fertilizer', icon: '🔷' });
  }
  if (phStatus.level === 'low') {
    days.push({ day: 1,  action: 'Apply Lime (pH fix)',   qty: '200 kg/acre', type: 'amendment', icon: '🪨' });
  }
  days.push({ day: 3,   action: 'Irrigation',             qty: '4 cm depth',  type: 'water',     icon: '💧' });
  days.push({ day: 7,   action: 'Check moisture',         qty: 'Field visit',  type: 'check',     icon: '👁️' });
  days.push({ day: 10,  action: 'Irrigation',             qty: '3 cm depth',  type: 'water',     icon: '💧' });
  days.push({ day: 14,  action: 'Foliar spray (micro)',   qty: '2 L/acre',    type: 'spray',     icon: '🌿' });
  days.push({ day: 21,  action: 'Irrigation',             qty: '4 cm depth',  type: 'water',     icon: '💧' });
  days.push({ day: 30,  action: 'Soil moisture check',    qty: 'Field visit',  type: 'check',     icon: '👁️' });

  return days.sort((a, b) => a.day - b.day);
}

export const REPORT_TRANSLATIONS = {
  English: {
    title: 'Soil Test Report',
    farmer: 'Farmer Name',
    phone: 'Phone',
    crop: 'Crop',
    location: 'Location',
    results: 'Soil Test Results',
    recommendations: 'Recommendations',
    ph: 'pH Value',
    ec: 'EC (mS/cm)',
    nitrogen: 'Nitrogen (N)',
    phosphorus: 'Phosphorus (P)',
    potassium: 'Potassium (K)',
    low: 'Low', medium: 'Medium', high: 'High',
  },
  Hindi: {
    title: 'मृदा परीक्षण रिपोर्ट',
    farmer: 'किसान का नाम',
    phone: 'फोन',
    crop: 'फसल',
    location: 'स्थान',
    results: 'मृदा परीक्षण परिणाम',
    recommendations: 'सिफारिशें',
    ph: 'पीएच मान',
    ec: 'ईसी (mS/cm)',
    nitrogen: 'नाइट्रोजन (N)',
    phosphorus: 'फास्फोरस (P)',
    potassium: 'पोटेशियम (K)',
    low: 'कम', medium: 'मध्यम', high: 'अधिक',
  },
  Kannada: {
    title: 'ಮಣ್ಣು ಪರೀಕ್ಷಾ ವರದಿ',
    farmer: 'ರೈತನ ಹೆಸರು',
    phone: 'ಫೋನ್',
    crop: 'ಬೆಳೆ',
    location: 'ಸ್ಥಳ',
    results: 'ಮಣ್ಣು ಪರೀಕ್ಷಾ ಫಲಿತಾಂಶಗಳು',
    recommendations: 'ಶಿಫಾರಸುಗಳು',
    ph: 'pH ಮೌಲ್ಯ',
    ec: 'EC (mS/cm)',
    nitrogen: 'ಸಾರಜನಕ (N)',
    phosphorus: 'ರಂಜಕ (P)',
    potassium: 'ಪೊಟ್ಯಾಶಿಯಮ್ (K)',
    low: 'ಕಡಿಮೆ', medium: 'ಮಧ್ಯಮ', high: 'ಹೆಚ್ಚು',
  },
};