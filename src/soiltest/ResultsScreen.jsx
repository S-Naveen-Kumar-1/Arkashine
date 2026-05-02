// src/screens/soiltest/ResultsScreen.jsx

import React, { useRef, useEffect, useCallback } from 'react';
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
import { AppButton, TopBar } from '../components/common';
import useTheme from '../hooks/useTheme';
import { Spacing, Typography, Radius } from '../theme';
import { TEST_SAVED } from '../config/actionTypes';
import {
  createSoilReading,
  getSoilRecommendations,
  getSoilAIRecommendations,
  buildSoilPayload,
} from '../redux/actions/soilsaathiActions';

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

function getLocalRecs(ph, ec) {
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
        title: 'Leach Excess Salts',
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
  recs.push({
    icon: 'calendar-check',
    color: '#94A3B8',
    title: 'Schedule Next Test',
    desc: 'Re-test pH and EC every 4–8 weeks during the growing season.',
  });
  return recs;
}

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

// ─── Sub-components ───────────────────────────────────────────────────────────
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
            <View style={[ps.line, { backgroundColor: '#fff' }]} />
            <Text style={ps.label}>{ph?.toFixed(1)}</Text>
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

function UploadChip({ status, error, onRetry, T }) {
  const cfg = {
    idle: { icon: 'cloud-outline', color: T.muted, text: 'Not uploaded' },
    loading: { icon: 'cloud-upload', color: '#F59E0B', text: 'Uploading…' },
    success: { icon: 'cloud-check', color: '#22C55E', text: 'Saved to server' },
    error: { icon: 'cloud-alert', color: '#EF4444', text: 'Upload failed' },
  }[status] ?? { icon: 'cloud-outline', color: T.muted, text: '' };

  return (
    <TouchableOpacity
      style={[
        uc.chip,
        { backgroundColor: cfg.color + '18', borderColor: cfg.color },
      ]}
      onPress={status === 'error' ? onRetry : undefined}
      activeOpacity={status === 'error' ? 0.75 : 1}
    >
      {status === 'loading' ? (
        <ActivityIndicator size="small" color={cfg.color} />
      ) : (
        <Icon name={cfg.icon} size={13} color={cfg.color} />
      )}
      <Text style={[uc.text, { color: cfg.color }]}>{cfg.text}</Text>
      {status === 'error' && (
        <Text style={[uc.retry, { color: cfg.color }]}>Tap to retry</Text>
      )}
    </TouchableOpacity>
  );
}

function RecCard({ rec, T }) {
  const title = rec.title ?? rec.recommendation ?? rec.name ?? 'Recommendation';
  const desc = rec.description ?? rec.detail ?? rec.message ?? rec.desc ?? '';
  const color = rec.color ?? '#22C55E';
  const icon = rec.icon ?? 'information-outline';
  return (
    <View
      style={[
        s.recCard,
        {
          backgroundColor: T.card,
          borderColor: color + '44',
          borderLeftColor: color,
        },
      ]}
    >
      <View style={[s.recIcon, { backgroundColor: color + '20' }]}>
        <Icon name={icon} size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.recTitle, { color: T.white }]}>{title}</Text>
        {!!desc && <Text style={[s.recDesc, { color: T.text }]}>{desc}</Text>}
      </View>
    </View>
  );
}

