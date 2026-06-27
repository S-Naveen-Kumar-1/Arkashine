// src/screens/reports/SoilSaathiDetailScreen.jsx
//
// Tabs: Overview | Nutrients | Chart | Recommendations
// Fixes:
//   • Tabs use ScrollView so long labels never clip
//   • Redux selector keys match soilsaathiReducer exactly
//   • PDF fetched with auth token via axios/fetch, saved with react-native-blob-util
//   • Charts: NPK donut, full all-nutrients bar, soil nutrient grid
//   • Richer UI throughout

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
const TABS = ['Overview', 'Nutrients', 'Chart', 'Recs'];

const FERT_META = {
  urea: { icon: 'water-outline', color: '#2563EB' },
  dap: { icon: 'molecule', color: '#7C3AED' },
  mop: { icon: 'leaf-outline', color: '#D97706' },
  ssp: { icon: 'flask-outline', color: '#0891B2' },
};
const DEFAULT_FERT_META = { icon: 'package-variant-closed', color: '#6B7280' };

// Nutrient optimal ranges (used for grid level badges)
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
      if (!pdfData) throw new Error('No PDF received');

      const base64 = Buffer.from(pdfData, 'binary').toString('base64');
      const filePath = `${RNFS.DocumentDirectoryPath}/${fileName}_${readingId}.pdf`;
      await RNFS.writeFile(filePath, base64, 'base64');
      console.log('response', response);
      console.log('pdfData', pdfData);
      console.log('filePath', filePath);
      console.log('DocumentDirectoryPath', RNFS.DocumentDirectoryPath);
      await Share.open({
        url: `file://${filePath}`,
        type: 'application/pdf',
        title,
        failOnCancel: false,
      });
    } catch (error) {
      console.log('PDF Download Error:', error);
      Alert.alert('Error', 'Could not download PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[pdfs.btn, { backgroundColor: T.card, borderColor: T.border }]}
      onPress={handleDownload}
      activeOpacity={0.8}
      disabled={downloading}
    >
      <View style={[pdfs.icoWrap, { backgroundColor: '#EF444418' }]}>
        {downloading ? (
          <ActivityIndicator size="small" color="#EF4444" />
        ) : (
          <Icon name="file-pdf-box" size={22} color="#EF4444" />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[pdfs.title, { color: T.text }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[pdfs.sub, { color: T.muted }]} numberOfLines={1}>
          {downloading ? 'Downloading…' : subtitle}
        </Text>
      </View>
      {!downloading && (
        <Icon name="download-outline" size={18} color="#EF4444" />
      )}
    </TouchableOpacity>
  );
}

const pdfs = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.md,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
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
  title: { fontSize: 12, fontWeight: '800' },
  sub: { fontSize: 10, marginTop: 1 },
});

// ─── FertilizerYearCard ───────────────────────────────────────────────────────

function FertilizerYearCard({ group, isFirst, T }) {
  const [yearLabel, ...lines] = group;
  return (
    <View
      style={[
        fyc.card,
        {
          backgroundColor: T.card,
          borderColor: T.border,
          borderLeftColor: isFirst ? DEVICE_COLOR : T.border,
          borderLeftWidth: 3,
        },
      ]}
    >
      <View style={[fyc.yearRow, { borderBottomColor: T.border }]}>
        <View style={[fyc.yearIco, { backgroundColor: DEVICE_COLOR + '18' }]}>
          <Icon name="calendar-outline" size={14} color={DEVICE_COLOR} />
        </View>
        <Text style={[fyc.yearTxt, { color: T.text }]}>{yearLabel}</Text>
        {isFirst && (
          <View
            style={[
              fyc.badge,
              {
                backgroundColor: DEVICE_COLOR + '18',
                borderColor: DEVICE_COLOR + '40',
              },
            ]}
          >
            <View style={[fyc.badgeDot, { backgroundColor: DEVICE_COLOR }]} />
            <Text style={[fyc.badgeTxt, { color: DEVICE_COLOR }]}>
              Current year
            </Text>
          </View>
        )}
      </View>

      {lines.map((line, i) => {
        const parsed = parseFertLine(line);
        const key = parsed
          ? Object.keys(FERT_META).find(k =>
              parsed.name.toLowerCase().startsWith(k),
            )
          : null;
        const { icon, color } = key ? FERT_META[key] : DEFAULT_FERT_META;
        const isLast = i === lines.length - 1;

        if (parsed) {
          return (
            <View
              key={i}
              style={[
                fyc.fertRow,
                !isLast && {
                  borderBottomColor: T.border + '50',
                  borderBottomWidth: 0.5,
                },
              ]}
            >
              <View style={[fyc.fertIco, { backgroundColor: color + '15' }]}>
                <Icon name={icon} size={15} color={color} />
              </View>
              <Text style={[fyc.fertName, { color: T.text }]}>
                {parsed.name}
              </Text>
              <View style={fyc.amounts}>
                <Text style={[fyc.amtAcre, { color }]}>
                  {parsed.acre} <Text style={fyc.amtUnit}>kg/acre</Text>
                </Text>
                <Text style={[fyc.amtHa, { color: T.muted }]}>
                  {parsed.hectare} kg/ha
                </Text>
              </View>
            </View>
          );
        }
        return (
          <Text key={i} style={[fyc.plain, { color: T.muted }]}>
            {line}
          </Text>
        );
      })}
    </View>
  );
}

