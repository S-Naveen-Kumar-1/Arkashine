// src/components/ActiveFarmerBanner.jsx
//
// "Testing for <farmer>" strip for the Soil Lens / PHBottle test flows.
// Soil partners only — renders nothing for any other user type, so their
// flows are unchanged.
//
// Reads the active farmer from state.soilPartner (set either by "Start Test
// for <farmer>" on FarmerDetailScreen, or by the picker in this banner) — the
// same value the results screens send as farmer_id when saving.
//
// Props:
//   allowSelect  show a "Select farmer (optional)" row when none is chosen
//                (used on the screen right before the test starts:
//                PourScreen / CalibrationGateScreen)
//   canChange    show Change / Remove (false on results screens — the reading
//                has already been saved for this farmer)

import React, { useMemo, useState } from 'react';
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
import SearchFilterBar from './SearchFilterBar';
import TestSelectionRow from './TestSelectionRow';
import {
  fetchFarmers,
  setActiveFarmer,
  clearActiveFarmer,
} from '../redux/actions/soilPartnerActions';

const ACCENT = '#16A34A';

export default function ActiveFarmerBanner({ allowSelect = false, canChange = true }) {
  const dispatch = useDispatch();
  const T = useTheme().colors;
  const BORDER = T.cardBorder ?? T.border;

  const isSoilPartner = useSelector(s => s.auth?.user?.user_type === 'soil_partner');
  const {
    activeFarmerId,
    activeFarmerName,
    activeFarmerPhone,
    activeFarmerSource,
    farmers = [],
    farmersLoading,
  } = useSelector(s => s.soilPartner ?? {});

  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return farmers;
    return farmers.filter(f =>
      [f.farmer_name, f.phone, f.village, f.district]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(q)),
    );
  }, [farmers, query]);

  if (!isSoilPartner) return null;
  if (!activeFarmerId && !allowSelect) return null;

  const openPicker = () => {
    setQuery('');
    setPickerOpen(true);
    dispatch(fetchFarmers());
  };

  const pick = farmer => {
    // Keep the original source when changing mid-flow, so a farmer chosen on
    // the farmer's page still follows that page's clear rule.
    dispatch(
      setActiveFarmer(
        farmer.id,
        farmer.farmer_name,
        farmer.phone,
        activeFarmerSource ?? 'test_flow',
      ),
    );
    setPickerOpen(false);
  };

  const removeFarmer = () => {
    dispatch(clearActiveFarmer());
    setPickerOpen(false);
  };

  return (
    <>
      {activeFarmerId ? (
        <TestSelectionRow
          icon="account-check-outline"
          color={ACCENT}
          label="Testing for farmer"
          value={`${activeFarmerName || `Farmer #${activeFarmerId}`}${
            activeFarmerPhone ? `  ·  ${activeFarmerPhone}` : ''
          }`}
          actionLabel={canChange ? 'Change' : null}
          onPress={canChange ? openPicker : undefined}
        />
      ) : (
        <TestSelectionRow
          icon="account-plus-outline"
          color={ACCENT}
          label="Farmer · optional"
          placeholder="No farmer — test without one"
          actionLabel="Select"
          onPress={openPicker}
        />
      )}

      <Modal
        visible={pickerOpen}
        animationType="slide"
        onRequestClose={() => setPickerOpen(false)}
      >
        <SafeAreaView style={[s.modalRoot, { backgroundColor: T.bg }]}>
          <View style={s.modalHeader}>
            <Text style={[s.modalTitle, { color: T.text }]}>Select Farmer</Text>
            <TouchableOpacity onPress={() => setPickerOpen(false)} hitSlop={10}>
              <Icon name="close" size={22} color={T.text} />
            </TouchableOpacity>
          </View>

          <SearchFilterBar
            query={query}
            onQueryChange={setQuery}
            placeholder="Search by name, phone or village…"
            collapsible={false}
            style={{ marginHorizontal: Spacing.lg, marginBottom: Spacing.sm }}
          />

          <TouchableOpacity
            onPress={removeFarmer}
            style={[s.row, { backgroundColor: T.card, borderColor: BORDER }]}
          >
            <Icon name="account-off-outline" size={18} color={T.muted} />
            <Text style={[s.rowName, { color: T.text, flex: 1 }]}>Test without a farmer</Text>
            {!activeFarmerId ? <Icon name="check" size={18} color={ACCENT} /> : null}
          </TouchableOpacity>

          {farmersLoading && farmers.length === 0 ? (
            <ActivityIndicator style={{ marginTop: 30 }} color={ACCENT} />
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={f => String(f.id)}
              contentContainerStyle={{ paddingBottom: Spacing.xl }}
              ListEmptyComponent={
                <Text style={[s.empty, { color: T.muted }]}>
                  {query ? 'No farmers match your search.' : 'No farmers added yet.'}
                </Text>
              }
              renderItem={({ item }) => {
                const selected = item.id === activeFarmerId;
                return (
                  <TouchableOpacity
                    onPress={() => pick(item)}
                    style={[
                      s.row,
                      { backgroundColor: T.card, borderColor: selected ? ACCENT : BORDER },
                    ]}
                  >
                    <Icon name="account-outline" size={18} color={ACCENT} />
                    <View style={{ flex: 1 }}>
                      <Text style={[s.rowName, { color: T.text }]} numberOfLines={1}>
                        {item.farmer_name}
                      </Text>
                      <Text style={[s.rowMeta, { color: T.muted }]} numberOfLines={1}>
                        {[item.phone, item.village, item.district].filter(Boolean).join(' · ')}
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

const s = StyleSheet.create({

  modalRoot: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  modalTitle: { fontSize: 18, fontWeight: '800' },
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
