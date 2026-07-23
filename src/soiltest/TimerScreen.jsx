// src/screens/test/TimerScreen.js

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { ProgressRing } from '../components/common';
import useTheme from '../hooks/useTheme';
import { Radius, Spacing, Typography } from '../theme';
import {
  cmdCheckSoilMotorStatus,
  cmdStartSoilSensor,
  cmdStopSoilTest,
} from '../redux/actions/bleActions';
import { useDispatch, useSelector } from 'react-redux';

// FIX: was 180 (3 min) — now 60s as requested
const MOTOR_DURATION = 60;

// ─── custom touchable button — used only for the "Next" action now ───────
function GoodButton({
  label,
  onPress,
  disabled,
  outlined = false,
  color,
  textColor,
  style,
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[
        gb.base,
        outlined
          ? { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: color }
          : { backgroundColor: color },
        disabled && gb.disabled,
        style,
      ]}
    >
      <Text
        style={[
          gb.text,
          { color: outlined ? textColor ?? color : '#fff' },
          disabled && gb.textDisabled,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const gb = StyleSheet.create({
  base: {
    height: 54,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  text: {
    fontSize: 16,
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.45,
  },
  textDisabled: {
    opacity: 0.9,
  },
});

export function TimerScreen({ navigation }) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const T = theme.colors;
  const soilSathiData = useSelector(s => s.soilsaathi);

  // ─── NEW: BLE connection state, same source MixerScreen reads from ───────
  const { connected, device } = useSelector(s => s.ble);

  const [timeLeft, setTimeLeft] = useState(MOTOR_DURATION);
  const intervalRef = useRef(null);

  useEffect(() => {
    const interval = setInterval(() => {
      dispatch(cmdCheckSoilMotorStatus());
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (timeLeft === 0) {
      dispatch(cmdStopSoilTest());
    }
  }, [timeLeft]);

  // start timer on mount
  useEffect(() => {
    setTimeLeft(MOTOR_DURATION);

    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, []);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = MOTOR_DURATION - timeLeft;
  const timerDone = timeLeft === 0;
  const motorRunning = !timerDone;

  // ✅ Next → only after timer completes
  const handleNext = () => {
    if (!timerDone) return;
    navigation.replace('SoilTestIntroScreen');
  };

  // ─── NEW: modal OK → go connect a device ─────────────────────────────────
  const handleGoConnect = () => {
    navigation.navigate('BLEScanScreen');
  };

  return (
    <SafeAreaView style={[s.bg, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.bg} />

      <View style={s.center}>
        {/* ── BLE connection chip (same pattern as MixerScreen) ─────────── */}
        {connected && (
          <View
            style={[
              s.chip,
              { backgroundColor: T.primaryGlow, borderColor: T.primary },
            ]}
          >
            <Icon name="bluetooth-connect" size={13} color={T.primary} />
            <Text style={[s.chipText, { color: T.primary }]}>
              {device?.name}
            </Text>
          </View>
        )}

        <Text style={[Typography.h3, { color: T.text, marginBottom: 8 }]}>
          {`Motor State: ${soilSathiData?.motorState}` || 'Idle'}
        </Text>
        {soilSathiData?.motorStateFromBle && (
          <Text style={[Typography.h3, { color: T.text, marginBottom: 8 }]}>
            {`Motor State from ble :${soilSathiData?.motorStateFromBle}`}
          </Text>
        )}
        {!soilSathiData?.motorStateFromBle && (
          <Text style={[Typography.h3, { color: T.text, marginBottom: 8 }]}>
            {'No Response from device'}
          </Text>
        )}

        {/* ── NEW: motor running ring/icon, same visual language as Mixer ─ */}
        <View
          style={[
            s.motorRing,
            {
              borderColor: T.primary,
              backgroundColor: motorRunning ? T.primaryGlow : 'transparent',
            },
          ]}
        >
          <Icon name="rotate-3d-variant" size={64} color={T.primary} />
        </View>

        <Text style={[s.motorLabel, { color: T.primary }]}>
          {motorRunning ? 'Motor Running…' : 'Motor Done ✅'}
        </Text>

        <Text style={[s.sub, { color: T.textSub }]}>
          Please wait while motor completes
        </Text>

        <View style={s.timerWrap}>
          <ProgressRing
            size={220}
            progress={progress}
            total={MOTOR_DURATION}
            color={T.primary}
            bg={T.divider}
          >
            <View style={{ alignItems: 'center' }}>
              <Text style={[s.timerNum, { color: T.primary }]}>
                {String(minutes).padStart(2, '0')}:
                {String(seconds).padStart(2, '0')}
              </Text>
              <Text style={[s.timerUnit, { color: T.textSub }]}>remaining</Text>
            </View>
          </ProgressRing>
        </View>

        {/* Progress bar */}
        <View style={[s.progressBar, { backgroundColor: T.divider }]}>
          <View
            style={[
              s.progressFill,
              {
                backgroundColor: T.primary,
                width: `${(progress / MOTOR_DURATION) * 100}%`,
              },
            ]}
          />
        </View>

        <Text style={[s.progressLabel, { color: T.muted }]}>
          {Math.round((progress / MOTOR_DURATION) * 100)}% complete
        </Text>

      </View>

      {/* ───────────────────────────────────────────────────────────────
          NEW: connection-required modal, replaces the old GoodButton
          that used to sit here when there was nothing to connect to.
          Shown whenever ble.connected is false; OK takes the user to
          BLEScanScreen to pair with the SoilLenz device.
      ─────────────────────────────────────────────────────────────── */}
      <Modal
        visible={!connected}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { backgroundColor: T.card ?? '#fff' }]}>
            <Icon
              name="bluetooth-off"
              size={40}
              color={T.primary}
              style={{ marginBottom: 12 }}
            />
            <Text style={[s.modalTitle, { color: T.text }]}>
              Device Not Connected
            </Text>
            <Text style={[s.modalMsg, { color: T.textSub }]}>
              Please make a device connection to SoilLenz to continue.
            </Text>
            <TouchableOpacity
              style={[s.modalBtn, { backgroundColor: T.primary }]}
              activeOpacity={0.85}
              onPress={handleGoConnect}
            >
              <Text style={s.modalBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1 },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 12,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
  },

  motorRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    marginTop: 4,
  },
  motorLabel: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: Spacing.md,
    textAlign: 'center',
  },

  sub: {
    fontSize: 15,
    marginBottom: 32,
    textAlign: 'center',
  },

  timerWrap: { marginBottom: 32 },

  timerNum: {
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: 2,
    fontFamily: 'monospace',
  },

  timerUnit: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },

  progressBar: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },

  progressFill: {
    height: 6,
    borderRadius: 3,
  },

  progressLabel: {
    fontSize: 12,
  },

  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    width: '100%',
  },

  // ── modal styles ─────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: Radius.lg,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMsg: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalBtn: {
    height: 48,
    width: '100%',
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});