const fyc = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    borderBottomWidth: 0.5,
  },
  yearIco: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearTxt: { flex: 1, fontSize: 14, fontWeight: '800' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeTxt: { fontSize: 10, fontWeight: '700' },
  fertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  fertIco: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  fertName: { flex: 1, fontSize: 13, fontWeight: '700' },
  amounts: { alignItems: 'flex-end' },
  amtAcre: { fontSize: 13, fontWeight: '800' },
  amtUnit: { fontSize: 10, fontWeight: '400' },
  amtHa: { fontSize: 10, marginTop: 2 },
  plain: { fontSize: 12, paddingHorizontal: 14, paddingVertical: 8 },
});

// ─── FYMCard ──────────────────────────────────────────────────────────────────

const FYM_MAP = [
  {
    match: 'soil remedy',
    icon: 'flask-round-bottom-outline',
    color: '#0891B2',
  },
  { match: 'soil fertility', icon: 'sprout-outline', color: '#16A34A' },
  { match: 'fym', icon: 'compost', color: '#D97706' },
  { match: 'crop target', icon: 'trending-up', color: '#7C3AED' },
];

function FYMCard({ lines, T }) {
  return (
    <View
      style={[fym.card, { backgroundColor: T.card, borderColor: T.border }]}
    >
      <View style={[fym.header, { borderBottomColor: T.border }]}>
        <View style={[fym.hdrIco, { backgroundColor: '#D97706' + '18' }]}>
          <Icon name="compost" size={15} color="#D97706" />
        </View>
        <Text style={[fym.title, { color: T.text }]}>Soil health & FYM</Text>
      </View>
      {lines.map((line, i) => {
        const lower = line.toLowerCase();
        const entry = FYM_MAP.find(e => lower.startsWith(e.match));
        const { icon, color } = entry ?? {
          icon: 'information-outline',
          color: '#6B7280',
        };
        const ci = line.indexOf(':');
        const lbl = ci > -1 ? line.slice(0, ci).trim() : line;
        const val = ci > -1 ? line.slice(ci + 1).trim() : '';
        const isLast = i === lines.length - 1;
        return (
          <View
            key={i}
            style={[
              fym.row,
              !isLast && {
                borderBottomColor: T.border + '50',
                borderBottomWidth: 0.5,
              },
            ]}
          >
            <View style={[fym.rowIco, { backgroundColor: color + '15' }]}>
              <Icon name={icon} size={14} color={color} />
            </View>
            <View style={fym.body}>
              <Text style={[fym.lbl, { color: T.muted }]}>{lbl}</Text>
              {val ? (
                <Text style={[fym.val, { color: T.text }]}>{val}</Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const fym = StyleSheet.create({
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
    padding: 14,
    borderBottomWidth: 0.5,
  },
  hdrIco: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 14, fontWeight: '800' },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  rowIco: {
    width: 30,
    height: 30,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  body: { flex: 1 },
  lbl: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  val: { fontSize: 13, fontWeight: '700', lineHeight: 18 },
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
            AI recommendation unavailable
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
    padding: 14,
    borderBottomWidth: 0.5,
  },
  hdrIco: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hdrTitle: { fontSize: 13, fontWeight: '800' },
  hdrSub: { fontSize: 10, marginTop: 1 },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  aiBadgeTxt: { fontSize: 10, fontWeight: '700' },
  stateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
  },
  stateTxt: { fontSize: 13, flex: 1 },
  cropRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderBottomWidth: 0.5,
  },
  cropIcoWrap: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cropMeta: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  cropName: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  matchDot: { width: 5, height: 5, borderRadius: 3 },
  matchTxt: { fontSize: 10, fontWeight: '700' },
  nutriHeader: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderBottomWidth: 0.5,
  },
  nutriHeaderTxt: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nutriGrid: { flexDirection: 'row' },
  nutriCell: { flex: 1, alignItems: 'center', paddingVertical: 12, gap: 3 },
  nutriAbbr: { fontSize: 13, fontWeight: '900' },
  nutriVal: { fontSize: 16, fontWeight: '800' },
  nutriLbl: { fontSize: 9, fontWeight: '500' },
});

// ─── Chart helpers ────────────────────────────────────────────────────────────

function buildDonutPath(cx, cy, R, ri, startAng, sweepAng) {
  const x1 = cx + R * Math.cos(startAng),
    y1 = cy + R * Math.sin(startAng);
  const x2 = cx + R * Math.cos(startAng + sweepAng),
    y2 = cy + R * Math.sin(startAng + sweepAng);
  const xi1 = cx + ri * Math.cos(startAng),
    yi1 = cy + ri * Math.sin(startAng);
  const xi2 = cx + ri * Math.cos(startAng + sweepAng),
    yi2 = cy + ri * Math.sin(startAng + sweepAng);
  const lg = sweepAng > Math.PI ? 1 : 0;
  return `M${x1},${y1} A${R},${R},0,${lg},1,${x2},${y2} L${xi2},${yi2} A${ri},${ri},0,${lg},0,${xi1},${yi1} Z`;
}

// Single nutrient donut cell — mirrors website per-nutrient pie
function NutrientPieCell({
  label,
  abbr,
  value,
  color,
  rangeKey,
  T,
  size = 80,
}) {
  const range = RANGES[rangeKey];
  const lvl = levelFor(rangeKey, value);
  const max = range?.max ?? 100;
  const pct = value > 0 ? Math.min(value / max, 1) : 0;
  const cx = size / 2,
    cy = size / 2,
    R = size / 2 - 4,
    ri = size / 2 - 16;
  const sweep = pct * 2 * Math.PI;
  const hasData = value != null && value > 0;
  const valStr = hasData ? Number(value).toFixed(value < 10 ? 2 : 1) : '—';

  return (
    <View style={[pc.cell, { backgroundColor: T.card, borderColor: T.border }]}>
      <View style={pc.pieWrap}>
        <Svg width={size} height={size}>
          <Path
            d={buildDonutPath(cx, cy, R, ri, 0, 2 * Math.PI - 0.001)}
            fill={T.border + '50'}
          />
          {hasData && sweep > 0.01 && (
            <Path
              d={buildDonutPath(cx, cy, R, ri, -Math.PI / 2, sweep)}
              fill={color}
            />
          )}
          <SvgText
            x={cx}
            y={cy - 2}
            textAnchor="middle"
            fontSize={size < 80 ? 9 : 11}
            fontWeight="800"
            fill={hasData ? color : T.muted ?? '#94A3B8'}
          >
            {hasData ? `${Math.round(pct * 100)}%` : '—'}
          </SvgText>
          <SvgText
            x={cx}
            y={cy + 10}
            textAnchor="middle"
            fontSize={7}
            fill={T.muted ?? '#94A3B8'}
          >
            {abbr}
          </SvgText>
        </Svg>
      </View>
      <Text style={[pc.cellLabel, { color: T.muted }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[pc.cellVal, { color: hasData ? color : T.muted }]}>
        {valStr}
        {range?.unit ? (
          <Text style={[pc.cellUnit, { color: T.muted }]}> {range.unit}</Text>
        ) : null}
      </Text>
      <View style={[pc.lvlBadge, { backgroundColor: lvl.bg }]}>
        <Text style={[pc.lvlTxt, { color: lvl.color }]}>{lvl.label}</Text>
      </View>
    </View>
  );
}

const pc = StyleSheet.create({
  cell: {
    width: '30%',
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 8,
    alignItems: 'center',
    gap: 3,
    ...Shadow.sm,
  },
  pieWrap: { marginBottom: 2 },
  cellLabel: {
    fontSize: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  cellVal: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  cellUnit: { fontSize: 9, fontWeight: '400' },
  lvlBadge: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  lvlTxt: { fontSize: 8, fontWeight: '700' },
});

// ─── NPKPieSection ────────────────────────────────────────────────────────────

function NPKPieSection({ reading, T }) {
  const items = [
    {
      label: 'Nitrogen',
      abbr: 'N',
      key: 'nitrogen',
      color: '#16A34A',
      v: reading?.nitrogen ?? 0,
    },
    {
      label: 'Phosphorous',
      abbr: 'P',
      key: 'phosphorous',
      color: '#2563EB',
      v: reading?.phosphorous ?? 0,
    },
    {
      label: 'Potassium',
      abbr: 'K',
      key: 'potassium',
      color: '#D97706',
      v: reading?.potassium ?? 0,
    },
  ];
  const total = items.reduce((s, d) => s + d.v, 0);
  const cx = 100,
    cy = 100,
    R = 88,
    ri = 54;
  let ang = -Math.PI / 2;
  const slices = items
    .filter(d => d.v > 0)
    .map(d => {
      const sw = total > 0 ? (d.v / total) * 2 * Math.PI : 0;
      const path = sw > 0.01 ? buildDonutPath(cx, cy, R, ri, ang, sw) : null;
      ang += sw;
      return {
        ...d,
        sw,
        pct: total > 0 ? Math.round((d.v / total) * 100) : 0,
        path,
      };
    });

  return (
    <View>
      <View style={npk.donutWrap}>
        <Svg width={200} height={200}>
          <Path
            d={buildDonutPath(cx, cy, R, ri, 0, 2 * Math.PI - 0.001)}
            fill={T.border + '40'}
          />
          {slices.map(
            (sl, i) => sl.path && <Path key={i} d={sl.path} fill={sl.color} />,
          )}
          <SvgText
            x={cx}
            y={cy - 8}
            textAnchor="middle"
            fontSize={22}
            fontWeight="900"
            fill={T.text ?? '#111'}
          >
            {Math.round(total)}
          </SvgText>
          <SvgText
            x={cx}
            y={cy + 10}
            textAnchor="middle"
            fontSize={11}
            fill={T.muted ?? '#94A3B8'}
          >
            NPK total
          </SvgText>
        </Svg>
      </View>
      <View style={npk.cards}>
        {items.map(d => {
          const lvl = levelFor(d.key, d.v);
          const pct = total > 0 ? Math.round((d.v / total) * 100) : 0;
          return (
            <View
              key={d.key}
              style={[
                npk.card,
                {
                  backgroundColor: T.card,
                  borderColor: T.border,
                  borderTopColor: d.color,
                  borderTopWidth: 3,
                },
              ]}
            >
              <View style={npk.cardTop}>
                <View style={[npk.dot, { backgroundColor: d.color }]} />
                <Text style={[npk.cardLbl, { color: T.muted }]}>{d.label}</Text>
              </View>
              <Text style={[npk.cardVal, { color: d.color }]}>{d.v}</Text>
              <View style={npk.cardBottom}>
                <Text style={[npk.cardPct, { color: T.muted }]}>{pct}%</Text>
                <View style={[npk.lvlBadge, { backgroundColor: lvl.bg }]}>
                  <Text style={[npk.lvlTxt, { color: lvl.color }]}>
                    {lvl.label}
                  </Text>
                </View>
              </View>
              <View style={[npk.bar, { backgroundColor: T.border + '50' }]}>
                <View
                  style={[
                    npk.barFill,
                    { width: `${pct}%`, backgroundColor: d.color },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>
      <View style={npk.extraRow}>
        {[
          { label: 'pH', key: 'ph', v: reading?.ph, color: '#7C3AED' },
          { label: 'EC', key: 'ec', v: reading?.ec, color: '#0891B2' },
          { label: 'OC', key: 'oc', v: reading?.oc, color: '#84CC16' },
        ].map(item => {
          const lvl = levelFor(item.key, item.v);
          return (
            <View
              key={item.key}
              style={[
                npk.extraCell,
                { backgroundColor: T.card, borderColor: T.border },
              ]}
            >
              <Text style={[npk.extraLbl, { color: T.muted }]}>
                {item.label}
              </Text>
              <Text style={[npk.extraVal, { color: item.color }]}>
                {item.v != null && item.v > 0 ? Number(item.v).toFixed(1) : '—'}
              </Text>
              <View style={[npk.lvlBadge, { backgroundColor: lvl.bg }]}>
                <Text style={[npk.lvlTxt, { color: lvl.color }]}>
                  {lvl.label}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const npk = StyleSheet.create({
  donutWrap: { alignItems: 'center', marginBottom: Spacing.md },
  cards: { flexDirection: 'row', gap: 8, marginBottom: Spacing.md },
  card: {
    flex: 1,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 10,
    gap: 4,
    ...Shadow.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  cardLbl: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  cardVal: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardPct: { fontSize: 10, fontWeight: '700' },
  bar: { height: 4, borderRadius: 2, overflow: 'hidden', marginTop: 4 },
  barFill: { height: 4, borderRadius: 2 },
  lvlBadge: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  lvlTxt: { fontSize: 8, fontWeight: '700' },
  extraRow: { flexDirection: 'row', gap: 8 },
  extraCell: {
    flex: 1,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 10,
    alignItems: 'center',
    gap: 4,
    ...Shadow.sm,
  },
  extraLbl: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  extraVal: { fontSize: 18, fontWeight: '900' },
});

// ─── AllNutrientPiesSection ───────────────────────────────────────────────────

function AllNutrientPiesSection({ reading, T }) {
  const ALL = [
    {
      label: 'Nitrogen',
      abbr: 'N',
      key: 'nitrogen',
      color: '#16A34A',
      v: reading?.nitrogen,
    },
    {
      label: 'Phosphorous',
      abbr: 'P',
      key: 'phosphorous',
      color: '#2563EB',
      v: reading?.phosphorous,
    },
    {
      label: 'Potassium',
      abbr: 'K',
      key: 'potassium',
      color: '#D97706',
      v: reading?.potassium,
    },
    { label: 'pH', abbr: 'pH', key: 'ph', color: '#7C3AED', v: reading?.ph },
    { label: 'EC', abbr: 'EC', key: 'ec', color: '#0891B2', v: reading?.ec },
    { label: 'OC', abbr: 'OC', key: 'oc', color: '#84CC16', v: reading?.oc },
    {
      label: 'Calcium',
      abbr: 'Ca',
      key: 'calcium',
      color: '#EC4899',
      v: reading?.calcium,
    },
    {
      label: 'Magnesium',
      abbr: 'Mg',
      key: 'magnesium',
      color: '#F59E0B',
      v: reading?.magnesium,
    },
    {
      label: 'Sulphur',
      abbr: 'S',
      key: 'sulphur',
      color: '#EF4444',
      v: reading?.sulphur,
    },
    {
      label: 'Zinc',
      abbr: 'Zn',
      key: 'zinc',
      color: '#6366F1',
      v: reading?.zinc,
    },
    {
      label: 'Manganese',
      abbr: 'Mn',
      key: 'manganese',
      color: '#14B8A6',
      v: reading?.manganese,
    },
    {
      label: 'Iron',
      abbr: 'Fe',
      key: 'iron',
      color: '#E879F9',
      v: reading?.iron,
    },
    {
      label: 'Copper',
      abbr: 'Cu',
      key: 'copper',
      color: '#F97316',
      v: reading?.copper,
    },
    {
      label: 'Boron',
      abbr: 'B',
      key: 'boron',
      color: '#22D3EE',
      v: reading?.boron,
    },
  ];
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        justifyContent: 'space-between',
      }}
    >
      {ALL.map(item => (
        <NutrientPieCell
          key={item.key}
          label={item.label}
          abbr={item.abbr}
          value={item.v}
          color={item.color}
          rangeKey={item.key}
          T={T}
          size={80}
        />
      ))}
    </View>
  );
}

// ─── SoilNutrientGridSection ──────────────────────────────────────────────────

function SoilNutrientGridSection({ reading, T }) {
  const ROWS = [
    {
      label: 'Nitrogen (N)',
      key: 'nitrogen',
      color: '#16A34A',
      v: reading?.nitrogen,
      unit: 'kg/ha',
    },
    {
      label: 'Phosphorous (P)',
      key: 'phosphorous',
      color: '#2563EB',
      v: reading?.phosphorous,
      unit: 'kg/ha',
    },
    {
      label: 'Potassium (K)',
      key: 'potassium',
      color: '#D97706',
      v: reading?.potassium,
      unit: 'kg/ha',
    },
    { label: 'pH', key: 'ph', color: '#7C3AED', v: reading?.ph, unit: '' },
    { label: 'EC', key: 'ec', color: '#0891B2', v: reading?.ec, unit: 'dS/m' },
    { label: 'OC', key: 'oc', color: '#84CC16', v: reading?.oc, unit: '%' },
    {
      label: 'Calcium (Ca)',
      key: 'calcium',
      color: '#EC4899',
      v: reading?.calcium,
      unit: '',
    },
    {
      label: 'Magnesium (Mg)',
      key: 'magnesium',
      color: '#F59E0B',
      v: reading?.magnesium,
      unit: '',
    },
    {
      label: 'Sulphur (S)',
      key: 'sulphur',
      color: '#EF4444',
      v: reading?.sulphur,
      unit: 'ppm',
    },
    {
      label: 'Zinc (Zn)',
      key: 'zinc',
      color: '#6366F1',
      v: reading?.zinc,
      unit: 'ppm',
    },
    {
      label: 'Manganese (Mn)',
      key: 'manganese',
      color: '#14B8A6',
      v: reading?.manganese,
      unit: 'ppm',
    },
    {
      label: 'Iron (Fe)',
      key: 'iron',
      color: '#E879F9',
      v: reading?.iron,
      unit: 'ppm',
    },
    {
      label: 'Copper (Cu)',
      key: 'copper',
      color: '#F97316',
      v: reading?.copper,
      unit: 'ppm',
    },
    {
      label: 'Boron (B)',
      key: 'boron',
      color: '#22D3EE',
      v: reading?.boron,
      unit: 'ppm',
    },
  ];
  return (
    <View style={{ gap: 8 }}>
      {ROWS.map(row => {
        const lvl = levelFor(row.key, row.v);
        const range = RANGES[row.key];
        const pct = range && row.v > 0 ? Math.min(1, row.v / range.max) : 0;
        const valStr =
          row.v != null && row.v > 0
            ? Number(row.v).toFixed(row.key === 'oc' ? 2 : 1)
            : '—';
        return (
          <View
            key={row.key}
            style={[
              sg.row,
              {
                backgroundColor: T.card,
                borderColor: T.border,
                borderLeftColor: lvl.color,
                borderLeftWidth: 3,
              },
            ]}
          >
            <View style={sg.rowLeft}>
              <View style={sg.rowTop}>
                <Text style={[sg.rowLabel, { color: T.text }]}>
                  {row.label}
                </Text>
                <View style={[sg.lvlBadge, { backgroundColor: lvl.bg }]}>
                  <Text style={[sg.lvlTxt, { color: lvl.color }]}>
                    {lvl.label}
                  </Text>
                </View>
              </View>
              <View style={[sg.track, { backgroundColor: T.border + '50' }]}>
                <View
                  style={[
                    sg.fill,
                    {
                      width: `${Math.round(pct * 100)}%`,
                      backgroundColor: lvl.color,
                    },
                  ]}
                />
              </View>
              {range && (
                <Text style={[sg.rangeHint, { color: T.muted }]}>
                  Optimal: {range.low}–{range.high}
                  {range.unit ? ` ${range.unit}` : ''}
                </Text>
              )}
            </View>
            <View style={sg.rowRight}>
              <Text
                style={[sg.val, { color: row.v > 0 ? row.color : T.muted }]}
              >
                {valStr}
              </Text>
              {row.unit ? (
                <Text style={[sg.unit, { color: T.muted }]}>{row.unit}</Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const sg = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 12,
    ...Shadow.sm,
  },
  rowLeft: { flex: 1, gap: 6 },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLabel: { fontSize: 12, fontWeight: '700' },
  lvlBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  lvlTxt: { fontSize: 9, fontWeight: '700' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  rangeHint: { fontSize: 9 },
  rowRight: { alignItems: 'flex-end', minWidth: 52 },
  val: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  unit: { fontSize: 9, marginTop: 1 },
});

// ─── ChartTabView — segmented control ─────────────────────────────────────────

const CHART_SEGMENTS = [
  { key: 'npk', label: 'NPK', icon: 'chart-donut' },
  { key: 'all', label: 'All Nuts', icon: 'view-grid-outline' },
  { key: 'grid', label: 'Detail', icon: 'format-list-bulleted' },
];

function ChartTabView({ reading, T }) {
  const [seg, setSeg] = useState('npk');
  return (
    <View>
      <View
        style={[
          ctv.segWrap,
          { backgroundColor: T.card, borderColor: T.border },
        ]}
      >
        {CHART_SEGMENTS.map(s => {
          const active = seg === s.key;
          return (
            <TouchableOpacity
              key={s.key}
              style={[ctv.seg, active && { backgroundColor: DEVICE_COLOR }]}
              onPress={() => setSeg(s.key)}
              activeOpacity={0.8}
            >
              <Icon name={s.icon} size={13} color={active ? '#fff' : T.muted} />
              <Text
                style={[
                  ctv.segTxt,
                  {
                    color: active ? '#fff' : T.muted,
                    fontWeight: active ? '700' : '500',
                  },
                ]}
              >
                {s.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {seg === 'npk' && (
        <SectionCard
          title="NPK Distribution"
          icon="chart-donut"
          color={DEVICE_COLOR}
          T={T}
        >
          <NPKPieSection reading={reading} T={T} />
        </SectionCard>
      )}
      {seg === 'all' && (
        <SectionCard
          title="All nutrients"
          icon="view-grid-outline"
          color="#2563EB"
          T={T}
        >
          <AllNutrientPiesSection reading={reading} T={T} />
        </SectionCard>
      )}
      {seg === 'grid' && (
        <SectionCard
          title="Nutrient detail"
          icon="format-list-bulleted"
          color="#7C3AED"
          T={T}
        >
          <SoilNutrientGridSection reading={reading} T={T} />
        </SectionCard>
      )}
    </View>
  );
}

const ctv = StyleSheet.create({
  segWrap: {
    flexDirection: 'row',
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 4,
    marginBottom: Spacing.md,
    gap: 3,
  },
  seg: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: Radius.md,
  },
  segTxt: { fontSize: 11 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

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

  // ── soilsaathi Redux state — keys match soilsaathiReducer exactly ────────────
  //
  // Reducer state shape (from soilsaathiReducer.js):
  //   recommendations   → set by SOIL_RECS_REQUEST_SUCCESS   (the full API response object)
  //   recsStatus        → 'idle' | 'loading' | 'success' | 'error'
  //   recsError         → string | null
  //   aiRecommendations → set by SOIL_AI_RECS_REQUEST_SUCCESS
  //   aiRecsStatus      → 'idle' | 'loading' | 'success' | 'error'
  //   aiRecsError       → string | null
  const soilState = useSelector(s => s.soilsaathi ?? {});
  const soilRecs = soilState.recommendations; // full recs API response
  const soilRecsLoading = soilState.recsStatus === 'loading';
  const soilRecsError =
    soilState.recsStatus === 'error' ? soilState.recsError : null;
  const soilAIRecs = soilState.aiRecommendations; // full AI API response
  const soilAIRecsLoading = soilState.aiRecsStatus === 'loading';
  const soilAIRecsError =
    soilState.aiRecsStatus === 'error' ? soilState.aiRecsError : null;

  const reading = selectedReading ?? passed;
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    dispatch(fetchReadingDetail(deviceId, readingId));
    if (!schema && !schemaSlot?.loading)
      dispatch(fetchDeviceFieldSchema(deviceType));
    return () => dispatch(clearSelectedReading());
  }, [deviceId, readingId, deviceType, dispatch]);

  useEffect(() => {
    if (activeTab !== 3) return;
    // Only dispatch if not already fetched or in flight — use status fields from reducer
    if (soilState.recsStatus === 'idle')
      dispatch(getSoilRecommendations(deviceId, readingId));
    if (soilState.aiRecsStatus === 'idle')
      dispatch(getSoilAIRecommendations(deviceId, readingId));
  }, [activeTab]);

  // ── Field lists ─────────────────────────────────────────────────────────────

  const soilPrimary = useMemo(() => {
    const lbl = k => schema?.[k] ?? k;
    return [
      {
        label: lbl('nitrogen'),
        v: reading?.nitrogen,
        unit: '',
        key: 'nitrogen',
      },
      {
        label: lbl('phosphorous'),
        v: reading?.phosphorous,
        unit: '',
        key: 'phosphorous',
      },
      {
        label: lbl('potassium'),
        v: reading?.potassium,
        unit: '',
        key: 'potassium',
      },
      { label: lbl('ph'), v: reading?.ph, unit: '', key: 'ph' },
      { label: lbl('ec'), v: reading?.ec, unit: '', key: 'ec' },
      { label: lbl('oc') ?? 'OC', v: reading?.oc, unit: '%', key: 'oc' },
    ];
  }, [schema, reading]);

  const soilSecondary = useMemo(() => {
    const lbl = k => schema?.[k] ?? k;
    return [
      { label: lbl('calcium'), v: reading?.calcium, unit: '', key: 'calcium' },
      {
        label: lbl('magnesium'),
        v: reading?.magnesium,
        unit: '',
        key: 'magnesium',
      },
      {
        label: lbl('sulphur') ?? 'Sulphur',
        v: reading?.sulphur,
        unit: ' ppm',
        key: 'sulphur',
      },
      {
        label: lbl('zinc') ?? 'Zinc',
        v: reading?.zinc,
        unit: ' ppm',
        key: 'zinc',
      },
      {
        label: lbl('manganese') ?? 'Mn',
        v: reading?.manganese,
        unit: ' ppm',
        key: 'manganese',
      },
      {
        label: lbl('iron') ?? 'Iron',
        v: reading?.iron,
        unit: ' ppm',
        key: 'iron',
      },
      {
        label: lbl('copper') ?? 'Copper',
        v: reading?.copper,
        unit: ' ppm',
        key: 'copper',
      },
      {
        label: lbl('boron') ?? 'Boron',
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

  // ── Guards ───────────────────────────────────────────────────────────────────

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

    const SIZE = CONTENT_W - Spacing.lg * 2; // full-width pie
    const cx = SIZE / 2,
      cy = SIZE / 2;
    const R = SIZE / 2 - 10,
      ri = SIZE / 2 - 55;

    let ang = -Math.PI / 2;
    const slices = data.map(d => {
      const sweep = total > 0 ? (d.v / total) * 2 * Math.PI : 0;
      const path =
        sweep > 0.005 ? buildDonutPath(cx, cy, R, ri, ang, sweep) : null;
      // label position — midpoint of arc
      const mid = ang + sweep / 2;
      const lR = (R + ri) / 2;
      const lx = cx + lR * Math.cos(mid);
      const ly = cy + lR * Math.sin(mid);
      ang += sweep;
      return {
        ...d,
        sweep,
        path,
        pct: total > 0 ? Math.round((d.v / total) * 100) : 0,
        lx,
        ly,
      };
    });

    return (
      <View>
        {/* Pie */}
        <View style={{ alignItems: 'center', marginBottom: Spacing.md }}>
          <Svg width={SIZE} height={SIZE}>
            {/* background ring */}
            <Path
              d={buildDonutPath(cx, cy, R, ri, 0, 2 * Math.PI - 0.001)}
              fill={T.border + '40'}
            />
            {slices.map((sl, i) =>
              sl.path ? <Path key={i} d={sl.path} fill={sl.color} /> : null,
            )}
            {/* center label */}
            <SvgText
              x={cx}
              y={cy - 10}
              textAnchor="middle"
              fontSize={11}
              fill={T.muted ?? '#94A3B8'}
            >
              All nutrients
            </SvgText>
            <SvgText
              x={cx}
              y={cy + 8}
              textAnchor="middle"
              fontSize={20}
              fontWeight="900"
              fill={T.text ?? '#111'}
            >
              {data.length}
            </SvgText>
            <SvgText
              x={cx}
              y={cy + 24}
              textAnchor="middle"
              fontSize={10}
              fill={T.muted ?? '#94A3B8'}
            >
              parameters
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
      paddingVertical: 5,
      paddingHorizontal: 9,
    },
    dot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
    chipLabel: { fontSize: 11, fontWeight: '600' },
    chipVal: { fontSize: 11, fontWeight: '900' },
    pctBadge: { borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
    pctTxt: { fontSize: 9, fontWeight: '700' },
  });
  const recordedAt = new Date(reading.created_at);
  const phVal = reading.ph ?? 0;
  const ecVal = reading.ec ?? 0;
  const phCls = phClass(phVal);
  const ecCls = ecClass(ecVal);

  // ── Tab content ──────────────────────────────────────────────────────────────

  const renderTab = () => {
    switch (activeTab) {
      // Overview
      case 0: {
        const statItems = [
          { label: 'N', value: `${reading.nitrogen ?? 0}`, color: '#16A34A' },
          { label: 'pH', value: fmt(reading.ph), color: phCls.color },
          { label: 'EC', value: fmt(reading.ec), color: '#D97706' },
          { label: 'OC %', value: fmt(reading.oc, 3), color: '#7C3AED' },
        ];
        return (
          <>
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

            {/* ← replaces NPKPieSection SectionCard */}
            <SectionCard
              title="All values"
              icon="chart-pie"
              color={DEVICE_COLOR}
              T={T}
            >
              <AllValuesPieChart reading={reading} T={T} />
            </SectionCard>

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
                label="Date"
                value={recordedAt.toLocaleString('en-IN')}
                T={T}
                last
              />
            </SectionCard>
          </>
        );
      }

      // Nutrients
      case 1:
        return (
          <>
            <SectionCard
              title="Primary nutrients"
              icon="flask-outline"
              color={DEVICE_COLOR}
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
            <SectionCard
              title="Secondary & micro nutrients"
              icon="atom"
              color="#7C3AED"
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
          </>
        );

      // Chart
      case 2:
        return <ChartTabView reading={reading} T={T} />;

      // Recommendations
      case 3: {
        const cropFert = soilRecs?.recommendations?.crop_fertilizer ?? [];
        const fymGroups = soilRecs?.recommendations?.fym ?? [];

        return (
          <>
            {/* Two PDF buttons side by side */}
            <View style={pdfs.row}>
              <PDFDownloadButton
                deviceId={deviceId}
                readingId={readingId}
                T={T}
                dispatch={dispatch}
                action={downloadSoilRecommendationPDF}
                title="Full Report"
                subtitle="6-page SoiLENZ PDF"
                fileName="SoiLENZ_Report"
              />
              <PDFDownloadButton
                deviceId={deviceId}
                readingId={readingId}
                T={T}
                dispatch={dispatch}
                action={downloadSoilDetailPDF}
                title="Detail PDF"
                subtitle="Soil detail report"
                fileName="SoiLENZ_Detail"
              />
            </View>

            <AICropCard
              aiData={soilAIRecs}
              loading={soilAIRecsLoading}
              error={soilAIRecsError}
              T={T}
            />

            <View style={s.secRow}>
              <View
                style={[s.secIco, { backgroundColor: DEVICE_COLOR + '18' }]}
              >
                <Icon name="seed-outline" size={14} color={DEVICE_COLOR} />
              </View>
              <Text style={[s.secTitle, { color: T.textSub }]}>
                Fertilizer recommendations
              </Text>
              {cropFert.length > 0 && (
                <View
                  style={[
                    s.countPill,
                    {
                      backgroundColor: DEVICE_COLOR + '18',
                      borderColor: DEVICE_COLOR + '40',
                    },
                  ]}
                >
                  <Text style={[s.countTxt, { color: DEVICE_COLOR }]}>
                    {cropFert.length} years
                  </Text>
                </View>
              )}
            </View>

            {soilRecsLoading && soilState.recsStatus === 'loading' && (
              <View
                style={[
                  s.infoBox,
                  {
                    backgroundColor: DEVICE_COLOR + '10',
                    borderColor: DEVICE_COLOR + '30',
                  },
                ]}
              >
                <ActivityIndicator size="small" color={DEVICE_COLOR} />
                <Text style={[s.infoTxt, { color: DEVICE_COLOR }]}>
                  Loading recommendations…
                </Text>
              </View>
            )}

            {soilRecsError && !soilRecsLoading && (
              <TouchableOpacity
                style={[
                  s.infoBox,
                  { backgroundColor: '#EF444410', borderColor: '#EF444440' },
                ]}
                onPress={() =>
                  dispatch(getSoilRecommendations(deviceId, readingId))
                }
                activeOpacity={0.8}
              >
                <Icon name="alert-circle-outline" size={14} color="#EF4444" />
                <Text style={[s.infoTxt, { color: '#EF4444' }]}>
                  Could not load recommendations
                </Text>
                <Text style={[s.retryTxt, { color: '#EF4444' }]}>Retry</Text>
              </TouchableOpacity>
            )}

            {cropFert.map((group, i) => (
              <FertilizerYearCard
                key={i}
                group={group}
                isFirst={i === 0}
                T={T}
              />
            ))}

            {fymGroups.map((group, i) => (
              <FYMCard key={i} lines={group} T={T} />
            ))}
          </>
        );
      }

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

      {/* ── Scrollable tab bar (prevents clipping) ── */}
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
                { minWidth: SCREEN_W / TABS.length },
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
        </ScrollView>
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: Spacing.lg, paddingTop: Spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  tabBarWrap: { borderBottomWidth: 1 },
  tabBarContent: { flexDirection: 'row', minWidth: '100%' },
  tab: {
    paddingVertical: 13,
    alignItems: 'center',
    paddingHorizontal: 4,
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabTxt: { fontSize: 13 },

  statRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },

  secRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.md,
  },
  secIco: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    flex: 1,
  },
  countPill: {
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  countTxt: { fontSize: 10, fontWeight: '700' },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  infoTxt: { fontSize: 13, fontWeight: '600', flex: 1 },
  retryTxt: { fontSize: 12, fontWeight: '800' },
});
