// src/screens/phtest/PHECResultScreen.jsx
// Beautiful pH & EC result screen with interpretation, recommendations,
// and reconnect handling. Mock voltage if no real data available.

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Modal,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Radius, Spacing } from '../theme';
import { TopBar } from '../components/common';
import useTheme from '../hooks/useTheme';
import { saveTestResult, requestReading } from '../redux/actions/testActions';
// ─── Interpretation helpers ───────────────────────────────────────────────────
function getPHStatus(ph) {
  if (ph === null || ph === undefined) return null;
  if (ph < 5.5)
    return {
      label: 'Strongly Acidic',
      emoji: '🔴',
      color: '#EF4444',
      level: 'critical',
      desc: 'Soil is severely acidic. Most nutrients are unavailable to plants.',
    };
  if (ph < 6.0)
    return {
      label: 'Acidic',
      emoji: '🟠',
      color: '#F97316',
      level: 'low',
      desc: 'Slightly acidic. Suitable for acid-loving crops like blueberries.',
    };
  if (ph < 6.5)
    return {
      label: 'Slightly Acidic',
      emoji: '🟡',
      color: '#F59E0B',
      level: 'medium',
      desc: 'Near-optimal. Suitable for most crops. Monitor regularly.',
    };
  if (ph <= 7.0)
    return {
      label: 'Neutral',
      emoji: '🟢',
      color: '#22C55E',
      level: 'optimal',
      desc: 'Ideal pH range. Maximum nutrient availability for most crops.',
    };
  if (ph <= 7.5)
    return {
      label: 'Slightly Alkaline',
      emoji: '🔵',
      color: '#3B82F6',
      level: 'medium',
      desc: 'Slightly alkaline. Some micronutrients may be less available.',
    };
  if (ph <= 8.0)
    return {
      label: 'Alkaline',
      emoji: '🟣',
      color: '#8B5CF6',
      level: 'low',
      desc: 'Alkaline soil. Iron, zinc, manganese uptake may be limited.',
    };
  return {
    label: 'Strongly Alkaline',
    emoji: '⛔',
    color: '#EF4444',
    level: 'critical',
    desc: 'Very alkaline. Significant soil amendment required.',
  };
}

function getECStatus(ec) {
  if (ec === null || ec === undefined) return null;
  if (ec < 0.1)
    return {
      label: 'Very Low',
      emoji: '⬇️',
      color: '#94A3B8',
      level: 'low',
      alert: false,
      desc: 'Insufficient mineral salts. Heavy fertilisation needed.',
    };
  if (ec < 0.8)
    return {
      label: 'Low',
      emoji: '🟡',
      color: '#F59E0B',
      level: 'low',
      alert: false,
      desc: 'Low salts. Suitable for salt-sensitive crops. Add balanced fertiliser.',
    };
  if (ec < 1.6)
    return {
      label: 'Optimal',
      emoji: '✅',
      color: '#22C55E',
      level: 'optimal',
      alert: false,
      desc: 'Ideal conductivity. Most crops will thrive in these conditions.',
    };
  if (ec < 3.2)
    return {
      label: 'High',
      emoji: '🟠',
      color: '#F97316',
      level: 'high',
      alert: true,
      desc: 'Elevated salt levels. Reduce fertiliser; monitor for crop stress.',
    };
  return {
    label: 'Very High — Salt Alert',
    emoji: '🔴',
    color: '#EF4444',
    level: 'critical',
    alert: true,
    desc: 'Excessive salts. Leaching/drainage urgently required.',
  };
}

