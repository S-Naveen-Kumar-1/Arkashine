// src/config/products.js

export const PRODUCTS = [
  {
    id: 1,
    name: 'Soil Maps',

    shortName: 'SoilMaps',
    device_type: 'soil_map',
    icon: 'map-marker-radius',
    color: '#22C55E',
    description:
      'Real-time soil health mapping with GPS-tagged data points across your farmland.',
    category: 'Mapping',
    tag: 'Precision Agriculture',
    active: true,
    route: 'SoilMaps',
    stats: { tests: 142, lastUsed: '2d ago' },
  },

  {
    id: 2,
    name: 'Ph Bottle',
    shortName: 'PhBottle',
    device_type: 'ph_bottle',
    icon: 'flask-outline',
    color: '#F59E0B',
    description:
      'Portable pH testing kit with reagent-based colorimetric analysis for field use.',
    category: 'Testing',
    tag: 'Field Kit',
    active: true,
    route: 'BLEScanScreen',
    stats: { tests: 87, lastUsed: '1d ago' },
  },

  {
    id: 3,
    name: 'SOILENZ',
    shortName: 'SOILENZ',
    device_type: 'soilsaathi',
    icon: 'microscope',
    color: '#22C55E',
    description:
      'Advanced BLE soil analyzer measuring pH, EC, N, P, K with instant recommendations.',
    category: 'Analysis',
    tag: 'Smart Device',
    active: true,
    isMain: true,
    route: 'BLEScanScreen',
    stats: { tests: 213, lastUsed: 'Today' },
  },

  {
    id: 4,
    name: 'SoilSparsh',
    shortName: 'SoilSparsh',
    device_type: 'atmo_sense',
    icon: 'hand-back-right',
    color: '#4ADE80',
    description:
      'Haptic feedback soil sensor — feel the soil health through vibration patterns.',
    category: 'Sensing',
    tag: 'Innovative',
    active: true,
    route: 'SoilSparsh',
    stats: { tests: 54, lastUsed: '3d ago' },
  },

  {
    id: 5,
    name: 'SOILIFE',
    shortName: 'SOILIFE',
    device_type: 'soil_life',
    icon: 'bacteria',
    color: '#34D399',
    description:
      'Microbial activity monitoring for soil health — measure living soil ecosystem.',
    category: 'Biology',
    tag: 'Soil Biology',
    active: false,
    route: null,
    stats: { tests: 0, lastUsed: 'Coming soon' },
  },

  {
    id: 6,
    name: 'Leaf Lenz',
    shortName: 'LeafLenz',
    device_type: 'leaf_lenz',
    icon: 'leaf',
    color: '#86EFAC',
    description:
      'AI-powered leaf disease detection using smartphone camera — instant diagnosis.',
    category: 'Plant Health',
    tag: 'AI Vision',
    active: true,
    route: 'LeafLenz',
    stats: { tests: 76, lastUsed: '5h ago' },
  },

  {
    id: 7,
    name: 'AI Agronomy',
    shortName: 'AIAgronomy',
    device_type: 'ai_agronomy',
    icon: 'robot-outline',
    color: '#818CF8',
    description:
      'GPT-powered agronomist chatbot — ask crop questions and get expert advice 24/7.',
    category: 'AI',
    tag: 'AI Advisor',
    active: true,
    route: 'AIAgronomy',
    stats: { tests: 331, lastUsed: 'Today' },
  },

  {
    id: 8,
    name: 'Crop Recommend',
    shortName: 'CropRec',
    device_type: 'crop_recommend',
    icon: 'sprout',
    color: '#FCD34D',
    description:
      'Data-driven crop selection based on soil analysis, climate, and market pricing.',
    category: 'Planning',
    tag: 'Smart Planning',
    active: true,
    route: 'CropRec',
    stats: { tests: 128, lastUsed: '1d ago' },
  },

  {
    id: 9,
    name: 'Carbon Monitor',
    shortName: 'CarbonMon',
    device_type: 'carbon_monitor',
    icon: 'recycle',
    color: '#6EE7B7',
    description:
      'Track soil carbon sequestration to earn carbon credits and improve soil health.',
    category: 'Environment',
    tag: 'Carbon Credits',
    active: false,
    route: null,
    stats: { tests: 0, lastUsed: 'Coming soon' },
  },

  {
    id: 10,
    name: 'Water Testing',
    shortName: 'WaterTest',
    device_type: 'water_testing',
    icon: 'water',
    color: '#38BDF8',
    description:
      'Irrigation water quality analysis — pH, TDS, hardness, and contaminant detection.',
    category: 'Water',
    tag: 'Water Quality',
    active: true,
    route: 'WaterTest',
    stats: { tests: 95, lastUsed: '2d ago' },
  },
];

export const CATEGORIES = [
  'All',
  'Analysis',
  'Mapping',
  'Testing',
  'AI',
  'Water',
  'Biology',
  'Sensing',
  'Planning',
  'Environment',
  'Plant Health',
];

export const QUICK_STATS = [
  { label: 'Total Tests', value: '1,126', icon: '🧪', color: '#22C55E' },
  { label: 'Fields Mapped', value: '24', icon: '🗺️', color: '#3B82F6' },
  { label: 'Alerts', value: '3', icon: '🔔', color: '#F59E0B' },
  { label: 'Reports', value: '18', icon: '📋', color: '#A78BFA' },
];

export const mapProductsWithDevices = (products, deviceResponse) => {
  const devices = deviceResponse?.results || deviceResponse || [];

  const normalize = str =>
    str
      ?.toLowerCase()
      ?.replace(/[\s_]+/g, '')
      ?.trim();

  if (!devices || devices.length === 0) {
    return products.map(product => ({
      ...product,
      active: false,
      locked: true,
      device: null,
      deviceId: null,
      deviceType: null,
    }));
  }

  return products.map(product => {
    const matchedDevice = devices.find(
      d => normalize(d.devise_type) === normalize(product.device_type),
    );

    const isUnlocked = !!matchedDevice;

    return {
      ...product,

      active: isUnlocked,
      locked: !isUnlocked,

      deviceId: matchedDevice?.id ?? null,
      deviceType: matchedDevice?.devise_type ?? null,

      device: matchedDevice || null,
    };
  });
};
