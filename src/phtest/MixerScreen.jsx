// src/screens/phtest/MixerScreen.jsx

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Radius, Spacing } from '../theme';
import { TopBar, ProgressRing } from '../components/common';
import useTheme from '../hooks/useTheme';
import {
  startMotor,
  stopMotorEarly,
  testReset,
} from '../redux/actions/phTestActions';
import { requestReading } from '../redux/actions/phTestActions';
import { cmdPHMotorStart, cmdPHMotorStop } from '../redux/actions/bleActions';
import { MOTOR_DURATION } from '../redux/reducers/phTestReducer';

export default function MixerScreen({ navigation }) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const T = theme.colors;

  const { motorState, motorTimeLeft } = useSelector(s => s.phtest);
  const { connected, device } = useSelector(s => s.ble);

  // Spin animation for motor icon
  const spinAnim = useRef(new Animated.Value(0)).current;
  const spinLoop = useRef(null);

  const startSpin = () => {
    spinLoop.current = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    spinLoop.current.start();
  };

  const stopSpin = () => {
    spinLoop.current?.stop();
    spinAnim.setValue(0);
  };

  useEffect(() => {
    if (motorState === 'running') startSpin();
    else stopSpin();
  }, [motorState]);
  useEffect(() => {
    dispatch(testReset());
  }, [dispatch]);

  useEffect(() => () => stopSpin(), []);
  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const progress = MOTOR_DURATION - motorTimeLeft;
  const pct = Math.round((progress / MOTOR_DURATION) * 100);
  const minutes = Math.floor(motorTimeLeft / 60);
  const seconds = motorTimeLeft % 60;

  const handleReadResults = async () => {
    navigation.replace('PHECResultScreen');
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: T.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <TopBar
        title="Mixing Motor"
        onBack={() => navigation.goBack()}
        theme={theme}
      />

      <View style={s.body}>
        {/* ── BLE status ─────────────────────────────────────────── */}
        <View
          style={[
            s.bleChip,
            {
              backgroundColor: connected ? T.primaryGlow : T.cardAlt,
              borderColor: connected ? T.primary : T.border,
            },
          ]}
        >
          <Icon
            name={connected ? 'bluetooth-connect' : 'bluetooth-off'}
            size={14}
            color={connected ? T.primary : T.muted}
          />
          <Text
            style={[s.bleChipText, { color: connected ? T.primary : T.muted }]}
          >
            {connected
              ? `${device?.name || 'Device'} connected`
              : 'No device connected'}
          </Text>
        </View>

        {/* ── Motor ring ─────────────────────────────────────────── */}
        <View
          style={[
            s.motorRing,
            {
              borderColor:
                motorState === 'running'
                  ? T.primary
                  : motorState === 'done'
                  ? T.primary
                  : T.border,
              backgroundColor:
                motorState === 'running' ? T.primaryGlow : 'transparent',
            },
          ]}
        >
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Icon
              name="rotate-3d-variant"
              size={64}
              color={motorState !== 'idle' ? T.primary : T.muted}
            />
          </Animated.View>
          {motorState === 'done' && (
            <View style={[s.doneBadge, { backgroundColor: T.primary }]}>
              <Icon name="check" size={16} color="#fff" />
            </View>
          )}
        </View>

        <Text
          style={[
            s.motorLabel,
            {
              color: motorState !== 'idle' ? T.primary : T.white,
            },
          ]}
        >
          {motorState === 'idle'
            ? 'Motor Ready'
            : motorState === 'running'
            ? 'Motor Running…'
            : 'Mixing Complete ✅'}
        </Text>

        {/* ── Instruction card ───────────────────────────────────── */}
        {motorState === 'idle' && (
          <View
            style={[
              s.instrCard,
              { backgroundColor: T.card, borderColor: T.border },
            ]}
          >
            <Text style={[s.instrTitle, { color: T.white }]}>
              📋 Before Starting
            </Text>
            {[
              'Add 5g soil sample to the beaker',
              'Add 40ml extractant solution',
              'Place the beaker under the mixer',
              'Ensure probe is connected and ready',
            ].map((t, i) => (
              <View key={i} style={s.instrRow}>
                <View style={[s.instrDot, { backgroundColor: T.primary }]}>
                  <Text style={s.instrDotNum}>{i + 1}</Text>
                </View>
                <Text style={[s.instrText, { color: T.text }]}>{t}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Timer ring ─────────────────────────────────────────── */}
        {motorState !== 'idle' && (
          <View style={s.ringWrap}>
            <ProgressRing
              size={160}
              progress={progress}
              total={MOTOR_DURATION}
              color={T.primary}
              bg={T.border}
              strokeWidth={10}
            >
              <View style={{ alignItems: 'center' }}>
                {motorState === 'done' ? (
                  <Icon name="check-circle" size={36} color={T.primary} />
                ) : (
                  <>
                    <Text style={[s.timerNum, { color: T.primary }]}>
                      {String(minutes).padStart(2, '0')}:
                      {String(seconds).padStart(2, '0')}
                    </Text>
                    <Text style={[s.timerSub, { color: T.muted }]}>{pct}%</Text>
                  </>
                )}
              </View>
            </ProgressRing>
          </View>
        )}

        {/* ── CTA ────────────────────────────────────────────────── */}
        {motorState === 'idle' && (
          <TouchableOpacity
            style={[
              s.ctaBtn,
              {
                backgroundColor: connected ? T.primary : T.border,
              },
            ]}
            onPress={async () => {
              await dispatch(cmdPHMotorStart());
            }}
            disabled={!connected}
            activeOpacity={0.85}
          >
            <Icon name="play-circle" size={22} color="#fff" />
            <Text style={s.ctaBtnText}>
              {connected ? 'Start Mixing Motor (60s)' : 'Connect device first'}
            </Text>
          </TouchableOpacity>
        )}

        {motorState === 'running' && (
          <View style={s.runningRow}>
            <View
              style={[
                s.runningBar,
                { backgroundColor: T.cardAlt, borderColor: T.border },
              ]}
            >
              <View style={[s.runningDot, { backgroundColor: T.primary }]} />
              <Text style={[s.runningText, { color: T.text }]}>
                Motor running — do not remove beaker
              </Text>
            </View>
            <TouchableOpacity
              style={[s.stopBtn, { borderColor: '#ef4444' }]}
              onPress={async () => {
                // Tell firmware to stop (best-effort) then update UI
                await dispatch(cmdPHMotorStop());
                dispatch(stopMotorEarly());
              }}
            >
              <Icon name="stop" size={16} color="#ef4444" />
              <Text style={[s.stopBtnText, { color: '#ef4444' }]}>Stop</Text>
            </TouchableOpacity>
          </View>
        )}

        {motorState === 'done' && (
          <TouchableOpacity
            style={[s.ctaBtn, { backgroundColor: T.primary }]}
            onPress={handleReadResults}
            activeOpacity={0.85}
          >
            <Icon name="flask-outline" size={22} color="#fff" />
            <Text style={s.ctaBtnText}>Read pH & EC Results →</Text>
          </TouchableOpacity>
        )}

        <Text style={[s.hint, { color: T.muted }]}>
          {motorState === 'idle'
            ? 'Motor mixes soil-extractant solution for accurate readings'
            : motorState === 'running'
            ? 'Motor running. Timer auto-stops at 60 seconds.'
            : 'Solution ready. Proceed to read pH and EC from the probe.'}
        </Text>
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
    padding: Spacing.lg,
  },
  bleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: Spacing.md,
  },
  bleChipText: { fontSize: 12, fontWeight: '700' },
  motorRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    position: 'relative',
  },
  doneBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  motorLabel: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  instrCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    width: '100%',
    marginBottom: Spacing.md,
    gap: 10,
  },
  instrTitle: { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  instrRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  instrDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instrDotNum: { color: '#fff', fontSize: 11, fontWeight: '900' },
  instrText: { fontSize: 13, flex: 1 },
  ringWrap: { marginBottom: Spacing.md },
  timerNum: { fontSize: 32, fontWeight: '900', fontFamily: 'Courier' },
  timerSub: { fontSize: 12, fontWeight: '700' },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    height: 56,
    borderRadius: Radius.lg,
    marginBottom: Spacing.sm,
  },
  ctaBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  runningRow: { width: '100%', gap: 8, marginBottom: Spacing.sm },
  runningBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    width: '100%',
  },
  runningDot: { width: 10, height: 10, borderRadius: 5 },
  runningText: { fontSize: 13, fontWeight: '600' },
  stopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: Radius.lg,
    borderWidth: 1,
    height: 40,
  },
  stopBtnText: { fontSize: 13, fontWeight: '700' },
  hint: {
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: Spacing.sm,
    marginTop: Spacing.xs,
  },
});
