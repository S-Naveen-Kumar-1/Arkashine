// src/screens/phtest/PHECResultScreen.jsx
// Reads live pH + EC from Redux sensorData (pushed by BLE notifications).
// Saves result to Redux test history. Shows full interpretation + debug log.

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Modal,
  Animated,
  Easing,
  FlatList,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Radius, Spacing } from '../theme';
import { TopBar } from '../components/common';
import useTheme from '../hooks/useTheme';
import {
  saveTestResult,
  requestReading,
} from '../redux/actions/testActions';
import { clearDebugLog } from '../redux/actions/bleActions';

// ─── Interpretation helpers ───────────────────────────────────────────────────
function getPHStatus(ph, T) {
  if (ph === null || ph === undefined) return null;
  if (ph < 5.5)
    return {
      label: 'Strongly Acidic',
      emoji: '🔴',
      color: '#EF4444',
      desc: 'Soil is too acidic. Lime application recommended.',
      level: 'low',
    };
  if (ph < 6.0)
    return {
      label: 'Acidic',
      emoji: '🟠',
      color: '#F97316',
      desc: 'Slightly acidic. Suitable for acid-loving crops.',
      level: 'low',
    };
  if (ph < 6.5)
    return {
      label: 'Slightly Acidic',
      emoji: '🟡',
      color: '#F59E0B',
      desc: 'Suitable for most crops. Monitor regularly.',
      level: 'medium',
    };
  if (ph <= 7.0)
    return {
      label: 'Neutral',
      emoji: '🟢',
      color: T.primary,
      desc: 'Optimal range. Most nutrients are available.',
      level: 'high',
    };
  if (ph <= 7.5)
    return {
      label: 'Slightly Alkaline',
      emoji: '🔵',
      color: '#3B82F6',
      desc: 'Slightly alkaline. Some micronutrients may be less available.',
      level: 'medium',
    };
  if (ph <= 8.0)
    return {
      label: 'Alkaline',
      emoji: '🟣',
      color: '#8B5CF6',
      desc: 'Alkaline soil. Sulphur application may be needed.',
      level: 'low',
    };
  return {
    label: 'Strongly Alkaline',
    emoji: '⛔',
    color: '#EF4444',
    desc: 'Very alkaline. Significant intervention required.',
    level: 'low',
  };
}

