// src/screens/phtest/CalibrationGateScreen.jsx

import React, { useEffect, useState } from 'react';
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
import ConnectionFailedModal from '../components/ConnectionFailedModal';

export default function CalibrationGateScreen({ navigation }) {
  const theme = useTheme();
  const T = theme.colors;

  const testCount = useSelector(s => s.phtest.testCount);
  const { connected, device } = useSelector(s => s.ble);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const needsCalibration = testCount > 0 && testCount % 100 === 0;

  useEffect(() => {
    if (!connected) {
      setShowConnectionModal(true);
    }
  }, [connected]);
  return (
    <SafeAreaView style={[s.container, { backgroundColor: T.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />

      <TopBar
        title="pH / EC Test"
        onBack={() => navigation.goBack()}
        theme={theme}
      />

      <View style={s.body}>
        {/* ── Device status ───────────────────────── */}
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

        {/* ── Icon ───────────────────────────────── */}
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

        {/* ── Title ──────────────────────────────── */}
        <Text style={[s.title, { color: T.primary }]}>
          {needsCalibration ? 'Calibration Recommended' : 'Ready to Test'}
        </Text>

        {/* ── Subtitle ───────────────────────────── */}
        <Text style={[s.sub, { color: T.text }]}>
          {needsCalibration
            ? `You’ve completed ${testCount} tests. Calibration improves accuracy.`
            : 'You can start testing using existing calibration. Calibrate anytime for better accuracy.'}
        </Text>

        {/* ── Test count ─────────────────────────── */}
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

        {/* ── Info box ───────────────────────────── */}
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
            Calibration maps probe voltage to accurate pH & EC values using
            standard solutions (pH 4, 7, 9 and EC standards).
          </Text>
        </View>

        {/* ── PRIMARY: START TEST ────────────────── */}
        <TouchableOpacity
          style={[s.btnPrimary, { backgroundColor: T.primary }]}
          onPress={() => navigation.replace('MixerScreen')}
          activeOpacity={0.85}
        >
          <Icon name="play-circle" size={20} color="#fff" />
          <Text style={s.btnPrimaryText}>
            Start Test (Use Existing Calibration)
          </Text>
        </TouchableOpacity>

        {/* ── SECONDARY: CALIBRATE ───────────────── */}
        <TouchableOpacity
          style={[s.btnOutline, { borderColor: T.primary }]}
          onPress={() => navigation.replace('CalibrationMenuScreen')}
          activeOpacity={0.75}
        >
          <Text style={[s.btnOutlineText, { color: T.primary }]}>
            Calibrate Device (Optional)
          </Text>
        </TouchableOpacity>

        {/* ── Warning ───────────────────────────── */}
        {needsCalibration && (
          <Text style={[s.warn, { color: T.warning }]}>
            ⚠️ Skipping calibration may reduce accuracy
          </Text>
        )}
      </View>
      <ConnectionFailedModal
        visible={showConnectionModal}
        message={'Connection to device was lost.'}
        onPress={() => {
          setShowConnectionModal(false);

          navigation.reset({
            index: 0,
            routes: [
              {
                name: 'DeviceScanScreen',
              },
            ],
          });
        }}
      />
    </SafeAreaView>
  );
}

// ───────── STYLES ─────────
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

  deviceChipText: {
    fontSize: 12,
    fontWeight: '700',
  },

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
  },

  sub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.md,
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

  infoText: {
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
  },

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
    fontSize: 16,
    fontWeight: '800',
  },

  btnOutline: {
    width: '100%',
    height: 48,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  btnOutlineText: {
    fontSize: 14,
    fontWeight: '700',
  },

  warn: {
    fontSize: 12,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
});