function AISection({ data, status, T }) {
  if (status === 'loading') {
    return (
      <View
        style={[s.aiBox, { backgroundColor: T.card, borderColor: T.border }]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <ActivityIndicator size="small" color="#8B5CF6" />
          <Text style={[s.aiBoxHint, { color: T.muted }]}>
            Generating AI analysis…
          </Text>
        </View>
      </View>
    );
  }
  if (!data) return null;
  const text =
    typeof data === 'string'
      ? data
      : data.recommendation ??
        data.text ??
        data.content ??
        JSON.stringify(data, null, 2);
  return (
    <View
      style={[s.aiBox, { backgroundColor: T.card, borderColor: '#8B5CF6' }]}
    >
      <View style={s.aiHeader}>
        <Icon name="robot" size={15} color="#8B5CF6" />
        <Text style={[s.aiTitle, { color: '#8B5CF6' }]}>AI Recommendation</Text>
        <View style={s.aiBadge}>
          <Text style={s.aiBadgeText}>AI</Text>
        </View>
      </View>
      <Text style={[s.aiText, { color: T.text }]}>{text}</Text>
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ResultsScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const T = theme.colors;

  const results = useSelector(s => s.test.results);
  const selectedProduct = useSelector(s => s.userDevices.selectedProduct);
  const deviceId = selectedProduct?.deviceId;
  console.log(deviceId, 'check', selectedProduct);

  const {
    createStatus,
    createError,
    currentId,
    currentRecord,
    recsStatus,
    recommendations,
    aiRecsStatus,
    aiRecommendations,
  } = useSelector(s => s.soilsaathi);

  const savedRef = useRef(false);
  const submittedRef = useRef(false);

  // Mark test saved in Redux history
  useEffect(() => {
    if (results && !savedRef.current) {
      savedRef.current = true;
      dispatch({ type: TEST_SAVED });
    }
  }, [results, dispatch]);
useEffect(() => {
  const fetchRecs = async () => {
    if (currentId && recsStatus === 'idle') {
      const getsoilRec = await dispatch(
        getSoilRecommendations(deviceId, currentId),
      );
      const getsoilAiRec = await dispatch(
        getSoilAIRecommendations(deviceId, currentId),
      );

      console.log(getsoilRec, 'soil rec check', getsoilAiRec);
    }
  };

  fetchRecs();
}, [currentId, recsStatus, deviceId, dispatch]);
  // Submit to server then fetch recs
  const runAPIFlow = useCallback(() => {
    // if (submittedRef.current || !results) return;
    // submittedRef.current = true;

    const payload = buildSoilPayload(results, {
      areaName: route?.params?.areaName ?? 'Field Test',
      tag: route?.params?.tag ?? '',
      cropType: route?.params?.cropType ?? 'arabica_coffee',
      latitude: route?.params?.latitude ?? 0,
      longitude: route?.params?.longitude ?? 0,
    });

    dispatch(createSoilReading(deviceId, payload));
  }, [results, deviceId, dispatch, route?.params]);

  useEffect(() => {
    runAPIFlow();
  }, []);

  const handleRetry = () => {
    submittedRef.current = false;
    dispatch({ type: 'SOIL_CLEAR' });
    runAPIFlow();
  };

  // ── Guard ──────────────────────────────────────────────────────────────────
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

  const phSt = getStatus('ph', ph);
  const ecSt = getStatus('ec', ec);

  // Resolve which recs to show
  const serverArr =
    recommendations?.results ??
    (Array.isArray(recommendations) ? recommendations : null);
  const showServer = recsStatus === 'success' && serverArr?.length > 0;
  const localRecs = getLocalRecs(ph, ec);

  return (
    <SafeAreaView style={[s.bg, { backgroundColor: T.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <TopBar
        title="Soil Test Results"
        onBack={() => navigation.goBack()}
        rightIcon="📤"
        onRight={() =>
          navigation.navigate('ReportScreen', { callId: currentId })
        }
        theme={theme}
      />

      <ScrollView contentContainerStyle={s.scroll}>
        {/* ── Mock warning ─────────────────────────────────────────── */}
        {isMock && (
          <View
            style={[
              s.mockBanner,
              { backgroundColor: '#F59E0B18', borderColor: '#F59E0B' },
            ]}
          >
            <Icon name="information-outline" size={14} color="#F59E0B" />
            <Text style={[s.mockText, { color: '#F59E0B' }]}>
              ⚠️ Results based on mock data — connect device & retake for
              accurate readings
            </Text>
          </View>
        )}

        {/* ── Upload chip ──────────────────────────────────────────── */}
        <UploadChip
          status={createStatus}
          error={createError}
          onRetry={handleRetry}
          T={T}
        />

        {/* ── Server record badge ──────────────────────────────────── */}
        {currentId && (
          <View
            style={[
              s.savedChip,
              { backgroundColor: '#22C55E18', borderColor: '#22C55E' },
            ]}
          >
            <Icon name="database-check" size={12} color="#22C55E" />
            <Text style={{ color: '#22C55E', fontSize: 11, fontWeight: '700' }}>
              Record #{currentId}
              {currentRecord?.area_name ? ` · ${currentRecord.area_name}` : ''}
            </Text>
          </View>
        )}

        {/* ── Health score banner ──────────────────────────────────── */}
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
          <Text style={{ fontSize: 50 }}>
            {health >= 70 ? '🌱' : health >= 40 ? '🌿' : '🍂'}
          </Text>
        </View>

        {/* ── Timestamp + raw ──────────────────────────────────────── */}
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
          </View>

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
            <Text style={[s.bigDesc, { color: T.muted }]}>dS/m</Text>
          </View>
        </View>

        {/* ── pH Scale bar ─────────────────────────────────────────── */}
        <View
          style={[s.card, { backgroundColor: T.card, borderColor: T.border }]}
        >
          <PHScaleBar ph={ph} T={T} />
        </View>

        {/* ── Nutrient table ────────────────────────────────────────── */}
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

        {/* ── Recommendations ───────────────────────────────────────── */}
        <View style={s.sectionHeader}>
          <Text style={[Typography.h4, { color: T.text }]}>
            Recommendations
          </Text>
          {recsStatus === 'loading' && (
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <ActivityIndicator size="small" color={T.primary} />
              <Text style={{ fontSize: 11, color: T.muted }}>
                Loading from server…
              </Text>
            </View>
          )}
          {recsStatus === 'success' && (
            <View
              style={[
                s.srcBadge,
                { backgroundColor: T.primaryGlow, borderColor: T.primary },
              ]}
            >
              <Icon name="server" size={9} color={T.primary} />
              <Text
                style={{ fontSize: 9, color: T.primary, fontWeight: '800' }}
              >
                SERVER
              </Text>
            </View>
          )}
        </View>

        {(showServer ? serverArr : localRecs).map((r, i) => (
          <RecCard key={i} rec={r} T={T} />
        ))}

        {/* ── AI Analysis ───────────────────────────────────────────── */}
        <View style={[s.sectionHeader, { marginTop: 6 }]}>
          <Text style={[Typography.h4, { color: T.text }]}>AI Analysis</Text>
        </View>
        <AISection data={aiRecommendations} status={aiRecsStatus} T={T} />

        {/* ── CTAs ──────────────────────────────────────────────────── */}
        <AppButton
          label="Full Report"
          onPress={() =>
            navigation.navigate('ReportScreen', { callId: currentId })
          }
          color="#3B82F6"
          textColor="#fff"
          size="lg"
          icon="🖨️"
          style={{ marginBottom: 10, marginTop: 14 }}
        />
        <AppButton
          label="Save Farmer Details"
          onPress={() =>
            navigation.navigate('FarmerDetailsScreen', { callId: currentId })
          }
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
    marginBottom: 8,
  },
  mockText: { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  savedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  scoreBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 12,
  },
  scoreLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  scoreVal: { fontSize: 42, fontWeight: '900', letterSpacing: -1 },
  scoreGrade: { fontSize: 16, fontWeight: '800', marginBottom: 6 },
  scoreHint: { fontSize: 12, marginTop: 2 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 8,
    marginBottom: 12,
  },
  metaText: { fontSize: 11 },
  metaRaw: { fontSize: 10, flex: 2, fontFamily: 'Courier' },
  bigRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
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
    fontSize: 34,
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
  bigDesc: { fontSize: 10 },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  srcBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
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
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recTitle: { fontSize: 13, fontWeight: '800', marginBottom: 3 },
  recDesc: { fontSize: 12, lineHeight: 18 },
  aiBox: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: 12,
    gap: 10,
  },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiTitle: { fontSize: 14, fontWeight: '800', flex: 1, color: '#8B5CF6' },
  aiBadge: {
    borderRadius: 4,
    backgroundColor: '#8B5CF622',
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  aiBadgeText: { fontSize: 8, color: '#8B5CF6', fontWeight: '900' },
  aiBoxHint: { fontSize: 12 },
  aiText: { fontSize: 13, lineHeight: 20 },
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
  line: { width: 2, height: 22, borderRadius: 1 },
  label: { fontSize: 9, color: '#fff', fontWeight: '900', marginTop: 2 },
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

const uc = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 11, fontWeight: '700' },
  retry: {
    fontSize: 10,
    fontWeight: '600',
    textDecorationLine: 'underline',
    marginLeft: 2,
  },
});
