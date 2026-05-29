// src/screens/reports/ReadingDetailScreen.jsx
//
// Fully dynamic — reads field labels from schema passed via route.params
// (already fetched by DeviceReadingsScreen) or fetches it if missing.
//
// Schema shapes handled:
//   soilsaathi → named keys (nitrogen, phosphorous, ph, ec, oc, calcium, …)
//   ph_bottle  → field1…fieldN + latitude/longitude
//   atmo_sense / soil_life → field1…fieldN
//
// Tabs:
//   soilsaathi: Overview | Primary | Secondary | Chart
//   other types: Overview | All Fields

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
import Svg, { G, Path, Text as SvgText, Rect } from 'react-native-svg';
import { Radius, Spacing, Shadow } from '../theme';
import { TopBar } from '../components/common';
import useTheme from '../hooks/useTheme';
import {
  fetchReadingDetail,
  clearSelectedReading,
  fetchDeviceFieldSchema,
} from '../redux/actions/reportsActions';

const { width: SCREEN_W } = Dimensions.get('window');
const CONTENT_W = SCREEN_W - Spacing.lg * 2;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (v, d = 2) =>
  v == null ? '—' : isNaN(Number(v)) ? String(v) : Number(v).toFixed(d);

// Keys to skip in "All Fields" tab — they're shown in reading info
const META_KEYS = new Set([
  'area_name',
  'tag',
  'crop_type',
  'created_at',
  'latitude',
  'longitude',
  'id',
]);

function phClass(ph) {
  if (!ph || ph === 0)
    return {
      label: 'No data',
      color: '#94A3B8',
      bg: '#F1F5F9',
      text: '#475569',
    };
  if (ph < 4.5)
    return {
      label: 'Strongly acidic',
      color: '#DC2626',
      bg: '#FEE2E2',
      text: '#B91C1C',
    };
  if (ph < 5.5)
    return {
      label: 'Acidic',
      color: '#EA580C',
      bg: '#FFEDD5',
      text: '#C2410C',
    };
  if (ph < 6.5)
    return {
      label: 'Slightly acidic',
      color: '#CA8A04',
      bg: '#FEF9C3',
      text: '#A16207',
    };
  if (ph <= 7.5)
    return {
      label: 'Neutral',
      color: '#16A34A',
      bg: '#DCFCE7',
      text: '#15803D',
    };
  if (ph <= 8.5)
    return {
      label: 'Alkaline',
      color: '#2563EB',
      bg: '#DBEAFE',
      text: '#1D4ED8',
    };
  return {
    label: 'Strongly alkaline',
    color: '#7C3AED',
    bg: '#EDE9FE',
    text: '#6D28D9',
  };
}
function ecClass(ec) {
  if (!ec || ec === 0)
    return {
      label: 'No data',
      color: '#94A3B8',
      bg: '#F1F5F9',
      text: '#475569',
    };
  if (ec < 0.25)
    return {
      label: 'Very low',
      color: '#EA580C',
      bg: '#FFEDD5',
      text: '#C2410C',
    };
  if (ec < 0.75)
    return { label: 'Low', color: '#CA8A04', bg: '#FEF9C3', text: '#A16207' };
  if (ec <= 2)
    return {
      label: 'Normal',
      color: '#16A34A',
      bg: '#DCFCE7',
      text: '#15803D',
    };
  if (ec <= 4)
    return { label: 'High', color: '#2563EB', bg: '#DBEAFE', text: '#1D4ED8' };
  return {
    label: 'Very high',
    color: '#DC2626',
    bg: '#FEE2E2',
    text: '#B91C1C',
  };
}
function nutrientLevel(key, value) {
  const ranges = {
    nitrogen: { low: 280, high: 560 },
    phosphorous: { low: 22, high: 56 },
    potassium: { low: 141, high: 336 },
    calcium: { low: 1.5, high: 5 },
    magnesium: { low: 1, high: 3 },
    sulphur: { low: 10, high: 20 },
    zinc: { low: 0.6, high: 1.5 },
    manganese: { low: 5, high: 20 },
    iron: { low: 6.5, high: 15 },
    copper: { low: 0.6, high: 2 },
    boron: { low: 0.5, high: 1.5 },
    ph: { low: 6.5, high: 7.3 },
    ec: { low: 1, high: 4 },
    oc: { low: 0.5, high: 0.75 },
    electrical_conduction: { low: 1, high: 4 },
  };
  const r = ranges[key];
  if (!r || value == null)
    return { label: '—', color: '#94A3B8', bg: '#F1F5F9', text: '#475569' };
  if (value === 0)
    return {
      label: 'No data',
      color: '#94A3B8',
      bg: '#F1F5F9',
      text: '#475569',
    };
  if (value < r.low)
    return { label: 'Low', color: '#DC2626', bg: '#FEE2E2', text: '#B91C1C' };
  if (value > r.high)
    return { label: 'High', color: '#F59E0B', bg: '#FFFBEB', text: '#92400E' };
  return { label: 'Optimal', color: '#16A34A', bg: '#DCFCE7', text: '#14532D' };
}

