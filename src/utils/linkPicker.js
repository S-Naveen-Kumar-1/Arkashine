// src/utils/linkPicker.js
//
// Shared "pick a reading to link" flow used by the SoiLENZ <-> PHBottle
// linking UI (either direction). Opens LinkReadingPickerScreen, which lists
// linkable readings from ALL of the user's devices of the target type (with a
// device filter when there's more than one) and leaves out readings already
// linked to something else.

const SIDE_BY_DEVICE_TYPE = {
  ph_bottle: 'ph_bottle',   // a SoiLENZ reading picking a PHBottle reading
  soilsaathi: 'soil_lens',  // a PHBottle reading picking a SoiLENZ reading
};

export function openReadingPicker({
  navigation,
  deviceType,
  deviceId,
  readingId,
  onPick,
}) {
  navigation.navigate('LinkReadingPickerScreen', {
    side: SIDE_BY_DEVICE_TYPE[deviceType] ?? deviceType,
    deviceId,
    readingId,
    onPick,
  });
}
