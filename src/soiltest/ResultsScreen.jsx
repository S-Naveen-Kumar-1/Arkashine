// src/screens/soiltest/ResultsScreen.jsx
//
// Soil Test Results — reads from Redux test.results
// Shows: pH, EC, voltage (real or mock), health score, recommendations,
//        nutrient table, and a disclaimer if mock data was used.

import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppButton, TopBar } from '../components/common';
import useTheme from '../hooks/useTheme';
import { Spacing, Typography, Radius } from '../theme';
import { TEST_SAVED } from '../config/actionTypes';

// ─── Nutrient status engine ───────────────────────────────────────────────────
function getStatus(key, val) {
  if (val === null || val === undefined)
    return { label: 'N/A', color: '#475569', level: 'na' };
  const rules = {
    ph: [
      { max: 5.5, label: 'Acidic', color: '#EF4444', level: 'low' },
      { max: 6.5, label: 'OK', color: '#F59E0B', level: 'medium' },
      { max: 7.5, label: 'Optimal', color: '#22C55E', level: 'high' },
      { max: 99, label: 'Alkaline', color: '#8B5CF6', level: 'low' },
    ],
    ec: [
      { max: 0.1, label: 'Very Low', color: '#94A3B8', level: 'low' },
      { max: 0.8, label: 'Low', color: '#F59E0B', level: 'low' },
      { max: 1.6, label: 'Optimal', color: '#22C55E', level: 'high' },
      { max: 3.2, label: 'High', color: '#F97316', level: 'medium' },
      { max: 99, label: 'Too High', color: '#EF4444', level: 'low' },
    ],
    N: [
      { max: 50, label: 'Low', color: '#EF4444', level: 'low' },
      { max: 150, label: 'Medium', color: '#F59E0B', level: 'medium' },
      { max: 999, label: 'Good', color: '#22C55E', level: 'high' },
    ],
    P: [
      { max: 10, label: 'Low', color: '#EF4444', level: 'low' },
      { max: 30, label: 'Medium', color: '#F59E0B', level: 'medium' },
      { max: 999, label: 'Good', color: '#22C55E', level: 'high' },
    ],
    K: [
      { max: 50, label: 'Low', color: '#EF4444', level: 'low' },
      { max: 150, label: 'Medium', color: '#F59E0B', level: 'medium' },
      { max: 999, label: 'Good', color: '#22C55E', level: 'high' },
    ],
    default: [{ max: 999, label: 'N/A', color: '#475569', level: 'na' }],
  };
  const set = rules[key] ?? rules.default;
  for (const r of set) {
    if (val <= r.max) return { label: r.label, color: r.color, level: r.level };
  }
  return { label: 'N/A', color: '#475569', level: 'na' };
}

// ─── Soil recommendations engine ─────────────────────────────────────────────
function getRecommendations(ph, ec) {
  const recs = [];
  if (ph !== null) {
    if (ph < 5.5)
      recs.push({
        icon: 'flask-outline',
        color: '#22C55E',
        title: 'Apply Agricultural Lime',
        desc: 'Add 2–4 t/ha dolomitic limestone to raise pH toward 6.5. Re-test in 6 weeks.',
      });
    else if (ph < 6.0)
      recs.push({
        icon: 'flask-outline',
        color: '#F59E0B',
        title: 'Lime Application Advised',
        desc: 'Apply 1–2 t/ha garden lime to bring pH to optimal range (6.5–7.0).',
      });
    else if (ph > 8.0)
      recs.push({
        icon: 'bottle-tonic',
        color: '#8B5CF6',
        title: 'Apply Sulphur to Lower pH',
        desc: 'Use elemental sulphur (200–400 kg/ha) or ammonium sulfate to acidify.',
      });
    else if (ph > 7.5)
      recs.push({
        icon: 'water',
        color: '#3B82F6',
        title: 'Monitor Micronutrients',
        desc: 'At pH 7.5+, iron/zinc deficiency is common. Use chelated foliar sprays.',
      });
    else
      recs.push({
        icon: 'check-circle',
        color: '#22C55E',
        title: 'pH is in Optimal Range',
        desc: 'Maintain current soil management. Re-test every 6 months.',
      });
  }
  if (ec !== null) {
    if (ec < 0.1)
      recs.push({
        icon: 'leaf',
        color: '#22C55E',
        title: 'Soil Needs Fertilisation',
        desc: 'Very low EC = nutrient-depleted soil. Apply NPK 20-20-20 at label rates.',
      });
    else if (ec < 0.8)
      recs.push({
        icon: 'sprout',
        color: '#F59E0B',
        title: 'Increase Nutrient Supply',
        desc: 'Apply balanced fertiliser. Slow-release formulations recommended.',
      });
    else if (ec > 3.2)
      recs.push({
        icon: 'water-pump',
        color: '#EF4444',
        title: 'Leach Excess Salts Urgently',
        desc: 'Irrigate 2× normal volume to flush salts below root zone. Halt fertiliser.',
      });
    else if (ec > 1.6)
      recs.push({
        icon: 'water',
        color: '#F97316',
        title: 'Reduce Fertiliser Rate',
        desc: 'Cut fertiliser by 30% and monitor EC weekly to prevent salt stress.',
      });
    else
      recs.push({
        icon: 'check-circle',
        color: '#22C55E',
        title: 'EC is Optimal',
        desc: 'Maintain current fertiliser regime. Continue regular monitoring.',
      });
  }
  if (ph !== null && ec !== null && ph < 6.0 && ec < 0.5) {
    recs.push({
      icon: 'test-tube',
      color: '#8B5CF6',
      title: 'Combined Amendment Strategy',
      desc: 'Apply lime + NPK together for faster soil recovery. Re-test in 4 weeks.',
    });
  }
  recs.push({
    icon: 'calendar-check',
    color: '#94A3B8',
    title: 'Schedule Next Test',
    desc: 'Re-test pH and EC every 4–8 weeks during the growing season.',
  });
  return recs;
}

