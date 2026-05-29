// src/screens/reports/GenericDeviceDetailScreen.jsx
//
// Reading detail screen for deviceType in: 'ph_bottle', 'atmo_sense', 'soil_life'
// (any device that uses field1…fieldN generic schema keys).
//
// Tabs: Overview | All Fields

import React, { useEffect, useState, useMemo } from 'react';
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
import useTheme from '../hooks/useTheme';
import {
  fetchReadingDetail,
  clearSelectedReading,
  fetchDeviceFieldSchema,
} from '../redux/actions/reportsActions';
import {
  fmt,
  phClass,
  ecClass,
  META_KEYS,
  LevelBadge,
  FieldRow,
  PhGauge,
  SectionCard,
  InfoRow,
  MiniStat,
} from './readingDetailHelpers';

// Per-type accent colours (mirror DEVICE_META in DeviceReadingsScreen)
const DEVICE_META = {
  ph_bottle: { color: '#2563EB', icon: 'water-check-outline' },
  atmo_sense: { color: '#7C3AED', icon: 'weather-partly-cloudy' },
  soil_life: { color: '#D97706', icon: 'leaf-circle-outline' },
};
const FALLBACK_META = { color: '#2563EB', icon: 'water-check-outline' };

const FIELD_COLORS = [
  '#2563EB',
  '#16A34A',
  '#7C3AED',
  '#0891B2',
  '#D97706',
  '#DC2626',
];
const TABS = ['Overview', 'All Fields'];

