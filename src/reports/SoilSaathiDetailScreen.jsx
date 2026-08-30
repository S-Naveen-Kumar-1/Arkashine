// src/screens/reports/SoilSaathiDetailScreen.jsx
//
// SoiLENZ (SoilSaathi) Complete Reading Detail Screen
// Tabs: Overview | Farmer | Crop Rec | Fertilizer | Crop Match | Yield Predictor
// Action Modals: NPK Chart | Full Chart | Fertilizer Doses | PDF Download

import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  TextInput,
} from 'react-native';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { Buffer } from 'buffer';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Svg, { G, Path, Text as SvgText, Rect, Circle } from 'react-native-svg';
import { Radius, Spacing, Shadow } from '../theme';
import { TopBar } from '../components/common';
import useTheme from '../hooks/useTheme';
import {
  fetchReadingDetail,
  clearSelectedReading,
  fetchDeviceFieldSchema,
} from '../redux/actions/reportsActions';
import {
  getSoilRecommendations,
  getSoilAIRecommendations,
  getSoilFertilizerRecommendation,
  getSoilCropMatch,
  getSoilYieldOptions,
  getSoilYieldPrediction,
  downloadSoilRecommendationPDF,
  downloadSoilDetailPDF,
} from '../redux/actions/soilsaathiActions';
import {
  fmt,
  phClass,
  ecClass,
  LevelBadge,
  NutrientRow,
  NutrientDonut,
  SectionCard,
  InfoRow,
  MiniStat,
  CONTENT_W,
  SCREEN_W,
} from './readingDetailHelpers';

// ─── Constants ────────────────────────────────────────────────────────────────

const DEVICE_COLOR = '#16A34A';
const TABS = [
  'Overview',
  'Farmer',
  'Crop Rec',
  'Fertilizer',
  'Crop Match',
  'Yield Predictor',
];

const FERT_META = {
  urea: { icon: 'water-outline', color: '#2563EB' },
  dap: { icon: 'molecule', color: '#7C3AED' },
  mop: { icon: 'leaf-outline', color: '#D97706' },
  ssp: { icon: 'flask-outline', color: '#0891B2' },
};
const DEFAULT_FERT_META = { icon: 'package-variant-closed', color: '#6B7280' };

// Nutrient optimal ranges
const RANGES = {
  nitrogen: { low: 280, high: 560, unit: 'kg/ha', max: 700 },
  phosphorous: { low: 22, high: 56, unit: 'kg/ha', max: 120 },
  potassium: { low: 141, high: 336, unit: 'kg/ha', max: 450 },
  ph: { low: 6.5, high: 7.3, unit: '', max: 14 },
  ec: { low: 1, high: 4, unit: 'dS/m', max: 10 },
  oc: { low: 0.5, high: 0.75, unit: '%', max: 3 },
  calcium: { low: 1.5, high: 5, unit: '', max: 10 },
  magnesium: { low: 1, high: 3, unit: '', max: 6 },
  sulphur: { low: 10, high: 20, unit: 'ppm', max: 50 },
  zinc: { low: 0.6, high: 1.5, unit: 'ppm', max: 5 },
  manganese: { low: 5, high: 20, unit: 'ppm', max: 50 },
  iron: { low: 6.5, high: 15, unit: 'ppm', max: 30 },
  copper: { low: 0.6, high: 2, unit: 'ppm', max: 5 },
  boron: { low: 0.5, high: 1.5, unit: 'ppm', max: 5 },
};

function levelFor(key, value) {
  const r = RANGES[key];
  if (!r || value == null || value === 0)
    return {
      label: 'No data',
      color: '#64748B',
      bg: '#F1F5F920',
      text: '#64748B',
    };
  if (value < r.low)
    return { label: 'Low', color: '#EF4444', bg: '#EF444420', text: '#EF4444' };
  if (value > r.high)
    return {
      label: 'High',
      color: '#F59E0B',
      bg: '#F59E0B20',
      text: '#F59E0B',
    };
  return {
    label: 'Optimal',
    color: '#16A34A',
    bg: '#16A34A20',
    text: '#16A34A',
  };
}

function parseFertLine(line) {
  const m = line.match(
    /^([^:]+):\s*([\d.]+)\s*kg\/acre\s*([\d.]+)\s*kg\/hectare/i,
  );
  if (m) return { name: m[1].trim(), acre: m[2], hectare: m[3] };
  return null;
}

function buildDonutPath(cx, cy, rOuter, rInner, startAngle, sweepAngle) {
  const endAngle = startAngle + sweepAngle;
  const largeArc = sweepAngle > Math.PI ? 1 : 0;
  const p1x = cx + rOuter * Math.cos(startAngle);
  const p1y = cy + rOuter * Math.sin(startAngle);
  const p2x = cx + rOuter * Math.cos(endAngle);
  const p2y = cy + rOuter * Math.sin(endAngle);
  const p3x = cx + rInner * Math.cos(endAngle);
  const p3y = cy + rInner * Math.sin(endAngle);
  const p4x = cx + rInner * Math.cos(startAngle);
  const p4y = cy + rInner * Math.sin(startAngle);

  return `M ${p1x} ${p1y} A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${p2x} ${p2y} L ${p3x} ${p3y} A ${rInner} ${rInner} 0 ${largeArc} 0 ${p4x} ${p4y} Z`;
}

// ─── PDFDownloadButton ─────────────────────────────────────────────────────────

function PDFDownloadButton({
  deviceId,
  readingId,
  T,
  dispatch,
  action,
  title,
  subtitle,
  fileName,
}) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const response = await dispatch(action(deviceId, readingId));
      const pdfData = response?.payload?.data;

      if (!pdfData) {
        throw new Error('No PDF data received');
      }

      const base64 = Buffer.from(pdfData, 'binary').toString('base64');
      const filePath =
        Platform.OS === 'android'
          ? `${RNFS.DownloadDirectoryPath}/${fileName}_${readingId}.pdf`
          : `${RNFS.DocumentDirectoryPath}/${fileName}_${readingId}.pdf`;

      await RNFS.writeFile(filePath, base64, 'base64');

      await Share.open({
        url: `file://${filePath}`,
        type: 'application/pdf',
        title: `Share ${title}`,
      });
    } catch (error) {
      if (error?.message && !error.message.includes('User did not share')) {
        Alert.alert('Error', 'Failed to download or share PDF report');
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[
        pdfs.card,
        { backgroundColor: T.card, borderColor: T.border },
      ]}
      onPress={handleDownload}
      disabled={downloading}
      activeOpacity={0.8}
    >
      <View style={[pdfs.ico, { backgroundColor: DEVICE_COLOR + '18' }]}>
        {downloading ? (
          <ActivityIndicator size="small" color={DEVICE_COLOR} />
        ) : (
          <Icon name="file-pdf-box" size={24} color={DEVICE_COLOR} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[pdfs.title, { color: T.text }]}>{title}</Text>
        <Text style={[pdfs.sub, { color: T.muted }]}>{subtitle}</Text>
      </View>
      <Icon name="download" size={18} color={DEVICE_COLOR} />
    </TouchableOpacity>
  );
}

const pdfs = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: 10,
    ...Shadow.sm,
  },
  ico: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 13, fontWeight: '700' },
  sub: { fontSize: 10, marginTop: 1 },
});

// ─── SoiLENZ Advisory Report Banner ──────────────────────────────────────────

