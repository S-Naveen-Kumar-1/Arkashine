// src/screens/reports/SoilSparshDetailScreen.jsx
//
// Detail screen for SoilSparsh device (soil + atmospheric sensors)
// Tabs: Overview | All Fields
// Data: labeled_fields (Soil Temp, Soil Moisture, Atmos Temp, Atmos Humidity, Light Intensity)

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
import Svg, { Path, Text as SvgText, G, Rect } from 'react-native-svg';
import { Radius, Spacing, Shadow } from '../theme';
import { TopBar } from '../components/common';
import useTheme from '../hooks/useTheme';
import {
  fetchReadingDetail,
  clearSelectedReading,
} from '../redux/actions/reportsActions';
import {
  SectionCard,
  InfoRow,
  MiniStat,
  CONTENT_W,
  SCREEN_W,
} from './readingDetailHelpers';

const DEVICE_COLOR = '#0891B2'; // cyan for SoilSparsh

// ─── Field metadata ───────────────────────────────────────────────────────────
const FIELD_META = {
  'Soil Temp (°C)': {
    icon: 'thermometer',
    color: '#F97316',
    unit: '°C',
    low: 10,
    high: 35,
    max: 60,
    group: 'soil',
  },
  'Soil Moisture (%)': {
    icon: 'water-outline',
    color: '#0891B2',
    unit: '%',
    low: 20,
    high: 80,
    max: 100,
    group: 'soil',
  },
  'Atmos Temp (°C)': {
    icon: 'weather-sunny',
    color: '#EF4444',
    unit: '°C',
    low: 5,
    high: 40,
    max: 60,
    group: 'atmos',
  },
  'Atmos Humidity (%)': {
    icon: 'cloud-percent-outline',
    color: '#7C3AED',
    unit: '%',
    low: 30,
    high: 80,
    max: 100,
    group: 'atmos',
  },
  'Light Intensity (lux)': {
    icon: 'white-balance-sunny',
    color: '#F59E0B',
    unit: 'lux',
    low: 100,
    high: 10000,
    max: 100000,
    group: 'atmos',
  },
  'Soil pH': {
    icon: 'ph',
    color: '#16A34A',
    unit: '',
    low: 5.5,
    high: 7.5,
    max: 14,
    group: 'soil',
  },
  'Salinity (ppt)': {
    icon: 'waves',
    color: '#2563EB',
    unit: 'ppt',
    low: 0,
    high: 4,
    max: 10,
    group: 'soil',
  },
};
const DEFAULT_META = {
  icon: 'gauge',
  color: '#6B7280',
  unit: '',
  low: 0,
  high: 100,
  max: 100,
  group: 'other',
};

function fieldLevel(meta, value) {
  if (value == null || value === 0)
    return { label: 'No data', color: '#64748B', bg: '#F1F5F920' };
  if (value < meta.low)
    return { label: 'Low', color: '#EF4444', bg: '#EF444420' };
  if (value > meta.high)
    return { label: 'High', color: '#F59E0B', bg: '#F59E0B20' };
  return { label: 'Optimal', color: '#16A34A', bg: '#16A34A20' };
}

const TABS = ['Overview', 'All Fields'];

