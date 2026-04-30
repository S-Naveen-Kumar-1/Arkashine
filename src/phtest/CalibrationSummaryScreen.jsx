// src/screens/phtest/CalibrationSummaryScreen.js
// Shows saved pH + EC calibration points and allows user to begin actual test

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Radius, Spacing, Typography } from '../theme';
import { TopBar } from '../components/common';
import useTheme from '../hooks/useTheme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CalibrationSummaryScreen({ navigation, route }) {
  const theme = useTheme();
  const T = theme.colors;
  const phCalData = route?.params?.phCalData ?? null;
  const ecCalData = route?.params?.ecCalData ?? null;

  const phPoints = phCalData?.points ?? [];
  const ecPoints = ecCalData?.points ?? [];

  const phComplete = phPoints.filter(p => p.voltage != null).length;
  const ecComplete = ecPoints.filter(p => p.voltage != null).length;

  const handleBeginTest = () => navigation.navigate('MixerScreen');

  return (
    <SafeAreaView style={[s.container, { backgroundColor: T.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />

      <TopBar
        title="Calibration Saved"
        onBack={() => navigation.goBack()}
        theme={theme}
      />

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Success banner */}
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
              Reference voltages saved to device. All future tests will use
              these values.
            </Text>
          </View>
        </View>

        {/* pH Summary */}
        <SectionCard
          title="pH Calibration"
          icon="ph"
          color={T.primary}
          count={phComplete}
          total={3}
          T={T}
        >
          {phPoints.length > 0 ? (
            phPoints.map((p, i) => (
              <CalRow
                key={i}
                label={`pH ${p.standardPH}`}
                voltage={p.voltage}
                unit=""
                T={T}
              />
            ))
          ) : (
            <SkippedBadge T={T} />
          )}
        </SectionCard>

        {/* EC Summary */}
        <SectionCard
          title="EC Calibration"
          icon="lightning-bolt"
          color={T.info}
          count={ecComplete}
          total={3}
          T={T}
        >
          {ecPoints.length > 0 ? (
            ecPoints.map((p, i) => (
              <CalRow
                key={i}
                label={`${p.standardEC} dS/m`}
                voltage={p.voltage}
                unit="dS/m"
                T={T}
              />
            ))
          ) : (
            <SkippedBadge T={T} />
          )}
        </SectionCard>

        {/* Saved JSON note */}
        {/* <View
          style={[
            s.jsonNote,
            { backgroundColor: T.cardAlt, borderColor: T.border },
          ]}
        >
          <Icon name="code-json" size={18} color={T.muted} />
          <Text style={[s.jsonText, { color: T.muted }]}>
            Calibration data stored as JSON on device memory. Used as linear
            reference map: Voltage → pH/EC value.
          </Text>
        </View> */}

        {/* CTA */}
        <TouchableOpacity
          style={[s.cta, { backgroundColor: T.primary }]}
          onPress={handleBeginTest}
          activeOpacity={0.85}
        >
          <Icon name="flask-outline" size={22} color="#fff" />
          <Text style={s.ctaText}>Begin Soil pH & EC Test</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.secondBtn, { borderColor: T.border }]}
          onPress={() => navigation.navigate('CalibrationMenuScreen')}
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
    <View style={[T.card, { backgroundColor: T.card, borderColor: T.border }]}>
      <View style={T.header}>
        <Icon name={icon} size={20} color={color} />
        <Text style={[T.title, { color: T.white }]}>{title}</Text>
        <View
          style={[
            T.badge,
            {
              backgroundColor:
                count === total ? T.primary + '22' : T.warning + '22',
              borderColor: count === total ? T.primary : T.warning,
            },
          ]}
        >
          <Text
            style={[
              T.badgeText,
              { color: count === total ? T.primary : T.warning },
            ]}
          >
            {count}/{total} points
          </Text>
        </View>
      </View>
      <View style={[T.divider, { backgroundColor: T.border }]} />
      {children}
    </View>
  );
}

function CalRow({ label, voltage, T }) {
  const captured = voltage != null;
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
        {captured ? `${voltage.toFixed(4)} V` : 'Skipped'}
      </Text>
    </View>
  );
}

function SkippedBadge({ T }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6,
      }}
    >
      <Icon name="minus-circle-outline" size={16} color={T.muted} />
      <Text style={{ color: T.muted, fontSize: 13 }}>Calibration skipped</Text>
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
  jsonNote: {
    flexDirection: 'row',
    gap: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  jsonText: { fontSize: 12, lineHeight: 18, flex: 1 },
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
