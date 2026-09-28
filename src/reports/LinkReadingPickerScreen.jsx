// src/reports/LinkReadingPickerScreen.jsx
//
// "Pick a reading to link" screen for SoiLENZ <-> PHBottle linking (either
// direction). Backed by the GET side of the link endpoints, which returns
// readings from ALL of the user's devices of the other type — unlinked ones
// plus the current link (`is_current`) — each tagged with its `device`, and a
// `devices` list used here for the device filter chips. Readings already
// linked elsewhere are excluded server-side, so a pick can't hit the
// "already linked" 409.
//
// Route params:
//   side      'ph_bottle'  → this is a SoiLENZ reading picking a PHBottle reading
//             'soil_lens'  → this is a PHBottle reading picking a SoiLENZ reading
//   deviceId, readingId    the reading doing the linking
//   onPick(candidate)      called with the chosen row ({ id, device, ph, ec, … })

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  FlatList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Radius, Spacing } from '../theme';
import { TopBar } from '../components/common';
import useTheme from '../hooks/useTheme';
import { fetchPhBottleLinkCandidates } from '../redux/actions/soilsaathiActions';
import { fetchSoilLensLinkCandidates } from '../redux/actions/phTestActions';

const SIDE_META = {
  ph_bottle: { label: 'PHBottle', color: '#2563EB', icon: 'water-check-outline', fetch: fetchPhBottleLinkCandidates },
  soil_lens: { label: 'SoiLENZ', color: '#16A34A', icon: 'flask-outline', fetch: fetchSoilLensLinkCandidates },
};

export const deviceLabel = device =>
  device
    ? `${device.name || `Device #${device.id}`}${device.devise_id || device.serial_no ? ` (${device.devise_id || device.serial_no})` : ''}`
    : '—';