// ─── Recommendations engine ───────────────────────────────────────────────────
function getRecommendations(ph, ec) {
  const recs = [];

  // pH recommendations
  if (ph !== null) {
    if (ph < 5.5) {
      recs.push({
        icon: 'flask',
        color: '#22C55E',
        title: 'Apply Agricultural Lime',
        desc: 'Add 2–4 t/ha of dolomitic limestone to raise pH. Re-test after 6 weeks.',
      });
      recs.push({
        icon: 'alert',
        color: '#EF4444',
        title: 'Urgent Intervention',
        desc: 'At pH < 5.5, aluminium and manganese can reach toxic levels. Act promptly.',
      });
    } else if (ph < 6.0) {
      recs.push({
        icon: 'flask',
        color: '#F59E0B',
        title: 'Lime Application Advised',
        desc: 'Apply 1–2 t/ha of garden lime to bring pH toward 6.5–7.0.',
      });
    } else if (ph > 8.0) {
      recs.push({
        icon: 'bottle-tonic',
        color: '#8B5CF6',
        title: 'Apply Sulphur or Acidic Fertiliser',
        desc: 'Use elemental sulphur (200–400 kg/ha) or ammonium sulfate to lower pH.',
      });
    } else if (ph >= 7.5) {
      recs.push({
        icon: 'water',
        color: '#3B82F6',
        title: 'Monitor Micronutrient Availability',
        desc: 'At pH 7.5+, iron and zinc deficiency is common. Consider chelated foliar sprays.',
      });
    } else {
      recs.push({
        icon: 'check-circle',
        color: '#22C55E',
        title: 'pH is Optimal',
        desc: 'Maintain current practices. Re-test every 6 months during cropping season.',
      });
    }
  }

  // EC recommendations
  if (ec !== null) {
    if (ec < 0.1) {
      recs.push({
        icon: 'leaf',
        color: '#22C55E',
        title: 'Soil Needs Fertilisation',
        desc: 'Very low EC indicates nutrient-depleted soil. Apply NPK 20-20-20 at recommended rates.',
      });
    } else if (ec < 0.8) {
      recs.push({
        icon: 'sprout',
        color: '#F59E0B',
        title: 'Increase Nutrient Application',
        desc: 'Apply balanced fertiliser. Consider slow-release formulations for steady supply.',
      });
    } else if (ec > 3.2) {
      recs.push({
        icon: 'water-pump',
        color: '#EF4444',
        title: 'Leach Excess Salts Immediately',
        desc: 'Irrigate heavily (2× normal volume) to flush salt below root zone. Test again in 48 hours.',
      });
      recs.push({
        icon: 'pause-circle',
        color: '#F97316',
        title: 'Halt Fertiliser Applications',
        desc: 'Stop all fertilisation until EC drops below 2.0 dS/m to prevent root burn.',
      });
    } else if (ec > 1.6) {
      recs.push({
        icon: 'water',
        color: '#F97316',
        title: 'Reduce Fertiliser Rate',
        desc: 'Reduce fertiliser application by 30% and monitor EC weekly.',
      });
    } else {
      recs.push({
        icon: 'check-circle',
        color: '#22C55E',
        title: 'EC is Optimal',
        desc: 'Maintain current fertiliser regime. Continue regular monitoring.',
      });
    }
  }

  // pH + EC combined
  if (ph !== null && ec !== null) {
    if (ph < 6.0 && ec < 0.5) {
      recs.push({
        icon: 'test-tube',
        color: '#8B5CF6',
        title: 'Soil Amendment Strategy',
        desc: 'Combine lime application with NPK fertilisation for comprehensive soil recovery.',
      });
    }
    if (ph > 7.0 && ec > 2.0) {
      recs.push({
        icon: 'alert-circle',
        color: '#EF4444',
        title: 'High pH + High Salt — Critical',
        desc: 'This combination severely limits nutrient uptake. Consult an agronomist for soil amendment plan.',
      });
    }
  }

  // General
  recs.push({
    icon: 'calendar-check',
    color: '#94A3B8',
    title: 'Schedule Next Test',
    desc: 'Re-test pH and EC every 4–8 weeks during the growing season for best results.',
  });

  return recs;
}

