// src/screens/reports/SoilLifeDetailScreen.jsx
//
// Detail screen for SoilLIFE device (gas + environmental sensors)
// Tabs: Overview | All Fields
// Data: labeled_fields from API (CO₂, Methane, Ammonia, Nitrous Oxide, Temp, Humidity, etc.)

import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Svg, { Path, Text as SvgText, G, Rect, Circle } from 'react-native-svg';
import { Radius, Spacing, Shadow } from '../theme';
import { TopBar } from '../components/common';
import useTheme from '../hooks/useTheme';
import {
  fetchReadingDetail,
  clearSelectedReading,
  fetchDeviceFieldSchema,
} from '../redux/actions/reportsActions';
import {
  SectionCard,
  InfoRow,
  MiniStat,
  CONTENT_W,
  SCREEN_W,
} from './readingDetailHelpers';

const DEVICE_COLOR = '#D97706'; // amber for SoilLIFE

// ─── Gas field metadata — icon, unit, ranges, color ─────────────────────────
const GAS_META = {
  'CO₂ (ppm)': {
    icon: 'molecule-co2',
    color: '#2563EB',
    unit: 'ppm',
    low: 400,
    high: 1000,
    max: 5000,
  },
  'Methane (ppm)': {
    icon: 'fire',
    color: '#EF4444',
    unit: 'ppm',
    low: 300,
    high: 1000,
    max: 10000,
  },
  'Ammonia (ppm)': {
    icon: 'chemical-weapon',
    color: '#7C3AED',
    unit: 'ppm',
    low: 5,
    high: 25,
    max: 5000,
  },
  'Nitrous Oxide (ppm)': {
    icon: 'cloud-outline',
    color: '#0891B2',
    unit: 'ppm',
    low: 0.1,
    high: 1,
    max: 10,
  },
  'Temperature (°C)': {
    icon: 'thermometer',
    color: '#F97316',
    unit: '°C',
    low: 10,
    high: 35,
    max: 60,
  },
  'Humidity (%)': {
    icon: 'water-percent',
    color: '#06B6D4',
    unit: '%',
    low: 30,
    high: 70,
    max: 100,
  },
  'Atmospheric Pressure (hPa)': {
    icon: 'gauge',
    color: '#84CC16',
    unit: 'hPa',
    low: 980,
    high: 1013,
    max: 1250,
  },
  'Microbial Content (%)': {
    icon: 'bacteria-outline',
    color: '#EC4899',
    unit: '%',
    low: 10,
    high: 60,
    max: 100,
  },
};
const DEFAULT_GAS = {
  icon: 'flask-outline',
  color: '#6B7280',
  unit: '',
  low: 0,
  high: 100,
  max: 100,
};

function gasLevel(meta, value) {
  if (value == null || value === 0)
    return { label: 'No data', color: '#64748B', bg: '#F1F5F920' };
  if (value < meta.low)
    return { label: 'Low', color: '#EF4444', bg: '#EF444420' };
  if (value > meta.high)
    return { label: 'High', color: '#F59E0B', bg: '#F59E0B20' };
  return { label: 'Normal', color: '#16A34A', bg: '#16A34A20' };
}

const TABS = ['Overview', 'All Fields'];

