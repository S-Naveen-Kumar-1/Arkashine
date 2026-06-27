// src/screens/reports/SoilLifeDetailScreen.jsx

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
import Svg, { Path, Text as SvgText, G } from 'react-native-svg';
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
const DEVICE_COLOR = '#D97706';

// ─── Field metadata ───────────────────────────────────────────────────────────
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

const TABS = ['Overview', 'Chart', 'All Fields'];

// ─── Mini donut (used in table rows) ─────────────────────────────────────────
function MiniDonut({ value, max, color, size = 36 }) {
  const pct = value > 0 ? Math.min(value / max, 1) : 0;
  const cx = size / 2,
    cy = size / 2;
  const R = size / 2 - 3,
    ri = size / 2 - 10;

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

  const bgPath = arc(0, 2 * Math.PI - 0.001);
  const fillPath = pct > 0.01 ? arc(-Math.PI / 2, pct * 2 * Math.PI) : null;

  return (
    <Svg width={size} height={size}>
      <Path d={bgPath} fill="#E2E8F025" />
      {fillPath && <Path d={fillPath} fill={color} />}
    </Svg>
  );
}

// ─── Full combined pie chart (matches web screenshot) ────────────────────────
function CombinedPieChart({ fields, T }) {
  const data = fields.filter(f => (f.value ?? 0) > 0);
  const total = data.reduce((s, d) => s + (d.value ?? 0), 0);

  const SIZE = SW - Spacing.lg * 2;
  const cx = SIZE / 2,
    cy = SIZE * 0.45;
  const R = SIZE * 0.35,
    ri = SIZE * 0.16;

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

  const svgH = cy * 2 + 20;

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
      {/* Pie */}
      <Svg width={SIZE} height={svgH} style={{ alignSelf: 'center' }}>
        {/* Background ring */}
        <Path
          d={arcPath(0, 2 * Math.PI - 0.001)}
          fill={T.border ? T.border + '30' : '#E2E8F030'}
        />
        {slices.map(
          (sl, i) =>
            sl.path && <Path key={i} d={sl.path} fill={sl.meta.color} />,
        )}
        {/* Center label */}
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

      {/* Legend — 2-column grid */}
      <View style={cpc.legendGrid}>
        {slices.map((sl, i) => (
          <View
            key={i}
            style={[
              cpc.legendItem,
              { backgroundColor: T.card, borderColor: T.border ?? '#E2E8F0' },
            ]}
          >
            <View style={[cpc.dot, { backgroundColor: sl.meta.color }]} />
            <View style={{ flex: 1 }}>
              <Text
                style={[cpc.legendLabel, { color: T.text }]}
                numberOfLines={1}
              >
                {sl.label}
              </Text>
              <Text style={[cpc.legendVal, { color: sl.meta.color }]}>
                {Number(sl.value).toFixed(sl.value < 10 ? 1 : 0)} {sl.meta.unit}
                <Text style={[cpc.legendPct, { color: T.muted }]}>
                  {' '}
                  · {sl.pct}%
                </Text>
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
const cpc = StyleSheet.create({
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: Spacing.md,
  },
  legendItem: {
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
  legendLabel: { fontSize: 11, fontWeight: '700' },
  legendVal: { fontSize: 12, fontWeight: '900', marginTop: 1 },
  legendPct: { fontSize: 10, fontWeight: '400' },
});

// ─── Table row (like web — field name | value | mini pie | range) ─────────────
function FieldTableRow({ field, T, isLast }) {
  const meta = field.meta;
  const lvl = gasLevel(meta, field.value);
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
      {/* Field name */}
      <View style={ftr.nameCol}>
        <View style={[ftr.iconWrap, { backgroundColor: meta.color + '18' }]}>
          <Icon name={meta.icon} size={12} color={meta.color} />
        </View>
        <Text style={[ftr.name, { color: T.text }]} numberOfLines={2}>
          {field.label}
        </Text>
      </View>

      {/* Value */}
      <View style={ftr.valCol}>
        <Text style={[ftr.val, { color: hasData ? meta.color : T.muted }]}>
          {valStr}
        </Text>
        <Text style={[ftr.unit, { color: T.muted }]}>{meta.unit}</Text>
      </View>

      {/* Mini pie */}
      <View style={ftr.pieCol}>
        <MiniDonut
          value={field.value ?? 0}
          max={meta.max}
          color={meta.color}
          size={38}
        />
      </View>

      {/* Detection range */}
      <View style={ftr.rangeCol}>
        <Text style={[ftr.range, { color: T.muted }]}>
          {meta.low} – {meta.max}
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
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  name: { fontSize: 11, fontWeight: '600', flex: 1 },
  valCol: { flex: 1, alignItems: 'flex-end' },
  val: { fontSize: 13, fontWeight: '900' },
  unit: { fontSize: 9, marginTop: 1 },
  pieCol: { width: 42, alignItems: 'center' },
  rangeCol: { flex: 1.4, alignItems: 'flex-end', gap: 2 },
  range: { fontSize: 9, fontWeight: '600' },
  rangeUnit: { fontSize: 8 },
  badge: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  badgeTxt: { fontSize: 8, fontWeight: '700' },
});

// ─── Alert banner ─────────────────────────────────────────────────────────────
function AlertBanner({ fields, T }) {
  const alerts = fields.filter(f => {
    const v = f.value ?? 0;
    return v > 0 && (v < f.meta.low || v > f.meta.high);
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

// ─── GasCard (overview grid) ──────────────────────────────────────────────────
function GasCard({ label, value, meta, T }) {
  const lvl = gasLevel(meta, value);
  const hasData = value != null && value > 0;
  const valStr = hasData ? Number(value).toFixed(value < 10 ? 1 : 0) : '—';
  const pct = hasData ? Math.min((value / meta.max) * 100, 100) : 0;

  return (
    <View
      style={[
        gc.card,
        {
          backgroundColor: T.card,
          borderColor: T.border ?? '#E2E8F0',
          borderTopColor: meta.color,
          borderTopWidth: 3,
        },
      ]}
    >
      <View style={gc.top}>
        <View style={[gc.icoWrap, { backgroundColor: meta.color + '18' }]}>
          <Icon name={meta.icon} size={16} color={meta.color} />
        </View>
        <MiniDonut
          value={value ?? 0}
          max={meta.max}
          color={meta.color}
          size={48}
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
      {/* Mini bar */}
      <View
        style={[gc.track, { backgroundColor: (T.border ?? '#E2E8F0') + '80' }]}
      >
        <View
          style={[
            gc.fill,
            { width: `${Math.round(pct)}%`, backgroundColor: meta.color },
          ]}
        />
      </View>
      <View style={gc.footer}>
        <View style={[gc.badge, { backgroundColor: lvl.bg }]}>
          <Text style={[gc.badgeTxt, { color: lvl.color }]}>{lvl.label}</Text>
        </View>
        <Text style={[gc.rangeHint, { color: T.muted }]}>
          {meta.low}–{meta.high}
        </Text>
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
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valTxt: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  unitTxt: { fontSize: 10, fontWeight: '400' },
  label: { fontSize: 10, fontWeight: '600', marginTop: 2, marginBottom: 6 },
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

// ─── Image card ───────────────────────────────────────────────────────────────
function ImageCard({ imageUri, T }) {
  const [failed, setFailed] = useState(false);
  if (!imageUri || failed) {
    return (
      <View
        style={[
          img.placeholder,
          { backgroundColor: T.card, borderColor: T.border ?? '#E2E8F0' },
        ]}
      >
        <Icon
          name="image-off-outline"
          size={32}
          color={T.muted}
          style={{ opacity: 0.35 }}
        />
        <Text style={[img.placeholderTxt, { color: T.muted }]}>
          No image uploaded
        </Text>
      </View>
    );
  }

  return (
    <View style={[img.wrap, { borderColor: T.border ?? '#E2E8F0' }]}>
      <Image
        source={{ uri: imageUri }}
        style={img.image}
        resizeMode="cover"
        onError={() => setFailed(true)}
      />
    </View>
  );
}
const img = StyleSheet.create({
  wrap: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  image: { width: '100%', height: 200 },
  placeholder: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: Spacing.md,
  },
  placeholderTxt: { fontSize: 12, fontWeight: '600' },
});

// ─── Table header ─────────────────────────────────────────────────────────────
function TableHeader({ T }) {
  return (
    <View
      style={[
        th.row,
        {
          borderBottomColor: T.border ?? '#E2E8F0',
          borderBottomWidth: 1,
          backgroundColor: T.bg,
        },
      ]}
    >
      <Text style={[th.cell, { flex: 2.2, color: T.muted }]}>Field Name</Text>
      <Text style={[th.cell, { flex: 1, textAlign: 'right', color: T.muted }]}>
        Value
      </Text>
      <Text
        style={[th.cell, { width: 42, textAlign: 'center', color: T.muted }]}
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

// ─── Main Screen ──────────────────────────────────────────────────────────────
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
  const top4 = fields.slice(0, 4);

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
  const hasImage = !!reading.image_path;

  const renderTab = () => {
    switch (activeTab) {
      // ── Overview ──────────────────────────────────────────────────────────
      case 0:
        return (
          <>
            {/* Mini stats */}
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

            {/* Alert banner */}
            <AlertBanner fields={fields} T={T} />

            {/* Device image */}
            <ImageCard imageUri={reading.image_path} T={T} />

            {/* Gas sensors grid */}
            <SectionCard
              title="Gas Sensors"
              icon="cloud-outline"
              color={DEVICE_COLOR}
              T={T}
            >
              <View style={s.cardGrid}>
                {gasFields.map(f => (
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

            {/* Environmental grid */}
            {envFields.length > 0 && (
              <SectionCard
                title="Environmental"
                icon="thermometer-lines"
                color="#06B6D4"
                T={T}
              >
                <View style={s.cardGrid}>
                  {envFields.map(f => (
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

      // ── All Fields table (mirrors web) ────────────────────────────────────
      case 2:
        return (
          <View
            style={[
              s.tableCard,
              { backgroundColor: T.card, borderColor: T.border ?? '#E2E8F0' },
            ]}
          >
            {/* Table header */}
            <View
              style={[
                s.tableHeader,
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
                    s.tableHeaderIco,
                    { backgroundColor: DEVICE_COLOR + '20' },
                  ]}
                >
                  <Icon name="table" size={13} color={DEVICE_COLOR} />
                </View>
                <Text style={[s.tableHeaderTxt, { color: T.text }]}>
                  All Sensor Readings
                </Text>
              </View>
              <View
                style={[
                  s.tableHeaderBadge,
                  {
                    backgroundColor: DEVICE_COLOR + '18',
                    borderColor: DEVICE_COLOR + '40',
                  },
                ]}
              >
                <Text style={[s.tableHeaderBadgeTxt, { color: DEVICE_COLOR }]}>
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
          <Icon name="leaf-circle-outline" size={18} color={DEVICE_COLOR} />
        </View>
        <View style={{ flex: 1 }}>
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

  // Table
  tableCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    ...Shadow.sm,
    marginBottom: Spacing.md,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    paddingVertical: 11,
    borderBottomWidth: 0.5,
  },
  tableHeaderIco: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableHeaderTxt: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableHeaderBadge: {
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tableHeaderBadgeTxt: { fontSize: 10, fontWeight: '700' },
  tableBody: { padding: Spacing.md },
});
