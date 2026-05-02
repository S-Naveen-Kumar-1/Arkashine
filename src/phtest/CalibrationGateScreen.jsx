// src/screens/phtest/CalibrationGateScreen.jsx
// Checks test count, prompts calibrate or skip. Reads testCount from Redux.

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSelector } from 'react-redux';
import { Radius, Spacing } from '../theme';
import { TopBar } from '../components/common';
import useTheme from '../hooks/useTheme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function CalibrationGateScreen({ navigation }) {
  const theme = useTheme();
  const T = theme.colors;

  const testCount = useSelector(s => s.test.testCount);
  const { connected, device } = useSelector(s => s.ble);

  const needsCalibration = testCount > 0 && testCount % 100 === 0;

  return (
    <SafeAreaView style={[s.container, { backgroundColor: T.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <TopBar
        title="pH / EC Test"
        onBack={() => navigation.goBack()}
        theme={theme}
      />

      <View style={s.body}>
        {/* ── Device chip ─────────────────────────────────────────── */}
        {connected && device && (
          <View
            style={[
              s.deviceChip,
              { backgroundColor: T.primaryGlow, borderColor: T.primary },
            ]}
          >
            <Icon name="bluetooth-connect" size={14} color={T.primary} />
            <Text style={[s.deviceChipText, { color: T.primary }]}>
              {device.name || 'Device'} connected
            </Text>
          </View>
        )}

        {/* ── Icon ────────────────────────────────────────────────── */}
        <View
          style={[
            s.iconRing,
            {
              borderColor: needsCalibration ? T.warning : T.primary,
            },
          ]}
        >
          <Icon
            name={needsCalibration ? 'alert-circle-outline' : 'flask-outline'}
            size={56}
            color={needsCalibration ? T.warning : T.primary}
          />
        </View>

        <Text style={[s.title, { color: T.primary }]}>
          {needsCalibration
            ? '100-Test Recalibration Required'
            : 'Ready to Test'}
        </Text>

        <Text style={[s.sub, { color: T.text }]}>
          {needsCalibration
            ? `You have completed ${testCount} tests. Recalibration ensures accurate pH & EC readings.`
            : 'Calibration is recommended every 100 tests for accurate results.'}
        </Text>

        {/* ── Test count chip ─────────────────────────────────────── */}
        <View
          style={[
            s.countChip,
            { backgroundColor: T.cardAlt, borderColor: T.border },
          ]}
        >
          <Icon name="counter" size={16} color={T.muted} />
          <Text style={[s.countText, { color: T.textSub }]}>
            Tests performed:{' '}
            <Text style={{ fontWeight: '800' }}>{testCount}</Text>
          </Text>
        </View>

        {/* ── Info box ────────────────────────────────────────────── */}
        <View
          style={[
            s.infoBox,
            {
              backgroundColor: needsCalibration
                ? 'rgba(245,158,11,0.1)'
                : T.primaryGlow,
              borderColor: needsCalibration ? T.warning : T.primary,
            },
          ]}
        >
          <Icon
            name="information-outline"
            size={18}
            color={needsCalibration ? T.warning : T.primary}
            style={{ marginTop: 2 }}
          />
          <Text style={[s.infoText, { color: T.text }]}>
            Calibration uses standard buffer solutions (pH 4, 7, 9) and EC
            standards (0.0, 1.413, 12.88 dS/m) to map probe voltage to accurate
            readings.
          </Text>
        </View>

        {/* ── Calibrate ───────────────────────────────────────────── */}
        <TouchableOpacity
          style={[s.btnPrimary, { backgroundColor: T.primary }]}
          onPress={() => navigation.navigate('CalibrationMenuScreen')}
          activeOpacity={0.85}
        >
          <Icon name="tune" size={20} color="#fff" />
          <Text style={s.btnPrimaryText}>
            {needsCalibration ? 'Start Recalibration' : 'Calibrate Device'}
          </Text>
        </TouchableOpacity>

        {/* ── Skip ────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[s.btnOutline, { borderColor: T.border }]}
          onPress={() => navigation.navigate('MixerScreen')}
          activeOpacity={0.75}
        >
          <Text style={[s.btnOutlineText, { color: T.muted }]}>
            Skip — Use Existing Calibration
          </Text>
        </TouchableOpacity>

        {needsCalibration && (
          <Text style={[s.warn, { color: T.warning }]}>
            ⚠️ Skipping may reduce measurement accuracy
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  deviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: Spacing.md,
  },
  deviceChipText: { fontSize: 12, fontWeight: '700' },
  iconRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: Spacing.sm,
    letterSpacing: -0.5,
  },
  sub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  countChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    marginBottom: Spacing.md,
  },
  countText: { fontSize: 13 },
  infoBox: {
    flexDirection: 'row',
    gap: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    width: '100%',
  },
  infoText: { fontSize: 13, lineHeight: 20, flex: 1 },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    height: 56,
    borderRadius: Radius.lg,
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  btnOutline: {
    width: '100%',
    height: 48,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  btnOutlineText: { fontSize: 14, fontWeight: '600' },
  warn: { fontSize: 12, marginTop: Spacing.xs, textAlign: 'center' },
});