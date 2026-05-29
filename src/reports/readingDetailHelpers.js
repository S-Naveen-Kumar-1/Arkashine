// src/screens/reports/readingDetailHelpers.js
//
// Shared helpers, classifiers, UI components and styles used by
// SoilSaathiDetailScreen and GenericDeviceDetailScreen.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Svg, { G, Path, Text as SvgText, Rect } from 'react-native-svg';
import { Radius, Spacing, Shadow } from '../theme';
import { Dimensions } from 'react-native';

export const { width: SCREEN_W } = Dimensions.get('window');
export const CONTENT_W = SCREEN_W - Spacing.lg * 2;

// Keys to skip in "All Fields" tab
export const META_KEYS = new Set([
  'area_name',
  'tag',
  'crop_type',
  'created_at',
  'latitude',
  'longitude',
  'id',
]);

// ─── Formatters ───────────────────────────────────────────────────────────────

export const fmt = (v, d = 2) =>
  v == null ? '—' : isNaN(Number(v)) ? String(v) : Number(v).toFixed(d);

// ─── Classifiers ─────────────────────────────────────────────────────────────

export function phClass(ph) {
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

export function ecClass(ec) {
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

export function nutrientLevel(key, value) {
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

// ─── LevelBadge ──────────────────────────────────────────────────────────────

export function LevelBadge({ label, bg, text }) {
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

// ─── NutrientRow ─────────────────────────────────────────────────────────────

export function NutrientRow({ label, value, unit = '', dataKey, T }) {
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
    <View style={[nrS.row, { borderBottomColor: T.border + '60' }]}>
      <Text style={[nrS.label, { color: T.textSub }]} numberOfLines={2}>
        {label}
      </Text>
      <View
        style={[nrS.barBg, { backgroundColor: T.border + '80', width: BAR_W }]}
      >
        <View
          style={[nrS.fill, { width: BAR_W * pct, backgroundColor: cls.color }]}
        />
      </View>
      <Text style={[nrS.val, { color: T.text }]}>{dispVal}</Text>
      <LevelBadge {...cls} />
    </View>
  );
}
const nrS = StyleSheet.create({
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

// ─── FieldRow (generic devices) ───────────────────────────────────────────────

export function FieldRow({ label, value, color, T, last }) {
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
        frS.row,
        !last && { borderBottomColor: T.border + '60', borderBottomWidth: 0.5 },
      ]}
    >
      <Text style={[frS.label, { color: T.textSub }]} numberOfLines={2}>
        {label}
      </Text>
      <Text style={[frS.value, { color }]}>{dispVal}</Text>
    </View>
  );
}
const frS = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  label: { fontSize: 13, flex: 1, paddingRight: 16 },
  value: { fontSize: 14, fontWeight: '800' },
});

// ─── PhGauge ──────────────────────────────────────────────────────────────────

export function PhGauge({ ph, T }) {
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
    <View
      style={[ggS.card, { backgroundColor: T.card, borderColor: T.border }]}
    >
      <View style={ggS.hdr}>
        <Text style={[ggS.title, { color: T.text }]}>pH Level</Text>
        <LevelBadge {...cls} />
      </View>
      <Text style={[ggS.bigNum, { color: cls.color }]}>
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
        <View style={ggS.scaleRow}>
          {['0', '2', '4', '6', '7', '8', '10', '12', '14'].map(v => (
            <Text key={v} style={[ggS.tick, { color: T.muted }]}>
              {v}
            </Text>
          ))}
        </View>
      </View>
      <View style={ggS.lblRow}>
        <Text style={[ggS.lbl, { color: T.muted }]}>← Acidic</Text>
        <Text style={[ggS.lbl, { color: T.muted }]}>Neutral</Text>
        <Text style={[ggS.lbl, { color: T.muted }]}>Alkaline →</Text>
      </View>
    </View>
  );
}
const ggS = StyleSheet.create({
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

// ─── NutrientDonut ────────────────────────────────────────────────────────────

export function NutrientDonut({ reading, T }) {
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
      <View style={[dtS.empty, { borderColor: T.border }]}>
        <Icon
          name="chart-donut"
          size={28}
          color={T.muted}
          style={{ opacity: 0.3 }}
        />
        <Text style={[dtS.emptyTxt, { color: T.muted }]}>
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
    <View style={dtS.wrap}>
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
      <View style={dtS.legend}>
        {items
          .filter(d => d.v > 0)
          .map(d => (
            <View key={d.key} style={dtS.row}>
              <View style={[dtS.dot, { backgroundColor: d.color }]} />
              <Text style={[dtS.txt, { color: T.textSub }]}>
                {d.key.slice(0, 2).toUpperCase()}:{' '}
                <Text style={{ color: T.text, fontWeight: '700' }}>{d.v}</Text>
              </Text>
            </View>
          ))}
      </View>
    </View>
  );
}
const dtS = StyleSheet.create({
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

// ─── BarChart ─────────────────────────────────────────────────────────────────

export function BarChart({ data, color, T }) {
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

// ─── SectionCard ─────────────────────────────────────────────────────────────

export function SectionCard({ title, icon, color, children, T }) {
  return (
    <View
      style={[scS.card, { backgroundColor: T.card, borderColor: T.border }]}
    >
      <View style={[scS.hdr, { borderBottomColor: T.border }]}>
        <View style={[scS.ico, { backgroundColor: color + '18' }]}>
          <Icon name={icon} size={14} color={color} />
        </View>
        <Text style={[scS.title, { color: T.text }]}>{title}</Text>
      </View>
      <View style={scS.body}>{children}</View>
    </View>
  );
}
const scS = StyleSheet.create({
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

// ─── InfoRow ─────────────────────────────────────────────────────────────────

export function InfoRow({ icon, label, value, T, last }) {
  return (
    <View
      style={[
        riS.row,
        !last && { borderBottomColor: T.border, borderBottomWidth: 0.5 },
      ]}
    >
      <Icon name={icon} size={14} color={T.muted} />
      <Text style={[riS.label, { color: T.muted }]}>{label}</Text>
      <Text style={[riS.value, { color: T.text }]} numberOfLines={2}>
        {value ?? '—'}
      </Text>
    </View>
  );
}
const riS = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 9,
  },
  label: { fontSize: 12, width: 90, flexShrink: 0 },
  value: { flex: 1, fontSize: 13, fontWeight: '700', textAlign: 'right' },
});

// ─── MiniStat ────────────────────────────────────────────────────────────────

export function MiniStat({ label, value, color, T }) {
  return (
    <View
      style={[msS.card, { backgroundColor: T.card, borderColor: T.border }]}
    >
      <Text
        style={[msS.val, { color: color ?? T.primary }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
      >
        {value}
      </Text>
      <Text style={[msS.lbl, { color: T.muted }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}
const msS = StyleSheet.create({
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