// ─── GaugeArc — semicircle gauge ─────────────────────────────────────────────
function GaugeArc({ value, meta, size = 90 }) {
  const pct = value > 0 ? Math.min(value / meta.max, 1) : 0;
  const cx = size / 2,
    cy = size * 0.72;
  const R = size * 0.42,
    ri = size * 0.28;
  const startAng = Math.PI,
    endAng = 2 * Math.PI; // semicircle bottom

  function arcPt(ang, r) {
    return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)];
  }

  const [ox1, oy1] = arcPt(startAng, R);
  const [ox2, oy2] = arcPt(endAng - 0.001, R);
  const [ix1, iy1] = arcPt(startAng, ri);
  const [ix2, iy2] = arcPt(endAng - 0.001, ri);
  const bgPath = `M${ox1},${oy1} A${R},${R},0,0,1,${ox2},${oy2} L${ix2},${iy2} A${ri},${ri},0,0,0,${ix1},${iy1} Z`;

  const fillAng = startAng + pct * Math.PI;
  const [fx2, fy2] = arcPt(fillAng, R);
  const [fix2, fiy2] = arcPt(fillAng, ri);
  const fillPath =
    pct > 0.01
      ? `M${ox1},${oy1} A${R},${R},0,${
          pct > 0.5 ? 1 : 0
        },1,${fx2},${fy2} L${fix2},${fiy2} A${ri},${ri},0,${
          pct > 0.5 ? 1 : 0
        },0,${ix1},${iy1} Z`
      : null;

  return (
    <Svg width={size} height={size * 0.75}>
      <Path d={bgPath} fill="#E2E8F025" />
      {fillPath && <Path d={fillPath} fill={meta.color} />}
      <SvgText
        x={cx}
        y={cy - 2}
        textAnchor="middle"
        fontSize={13}
        fontWeight="900"
        fill={meta.color}
      >
        {value > 0 ? `${Math.round(pct * 100)}%` : '—'}
      </SvgText>
    </Svg>
  );
}

// ─── SensorCard ───────────────────────────────────────────────────────────────
function SensorCard({ label, value, meta, T, wide = false }) {
  const lvl = fieldLevel(meta, value);
  const hasData = value != null && value > 0;
  const valStr = hasData
    ? Number(value).toFixed(value < 10 ? 1 : value < 1000 ? 0 : 0)
    : '—';

  return (
    <View
      style={[
        sc.card,
        wide ? { width: '100%' } : { width: '47%' },
        {
          backgroundColor: T.card,
          borderColor: T.border ?? '#E2E8F0',
          borderLeftColor: meta.color,
          borderLeftWidth: 3,
        },
      ]}
    >
      <View style={sc.top}>
        <View style={[sc.icoWrap, { backgroundColor: meta.color + '18' }]}>
          <Icon name={meta.icon} size={16} color={meta.color} />
        </View>
        <View style={[sc.badge, { backgroundColor: lvl.bg }]}>
          <Text style={[sc.badgeTxt, { color: lvl.color }]}>{lvl.label}</Text>
        </View>
      </View>
      <Text style={[sc.val, { color: hasData ? meta.color : T.muted }]}>
        {valStr}
        {hasData && (
          <Text style={[sc.unit, { color: T.muted }]}> {meta.unit}</Text>
        )}
      </Text>
      <Text style={[sc.label, { color: T.muted }]} numberOfLines={2}>
        {label}
      </Text>
      {/* Progress bar */}
      <View style={[sc.track, { backgroundColor: T.border ?? '#E2E8F0' }]}>
        <View
          style={[
            sc.fill,
            {
              width: `${Math.round(
                Math.min(hasData ? (value / meta.max) * 100 : 0, 100),
              )}%`,
              backgroundColor: meta.color,
            },
          ]}
        />
      </View>
      <Text style={[sc.range, { color: T.muted }]}>
        Optimal: {meta.low}–{meta.high} {meta.unit}
      </Text>
    </View>
  );
}

const sc = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 12,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  icoWrap: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  badgeTxt: { fontSize: 9, fontWeight: '700' },
  val: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  unit: { fontSize: 12, fontWeight: '400' },
  label: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 8,
    color: '#94A3B8',
  },
  track: { height: 5, borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  fill: { height: 5, borderRadius: 3 },
  range: { fontSize: 9 },
});