// ─── DonutPie — single-value fill donut ──────────────────────────────────────
function GasDonut({ value, max, color, size = 72 }) {
  const pct = value > 0 ? Math.min(value / max, 1) : 0;
  const cx = size / 2,
    cy = size / 2,
    R = size / 2 - 5,
    ri = size / 2 - 17;

  function arcPath(startAng, sweep) {
    const x1 = cx + R * Math.cos(startAng),
      y1 = cy + R * Math.sin(startAng);
    const x2 = cx + R * Math.cos(startAng + sweep),
      y2 = cy + R * Math.sin(startAng + sweep);
    const xi1 = cx + ri * Math.cos(startAng),
      yi1 = cy + ri * Math.sin(startAng);
    const xi2 = cx + ri * Math.cos(startAng + sweep),
      yi2 = cy + ri * Math.sin(startAng + sweep);
    const lg = sweep > Math.PI ? 1 : 0;
    return `M${x1},${y1} A${R},${R},0,${lg},1,${x2},${y2} L${xi2},${yi2} A${ri},${ri},0,${lg},0,${xi1},${yi1} Z`;
  }

  const bg = arcPath(0, 2 * Math.PI - 0.001);
  const fill = pct > 0.005 ? arcPath(-Math.PI / 2, pct * 2 * Math.PI) : null;

  return (
    <Svg width={size} height={size}>
      <Path d={bg} fill="#E2E8F020" />
      {fill && <Path d={fill} fill={color} />}
      <SvgText
        x={cx}
        y={cy + 4}
        textAnchor="middle"
        fontSize={10}
        fontWeight="800"
        fill={color}
      >
        {value > 0 ? `${Math.round(pct * 100)}%` : '—'}
      </SvgText>
    </Svg>
  );
}

// ─── GasCard — individual sensor card ────────────────────────────────────────
function GasCard({ label, value, meta, T }) {
  const lvl = gasLevel(meta, value);
  const hasData = value != null && value > 0;
  const valStr = hasData ? Number(value).toFixed(value < 10 ? 1 : 0) : '—';

  return (
    <View
      style={[
        gc.card,
        {
          backgroundColor: T.card,
          borderColor: T.border,
          borderTopColor: meta.color,
          borderTopWidth: 3,
        },
      ]}
    >
      <View style={gc.top}>
        <View style={[gc.icoWrap, { backgroundColor: meta.color + '18' }]}>
          <Icon name={meta.icon} size={18} color={meta.color} />
        </View>
        <GasDonut
          value={value ?? 0}
          max={meta.max}
          color={meta.color}
          size={56}
        />
      </View>
      <Text style={[gc.valTxt, { color: hasData ? meta.color : T.muted }]}>
        {valStr}
        {hasData && (
          <Text style={[gc.unitTxt, { color: T.muted }]}> {meta.unit}</Text>
        )}
      </Text>
      <Text style={[gc.label, { color: T.muted }]} numberOfLines={2}>
        {label}
      </Text>
      <View style={[gc.badge, { backgroundColor: lvl.bg }]}>
        <Text style={[gc.badgeTxt, { color: lvl.color }]}>{lvl.label}</Text>
      </View>
    </View>
  );
}