// ─── Reusable UI components ───────────────────────────────────────────────────
function LevelBadge({ label, bg, text }) {
  return (
    <View style={[lb.wrap, { backgroundColor: bg }]}>
      <Text style={[lb.text, { color: text }]}>{label}</Text>
    </View>
  );
}
const lb = StyleSheet.create({
  wrap: {
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 3,
    flexShrink: 0,
  },
  text: { fontSize: 10, fontWeight: '800' },
});

function NutrientRow({ label, value, unit = '', dataKey, T }) {
  const cls = nutrientLevel(dataKey, value);
  const maxMap = {
    nitrogen: 600,
    phosphorous: 100,
    potassium: 400,
    calcium: 10,
    magnesium: 6,
    sulphur: 50,
    zinc: 5,
    manganese: 50,
    iron: 30,
    copper: 5,
    boron: 5,
    ph: 14,
    ec: 8,
    oc: 3,
    electrical_conduction: 8,
  };
  const maxVal = maxMap[dataKey] ?? 100;
  const pct = value > 0 ? Math.min(1, value / maxVal) : 0;
  const BAR_W = CONTENT_W - Spacing.md * 2 - 96 - 52 - 62 - 24;
  const dispVal = value != null ? `${Number(value).toFixed(1)}${unit}` : '—';
  return (
    <View style={[nr.row, { borderBottomColor: T.border + '60' }]}>
      <Text style={[nr.label, { color: T.textSub }]} numberOfLines={2}>
        {label}
      </Text>
      <View
        style={[nr.barBg, { backgroundColor: T.border + '80', width: BAR_W }]}
      >
        <View
          style={[nr.fill, { width: BAR_W * pct, backgroundColor: cls.color }]}
        />
      </View>
      <Text style={[nr.val, { color: T.text }]}>{dispVal}</Text>
      <LevelBadge {...cls} />
    </View>
  );
}
const nr = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 0.5,
    gap: 6,
  },
  label: { width: 96, fontSize: 11, flexShrink: 0 },
  barBg: { height: 6, borderRadius: 3, overflow: 'hidden', flexShrink: 0 },
  fill: { height: 6, borderRadius: 3 },
  val: {
    width: 52,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'right',
    flexShrink: 0,
  },
});

// Generic field row — for non-soilsaathi devices (field1, field2, …)
function FieldRow({ label, value, color, T, last }) {
  const n = value != null ? Number(value) : null;
  const dispVal =
    n != null && !isNaN(n)
      ? n.toFixed(4).replace(/\.?0+$/, '')
      : value != null
      ? String(value)
      : '—';
  return (
    <View
      style={[
        frow.row,
        !last && { borderBottomColor: T.border + '60', borderBottomWidth: 0.5 },
      ]}
    >
      <Text style={[frow.label, { color: T.textSub }]} numberOfLines={2}>
        {label}
      </Text>
      <Text style={[frow.value, { color: color }]}>{dispVal}</Text>
    </View>
  );
}
const frow = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  label: { fontSize: 13, flex: 1, paddingRight: 16 },
  value: { fontSize: 14, fontWeight: '800' },
});

