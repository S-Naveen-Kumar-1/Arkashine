// src/screens/reports/SoilSparshDetailScreen.jsx

import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Svg, { Path, Text as SvgText } from 'react-native-svg';
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

const { width: SW } = Dimensions.get('window');
const DEVICE_COLOR = '#0891B2';

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

const TABS = ['Overview', 'Chart', 'All Fields'];

// ─── Mini donut ───────────────────────────────────────────────────────────────
function MiniDonut({ value, max, color, size = 40 }) {
  const pct = value > 0 ? Math.min(value / max, 1) : 0;
  const cx = size / 2,
    cy = size / 2;
  const R = size / 2 - 3,
    ri = size / 2 - 11;

  function arc(startAng, sweep) {
    const clamp = Math.min(sweep, 2 * Math.PI - 0.001);
    const x1 = cx + R * Math.cos(startAng),
      y1 = cy + R * Math.sin(startAng);
    const x2 = cx + R * Math.cos(startAng + clamp),
      y2 = cy + R * Math.sin(startAng + clamp);
    const xi1 = cx + ri * Math.cos(startAng),
      yi1 = cy + ri * Math.sin(startAng);
    const xi2 = cx + ri * Math.cos(startAng + clamp),
      yi2 = cy + ri * Math.sin(startAng + clamp);
    const lg = clamp > Math.PI ? 1 : 0;
    return `M${x1},${y1} A${R},${R},0,${lg},1,${x2},${y2} L${xi2},${yi2} A${ri},${ri},0,${lg},0,${xi1},${yi1} Z`;
  }

  return (
    <Svg width={size} height={size}>
      <Path d={arc(0, 2 * Math.PI - 0.001)} fill="#E2E8F025" />
      {pct > 0.01 && (
        <Path d={arc(-Math.PI / 2, pct * 2 * Math.PI)} fill={color} />
      )}
    </Svg>
  );
}

