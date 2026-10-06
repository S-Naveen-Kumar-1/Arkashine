// src/components/ActiveDeviceBanner.jsx
//
// "Saving to device <name · id>" strip for the Soil Lens / PHBottle test
// flows — the device-side twin of ActiveFarmerBanner, shown to every user.
//
// The chosen device lives in state.userDevices.activeTestDevices[key] and is
// what the results screens send as device_id when saving the reading.
//
//   1 linked device of the type   → selected automatically
//   2+ linked devices             → user picks one
//
// Props:
//   deviceType   'ph_bottle' | 'soilsaathi' (aliases accepted) — which
//                flow's device to show
//   allowSelect  load devices, auto-select and show the picker row (used on
//                the screen right before the test starts: PourScreen /
//                CalibrationGateScreen)
//   canChange    show Change (false on results screens — the reading has
//                already been saved to this device)
//
// Ref:
//   open()            opens the picker
//   ensureSelected()  true when a device is chosen (or none is needed);
//                     otherwise opens the picker and returns false — the
//                     Start Test buttons call it before starting.

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Radius, Spacing } from '../theme';
import useTheme from '../hooks/useTheme';
import TestSelectionRow from './TestSelectionRow';
import { getUserDevices, setActiveTestDevice } from '../redux/actions';
import {
  testDeviceKey,
  devicesOfType,
  deviceLabel,
} from '../utils/testDevices';

const ACCENT = '#2563EB';
const WARN = '#D97706';

function ActiveDeviceBanner(
  { deviceType, allowSelect = false, canChange = true },
  ref,
) {
  const dispatch = useDispatch();
  const T = useTheme().colors;
  const BORDER = T.cardBorder ?? T.border;

  const key = testDeviceKey(deviceType);
  const devices = useSelector(s => s.userDevices?.devices || []);
  const loading = useSelector(s => s.userDevices?.loadingDevices);
  const active = useSelector(s => s.userDevices?.activeTestDevices?.[key]);

  const candidates = useMemo(
    () => devicesOfType(devices, deviceType),
    [devices, deviceType],
  );

  const [pickerOpen, setPickerOpen] = useState(false);

  useImperativeHandle(
    ref,
    () => ({
      open: () => setPickerOpen(true),
      ensureSelected: () => {
        if (active || candidates.length <= 1) return true;
        setPickerOpen(true);
        return false;
      },
    }),
    [active, candidates.length],
  );

  useEffect(() => {
    if (allowSelect) dispatch(getUserDevices());
  }, [allowSelect, dispatch]);

  // Auto-select: drop a choice that's no longer linked, and take the only
  // device when there's just one.
  useEffect(() => {
    if (!allowSelect || !key || candidates.length === 0) return;
    const stillLinked = active && candidates.some(d => d.id === active.id);
    if (stillLinked) return;
    const pick = candidates.length === 1 ? candidates[0] : null;
    if (pick || active) dispatch(setActiveTestDevice(key, pick));
  }, [allowSelect, key, candidates, active, dispatch]);

  if (!key) return null;
  if (!active && !(allowSelect && candidates.length > 1)) return null;

  const changeable = allowSelect && canChange && candidates.length > 1;

  const pick = device => {
    dispatch(setActiveTestDevice(key, device));
    setPickerOpen(false);
  };

  return (
    <>
      {active ? (
        <TestSelectionRow
          icon="chip"
          color={ACCENT}
          label="Saving to device"
          value={deviceLabel(active)}
          actionLabel={changeable ? 'Change' : null}
          onPress={changeable ? () => setPickerOpen(true) : undefined}
        />
      ) : (
        <TestSelectionRow
          icon="chip"
          color={WARN}
          label="Device · required"
          placeholder={`Choose 1 of ${candidates.length} linked devices`}
          required
          actionLabel="Select"
          onPress={() => setPickerOpen(true)}
        />
      )}

      <Modal
        visible={pickerOpen}
        animationType="slide"
        onRequestClose={() => setPickerOpen(false)}
      >
        <SafeAreaView style={[s.modalRoot, { backgroundColor: T.bg }]}>
          <View style={s.modalHeader}>
            <Text style={[s.modalTitle, { color: T.text }]}>Select Device</Text>
            <TouchableOpacity onPress={() => setPickerOpen(false)} hitSlop={10}>
              <Icon name="close" size={22} color={T.text} />
            </TouchableOpacity>
          </View>
          <Text style={[s.modalSub, { color: T.muted }]}>
            The test reading will be saved to the device you choose.
          </Text>

          {loading && candidates.length === 0 ? (
            <ActivityIndicator style={{ marginTop: 30 }} color={ACCENT} />
          ) : (
            <FlatList
              data={candidates}
              keyExtractor={d => String(d.id)}
              contentContainerStyle={{ paddingBottom: Spacing.xl }}
              ListEmptyComponent={
                <Text style={[s.empty, { color: T.muted }]}>No linked devices.</Text>
              }
              renderItem={({ item }) => {
                const selected = item.id === active?.id;
                return (
                  <TouchableOpacity
                    onPress={() => pick(item)}
                    style={[
                      s.row,
                      { backgroundColor: T.card, borderColor: selected ? ACCENT : BORDER },
                    ]}
                  >
                    <Icon name="chip" size={18} color={ACCENT} />
                    <View style={{ flex: 1 }}>
                      <Text style={[s.rowName, { color: T.text }]} numberOfLines={1}>
                        {item.name || `Device #${item.id}`}
                      </Text>
                      <Text style={[s.rowMeta, { color: T.muted }]} numberOfLines={1}>
                        {[
                          item.devise_id && `ID: ${item.devise_id}`,
                          item.serial_no && `S/N: ${item.serial_no}`,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    </View>
                    {selected ? <Icon name="check" size={18} color={ACCENT} /> : null}
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </SafeAreaView>
      </Modal>
    </>
  );
}

export default forwardRef(ActiveDeviceBanner);

const s = StyleSheet.create({

  modalRoot: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalSub: {
    fontSize: 12,
    paddingHorizontal: Spacing.lg,
    marginTop: 4,
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  rowName: { fontSize: 14, fontWeight: '700' },
  rowMeta: { fontSize: 11, marginTop: 2 },
  empty: { textAlign: 'center', marginTop: 30, fontSize: 13 },
});