// ─── Nutrient definitions ─────────────────────────────────────────────────────
const NUTRIENTS = [
  {
    key: 'ph',
    label: 'pH',
    unit: '',
    icon: '🧪',
    desc: 'Soil acidity / alkalinity',
  },
  {
    key: 'ec',
    label: 'EC',
    unit: 'dS/m',
    icon: '⚡',
    desc: 'Electrical conductivity',
  },
  {
    key: 'N',
    label: 'Nitrogen',
    unit: 'kg/ha',
    icon: '🌿',
    desc: 'Essential for leaf growth',
  },
  {
    key: 'P',
    label: 'Phosphorus',
    unit: 'kg/ha',
    icon: '🔴',
    desc: 'Root & flower development',
  },
  {
    key: 'K',
    label: 'Potassium',
    unit: 'kg/ha',
    icon: '🔵',
    desc: 'Overall plant health',
  },
  {
    key: 'Ca',
    label: 'Calcium',
    unit: 'meq/100g',
    icon: '🟤',
    desc: 'Cell wall strength',
  },
  {
    key: 'Mg',
    label: 'Magnesium',
    unit: 'meq/100g',
    icon: '🟢',
    desc: 'Chlorophyll production',
  },
  {
    key: 'S',
    label: 'Sulphur',
    unit: 'ppm',
    icon: '🟡',
    desc: 'Protein synthesis',
  },
  {
    key: 'Zn',
    label: 'Zinc',
    unit: 'ppm',
    icon: '⚪',
    desc: 'Enzyme activation',
  },
  {
    key: 'oc',
    label: 'Organic C',
    unit: '%',
    icon: '🍂',
    desc: 'Soil organic matter',
  },
];

// ─── pH Scale Bar ─────────────────────────────────────────────────────────────
function PHScaleBar({ ph, T }) {
  const pct = ph !== null ? Math.min(100, Math.max(0, (ph / 14) * 100)) : null;
  const segs = [
    '#DC2626',
    '#EF4444',
    '#F97316',
    '#F59E0B',
    '#22C55E',
    '#3B82F6',
    '#8B5CF6',
    '#7C3AED',
  ];
  return (
    <View>
      <Text style={[ps.title, { color: T.text }]}>pH Position on Scale</Text>
      <View style={ps.bar}>
        {segs.map((c, i) => (
          <View key={i} style={[ps.seg, { backgroundColor: c }]} />
        ))}
        {pct !== null && (
          <View style={[ps.needle, { left: `${pct}%` }]}>
            <View style={[ps.needleLine, { backgroundColor: '#fff' }]} />
            <Text style={ps.needleLabel}>{ph?.toFixed(1)}</Text>
          </View>
        )}
      </View>
      <View style={ps.legend}>
        <Text style={{ color: '#EF4444', fontSize: 10, fontWeight: '700' }}>
          ← Acidic
        </Text>
        <Text style={{ color: '#22C55E', fontSize: 10, fontWeight: '700' }}>
          Neutral
        </Text>
        <Text style={{ color: '#8B5CF6', fontSize: 10, fontWeight: '700' }}>
          Alkaline →
        </Text>
      </View>
    </View>
  );
}