function PhGauge({ ph, T }) {
  const cls = phClass(ph);
  const gaugeW = CONTENT_W - Spacing.md * 2;
  const pct = ph > 0 ? Math.min(1, ph / 14) : 0;
  const SEGS = [
    { x: 0, w: gaugeW * 0.22, color: '#DC2626', r: true },
    { x: gaugeW * 0.22, w: gaugeW * 0.1, color: '#EA580C', r: false },
    { x: gaugeW * 0.32, w: gaugeW * 0.14, color: '#CA8A04', r: false },
    { x: gaugeW * 0.46, w: gaugeW * 0.18, color: '#16A34A', r: false },
    { x: gaugeW * 0.64, w: gaugeW * 0.14, color: '#2563EB', r: false },
    { x: gaugeW * 0.78, w: gaugeW * 0.22, color: '#7C3AED', r: false },
  ];
  return (
    <View style={[gg.card, { backgroundColor: T.card, borderColor: T.border }]}>
      <View style={gg.hdr}>
        <Text style={[gg.title, { color: T.text }]}>pH Level</Text>
        <LevelBadge {...cls} />
      </View>
      <Text style={[gg.bigNum, { color: cls.color }]}>
        {ph > 0 ? ph.toFixed(2) : '—'}
      </Text>
      <View style={{ marginVertical: 10 }}>
        <Svg width={gaugeW} height={20}>
          {SEGS.map((seg, i) => (
            <Rect
              key={i}
              x={seg.x}
              y={4}
              width={seg.w}
              height={10}
              fill={seg.color}
              rx={seg.r || i === SEGS.length - 1 ? 5 : 0}
              ry={seg.r || i === SEGS.length - 1 ? 5 : 0}
            />
          ))}
          {ph > 0 && (
            <Rect
              x={pct * gaugeW - 1.5}
              y={0}
              width={3}
              height={20}
              fill={T.text ?? '#0F172A'}
              rx={2}
              ry={2}
            />
          )}
        </Svg>
        <View style={gg.scaleRow}>
          {['0', '2', '4', '6', '7', '8', '10', '12', '14'].map(v => (
            <Text key={v} style={[gg.tick, { color: T.muted }]}>
              {v}
            </Text>
          ))}
        </View>
      </View>
      <View style={gg.lblRow}>
        <Text style={[gg.lbl, { color: T.muted }]}>← Acidic</Text>
        <Text style={[gg.lbl, { color: T.muted }]}>Neutral</Text>
        <Text style={[gg.lbl, { color: T.muted }]}>Alkaline →</Text>
      </View>
    </View>
  );
}
const gg = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  hdr: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  title: { fontSize: 13, fontWeight: '800' },
  bigNum: { fontSize: 38, fontWeight: '900', letterSpacing: -1 },
  scaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 3,
  },
  tick: { fontSize: 9 },
  lblRow: { flexDirection: 'row', justifyContent: 'space-between' },
  lbl: { fontSize: 9 },
});

