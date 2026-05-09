// src/screens/phtest/PHECResultScreen.jsx
// Production-ready result screen.
// • Shows pH, EC/TDS, temperature, voltages
// • Color-coded range indicators
// • Contextual recommendations
// • Retry / re-fetch
// • BLE status strip
// • Share-friendly summary card

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { TopBar } from '../components/common';
import useTheme from '../hooks/useTheme';
import { Radius, Spacing } from '../theme';
import {
  cmdGetFinalResult,
  cmdCheckMotorStatus,
} from '../redux/actions/bleActions';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const toNum = v => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function getPhStatus(ph) {
  if (ph === null) return null;
  if (ph < 5.5)
    return {
      label: 'Strongly Acidic',
      color: '#EF4444',
      bg: '#EF444415',
      icon: 'alert-circle',
    };
  if (ph < 6.5)
    return {
      label: 'Slightly Acidic',
      color: '#F97316',
      bg: '#F9731615',
      icon: 'alert',
    };
  if (ph <= 7.5)
    return {
      label: 'Optimal',
      color: '#10B981',
      bg: '#10B98115',
      icon: 'check-circle',
    };
  if (ph <= 8.5)
    return {
      label: 'Alkaline',
      color: '#3B82F6',
      bg: '#3B82F615',
      icon: 'information',
    };
  return {
    label: 'Highly Alkaline',
    color: '#8B5CF6',
    bg: '#8B5CF615',
    icon: 'alert-octagon',
  };
}

function getEcStatus(ec) {
  if (ec === null) return null;
  if (ec < 0.2)
    return {
      label: 'Very Low',
      color: '#EF4444',
      bg: '#EF444415',
      icon: 'arrow-down-circle',
    };
  if (ec < 0.8)
    return {
      label: 'Low',
      color: '#F97316',
      bg: '#F9731615',
      icon: 'arrow-down',
    };
  if (ec < 1.6)
    return {
      label: 'Optimal',
      color: '#10B981',
      bg: '#10B98115',
      icon: 'check-circle',
    };
  if (ec < 3.2)
    return {
      label: 'High',
      color: '#F59E0B',
      bg: '#F59E0B15',
      icon: 'arrow-up',
    };
  return {
    label: 'Very High',
    color: '#EF4444',
    bg: '#EF444415',
    icon: 'arrow-up-circle',
  };
}

function getRecommendations(ph, ec) {
  const recs = [];
  if (ph !== null) {
    if (ph < 5.5)
      recs.push({
        icon: '🔴',
        text: 'pH strongly acidic — apply agricultural lime (CaCO₃) to raise pH',
      });
    else if (ph < 6.5)
      recs.push({
        icon: '🟡',
        text: 'pH slightly acidic — add compost or dolomite lime gradually',
      });
    else if (ph <= 7.5)
      recs.push({
        icon: '🟢',
        text: 'pH is optimal for most crops — maintain current practices',
      });
    else if (ph <= 8.5)
      recs.push({
        icon: '🔵',
        text: 'pH alkaline — incorporate organic matter or elemental sulphur',
      });
    else
      recs.push({
        icon: '⛔',
        text: 'pH highly alkaline — immediate acidification treatment needed',
      });
  }
  if (ec !== null) {
    if (ec < 0.2)
      recs.push({
        icon: '⬇️',
        text: 'Very low nutrients — apply balanced NPK fertilizer immediately',
      });
    else if (ec < 0.8)
      recs.push({
        icon: '🟡',
        text: 'Low nutrient level — increase fertilization frequency',
      });
    else if (ec < 1.6)
      recs.push({
        icon: '✅',
        text: 'Nutrient level is optimal — maintain current fertilization',
      });
    else if (ec < 3.2)
      recs.push({
        icon: '🟠',
        text: 'High salt concentration — reduce fertilizer and irrigate to leach salts',
      });
    else
      recs.push({
        icon: '🚨',
        text: 'Very high salts — flush soil immediately with excess water',
      });
  }
  recs.push({
    icon: '🔬',
    text: 'For a complete 12-parameter soil profile, run a full soil test',
  });
  return recs;
}