// ─── Nutrient Row ─────────────────────────────────────────────────────────────
function NutrientRow({ n, val, T, last }) {
  const st = getStatus(n.key, val);
  const fmt =
    val != null
      ? `${val.toFixed(
          n.key === 'ec' ? 3 : n.key === 'ph' ? 2 : n.key === 'oc' ? 2 : 0,
        )} ${n.unit}`
      : '— N/A';
  return (
    <View
      style={[
        nr.row,
        !last && { borderBottomWidth: 1, borderBottomColor: T.border },
      ]}
    >
      <Text style={nr.icon}>{n.icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[nr.name, { color: T.text }]}>{n.label}</Text>
        <Text style={[nr.desc, { color: T.muted }]}>{n.desc}</Text>
      </View>
      <Text style={[nr.val, { color: T.text }]}>{fmt}</Text>
      <View
        style={[
          nr.pill,
          { backgroundColor: st.color + '22', borderColor: st.color },
        ]}
      >
        <Text style={[nr.pillText, { color: st.color }]}>{st.label}</Text>
      </View>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ResultsScreen({ navigation }) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const T = theme.colors;

  const results = useSelector(s => s.test.results);

  // Save once on mount
  const savedRef = useRef(false);
  React.useEffect(() => {
    if (results && !savedRef.current) {
      savedRef.current = true;
      dispatch({ type: TEST_SAVED });
    }
  }, [results, dispatch]);

  // ── No results ────────────────────────────────────────────────────────────
  if (!results) {
    return (
      <SafeAreaView style={[s.bg, { backgroundColor: T.bg }]}>
        <StatusBar barStyle="light-content" backgroundColor={T.bg} />
        <TopBar
          title="Soil Results"
          onBack={() => navigation.goBack()}
          theme={theme}
        />
        <View style={s.empty}>
          <Icon
            name="alert-circle-outline"
            size={56}
            color={T.warning ?? '#F59E0B'}
          />
          <Text style={[s.emptyTitle, { color: T.warning ?? '#F59E0B' }]}>
            No results yet
          </Text>
          <Text style={[s.emptySub, { color: T.muted }]}>
            Complete the sensor phase first
          </Text>
          <AppButton
            label="Go Back"
            onPress={() => navigation.goBack()}
            color={T.primary}
            textColor="#fff"
            style={{ marginTop: 20, width: '70%' }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const { ph, ec, voltage, timestamp, raw, isMock } = results;

  // Health score
  const scored = NUTRIENTS.filter(n => results[n.key] != null);
  const good = scored.filter(
    n => getStatus(n.key, results[n.key]).level === 'high',
  ).length;
  const health = scored.length
    ? Math.round((good / scored.length) * 100)
    : ph !== null
    ? 50
    : 0;
  const hColor =
    health >= 70 ? '#22C55E' : health >= 40 ? '#F59E0B' : '#EF4444';

  const recs = getRecommendations(ph, ec);

  const phSt = getStatus('ph', ph);
  const ecSt = getStatus('ec', ec);

  return (
    <SafeAreaView style={[s.bg, { backgroundColor: T.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <TopBar
        title="Soil Test Results"
        onBack={() => navigation.goBack()}
        rightIcon="📤"
        onRight={() => navigation.navigate('ReportScreen')}
        theme={theme}
      />

      <ScrollView contentContainerStyle={s.scroll}>
        {/* ── Mock data disclaimer ──────────────────────────────── */}
        {isMock && (
          <View
            style={[
              s.mockBanner,
              { backgroundColor: '#F59E0B18', borderColor: '#F59E0B' },
            ]}
          >
            <Icon name="information-outline" size={16} color="#F59E0B" />
            <Text style={[s.mockText, { color: '#F59E0B' }]}>
              ⚠️ Results based on mock data — connect device & retake for
              accurate readings
            </Text>
          </View>
        )}

        {/* ── Health score banner ─────────────────────────────────── */}
        <View
          style={[
            s.scoreBanner,
            { backgroundColor: hColor + '15', borderColor: hColor },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[s.scoreLabel, { color: T.muted }]}>
              Soil Health Score
            </Text>
            <View
              style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}
            >
              <Text style={[s.scoreVal, { color: hColor }]}>{health}%</Text>
              <Text style={[s.scoreGrade, { color: hColor }]}>
                {health >= 70 ? 'Good' : health >= 40 ? 'Fair' : 'Poor'}
              </Text>
            </View>
            <Text style={[s.scoreHint, { color: T.muted }]}>
              {health >= 70
                ? '✅ Good soil condition for most crops'
                : health >= 40
                ? '⚠️ Some parameters need attention'
                : '❗ Significant soil amendment required'}
            </Text>
          </View>
          <Text style={{ fontSize: 52 }}>
            {health >= 70 ? '🌱' : health >= 40 ? '🌿' : '🍂'}
          </Text>
        </View>

        {/* ── Timestamp + raw payload ─────────────────────────────── */}
        {timestamp && (
          <View style={[s.metaRow, { borderColor: T.border }]}>
            <Icon name="clock-outline" size={12} color={T.muted} />
            <Text style={[s.metaText, { color: T.muted }]}>
              {new Date(timestamp).toLocaleTimeString()}
            </Text>
            {voltage !== null && (
              <Text style={[s.metaText, { color: T.muted }]}>
                ⚡ {voltage?.toFixed(4)} V
              </Text>
            )}
            {raw ? (
              <Text style={[s.metaRaw, { color: T.muted }]} numberOfLines={1}>
                raw: {raw}
              </Text>
            ) : null}
          </View>
        )}

        {/* ── pH + EC big cards ────────────────────────────────────── */}
        <View style={s.bigRow}>
          {/* pH card */}
          <View
            style={[
              s.bigCard,
              { borderColor: phSt.color, backgroundColor: phSt.color + '10' },
            ]}
          >
            <View style={[s.bigBadge, { backgroundColor: phSt.color }]}>
              <Text style={s.bigBadgeText}>pH</Text>
            </View>
            <Text style={s.bigEmoji}>
              {ph < 5.5 ? '🔴' : ph < 6.5 ? '🟡' : ph <= 7.5 ? '🟢' : '🟣'}
            </Text>
            <Text style={[s.bigValue, { color: phSt.color }]}>
              {ph !== null ? ph.toFixed(2) : '—'}
            </Text>
            <View style={[s.bigStatus, { backgroundColor: phSt.color + '22' }]}>
              <Text style={[s.bigStatusText, { color: phSt.color }]}>
                {phSt.label}
              </Text>
            </View>
            <Text style={[s.bigDesc, { color: T.muted }]} numberOfLines={2}>
              {ph < 6.0
                ? 'Too acidic for most crops'
                : ph <= 7.0
                ? 'Ideal for nutrient uptake'
                : 'Alkaline — may limit nutrients'}
            </Text>
          </View>

          {/* EC card */}
          <View
            style={[
              s.bigCard,
              { borderColor: ecSt.color, backgroundColor: ecSt.color + '10' },
            ]}
          >
            <View style={[s.bigBadge, { backgroundColor: ecSt.color }]}>
              <Text style={s.bigBadgeText}>EC</Text>
            </View>
            <Text style={s.bigEmoji}>
              {ec > 3.2 ? '🔴' : ec > 1.6 ? '🟠' : ec > 0.8 ? '✅' : '🟡'}
            </Text>
            <Text style={[s.bigValue, { color: ecSt.color }]}>
              {ec !== null ? ec.toFixed(3) : '—'}
            </Text>
            <View style={[s.bigStatus, { backgroundColor: ecSt.color + '22' }]}>
              <Text style={[s.bigStatusText, { color: ecSt.color }]}>
                {ecSt.label}
              </Text>
            </View>
            <Text style={[s.bigDesc, { color: T.muted }]} numberOfLines={2}>
              {ec !== null ? 'dS/m' : ''}
            </Text>
          </View>
        </View>

        {/* ── pH Scale ─────────────────────────────────────────────── */}
        <View
          style={[s.card, { backgroundColor: T.card, borderColor: T.border }]}
        >
          <PHScaleBar ph={ph} T={T} />
        </View>

        {/* ── Nutrient Analysis ────────────────────────────────────── */}
        <Text style={[Typography.h4, { color: T.text, marginBottom: 10 }]}>
          Nutrient Analysis
        </Text>
        <View
          style={[
            s.card,
            { backgroundColor: T.card, borderColor: T.border, padding: 0 },
          ]}
        >
          {NUTRIENTS.map((n, i) => (
            <NutrientRow
              key={n.key}
              n={n}
              val={results[n.key] ?? null}
              T={T}
              last={i === NUTRIENTS.length - 1}
            />
          ))}
        </View>

        {/* ── Recommendations ──────────────────────────────────────── */}
        <Text style={[Typography.h4, { color: T.text, marginBottom: 10 }]}>
          Recommendations
        </Text>
        {recs.map((r, i) => (
          <View
            key={i}
            style={[
              s.recCard,
              {
                backgroundColor: T.card,
                borderColor: r.color + '44',
                borderLeftColor: r.color,
              },
            ]}
          >
            <View style={[s.recIcon, { backgroundColor: r.color + '20' }]}>
              <Icon name={r.icon} size={20} color={r.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.recTitle, { color: T.white }]}>{r.title}</Text>
              <Text style={[s.recDesc, { color: T.text }]}>{r.desc}</Text>
            </View>
          </View>
        ))}

        {/* ── CTAs ─────────────────────────────────────────────────── */}
        <AppButton
          label="Full Report"
          onPress={() => navigation.navigate('ReportScreen')}
          color="#3B82F6"
          textColor="#fff"
          size="lg"
          icon="🖨️"
          style={{ marginBottom: 10, marginTop: 6 }}
        />
        <AppButton
          label="Save Farmer Details"
          onPress={() => navigation.navigate('FarmerDetailsScreen')}
          outlined
          color={T.primary}
          size="lg"
          icon="👨‍🌾"
          style={{ marginBottom: 10 }}
        />
        <AppButton
          label="New Soil Test"
          onPress={() => navigation.replace('IntroScreen')}
          outlined
          color={T.muted}
          size="lg"
          icon="🔄"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  bg: { flex: 1 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', marginTop: 16 },
  emptySub: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  scroll: { padding: Spacing.lg, paddingBottom: 40 },
  mockBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 10,
    marginBottom: 12,
  },
  mockText: { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  scoreBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 14,
  },
  scoreLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  scoreVal: { fontSize: 44, fontWeight: '900', letterSpacing: -1 },
  scoreGrade: { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  scoreHint: { fontSize: 12, marginTop: 2 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 8,
    marginBottom: 14,
  },
  metaText: { fontSize: 11 },
  metaRaw: { fontSize: 10, flex: 2, fontFamily: 'Courier' },
  bigRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  bigCard: {
    flex: 1,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    padding: 14,
    alignItems: 'center',
  },
  bigBadge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 6,
  },
  bigBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  bigEmoji: { fontSize: 22, marginBottom: 4 },
  bigValue: {
    fontSize: 36,
    fontWeight: '900',
    fontFamily: 'Courier',
    letterSpacing: -1,
  },
  bigStatus: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 6,
    marginBottom: 4,
  },
  bigStatusText: { fontSize: 10, fontWeight: '800' },
  bigDesc: { fontSize: 10, textAlign: 'center', lineHeight: 14 },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: 14,
  },
  recCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: Spacing.md,
    marginBottom: 8,
  },
  recIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recTitle: { fontSize: 13, fontWeight: '800', marginBottom: 3 },
  recDesc: { fontSize: 12, lineHeight: 18 },
});

const ps = StyleSheet.create({
  title: { fontSize: 12, fontWeight: '800', marginBottom: 8 },
  bar: {
    height: 16,
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'visible',
    position: 'relative',
    marginBottom: 4,
  },
  seg: { flex: 1, height: 16 },
  needle: {
    position: 'absolute',
    top: -3,
    alignItems: 'center',
    transform: [{ translateX: -1 }],
  },
  needleLine: { width: 2, height: 22, borderRadius: 1 },
  needleLabel: { fontSize: 9, color: '#fff', fontWeight: '900', marginTop: 2 },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
});

const nr = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    gap: 10,
  },
  icon: { fontSize: 18, width: 26 },
  name: { fontSize: 13, fontWeight: '700' },
  desc: { fontSize: 10, marginTop: 1 },
  val: { fontSize: 12, fontWeight: '700', minWidth: 72, textAlign: 'right' },
  pill: {
    borderRadius: 5,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 52,
    alignItems: 'center',
  },
  pillText: { fontSize: 9, fontWeight: '800' },
});