function NutrientDonut({ reading, T }) {
  const items = [
    { key: 'nitrogen', v: reading.nitrogen ?? 0, color: '#16A34A' },
    { key: 'phosphorous', v: reading.phosphorous ?? 0, color: '#2563EB' },
    { key: 'potassium', v: reading.potassium ?? 0, color: '#D97706' },
    { key: 'calcium', v: reading.calcium ?? 0, color: '#7C3AED' },
    { key: 'magnesium', v: reading.magnesium ?? 0, color: '#DC2626' },
    { key: 'sulphur', v: reading.sulphur ?? 0, color: '#0891B2' },
  ];
  const total = items.reduce((a, b) => a + b.v, 0);
  if (total === 0)
    return (
      <View style={[dt.empty, { borderColor: T.border }]}>
        <Icon
          name="chart-donut"
          size={28}
          color={T.muted}
          style={{ opacity: 0.3 }}
        />
        <Text style={[dt.emptyTxt, { color: T.muted }]}>
          No nutrient data yet
        </Text>
      </View>
    );
  const cx = 72,
    cy = 72,
    R = 58,
    ri = 32;
  let ang = -Math.PI / 2;
  const slices = items
    .filter(d => d.v > 0)
    .map(d => {
      const sw = (d.v / total) * 2 * Math.PI;
      const x1 = cx + R * Math.cos(ang),
        y1 = cy + R * Math.sin(ang);
      ang += sw;
      const x2 = cx + R * Math.cos(ang),
        y2 = cy + R * Math.sin(ang);
      const xi1 = cx + ri * Math.cos(ang - sw),
        yi1 = cy + ri * Math.sin(ang - sw);
      const xi2 = cx + ri * Math.cos(ang),
        yi2 = cy + ri * Math.sin(ang);
      return {
        ...d,
        d: `M${x1},${y1} A${R},${R},0,${
          sw > Math.PI ? 1 : 0
        },1,${x2},${y2} L${xi2},${yi2} A${ri},${ri},0,${
          sw > Math.PI ? 1 : 0
        },0,${xi1},${yi1} Z`,
      };
    });
  return (
    <View style={dt.wrap}>
      <Svg width={144} height={144}>
        {slices.map((sl, i) => (
          <Path key={i} d={sl.d} fill={sl.color} />
        ))}
        <SvgText
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          fontSize={14}
          fontWeight="700"
          fill={T.text ?? '#0F172A'}
        >
          {Math.round(total)}
        </SvgText>
        <SvgText
          x={cx}
          y={cy + 11}
          textAnchor="middle"
          fontSize={9}
          fill={T.muted ?? '#94A3B8'}
        >
          total
        </SvgText>
      </Svg>
      <View style={dt.legend}>
        {items
          .filter(d => d.v > 0)
          .map(d => (
            <View key={d.key} style={dt.row}>
              <View style={[dt.dot, { backgroundColor: d.color }]} />
              <Text style={[dt.txt, { color: T.textSub }]}>
                {d.key.slice(0, 2).toUpperCase()}:{' '}
                <Text style={{ color: T.text, fontWeight: '700' }}>{d.v}</Text>
              </Text>
            </View>
          ))}
      </View>
    </View>
  );
}
const dt = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 80,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  emptyTxt: { fontSize: 12, marginTop: 6 },
  legend: { flex: 1, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  txt: { fontSize: 12 },
});

function BarChart({ data, color, T }) {
  const maxVal = Math.max(...data.map(d => d.v), 1);
  const bw = Math.floor(
    (CONTENT_W - Spacing.md * 2 - (data.length - 1) * 3) / data.length,
  );
  const CH = 70;
  return (
    <Svg width={CONTENT_W - Spacing.md * 2} height={CH + 16}>
      {data.map((d, i) => {
        const h = d.v > 0 ? Math.max(3, (d.v / maxVal) * CH) : 0;
        const x = i * (bw + 3);
        return (
          <G key={i}>
            <Rect
              x={x}
              y={CH - h}
              width={bw}
              height={h || 2}
              fill={d.v > 0 ? color : '#E2E8F0'}
              rx={2}
              ry={2}
            />
            <SvgText
              x={x + bw / 2}
              y={CH + 13}
              textAnchor="middle"
              fontSize={8}
              fill={T.muted ?? '#94A3B8'}
            >
              {d.key}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

function SectionCard({ title, icon, color, children, T }) {
  return (
    <View style={[sc.card, { backgroundColor: T.card, borderColor: T.border }]}>
      <View style={[sc.hdr, { borderBottomColor: T.border }]}>
        <View style={[sc.ico, { backgroundColor: color + '18' }]}>
          <Icon name={icon} size={14} color={color} />
        </View>
        <Text style={[sc.title, { color: T.text }]}>{title}</Text>
      </View>
      <View style={sc.body}>{children}</View>
    </View>
  );
}
const sc = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  hdr: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: Spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  ico: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 14, fontWeight: '800' },
  body: { padding: Spacing.md },
});

function InfoRow({ icon, label, value, T, last }) {
  return (
    <View
      style={[
        ri.row,
        !last && { borderBottomColor: T.border, borderBottomWidth: 0.5 },
      ]}
    >
      <Icon name={icon} size={14} color={T.muted} />
      <Text style={[ri.label, { color: T.muted }]}>{label}</Text>
      <Text style={[ri.value, { color: T.text }]} numberOfLines={2}>
        {value ?? '—'}
      </Text>
    </View>
  );
}
const ri = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 9,
  },
  label: { fontSize: 12, width: 90, flexShrink: 0 },
  value: { flex: 1, fontSize: 13, fontWeight: '700', textAlign: 'right' },
});