// ─── pH Scale Visualiser ──────────────────────────────────────────────────────
function PHScaleBar({ ph, T }) {
  const segments = [
    { label: '0–4', color: '#DC2626' },
    { label: '4–5.5', color: '#EF4444' },
    { label: '5.5–6', color: '#F97316' },
    { label: '6–6.5', color: '#F59E0B' },
    { label: '6.5–7', color: '#22C55E' },
    { label: '7–7.5', color: '#3B82F6' },
    { label: '7.5–8', color: '#8B5CF6' },
    { label: '8–14', color: '#7C3AED' },
  ];
  const pct = ph !== null ? Math.min(100, Math.max(0, (ph / 14) * 100)) : null;

  return (
    <View style={phBar.wrap}>
      <Text style={[phBar.title, { color: T.text }]}>pH Scale Position</Text>
      <View style={phBar.barRow}>
        {segments.map((seg, i) => (
          <View key={i} style={[phBar.seg, { backgroundColor: seg.color }]} />
        ))}
        {pct !== null && (
          <View style={[phBar.needle, { left: `${pct}%` }]}>
            <View style={[phBar.needleLine, { backgroundColor: T.white }]} />
            <Text style={[phBar.needleVal, { color: T.white }]}>
              {ph?.toFixed(1)}
            </Text>
          </View>
        )}
      </View>
      <View style={phBar.labels}>
        {['0', '2', '4', '6', '7', '8', '10', '14'].map(v => (
          <Text key={v} style={[phBar.scaleLabel, { color: T.muted }]}>
            {v}
          </Text>
        ))}
      </View>
      <View style={phBar.legend}>
        <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '700' }}>
          ← Acidic
        </Text>
        <Text style={{ color: '#22C55E', fontSize: 11, fontWeight: '700' }}>
          Neutral
        </Text>
        <Text style={{ color: '#8B5CF6', fontSize: 11, fontWeight: '700' }}>
          Alkaline →
        </Text>
      </View>
    </View>
  );
}

// ─── EC Gauge ─────────────────────────────────────────────────────────────────
function ECGaugeBar({ ec, T }) {
  const zones = [
    { max: 0.1, color: '#94A3B8', label: 'Very Low' },
    { max: 0.8, color: '#F59E0B', label: 'Low' },
    { max: 1.6, color: '#22C55E', label: 'Optimal' },
    { max: 3.2, color: '#F97316', label: 'High' },
    { max: 6.0, color: '#EF4444', label: 'Very High' },
  ];
  const maxEC = 6.0;
  const pct =
    ec !== null ? Math.min(100, Math.max(0, (ec / maxEC) * 100)) : null;

  return (
    <View style={ecG.wrap}>
      <Text style={[ecG.title, { color: T.text }]}>EC Range Position</Text>
      <View style={ecG.barRow}>
        {zones.map((z, i) => (
          <View
            key={i}
            style={[ecG.seg, { backgroundColor: z.color, flex: z.max / maxEC }]}
          />
        ))}
        {pct !== null && (
          <View style={[ecG.needle, { left: `${pct}%` }]}>
            <View style={[ecG.needleLine, { backgroundColor: T.white }]} />
            <Text style={[ecG.needleVal, { color: T.white }]}>
              {ec?.toFixed(2)}
            </Text>
          </View>
        )}
      </View>
      <View style={ecG.labels}>
        {['0', '0.8', '1.6', '3.2', '6.0'].map(v => (
          <Text key={v} style={[ecG.label, { color: T.muted }]}>
            {v}
          </Text>
        ))}
      </View>
    </View>
  );
}

// ─── Big reading card ─────────────────────────────────────────────────────────
function BigCard({ badge, value, unit, status, T }) {
  return (
    <View
      style={[
        bc.card,
        {
          borderColor: status?.color ?? T.border,
          backgroundColor: (status?.color ?? '#000') + '10',
        },
      ]}
    >
      <View style={[bc.badge, { backgroundColor: status?.color ?? T.border }]}>
        <Text style={bc.badgeText}>{badge}</Text>
      </View>
      <Text style={[bc.emoji]}>{status?.emoji ?? '—'}</Text>
      <Text style={[bc.value, { color: status?.color ?? T.muted }]}>
        {value ?? '—'}
      </Text>
      {unit && <Text style={[bc.unit, { color: T.muted }]}>{unit}</Text>}
      <View
        style={[
          bc.statusPill,
          { backgroundColor: (status?.color ?? T.border) + '22' },
        ]}
      >
        <Text style={[bc.statusText, { color: status?.color ?? T.muted }]}>
          {status?.label ?? 'No data'}
        </Text>
      </View>
    </View>
  );
}

