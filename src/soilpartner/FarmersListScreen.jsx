// src/screens/soilpartner/FarmersListScreen.jsx

import React, { useEffect, useState, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Spacing, Radius, Shadow } from '../theme';
import useTheme from '../hooks/useTheme';
import { TopBar } from '../components/common';
import { fetchFarmers } from '../redux/actions/soilPartnerActions';

const PRIMARY = '#16A34A';

const STATUS_META = {
  registered: { label: 'Registered', color: '#2563EB', bg: '#DBEAFE' },
  re_registered: { label: 'Re-Registered', color: '#7C3AED', bg: '#EDE9FE' },
  sample_collected: {
    label: 'Sample Collected',
    color: '#0891B2',
    bg: '#CFFAFE',
  },
  testing_done: { label: 'Testing Done', color: '#D97706', bg: '#FEF3C7' },
  report_delivered: {
    label: 'Report Delivered',
    color: '#16A34A',
    bg: '#DCFCE7',
  },
};

function statusMeta(status) {
  return (
    STATUS_META[status] ?? {
      label: status ?? '—',
      color: '#94A3B8',
      bg: '#F1F5F9',
    }
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const m = statusMeta(status);
  return (
    <View style={[sb.wrap, { backgroundColor: m.bg }]}>
      <Text style={[sb.text, { color: m.color }]}>{m.label}</Text>
    </View>
  );
}
const sb = StyleSheet.create({
  wrap: { borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 },
  text: { fontSize: 10, fontWeight: '800' },
});

// ─── Avatar initials ──────────────────────────────────────────────────────────
function Avatar({ name, color, size = 42 }) {
  const initials = (name ?? 'F')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  return (
    <View
      style={[
        av.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color + '20',
          borderColor: color + '40',
        },
      ]}
    >
      <Text style={[av.text, { color, fontSize: size * 0.34 }]}>
        {initials}
      </Text>
    </View>
  );
}
const av = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    flexShrink: 0,
  },
  text: { fontWeight: '800' },
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
      {/* Left accent */}
      <View style={[fc.accent, { backgroundColor: m.color }]} />

      <View style={fc.row}>
        <Avatar name={farmer.farmer_name} color={m.color} />

        <View style={fc.info}>
          <View style={fc.nameRow}>
            <Text style={[fc.name, { color: T.text }]} numberOfLines={1}>
              {farmer.farmer_name}
            </Text>
            <StatusBadge status={farmer.status} />
          </View>

          <View style={fc.metaRow}>
            <MaterialCommunityIcons
              name="phone-outline"
              size={11}
              color={T.muted ?? T.textSub}
            />
            <Text style={[fc.meta, { color: T.muted ?? T.textSub }]}>
              {farmer.phone}
            </Text>
          </View>

          <View style={fc.metaRow}>
            <MaterialCommunityIcons
              name="map-marker-outline"
              size={11}
              color={T.muted ?? T.textSub}
            />
            <Text
              style={[fc.meta, { color: T.muted ?? T.textSub }]}
              numberOfLines={1}
            >
              {farmer.village}, {farmer.district}, {farmer.state}
            </Text>
          </View>

          <View style={fc.chipRow}>
            <View
              style={[
                fc.chip,
                {
                  backgroundColor: T.bg,
                  borderColor: T.border ?? T.cardBorder,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="sprout-outline"
                size={10}
                color={PRIMARY}
              />
              <Text style={[fc.chipText, { color: PRIMARY }]}>
                {farmer.crop}
              </Text>
            </View>
            <View
              style={[
                fc.chip,
                {
                  backgroundColor: T.bg,
                  borderColor: T.border ?? T.cardBorder,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="calendar-outline"
                size={10}
                color={T.muted ?? T.textSub}
              />
              <Text style={[fc.chipText, { color: T.muted ?? T.textSub }]}>
                {farmer.season_display ?? farmer.season}
              </Text>
            </View>
            <View
              style={[
                fc.chip,
                {
                  backgroundColor: T.bg,
                  borderColor: T.border ?? T.cardBorder,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="map-outline"
                size={10}
                color={T.muted ?? T.textSub}
              />
              <Text style={[fc.chipText, { color: T.muted ?? T.textSub }]}>
                {farmer.land_area} acres
              </Text>
            </View>
          </View>
        </View>

        <MaterialCommunityIcons
          name="chevron-right"
          size={18}
          color={T.muted ?? T.textSub}
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: 12,
  },
  info: { flex: 1, gap: 4 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: { fontSize: 15, fontWeight: '800', flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { fontSize: 11 },
  chipRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  chipText: { fontSize: 10, fontWeight: '600' },
});

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ filtered, T, onAdd }) {
  return (
    <View style={es.wrap}>
      <MaterialCommunityIcons
        name={filtered ? 'magnify-close' : 'account-off-outline'}
        size={52}
        color={T.muted ?? T.textSub}
        style={{ opacity: 0.3 }}
      />
      <Text style={[es.title, { color: T.text }]}>
        {filtered ? 'No matching farmers' : 'No farmers yet'}
      </Text>
      <Text style={[es.sub, { color: T.muted ?? T.textSub }]}>
        {filtered
          ? 'Try adjusting your search or filter'
          : 'Register your first farmer to get started'}
      </Text>
      {!filtered && (
        <TouchableOpacity
          style={[es.btn, { backgroundColor: PRIMARY }]}
          onPress={onAdd}
        >
          <MaterialCommunityIcons name="account-plus" size={16} color="#fff" />
          <Text style={es.btnText}>Add Farmer</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
const es = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  title: { fontSize: 16, fontWeight: '700' },
  sub: { fontSize: 13, textAlign: 'center', maxWidth: 240 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 4,
  },
  btnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});

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
    const matchSearch =
      !search.trim() ||
      f.farmer_name?.toLowerCase().includes(search.toLowerCase()) ||
      f.phone?.includes(search) ||
      f.village?.toLowerCase().includes(search.toLowerCase()) ||
      f.district?.toLowerCase().includes(search.toLowerCase()) ||
      f.crop?.toLowerCase().includes(search.toLowerCase());

    const matchStatus = activeStatus === 'all' || f.status === activeStatus;
    return matchSearch && matchStatus;
  });

  const statusFilters = [
    { key: 'all', label: 'All' },
    { key: 'registered', label: 'Registered' },
    { key: 're_registered', label: 'Re-Reg' },
    { key: 'sample_collected', label: 'Sampled' },
    { key: 'testing_done', label: 'Tested' },
    { key: 'report_delivered', label: 'Delivered' },
  ];

  const renderHeader = () => (
    <View>
      {/* Search bar */}
      <View
        style={[
          s.searchBar,
          {
            backgroundColor: T.inputBg ?? T.card,
            borderColor: T.cardBorder ?? T.border,
          },
        ]}
      >
        <MaterialCommunityIcons
          name="magnify"
          size={20}
          color={T.muted ?? T.textSub}
        />
        <TextInput
          style={[s.searchInput, { color: T.text }]}
          placeholder="Search by name, phone, village, crop…"
          placeholderTextColor={T.muted ?? T.textSub}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {search.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearch('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons
              name="close-circle"
              size={16}
              color={T.muted ?? T.textSub}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Status filter pills */}
      <View style={s.filterRow}>
        {statusFilters.map(f => {
          const active = activeStatus === f.key;
          const m = f.key === 'all' ? { color: PRIMARY } : statusMeta(f.key);
          return (
            <TouchableOpacity
              key={f.key}
              style={[
                s.filterPill,
                {
                  backgroundColor: active ? m.color : T.card,
                  borderColor: active ? m.color : T.border ?? T.cardBorder,
                },
              ]}
              onPress={() => setActiveStatus(f.key)}
            >
              <Text style={[s.filterText, { color: active ? '#fff' : T.text }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Count */}
      <View style={s.countRow}>
        <Text style={[s.countText, { color: T.muted ?? T.textSub }]}>
          {filtered.length} of {farmersCount} farmers
        </Text>
        <TouchableOpacity
          style={[
            s.addSmallBtn,
            { backgroundColor: PRIMARY + '15', borderColor: PRIMARY + '40' },
          ]}
          onPress={() => navigation.navigate('AddFarmerScreen')}
        >
          <MaterialCommunityIcons name="plus" size={14} color={PRIMARY} />
          <Text style={[s.addSmallText, { color: PRIMARY }]}>Add</Text>
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
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={s.list}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          farmersLoading ? (
            <ActivityIndicator
              color={PRIMARY}
              style={{ paddingVertical: 32 }}
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

  filterRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: Spacing.md,
  },
  filterPill: {
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterText: { fontSize: 11, fontWeight: '700' },

  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  countText: { fontSize: 12 },
  addSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  addSmallText: { fontSize: 12, fontWeight: '700' },
});