export default function PhBottleDetailScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const T = theme.colors;

  const {
    readingId,
    deviceId,
    deviceType,
    deviceName,
    reading: passed,
    schema: passedSchema,
  } = route.params;

  const meta = DEVICE_META[deviceType] ?? FALLBACK_META;

  const { selectedReading, selectedReadingLoading } = useSelector(
    s => s.reports,
  );
  const schemaSlot = useSelector(s => s.reports.schemas?.[deviceType]);
  const reduxSchema = schemaSlot?.schema ?? null;
  const schema = passedSchema ?? reduxSchema;

  const reading = selectedReading ?? passed;
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    dispatch(fetchReadingDetail(deviceId, readingId));
    if (!schema && !schemaSlot?.loading) {
      dispatch(fetchDeviceFieldSchema(deviceType));
    }
    return () => dispatch(clearSelectedReading());
  }, [deviceId, readingId, deviceType, dispatch]);

  // ── Derive field lists from schema ─────────────────────────────────────────
  const { dataFields, geoFields } = useMemo(() => {
    if (!schema) return { dataFields: [], geoFields: [] };
    const data = [],
      geo = [];
    Object.entries(schema).forEach(([key, label]) => {
      if (META_KEYS.has(key)) return;
      if (key === 'latitude' || key === 'longitude') geo.push({ key, label });
      else data.push({ key, label });
    });
    return { dataFields: data, geoFields: geo };
  }, [schema]);

  // Detect pH / EC fields by label heuristic
  const phKey = useMemo(
    () =>
      dataFields.find(f => /pH/i.test(f.label) && !/volt/i.test(f.label))?.key,
    [dataFields],
  );
  const ecKey = useMemo(
    () =>
      dataFields.find(
        f => /EC|conductiv/i.test(f.label) && !/volt/i.test(f.label),
      )?.key,
    [dataFields],
  );

  // ── Loading / error states ──────────────────────────────────────────────────
  if (selectedReadingLoading && !reading) {
    return (
      <SafeAreaView style={[s.root, { backgroundColor: T.bg }]}>
        <TopBar
          title={`Reading #${readingId}`}
          onBack={() => navigation.goBack()}
          theme={theme}
        />
        <View style={s.center}>
          <ActivityIndicator size="large" color={meta.color} />
          <Text style={{ color: T.muted, marginTop: 12, fontSize: 13 }}>
            Loading…
          </Text>
        </View>
      </SafeAreaView>
    );
  }
  if (!reading) {
    return (
      <SafeAreaView style={[s.root, { backgroundColor: T.bg }]}>
        <TopBar
          title="Reading"
          onBack={() => navigation.goBack()}
          theme={theme}
        />
        <View style={s.center}>
          <Icon name="alert-circle-outline" size={40} color="#EF4444" />
          <Text style={{ color: T.text, marginTop: 12 }}>
            Could not load reading
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const recordedAt = new Date(reading.created_at);
  // Fallback values if no schema-derived keys found
  const phValue = phKey
    ? Number(reading[phKey] ?? 0)
    : Number(reading.ph ?? reading.ph_value ?? reading.field1 ?? 0);
  const ecValue = ecKey
    ? Number(reading[ecKey] ?? 0)
    : Number(reading.ec ?? reading.ec_value ?? reading.field3 ?? 0);

  const ecLabel = ecKey
    ? dataFields.find(f => f.key === ecKey)?.label ?? 'Conductivity'
    : 'Conductivity';
  const ecCls = ecClass(ecValue);

  // ── Tab renders ─────────────────────────────────────────────────────────────
  const renderTab = () => {
    switch (activeTab) {
      case 0: // Overview
        return (
          <>
            {/* Mini stat row — first 4 data fields */}
            {dataFields.length > 0 && (
              <View style={s.statRow}>
                {dataFields.slice(0, 4).map((f, i) => {
                  const v = reading[f.key];
                  return (
                    <MiniStat
                      key={f.key}
                      label={f.label.split(' ')[0]}
                      value={v != null ? Number(v).toFixed(2) : '—'}
                      color={FIELD_COLORS[i % FIELD_COLORS.length]}
                      T={T}
                    />
                  );
                })}
              </View>
            )}

            {/* Schema loading indicator */}
            {!schema && (
              <View
                style={[
                  s.schemaLoadingBar,
                  {
                    backgroundColor: meta.color + '12',
                    borderColor: meta.color + '30',
                  },
                ]}
              >
                <ActivityIndicator size="small" color={meta.color} />
                <Text style={[s.schemaLoadingText, { color: meta.color }]}>
                  Loading field labels…
                </Text>
              </View>
            )}

            {/* pH gauge — only if a pH-like field detected */}
            {phKey && <PhGauge ph={phValue} T={T} />}

            {/* EC card — only if an EC-like field detected */}
            {ecKey && (
              <SectionCard
                title={ecLabel}
                icon="lightning-bolt-outline"
                color={ecCls.color}
                T={T}
              >
                <View style={s.ecRow}>
                  <Text style={[s.ecVal, { color: ecCls.color }]}>
                    {fmt(ecValue)} dS/m
                  </Text>
                  <LevelBadge {...ecCls} />
                </View>
                <Text style={[s.ecRange, { color: T.muted }]}>
                  Optimal range: 1 – 4 dS/m
                </Text>
              </SectionCard>
            )}

            <SectionCard
              title="Reading info"
              icon="information-outline"
              color={meta.color}
              T={T}
            >
              <InfoRow
                icon="map-marker-outline"
                label="Area"
                value={reading.area_name}
                T={T}
              />
              <InfoRow
                icon="tag-outline"
                label="Tag"
                value={reading.tag}
                T={T}
              />
              <InfoRow
                icon="sprout-outline"
                label="Crop"
                value={reading.crop_type}
                T={T}
              />
              <InfoRow
                icon="clock-outline"
                label="Recorded"
                value={recordedAt.toLocaleString('en-IN')}
                T={T}
                last
              />
            </SectionCard>
          </>
        );

      case 1: // All Fields
        return (
          <>
            {dataFields.length > 0 ? (
              <SectionCard
                title="All fields"
                icon="database-outline"
                color={meta.color}
                T={T}
              >
                {dataFields.map((f, i) => (
                  <FieldRow
                    key={f.key}
                    label={f.label}
                    value={reading[f.key]}
                    color={FIELD_COLORS[i % FIELD_COLORS.length]}
                    T={T}
                    last={i === dataFields.length - 1 && geoFields.length === 0}
                  />
                ))}
                {geoFields.map((f, i) => (
                  <FieldRow
                    key={f.key}
                    label={f.label}
                    value={reading[f.key]}
                    color={T.muted}
                    T={T}
                    last={i === geoFields.length - 1}
                  />
                ))}
              </SectionCard>
            ) : !schema ? (
              <View style={s.center}>
                <ActivityIndicator color={meta.color} />
                <Text style={{ color: T.muted, marginTop: 10, fontSize: 13 }}>
                  Loading field labels…
                </Text>
              </View>
            ) : (
              <View style={s.center}>
                <Icon
                  name="database-off-outline"
                  size={36}
                  color={T.muted}
                  style={{ opacity: 0.3 }}
                />
                <Text style={{ color: T.muted, marginTop: 10, fontSize: 13 }}>
                  No schema fields defined
                </Text>
              </View>
            )}
          </>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[s.root, { backgroundColor: T.bg }]}>
      <StatusBar
        barStyle={T.statusBar ?? 'light-content'}
        backgroundColor={T.bg}
      />
      <TopBar
        title={`Reading #${readingId}`}
        subtitle={`${deviceName} · ${recordedAt.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}`}
        onBack={() => navigation.goBack()}
        theme={theme}
      />

      <View
        style={[
          s.tabBar,
          { backgroundColor: T.card, borderBottomColor: T.border },
        ]}
      >
        {TABS.map((tab, i) => (
          <TouchableOpacity
            key={tab}
            style={[
              s.tab,
              activeTab === i && {
                borderBottomColor: meta.color,
                borderBottomWidth: 2.5,
              },
            ]}
            onPress={() => setActiveTab(i)}
          >
            <Text
              style={[
                s.tabTxt,
                {
                  color: activeTab === i ? meta.color : T.muted,
                  fontWeight: activeTab === i ? '800' : '500',
                },
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {renderTab()}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: Spacing.lg, paddingTop: Spacing.md },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },

  tabBar: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabTxt: { fontSize: 12 },

  statRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },

  schemaLoadingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 8,
    marginBottom: Spacing.md,
  },
  schemaLoadingText: { fontSize: 12, fontWeight: '600' },

  ecRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  ecVal: { fontSize: 22, fontWeight: '900' },
  ecRange: { fontSize: 11 },
});
