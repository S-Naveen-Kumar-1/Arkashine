// src/screens/phtest/CalibrationSummaryScreen.jsx
// Reads calibration data from Redux — no more route params needed.

import React from 'react';
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
import { Radius, Spacing } from '../theme';
import { TopBar } from '../components/common';
import useTheme from '../hooks/useTheme';

export default function CalibrationSummaryScreen({ navigation }) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const T = theme.colors;

  console.log('Rendering CalibrationSummaryScreen with theme:', theme);
  const { phPoints, ecPoints, lastCalibrated } = useSelector(
    s => s.calibration,
  );

  const phComplete = phPoints.filter(
    p => p.voltage !== null && p.capturedAt,
  ).length;
  const ecComplete = ecPoints.filter(
    p => p.voltage !== null && p.capturedAt,
  ).length;
  const handleRedo = async () => {
    await dispatch({ type: 'CAL_POINT_RESET' });

    navigation.replace('CalibrationMenuScreen');
  };
  return (
    <SafeAreaView style={[s.container, { backgroundColor: T.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <TopBar
        title="Calibration Saved"
        onBack={() => navigation.goBack()}
        theme={theme}
      />

      <ScrollView contentContainerStyle={s.scroll}>
        {/* ── Success banner ──────────────────────────────────────── */}
        <View
          style={[
            s.banner,
            { backgroundColor: T.primaryGlow, borderColor: T.primary },
          ]}
        >
          <Icon name="check-decagram" size={40} color={T.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[s.bannerTitle, { color: T.primary }]}>
              Calibration Complete
            </Text>
            <Text style={[s.bannerSub, { color: T.text }]}>
              Reference voltages saved to device.
              {lastCalibrated
                ? ` Saved at ${new Date(lastCalibrated).toLocaleTimeString()}`
                : ''}
            </Text>
          </View>
        </View>

        {/* ── pH Summary ──────────────────────────────────────────── */}
        <SectionCard
          title="pH Calibration"
          icon="ph"
          color={T.primary}
          count={phComplete}
          total={3}
          T={T}
        >
          {phPoints.map((p, i) => (
            <CalRow
              key={i}
              label={`pH ${p.standardPH}`}
              voltage={p.voltage}
              T={T}
            />
          ))}
        </SectionCard>

        {/* ── EC Summary ──────────────────────────────────────────── */}
        <SectionCard
          title="EC Calibration"
          icon="lightning-bolt"
          color={T.info ?? '#3B82F6'}
          count={ecComplete}
          total={3}
          T={T}
        >
          {ecPoints.map((p, i) => (
            <CalRow
              key={i}
              label={`${p.standardEC} dS/m`}
              voltage={p.voltage}
              T={T}
            />
          ))}
        </SectionCard>

        {/* ── CTA ────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[s.cta, { backgroundColor: T.primary }]}
          onPress={() => navigation.replace('MixerScreen')}
          activeOpacity={0.85}
        >
          <Icon name="flask-outline" size={22} color="#fff" />
          <Text style={s.ctaText}>Begin Soil pH & EC Test</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.secondBtn, { borderColor: T.border }]}
          onPress={handleRedo}
        >
          <Text style={[s.secondBtnText, { color: T.muted }]}>
            Redo Calibration
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function SectionCard({ title, icon, color, count, total, children, T }) {
  return (
    <View style={[sc.card, { backgroundColor: T.card, borderColor: T.border }]}>
      <View style={sc.header}>
        <Icon name={icon} size={20} color={color} />
        <Text style={[sc.title, { color: T.white }]}>{title}</Text>
        <View
          style={[
            sc.badge,
            {
              backgroundColor:
                count === total ? color + '22' : T.warning + '22',
              borderColor: count === total ? color : T.warning,
            },
          ]}
        >
          <Text
            style={[
              sc.badgeText,
              { color: count === total ? color : T.warning },
            ]}
          >
            {count}/{total} points
          </Text>
        </View>
      </View>
      <View style={[sc.divider, { backgroundColor: T.border }]} />
      {children}
    </View>
  );
}

function CalRow({ label, voltage, T }) {
  const captured = voltage !== null && voltage !== undefined;
  return (
    <View style={cr.row}>
      <Icon
        name={captured ? 'check-circle' : 'minus-circle-outline'}
        size={16}
        color={captured ? T.primary : T.muted}
      />
      <Text style={[cr.label, { color: T.text }]}>{label}</Text>
      <Text
        style={[
          cr.val,
          { color: captured ? T.primary : T.muted, fontFamily: 'Courier' },
        ]}
      >
        {captured ? `${Number(voltage).toFixed(4)} V` : 'Skipped'}
      </Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: Spacing.md, paddingBottom: Spacing.xl },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  bannerTitle: { fontSize: 17, fontWeight: '900', marginBottom: 4 },
  bannerSub: { fontSize: 13, lineHeight: 18 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 58,
    borderRadius: Radius.lg,
    marginBottom: Spacing.sm,
  },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '900' },
  secondBtn: {
    height: 48,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondBtnText: { fontSize: 14, fontWeight: '600' },
});

const sc = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: Spacing.sm,
  },
  title: { flex: 1, fontSize: 15, fontWeight: '800' },
  badge: {
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 11, fontWeight: '800' },
  divider: { height: 1, marginBottom: Spacing.sm },
});

const cr = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  label: { flex: 1, fontSize: 14, fontWeight: '600' },
  val: { fontSize: 14, fontWeight: '800' },
});
