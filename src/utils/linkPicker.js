// src/utils/linkPicker.js
//
// Shared "pick a reading to link" flow used by the SoiLENZ <-> PHBottle
// linking UI (either direction): finds the user's device(s) of the target
// type, then opens DeviceReadingsScreen in pick mode (search by tag/crop,
// tap a row to choose) instead of navigating to that reading's detail page.

import { Alert } from 'react-native';
import { fetchReportDevices } from '../redux/actions/reportsActions';

const DEVICE_LABELS = {
  soilsaathi: 'SoiLENZ',
  ph_bottle: 'PHBottle',
};

export async function openReadingPicker({
  navigation,
  dispatch,
  deviceType,
  onPick,
}) {
  const label = DEVICE_LABELS[deviceType] ?? deviceType;

  const openFor = device => {
    navigation.navigate('DeviceReadingsScreen', {
      deviceId: device.id,
      deviceName: device.name,
      deviceType: device.devise_type,
      device,
      pickMode: true,
      onPick,
    });
  };

  try {
    const res = await dispatch(fetchReportDevices(deviceType));
    const candidates = res?.payload?.data?.results ?? [];

    if (candidates.length === 0) {
      Alert.alert(
        `No ${label} device found`,
        `You don't have a ${label} device registered on your account.`,
      );
      return;
    }
    if (candidates.length === 1) {
      openFor(candidates[0]);
      return;
    }
    Alert.alert(
      `Choose ${label} device`,
      'You have more than one — pick which device to browse.',
      [
        ...candidates.map(device => ({
          text: device.name || `Device #${device.id}`,
          onPress: () => openFor(device),
        })),
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  } catch (e) {
    Alert.alert('Error', `Could not load your ${label} devices. Please try again.`);
  }
}
