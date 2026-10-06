// src/utils/testDevices.js
//
// Helpers for picking which of the user's linked devices a test run saves
// its reading to (ActiveDeviceBanner + the two results screens).

const normalize = str =>
  String(str ?? '')
    .toLowerCase()
    .replace(/[\s_]+/g, '')
    .trim();

// Collapses the type aliases used across the app/API to one store key.
// SoiLENZ shows up as 'soilsaathi' or 'soillenz' depending on the source.
export const testDeviceKey = type => {
  const t = normalize(type);
  if (t === 'soilsaathi' || t === 'soillenz') return 'soilsaathi';
  if (t === 'phbottle') return 'ph_bottle';
  return t || null;
};

export const devicesOfType = (devices, type) => {
  const key = testDeviceKey(type);
  if (!key || !Array.isArray(devices)) return [];
  return devices.filter(
    d => testDeviceKey(d?.devise_type ?? d?.device_type) === key,
  );
};

// "Name · DEV-ID" label used wherever the chosen device is shown.
export const deviceLabel = device => {
  if (!device) return '';
  const name = device.name || `Device #${device.id}`;
  const code = device.devise_id || device.serial_no;
  return code ? `${name}  ·  ${code}` : name;
};
