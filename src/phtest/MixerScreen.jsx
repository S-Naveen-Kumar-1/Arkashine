// src/screens/phtest/MixerScreen.jsx
//
// Two-way BLE communication:
//  START  → {"TEST":"START"}
//         ← {"TEST":"STARTED"}         immediate — stored in ble.testStarted
//         ← {pH,TDS,...}               ~60 s — stored in ble.sensorData
//
//  STATUS → {"CHECKMOTORSTATUS":"CHECKMOTORSTATUS"}  (every 5 s while running)
//         ← {"MOTORSTATUS":"RUNNING"|"STOPPED"}      stored in ble.motorStatus
//
//  STOP   → {"TEST":"STOP"}
//         ← {"TEST":"STOPPED"}         stored in ble.motorStatus='stopped'

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
import { cmdStopTest, cmdCheckMotorStatus } from '../redux/actions/bleActions';
import { MOTOR_DURATION } from '../redux/reducers/phTestReducer';

export default function MixerScreen({ navigation }) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const T = theme.colors;

  const { motorState, motorTimeLeft } = useSelector(s => s.phtest);
  const {
    connected,
    device,
    sensorData,
    testStarted,
    motorStatus,
    lastDeviceError,
  } = useSelector(s => s.ble);

  const spinAnim = useRef(new Animated.Value(0)).current;
  const spinLoop = useRef(null);
  const pollRef = useRef(null);

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
    motorState === 'running' ? startSpin() : stopSpin();
  }, [motorState]);
  useEffect(() => {
    dispatch(testReset());
  }, [dispatch]);
  useEffect(
    () => () => {
      stopSpin();
      clearInterval(pollRef.current);
    },
    [],
  );

  // Poll motor status every 3 s while running
  // → {"CHECKMOTORSTATUS":"CHECKMOTORSTATUS"}  ← {"MOTORSTATUS":"RUNNING"|"STOPPED"}
  useEffect(() => {
    if (motorState === 'running' && connected) {
      pollRef.current = setInterval(() => {
        dispatch(cmdCheckMotorStatus());
      }, 3000);
    } else {
      clearInterval(pollRef.current);
    }
    return () => clearInterval(pollRef.current);
  }, [motorState, connected, dispatch]);

  // Auto-navigate when sensor data arrives AND local timer is done

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const progress = MOTOR_DURATION - motorTimeLeft;
  const pct = Math.round((progress / MOTOR_DURATION) * 100);
  const minutes = Math.floor(motorTimeLeft / 60);
  const seconds = motorTimeLeft % 60;

  // START: sends {"TEST":"START"} via phTestActions.startMotor + starts local timer
  const handleStart = () => dispatch(startMotor());

  // STOP: sends {"TEST":"STOP"} → recv {"TEST":"STOPPED"} → updates motorStatus
  const handleStop = async () => {
    clearInterval(pollRef.current);
    await dispatch(cmdStopTest()); // → {"TEST":"STOP"}  ← {"TEST":"STOPPED"}
    dispatch(stopMotorEarly()); // local timer done
  };

  const handleReadResults = () => navigation.replace('PHECResultScreen');

  // Firmware status label derived from ble.motorStatus (real device state)
  const firmwareLabel =
    motorStatus === 'running'
      ? '🔵 Firmware: Motor RUNNING'
      : motorStatus === 'stopped'
      ? '🟢 Firmware: Motor STOPPED'
      : null;

  return (
    <SafeAreaView style={[s.container, { backgroundColor: T.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <TopBar
        title="Mixing Motor"
        onBack={() => navigation.goBack()}
        theme={theme}
      />

      <View style={s.body}>
        {/* BLE connection chip */}
        <View
          style={[
            s.chip,
            {
              backgroundColor: connected ? T.primaryGlow : T.cardAlt,
              borderColor: connected ? T.primary : T.border,
            },
          ]}
        >
          <Icon
            name={connected ? 'bluetooth-connect' : 'bluetooth-off'}
            size={13}
            color={connected ? T.primary : T.muted}
          />
          <Text
            style={[s.chipText, { color: connected ? T.primary : T.muted }]}
          >
            {connected
              ? `${device?.name || 'Device'} connected`
              : 'No device connected'}
          </Text>
        </View>

        {/* Test started ACK chip — shown when firmware sent {"TEST":"STARTED"} */}
        {/* {testStarted && (
          <View
            style={[
              s.chip,
              { backgroundColor: '#0d2a0d', borderColor: '#22C55E' },
            ]}
          >
            <Icon name="check-circle" size={13} color="#22C55E" />
            <Text style={[s.chipText, { color: '#22C55E' }]}>
              Firmware: Motor STARTED ✅
            </Text>
          </View>
        )} */}

        {/* Motor status chip — updated by CHECKMOTORSTATUS poll every 5 s */}
        {firmwareLabel && (
          <View
            style={[
              s.chip,
              {
                backgroundColor: T.cardAlt,
                borderColor: motorStatus === 'running' ? T.primary : '#22C55E',
              },
            ]}
          >
            <Text
              style={[
                s.chipText,
                { color: motorStatus === 'running' ? T.primary : '#22C55E' },
              ]}
            >
              {firmwareLabel}
            </Text>
          </View>
        )}

        {/* Device error banner */}
        {lastDeviceError && (
          <View style={[s.errorBar, { borderColor: '#EF4444' }]}>
            <Icon name="alert-circle" size={14} color="#EF4444" />
            <Text style={s.errorText}>Device: {lastDeviceError}</Text>
          </View>
        )}

        {/* Motor ring */}
        <View
          style={[
            s.motorRing,
            {
              borderColor: motorState !== 'idle' ? T.primary : T.border,
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
              <Icon name="check" size={16} color={T.primary} />
            </View>
          )}
        </View>

        <Text style={[s.motorLabel, { color: T.primary }]}>
          {motorState === 'idle'
            ? 'Motor Ready'
            : motorState === 'running'
            ? 'Motor Running…'
            : 'Mixing Complete ✅'}
        </Text>

        {/* Prep checklist */}
        {motorState === 'idle' && (
          <View
            style={[
              s.instrCard,
              { backgroundColor: T.card, borderColor: T.border },
            ]}
          >
            <Text style={[s.instrTitle, { color: T.primary }]}>
              📋 Before Starting
            </Text>
            {[
              'Add 5 g soil sample to the beaker',
              'Add 40 ml extractant solution',
              'Place the beaker under the mixer',
              'Ensure probe is connected and ready',
            ].map((t, i) => (
              <View key={i} style={s.instrRow}>
                <View style={[s.instrDot, { backgroundColor: T.primary }]}>
                  <Text style={[s.instrDotNum, { color: T.primary }]}>
                    {i + 1}
                  </Text>
                </View>
                <Text style={[s.instrText, { color: T.text }]}>{t}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Countdown ring */}
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

        {/* Start button */}
        {motorState === 'idle' && (
          <TouchableOpacity
            style={[
              s.ctaBtn,
              { backgroundColor: connected ? T.primary : T.border },
            ]}
            onPress={handleStart}
            disabled={!connected}
            activeOpacity={0.85}
          >
            <Icon
              name="play-circle"
              size={22}
              color={!connected ? 'orange' : '#fff'}
            />
            <Text
              style={[s.ctaBtnText, { color: connected ? '#fff' : T.primary }]}
            >
              {connected ? 'Start Mixing Motor (60 s)' : 'Connect device first'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Running: status bar + stop */}
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
              onPress={handleStop}
            >
              <Icon name="stop" size={16} color="#ef4444" />
              <Text style={[s.stopBtnText, { color: '#ef4444' }]}>Stop</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Done: read results */}
        {motorState === 'done' && (
          <TouchableOpacity
            style={[s.ctaBtn, { backgroundColor: T.primary }]}
            onPress={handleReadResults}
            activeOpacity={0.85}
          >
            <Icon name="flask-outline" size={22} color={"#fff"} />
            <Text style={s.ctaBtnText}>Read pH & EC Results →</Text>
          </TouchableOpacity>
        )}

        <Text style={[s.hint, { color: T.muted }]}>
          {motorState === 'idle'
            ? 'Motor mixes the soil-extractant solution for accurate readings'
            : motorState === 'running'
            ? 'Motor running. Polling firmware status every 5 s.'
            : 'Solution ready. Proceed to read pH and EC results.'}
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
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 6,
  },
  chipText: { fontSize: 11, fontWeight: '700' },
  errorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: Radius.sm,
    padding: 8,
    marginBottom: 8,
    width: '100%',
  },
  errorText: { color: '#EF4444', fontSize: 12, flex: 1 },
  motorRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    position: 'relative',
    marginTop: 8,
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