// ─── Combined pie chart ───────────────────────────────────────────────────────
function CombinedPieChart({ fields, T }) {
  const data = fields.filter(f => (f.value ?? 0) > 0);
  const total = data.reduce((s, d) => s + (d.value ?? 0), 0);

  const SIZE = SW - Spacing.lg * 2;
  const cx = SIZE / 2,
    cy = SIZE * 0.42;
  const R = SIZE * 0.33,
    ri = SIZE * 0.14;

  function arcPath(startAng, sweep) {
    const clamp = Math.min(sweep, 2 * Math.PI - 0.001);
    const x1 = cx + R * Math.cos(startAng),
      y1 = cy + R * Math.sin(startAng);
    const x2 = cx + R * Math.cos(startAng + clamp),
      y2 = cy + R * Math.sin(startAng + clamp);
    const xi1 = cx + ri * Math.cos(startAng),
      yi1 = cy + ri * Math.sin(startAng);
    const xi2 = cx + ri * Math.cos(startAng + clamp),
      yi2 = cy + ri * Math.sin(startAng + clamp);
    const lg = clamp > Math.PI ? 1 : 0;
    return `M${x1},${y1} A${R},${R},0,${lg},1,${x2},${y2} L${xi2},${yi2} A${ri},${ri},0,${lg},0,${xi1},${yi1} Z`;
  }

  let ang = -Math.PI / 2;
  const slices = data.map(d => {
    const sweep = total > 0 ? (d.value / total) * 2 * Math.PI : 0;
    const path = sweep > 0.005 ? arcPath(ang, sweep) : null;
    ang += sweep;
    return {
      ...d,
      path,
      pct: total > 0 ? ((d.value / total) * 100).toFixed(1) : '0',
    };
  });

  if (data.length === 0) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 40 }}>
        <Icon
          name="chart-pie-outline"
          size={48}
          color={T.muted}
          style={{ opacity: 0.3 }}
        />
        <Text style={{ color: T.muted, marginTop: 10, fontSize: 13 }}>
          No data to chart
        </Text>
      </View>
    );
  }

  return (
    <View>
      <Svg width={SIZE} height={cy * 2 + 20} style={{ alignSelf: 'center' }}>
        <Path
          d={arcPath(0, 2 * Math.PI - 0.001)}
          fill={T.border ? T.border + '30' : '#E2E8F030'}
        />
        {slices.map(
          (sl, i) =>
            sl.path && <Path key={i} d={sl.path} fill={sl.meta.color} />,
        )}
        <SvgText
          x={cx}
          y={cy - 8}
          textAnchor="middle"
          fontSize={11}
          fill={T.muted ?? '#94A3B8'}
        >
          All Values
        </SvgText>
        <SvgText
          x={cx}
          y={cy + 10}
          textAnchor="middle"
          fontSize={18}
          fontWeight="900"
          fill={T.text ?? '#111'}
        >
          {data.length}
        </SvgText>
        <SvgText
          x={cx}
          y={cy + 26}
          textAnchor="middle"
          fontSize={10}
          fill={T.muted ?? '#94A3B8'}
        >
          sensors
        </SvgText>
      </Svg>

      {/* Legend grid */}
      <View style={cpc.grid}>
        {slices.map((sl, i) => (
          <View
            key={i}
            style={[
              cpc.item,
              { backgroundColor: T.card, borderColor: T.border ?? '#E2E8F0' },
            ]}
          >
            <View style={[cpc.dot, { backgroundColor: sl.meta.color }]} />
            <View style={{ flex: 1 }}>
              <Text style={[cpc.lbl, { color: T.text }]} numberOfLines={1}>
                {sl.label}
              </Text>
              <Text style={[cpc.val, { color: sl.meta.color }]}>
                {Number(sl.value).toFixed(sl.value < 10 ? 1 : 0)} {sl.meta.unit}
                <Text style={[cpc.pct, { color: T.muted }]}> · {sl.pct}%</Text>
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
const cpc = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: Spacing.md,
  },
  item: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 10,
    ...Shadow.sm,
  },
  dot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  lbl: { fontSize: 11, fontWeight: '700' },
  val: { fontSize: 12, fontWeight: '900', marginTop: 1 },
  pct: { fontSize: 10, fontWeight: '400' },
});

// ─── Table row (Field | Value | Mini pie | Range) ─────────────────────────────
function FieldTableRow({ field, T, isLast }) {
  const meta = field.meta;
  const lvl = fieldLevel(meta, field.value);
  const hasData = (field.value ?? 0) > 0;
  const valStr = hasData
    ? Number(field.value).toFixed(field.value < 10 ? 1 : 0)
    : '0.0';

  return (
    <View
      style={[
        ftr.row,
        !isLast && {
          borderBottomColor: (T.border ?? '#E2E8F0') + '60',
          borderBottomWidth: 0.5,
        },
      ]}
    >
      <View style={ftr.nameCol}>
        <View style={[ftr.ico, { backgroundColor: meta.color + '18' }]}>
          <Icon name={meta.icon} size={11} color={meta.color} />
        </View>
        <Text style={[ftr.name, { color: T.text }]} numberOfLines={2}>
          {field.label}
        </Text>
      </View>
      <View style={ftr.valCol}>
        <Text style={[ftr.val, { color: hasData ? meta.color : T.muted }]}>
          {valStr}
        </Text>
        <Text style={[ftr.unit, { color: T.muted }]}>{meta.unit}</Text>
      </View>
      <View style={ftr.pieCol}>
        <MiniDonut
          value={field.value ?? 0}
          max={meta.max}
          color={meta.color}
          size={36}
        />
      </View>
      <View style={ftr.rangeCol}>
        <Text style={[ftr.range, { color: T.muted }]}>
          {meta.low}–{meta.max}
        </Text>
        <Text style={[ftr.rangeUnit, { color: T.muted }]}>{meta.unit}</Text>
        <View style={[ftr.badge, { backgroundColor: lvl.bg }]}>
          <Text style={[ftr.badgeTxt, { color: lvl.color }]}>{lvl.label}</Text>
        </View>
      </View>
    </View>
  );
}
const ftr = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  nameCol: { flex: 2.2, flexDirection: 'row', alignItems: 'center', gap: 6 },
  ico: {
    width: 22,
    height: 22,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  name: { fontSize: 11, fontWeight: '600', flex: 1 },
  valCol: { flex: 1, alignItems: 'flex-end' },
  val: { fontSize: 13, fontWeight: '900' },
  unit: { fontSize: 9, marginTop: 1 },
  pieCol: { width: 40, alignItems: 'center' },
  rangeCol: { flex: 1.4, alignItems: 'flex-end', gap: 2 },
  range: { fontSize: 9, fontWeight: '600' },
  rangeUnit: { fontSize: 8 },
  badge: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  badgeTxt: { fontSize: 8, fontWeight: '700' },
});