const gc = StyleSheet.create({
  card: {
    width: '47%',
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 12,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  icoWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valTxt: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  unitTxt: { fontSize: 11, fontWeight: '400' },
  label: { fontSize: 11, fontWeight: '600', marginTop: 2, marginBottom: 6 },
  badge: {
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  badgeTxt: { fontSize: 9, fontWeight: '700' },
});

// ─── GasBarChart — horizontal bar per field ───────────────────────────────────
function GasBarChart({ fields, T }) {
  const maxVal = Math.max(...fields.map(f => f.value ?? 0), 1);
  return (
    <View style={{ gap: 10 }}>
      {fields.map((f, i) => {
        const meta = GAS_META[f.label] ?? DEFAULT_GAS;
        const pct =
          (f.value ?? 0) > 0 ? Math.min(1, (f.value ?? 0) / meta.max) : 0;
        const lvl = gasLevel(meta, f.value);
        return (
          <View
            key={i}
            style={[
              gbar.row,
              { borderLeftColor: meta.color, borderLeftWidth: 3 },
            ]}
          >
            <View style={gbar.rowLeft}>
              <View style={gbar.rowTop}>
                <Text style={[gbar.label, { color: T.text }]}>{f.label}</Text>
                <View style={[gbar.badge, { backgroundColor: lvl.bg }]}>
                  <Text style={[gbar.badgeTxt, { color: lvl.color }]}>
                    {lvl.label}
                  </Text>
                </View>
              </View>
              <View
                style={[gbar.track, { backgroundColor: T.border ?? '#E2E8F0' }]}
              >
                <View
                  style={[
                    gbar.fill,
                    {
                      width: `${Math.round(pct * 100)}%`,
                      backgroundColor: meta.color,
                    },
                  ]}
                />
              </View>
              <Text style={[gbar.range, { color: T.muted }]}>
                Normal: {meta.low}–{meta.high} {meta.unit}
              </Text>
            </View>
            <View style={gbar.right}>
              <Text
                style={[
                  gbar.val,
                  { color: (f.value ?? 0) > 0 ? meta.color : T.muted },
                ]}
              >
                {(f.value ?? 0) > 0
                  ? Number(f.value).toFixed(f.value < 10 ? 1 : 0)
                  : '—'}
              </Text>
              <Text style={[gbar.unit, { color: T.muted }]}>{meta.unit}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const gbar = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingLeft: 10,
    gap: 10,
  },
  rowLeft: { flex: 1, gap: 5 },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: { fontSize: 12, fontWeight: '700', flex: 1 },
  badge: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  badgeTxt: { fontSize: 9, fontWeight: '700' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  range: { fontSize: 9 },
  right: { alignItems: 'flex-end', minWidth: 48 },
  val: { fontSize: 16, fontWeight: '900', letterSpacing: -0.5 },
  unit: { fontSize: 9, marginTop: 1 },
});

// ─── AlertBanner — shows active high/low readings ───────────────────────────
function AlertBanner({ fields, T }) {
  const alerts = fields.filter(f => {
    const meta = GAS_META[f.label] ?? DEFAULT_GAS;
    const v = f.value ?? 0;
    return v > 0 && (v < meta.low || v > meta.high);
  });
  if (alerts.length === 0) return null;
  return (
    <View
      style={[
        ab.box,
        { backgroundColor: '#F59E0B12', borderColor: '#F59E0B40' },
      ]}
    >
      <Icon name="alert-circle-outline" size={16} color="#F59E0B" />
      <Text style={[ab.txt, { color: '#F59E0B' }]}>
        {alerts.length} reading{alerts.length > 1 ? 's' : ''} out of normal
        range:{' '}
        <Text style={{ fontWeight: '900' }}>
          {alerts.map(f => f.label.split(' ')[0]).join(', ')}
        </Text>
      </Text>
    </View>
  );
}

const ab = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 12,
    marginBottom: Spacing.md,
  },
  txt: { fontSize: 12, fontWeight: '600', flex: 1, lineHeight: 16 },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function SoilLifeDetailScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const T = theme.colors;

  const {
    readingId,
    deviceId,
    deviceType,
    deviceName,
    reading: passed,
  } = route.params;

  const { selectedReading, selectedReadingLoading } = useSelector(
    s => s.reports,
  );
  const reading = selectedReading ?? passed;
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    dispatch(fetchReadingDetail(deviceId, readingId));
    return () => dispatch(clearSelectedReading());
  }, [deviceId, readingId, dispatch]);

  // Build field list from labeled_fields
  const fields = useMemo(() => {
    if (!reading) return [];
    const lf = reading.labeled_fields ?? {};
    return Object.entries(lf).map(([label, value]) => ({
      label,
      value: value != null ? Number(value) : null,
      meta: GAS_META[label] ?? DEFAULT_GAS,
    }));
  }, [reading]);

  const gasFields = fields.filter(
    f =>
      ![
        'Temperature (°C)',
        'Humidity (%)',
        'Atmospheric Pressure (hPa)',
      ].includes(f.label),
  );
  const envFields = fields.filter(f =>
    ['Temperature (°C)', 'Humidity (%)', 'Atmospheric Pressure (hPa)'].includes(
      f.label,
    ),
  );
  const topFields = fields.slice(0, 4);

  if (selectedReadingLoading && !reading) {
    return (
      <SafeAreaView style={[s.root, { backgroundColor: T.bg }]}>
        <TopBar
          title={`Reading #${readingId}`}
          onBack={() => navigation.goBack()}
          theme={theme}
        />
        <View style={s.center}>
          <ActivityIndicator size="large" color={DEVICE_COLOR} />
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

  const renderTab = () => {
    switch (activeTab) {
      case 0:
        return (
          <>
            {/* Mini stat row */}
            <View style={s.statRow}>
              {topFields.map((f, i) => (
                <MiniStat
                  key={f.label}
                  label={f.label.split(' ')[0]}
                  value={(f.value ?? 0) > 0 ? Number(f.value).toFixed(1) : '—'}
                  color={f.meta.color}
                  T={T}
                />
              ))}
            </View>

            {/* Alert banner */}
            <AlertBanner fields={fields} T={T} />

            {/* Gas sensors — 2-col grid */}
            <SectionCard
              title="Gas Sensors"
              icon="cloud-outline"
              color={DEVICE_COLOR}
              T={T}
            >
              <View style={s.cardGrid}>
                {gasFields.map((f, i) => (
                  <GasCard
                    key={f.label}
                    label={f.label}
                    value={f.value}
                    meta={f.meta}
                    T={T}
                  />
                ))}
              </View>
            </SectionCard>

            {/* Environmental */}
            {envFields.length > 0 && (
              <SectionCard
                title="Environmental"
                icon="thermometer-lines"
                color="#06B6D4"
                T={T}
              >
                <View style={s.cardGrid}>
                  {envFields.map((f, i) => (
                    <GasCard
                      key={f.label}
                      label={f.label}
                      value={f.value}
                      meta={f.meta}
                      T={T}
                    />
                  ))}
                </View>
              </SectionCard>
            )}

            {/* Reading info */}
            <SectionCard
              title="Reading info"
              icon="information-outline"
              color={DEVICE_COLOR}
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

      case 1:
        return (
          <SectionCard
            title="All sensor readings"
            icon="format-list-bulleted"
            color={DEVICE_COLOR}
            T={T}
          >
            <GasBarChart fields={fields} T={T} />
          </SectionCard>
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

      {/* Header accent strip */}
      <View
        style={[
          s.accentStrip,
          {
            backgroundColor: DEVICE_COLOR + '18',
            borderBottomColor: DEVICE_COLOR + '30',
          },
        ]}
      >
        <View style={[s.accentIco, { backgroundColor: DEVICE_COLOR + '25' }]}>
          <Icon name="leaf-circle-outline" size={18} color={DEVICE_COLOR} />
        </View>
        <View>
          <Text style={[s.accentTitle, { color: T.text }]}>SoilLIFE</Text>
          <Text style={[s.accentSub, { color: T.muted }]}>
            Gas & Environmental Monitor · {fields.length} sensors
          </Text>
        </View>
      </View>

      {/* Tab bar */}
      <View
        style={[
          s.tabBar,
          { backgroundColor: T.card, borderBottomColor: T.border ?? '#E2E8F0' },
        ]}
      >
        {TABS.map((tab, i) => (
          <TouchableOpacity
            key={tab}
            style={[
              s.tab,
              activeTab === i && {
                borderBottomColor: DEVICE_COLOR,
                borderBottomWidth: 2.5,
              },
            ]}
            onPress={() => setActiveTab(i)}
          >
            <Text
              style={[
                s.tabTxt,
                {
                  color: activeTab === i ? DEVICE_COLOR : T.muted,
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  accentStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  accentIco: {
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accentTitle: { fontSize: 13, fontWeight: '800' },
  accentSub: { fontSize: 10, marginTop: 1 },

  tabBar: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabTxt: { fontSize: 13 },

  statRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 0,
  },
});