function MiniStat({ label, value, color, T }) {
  return (
    <View style={[ms.card, { backgroundColor: T.card, borderColor: T.border }]}>
      <Text
        style={[ms.val, { color: color ?? T.primary }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
      >
        {value}
      </Text>
      <Text style={[ms.lbl, { color: T.muted }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}
const ms = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 8,
    alignItems: 'center',
    ...Shadow.sm,
  },
  val: { fontSize: 17, fontWeight: '900', marginBottom: 3 },
  lbl: { fontSize: 9, fontWeight: '600', textAlign: 'center' },
});

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ReadingDetailScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const T = theme.colors;

  const {
    readingId,
    deviceId,
    deviceType,
    deviceName,
    reading: passed,
    schema: passedSchema, // schema passed from DeviceReadingsScreen
  } = route.params;

  const isSoil = deviceType === 'soilsaathi';
  const meta = isSoil
    ? { color: '#16A34A', icon: 'flask-outline' }
    : { color: '#2563EB', icon: 'water-check-outline' };

  const { selectedReading, selectedReadingLoading } = useSelector(
    s => s.reports,
  );
  const schemaSlot = useSelector(s => s.reports.schemas?.[deviceType]);
  const reduxSchema = schemaSlot?.schema ?? null;

  // Prefer passed schema (already loaded), fallback to Redux, fallback to null
  const schema = passedSchema ?? reduxSchema;

  const reading = selectedReading ?? passed;
  const [activeTab, setActiveTab] = useState(0);

  const TABS = isSoil
    ? ['Overview', 'Primary', 'Secondary', 'Chart']
    : ['Overview', 'All Fields'];

  useEffect(() => {
    dispatch(fetchReadingDetail(deviceId, readingId));
    // Fetch schema if not available
    if (!schema && !schemaSlot?.loading) {
      dispatch(fetchDeviceFieldSchema(deviceType));
    }
    return () => dispatch(clearSelectedReading());
  }, [deviceId, readingId, deviceType, dispatch]);

  // ── Derive sorted field list from schema for non-soil devices ───────────────
  // Separates field1…fieldN from geo keys
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

  // ── soilsaathi primary + secondary ─────────────────────────────────────────
  const soilPrimary = useMemo(() => {
    if (!isSoil || !schema)
      return [
        {
          label: 'Nitrogen (N) kg/ha',
          v: reading?.nitrogen,
          unit: '',
          key: 'nitrogen',
        },
        {
          label: 'Phosphorous (P) kg/ha',
          v: reading?.phosphorous,
          unit: '',
          key: 'phosphorous',
        },
        {
          label: 'Potassium (K) kg/ha',
          v: reading?.potassium,
          unit: '',
          key: 'potassium',
        },
        { label: 'pH', v: reading?.ph, unit: '', key: 'ph' },
        { label: 'EC dS/m', v: reading?.ec, unit: '', key: 'ec' },
        { label: 'OC %', v: reading?.oc, unit: '%', key: 'oc' },
      ];
    // Use schema labels where available
    const labelOf = key => schema[key] ?? key;
    return [
      {
        label: labelOf('nitrogen'),
        v: reading?.nitrogen,
        unit: '',
        key: 'nitrogen',
      },
      {
        label: labelOf('phosphorous'),
        v: reading?.phosphorous,
        unit: '',
        key: 'phosphorous',
      },
      {
        label: labelOf('potassium'),
        v: reading?.potassium,
        unit: '',
        key: 'potassium',
      },
      { label: labelOf('ph'), v: reading?.ph, unit: '', key: 'ph' },
      { label: labelOf('ec'), v: reading?.ec, unit: '', key: 'ec' },
      { label: labelOf('oc') ?? 'OC %', v: reading?.oc, unit: '%', key: 'oc' },
    ];
  }, [isSoil, schema, reading]);

  const soilSecondary = useMemo(() => {
    const labelOf = key => schema?.[key] ?? key;
    return [
      {
        label: labelOf('calcium'),
        v: reading?.calcium,
        unit: '',
        key: 'calcium',
      },
      {
        label: labelOf('magnesium'),
        v: reading?.magnesium,
        unit: '',
        key: 'magnesium',
      },
      {
        label: labelOf('sulphur') ?? 'Sulphur',
        v: reading?.sulphur,
        unit: ' ppm',
        key: 'sulphur',
      },
      {
        label: labelOf('zinc') ?? 'Zinc',
        v: reading?.zinc,
        unit: ' ppm',
        key: 'zinc',
      },
      {
        label: labelOf('manganese') ?? 'Manganese',
        v: reading?.manganese,
        unit: ' ppm',
        key: 'manganese',
      },
      {
        label: labelOf('iron') ?? 'Iron',
        v: reading?.iron,
        unit: ' ppm',
        key: 'iron',
      },
      {
        label: labelOf('copper') ?? 'Copper',
        v: reading?.copper,
        unit: ' ppm',
        key: 'copper',
      },
      {
        label: labelOf('boron') ?? 'Boron',
        v: reading?.boron,
        unit: ' ppm',
        key: 'boron',
      },
      {
        label: 'Electrical cond.',
        v: reading?.electrical_conduction,
        unit: '',
        key: 'electrical_conduction',
      },
    ];
  }, [schema, reading]);

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
  const phVal = reading.ph ?? reading.ph_value ?? reading.field1 ?? 0;
  const ecVal = reading.ec ?? reading.ec_value ?? reading.field3 ?? 0;
  const phCls = phClass(phVal);
  const ecCls = ecClass(ecVal);

  // ── soilsaathi tabs ─────────────────────────────────────────────────────────
  const renderSoilTab = () => {
    switch (activeTab) {
      case 0:
        return (
          <>
            <View style={s.statRow}>
              <MiniStat
                label={schema?.nitrogen ? 'N' : 'Nitrogen'}
                value={`${reading.nitrogen ?? 0}`}
                color="#16A34A"
                T={T}
              />
              <MiniStat
                label="pH"
                value={fmt(reading.ph)}
                color={phCls.color}
                T={T}
              />
              <MiniStat
                label="EC dS/m"
                value={fmt(reading.ec)}
                color="#D97706"
                T={T}
              />
              <MiniStat
                label="OC %"
                value={fmt(reading.oc, 3)}
                color="#7C3AED"
                T={T}
              />
            </View>
            <SectionCard
              title="Nutrient breakdown"
              icon="chart-donut"
              color={meta.color}
              T={T}
            >
              <NutrientDonut reading={reading} T={T} />
            </SectionCard>
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
                label="Date"
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
            title="Primary nutrients"
            icon="flask-outline"
            color={meta.color}
            T={T}
          >
            {soilPrimary.map(n => (
              <NutrientRow
                key={n.key}
                label={n.label}
                value={n.v}
                unit={n.unit}
                dataKey={n.key}
                T={T}
              />
            ))}
          </SectionCard>
        );
      case 2:
        return (
          <SectionCard
            title="Secondary & micro nutrients"
            icon="atom"
            color={meta.color}
            T={T}
          >
            {soilSecondary.map(n => (
              <NutrientRow
                key={n.key}
                label={n.label}
                value={n.v}
                unit={n.unit}
                dataKey={n.key}
                T={T}
              />
            ))}
          </SectionCard>
        );
      case 3: {
        const barData = [
          { key: 'N', v: reading.nitrogen ?? 0 },
          { key: 'P', v: reading.phosphorous ?? 0 },
          { key: 'K', v: reading.potassium ?? 0 },
          { key: 'Ca', v: reading.calcium ?? 0 },
          { key: 'Mg', v: reading.magnesium ?? 0 },
          { key: 'S', v: reading.sulphur ?? 0 },
          { key: 'Zn', v: reading.zinc ?? 0 },
          { key: 'Mn', v: reading.manganese ?? 0 },
          { key: 'Fe', v: reading.iron ?? 0 },
          { key: 'Cu', v: reading.copper ?? 0 },
          { key: 'B', v: reading.boron ?? 0 },
        ];
        return (
          <>
            <SectionCard
              title="Nutrient levels"
              icon="chart-bar"
              color={meta.color}
              T={T}
            >
              <BarChart data={barData} color={meta.color} T={T} />
            </SectionCard>
            <View style={s.clsRow}>
              <View
                style={[
                  s.clsCard,
                  { backgroundColor: T.card, borderColor: T.border },
                ]}
              >
                <Text style={[s.clsLbl, { color: T.muted }]}>pH</Text>
                <Text style={[s.clsVal, { color: phCls.color }]}>
                  {fmt(reading.ph)}
                </Text>
                <LevelBadge {...phCls} />
              </View>
              <View
                style={[
                  s.clsCard,
                  { backgroundColor: T.card, borderColor: T.border },
                ]}
              >
                <Text style={[s.clsLbl, { color: T.muted }]}>EC dS/m</Text>
                <Text style={[s.clsVal, { color: ecCls.color }]}>
                  {fmt(reading.ec)}
                </Text>
                <LevelBadge {...ecCls} />
              </View>
            </View>
          </>
        );
      }
      default:
        return null;
    }
  };

  // ── Generic device tabs (ph_bottle, atmo_sense, soil_life, …) ───────────────
  const renderGenericTab = () => {
    // Try to find a pH-like field and EC-like field from schema labels
    const phKey = dataFields.find(
      f => /pH/i.test(f.label) && !/volt/i.test(f.label),
    )?.key;
    const ecKey = dataFields.find(
      f => /EC|conductiv/i.test(f.label) && !/volt/i.test(f.label),
    )?.key;
    const phValue = phKey ? Number(reading[phKey] ?? 0) : phVal;
    const ecValue = ecKey ? Number(reading[ecKey] ?? 0) : ecVal;

    switch (activeTab) {
      case 0:
        return (
          <>
            {/* Mini stat row — first 4 data fields */}
            {dataFields.length > 0 && (
              <View style={s.statRow}>
                {dataFields.slice(0, 4).map((f, i) => {
                  const colors = ['#2563EB', '#16A34A', '#7C3AED', '#0891B2'];
                  const v = reading[f.key];
                  return (
                    <MiniStat
                      key={f.key}
                      label={f.label.split(' ')[0]}
                      value={v != null ? Number(v).toFixed(2) : '—'}
                      color={colors[i % colors.length]}
                      T={T}
                    />
                  );
                })}
              </View>
            )}

            {/* Schema loading */}
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

            {/* pH gauge if a pH-like field exists */}
            {phKey && <PhGauge ph={phValue} T={T} />}

            {/* EC card if an EC-like field exists */}
            {ecKey && (
              <SectionCard
                title={
                  dataFields.find(f => f.key === ecKey)?.label ?? 'Conductivity'
                }
                icon="lightning-bolt-outline"
                color={ecClass(ecValue).color}
                T={T}
              >
                <View style={s.ecRow}>
                  <Text style={[s.ecVal, { color: ecClass(ecValue).color }]}>
                    {fmt(ecValue)} dS/m
                  </Text>
                  <LevelBadge {...ecClass(ecValue)} />
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

      case 1:
        return (
          <>
            {/* All data fields from schema */}
            {dataFields.length > 0 ? (
              <SectionCard
                title="All fields"
                icon="database-outline"
                color={meta.color}
                T={T}
              >
                {dataFields.map((f, i) => {
                  const val = reading[f.key];
                  const colors = [
                    '#2563EB',
                    '#16A34A',
                    '#7C3AED',
                    '#0891B2',
                    '#D97706',
                    '#DC2626',
                  ];
                  return (
                    <FieldRow
                      key={f.key}
                      label={f.label}
                      value={val}
                      color={colors[i % colors.length]}
                      T={T}
                      last={
                        i === dataFields.length - 1 && geoFields.length === 0
                      }
                    />
                  );
                })}
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
        {isSoil ? renderSoilTab() : renderGenericTab()}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: Spacing.lg, paddingTop: Spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

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

  clsRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  clsCard: {
    flex: 1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 6,
    ...Shadow.sm,
  },
  clsLbl: { fontSize: 11, fontWeight: '600' },
  clsVal: { fontSize: 22, fontWeight: '900' },

  ecRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  ecVal: { fontSize: 22, fontWeight: '900' },
  ecRange: { fontSize: 11 },
});