function TableHeader({ T }) {
  return (
    <View
      style={[
        th.row,
        { borderBottomColor: T.border ?? '#E2E8F0', borderBottomWidth: 1 },
      ]}
    >
      <Text style={[th.cell, { flex: 2.2, color: T.muted }]}>Field Name</Text>
      <Text style={[th.cell, { flex: 1, textAlign: 'right', color: T.muted }]}>
        Value
      </Text>
      <Text
        style={[th.cell, { width: 40, textAlign: 'center', color: T.muted }]}
      >
        Pie
      </Text>
      <Text
        style={[th.cell, { flex: 1.4, textAlign: 'right', color: T.muted }]}
      >
        Range
      </Text>
    </View>
  );
}
const th = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  cell: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});

// ─── Image card ───────────────────────────────────────────────────────────────
function ImageCard({ imageUri, T }) {
  const [failed, setFailed] = useState(false);
  if (!imageUri || failed) {
    return (
      <View
        style={[
          imgc.placeholder,
          { backgroundColor: T.card, borderColor: T.border ?? '#E2E8F0' },
        ]}
      >
        <Icon
          name="image-off-outline"
          size={30}
          color={T.muted}
          style={{ opacity: 0.3 }}
        />
        <Text style={[imgc.placeholderTxt, { color: T.muted }]}>
          No image uploaded
        </Text>
      </View>
    );
  }
  return (
    <View style={[imgc.wrap, { borderColor: T.border ?? '#E2E8F0' }]}>
      <Image
        source={{ uri: imageUri }}
        style={imgc.img}
        resizeMode="cover"
        onError={() => setFailed(true)}
      />
      <View
        style={[
          imgc.footer,
          { backgroundColor: T.card, borderTopColor: T.border ?? '#E2E8F0' },
        ]}
      >
        <Icon name="image-outline" size={13} color={T.muted} />
        <Text style={[imgc.footerTxt, { color: T.muted }]}>Device Image</Text>
      </View>
    </View>
  );
}
const imgc = StyleSheet.create({
  wrap: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  img: { width: '100%', height: 200 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    borderTopWidth: 0.5,
  },
  footerTxt: { fontSize: 11, fontWeight: '600' },
  placeholder: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: Spacing.md,
  },
  placeholderTxt: { fontSize: 12, fontWeight: '600' },
});

// ─── SensorCard ───────────────────────────────────────────────────────────────
function SensorCard({ label, value, meta, T, wide = false }) {
  const lvl = fieldLevel(meta, value);
  const hasData = value != null && value > 0;
  const valStr = hasData ? Number(value).toFixed(value < 10 ? 1 : 0) : '—';
  const pct = hasData ? Math.min((value / meta.max) * 100, 100) : 0;

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
        <MiniDonut
          value={value ?? 0}
          max={meta.max}
          color={meta.color}
          size={44}
        />
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
      <View
        style={[sc.track, { backgroundColor: (T.border ?? '#E2E8F0') + '80' }]}
      >
        <View
          style={[
            sc.fill,
            { width: `${Math.round(pct)}%`, backgroundColor: meta.color },
          ]}
        />
      </View>
      <View style={sc.footer}>
        <View style={[sc.badge, { backgroundColor: lvl.bg }]}>
          <Text style={[sc.badgeTxt, { color: lvl.color }]}>{lvl.label}</Text>
        </View>
        <Text style={[sc.rangeHint, { color: T.muted }]}>
          {meta.low}–{meta.high} {meta.unit}
        </Text>
      </View>
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  icoWrap: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  val: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  unit: { fontSize: 10, fontWeight: '400' },
  label: { fontSize: 10, fontWeight: '600', marginTop: 2, marginBottom: 8 },
  track: { height: 4, borderRadius: 2, overflow: 'hidden', marginBottom: 6 },
  fill: { height: 4, borderRadius: 2 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  badgeTxt: { fontSize: 8, fontWeight: '700' },
  rangeHint: { fontSize: 8 },
});