function SoiLenzAdvisoryBanner({ deviceId, readingId, T, dispatch }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const response = await dispatch(
        downloadSoilRecommendationPDF(deviceId, readingId),
      );
      const pdfData = response?.payload?.data;
      if (!pdfData) throw new Error('No PDF data');

      const base64 = Buffer.from(pdfData, 'binary').toString('base64');
      const filePath =
        Platform.OS === 'android'
          ? `${RNFS.DownloadDirectoryPath}/SoiLENZ_Advisory_${readingId}.pdf`
          : `${RNFS.DocumentDirectoryPath}/SoiLENZ_Advisory_${readingId}.pdf`;

      await RNFS.writeFile(filePath, base64, 'base64');
      await Share.open({
        url: `file://${filePath}`,
        type: 'application/pdf',
        title: 'SoiLENZ Advisory Report',
      });
    } catch (e) {
      if (e?.message && !e.message.includes('User did not share')) {
        Alert.alert('Error', 'Failed to generate advisory report PDF');
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <View style={advBanner.wrap}>
      <View style={advBanner.headerRow}>
        <View style={advBanner.icoWrap}>
          <Icon name="file-document-outline" size={20} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={advBanner.title}>SoiLENZ Advisory Report</Text>
          <Text style={advBanner.subtitle}>
            6-page AI soil health PDF — crop suitability, amendment plan, carbon credit dashboard
          </Text>
        </View>
      </View>
      <View style={advBanner.btnRow}>
        <TouchableOpacity
          style={advBanner.downloadBtn}
          onPress={handleDownload}
          disabled={downloading}
          activeOpacity={0.85}
        >
          {downloading ? (
            <ActivityIndicator size="small" color="#064E3B" />
          ) : (
            <>
              <Icon name="download" size={14} color="#064E3B" />
              <Text style={advBanner.downloadBtnTxt}>Download PDF Report</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const advBanner = StyleSheet.create({
  wrap: {
    backgroundColor: '#065F46',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#047857',
    ...Shadow.md,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icoWrap: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  subtitle: {
    fontSize: 11,
    color: '#D1FAE5',
    marginTop: 2,
    lineHeight: 15,
  },
  btnRow: {
    flexDirection: 'row',
    marginTop: Spacing.sm,
    justifyContent: 'flex-end',
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#A7F3D0',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.md,
  },
  downloadBtnTxt: { fontSize: 12, fontWeight: '800', color: '#064E3B' },
});

// ─── NPK Donut Pie Chart ──────────────────────────────────────────────────────

function NPKPieChart({ reading, T }) {
  const n = reading?.nitrogen ?? 0;
  const p = reading?.phosphorous ?? 0;
  const k = reading?.potassium ?? 0;
  const total = n + p + k;

  const data = [
    { label: 'Nitrogen (N)', v: n, color: '#16A34A', abbr: 'N' },
    { label: 'Phosphorous (P)', v: p, color: '#2563EB', abbr: 'P' },
    { label: 'Potassium (K)', v: k, color: '#D97706', abbr: 'K' },
  ];

  const SIZE = 200;
  const cx = SIZE / 2,
    cy = SIZE / 2;
  const R = SIZE / 2 - 8,
    ri = SIZE / 2 - 38;

  let ang = -Math.PI / 2;
  const slices = data.map(d => {
    const sweep = total > 0 ? (d.v / total) * 2 * Math.PI : 0;
    const path =
      sweep > 0.005 ? buildDonutPath(cx, cy, R, ri, ang, sweep) : null;
    ang += sweep;
    return {
      ...d,
      pct: total > 0 ? Math.round((d.v / total) * 100) : 0,
      path,
    };
  });

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={SIZE} height={SIZE}>
        <Path
          d={buildDonutPath(cx, cy, R, ri, 0, 2 * Math.PI - 0.001)}
          fill={T.border + '40'}
        />
        {slices.map((sl, i) =>
          sl.path ? <Path key={i} d={sl.path} fill={sl.color} /> : null,
        )}
        <SvgText
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          fontSize={11}
          fill={T.muted ?? '#94A3B8'}
        >
          NPK Total
        </SvgText>
        <SvgText
          x={cx}
          y={cy + 12}
          textAnchor="middle"
          fontSize={18}
          fontWeight="900"
          fill={T.text ?? '#111'}
        >
          {total}
        </SvgText>
      </Svg>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 10,
          marginTop: 12,
          flexWrap: 'wrap',
        }}
      >
        {slices.map(d => (
          <View
            key={d.abbr}
            style={[
              npkStyle.chip,
              { backgroundColor: T.card, borderColor: T.border },
            ]}
          >
            <View style={[npkStyle.dot, { backgroundColor: d.color }]} />
            <Text style={[npkStyle.chipLbl, { color: T.text }]}>{d.label}:</Text>
            <Text style={[npkStyle.chipVal, { color: d.color }]}>{d.v}</Text>
            <Text style={[npkStyle.chipPct, { color: T.muted }]}>
              ({d.pct}%)
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const npkStyle = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  chipLbl: { fontSize: 11, fontWeight: '600' },
  chipVal: { fontSize: 11, fontWeight: '800' },
  chipPct: { fontSize: 10 },
});

// ─── AllValuesPieChart ────────────────────────────────────────────────────────

function AllValuesPieChart({ reading, T }) {
  const ALL_NUTRIENTS = [
    { key: 'nitrogen', label: 'Nitrogen', abbr: 'N', color: '#16A34A' },
    { key: 'phosphorous', label: 'Phosphorous', abbr: 'P', color: '#EF4444' },
    { key: 'potassium', label: 'Potassium', abbr: 'K', color: '#F97316' },
    { key: 'calcium', label: 'Calcium', abbr: 'Ca', color: '#EC4899' },
    { key: 'magnesium', label: 'Magnesium', abbr: 'Mg', color: '#F59E0B' },
    { key: 'sulphur', label: 'Sulphur', abbr: 'S', color: '#84CC16' },
    { key: 'zinc', label: 'Zinc', abbr: 'Zn', color: '#6366F1' },
    { key: 'manganese', label: 'Manganese', abbr: 'Mn', color: '#14B8A6' },
    { key: 'iron', label: 'Iron', abbr: 'Fe', color: '#E879F9' },
    { key: 'copper', label: 'Copper', abbr: 'Cu', color: '#2563EB' },
    { key: 'boron', label: 'Boron', abbr: 'B', color: '#22D3EE' },
    { key: 'ph', label: 'pH', abbr: 'pH', color: '#7C3AED' },
    { key: 'ec', label: 'EC', abbr: 'EC', color: '#0891B2' },
    { key: 'oc', label: 'OC', abbr: 'OC', color: '#D97706' },
    {
      key: 'electrical_conduction',
      label: 'Elec. Cond.',
      abbr: 'ElC',
      color: '#64748B',
    },
  ];

  const data = ALL_NUTRIENTS.map(n => ({
    ...n,
    v: reading?.[n.key] ?? 0,
  })).filter(n => n.v > 0);

  const total = data.reduce((s, d) => s + d.v, 0);

  const SIZE = 200;
  const cx = SIZE / 2,
    cy = SIZE / 2;
  const R = SIZE / 2 - 8,
    ri = SIZE / 2 - 40;

  let ang = -Math.PI / 2;
  const slices = data.map(d => {
    const sweep = total > 0 ? (d.v / total) * 2 * Math.PI : 0;
    const path =
      sweep > 0.005 ? buildDonutPath(cx, cy, R, ri, ang, sweep) : null;
    ang += sweep;
    return {
      ...d,
      pct: total > 0 ? Math.round((d.v / total) * 100) : 0,
      path,
    };
  });

  return (
    <View>
      <View style={{ alignItems: 'center', marginBottom: Spacing.md }}>
        <Svg width={SIZE} height={SIZE}>
          <Path
            d={buildDonutPath(cx, cy, R, ri, 0, 2 * Math.PI - 0.001)}
            fill={T.border + '40'}
          />
          {slices.map((sl, i) =>
            sl.path ? <Path key={i} d={sl.path} fill={sl.color} /> : null,
          )}
          <SvgText
            x={cx}
            y={cy - 8}
            textAnchor="middle"
            fontSize={11}
            fill={T.muted ?? '#94A3B8'}
          >
            All Nutrients
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
        </Svg>
      </View>

      {/* Legend grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {data.map(d => (
          <View
            key={d.key}
            style={[
              avp.legendChip,
              { backgroundColor: T.card, borderColor: T.border },
            ]}
          >
            <View style={[avp.dot, { backgroundColor: d.color }]} />
            <Text style={[avp.chipLabel, { color: T.muted }]}>{d.label}</Text>
            <Text style={[avp.chipVal, { color: d.color }]}>{d.v}</Text>
            <View style={[avp.pctBadge, { backgroundColor: d.color + '20' }]}>
              <Text style={[avp.pctTxt, { color: d.color }]}>{d.pct}%</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const avp = StyleSheet.create({
  legendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  dot: { width: 7, height: 7, borderRadius: 3.5, flexShrink: 0 },
  chipLabel: { fontSize: 10, fontWeight: '600' },
  chipVal: { fontSize: 10, fontWeight: '800' },
  pctBadge: { borderRadius: 4, paddingHorizontal: 3, paddingVertical: 1 },
  pctTxt: { fontSize: 8, fontWeight: '700' },
});

// ─── FertilizerYearCard & FYMCard ─────────────────────────────────────────────

function FertilizerYearCard({ group, isFirst, T }) {
  const [open, setOpen] = useState(isFirst);
  const yearMatch = group?.[0]?.match(/Year\s*(\d+)/i);
  const yearTitle = yearMatch ? `Year ${yearMatch[1]}` : 'Year plan';

  const rows = useMemo(
    () => group.map(parseFertLine).filter(Boolean),
    [group],
  );

  return (
    <View
      style={[
        fyc.card,
        { backgroundColor: T.card, borderColor: T.border },
      ]}
    >
      <TouchableOpacity
        style={[
          fyc.header,
          { borderBottomColor: open ? T.border : 'transparent' },
        ]}
        onPress={() => setOpen(v => !v)}
        activeOpacity={0.7}
      >
        <View style={[fyc.badge, { backgroundColor: DEVICE_COLOR + '18' }]}>
          <Text style={[fyc.badgeTxt, { color: DEVICE_COLOR }]}>
            {yearTitle}
          </Text>
        </View>
        <Text style={[fyc.summary, { color: T.muted }]}>
          {rows.length} fertilizers
        </Text>
        <Icon
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={T.muted}
        />
      </TouchableOpacity>

      {open && (
        <View style={fyc.body}>
          {rows.map((row, i) => {
            const meta =
              FERT_META[row.name.toLowerCase()] ?? DEFAULT_FERT_META;
            return (
              <View
                key={i}
                style={[
                  fyc.row,
                  i < rows.length - 1 && {
                    borderBottomColor: T.border,
                    borderBottomWidth: 0.5,
                  },
                ]}
              >
                <View
                  style={[fyc.rowIco, { backgroundColor: meta.color + '18' }]}
                >
                  <Icon name={meta.icon} size={15} color={meta.color} />
                </View>
                <Text style={[fyc.rowName, { color: T.text }]}>{row.name}</Text>
                <View style={fyc.rowDoses}>
                  <Text style={[fyc.doseMain, { color: meta.color }]}>
                    {row.acre}{' '}
                    <Text style={[fyc.doseUnit, { color: T.muted }]}>kg/ac</Text>
                  </Text>
                  <Text style={[fyc.doseSub, { color: T.muted }]}>
                    {row.hectare} kg/ha
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function FYMCard({ lines, T }) {
  const [open, setOpen] = useState(false);
  return (
    <View
      style={[
        fyc.card,
        { backgroundColor: T.card, borderColor: T.border },
      ]}
    >
      <TouchableOpacity
        style={[
          fyc.header,
          { borderBottomColor: open ? T.border : 'transparent' },
        ]}
        onPress={() => setOpen(v => !v)}
        activeOpacity={0.7}
      >
        <View style={[fyc.badge, { backgroundColor: '#F59E0B18' }]}>
          <Text style={[fyc.badgeTxt, { color: '#F59E0B' }]}>
            Remedy, Fertility & FYM
          </Text>
        </View>
        <Text style={[fyc.summary, { color: T.muted }]}>
          {lines.length} notes
        </Text>
        <Icon
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={T.muted}
        />
      </TouchableOpacity>

      {open && (
        <View style={fyc.body}>
          {lines.map((line, i) => (
            <View key={i} style={fyc.fymRow}>
              <View style={[fyc.bullet, { backgroundColor: '#F59E0B' }]} />
              <Text style={[fyc.fymTxt, { color: T.text }]}>{line}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const fyc = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: 8,
    borderBottomWidth: 1,
  },
  badge: { borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 4 },
  badgeTxt: { fontSize: 11, fontWeight: '700' },
  summary: { fontSize: 11, flex: 1, textAlign: 'right' },
  body: { paddingHorizontal: Spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  rowIco: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowName: { fontSize: 13, fontWeight: '600', flex: 1 },
  rowDoses: { alignItems: 'flex-end' },
  doseMain: { fontSize: 13, fontWeight: '800' },
  doseUnit: { fontSize: 10, fontWeight: '400' },
  doseSub: { fontSize: 10 },
  fymRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
    gap: 8,
  },
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 5 },
  fymTxt: { fontSize: 12, flex: 1, lineHeight: 17 },
});

// ─── AICropCard ───────────────────────────────────────────────────────────────

function AICropCard({ aiData, loading, error, T }) {
  if (loading) {
    return (
      <View
        style={[
          aic.card,
          { backgroundColor: T.card, borderColor: '#7C3AED30' },
        ]}
      >
        <View style={[aic.header, { borderBottomColor: T.border }]}>
          <View style={[aic.hdrIco, { backgroundColor: '#7C3AED18' }]}>
            <Icon name="brain" size={15} color="#7C3AED" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[aic.hdrTitle, { color: T.text }]}>
              AI Crop Recommendation
            </Text>
            <Text style={[aic.hdrSub, { color: T.muted }]}>
              ML model · soil nutrient analysis
            </Text>
          </View>
          <View
            style={[
              aic.aiBadge,
              { backgroundColor: '#7C3AED18', borderColor: '#7C3AED40' },
            ]}
          >
            <Icon name="chip" size={10} color="#7C3AED" />
            <Text style={[aic.aiBadgeTxt, { color: '#7C3AED' }]}>AI</Text>
          </View>
        </View>
        <View style={aic.stateRow}>
          <ActivityIndicator size="small" color="#7C3AED" />
          <Text style={[aic.stateTxt, { color: T.muted }]}>
            Running ML model on your soil data…
          </Text>
        </View>
      </View>
    );
  }
  if (error || !aiData) {
    return (
      <View
        style={[aic.card, { backgroundColor: T.card, borderColor: T.border }]}
      >
        <View style={[aic.header, { borderBottomColor: T.border }]}>
          <View style={[aic.hdrIco, { backgroundColor: '#7C3AED18' }]}>
            <Icon name="brain" size={15} color="#7C3AED" />
          </View>
          <Text style={[aic.hdrTitle, { color: T.text, flex: 1 }]}>
            AI Crop Recommendation
          </Text>
          <View
            style={[
              aic.aiBadge,
              { backgroundColor: '#7C3AED18', borderColor: '#7C3AED40' },
            ]}
          >
            <Icon name="chip" size={10} color="#7C3AED" />
            <Text style={[aic.aiBadgeTxt, { color: '#7C3AED' }]}>AI</Text>
          </View>
        </View>
        <View style={aic.stateRow}>
          <Icon name="alert-circle-outline" size={16} color="#EF4444" />
          <Text style={[aic.stateTxt, { color: '#EF4444' }]}>
            {error || 'AI recommendation unavailable for this reading'}
          </Text>
        </View>
      </View>
    );
  }

  const raw = aiData.recommended_crop ?? '—';
  const crop = raw.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const { nitrogen, phosphorous, potassium, ph } = aiData.input_nutrients ?? {};

  return (
    <View
      style={[
        aic.card,
        {
          backgroundColor: T.card,
          borderColor: '#7C3AED30',
          borderLeftColor: '#7C3AED',
          borderLeftWidth: 3,
        },
      ]}
    >
      <View style={[aic.header, { borderBottomColor: T.border }]}>
        <View style={[aic.hdrIco, { backgroundColor: '#7C3AED18' }]}>
          <Icon name="brain" size={15} color="#7C3AED" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[aic.hdrTitle, { color: T.text }]}>
            AI Crop Recommendation
          </Text>
          <Text style={[aic.hdrSub, { color: T.muted }]}>
            ML model · soil nutrient analysis
          </Text>
        </View>
        <View
          style={[
            aic.aiBadge,
            { backgroundColor: '#7C3AED18', borderColor: '#7C3AED40' },
          ]}
        >
          <Icon name="chip" size={10} color="#7C3AED" />
          <Text style={[aic.aiBadgeTxt, { color: '#7C3AED' }]}>AI</Text>
        </View>
      </View>

      <View style={[aic.cropRow, { borderBottomColor: T.border }]}>
        <View style={[aic.cropIcoWrap, { backgroundColor: '#16A34A18' }]}>
          <Icon name="sprout" size={32} color="#16A34A" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[aic.cropMeta, { color: T.muted }]}>
            Best matched crop
          </Text>
          <Text style={[aic.cropName, { color: T.text }]}>{crop}</Text>
        </View>
        <View
          style={[
            aic.matchBadge,
            { backgroundColor: '#16A34A18', borderColor: '#16A34A40' },
          ]}
        >
          <View style={[aic.matchDot, { backgroundColor: '#16A34A' }]} />
          <Text style={[aic.matchTxt, { color: '#16A34A' }]}>Best match</Text>
        </View>
      </View>

      {/* Input nutrients */}
      <View style={[aic.nutriHeader, { borderBottomColor: T.border }]}>
        <Text style={[aic.nutriHeaderTxt, { color: T.muted }]}>
          Nutrients used for prediction
        </Text>
      </View>
      <View style={aic.nutriGrid}>
        {[
          { label: 'Nitrogen', abbr: 'N', value: nitrogen, color: '#16A34A' },
          {
            label: 'Phosphorous',
            abbr: 'P',
            value: phosphorous,
            color: '#2563EB',
          },
          { label: 'Potassium', abbr: 'K', value: potassium, color: '#D97706' },
          { label: 'pH', abbr: 'pH', value: ph, color: '#7C3AED' },
        ].map((item, idx, arr) => (
          <View
            key={item.abbr}
            style={[
              aic.nutriCell,
              idx < arr.length - 1 && {
                borderRightColor: T.border + '60',
                borderRightWidth: 0.5,
              },
            ]}
          >
            <Text style={[aic.nutriAbbr, { color: item.color }]}>
              {item.abbr}
            </Text>
            <Text style={[aic.nutriVal, { color: T.text }]}>
              {item.value ?? '—'}
            </Text>
            <Text style={[aic.nutriLbl, { color: T.muted }]}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const aic = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  hdrIco: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hdrTitle: { fontSize: 13, fontWeight: '700' },
  hdrSub: { fontSize: 10, marginTop: 1 },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  aiBadgeTxt: { fontSize: 9, fontWeight: '800' },
  stateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: Spacing.md,
  },
  stateTxt: { fontSize: 12, fontWeight: '500' },
  cropRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: 12,
    borderBottomWidth: 1,
  },
  cropIcoWrap: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cropMeta: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  cropName: { fontSize: 18, fontWeight: '800', marginTop: 1 },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  matchDot: { width: 5, height: 5, borderRadius: 2.5 },
  matchTxt: { fontSize: 10, fontWeight: '700' },
  nutriHeader: { paddingHorizontal: Spacing.md, paddingTop: 8, paddingBottom: 4 },
  nutriHeaderTxt: { fontSize: 10, fontWeight: '600' },
  nutriGrid: { flexDirection: 'row', padding: Spacing.sm },
  nutriCell: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  nutriAbbr: { fontSize: 11, fontWeight: '800' },
  nutriVal: { fontSize: 14, fontWeight: '800', marginTop: 1 },
  nutriLbl: { fontSize: 9, marginTop: 1 },
});

// ─── TAB: Farmer ─────────────────────────────────────────────────────────────

function FarmerTabView({ reading, T }) {
  const farmer = reading?.farmer;

  if (!farmer) {
    return (
      <View style={[s.emptyWrap, { backgroundColor: T.card, borderColor: T.border }]}>
        <Icon name="account-off-outline" size={48} color={T.muted} />
        <Text style={[s.emptyTitle, { color: T.text }]}>No Farmer Linked</Text>
        <Text style={[s.emptySub, { color: T.muted }]}>
          This reading isn't linked to any farmer profile.
        </Text>
      </View>
    );
  }

  return (
    <SectionCard
      title="Farmer profile"
      icon="account-outline"
      color={DEVICE_COLOR}
      T={T}
    >
      <InfoRow icon="account" label="Name" value={farmer.farmer_name ?? farmer.name} T={T} />
      <InfoRow icon="phone-outline" label="Phone" value={farmer.phone ?? '—'} T={T} />
      <InfoRow icon="home-city-outline" label="Village" value={farmer.village ?? '—'} T={T} />
      <InfoRow icon="map-marker-radius-outline" label="Taluk" value={farmer.taluk ?? '—'} T={T} />
      <InfoRow
        icon="map-marker-outline"
        label="District, State"
        value={`${farmer.district ?? ''}${farmer.district && farmer.state ? ', ' : ''}${farmer.state ?? '—'}`}
        T={T}
      />
      <InfoRow icon="sprout-outline" label="Crop" value={farmer.crop ?? '—'} T={T} />
      <InfoRow
        icon="ruler-square"
        label="Land Area"
        value={farmer.land_area ? `${farmer.land_area} acres` : '—'}
        T={T}
      />
      <InfoRow icon="calendar-outline" label="Season" value={farmer.season ?? '—'} T={T} />
      <InfoRow icon="shield-check-outline" label="Status" value={farmer.status ?? 'Active'} T={T} last />
    </SectionCard>
  );
}

// ─── TAB: Crop Recommendation ────────────────────────────────────────────────

function CropRecommendationTabView({ reading, soilAIRecs, soilAIRecsLoading, soilAIRecsError, T }) {
  return (
    <View>
      <AICropCard
        aiData={soilAIRecs}
        loading={soilAIRecsLoading}
        error={soilAIRecsError}
        T={T}
      />

      <SectionCard
        title="Soil Nutrient Grid"
        icon="view-grid-outline"
        color="#7C3AED"
        T={T}
      >
        <View style={s.nutriTable}>
          {[
            { label: 'Nitrogen (N)', val: reading?.nitrogen, range: '280 - 560 kg/ha' },
            { label: 'Phosphorous (P)', val: reading?.phosphorous, range: '22 - 56 kg/ha' },
            { label: 'Potassium (K)', val: reading?.potassium, range: '141 - 336 kg/ha' },
            { label: 'pH', val: reading?.ph, range: '6.5 - 7.5' },
            { label: 'EC', val: reading?.ec, range: '0 - 4 dS/m' },
            { label: 'OC', val: reading?.oc ? `${reading.oc}%` : '0%', range: '0.5 - 0.75%' },
          ].map((item, idx, arr) => (
            <View
              key={item.label}
              style={[
                s.nutriTableRow,
                idx < arr.length - 1 && { borderBottomColor: T.border, borderBottomWidth: 1 },
              ]}
            >
              <Text style={[s.nutriTableLbl, { color: T.text }]}>{item.label}</Text>
              <Text style={[s.nutriTableVal, { color: DEVICE_COLOR }]}>{item.val ?? '0'}</Text>
              <Text style={[s.nutriTableRange, { color: T.muted }]}>Ideal: {item.range}</Text>
            </View>
          ))}
        </View>
      </SectionCard>
    </View>
  );
}

// ─── TAB: Fertilizer Advisory (RDF) ──────────────────────────────────────────

function FertilizerAdvisoryTabView({
  deviceId,
  readingId,
  reading,
  fertRec,
  fertRecLoading,
  fertRecError,
  soilRecs,
  soilRecsLoading,
  soilRecsError,
  dispatch,
  T,
}) {
  const [stateOverride, setStateOverride] = useState('');
  const [cropOverride, setCropOverride] = useState('');

  const handleCheck = () => {
    dispatch(
      getSoilFertilizerRecommendation(
        deviceId,
        readingId,
        stateOverride.trim() || undefined,
        cropOverride.trim() || undefined,
      ),
    ).catch(() => {});
  };

  const cropFert = soilRecs?.recommendations?.crop_fertilizer ?? [];
  const fymGroups = soilRecs?.recommendations?.fym ?? [];

  return (
    <View>
      {/* State & Crop Selector */}
      <View style={[s.filterCard, { backgroundColor: T.card, borderColor: T.border }]}>
        <Text style={[s.filterTitle, { color: T.text }]}>Check Advisory with Override</Text>
        <View style={s.filterInputsRow}>
          <TextInput
            style={[s.filterInput, { backgroundColor: T.bg, color: T.text, borderColor: T.border }]}
            placeholder="State (e.g. Karnataka)"
            placeholderTextColor={T.muted}
            value={stateOverride}
            onChangeText={setStateOverride}
          />
          <TextInput
            style={[s.filterInput, { backgroundColor: T.bg, color: T.text, borderColor: T.border }]}
            placeholder="Crop (e.g. Rice)"
            placeholderTextColor={T.muted}
            value={cropOverride}
            onChangeText={setCropOverride}
          />
          <TouchableOpacity
            style={[s.filterBtn, { backgroundColor: DEVICE_COLOR }]}
            onPress={handleCheck}
            activeOpacity={0.8}
          >
            <Icon name="check" size={16} color="#FFFFFF" />
            <Text style={s.filterBtnTxt}>Check</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Parameter Analysis Table */}
      {fertRecLoading ? (
        <View style={[s.loadingBox, { backgroundColor: T.card, borderColor: T.border }]}>
          <ActivityIndicator size="small" color={DEVICE_COLOR} />
          <Text style={[s.loadingTxt, { color: T.muted }]}>Computing RDF fertilizer advisory…</Text>
        </View>
      ) : fertRec && fertRec.param_results ? (
        <>
          <SectionCard
            title="Soil Parameter Analysis"
            icon="flask-outline"
            color="#2563EB"
            T={T}
          >
            <View style={s.tableWrap}>
              <View style={[s.tHead, { backgroundColor: T.border + '40' }]}>
                <Text style={[s.th, { flex: 2, color: T.muted }]}>Parameter</Text>
                <Text style={[s.th, { flex: 1.2, color: T.muted }]}>Value</Text>
                <Text style={[s.th, { flex: 1.5, color: T.muted }]}>Status</Text>
                <Text style={[s.th, { flex: 1.5, color: T.muted }]}>Dose</Text>
              </View>
              {fertRec.param_results.map((p, idx) => (
                <View
                  key={idx}
                  style={[
                    s.tRow,
                    idx < fertRec.param_results.length - 1 && { borderBottomColor: T.border, borderBottomWidth: 1 },
                  ]}
                >
                  <Text style={[s.td, { flex: 2, fontWeight: '700', color: T.text }]}>{p.label}</Text>
                  <Text style={[s.td, { flex: 1.2, color: T.text }]}>{p.value}</Text>
                  <View style={{ flex: 1.5 }}>
                    <View
                      style={[
                        s.statusPill,
                        {
                          backgroundColor:
                            p.status?.includes('Low') || p.status?.includes('Deficient')
                              ? '#EF444418'
                              : p.status?.includes('Medium') || p.status?.includes('Marginal')
                              ? '#F59E0B18'
                              : '#16A34A18',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          s.statusPillTxt,
                          {
                            color:
                              p.status?.includes('Low') || p.status?.includes('Deficient')
                                ? '#EF4444'
                                : p.status?.includes('Medium') || p.status?.includes('Marginal')
                                ? '#F59E0B'
                                : '#16A34A',
                          },
                        ]}
                      >
                        {p.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={[s.td, { flex: 1.5, color: DEVICE_COLOR, fontWeight: '700' }]}>
                    {p.dose || '—'}
                  </Text>
                </View>
              ))}
            </View>
          </SectionCard>

          {/* Standard RDF & Adjusted NPK */}
          <SectionCard
            title="RDF & Adjusted N:P:K"
            icon="scale-balance"
            color="#7C3AED"
            T={T}
          >
            <InfoRow
              icon="leaf"
              label={`Standard RDF (${fertRec.rdf_ratio ?? ''})`}
              value={`N ${fertRec.n_rdf ?? 0} : P ${fertRec.p_rdf ?? 0} : K ${fertRec.k_rdf ?? 0} kg/ha`}
              T={T}
            />
            <InfoRow
              icon="check-circle"
              label="Adjusted for soil status"
              value={`N ${fertRec.n_adj ?? 0} : P ${fertRec.p_adj ?? 0} : K ${fertRec.k_adj ?? 0} kg/ha`}
              T={T}
              last
            />
          </SectionCard>

          {/* Recommended Fertilizer kg/ha */}
          <SectionCard
            title="Recommended Fertilizer (kg/ha)"
            icon="cube-outline"
            color="#D97706"
            T={T}
          >
            <InfoRow
              icon="water-outline"
              label="Urea"
              value={`${fertRec.urea ?? 0} (default: ${fertRec.current_urea ?? 0})`}
              T={T}
            />
            <InfoRow
              icon="molecule"
              label="DAP"
              value={`${fertRec.dap ?? 0} (default: ${fertRec.current_dap ?? 0})`}
              T={T}
            />
            <InfoRow
              icon="leaf-outline"
              label="MOP"
              value={`${fertRec.mop ?? 0} (default: ${fertRec.current_mop ?? 0})`}
              T={T}
              last
            />
          </SectionCard>

          {/* Yield Comparison */}
          {(fertRec.normal_yield || fertRec.rec_yield) && (
            <SectionCard
              title="Estimated Yield (kg/ha)"
              icon="chart-timeline-variant"
              color="#059669"
              T={T}
            >
              <View style={s.yieldCompRow}>
                <View style={[s.yieldCompBox, { backgroundColor: T.border + '30' }]}>
                  <Text style={[s.yieldCompLbl, { color: T.muted }]}>Normal Practice</Text>
                  <Text style={[s.yieldCompVal, { color: T.text }]}>{fertRec.normal_yield ?? 0}</Text>
                  <Text style={[s.yieldCompUnit, { color: T.muted }]}>kg/ha</Text>
                </View>
                <Icon name="arrow-right-bold" size={24} color={DEVICE_COLOR} />
                <View style={[s.yieldCompBox, { backgroundColor: '#16A34A18' }]}>
                  <Text style={[s.yieldCompLbl, { color: DEVICE_COLOR }]}>Recommended</Text>
                  <Text style={[s.yieldCompVal, { color: DEVICE_COLOR }]}>{fertRec.rec_yield ?? 0}</Text>
                  <Text style={[s.yieldCompUnit, { color: DEVICE_COLOR }]}>kg/ha</Text>
                </View>
              </View>
            </SectionCard>
          )}
        </>
      ) : null}

      {/* Yearly Fertilizer Plan & FYM Cards */}
      {cropFert.length > 0 && (
        <>
          <View style={s.secHeader}>
            <Icon name="calendar-month-outline" size={16} color={DEVICE_COLOR} />
            <Text style={[s.secHeaderText, { color: T.text }]}>Yearly Fertilizer Plan</Text>
          </View>
          {cropFert.map((group, i) => (
            <FertilizerYearCard key={i} group={group} isFirst={i === 0} T={T} />
          ))}
        </>
      )}

      {fymGroups.length > 0 && (
        <>
          <View style={s.secHeader}>
            <Icon name="sprout" size={16} color="#F59E0B" />
            <Text style={[s.secHeaderText, { color: T.text }]}>Remedy & Target Yield</Text>
          </View>
          {fymGroups.map((group, i) => (
            <FYMCard key={i} lines={group} T={T} />
          ))}
        </>
      )}
    </View>
  );
}

// ─── TAB: Crop Match ─────────────────────────────────────────────────────────

function CropMatchTabView({
  deviceId,
  readingId,
  cropMatch,
  cropMatchLoading,
  cropMatchError,
  dispatch,
  T,
}) {
  const [stateOverride, setStateOverride] = useState('');
  const [expandedRank, setExpandedRank] = useState(1);

  const handleCheck = () => {
    dispatch(
      getSoilCropMatch(deviceId, readingId, stateOverride.trim() || undefined),
    ).catch(() => {});
  };

  const topCrops = cropMatch?.top_crops ?? [];

  return (
    <View>
      {/* State Filter Card */}
      <View style={[s.filterCard, { backgroundColor: T.card, borderColor: T.border }]}>
        <Text style={[s.filterTitle, { color: T.text }]}>
          Crop Suitability for State
        </Text>
        <View style={s.filterInputsRow}>
          <TextInput
            style={[s.filterInput, { backgroundColor: T.bg, color: T.text, borderColor: T.border }]}
            placeholder="State (e.g. Karnataka)"
            placeholderTextColor={T.muted}
            value={stateOverride}
            onChangeText={setStateOverride}
          />
          <TouchableOpacity
            style={[s.filterBtn, { backgroundColor: DEVICE_COLOR }]}
            onPress={handleCheck}
            activeOpacity={0.8}
          >
            <Icon name="check" size={16} color="#FFFFFF" />
            <Text style={s.filterBtnTxt}>Check</Text>
          </TouchableOpacity>
        </View>
        <Text style={[s.filterSub, { color: T.muted }]}>
          Scored directly against this reading's pH, EC, OC, N-P-K and micronutrients.
        </Text>
      </View>

      {cropMatchLoading ? (
        <View style={[s.loadingBox, { backgroundColor: T.card, borderColor: T.border }]}>
          <ActivityIndicator size="small" color={DEVICE_COLOR} />
          <Text style={[s.loadingTxt, { color: T.muted }]}>Matching best suited crops…</Text>
        </View>
      ) : cropMatchError ? (
        <View style={[s.errorBox, { backgroundColor: '#EF444410', borderColor: '#EF444430' }]}>
          <Icon name="alert-circle-outline" size={20} color="#EF4444" />
          <Text style={[s.errorTxt, { color: '#EF4444' }]}>{cropMatchError}</Text>
        </View>
      ) : topCrops.length > 0 ? (
        <>
          {/* Top 5 Table */}
          <SectionCard
            title={`Top 5 Matches — ${cropMatch?.state ?? 'Auto'}`}
            icon="format-list-numbered"
            color={DEVICE_COLOR}
            T={T}
          >
            <View style={s.tableWrap}>
              <View style={[s.tHead, { backgroundColor: T.border + '40' }]}>
                <Text style={[s.th, { flex: 0.6, color: T.muted }]}>#</Text>
                <Text style={[s.th, { flex: 2, color: T.muted }]}>Crop</Text>
                <Text style={[s.th, { flex: 1.8, color: T.muted }]}>Match Score</Text>
                <Text style={[s.th, { flex: 1, color: T.muted }]}>Temp</Text>
              </View>
              {topCrops.map(c => (
                <TouchableOpacity
                  key={c.rank}
                  style={[
                    s.tRow,
                    { borderBottomColor: T.border, borderBottomWidth: 1 },
                  ]}
                  onPress={() => setExpandedRank(c.rank === expandedRank ? null : c.rank)}
                >
                  <Text style={[s.td, { flex: 0.6, fontWeight: '800', color: DEVICE_COLOR }]}>
                    {c.rank}
                  </Text>
                  <View style={{ flex: 2 }}>
                    <Text style={[s.td, { fontWeight: '700', color: T.text }]}>{c.crop_name}</Text>
                    <Text style={{ fontSize: 9, color: T.muted }}>{c.category}</Text>
                  </View>
                  <View style={{ flex: 1.8 }}>
                    <View style={s.progressBarTrack}>
                      <View
                        style={[
                          s.progressBarFill,
                          {
                            width: `${c.score_pct}%`,
                            backgroundColor:
                              c.score_pct >= 75 ? '#16A34A' : c.score_pct >= 50 ? '#F59E0B' : '#EF4444',
                          },
                        ]}
                      />
                    </View>
                    <Text style={[s.scoreTxt, { color: T.muted }]}>{c.score_pct}%</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View
                      style={[
                        s.tempBadge,
                        {
                          backgroundColor:
                            c.weather_score?.status === 'ok' ? '#16A34A18' : '#F59E0B18',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          s.tempBadgeTxt,
                          {
                            color:
                              c.weather_score?.status === 'ok' ? '#16A34A' : '#F59E0B',
                          },
                        ]}
                      >
                        {c.weather_score?.status === 'ok' ? 'OK' : c.weather_score?.status ?? 'N/A'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </SectionCard>

          {/* Detailed Crop Cards */}
          {topCrops.map(c => {
            const isOpen = expandedRank === c.rank;
            return (
              <View
                key={c.rank}
                style={[s.cropCard, { backgroundColor: T.card, borderColor: T.border }]}
              >
                <TouchableOpacity
                  style={[s.cropCardHdr, { borderBottomColor: isOpen ? T.border : 'transparent' }]}
                  onPress={() => setExpandedRank(isOpen ? null : c.rank)}
                  activeOpacity={0.7}
                >
                  <View style={[s.cropRankBadge, { backgroundColor: DEVICE_COLOR + '18' }]}>
                    <Text style={[s.cropRankTxt, { color: DEVICE_COLOR }]}>#{c.rank}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.cropCardName, { color: T.text }]}>{c.crop_name}</Text>
                    <Text style={[s.cropCardSub, { color: T.muted }]}>
                      {c.category} · {c.zone_name} · Match {c.score_pct}%
                    </Text>
                  </View>
                  <Icon
                    name={isOpen ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={T.muted}
                  />
                </TouchableOpacity>

                {isOpen && (
                  <View style={s.cropCardBody}>
                    {/* Weather Bar */}
                    {c.weather_score && (
                      <View style={s.weatherBar}>
                        <Icon name="thermometer" size={14} color="#F59E0B" />
                        <Text style={[s.weatherTxt, { color: T.text }]}>
                          Ideal Temp: {c.weather_score.ideal_range}
                        </Text>
                        <Text style={[s.weatherScoreTxt, { color: DEVICE_COLOR }]}>
                          Compatibility: {c.weather_score.pct}%
                        </Text>
                      </View>
                    )}

                    {/* Crop Guide */}
                    {c.additional_info ? (
                      <View style={s.guideSec}>
                        <Text style={[s.guideTitle, { color: T.muted }]}>CROP GUIDE</Text>
                        <InfoRow icon="calendar-clock" label="Duration" value={c.additional_info.crop_duration} T={T} />
                        <InfoRow icon="weather-cloudy" label="Sowing Season" value={c.additional_info.best_sowing_season} T={T} />
                        <InfoRow icon="water" label="Water Req." value={c.additional_info.water_requirement} T={T} />
                        <InfoRow icon="bug-outline" label="Common Pests" value={c.additional_info.common_pests} T={T} />
                        <InfoRow icon="package-variant" label="Fertilizers" value={c.additional_info.recommended_fertilizers} T={T} />
                        <InfoRow icon="sickle" label="Harvest Time" value={c.additional_info.harvest_time} T={T} last />
                      </View>
                    ) : null}

                    {/* Deficiencies */}
                    <View style={s.defSec}>
                      <Text style={[s.guideTitle, { color: T.muted }]}>DEFICIENCIES VS IDEAL RANGE</Text>
                      {c.nutrient_deficiencies && c.nutrient_deficiencies.length > 0 ? (
                        c.nutrient_deficiencies.map((d, i) => (
                          <View key={i} style={s.defRow}>
                            <Icon name="alert-circle-outline" size={14} color="#EF4444" />
                            <Text style={[s.defTxt, { color: '#EF4444' }]}>{d}</Text>
                          </View>
                        ))
                      ) : (
                        <View style={s.defRow}>
                          <Icon name="check-circle-outline" size={14} color="#16A34A" />
                          <Text style={[s.defTxt, { color: '#16A34A' }]}>
                            All measured parameters are within optimal range!
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </>
      ) : null}
    </View>
  );
}

// ─── TAB: Yield Predictor (Matching User's Screenshot) ────────────────────────

function YieldPredictorTabView({
  deviceId,
  readingId,
  reading,
  yieldOptions,
  yieldOptionsLoading,
  yieldPrediction,
  yieldPredictionLoading,
  yieldPredictionError,
  dispatch,
  T,
}) {
  const hierarchy = useMemo(
    () => yieldOptions?.hierarchy ?? {},
    [yieldOptions?.hierarchy],
  );
  const prefill = yieldOptions?.prefill;

  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedCrop, setSelectedCrop] = useState('');
  const [cropSearch, setCropSearch] = useState('');
  const [showCropModal, setShowCropModal] = useState(false);

  // Soil parameters editable state
  const [soc, setSoc] = useState('');
  const [pH, setPH] = useState('');
  const [nVal, setNVal] = useState('');
  const [pVal, setPVal] = useState('');
  const [kVal, setKVal] = useState('');

  const [breakdownOpen, setBreakdownOpen] = useState(false);

  const readingOc = reading?.oc;
  const readingPh = reading?.ph;
  const readingN = reading?.nitrogen;
  const readingP = reading?.phosphorous;
  const readingK = reading?.potassium;

  // Initialize from prefill
  useEffect(() => {
    if (prefill) {
      if (prefill.state) setSelectedState(prefill.state);
      if (prefill.district) setSelectedDistrict(prefill.district);
      if (prefill.crop) {
        setSelectedCrop(prefill.crop);
        setCropSearch(prefill.crop);
      }
      setSoc(String(prefill.soc ?? readingOc ?? 0.5));
      setPH(String(prefill.pH ?? readingPh ?? 6.5));
      setNVal(String(prefill.N ?? readingN ?? 200));
      setPVal(String(prefill.P ?? readingP ?? 20));
      setKVal(String(prefill.K ?? readingK ?? 150));
    }
  }, [prefill, readingOc, readingPh, readingN, readingP, readingK]);

  // District options
  const districtList = useMemo(() => {
    if (!selectedState || !hierarchy[selectedState]) return [];
    return Object.keys(hierarchy[selectedState]).sort();
  }, [selectedState, hierarchy]);

  // Crop options
  const cropList = useMemo(() => {
    if (!selectedState || !selectedDistrict || !hierarchy[selectedState]?.[selectedDistrict])
      return [];
    return hierarchy[selectedState][selectedDistrict].sort();
  }, [selectedState, selectedDistrict, hierarchy]);

  const filteredCrops = useMemo(() => {
    if (!cropSearch) return cropList;
    return cropList.filter(c =>
      c.toLowerCase().includes(cropSearch.toLowerCase()),
    );
  }, [cropList, cropSearch]);
  }, [cropList, cropSearch]);

  const handleStateChange = st => {
    setSelectedState(st);
    setSelectedDistrict('');
    setSelectedCrop('');
    setCropSearch('');
  };

  const handleDistrictChange = dist => {
    setSelectedDistrict(dist);
    setSelectedCrop('');
    setCropSearch('');
  };

  const handleCropSelect = crop => {
    setSelectedCrop(crop);
    setCropSearch(crop);
    setShowCropModal(false);
  };

  const handleEstimateYield = () => {
    if (!selectedDistrict || !selectedCrop) {
      Alert.alert('Incomplete Fields', 'Please select State, District, and Crop.');
      return;
    }

    dispatch(
      getSoilYieldPrediction(deviceId, {
        callId: readingId,
        district: selectedDistrict,
        crop: selectedCrop,
        soc: parseFloat(soc) || undefined,
        pH: parseFloat(pH) || undefined,
        N: parseFloat(nVal) || undefined,
        P: parseFloat(pVal) || undefined,
        K: parseFloat(kVal) || undefined,
      }),
    ).catch(() => {});
  };

  const d = yieldPrediction?.data ?? null;

  return (
    <View>
      {/* Hero Header */}
      <View style={yp.hero}>
        <Text style={yp.heroTitle}>
          CROP YIELD <Text style={{ color: '#86EFAC' }}>PREDICTOR</Text>
        </Text>
        <Text style={yp.heroSub}>
          District-level • Yield gap decomposition model • this reading's own soil values + live satellite NDVI
        </Text>
      </View>

      {/* Location & Crop Card */}
      <View style={[yp.card, { backgroundColor: T.card, borderColor: T.border }]}>
        <View style={yp.cardHeader}>
          <Icon name="sprout" size={16} color={DEVICE_COLOR} />
          <Text style={[yp.cardTitle, { color: T.text }]}>LOCATION & CROP</Text>
        </View>

        {/* State */}
        <Text style={[yp.fieldLabel, { color: T.muted }]}>State</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={yp.chipsScroll}>
          {Object.keys(hierarchy).map(st => (
            <TouchableOpacity
              key={st}
              style={[
                yp.chip,
                {
                  backgroundColor: selectedState === st ? DEVICE_COLOR : T.bg,
                  borderColor: selectedState === st ? DEVICE_COLOR : T.border,
                },
              ]}
              onPress={() => handleStateChange(st)}
            >
              <Text
                style={[
                  yp.chipTxt,
                  { color: selectedState === st ? '#FFFFFF' : T.text },
                ]}
              >
                {st}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* District */}
        {districtList.length > 0 && (
          <>
            <Text style={[yp.fieldLabel, { color: T.muted, marginTop: 10 }]}>District</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={yp.chipsScroll}>
              {districtList.map(dist => (
                <TouchableOpacity
                  key={dist}
                  style={[
                    yp.chip,
                    {
                      backgroundColor: selectedDistrict === dist ? '#2563EB' : T.bg,
                      borderColor: selectedDistrict === dist ? '#2563EB' : T.border,
                    },
                  ]}
                  onPress={() => handleDistrictChange(dist)}
                >
                  <Text
                    style={[
                      yp.chipTxt,
                      { color: selectedDistrict === dist ? '#FFFFFF' : T.text },
                    ]}
                  >
                    {dist}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* Crop Selector Button */}
        <Text style={[yp.fieldLabel, { color: T.muted, marginTop: 10 }]}>Crop</Text>
        <TouchableOpacity
          style={[yp.cropPickerBtn, { backgroundColor: T.bg, borderColor: T.border }]}
          onPress={() => {
            if (!selectedDistrict) {
              Alert.alert('Notice', 'Please select a district first.');
              return;
            }
            setShowCropModal(true);
          }}
          activeOpacity={0.8}
        >
          <Text style={[yp.cropPickerTxt, { color: selectedCrop ? T.text : T.muted }]}>
            {selectedCrop || (selectedDistrict ? 'Select or search crop…' : '-- Select District first --')}
          </Text>
          <Icon name="magnify" size={18} color={T.muted} />
        </TouchableOpacity>

        <Text style={[yp.subHint, { color: T.muted }]}>
          State/district/crop are auto-detected from this reading's linked farmer profile and crop type where possible — override any of them above.
        </Text>
      </View>

      {/* Soil Parameters Card */}
      <View style={[yp.card, { backgroundColor: T.card, borderColor: T.border }]}>
        <View style={yp.cardHeader}>
          <Icon name="seed" size={16} color={DEVICE_COLOR} />
          <Text style={[yp.cardTitle, { color: T.text }]}>SOIL PARAMETERS — FROM THIS READING</Text>
        </View>

        <View style={yp.inputsGrid}>
          <View style={yp.inputCell}>
            <Text style={[yp.inputLabel, { color: T.muted }]}>SOC %</Text>
            <TextInput
              style={[yp.inputField, { backgroundColor: T.bg, color: T.text, borderColor: T.border }]}
              value={soc}
              onChangeText={setSoc}
              keyboardType="numeric"
            />
            <Text style={[yp.inputHint, { color: T.muted }]}>Organic carbon</Text>
          </View>

          <View style={yp.inputCell}>
            <Text style={[yp.inputLabel, { color: T.muted }]}>pH</Text>
            <TextInput
              style={[yp.inputField, { backgroundColor: T.bg, color: T.text, borderColor: T.border }]}
              value={pH}
              onChangeText={setPH}
              keyboardType="numeric"
            />
            <Text style={[yp.inputHint, { color: T.muted }]}>Optimal 6.5–7.5</Text>
          </View>

          <View style={yp.inputCell}>
            <Text style={[yp.inputLabel, { color: T.muted }]}>N kg/ha</Text>
            <TextInput
              style={[yp.inputField, { backgroundColor: T.bg, color: T.text, borderColor: T.border }]}
              value={nVal}
              onChangeText={setNVal}
              keyboardType="numeric"
            />
            <Text style={[yp.inputHint, { color: T.muted }]}>Nitrogen</Text>
          </View>

          <View style={yp.inputCell}>
            <Text style={[yp.inputLabel, { color: T.muted }]}>P kg/ha</Text>
            <TextInput
              style={[yp.inputField, { backgroundColor: T.bg, color: T.text, borderColor: T.border }]}
              value={pVal}
              onChangeText={setPVal}
              keyboardType="numeric"
            />
            <Text style={[yp.inputHint, { color: T.muted }]}>Phosphorus</Text>
          </View>

          <View style={yp.inputCell}>
            <Text style={[yp.inputLabel, { color: T.muted }]}>K kg/ha</Text>
            <TextInput
              style={[yp.inputField, { backgroundColor: T.bg, color: T.text, borderColor: T.border }]}
              value={kVal}
              onChangeText={setKVal}
              keyboardType="numeric"
            />
            <Text style={[yp.inputHint, { color: T.muted }]}>Potassium</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[yp.estimateBtn, { backgroundColor: DEVICE_COLOR }]}
          onPress={handleEstimateYield}
          disabled={yieldPredictionLoading}
          activeOpacity={0.85}
        >
          {yieldPredictionLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={yp.estimateBtnTxt}>Estimate Yield</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Yield Prediction Result */}
      {d && (
        <View style={[yp.resultCard, { backgroundColor: T.card, borderColor: '#16A34A50' }]}>
          {/* Yield Hero */}
          <View style={yp.heroNumberWrap}>
            <Text style={yp.yieldBigNumber}>{d.predicted_yield?.toFixed(0) ?? '—'}</Text>
            <Text style={yp.yieldUnitTxt}>kg / hectare</Text>
            <Text style={[yp.yieldContextTxt, { color: T.muted }]}>
              {d.district} • {d.crop} • {d.n_years} years of data
            </Text>
          </View>

          {/* Formula Decomposition Bar */}
          <View style={[yp.formulaBar, { backgroundColor: T.bg, borderColor: T.border }]}>
            <Text style={[yp.fNum, { color: DEVICE_COLOR }]}>{d.potential_yield?.toFixed(0)}</Text>
            <Text style={[yp.fOp, { color: T.muted }]}> × </Text>
            <Text style={[yp.fNum, { color: DEVICE_COLOR }]}>{d.soil_factor?.toFixed(3)}</Text>
            <Text style={[yp.fOp, { color: T.muted }]}> × </Text>
            <Text style={[yp.fNum, { color: DEVICE_COLOR }]}>{d.water_factor?.toFixed(3)}</Text>
            <Text style={[yp.fOp, { color: T.muted }]}> × </Text>
            <Text style={[yp.fNum, { color: DEVICE_COLOR }]}>{d.ndvi_factor?.toFixed(3)}</Text>
            <Text style={[yp.fOp, { color: T.text }]}> = </Text>
            <Text style={[yp.fNumEq, { color: DEVICE_COLOR }]}>
              {d.predicted_yield?.toFixed(0)} kg/ha
            </Text>
          </View>

          {/* 3 Factor Cards */}
          <View style={yp.factorsRow}>
            {/* Soil */}
            <View style={[yp.factorBox, { backgroundColor: T.bg, borderColor: T.border }]}>
              <Text style={[yp.factorLbl, { color: T.muted }]}>SOIL</Text>
              <Text style={[yp.factorVal, { color: '#16A34A' }]}>
                {(d.soil_factor * 100).toFixed(0)}%
              </Text>
              <View style={[yp.gradeBadge, { backgroundColor: '#16A34A18' }]}>
                <Text style={[yp.gradeBadgeTxt, { color: '#16A34A' }]}>
                  {d.soil?.grade ?? 'Good'}
                </Text>
              </View>
              <View style={yp.fProgressTrack}>
                <View
                  style={[yp.fProgressFill, { width: `${d.soil_factor * 100}%`, backgroundColor: '#16A34A' }]}
                />
              </View>
            </View>

            {/* Water */}
            <View style={[yp.factorBox, { backgroundColor: T.bg, borderColor: T.border }]}>
              <Text style={[yp.factorLbl, { color: T.muted }]}>WATER</Text>
              <Text style={[yp.factorVal, { color: '#2563EB' }]}>
                {(d.water_factor * 100).toFixed(0)}%
              </Text>
              <Text style={[yp.factorSubTxt, { color: T.muted }]}>
                Irrig: {d.irrigation_score?.toFixed(2)}
              </Text>
              <View style={yp.fProgressTrack}>
                <View
                  style={[yp.fProgressFill, { width: `${d.water_factor * 100}%`, backgroundColor: '#2563EB' }]}
                />
              </View>
            </View>

            {/* Vegetation (NDVI) */}
            <View style={[yp.factorBox, { backgroundColor: T.bg, borderColor: T.border }]}>
              <Text style={[yp.factorLbl, { color: T.muted }]}>NDVI</Text>
              <Text style={[yp.factorVal, { color: '#D97706' }]}>
                {(d.ndvi_factor * 100).toFixed(0)}%
              </Text>
              <Text style={[yp.factorSubTxt, { color: T.muted }]}>
                {d.ndvi_source || 'MODIS Live'}
              </Text>
              <View style={yp.fProgressTrack}>
                <View
                  style={[yp.fProgressFill, { width: `${d.ndvi_factor * 100}%`, backgroundColor: '#D97706' }]}
                />
              </View>
            </View>
          </View>

          {/* Detailed Breakdown Toggle */}
          <TouchableOpacity
            style={yp.breakdownToggle}
            onPress={() => setBreakdownOpen(v => !v)}
            activeOpacity={0.7}
          >
            <Icon
              name={breakdownOpen ? 'chevron-down' : 'chevron-right'}
              size={18}
              color={DEVICE_COLOR}
            />
            <Text style={[yp.breakdownToggleTxt, { color: DEVICE_COLOR }]}>
              Detailed Breakdown
            </Text>
          </TouchableOpacity>

          {breakdownOpen && (
            <View style={[yp.breakdownBody, { borderTopColor: T.border }]}>
              <InfoRow label="Potential Yield (historical avg)" value={`${d.potential_yield?.toFixed(0)} kg/ha`} T={T} />
              <InfoRow label="90th Percentile Yield" value={`${d.p90_yield?.toFixed(0)} kg/ha`} T={T} />
              <InfoRow label="All-time Max Yield" value={`${d.max_yield?.toFixed(0)} kg/ha`} T={T} />

              <Text style={[yp.bdSecTitle, { color: T.muted }]}>SOIL BREAKDOWN</Text>
              <InfoRow label="SOC (max 25)" value={`${d.soil?.soc?.toFixed(1) ?? '—'}`} T={T} />
              <InfoRow label="pH (max 25)" value={`${d.soil?.pH?.toFixed(1) ?? '—'}`} T={T} />
              <InfoRow label="Nitrogen (max 20)" value={`${d.soil?.N?.toFixed(1) ?? '—'}`} T={T} />
              <InfoRow label="Phosphorus (max 15)" value={`${d.soil?.P?.toFixed(1) ?? '—'}`} T={T} />
              <InfoRow label="Potassium (max 15)" value={`${d.soil?.K?.toFixed(1) ?? '—'}`} T={T} />

              <Text style={[yp.bdSecTitle, { color: T.muted }]}>WATER BREAKDOWN</Text>
              <InfoRow label="Historical Rainfall" value={`${d.hist_precip_mm?.toFixed(0)} mm`} T={T} />
              <InfoRow label="ET0" value={`${d.et0_mm?.toFixed(0)} mm`} T={T} />
              <InfoRow label="Rain water factor" value={`${d.hist_water_factor?.toFixed(3)}`} T={T} />
              <InfoRow label="Irrigation score" value={`${d.irrigation_score?.toFixed(3)}`} T={T} />

              <Text style={[yp.bdSecTitle, { color: T.muted }]}>VEGETATION (NDVI)</Text>
              <InfoRow label="Satellite Greenness Index" value={`${(d.ndvi_raw / 10000).toFixed(3)}`} T={T} />
              <InfoRow label="How this affects yield" value={`${(d.ndvi_factor * 100).toFixed(0)}% of potential`} T={T} />
              <InfoRow label="Source" value={d.ndvi_source || 'MODIS Live satellite'} T={T} last />
            </View>
          )}
        </View>
      )}

      {/* Crop Search Modal */}
      <Modal visible={showCropModal} transparent animationType="slide">
        <View style={yp.modalOverlay}>
          <View style={[yp.modalContent, { backgroundColor: T.card }]}>
            <View style={yp.modalHeader}>
              <Text style={[yp.modalTitle, { color: T.text }]}>Select Crop</Text>
              <TouchableOpacity onPress={() => setShowCropModal(false)}>
                <Icon name="close" size={22} color={T.muted} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[yp.modalSearchInput, { backgroundColor: T.bg, color: T.text, borderColor: T.border }]}
              placeholder="Type to filter crops…"
              placeholderTextColor={T.muted}
              value={cropSearch}
              onChangeText={setCropSearch}
              autoFocus
            />

            <ScrollView style={yp.modalList}>
              {filteredCrops.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[
                    yp.modalItem,
                    { borderBottomColor: T.border },
                    selectedCrop === c && { backgroundColor: DEVICE_COLOR + '18' },
                  ]}
                  onPress={() => handleCropSelect(c)}
                >
                  <Text
                    style={[
                      yp.modalItemTxt,
                      { color: selectedCrop === c ? DEVICE_COLOR : T.text },
                    ]}
                  >
                    {c}
                  </Text>
                  {selectedCrop === c && (
                    <Icon name="check" size={18} color={DEVICE_COLOR} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const yp = StyleSheet.create({
  hero: {
    backgroundColor: '#14532D',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    alignItems: 'center',
    ...Shadow.md,
  },
  heroTitle: { fontSize: 20, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.5 },
  heroSub: {
    fontSize: 11,
    color: '#D1FAE5',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  cardTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  fieldLabel: { fontSize: 11, fontWeight: '700', marginBottom: 4 },
  chipsScroll: { flexDirection: 'row', marginBottom: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    marginRight: 6,
  },
  chipTxt: { fontSize: 12, fontWeight: '600' },
  cropPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  cropPickerTxt: { fontSize: 13, fontWeight: '600' },
  subHint: { fontSize: 10, marginTop: 8, lineHeight: 14 },
  inputsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 },
  inputCell: { flex: 1, minWidth: 60 },
  inputLabel: { fontSize: 10, fontWeight: '700', marginBottom: 2 },
  inputField: {
    height: 38,
    borderRadius: Radius.sm,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '800',
    padding: 0,
  },
  inputHint: { fontSize: 8, textAlign: 'center', marginTop: 2 },
  estimateBtn: {
    borderRadius: Radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  estimateBtnTxt: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  resultCard: {
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadow.md,
  },
  heroNumberWrap: { alignItems: 'center', marginVertical: 8 },
  yieldBigNumber: { fontSize: 36, fontWeight: '900', color: DEVICE_COLOR },
  yieldUnitTxt: { fontSize: 12, fontWeight: '700', color: '#16A34A', textTransform: 'uppercase' },
  yieldContextTxt: { fontSize: 11, marginTop: 2 },
  formulaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    padding: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginVertical: 10,
  },
  fNum: { fontSize: 11, fontWeight: '800' },
  fOp: { fontSize: 11 },
  fNumEq: { fontSize: 12, fontWeight: '900' },
  factorsRow: { flexDirection: 'row', gap: 6, marginVertical: 6 },
  factorBox: {
    flex: 1,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 8,
    alignItems: 'center',
  },
  factorLbl: { fontSize: 9, fontWeight: '800' },
  factorVal: { fontSize: 16, fontWeight: '900', marginVertical: 2 },
  factorSubTxt: { fontSize: 8 },
  gradeBadge: { borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1, marginVertical: 2 },
  gradeBadgeTxt: { fontSize: 9, fontWeight: '800' },
  fProgressTrack: { width: '100%', height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, marginTop: 4 },
  fProgressFill: { height: '100%', borderRadius: 2 },
  breakdownToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    alignSelf: 'center',
  },
  breakdownToggleTxt: { fontSize: 12, fontWeight: '800' },
  breakdownBody: { marginTop: 10, borderTopWidth: 1, paddingTop: 8 },
  bdSecTitle: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5, marginTop: 8, marginBottom: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '75%',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalTitle: { fontSize: 16, fontWeight: '800' },
  modalSearchInput: {
    height: 40,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
    marginBottom: 10,
  },
  modalList: { maxHeight: 350 },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
  },
  modalItemTxt: { fontSize: 13, fontWeight: '600' },
});

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function SoilSaathiDetailScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const T = theme.colors;
  const tabScrollRef = useRef(null);

  const {
    readingId,
    deviceId,
    deviceType,
    deviceName,
    reading: passed,
    schema: passedSchema,
  } = route.params;

  const { selectedReading, selectedReadingLoading } = useSelector(
    s => s.reports,
  );
  const schemaSlot = useSelector(s => s.reports.schemas?.[deviceType]);
  const reduxSchema = schemaSlot?.schema ?? null;
  const schema = passedSchema ?? reduxSchema;

  // ── soilsaathi Redux state ─────────────────────────────────────────────────
  const soilState = useSelector(s => s.soilsaathi ?? {});
  const soilRecs = soilState.recommendations;
  const soilRecsLoading = soilState.recsStatus === 'loading';
  const soilRecsError =
    soilState.recsStatus === 'error' ? soilState.recsError : null;

  const soilAIRecs = soilState.aiRecommendations;
  const soilAIRecsLoading = soilState.aiRecsStatus === 'loading';
  const soilAIRecsError =
    soilState.aiRecsStatus === 'error' ? soilState.aiRecsError : null;

  const fertRec = soilState.fertilizerRec;
  const fertRecLoading = soilState.fertRecStatus === 'loading';
  const fertRecError =
    soilState.fertRecStatus === 'error' ? soilState.fertRecError : null;

  const cropMatch = soilState.cropMatch;
  const cropMatchLoading = soilState.cropMatchStatus === 'loading';
  const cropMatchError =
    soilState.cropMatchStatus === 'error' ? soilState.cropMatchError : null;

  const yieldOptions = soilState.yieldOptions;
  const yieldOptionsLoading = soilState.yieldOptionsStatus === 'loading';
  const yieldPrediction = soilState.yieldPrediction;
  const yieldPredictionLoading = soilState.yieldPredictionStatus === 'loading';
  const yieldPredictionError =
    soilState.yieldPredictionStatus === 'error'
      ? soilState.yieldPredictionError
      : null;

  const reading = selectedReading ?? passed;
  const [activeTab, setActiveTab] = useState(0);

  // Modals state
  const [showNPKModal, setShowNPKModal] = useState(false);
  const [showFullChartModal, setShowFullChartModal] = useState(false);
  const [showFertDosesModal, setShowFertDosesModal] = useState(false);

  // Fetch initial data gracefully
  useEffect(() => {
    dispatch(fetchReadingDetail(deviceId, readingId)).catch(() => {});
    if (!schema && !schemaSlot?.loading) {
      dispatch(fetchDeviceFieldSchema(deviceType)).catch(() => {});
    }
    dispatch(getSoilRecommendations(deviceId, readingId)).catch(() => {});
    dispatch(getSoilAIRecommendations(deviceId, readingId)).catch(() => {});
    dispatch(getSoilFertilizerRecommendation(deviceId, readingId)).catch(() => {});
    dispatch(getSoilCropMatch(deviceId, readingId)).catch(() => {});
    dispatch(getSoilYieldOptions(deviceId, readingId)).catch(() => {});

    return () => dispatch(clearSelectedReading());
  }, [deviceId, readingId, deviceType, dispatch, schema, schemaSlot?.loading]);

  const recordedAt = reading?.created_at ? new Date(reading.created_at) : new Date();
  const phVal = reading?.ph ?? 0;
  const phCls = phClass(phVal);

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

  const renderTab = () => {
    switch (activeTab) {
      // 0: Overview
      case 0: {
        const statItems = [
          { label: 'N', value: `${reading.nitrogen ?? 0}`, color: '#16A34A' },
          { label: 'pH', value: fmt(reading.ph), color: phCls.color },
          { label: 'EC', value: fmt(reading.ec), color: '#D97706' },
          { label: 'OC %', value: fmt(reading.oc, 3), color: '#7C3AED' },
        ];
        return (
          <>
            {/* SoiLENZ Advisory Report Banner */}
            <SoiLenzAdvisoryBanner
              deviceId={deviceId}
              readingId={readingId}
              T={T}
              dispatch={dispatch}
            />

            <View style={s.statRow}>
              {statItems.map(item => (
                <MiniStat
                  key={item.label}
                  label={item.label}
                  value={item.value}
                  color={item.color}
                  T={T}
                />
              ))}
            </View>

            <SectionCard
              title="Reading info"
              icon="information-outline"
              color={DEVICE_COLOR}
              T={T}
            >
              <InfoRow icon="cellphone-link" label="Device ID" value={reading.devise_id} T={T} />
              <InfoRow icon="barcode" label="Serial No" value={reading.serial_no} T={T} />
              <InfoRow icon="sprout-outline" label="Crop" value={reading.crop_type} T={T} />
              <InfoRow icon="map-marker-outline" label="Area" value={reading.area_name} T={T} />
              <InfoRow icon="tag-outline" label="Tag" value={reading.tag} T={T} />
              <InfoRow
                icon="crosshairs-gps"
                label="Location"
                value={reading.latitude && reading.longitude ? `${reading.latitude}, ${reading.longitude}` : '—'}
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

            <SectionCard
              title="Primary Nutrients"
              icon="leaf"
              color="#16A34A"
              T={T}
            >
              {[
                { label: 'Nitrogen (N)', val: reading.nitrogen, max: 560, color: '#16A34A' },
                { label: 'Phosphorous (P)', val: reading.phosphorous, max: 56, color: '#1565C0' },
                { label: 'Potassium (K)', val: reading.potassium, max: 336, color: '#E65100' },
                { label: 'pH', val: reading.ph, max: 14, color: '#6A1B9A' },
                { label: 'EC (dS/m)', val: reading.ec, max: 4, color: '#0277BD' },
                { label: 'OC (%)', val: reading.oc, max: 2, color: '#558B2F' },
              ].map((p, idx, arr) => (
                <View key={p.label} style={s.nutrientProgressRow}>
                  <View style={s.npHdr}>
                    <Text style={[s.npLbl, { color: T.text }]}>{p.label}</Text>
                    <Text style={[s.npVal, { color: p.color }]}>{p.val ?? 0}</Text>
                  </View>
                  <View style={[s.npTrack, { backgroundColor: T.border + '40' }]}>
                    <View
                      style={[
                        s.npFill,
                        {
                          width: `${Math.min(100, ((p.val ?? 0) / p.max) * 100)}%`,
                          backgroundColor: p.color,
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </SectionCard>

            <SectionCard
              title="Secondary & Micro Nutrients"
              icon="flask-outline"
              color="#0284C7"
              T={T}
            >
              {[
                { label: 'Electrical Conduction', val: reading.electrical_conduction, max: 4, color: '#546E7A' },
                { label: 'Calcium (meq/100g)', val: reading.calcium, max: 5, color: '#00838F' },
                { label: 'Magnesium (meq/100g)', val: reading.magnesium, max: 4, color: '#2E7D32' },
                { label: 'Sulphur (ppm)', val: reading.sulphur, max: 30, color: '#F57F17' },
                { label: 'Zinc (ppm)', val: reading.zinc, max: 3, color: '#6A1B9A' },
                { label: 'Boron (ppm)', val: reading.boron, max: 3, color: '#1565C0' },
                { label: 'Manganese (ppm)', val: reading.manganese, max: 12, color: '#BF360C' },
                { label: 'Iron (ppm)', val: reading.iron, max: 15, color: '#4E342E' },
                { label: 'Copper (ppm)', val: reading.copper, max: 3, color: '#E65100' },
              ].map((p, idx, arr) => (
                <View key={p.label} style={s.nutrientProgressRow}>
                  <View style={s.npHdr}>
                    <Text style={[s.npLbl, { color: T.text }]}>{p.label}</Text>
                    <Text style={[s.npVal, { color: p.color }]}>{p.val ?? 0}</Text>
                  </View>
                  <View style={[s.npTrack, { backgroundColor: T.border + '40' }]}>
                    <View
                      style={[
                        s.npFill,
                        {
                          width: `${Math.min(100, ((p.val ?? 0) / p.max) * 100)}%`,
                          backgroundColor: p.color,
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </SectionCard>
          </>
        );
      }

      // 1: Farmer
      case 1:
        return <FarmerTabView reading={reading} T={T} />;

      // 2: Crop Rec
      case 2:
        return (
          <CropRecommendationTabView
            reading={reading}
            soilAIRecs={soilAIRecs}
            soilAIRecsLoading={soilAIRecsLoading}
            soilAIRecsError={soilAIRecsError}
            T={T}
          />
        );

      // 3: Fertilizer
      case 3:
        return (
          <FertilizerAdvisoryTabView
            deviceId={deviceId}
            readingId={readingId}
            reading={reading}
            fertRec={fertRec}
            fertRecLoading={fertRecLoading}
            fertRecError={fertRecError}
            soilRecs={soilRecs}
            soilRecsLoading={soilRecsLoading}
            soilRecsError={soilRecsError}
            dispatch={dispatch}
            T={T}
          />
        );

      // 4: Crop Match
      case 4:
        return (
          <CropMatchTabView
            deviceId={deviceId}
            readingId={readingId}
            cropMatch={cropMatch}
            cropMatchLoading={cropMatchLoading}
            cropMatchError={cropMatchError}
            dispatch={dispatch}
            T={T}
          />
        );

      // 5: Yield Predictor
      case 5:
        return (
          <YieldPredictorTabView
            deviceId={deviceId}
            readingId={readingId}
            reading={reading}
            yieldOptions={yieldOptions}
            yieldOptionsLoading={yieldOptionsLoading}
            yieldPrediction={yieldPrediction}
            yieldPredictionLoading={yieldPredictionLoading}
            yieldPredictionError={yieldPredictionError}
            dispatch={dispatch}
            T={T}
          />
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

      {/* ── Quick Header Actions Bar ── */}
      <View style={[s.actionsBar, { backgroundColor: T.card, borderBottomColor: T.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.actionsContent}>
          <TouchableOpacity
            style={[s.actionPill, { backgroundColor: '#16A34A18', borderColor: '#16A34A40' }]}
            onPress={() => setShowNPKModal(true)}
            activeOpacity={0.7}
          >
            <Icon name="chart-donut" size={13} color="#16A34A" />
            <Text style={[s.actionPillTxt, { color: '#16A34A' }]}>NPK Chart</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.actionPill, { backgroundColor: '#7C3AED18', borderColor: '#7C3AED40' }]}
            onPress={() => setShowFullChartModal(true)}
            activeOpacity={0.7}
          >
            <Icon name="chart-pie" size={13} color="#7C3AED" />
            <Text style={[s.actionPillTxt, { color: '#7C3AED' }]}>Full Chart</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.actionPill, { backgroundColor: '#2563EB18', borderColor: '#2563EB40' }]}
            onPress={() => setShowFertDosesModal(true)}
            activeOpacity={0.7}
          >
            <Icon name="seed" size={13} color="#2563EB" />
            <Text style={[s.actionPillTxt, { color: '#2563EB' }]}>Fertilizer Doses</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* ── Scrollable Tab Bar ── */}
      <View
        style={[
          s.tabBarWrap,
          { backgroundColor: T.card, borderBottomColor: T.border },
        ]}
      >
        <ScrollView
          ref={tabScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.tabBarContent}
          bounces={false}
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
                    fontWeight: activeTab === i ? '800' : '600',
                  },
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {renderTab()}
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── Modal: NPK Chart ── */}
      <Modal visible={showNPKModal} transparent animationType="fade">
        <View style={s.modalBackdrop}>
          <View style={[s.chartModalBox, { backgroundColor: T.card, borderColor: T.border }]}>
            <View style={s.modalHdr}>
              <Text style={[s.modalHdrTitle, { color: T.text }]}>NPK Distribution</Text>
              <TouchableOpacity onPress={() => setShowNPKModal(false)}>
                <Icon name="close" size={22} color={T.muted} />
              </TouchableOpacity>
            </View>
            <NPKPieChart reading={reading} T={T} />
          </View>
        </View>
      </Modal>

      {/* ── Modal: Full Chart ── */}
      <Modal visible={showFullChartModal} transparent animationType="fade">
        <View style={s.modalBackdrop}>
          <View style={[s.chartModalBox, { backgroundColor: T.card, borderColor: T.border }]}>
            <View style={s.modalHdr}>
              <Text style={[s.modalHdrTitle, { color: T.text }]}>All Parameters Distribution</Text>
              <TouchableOpacity onPress={() => setShowFullChartModal(false)}>
                <Icon name="close" size={22} color={T.muted} />
              </TouchableOpacity>
            </View>
            <AllValuesPieChart reading={reading} T={T} />
          </View>
        </View>
      </Modal>

      {/* ── Modal: Fertilizer Doses ── */}
      <Modal visible={showFertDosesModal} transparent animationType="slide">
        <View style={s.modalBackdrop}>
          <View style={[s.dosesModalBox, { backgroundColor: T.card, borderColor: T.border }]}>
            <View style={s.modalHdr}>
              <Text style={[s.modalHdrTitle, { color: T.text }]}>Fertilizer Doses & FYM</Text>
              <TouchableOpacity onPress={() => setShowFertDosesModal(false)}>
                <Icon name="close" size={22} color={T.muted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 420 }}>
              {(soilRecs?.recommendations?.crop_fertilizer ?? []).map((group, i) => (
                <FertilizerYearCard key={i} group={group} isFirst={i === 0} T={T} />
              ))}
              {(soilRecs?.recommendations?.fym ?? []).map((group, i) => (
                <FYMCard key={i} lines={group} T={T} />
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: Spacing.lg, paddingTop: Spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  actionsBar: { borderBottomWidth: 1, paddingVertical: 6 },
  actionsContent: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: 6 },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  actionPillTxt: { fontSize: 11, fontWeight: '700' },

  tabBarWrap: { borderBottomWidth: 1 },
  tabBarContent: { flexDirection: 'row', paddingHorizontal: Spacing.sm },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabTxt: { fontSize: 13 },

  statRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },

  nutrientProgressRow: { marginBottom: 10 },
  npHdr: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  npLbl: { fontSize: 12, fontWeight: '600' },
  npVal: { fontSize: 12, fontWeight: '800' },
  npTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  npFill: { height: '100%', borderRadius: 3 },

  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    borderRadius: Radius.lg,
    borderWidth: 1,
    ...Shadow.sm,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', marginTop: 10 },
  emptySub: { fontSize: 12, marginTop: 4, textAlign: 'center' },

  nutriTable: { marginTop: 4 },
  nutriTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  nutriTableLbl: { fontSize: 12, fontWeight: '700' },
  nutriTableVal: { fontSize: 13, fontWeight: '900' },
  nutriTableRange: { fontSize: 11 },

  filterCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  filterTitle: { fontSize: 12, fontWeight: '800', marginBottom: 8 },
  filterInputsRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  filterInput: {
    flex: 1,
    height: 38,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 12,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: Radius.md,
    justifyContent: 'center',
  },
  filterBtnTxt: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  filterSub: { fontSize: 10, marginTop: 6, lineHeight: 14 },

  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  loadingTxt: { fontSize: 12 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  errorTxt: { fontSize: 12, flex: 1 },

  tableWrap: { marginTop: 4 },
  tHead: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: Radius.sm,
  },
  th: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  tRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 8,
  },
  td: { fontSize: 11 },
  statusPill: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2, alignSelf: 'flex-start' },
  statusPillTxt: { fontSize: 9, fontWeight: '800' },

  yieldCompRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  yieldCompBox: {
    flex: 1,
    borderRadius: Radius.md,
    padding: 10,
    alignItems: 'center',
  },
  yieldCompLbl: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  yieldCompVal: { fontSize: 20, fontWeight: '900', marginVertical: 2 },
  yieldCompUnit: { fontSize: 9 },

  secHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  secHeaderText: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },

  progressBarTrack: { width: '100%', height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  scoreTxt: { fontSize: 9, fontWeight: '700', marginTop: 2 },
  tempBadge: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2, alignSelf: 'flex-start' },
  tempBadgeTxt: { fontSize: 9, fontWeight: '800' },

  cropCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  cropCardHdr: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: 8,
    borderBottomWidth: 1,
  },
  cropRankBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cropRankTxt: { fontSize: 12, fontWeight: '900' },
  cropCardName: { fontSize: 14, fontWeight: '800' },
  cropCardSub: { fontSize: 10, marginTop: 1 },
  cropCardBody: { padding: Spacing.md },
  weatherBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 8,
    marginBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#CBD5E1',
  },
  weatherTxt: { fontSize: 11, fontWeight: '600', flex: 1 },
  weatherScoreTxt: { fontSize: 11, fontWeight: '800' },
  guideSec: { marginBottom: 10 },
  guideTitle: { fontSize: 9, fontWeight: '800', letterSpacing: 0.6, marginBottom: 4 },
  defSec: { marginTop: 6 },
  defRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 2 },
  defTxt: { fontSize: 11, flex: 1 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  chartModalBox: {
    width: '100%',
    maxWidth: 380,
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    ...Shadow.lg,
  },
  dosesModalBox: {
    width: '100%',
    maxWidth: 420,
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    ...Shadow.lg,
  },
  modalHdr: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalHdrTitle: { fontSize: 15, fontWeight: '800' },
});