// ─── CompareRow — soil vs atmos comparison ────────────────────────────────────
function CompareCard({ soilField, atmosField, T }) {
  if (!soilField || !atmosField) return null;
  const sm = soilField.meta,
    am = atmosField.meta;
  const sv = soilField.value ?? 0,
    av = atmosField.value ?? 0;

  return (
    <View
      style={[
        cmp.card,
        { backgroundColor: T.card, borderColor: T.border ?? '#E2E8F0' },
      ]}
    >
      <Text style={[cmp.title, { color: T.text }]}>Temperature Comparison</Text>
      <View style={cmp.row}>
        <View style={cmp.col}>
          <View style={[cmp.dot, { backgroundColor: sm.color }]} />
          <Text style={[cmp.colVal, { color: sm.color }]}>
            {sv > 0 ? sv.toFixed(1) : '—'}°
          </Text>
          <Text style={[cmp.colLbl, { color: T.muted }]}>Soil</Text>
        </View>
        <View style={cmp.divider} />
        <View style={cmp.diffCol}>
          <Icon name="swap-horizontal" size={20} color={T.muted} />
          <Text style={[cmp.diffVal, { color: T.muted }]}>
            Δ {sv > 0 && av > 0 ? Math.abs(sv - av).toFixed(1) : '—'}°
          </Text>
        </View>
        <View style={cmp.divider} />
        <View style={cmp.col}>
          <View style={[cmp.dot, { backgroundColor: am.color }]} />
          <Text style={[cmp.colVal, { color: am.color }]}>
            {av > 0 ? av.toFixed(1) : '—'}°
          </Text>
          <Text style={[cmp.colLbl, { color: T.muted }]}>Atmos</Text>
        </View>
      </View>
    </View>
  );
}

const cmp = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  title: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  col: { flex: 1, alignItems: 'center', gap: 4 },
  diffCol: { alignItems: 'center', gap: 4, paddingHorizontal: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  colVal: { fontSize: 26, fontWeight: '900', letterSpacing: -1 },
  colLbl: { fontSize: 10, fontWeight: '600' },
  divider: { width: 1, height: 50, backgroundColor: '#E2E8F030' },
  diffVal: { fontSize: 11, fontWeight: '700' },
});

