// src/screens/soilpartner/FarmersListScreen.jsx

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Spacing, Radius, Shadow } from '../theme';
import useTheme from '../hooks/useTheme';
import { TopBar } from '../components/common';
import { fetchFarmers } from '../redux/actions/soilPartnerActions';

const PRIMARY = '#16A34A';

const STATUS_META = {
  registered: {
    label: 'Registered',
    color: '#2563EB',
    icon: 'account-check-outline',
  },
  re_registered: {
    label: 'Re-Registered',
    color: '#7C3AED',
    icon: 'account-reactivate-outline',
  },
  sample_collected: {
    label: 'Sample Collected',
    color: '#0891B2',
    icon: 'test-tube',
  },
  testing_done: {
    label: 'Testing Done',
    color: '#D97706',
    icon: 'flask-check-outline',
  },
  report_delivered: {
    label: 'Report Delivered',
    color: '#16A34A',
    icon: 'file-check-outline',
  },
};

function statusMeta(status) {
  return (
    STATUS_META[status] ?? {
      label: status ?? '—',
      color: '#94A3B8',
      icon: 'help-circle-outline',
    }
  );
}

// ─── Avatar — shows photo if available, else initials ────────────────────────
function Avatar({ name, color, size = 48, imageUri }) {
  const initials = (name ?? 'F')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (imageUri) {
    return (
      <Image
        source={{ uri: imageUri }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2,
          borderColor: color + '50',
        }}
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color + '20',
        borderColor: color + '40',
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Text style={{ color, fontSize: size * 0.34, fontWeight: '800' }}>
        {initials}
      </Text>
    </View>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const m = statusMeta(status);
  return (
    <View
      style={[
        sb.wrap,
        { backgroundColor: m.color + '18', borderColor: m.color + '40' },
      ]}
    >
      <Icon name={m.icon} size={9} color={m.color} />
      <Text style={[sb.text, { color: m.color }]}>{m.label}</Text>
    </View>
  );
}
const sb = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  text: { fontSize: 9, fontWeight: '800' },
});

// ─── Farmer card ──────────────────────────────────────────────────────────────
function FarmerCard({ farmer, T, onPress }) {
  const m = statusMeta(farmer.status);

  return (
    <TouchableOpacity
      style={[
        fc.card,
        { backgroundColor: T.card, borderColor: T.border ?? T.cardBorder },
      ]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      {/* Left color accent */}
      <View style={[fc.accent, { backgroundColor: m.color }]} />

      <View style={fc.inner}>
        {/* Avatar */}
        <Avatar
          name={farmer.farmer_name}
          color={m.color}
          size={52}
          imageUri={farmer.farmer_image}
        />

        {/* Info */}
        <View style={fc.info}>
          {/* Name + status */}
          <View style={fc.nameRow}>
            <Text style={[fc.name, { color: T.text }]} numberOfLines={1}>
              {farmer.farmer_name}
            </Text>
            <StatusBadge status={farmer.status} />
          </View>

          {/* Phone + location */}
          <View style={fc.metaRow}>
            <Icon name="phone-outline" size={11} color={T.muted} />
            <Text style={[fc.meta, { color: T.muted }]}>
              {farmer.phone ?? '—'}
            </Text>
            <Text style={[fc.metaDivider, { color: T.muted }]}>·</Text>
            <Icon name="map-marker-outline" size={11} color={T.muted} />
            <Text style={[fc.meta, { color: T.muted }]} numberOfLines={1}>
              {[farmer.village, farmer.district].filter(Boolean).join(', ')}
            </Text>
          </View>

          {/* Chips */}
          <View style={fc.chipRow}>
            {farmer.crop ? (
              <View
                style={[
                  fc.chip,
                  {
                    backgroundColor: PRIMARY + '10',
                    borderColor: PRIMARY + '30',
                  },
                ]}
              >
                <Icon name="sprout-outline" size={9} color={PRIMARY} />
                <Text style={[fc.chipTxt, { color: PRIMARY }]}>
                  {farmer.crop}
                </Text>
              </View>
            ) : null}
            {farmer.season_display ?? farmer.season ? (
              <View
                style={[
                  fc.chip,
                  {
                    backgroundColor: T.bg,
                    borderColor: T.border ?? T.cardBorder,
                  },
                ]}
              >
                <Icon name="calendar-outline" size={9} color={T.muted} />
                <Text style={[fc.chipTxt, { color: T.muted }]}>
                  {farmer.season_display ?? farmer.season}
                </Text>
              </View>
            ) : null}
            {farmer.land_area ? (
              <View
                style={[
                  fc.chip,
                  { backgroundColor: '#F59E0B10', borderColor: '#F59E0B30' },
                ]}
              >
                <Icon name="map-outline" size={9} color="#F59E0B" />
                <Text style={[fc.chipTxt, { color: '#F59E0B' }]}>
                  {farmer.land_area} ac
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <Icon
          name="chevron-right"
          size={16}
          color={T.muted}
          style={{ flexShrink: 0 }}
        />
      </View>
    </TouchableOpacity>
  );
}
const fc = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  accent: { height: 3 },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: 12,
  },
  info: { flex: 1, gap: 5 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: { fontSize: 15, fontWeight: '800', flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { fontSize: 11 },
  metaDivider: { fontSize: 11, marginHorizontal: 2 },
  chipRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  chipTxt: { fontSize: 9, fontWeight: '600' },
});

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ filtered, T, onAdd }) {
  return (
    <View style={es.wrap}>
      <Icon
        name={filtered ? 'magnify-close' : 'account-group-outline'}
        size={56}
        color={T.muted}
        style={{ opacity: 0.3 }}
      />
      <Text style={[es.title, { color: T.text }]}>
        {filtered ? 'No matching farmers' : 'No farmers yet'}
      </Text>
      <Text style={[es.sub, { color: T.muted }]}>
        {filtered
          ? 'Try adjusting your search or filter'
          : 'Register your first farmer to get started'}
      </Text>
      {!filtered && (
        <TouchableOpacity
          style={[es.btn, { backgroundColor: PRIMARY }]}
          onPress={onAdd}
        >
          <Icon name="account-plus-outline" size={16} color="#fff" />
          <Text style={es.btnTxt}>Add Farmer</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
const es = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 52, gap: 10 },
  title: { fontSize: 16, fontWeight: '700' },
  sub: { fontSize: 13, textAlign: 'center', maxWidth: 240, lineHeight: 18 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 4,
  },
  btnTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },
});