function getECStatus(ec, T) {
  if (ec === null || ec === undefined) return null;
  if (ec < 0.1)
    return {
      label: 'Very Low',
      emoji: '⬇️',
      color: T.muted,
      desc: 'Insufficient mineral salts. Fertilisation needed.',
      alert: false,
    };
  if (ec < 0.8)
    return {
      label: 'Low',
      emoji: '🟡',
      color: '#F59E0B',
      desc: 'Low salt content. Suitable for salt-sensitive crops.',
      alert: false,
    };
  if (ec < 1.6)
    return {
      label: 'Optimal',
      emoji: '✅',
      color: T.primary,
      desc: 'Ideal conductivity for most field crops.',
      alert: false,
    };
  if (ec < 3.2)
    return {
      label: 'High',
      emoji: '🟠',
      color: '#F97316',
      desc: 'Elevated salt levels. Monitor crop stress.',
      alert: true,
    };
  return {
    label: 'Very High — Salt Alert',
    emoji: '🔴',
    color: '#EF4444',
    desc: 'Excessive salts. Leaching/drainage required.',
    alert: true,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function PHECResultScreen({ navigation }) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const T = theme.colors;

  const sensorData = useSelector(s => s.ble.sensorData);
  const lastReceived = useSelector(s => s.ble.lastReceived);
  const debugLogs = useSelector(s => s.ble.debugLogs);
  const { readingState, results } = useSelector(s => s.test);

  const [alertVisible, setAlertVisible] = useState(false);
  const [showDebugLog, setShowDebugLog] = useState(false);
  const [resultSaved, setResultSaved] = useState(false);

  // Resolve ph/ec: prefer already-saved results, else use live sensorData
  const ph = results?.ph ?? sensorData.ph;
  const ec = results?.ec ?? sensorData.ec;
  const voltage = results?.voltage ?? sensorData.voltage;

  const loading = readingState === 'reading' && ph === null && ec === null;

  const phStatus = getPHStatus(ph, T);
  const ecStatus = getECStatus(ec, T);

  // Loading spin
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

  // Save result once we have data
  useEffect(() => {
    if (!resultSaved && ph !== null && ec !== null) {
      dispatch(saveTestResult({ ph, ec, voltage, raw: sensorData.raw }));
      setResultSaved(true);
      if (ecStatus?.alert) setTimeout(() => setAlertVisible(true), 600);
    }
  }, [ph, ec, resultSaved, dispatch]);

  // Retry reading
  const handleRetry = () => {
    setResultSaved(false);
    dispatch(requestReading());
  };

  // ── Loading state ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: T.bg }]}>
        <StatusBar barStyle="light-content" backgroundColor={T.bg} />
        <TopBar
          title="Reading Results"
          onBack={() => navigation.goBack()}
          theme={theme}
        />
        <View style={s.loadingBody}>
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Icon name="loading" size={56} color={T.primary} />
          </Animated.View>
          <Text style={[s.loadingText, { color: T.primary }]}>
            Reading from device…
          </Text>
          <Text style={[s.loadingSub, { color: T.muted }]}>
            Acquiring pH and EC via probe
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── No data state ───────────────────────────────────────────────────────────
  if (ph === null && ec === null) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: T.bg }]}>
        <StatusBar barStyle="light-content" backgroundColor={T.bg} />
        <TopBar
          title="pH & EC Results"
          onBack={() => navigation.goBack()}
          theme={theme}
        />
        <View style={s.loadingBody}>
          <Icon name="alert-circle-outline" size={56} color={T.warning} />
          <Text style={[s.loadingText, { color: T.warning }]}>
            No data received
          </Text>
          <Text style={[s.loadingSub, { color: T.muted }]}>
            Ensure device is connected and probe is submerged
          </Text>
          <TouchableOpacity
            style={[s.retryBtn, { backgroundColor: T.primary, marginTop: 20 }]}
            onPress={handleRetry}
          >
            <Icon name="refresh" size={18} color="#fff" />
            <Text style={s.retryBtnText}>Retry Reading</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: T.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <TopBar
        title="pH & EC Results"
        onBack={() => navigation.goBack()}
        theme={theme}
      />

      <ScrollView contentContainerStyle={s.scroll}>
        {/* ── Timestamp ──────────────────────────────────────────── */}
        {lastReceived && (
          <View style={[s.tsRow, { borderColor: T.border }]}>
            <Icon name="clock-outline" size={13} color={T.muted} />
            <Text style={[s.tsText, { color: T.muted }]}>
              Received at {new Date(lastReceived).toLocaleTimeString()}
            </Text>
            <View
              style={[
                s.liveTag,
                { backgroundColor: T.primaryGlow, borderColor: T.primary },
              ]}
            >
              <View style={[s.liveDot, { backgroundColor: T.primary }]} />
              <Text style={[s.liveTagText, { color: T.primary }]}>LIVE</Text>
            </View>
          </View>
        )}

        {/* ── Big readings row ────────────────────────────────────── */}
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

        {/* ── Voltage reading ─────────────────────────────────────── */}
        {voltage !== null && (
          <View
            style={[
              s.voltageRow,
              { backgroundColor: T.cardAlt, borderColor: T.border },
            ]}
          >
            <Icon name="flash" size={14} color={T.muted} />
            <Text style={[s.voltageText, { color: T.muted }]}>
              Raw voltage:{' '}
            </Text>
            <Text
              style={[
                s.voltageVal,
                { color: T.textSub, fontFamily: 'Courier' },
              ]}
            >
              {Number(voltage).toFixed(4)} V
            </Text>
          </View>
        )}

        {/* ── pH Detail ───────────────────────────────────────────── */}
        <DetailCard
          icon="ph"
          title="pH Analysis"
          color={phStatus?.color}
          T={T}
          rows={[
            {
              label: 'Measured Value',
              value: `${ph?.toFixed(2)}`,
              highlight: true,
            },
            { label: 'Optimal Range', value: '6.0 – 7.0' },
            { label: 'Soil Reaction', value: phStatus?.label },
            { label: 'Interpretation', value: phStatus?.desc, long: true },
          ]}
        />

        {/* ── EC Detail ───────────────────────────────────────────── */}
        <DetailCard
          icon="lightning-bolt"
          title="EC Analysis"
          color={ecStatus?.color}
          T={T}
          rows={[
            {
              label: 'Measured Value',
              value: `${ec?.toFixed(3)} dS/m`,
              highlight: true,
            },
            { label: 'Optimal Range', value: '0.8 – 1.6 dS/m' },
            { label: 'Salt Level', value: ecStatus?.label },
            { label: 'Interpretation', value: ecStatus?.desc, long: true },
          ]}
        />

        {/* ── pH Scale visual ─────────────────────────────────────── */}
        <PHScale value={ph} T={T} />

        {/* ── Raw data card ───────────────────────────────────────── */}
        <View
          style={[
            s.rawCard,
            { backgroundColor: T.cardAlt, borderColor: T.border },
          ]}
        >
          <View style={s.rawHeader}>
            <Icon name="code-json" size={14} color={T.muted} />
            <Text style={[s.rawLabel, { color: T.muted }]}>
              Raw BLE payload
            </Text>
          </View>
          <Text
            style={[s.rawValue, { color: T.textSub, fontFamily: 'Courier' }]}
          >
            {sensorData.raw || '(none)'}
          </Text>
        </View>

        {/* ── Debug Log toggle ────────────────────────────────────── */}
        <TouchableOpacity
          style={[s.debugToggle, { borderColor: T.border }]}
          onPress={() => setShowDebugLog(v => !v)}
        >
          <Icon
            name={showDebugLog ? 'chevron-up' : 'bug-outline'}
            size={16}
            color={T.muted}
          />
          <Text style={[s.debugToggleText, { color: T.muted }]}>
            {showDebugLog ? 'Hide' : 'Show'} BLE Debug Log ({debugLogs.length})
          </Text>
        </TouchableOpacity>

        {showDebugLog && (
          <View
            style={[
              s.debugBox,
              { backgroundColor: '#0d0d0d', borderColor: T.border },
            ]}
          >
            <View style={s.debugActions}>
              <TouchableOpacity onPress={() => dispatch(clearDebugLog())}>
                <Text style={[s.debugClear, { color: '#ef4444' }]}>
                  Clear log
                </Text>
              </TouchableOpacity>
            </View>
            {debugLogs.map(log => (
              <View key={log.id} style={s.debugRow}>
                <Text style={s.debugTime}>{log.time}</Text>
                <Text style={[s.debugTag, { color: tagColor(log.tag) }]}>
                  [{log.tag}]
                </Text>
                <Text style={s.debugMsg} numberOfLines={2}>
                  {log.message}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Actions ─────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[s.ctaBtn, { backgroundColor: T.primary }]}
          onPress={handleRetry}
          activeOpacity={0.85}
        >
          <Icon name="refresh" size={20} color="#fff" />
          <Text style={s.ctaBtnText}>Read Again</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.secondBtn, { borderColor: T.border }]}
          onPress={() => navigation.navigate('CalibrationGateScreen')}
          activeOpacity={0.8}
        >
          <Text style={[s.secondBtnText, { color: T.muted }]}>
            Run Another Test
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── EC Alert Modal ──────────────────────────────────────── */}
      <Modal visible={alertVisible} transparent animationType="fade">
        <View style={m.overlay}>
          <View
            style={[
              m.sheet,
              { backgroundColor: T.card, borderColor: '#F97316' },
            ]}
          >
            <View style={[m.iconRing, { backgroundColor: '#F9731622' }]}>
              <Icon name="alert-circle" size={40} color="#F97316" />
            </View>
            <Text style={[m.title, { color: T.white }]}>
              ⚠️ High Salt Alert
            </Text>
            <Text style={[m.body, { color: T.text }]}>
              EC value of{' '}
              <Text style={{ color: '#F97316', fontWeight: '900' }}>
                {ec?.toFixed(3)} dS/m
              </Text>{' '}
              indicates excessive mineral salts in the soil.
            </Text>
            <Text style={[m.sub, { color: T.muted }]}>
              Consider leaching with irrigation or improving drainage. Avoid
              high-salt fertilisers.
            </Text>
            <TouchableOpacity
              style={[m.btn, { backgroundColor: '#F97316' }]}
              onPress={() => setAlertVisible(false)}
            >
              <Text style={m.btnText}>Understood</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function BigCard({ badge, value, unit, status, T }) {
  return (
    <View
      style={[
        bc.card,
        { backgroundColor: T.card, borderColor: status?.color + '66' },
      ]}
    >
      <View style={[bc.badge, { backgroundColor: status?.color + '22' }]}>
        <Text style={[bc.badgeText, { color: status?.color }]}>{badge}</Text>
      </View>
      <Text style={[bc.value, { color: status?.color ?? T.white }]}>
        {value ?? '—'}
      </Text>
      {unit && <Text style={[bc.unit, { color: T.muted }]}>{unit}</Text>}
      <Text style={[bc.status, { color: status?.color }]}>
        {status?.emoji} {status?.label}
      </Text>
    </View>
  );
}

function DetailCard({ icon, title, color, T, rows }) {
  return (
    <View
      style={[
        dc.card,
        {
          backgroundColor: T.card,
          borderColor: color + '44',
          borderLeftColor: color,
          borderLeftWidth: 4,
        },
      ]}
    >
      <View style={dc.header}>
        <Icon name={icon} size={18} color={color} />
        <Text style={[dc.title, { color: T.white }]}>{title}</Text>
      </View>
      {rows.map((r, i) => (
        <View
          key={i}
          style={[
            dc.row,
            i > 0 && { borderTopWidth: 1, borderTopColor: T.border },
          ]}
        >
          <Text style={[dc.label, { color: T.muted }]}>{r.label}</Text>
          <Text
            style={[
              dc.val,
              {
                color: r.highlight ? color ?? T.white : T.text,
                flex: r.long ? 1 : undefined,
              },
            ]}
          >
            {r.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

function PHScale({ value, T }) {
  const pct = value != null ? ((value - 0) / 14) * 100 : null;
  const SEGMENTS = [
    { color: '#EF4444' },
    { color: '#F97316' },
    { color: T.primary },
    { color: '#3B82F6' },
    { color: '#8B5CF6' },
  ];
  return (
    <View style={[ph.card, { backgroundColor: T.card, borderColor: T.border }]}>
      <Text style={[ph.title, { color: T.white }]}>pH Scale</Text>
      <View style={ph.barRow}>
        {SEGMENTS.map((seg, i) => (
          <View key={i} style={[ph.seg, { backgroundColor: seg.color }]} />
        ))}
        {pct !== null && (
          <View
            style={[ph.needle, { left: `${Math.min(Math.max(pct, 0), 99)}%` }]}
          >
            <View style={[ph.needleLine, { backgroundColor: T.white }]} />
            <Text style={[ph.needleVal, { color: T.white }]}>
              {value?.toFixed(1)}
            </Text>
          </View>
        )}
      </View>
      <View style={ph.labels}>
        {['0', '2', '4', '6', '8', '10', '12', '14'].map(v => (
          <Text key={v} style={[ph.scaleLabel, { color: T.muted }]}>
            {v}
          </Text>
        ))}
      </View>
      <View style={ph.legend}>
        <Text style={[ph.legendText, { color: '#EF4444' }]}>Acidic</Text>
        <Text style={[ph.legendText, { color: T.primary }]}>Neutral</Text>
        <Text style={[ph.legendText, { color: '#8B5CF6' }]}>Alkaline</Text>
      </View>
    </View>
  );
}

function tagColor(tag) {
  const map = {
    CMD: '#34d399',
    DATA: '#60a5fa',
    NOTIFY: '#a78bfa',
    UUID: '#fbbf24',
    CONNECT: '#4ade80',
    DISCONNECT: '#f87171',
    RECONNECT: '#fb923c',
    SCAN: '#38bdf8',
    BLE: '#94a3b8',
  };
  return map[tag] ?? '#6b7280';
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: Spacing.md, paddingBottom: Spacing.xl },
  loadingBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: { fontSize: 18, fontWeight: '800' },
  loadingSub: { fontSize: 13, textAlign: 'center' },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: Radius.lg,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  retryBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  tsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 8,
    marginBottom: Spacing.sm,
  },
  tsText: { flex: 1, fontSize: 11, color: '#6b7280' },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveTagText: { fontSize: 10, fontWeight: '900' },
  bigRow: { flexDirection: 'row', gap: 12, marginBottom: Spacing.md },
  voltageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 8,
    marginBottom: Spacing.md,
  },
  voltageText: { fontSize: 12 },
  voltageVal: { fontSize: 12 },
  rawCard: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  rawHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  rawLabel: { fontSize: 11, fontWeight: '700' },
  rawValue: { fontSize: 11, lineHeight: 16 },
  debugToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  debugToggleText: { fontSize: 12 },
  debugBox: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 8,
    marginBottom: Spacing.md,
    maxHeight: 300,
  },
  debugActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 4,
  },
  debugClear: { fontSize: 11, fontWeight: '700' },
  debugRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  debugTime: { fontSize: 9, color: '#4b5563', width: 56 },
  debugTag: { fontSize: 9, fontWeight: '800', width: 52 },
  debugMsg: { fontSize: 9, color: '#9ca3af', flex: 1 },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 56,
    borderRadius: Radius.lg,
    marginBottom: Spacing.sm,
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
    marginBottom: 8,
  },
  badgeText: { fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  value: {
    fontSize: 40,
    fontWeight: '900',
    fontFamily: 'Courier',
    letterSpacing: -1,
  },
  unit: { fontSize: 12, marginTop: 2, marginBottom: 4 },
  status: { fontSize: 11, fontWeight: '800', textAlign: 'center' },
});

const dc = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  title: { fontSize: 15, fontWeight: '800' },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 8,
    gap: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    flex: 1,
  },
  val: { fontSize: 14, fontWeight: '700', textAlign: 'right', maxWidth: '60%' },
});

const ph = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  title: { fontSize: 14, fontWeight: '800', marginBottom: Spacing.sm },
  barRow: {
    height: 20,
    flexDirection: 'row',
    borderRadius: 10,
    overflow: 'visible',
    marginBottom: 4,
    position: 'relative',
  },
  seg: { flex: 1 },
  needle: {
    position: 'absolute',
    top: -4,
    alignItems: 'center',
    transform: [{ translateX: -1 }],
  },
  needleLine: { width: 2, height: 28 },
  needleVal: { fontSize: 10, fontWeight: '800', marginTop: 2 },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  scaleLabel: { fontSize: 10 },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  legendText: { fontSize: 11, fontWeight: '700' },
});

const m = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
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
  title: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
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