// ─── Temperature compare card ─────────────────────────────────────────────────
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

// ─── Main Screen ──────────────────────────────────────────────────────────────
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
  const hasImage = !!reading?.image_path;

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
          <Text style={{ color: T.muted, marginTop: 12 }}>Loading…</Text>
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
      // ── Overview ──────────────────────────────────────────────────────────
      case 0:
        return (
          <>
            <View style={s.statRow}>
              {top4.map(f => (
                <MiniStat
                  key={f.label}
                  label={f.label.split(' ')[0]}
                  value={(f.value ?? 0) > 0 ? Number(f.value).toFixed(1) : '—'}
                  color={f.meta.color}
                  T={T}
                />
              ))}
            </View>

            {/* Device image */}
            <ImageCard imageUri={reading.image_path} T={T} />

            {/* Temperature compare */}
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

      // ── Chart ─────────────────────────────────────────────────────────────
      case 1:
        return (
          <SectionCard
            title="All Values"
            icon="chart-pie"
            color={DEVICE_COLOR}
            T={T}
          >
            <CombinedPieChart fields={fields} T={T} />
          </SectionCard>
        );

      // ── All Fields table ──────────────────────────────────────────────────
      case 2:
        return (
          <View
            style={[
              s.tableCard,
              { backgroundColor: T.card, borderColor: T.border ?? '#E2E8F0' },
            ]}
          >
            <View
              style={[
                s.tableHdr,
                {
                  borderBottomColor: T.border ?? '#E2E8F0',
                  backgroundColor: DEVICE_COLOR + '10',
                },
              ]}
            >
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <View
                  style={[
                    s.tableHdrIco,
                    { backgroundColor: DEVICE_COLOR + '20' },
                  ]}
                >
                  <Icon name="table" size={13} color={DEVICE_COLOR} />
                </View>
                <Text style={[s.tableHdrTxt, { color: T.text }]}>
                  All Sensor Readings
                </Text>
              </View>
              <View
                style={[
                  s.tableHdrBadge,
                  {
                    backgroundColor: DEVICE_COLOR + '18',
                    borderColor: DEVICE_COLOR + '40',
                  },
                ]}
              >
                <Text style={[s.tableHdrBadgeTxt, { color: DEVICE_COLOR }]}>
                  {fields.length} fields
                </Text>
              </View>
            </View>
            <View style={s.tableBody}>
              <TableHeader T={T} />
              {fields.map((f, i) => (
                <FieldTableRow
                  key={f.label}
                  field={f}
                  T={T}
                  isLast={i === fields.length - 1}
                />
              ))}
            </View>
          </View>
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

      {/* Accent strip */}
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },

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
  accentRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tagChip: {
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  tagTxt: { fontSize: 11, fontWeight: '700' },
  imgChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  imgChipTxt: { fontSize: 10, fontWeight: '600' },

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

  tableCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    ...Shadow.sm,
    marginBottom: Spacing.md,
  },
  tableHdr: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    paddingVertical: 11,
    borderBottomWidth: 0.5,
  },
  tableHdrIco: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableHdrTxt: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableHdrBadge: {
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tableHdrBadgeTxt: { fontSize: 10, fontWeight: '700' },
  tableBody: { padding: Spacing.md },
});