// ─── AllFieldsBar chart ───────────────────────────────────────────────────────
function AllFieldsDetail({ fields, T }) {
  return (
    <View style={{ gap: 12 }}>
      {fields.map((f, i) => {
        const meta = f.meta;
        const lvl = fieldLevel(meta, f.value);
        const pct =
          (f.value ?? 0) > 0 ? Math.min(1, (f.value ?? 0) / meta.max) : 0;
        const hasData = (f.value ?? 0) > 0;
        return (
          <View
            key={i}
            style={[
              afd.row,
              {
                backgroundColor: T.card,
                borderColor: T.border ?? '#E2E8F0',
                borderLeftColor: meta.color,
              },
            ]}
          >
            <View style={[afd.icoWrap, { backgroundColor: meta.color + '18' }]}>
              <Icon name={meta.icon} size={16} color={meta.color} />
            </View>
            <View style={afd.middle}>
              <View style={afd.topRow}>
                <Text style={[afd.label, { color: T.text }]}>{f.label}</Text>
                <View style={[afd.badge, { backgroundColor: lvl.bg }]}>
                  <Text style={[afd.badgeTxt, { color: lvl.color }]}>
                    {lvl.label}
                  </Text>
                </View>
              </View>
              <View
                style={[afd.track, { backgroundColor: T.border ?? '#E2E8F0' }]}
              >
                <View
                  style={[
                    afd.fill,
                    {
                      width: `${Math.round(pct * 100)}%`,
                      backgroundColor: meta.color,
                    },
                  ]}
                />
              </View>
              <Text style={[afd.range, { color: T.muted }]}>
                Range: {meta.low}–{meta.high} {meta.unit} · Max: {meta.max}
              </Text>
            </View>
            <View style={afd.right}>
              <Text
                style={[afd.val, { color: hasData ? meta.color : T.muted }]}
              >
                {hasData ? Number(f.value).toFixed(f.value < 100 ? 1 : 0) : '—'}
              </Text>
              <Text style={[afd.unit, { color: T.muted }]}>{meta.unit}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const afd = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderLeftWidth: 3,
    padding: 12,
    ...Shadow.sm,
  },
  icoWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  middle: { flex: 1, gap: 5 },
  topRow: {
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
  right: { alignItems: 'flex-end', minWidth: 52 },
  val: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  unit: { fontSize: 9, marginTop: 1 },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function SoilSparshDetailScreen({ navigation, route }) {
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

  const fields = useMemo(() => {
    if (!reading) return [];
    const lf = reading.labeled_fields ?? {};
    return Object.entries(lf).map(([label, value]) => ({
      label,
      value: value != null ? Number(value) : null,
      meta: FIELD_META[label] ?? DEFAULT_META,
    }));
  }, [reading]);

  const soilFields = fields.filter(f => f.meta.group === 'soil');
  const atmosFields = fields.filter(f => f.meta.group === 'atmos');
  const top4 = fields.slice(0, 4);

  const soilTemp = fields.find(f => f.label === 'Soil Temp (°C)');
  const atmosTemp = fields.find(f => f.label === 'Atmos Temp (°C)');

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
            {/* Mini stats */}
            <View style={s.statRow}>
              {top4.map((f, i) => (
                <MiniStat
                  key={f.label}
                  label={f.label.split(' ')[0]}
                  value={(f.value ?? 0) > 0 ? Number(f.value).toFixed(1) : '—'}
                  color={f.meta.color}
                  T={T}
                />
              ))}
            </View>

            {/* Temperature comparison */}
            {soilTemp && atmosTemp && (
              <CompareCard soilField={soilTemp} atmosField={atmosTemp} T={T} />
            )}

            {/* Soil sensors */}
            {soilFields.length > 0 && (
              <SectionCard
                title="Soil Sensors"
                icon="layers-outline"
                color={DEVICE_COLOR}
                T={T}
              >
                <View style={s.cardGrid}>
                  {soilFields.map((f, i) => (
                    <SensorCard
                      key={f.label}
                      label={f.label}
                      value={f.value}
                      meta={f.meta}
                      T={T}
                      wide={
                        soilFields.length % 2 !== 0 &&
                        i === soilFields.length - 1
                      }
                    />
                  ))}
                </View>
              </SectionCard>
            )}

            {/* Atmospheric sensors */}
            {atmosFields.length > 0 && (
              <SectionCard
                title="Atmospheric Sensors"
                icon="weather-partly-cloudy"
                color="#7C3AED"
                T={T}
              >
                <View style={s.cardGrid}>
                  {atmosFields.map((f, i) => (
                    <SensorCard
                      key={f.label}
                      label={f.label}
                      value={f.value}
                      meta={f.meta}
                      T={T}
                      wide={
                        atmosFields.length % 2 !== 0 &&
                        i === atmosFields.length - 1
                      }
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
        return <AllFieldsDetail fields={fields} T={T} />;

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
            backgroundColor: DEVICE_COLOR + '15',
            borderBottomColor: DEVICE_COLOR + '30',
          },
        ]}
      >
        <View style={[s.accentIco, { backgroundColor: DEVICE_COLOR + '25' }]}>
          <Icon name="water-check-outline" size={18} color={DEVICE_COLOR} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.accentTitle, { color: T.text }]}>SoilSparsh</Text>
          <Text style={[s.accentSub, { color: T.muted }]}>
            Soil & Atmospheric Monitor · {fields.length} sensors
          </Text>
        </View>
        {reading.tag ? (
          <View
            style={[
              s.tagChip,
              {
                backgroundColor: DEVICE_COLOR + '20',
                borderColor: DEVICE_COLOR + '40',
              },
            ]}
          >
            <Text style={[s.tagTxt, { color: DEVICE_COLOR }]}>
              #{reading.tag}
            </Text>
          </View>
        ) : null}
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
    flexShrink: 0,
  },
  accentTitle: { fontSize: 13, fontWeight: '800' },
  accentSub: { fontSize: 10, marginTop: 1 },
  tagChip: {
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  tagTxt: { fontSize: 11, fontWeight: '700' },

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
  },
});