// ─── Status filter pills ──────────────────────────────────────────────────────
const STATUS_FILTERS = [
  { key: 'all', label: 'All', color: PRIMARY },
  { key: 'registered', label: 'Registered', color: '#2563EB' },
  { key: 're_registered', label: 'Re-Reg', color: '#7C3AED' },
  { key: 'sample_collected', label: 'Sampled', color: '#0891B2' },
  { key: 'testing_done', label: 'Tested', color: '#D97706' },
  { key: 'report_delivered', label: 'Delivered', color: '#16A34A' },
];

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function FarmersListScreen({ navigation }) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const T = theme.colors;

  const {
    farmers = [],
    farmersCount = 0,
    farmersLoading,
  } = useSelector(s => s.soilPartner ?? {});

  const [search, setSearch] = useState('');
  const [activeStatus, setActiveStatus] = useState('all');

  useEffect(() => {
    dispatch(fetchFarmers());
  }, [dispatch]);

  const filtered = farmers.filter(f => {
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      f.farmer_name?.toLowerCase().includes(q) ||
      f.phone?.includes(q) ||
      f.village?.toLowerCase().includes(q) ||
      f.district?.toLowerCase().includes(q) ||
      f.crop?.toLowerCase().includes(q);
    const matchStatus = activeStatus === 'all' || f.status === activeStatus;
    return matchSearch && matchStatus;
  });

  // Summary counts per status
  const counts = farmers.reduce((acc, f) => {
    acc[f.status] = (acc[f.status] ?? 0) + 1;
    return acc;
  }, {});

  const renderHeader = () => (
    <View>
      {/* Summary strip */}
      {farmers.length > 0 && (
        <View
          style={[
            s.summaryStrip,
            { backgroundColor: T.card, borderColor: T.border ?? T.cardBorder },
          ]}
        >
          {Object.entries(STATUS_META).map(([key, meta]) =>
            counts[key] ? (
              <View key={key} style={s.summaryItem}>
                <Text style={[s.summaryNum, { color: meta.color }]}>
                  {counts[key]}
                </Text>
                <Text
                  style={[s.summaryLbl, { color: T.muted }]}
                  numberOfLines={1}
                >
                  {meta.label.split(' ')[0]}
                </Text>
              </View>
            ) : null,
          )}
        </View>
      )}

      {/* Search bar */}
      <View
        style={[
          s.searchBar,
          {
            backgroundColor: T.inputBg ?? T.card,
            borderColor: T.cardBorder ?? T.border ?? '#E2E8F0',
          },
        ]}
      >
        <Icon name="magnify" size={20} color={T.muted} />
        <TextInput
          style={[s.searchInput, { color: T.text }]}
          placeholder="Search name, phone, village, crop…"
          placeholderTextColor={T.muted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearch('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="close-circle" size={16} color={T.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Status filter pills — horizontal scroll */}
      <View style={s.filterRow}>
        {STATUS_FILTERS.map(f => {
          const active = activeStatus === f.key;
          const cnt = f.key === 'all' ? farmers.length : counts[f.key] ?? 0;
          return (
            <TouchableOpacity
              key={f.key}
              style={[
                s.filterPill,
                {
                  backgroundColor: active ? f.color : T.card,
                  borderColor: active
                    ? f.color
                    : T.border ?? T.cardBorder ?? '#E2E8F0',
                },
              ]}
              onPress={() => setActiveStatus(f.key)}
            >
              <Text style={[s.filterTxt, { color: active ? '#fff' : T.text }]}>
                {f.label}
              </Text>
              {cnt > 0 && (
                <View
                  style={[
                    s.filterCount,
                    {
                      backgroundColor: active
                        ? 'rgba(255,255,255,0.25)'
                        : f.color + '20',
                    },
                  ]}
                >
                  <Text
                    style={[
                      s.filterCountTxt,
                      { color: active ? '#fff' : f.color },
                    ]}
                  >
                    {cnt}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Result count + add button */}
      <View style={s.countRow}>
        <Text style={[s.countTxt, { color: T.muted }]}>
          {filtered.length === farmersCount
            ? `${farmersCount} farmers`
            : `${filtered.length} of ${farmersCount}`}
        </Text>
        <TouchableOpacity
          style={[
            s.addBtn,
            { backgroundColor: PRIMARY + '15', borderColor: PRIMARY + '40' },
          ]}
          onPress={() => navigation.navigate('AddFarmerScreen')}
        >
          <Icon name="plus" size={14} color={PRIMARY} />
          <Text style={[s.addBtnTxt, { color: PRIMARY }]}>Add Farmer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[s.root, { backgroundColor: T.bg }]}>
      <StatusBar
        barStyle={T.statusBar ?? 'dark-content'}
        backgroundColor={T.bg}
      />

      <TopBar
        title="My Farmers"
        subtitle={`${farmersCount} registered`}
        onBack={() => navigation.goBack()}
        theme={theme}
        rightAction={{
          icon: 'account-plus-outline',
          onPress: () => navigation.navigate('AddFarmerScreen'),
          color: PRIMARY,
        }}
      />

      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={s.list}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          farmersLoading ? (
            <ActivityIndicator
              color={PRIMARY}
              style={{ paddingVertical: 40 }}
            />
          ) : (
            <EmptyState
              filtered={search.length > 0 || activeStatus !== 'all'}
              T={T}
              onAdd={() => navigation.navigate('AddFarmerScreen')}
            />
          )
        }
        renderItem={({ item }) => (
          <FarmerCard
            farmer={item}
            T={T}
            onPress={() =>
              navigation.navigate('FarmerDetailScreen', {
                farmerId: item.id,
                farmer: item,
              })
            }
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={farmersLoading}
            onRefresh={() => dispatch(fetchFarmers())}
            tintColor={PRIMARY}
            colors={[PRIMARY]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  list: { padding: Spacing.lg, paddingTop: Spacing.sm },

  // Summary strip
  summaryStrip: {
    flexDirection: 'row',
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    justifyContent: 'space-around',
    ...Shadow.sm,
  },
  summaryItem: { alignItems: 'center', gap: 2 },
  summaryNum: { fontSize: 20, fontWeight: '900' },
  summaryLbl: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 46,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  searchInput: { flex: 1, fontSize: 14 },

  // Filter pills
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: Spacing.md,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  filterTxt: { fontSize: 11, fontWeight: '700' },
  filterCount: { borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  filterCountTxt: { fontSize: 9, fontWeight: '800' },

  // Count row
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  countTxt: { fontSize: 12 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  addBtnTxt: { fontSize: 12, fontWeight: '700' },
});