// ─── Alert Modal ──────────────────────────────────────────────────────────────
function SaltAlertModal({ visible, onClose, ec, T }) {
  return (
    <Modal transparent visible={visible} animationType="slide">
      <View style={m.overlay}>
        <View
          style={[m.sheet, { backgroundColor: T.card, borderColor: '#EF4444' }]}
        >
          <View style={[m.iconRing, { backgroundColor: '#EF444422' }]}>
            <Icon name="alert-octagram" size={40} color="#EF4444" />
          </View>
          <Text style={[m.title, { color: '#EF4444' }]}>
            ⚠️ High Salt Alert
          </Text>
          <Text style={[m.body, { color: T.text }]}>
            EC reading of{' '}
            <Text style={{ fontWeight: '900', color: '#EF4444' }}>
              {ec?.toFixed(3)} dS/m
            </Text>{' '}
            indicates elevated soil salinity.
          </Text>
          <Text style={[m.sub, { color: T.muted }]}>
            Immediate leaching is recommended to prevent crop damage. Halt all
            fertiliser applications until EC drops below 2.0 dS/m.
          </Text>
          <TouchableOpacity
            style={[m.btn, { backgroundColor: '#EF4444' }]}
            onPress={onClose}
          >
            <Text style={m.btnText}>Understood — I'll Act</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PHECResultScreen({ navigation }) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const T = theme.colors;

  const sensorData = useSelector(s => s.ble.sensorData);
  const lastReceived = useSelector(s => s.ble.lastReceived);
  const { readingState, results } = useSelector(s => s.test);
  const { connected } = useSelector(s => s.ble);

  const [alertVisible, setAlertVisible] = useState(false);
  const [resultSaved, setResultSaved] = useState(false);

  // Use saved results or live sensor data
  const ph = results?.ph ?? sensorData.ph;
  const ec = results?.ec ?? sensorData.ec;
  const voltage = results?.voltage ?? sensorData.voltage;

  const loading = readingState === 'reading' && ph === null && ec === null;

  const phStatus = getPHStatus(ph);
  const ecStatus = getECStatus(ec);
  const recommendations = getRecommendations(ph, ec);

  // Loading spinner
  const spinAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!loading) return;
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, [loading]);
  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Auto-save result
  useEffect(() => {
    if (!resultSaved && ph !== null && ec !== null) {
      dispatch(saveTestResult({ ph, ec, voltage, raw: sensorData.raw }));
      setResultSaved(true);
      if (ecStatus?.alert) setTimeout(() => setAlertVisible(true), 800);
    }
  }, [ph, ec, resultSaved]);

  const handleRetry = () => {
    setResultSaved(false);
    dispatch(requestReading());
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: T.bg }]}>
        <StatusBar barStyle="light-content" backgroundColor={T.bg} />
        <TopBar
          title="Reading Results…"
          onBack={() => navigation.goBack()}
          theme={theme}
        />
        <View style={s.centeredBody}>
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Icon name="refresh" size={56} color={T.primary} />
          </Animated.View>
          <Text style={[s.loadingText, { color: T.primary }]}>
            Acquiring sensor data…
          </Text>
          <Text style={[s.loadingSub, { color: T.muted }]}>
            Please keep the probe submerged
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── No data ────────────────────────────────────────────────────────────────
  if (ph === null && ec === null) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: T.bg }]}>
        <StatusBar barStyle="light-content" backgroundColor={T.bg} />
        <TopBar
          title="pH & EC Results"
          onBack={() => navigation.goBack()}
          theme={theme}
        />
        <View style={s.centeredBody}>
          <Icon
            name="alert-circle-outline"
            size={56}
            color={T.warning ?? '#F59E0B'}
          />
          <Text style={[s.loadingText, { color: T.warning ?? '#F59E0B' }]}>
            No data received
          </Text>
          <Text style={[s.loadingSub, { color: T.muted }]}>
            Ensure device is connected and probe is submerged in solution
          </Text>
          <TouchableOpacity
            style={[s.retryBtn, { backgroundColor: T.primary, marginTop: 24 }]}
            onPress={handleRetry}
          >
            <Icon name="refresh" size={18} color="#fff" />
            <Text style={s.retryBtnText}>Retry Reading</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Overall health score
  const scores = [phStatus?.level, ecStatus?.level];
  const scoreMap = {
    optimal: 100,
    medium: 65,
    low: 35,
    high: 35,
    critical: 10,
  };
  const avgScore = Math.round(
    scores.filter(Boolean).reduce((a, l) => a + (scoreMap[l] ?? 50), 0) /
      Math.max(1, scores.filter(Boolean).length),
  );
  const scoreColor =
    avgScore >= 70 ? '#22C55E' : avgScore >= 40 ? '#F59E0B' : '#EF4444';

  return (
    <SafeAreaView style={[s.container, { backgroundColor: T.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <TopBar
        title="pH & EC Results"
        onBack={() => navigation.goBack()}
        theme={theme}
      />

      {/* Salt alert */}
      <SaltAlertModal
        visible={alertVisible}
        onClose={() => setAlertVisible(false)}
        ec={ec}
        T={T}
      />

      <ScrollView contentContainerStyle={s.scroll}>
        {/* ── Connection / timestamp bar ──────────────────────── */}
        <View
          style={[
            s.statusBar,
            { borderColor: T.border, backgroundColor: T.cardAlt },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View
              style={[
                s.connDot,
                { backgroundColor: connected ? T.primary : '#EF4444' },
              ]}
            />
            <Text style={[s.statusBarText, { color: T.muted }]}>
              {connected ? 'Device online' : 'Device offline'}
            </Text>
          </View>
          {lastReceived && (
            <Text style={[s.statusBarText, { color: T.muted }]}>
              <Icon name="clock-outline" size={11} />{' '}
              {new Date(lastReceived).toLocaleTimeString()}
            </Text>
          )}
          {voltage !== null && (
            <Text style={[s.statusBarText, { color: T.muted }]}>
              ⚡ {voltage?.toFixed(4)} V
            </Text>
          )}
        </View>

        {/* ── Soil health score banner ─────────────────────────── */}
        <View
          style={[
            s.scoreBanner,
            { backgroundColor: scoreColor + '15', borderColor: scoreColor },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[s.scoreLabel, { color: T.muted }]}>
              Overall Soil Health
            </Text>
            <View
              style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}
            >
              <Text style={[s.scoreVal, { color: scoreColor }]}>
                {avgScore}%
              </Text>
              <Text style={[s.scoreGrade, { color: scoreColor }]}>
                {avgScore >= 70 ? 'Good' : avgScore >= 40 ? 'Fair' : 'Poor'}
              </Text>
            </View>
            <Text style={[s.scoreHint, { color: T.muted }]}>
              {avgScore >= 70
                ? '✅ Soil in good condition for most crops'
                : avgScore >= 40
                ? '⚠️ Some parameters need attention'
                : '❗ Significant soil amendment required'}
            </Text>
          </View>
          <Text style={{ fontSize: 52 }}>
            {avgScore >= 70 ? '🌱' : avgScore >= 40 ? '🌿' : '🍂'}
          </Text>
        </View>

        {/* ── Big readings row ──────────────────────────────────── */}
        <View style={s.bigRow}>
          <BigCard
            badge="pH"
            value={ph?.toFixed(2)}
            unit={null}
            status={phStatus}
            T={T}
          />
          <BigCard
            badge="EC"
            value={ec?.toFixed(3)}
            unit="dS/m"
            status={ecStatus}
            T={T}
          />
        </View>

        {/* ── pH description ────────────────────────────────────── */}
        {phStatus && (
          <View
            style={[
              s.descCard,
              {
                backgroundColor: phStatus.color + '10',
                borderColor: phStatus.color + '40',
              },
            ]}
          >
            <View style={s.descRow}>
              <Icon name="ph" size={18} color={phStatus.color} />
              <Text style={[s.descTitle, { color: phStatus.color }]}>
                pH: {phStatus.label}
              </Text>
            </View>
            <Text style={[s.descText, { color: T.text }]}>{phStatus.desc}</Text>
          </View>
        )}

        {/* ── EC description ────────────────────────────────────── */}
        {ecStatus && (
          <View
            style={[
              s.descCard,
              {
                backgroundColor: ecStatus.color + '10',
                borderColor: ecStatus.color + '40',
              },
            ]}
          >
            <View style={s.descRow}>
              <Icon name="lightning-bolt" size={18} color={ecStatus.color} />
              <Text style={[s.descTitle, { color: ecStatus.color }]}>
                EC: {ecStatus.label}
              </Text>
            </View>
            <Text style={[s.descText, { color: T.text }]}>{ecStatus.desc}</Text>
          </View>
        )}

        {/* ── pH Scale visualiser ──────────────────────────────── */}
        <View
          style={[
            s.sectionCard,
            { backgroundColor: T.card, borderColor: T.border },
          ]}
        >
          <PHScaleBar ph={ph} T={T} />
        </View>

        {/* ── EC Gauge ─────────────────────────────────────────── */}
        <View
          style={[
            s.sectionCard,
            { backgroundColor: T.card, borderColor: T.border },
          ]}
        >
          <ECGaugeBar ec={ec} T={T} />
        </View>

        {/* ── Detailed readings table ──────────────────────────── */}
        <View
          style={[
            s.sectionCard,
            { backgroundColor: T.card, borderColor: T.border },
          ]}
        >
          <View style={s.sectionHeader}>
            <Icon name="table" size={16} color={T.primary} />
            <Text style={[s.sectionTitle, { color: T.white }]}>
              Detailed Readings
            </Text>
          </View>
          {[
            {
              label: 'pH Value',
              value: ph?.toFixed(2) ?? 'N/A',
              icon: 'ph',
              color: phStatus?.color ?? T.muted,
            },
            {
              label: 'EC Value',
              value: ec !== null ? `${ec?.toFixed(3)} dS/m` : 'N/A',
              icon: 'lightning-bolt',
              color: ecStatus?.color ?? T.muted,
            },
            {
              label: 'Probe Voltage',
              value: voltage !== null ? `${voltage?.toFixed(4)} V` : 'N/A',
              icon: 'flash',
              color: T.muted,
            },
            {
              label: 'Measured At',
              value: lastReceived
                ? new Date(lastReceived).toLocaleTimeString()
                : 'N/A',
              icon: 'clock',
              color: T.muted,
            },
            {
              label: 'Raw Payload',
              value: sensorData.raw || 'N/A',
              icon: 'code-braces',
              color: T.muted,
            },
          ].map((row, i, arr) => (
            <View
              key={i}
              style={[
                s.tableRow,
                i < arr.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: T.border,
                },
              ]}
            >
              <Icon name={row.icon} size={15} color={row.color} />
              <Text style={[s.tableLabel, { color: T.text }]}>{row.label}</Text>
              <Text
                style={[
                  s.tableVal,
                  {
                    color: row.color,
                    fontFamily: i >= 2 ? 'Courier' : undefined,
                  },
                ]}
                numberOfLines={1}
              >
                {row.value}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Recommendations ──────────────────────────────────── */}
        <View style={s.sectionHeader}>
          <Icon name="clipboard-list" size={18} color={T.primary} />
          <Text style={[s.sectionTitleLg, { color: T.white }]}>
            Recommendations
          </Text>
        </View>

        {recommendations.map((rec, i) => (
          <View
            key={i}
            style={[
              s.recCard,
              {
                backgroundColor: T.card,
                borderColor: rec.color + '44',
                borderLeftColor: rec.color,
              },
            ]}
          >
            <View style={[s.recIcon, { backgroundColor: rec.color + '20' }]}>
              <Icon name={rec.icon} size={22} color={rec.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.recTitle, { color: T.white }]}>{rec.title}</Text>
              <Text style={[s.recDesc, { color: T.text }]}>{rec.desc}</Text>
            </View>
          </View>
        ))}

        {/* ── CTAs ─────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[s.ctaBtn, { backgroundColor: T.primary }]}
          onPress={handleRetry}
          activeOpacity={0.85}
        >
          <Icon name="refresh" size={20} color="#fff" />
          <Text style={s.ctaBtnText}>Take Another Reading</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.secondBtn, { borderColor: T.border }]}
          onPress={() => navigation.navigate('CalibrationGateScreen')}
          activeOpacity={0.75}
        >
          <Text style={[s.secondBtnText, { color: T.muted }]}>
            Start New Test
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: Spacing.md, paddingBottom: 40 },
  centeredBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  loadingText: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  loadingSub: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: Radius.lg,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  retryBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 8,
    marginBottom: Spacing.sm,
  },
  statusBarText: { fontSize: 11 },
  connDot: { width: 8, height: 8, borderRadius: 4 },
  scoreBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    padding: 18,
    marginBottom: Spacing.md,
  },
  scoreLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  scoreVal: { fontSize: 48, fontWeight: '900', letterSpacing: -1 },
  scoreGrade: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  scoreHint: { fontSize: 12, marginTop: 2 },
  bigRow: { flexDirection: 'row', gap: 12, marginBottom: Spacing.md },
  descCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  descRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  descTitle: { fontSize: 14, fontWeight: '800' },
  descText: { fontSize: 13, lineHeight: 20 },
  sectionCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 14, fontWeight: '800' },
  sectionTitleLg: { fontSize: 17, fontWeight: '900' },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  tableLabel: { flex: 1, fontSize: 13, fontWeight: '600' },
  tableVal: {
    fontSize: 12,
    fontWeight: '700',
    maxWidth: '45%',
    textAlign: 'right',
  },
  recCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  recIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recTitle: { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  recDesc: { fontSize: 13, lineHeight: 20 },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 56,
    borderRadius: Radius.lg,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  ctaBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  secondBtn: {
    height: 48,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondBtnText: { fontSize: 14, fontWeight: '600' },
});

// ─── Sub-styles ───────────────────────────────────────────────────────────────
const bc = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    padding: Spacing.md,
    alignItems: 'center',
  },
  badge: {
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    color: '#fff',
  },
  emoji: { fontSize: 24, marginBottom: 4 },
  value: {
    fontSize: 38,
    fontWeight: '900',
    fontFamily: 'Courier',
    letterSpacing: -1,
  },
  unit: { fontSize: 11, marginTop: 2, marginBottom: 6 },
  statusPill: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 4,
  },
  statusText: { fontSize: 10, fontWeight: '800', textAlign: 'center' },
});

const phBar = StyleSheet.create({
  wrap: {},
  title: { fontSize: 13, fontWeight: '800', marginBottom: 8 },
  barRow: {
    height: 18,
    flexDirection: 'row',
    borderRadius: 9,
    overflow: 'visible',
    position: 'relative',
    marginBottom: 4,
  },
  seg: { flex: 1 },
  needle: {
    position: 'absolute',
    top: -4,
    alignItems: 'center',
    transform: [{ translateX: -1 }],
  },
  needleLine: { width: 2, height: 26, borderRadius: 1 },
  needleVal: { fontSize: 9, fontWeight: '900', marginTop: 2 },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  scaleLabel: { fontSize: 9 },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
});

const ecG = StyleSheet.create({
  wrap: {},
  title: { fontSize: 13, fontWeight: '800', marginBottom: 8 },
  barRow: {
    height: 18,
    flexDirection: 'row',
    borderRadius: 9,
    overflow: 'visible',
    position: 'relative',
    marginBottom: 4,
  },
  seg: { height: 18 },
  needle: {
    position: 'absolute',
    top: -4,
    alignItems: 'center',
    transform: [{ translateX: -1 }],
  },
  needleLine: { width: 2, height: 26, borderRadius: 1 },
  needleVal: { fontSize: 9, fontWeight: '900', marginTop: 2 },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  label: { fontSize: 9 },
});

const m = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  sheet: {
    borderRadius: Radius.xl,
    borderWidth: 2,
    padding: Spacing.lg,
    width: '100%',
    alignItems: 'center',
  },
  iconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: { fontSize: 22, fontWeight: '900', marginBottom: Spacing.sm },
  body: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  sub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  btn: {
    width: '100%',
    height: 52,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