export default function LinkReadingPickerScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const T = theme.colors;
  const { side, deviceId, readingId, onPick } = route.params;
  const meta = SIDE_META[side] || SIDE_META.ph_bottle;
  const BORDER = T.cardBorder ?? T.border;

  const [devices, setDevices] = useState([]);
  const [filterDeviceId, setFilterDeviceId] = useState(null);
  const [results, setResults] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const load = useCallback(
    async (nextPage, deviceFilter, append) => {
      append ? setLoadingMore(true) : setLoading(true);
      setError(null);
      try {
        const res = await dispatch(
          meta.fetch(deviceId, readingId, { filterDeviceId: deviceFilter, page: nextPage }),
        );
        const data = res?.payload?.data ?? {};
        setDevices(data.devices ?? []);
        setResults(prev => (append ? [...prev, ...(data.results ?? [])] : data.results ?? []));
        setPage(nextPage);
        setHasMore(!!data.next);
      } catch (e) {
        const detail = e?.error?.response?.data?.detail ?? e?.response?.data?.detail;
        setError(detail || `Could not load ${meta.label} readings.`);
      } finally {
        append ? setLoadingMore(false) : setLoading(false);
      }
    },
    [dispatch, meta, deviceId, readingId],
  );

  useEffect(() => {
    load(1, filterDeviceId, false);
  }, [load, filterDeviceId]);

  // Search filters the loaded rows by tag / crop / area / device client-side,
  // same as DeviceReadingsScreen's pick mode.
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return results;
    return results.filter(r =>
      [r.tag, r.crop_type, r.area_name, r.device?.name, r.device?.devise_id, r.device?.serial_no]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(q)),
    );
  }, [results, searchQuery]);

  const handlePick = item => {
    onPick?.(item);
    navigation.goBack();
  };

  const renderRow = ({ item }) => {
    const date = item.created_at ? new Date(item.created_at) : null;
    return (
      <TouchableOpacity
        style={[
          s.row,
          { backgroundColor: T.card, borderColor: item.is_current ? meta.color : BORDER },
        ]}
        onPress={() => handlePick(item)}
        activeOpacity={0.82}
      >
        <View style={s.rowMain}>
          <View style={s.rowTitleLine}>
            <Text style={[s.rowTitle, { color: T.text }]}>
              #{item.id} — pH {item.ph ?? '—'}, EC {item.ec ?? '—'}
            </Text>
            {item.is_current ? (
              <View style={[s.currentPill, { backgroundColor: meta.color }]}>
                <Text style={s.currentPillText}>Linked</Text>
              </View>
            ) : null}
          </View>
          <View style={s.rowDeviceLine}>
            <Icon name={meta.icon} size={12} color={meta.color} />
            <Text style={[s.rowDevice, { color: meta.color }]} numberOfLines={1}>
              {deviceLabel(item.device)}
            </Text>
          </View>
          <Text style={[s.rowMeta, { color: T.muted }]} numberOfLines={1}>
            {[
              item.tag ? `Tag: ${item.tag}` : null,
              item.crop_type ? `Crop: ${item.crop_type}` : null,
              item.area_name || null,
              date ? date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
        <Icon name="chevron-right" size={18} color={T.muted} />
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={s.center}>
          <ActivityIndicator size="large" color={meta.color} />
        </View>
      );
    }
    return (
      <View style={s.center}>
        <Icon name="link-variant-off" size={40} color={T.muted} />
        <Text style={[s.emptyTitle, { color: T.text }]}>
          {devices.length === 0 ? `No ${meta.label} device found` : `No ${meta.label} readings available`}
        </Text>
        <Text style={[s.emptySub, { color: T.muted }]}>
          {devices.length === 0
            ? `You don't have a ${meta.label} device registered on your account.`
            : searchQuery
            ? 'No readings match your search.'
            : `Every ${meta.label} reading is already linked to another reading.`}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[s.root, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={T.statusBar ?? 'light-content'} backgroundColor={T.bg} />
      <TopBar title={`Link ${meta.label} Reading`} onBack={() => navigation.goBack()} theme={theme} />

      <View style={[s.searchWrap, { borderColor: BORDER }]}>
        <Icon name="magnify" size={16} color={T.muted} />
        <TextInput
          style={[s.searchInput, { color: T.text }]}
          placeholder="Search by device, tag or crop…"
          placeholderTextColor={T.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
      </View>

      {/* Device filter — only worth showing when the user has more than one */}
      {devices.length > 1 && (
        <View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.chipsRow}
          >
            {[{ id: null, label: 'All devices' }, ...devices.map(d => ({ id: d.id, label: `${deviceLabel(d)} · ${d.available_count}` }))].map(chip => {
              const active = filterDeviceId === chip.id;
              return (
                <TouchableOpacity
                  key={String(chip.id)}
                  onPress={() => setFilterDeviceId(chip.id)}
                  style={[
                    s.chip,
                    active
                      ? { backgroundColor: meta.color, borderColor: meta.color }
                      : { backgroundColor: T.card, borderColor: BORDER },
                  ]}
                >
                  <Text style={[s.chipText, { color: active ? '#fff' : T.text }]}>{chip.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {error && (
        <View style={[s.errorBar, { backgroundColor: '#EF444418', borderColor: '#EF4444' }]}>
          <Icon name="alert-circle-outline" size={14} color="#EF4444" />
          <Text style={{ color: '#EF4444', fontSize: 12, flex: 1 }}>{error}</Text>
          <TouchableOpacity onPress={() => load(1, filterDeviceId, false)}>
            <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 12 }}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={loading ? [] : filtered}
        keyExtractor={item => item.id.toString()}
        renderItem={renderRow}
        contentContainerStyle={s.list}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={
          hasMore && !loading ? (
            <TouchableOpacity
              onPress={() => load(page + 1, filterDeviceId, true)}
              disabled={loadingMore}
              style={[s.moreBtn, { borderColor: BORDER }]}
            >
              {loadingMore ? (
                <ActivityIndicator size="small" color={meta.color} />
              ) : (
                <Text style={{ color: T.text, fontWeight: '700', fontSize: 13 }}>Load more</Text>
              )}
            </TouchableOpacity>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  list: { padding: Spacing.lg, paddingTop: Spacing.sm, flexGrow: 1 },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 13, padding: 0 },

  chipsRow: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm, gap: 8 },
  chip: { borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { fontSize: 12, fontWeight: '700' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  rowMain: { flex: 1, minWidth: 0 },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowTitle: { fontSize: 14, fontWeight: '800', flexShrink: 1 },
  rowDeviceLine: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  rowDevice: { fontSize: 12, fontWeight: '700', flexShrink: 1 },
  rowMeta: { fontSize: 11, marginTop: 3 },
  currentPill: { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  currentPillText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  moreBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },

  errorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: Radius.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    padding: Spacing.sm,
  },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 15, fontWeight: '700', marginTop: 12, textAlign: 'center' },
  emptySub: { fontSize: 12, marginTop: 6, textAlign: 'center' },
});
