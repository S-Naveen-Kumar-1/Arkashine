// src/screens/reports/ReportsScreen.jsx
//
// Screen 1: Shows stat summary + list of user devices.
// Tapping a device card → DeviceReadingsScreen

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Radius, Spacing, Shadow } from '../theme';
import { TopBar } from '../components/common';
import { fetchReportDevices } from '../redux/actions/reportsActions';
import useTheme from '../hooks/useTheme';

// Maps devise_type → icon + colour
const DEVICE_META = {
  soilsaathi: { icon: 'flask-outline', color: '#16A34A', label: 'SoiLENZ' },
  ph_bottle: {
    icon: 'water-check-outline',
    color: '#2563EB',
    label: 'PHBottle',
  },
  atmo_sense: {
    icon: 'weather-partly-cloudy',
    color: '#7C3AED',
    label: 'AtmoSense',
  },
  soil_life: {
    icon: 'leaf-circle-outline',
    color: '#D97706',
    label: 'SoilLIFE',
  },
};

function DeviceCard({ device, onPress, T }) {
  const meta = DEVICE_META[device.devise_type] || DEVICE_META.soilsaathi;
  const count = device.api_used ?? 0;

  return (
    <TouchableOpacity
      style={[s.deviceCard, { backgroundColor: T.card, borderColor: T.border }]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      {/* Left accent bar */}
      <View style={[s.accent, { backgroundColor: meta.color }]} />

      {/* Icon */}
      <View
        style={[
          s.iconWrap,
          {
            backgroundColor: meta.color + '18',
            borderColor: meta.color + '40',
          },
        ]}
      >
        <Icon name={meta.icon} size={26} color={meta.color} />
      </View>

      {/* Info */}
      <View style={s.cardInfo}>
        <Text style={[s.cardName, { color: T.text }]} numberOfLines={1}>
          {device.name}
        </Text>
        <Text style={[s.cardType, { color: T.textSub }]}>
          {meta.label} · {device.serial_no}
        </Text>
        <View style={s.chipRow}>
          <View
            style={[
              s.chip,
              { backgroundColor: T.cardAlt ?? T.card, borderColor: T.border },
            ]}
          >
            <Icon name="map-marker-outline" size={10} color={T.muted} />
            <Text style={[s.chipText, { color: T.muted }]}>
              {device.land} acres
            </Text>
          </View>
          <View
            style={[
              s.chip,
              { backgroundColor: T.cardAlt ?? T.card, borderColor: T.border },
            ]}
          >
            <Icon name="calendar-outline" size={10} color={T.muted} />
            <Text style={[s.chipText, { color: T.muted }]}>
              {new Date(device.purchase_date).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </Text>
          </View>
        </View>
      </View>

      {/* Reading count badge */}
      <View style={s.rightCol}>
        <View
          style={[
            s.countBadge,
            count > 0
              ? {
                  backgroundColor: meta.color + '18',
                  borderColor: meta.color + '50',
                }
              : { backgroundColor: T.cardAlt ?? T.card, borderColor: T.border },
          ]}
        >
          <Text
            style={[s.countNum, { color: count > 0 ? meta.color : T.muted }]}
          >
            {count}
          </Text>
          <Text
            style={[s.countLbl, { color: count > 0 ? meta.color : T.muted }]}
          >
            readings
          </Text>
        </View>
        <Icon
          name="chevron-right"
          size={18}
          color={T.muted}
          style={{ marginTop: 8 }}
        />
      </View>
    </TouchableOpacity>
  );
}

export default function ReportsScreen({ navigation }) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const T = theme.colors;
  const devices = useSelector(s => s.userDevices?.devices);

  console.log('Devices in ReportsScreen:', devices);

  console.log(
    'Total readings:',
    devices.reduce((sum, d) => sum + (d.api_used ?? 0), 0),
  );
  const totalReadings = devices.reduce((sum, d) => sum + (d.api_used ?? 0), 0);
  const activeDevices = devices.length;

  return (
    <SafeAreaView style={[s.root, { backgroundColor: T.bg }]}>
      <StatusBar
        barStyle={T.statusBar ?? 'light-content'}
        backgroundColor={T.bg}
      />

      <TopBar
        title="Reports"
        subtitle="Device readings & analytics"
        onBack={() => navigation.goBack()}
        theme={theme}
      />

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Summary stats ──────────────────────────────────────── */}
        {devices?.length > 0 && (
          <View style={s.statsRow}>
            {/* <StatCard
            icon="devices"
            label="Total devices"
            value={devicesMeta.count || devices.length}
            color="#7C3AED"
            T={T}
          /> */}
            <StatCard
              icon="check-circle-outline"
              label="Active"
              value={activeDevices}
              color="#16A34A"
              T={T}
            />
            <StatCard
              icon="database-outline"
              label="Readings"
              value={totalReadings}
              color="#2563EB"
              T={T}
            />
          </View>
        )}

        {/* ── Device list ─────────────────────────────────────────── */}
        {devices?.length > 0 && (
          <Text style={[s.sectionTitle, { color: T.textSub }]}>
            Your devices
          </Text>
        )}

        {devices?.length > 0 ? (
          devices.map(device => (
            <DeviceCard
              key={device.id}
              device={device}
              T={T}
              onPress={() =>
                navigation.navigate('DeviceReadingsScreen', {
                  deviceId: device.id,
                  deviceName: device.name,
                  deviceType: device.devise_type,
                  device,
                })
              }
            />
          ))
        ) : (
          <View style={[s.empty]}>
            <Icon name="access-point-off" size={60} color={T.muted} />
            <Text style={[s.emptyTitle, { color: T.text }]}>
              No Devices Linked
            </Text>
            <Text style={[s.emptySub, { color: T.muted }]}>
              You haven't linked any devices yet.
            </Text>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color, T }) {
  return (
    <View
      style={[s.statCard, { backgroundColor: T.card, borderColor: T.border }]}
    >
      <View style={[s.statIcon, { backgroundColor: color + '18' }]}>
        <Icon name={icon} size={16} color={color} />
      </View>
      <Text style={[s.statValue, { color: T.text }]}>{value}</Text>
      <Text style={[s.statLabel, { color: T.muted }]}>{label}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: Spacing.lg, paddingTop: Spacing.md },

  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    alignItems: 'center',
    ...Shadow.sm,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statValue: { fontSize: 20, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 10, fontWeight: '600', textAlign: 'center' },

  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },

  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  accent: { width: 4, alignSelf: 'stretch' },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    margin: Spacing.md,
    flexShrink: 0,
  },
  cardInfo: { flex: 1, paddingVertical: Spacing.md },
  cardName: { fontSize: 15, fontWeight: '800', marginBottom: 3 },
  cardType: { fontSize: 12, marginBottom: 6 },
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
  chipText: { fontSize: 10, fontWeight: '600' },

  rightCol: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  countBadge: {
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    minWidth: 56,
  },
  countNum: { fontSize: 18, fontWeight: '900' },
  countLbl: { fontSize: 9, fontWeight: '600', marginTop: 1 },

  center: { alignItems: 'center', paddingVertical: Spacing.xl },
  loadingText: { marginTop: 10, fontSize: 13 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  empty: { alignItems: 'center', paddingVertical: Spacing.xl * 2 },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginTop: Spacing.md },
  emptySub: { fontSize: 13, marginTop: 6, textAlign: 'center' },
});