// ─── pH Scale Bar ─────────────────────────────────────────────────────────────
function PHScaleBar({ ph, T }) {
  if (ph === null) return null;
  const pct = Math.min(100, Math.max(0, ((ph - 0) / 14) * 100));
  return (
    <View style={{ marginTop: 8 }}>
      <View
        style={{
          height: 10,
          borderRadius: 5,
          overflow: 'hidden',
          flexDirection: 'row',
        }}
      >
        {['#EF4444', '#F97316', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'].map(
          (c, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: c }} />
          ),
        )}
      </View>
      <View style={{ position: 'relative', height: 18 }}>
        <View
          style={[
            {
              position: 'absolute',
              left: `${pct}%`,
              transform: [{ translateX: -8 }],
              top: 2,
              width: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: T.bg,
              borderWidth: 2.5,
              borderColor: T.primary,
            },
          ]}
        />
      </View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: 2,
        }}
      >
        {['0', '2', '4', '6', '7', '8', '10', '12', '14'].map(v => (
          <Text
            key={v}
            style={{ fontSize: 9, color: T.muted, fontWeight: '600' }}
          >
            {v}
          </Text>
        ))}
      </View>
    </View>
  );
}

// ─── Metric Card ──────────────────────────────────────────────────────────────
function MetricCard({ icon, title, value, unit, status, T, children }) {
  return (
    <View
      style={[
        mc.card,
        { backgroundColor: T.card, borderColor: status?.color ?? T.border },
      ]}
    >
      <View style={mc.header}>
        <View
          style={[
            mc.iconWrap,
            { backgroundColor: (status?.color ?? T.primary) + '22' },
          ]}
        >
          <Icon name={icon} size={20} color={status?.color ?? T.primary} />
        </View>
        <Text style={[mc.title, { color: T.muted }]}>{title}</Text>
        {status && (
          <View
            style={[
              mc.badge,
              { backgroundColor: status.bg, borderColor: status.color },
            ]}
          >
            <Text style={[mc.badgeText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
        )}
      </View>
      {value !== null && value !== undefined ? (
        <View style={mc.valueRow}>
          <Text style={[mc.value, { color: status?.color ?? T.text }]}>
            {value}
          </Text>
          {unit ? (
            <Text style={[mc.unit, { color: T.muted }]}>{unit}</Text>
          ) : null}
        </View>
      ) : (
        <Text style={[mc.noData, { color: T.muted }]}>— No data —</Text>
      )}
      {children}
    </View>
  );
}

const mc = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    padding: Spacing.md,
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  badge: {
    borderRadius: Radius.full ?? 99,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 11, fontWeight: '800' },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  value: {
    fontSize: 36,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  unit: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  noData: { fontSize: 16, fontWeight: '600', fontStyle: 'italic' },
});

// ─── Voltage Row ──────────────────────────────────────────────────────────────
function VoltageRow({ label, value, T }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 6,
      }}
    >
      <Text style={{ color: T.muted, fontSize: 13, fontWeight: '600' }}>
        {label}
      </Text>
      <Text
        style={{
          color: T.text,
          fontSize: 13,
          fontWeight: '800',
          fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        }}
      >
        {value !== null ? `${value.toFixed(4)} V` : '—'}
      </Text>
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function PHECResultScreen({ navigation }) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const T = theme.colors;

  const { connected } = useSelector(s => s.ble);
  const { finalPhResult } = useSelector(s => s.phtest);

  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  const data = finalPhResult;
  const ph = toNum(data?.ph ?? data?.pH);
  const ec = toNum(data?.ec ?? data?.TDS);
  const temp = toNum(data?.temperature);
  const phVoltage = toNum(data?.voltage ?? data?.pHVoltage);
  const ecVoltage = toNum(data?.ecVoltage ?? data?.ECVoltage);
  const tempFallback = data?.temperatureFallback ?? false;

  const hasData = ph !== null || ec !== null;
  const phStatus = getPhStatus(ph);
  const ecStatus = getEcStatus(ec);
  const recs = getRecommendations(ph, ec);

  const handleRetry = useCallback(async () => {
    if (fetching || !connected) return;
    setFetching(true);
    setFetchError(null);
    try {
      await dispatch(cmdGetFinalResult());
    } catch (e) {
      setFetchError('Failed to fetch results. Check device connection.');
    } finally {
      setTimeout(() => setFetching(false), 1500);
    }
  }, [fetching, connected, dispatch]);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: T.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <TopBar
        title="Soil Test Result"
        onBack={() => navigation.goBack()}
        theme={theme}
      />

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Connection / Timestamp strip ── */}
        <View style={s.stripRow}>
          <View
            style={[
              s.strip,
              {
                backgroundColor: connected ? T.primaryGlow : '#EF444415',
                borderColor: connected ? T.primary : '#EF4444',
              },
            ]}
          >
            <View
              style={[
                s.stripDot,
                { backgroundColor: connected ? T.primary : '#EF4444' },
              ]}
            />
            <Text
              style={[
                s.stripText,
                { color: connected ? T.primary : '#EF4444' },
              ]}
            >
              {connected ? 'Device Connected' : 'Device Disconnected'}
            </Text>
          </View>
          {data?.timestamp && (
            <Text style={[s.timestamp, { color: T.muted }]}>
              {new Date(data.timestamp).toLocaleTimeString()}
            </Text>
          )}
        </View>

        {/* ── No data state ── */}
        {!hasData && (
          <View
            style={[
              s.noDataCard,
              { backgroundColor: T.card, borderColor: T.border },
            ]}
          >
            <Icon name="flask-empty-outline" size={48} color={T.muted} />
            <Text style={[s.noDataTitle, { color: T.text }]}>
              No Result Data
            </Text>
            <Text style={[s.noDataSub, { color: T.muted }]}>
              The device hasn't sent any readings yet.{'\n'}Make sure the motor
              has completed mixing.
            </Text>
            {fetchError && (
              <Text
                style={{
                  color: '#EF4444',
                  fontSize: 13,
                  textAlign: 'center',
                  marginTop: 4,
                }}
              >
                {fetchError}
              </Text>
            )}
            <TouchableOpacity
              style={[
                s.retryBtn,
                { backgroundColor: connected ? T.primary : T.border },
              ]}
              onPress={handleRetry}
              disabled={fetching || !connected}
              activeOpacity={0.8}
            >
              <Icon
                name={fetching ? 'loading' : 'refresh'}
                size={18}
                color="#fff"
              />
              <Text style={s.retryBtnText}>
                {fetching ? 'Fetching…' : 'Fetch Results'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Result cards ── */}
        {hasData && (
          <>
            {/* pH Card */}
            <MetricCard
              icon="ph"
              title="Soil pH"
              value={ph?.toFixed(2)}
              status={phStatus}
              T={T}
            >
              <PHScaleBar ph={ph} T={T} />
            </MetricCard>

            {/* EC Card */}
            <MetricCard
              icon="lightning-bolt"
              title="EC / Conductivity"
              value={ec?.toFixed(3)}
              unit="dS/m"
              status={ecStatus}
              T={T}
            />

            {/* Temperature Card */}
            <MetricCard
              icon="thermometer"
              title="Temperature"
              value={temp !== null ? temp.toFixed(1) : null}
              unit="°C"
              T={T}
            >
              {tempFallback && (
                <View
                  style={[
                    s.fallbackBadge,
                    { backgroundColor: '#F59E0B22', borderColor: '#F59E0B' },
                  ]}
                >
                  <Icon name="information-outline" size={12} color="#F59E0B" />
                  <Text
                    style={{
                      color: '#F59E0B',
                      fontSize: 11,
                      fontWeight: '700',
                    }}
                  >
                    Fallback temp used (sensor unavailable)
                  </Text>
                </View>
              )}
            </MetricCard>

            {/* Voltage Technical Card */}
            <View
              style={[
                s.voltCard,
                { backgroundColor: T.card, borderColor: T.border },
              ]}
            >
              <Text style={[s.voltTitle, { color: T.muted }]}>
                📡 Raw Sensor Voltages
              </Text>
              <View style={[s.voltDivider, { backgroundColor: T.border }]} />
              <VoltageRow label="pH Voltage" value={phVoltage} T={T} />
              <VoltageRow label="EC Voltage" value={ecVoltage} T={T} />
            </View>

            {/* Recommendations */}
            <View
              style={[
                s.recCard,
                { backgroundColor: T.card, borderColor: T.border },
              ]}
            >
              <Text style={[s.recTitle, { color: T.primary }]}>
                💡 Recommendations
              </Text>
              <View style={[s.voltDivider, { backgroundColor: T.border }]} />
              {recs.map((r, i) => (
                <View key={i} style={s.recRow}>
                  <Text style={s.recIcon}>{r.icon}</Text>
                  <Text style={[s.recText, { color: T.text }]}>{r.text}</Text>
                </View>
              ))}
            </View>

            {/* Re-fetch */}
            <TouchableOpacity
              style={[s.refetchBtn, { borderColor: T.border }]}
              onPress={handleRetry}
              disabled={fetching || !connected}
              activeOpacity={0.75}
            >
              <Icon
                name={fetching ? 'loading' : 'refresh'}
                size={16}
                color={T.muted}
              />
              <Text style={[s.refetchText, { color: T.muted }]}>
                {fetching ? 'Fetching…' : 'Re-fetch from device'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── Full Soil Test CTA ── */}
        <TouchableOpacity
          style={[s.soilCta, { backgroundColor: T.primary }]}
          onPress={() => navigation.replace('SoilTestIntroScreen')}
          activeOpacity={0.85}
        >
          <Icon name="flask-outline" size={20} color="#fff" />
          <Text style={s.soilCtaText}>Get Full 12-Parameter Soil Test →</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.homeBtn, { borderColor: T.border }]}
          onPress={() => navigation.navigate('ProductsListingScreen')}
          activeOpacity={0.75}
        >
          <Icon name="home-outline" size={16} color={T.muted} />
          <Text style={[s.homeBtnText, { color: T.muted }]}>Back to Home</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: Spacing.md, paddingBottom: Spacing.xl },

  stripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.full ?? 99,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  stripDot: { width: 8, height: 8, borderRadius: 4 },
  stripText: { fontSize: 12, fontWeight: '700' },
  timestamp: { fontSize: 11, fontWeight: '600' },

  noDataCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.xl ?? 32,
    alignItems: 'center',
    gap: 10,
    marginBottom: Spacing.md,
  },
  noDataTitle: { fontSize: 18, fontWeight: '800' },
  noDataSub: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 48,
    borderRadius: Radius.lg,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  retryBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  fallbackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 6,
    alignSelf: 'flex-start',
  },

  voltCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: 10,
  },
  voltTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  voltDivider: { height: 1, marginBottom: 8 },

  recCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: 10,
  },
  recTitle: { fontSize: 14, fontWeight: '800', marginBottom: 8 },
  recRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 5,
    alignItems: 'flex-start',
  },
  recIcon: { fontSize: 16, lineHeight: 22 },
  recText: { fontSize: 13, flex: 1, lineHeight: 20 },

  refetchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  refetchText: { fontSize: 13, fontWeight: '600' },

  soilCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 56,
    borderRadius: Radius.lg,
    marginBottom: Spacing.sm,
  },
  soilCtaText: { color: '#fff', fontSize: 15, fontWeight: '900' },

  homeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  homeBtnText: { fontSize: 14, fontWeight: '600' },
});
