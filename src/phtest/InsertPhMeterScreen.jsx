// InsertPhMeterScreen.jsx
//
// Stage 2 of the two-stage ph-bottle procedure. Reached after MixerScreen
// finishes the EC-only mix (stage 1) and fetches the EC result. Shows the
// captured EC value, asks the user to swap in the pH meter, then runs the
// second 60s mixing stage (PHTEST:START_PH) before fetching the combined
// final result.
//
// Structurally mirrors MixerScreen.jsx (same countdown ring, motor-status
// chip, ack-gated start/stop) — see that file for the race-condition fix
// this pattern is built on.

import React, { useEffect, useRef, useState } from 'react';

import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useSelector, useDispatch } from 'react-redux';

import { Radius, Spacing } from '../theme';

import { TopBar, ProgressRing } from '../components/common';

import useTheme from '../hooks/useTheme';

import {
  cmdCheckMotorStatus,
  cmdGetFinalResult,
  cmdStartPhTestMotorPh,
  cmdStopPhTestMotor,
} from '../redux/actions/bleActions';

const MOTOR_DURATION = 60;

export default function InsertPhMeterScreen({ navigation }) {
  const theme = useTheme();
  const T = theme.colors;
  const dispatch = useDispatch();

  const { connected, device, motorStatus, mixingCompleted } = useSelector(
    s => s.ble,
  );
  const ecResult = useSelector(s => s.phtest?.ecResult);

  const [started, setStarted] = useState(motorStatus === 'running');
  const [motorTimeLeft, setMotorTimeLeft] = useState(MOTOR_DURATION);
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);

  const timerRef = useRef(null);
  const motorStatusIntervalRef = useRef(null);
  const awaitingTimeoutRef = useRef(null);

  // Sync local `started` with the ack-driven redux motorStatus.
  useEffect(() => {
    if (motorStatus === 'running' && !started) setStarted(true);
    if (motorStatus !== 'running' && started) setStarted(false);
    if (motorStatus === 'running' && awaitingConfirm) {
      setAwaitingConfirm(false);
      if (awaitingTimeoutRef.current) {
        clearTimeout(awaitingTimeoutRef.current);
        awaitingTimeoutRef.current = null;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motorStatus]);

  // Poll motor status while running (same pattern as MixerScreen).
  useEffect(() => {
    if (started && motorStatus === 'running') {
      if (!motorStatusIntervalRef.current) {
        motorStatusIntervalRef.current = setInterval(() => {
          dispatch(cmdCheckMotorStatus());
        }, 3000);
      }
    } else if (motorStatusIntervalRef.current) {
      clearInterval(motorStatusIntervalRef.current);
      motorStatusIntervalRef.current = null;
    }
    return () => {};
  }, [started, motorStatus, dispatch]);

  // Countdown — purely visual, completion decided in redux/bleActions.
  useEffect(() => {
    if (motorStatus !== 'running') {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    if (started && motorStatus === 'running' && !timerRef.current) {
      timerRef.current = setInterval(() => {
        setMotorTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            timerRef.current = null;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {};
  }, [started, motorStatus]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (motorStatusIntervalRef.current)
        clearInterval(motorStatusIntervalRef.current);
      if (awaitingTimeoutRef.current) clearTimeout(awaitingTimeoutRef.current);
    };
  }, []);

  const handleStart = async () => {
    try {
      if (started || awaitingConfirm || motorStatus === 'running') return;

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      setMotorTimeLeft(MOTOR_DURATION);
      setAwaitingConfirm(true);

      await dispatch(cmdStartPhTestMotorPh());

      if (awaitingTimeoutRef.current) clearTimeout(awaitingTimeoutRef.current);
      awaitingTimeoutRef.current = setTimeout(() => {
        awaitingTimeoutRef.current = null;
        setAwaitingConfirm(false);
      }, 8500);
    } catch (e) {
      setAwaitingConfirm(false);
    }
  };

  const handleStop = async () => {
    try {
      await dispatch(cmdStopPhTestMotor());
      setStarted(false);
      setAwaitingConfirm(false);
      setMotorTimeLeft(MOTOR_DURATION);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (motorStatusIntervalRef.current) {
        clearInterval(motorStatusIntervalRef.current);
        motorStatusIntervalRef.current = null;
      }
      if (awaitingTimeoutRef.current) {
        clearTimeout(awaitingTimeoutRef.current);
        awaitingTimeoutRef.current = null;
      }
    } catch (e) {}
  };

  const getFinalResults = async () => {
    await dispatch(cmdGetFinalResult());
    navigation.navigate('PHECResultScreen');
  };

  const progress = MOTOR_DURATION - motorTimeLeft;
  const pct = Math.round((progress / MOTOR_DURATION) * 100);
  const minutes = Math.floor(motorTimeLeft / 60);
  const seconds = motorTimeLeft % 60;

  return (
    <SafeAreaView style={[s.container, { backgroundColor: T.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />

      <TopBar
        title="pH Mixing"
        onBack={() => navigation.goBack()}
        theme={theme}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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

        {/* EC captured card */}
        <View
          style={[
            s.ecCard,
            { backgroundColor: T.card, borderColor: '#10B981' },
          ]}
        >
          <Icon name="lightning-bolt" size={20} color="#10B981" />
          <Text style={[s.ecCardText, { color: T.text }]}>
            EC Captured:{' '}
            <Text style={{ fontWeight: '900', color: '#10B981' }}>
              {ecResult?.ec != null ? `${Number(ecResult.ec).toFixed(3)} dS/m` : '—'}
            </Text>
          </Text>
        </View>

        <View
          style={[
            s.chip,
            {
              backgroundColor: T.cardAlt,
              borderColor:
                motorStatus === 'running'
                  ? T.primary
                  : mixingCompleted
                    ? '#10B981'
                    : T.orange,
            },
          ]}
        >
          <Text
            style={[
              s.chipText,
              {
                color:
                  motorStatus === 'running'
                    ? T.primary
                    : mixingCompleted
                      ? '#10B981'
                      : T.orange,
              },
            ]}
          >
            {motorStatus === 'running'
              ? '🔵 Motor RUNNING'
              : mixingCompleted
                ? '✅ Motor DONE'
                : '🟠 Motor STOPPED'}
          </Text>
        </View>

        <View
          style={[
            s.motorRing,
            {
              borderColor: T.primary,
              backgroundColor:
                started && motorStatus === 'running'
                  ? T.primaryGlow
                  : 'transparent',
            },
          ]}
        >
          <Icon name="rotate-3d-variant" size={64} color={T.primary} />
        </View>

        <Text style={[s.motorLabel, { color: T.primary }]}>
          {started && motorStatus === 'running'
            ? 'Motor Running…'
            : mixingCompleted
              ? 'pH Mixing Completed ✅'
              : 'Motor Ready'}
        </Text>

        {!started && !mixingCompleted && motorStatus !== 'running' && (
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
              'Remove the EC probe from the beaker',
              'Insert the pH meter into the mixer',
              'Ensure the pH probe is connected and ready',
              'Tap Start when ready',
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

        {started && motorStatus === 'running' && (
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
                <Text style={[s.timerNum, { color: T.primary }]}>
                  {String(minutes).padStart(2, '0')}:
                  {String(seconds).padStart(2, '0')}
                </Text>
                <Text style={[s.timerSub, { color: T.muted }]}>{pct}%</Text>
              </View>
            </ProgressRing>
          </View>
        )}

        {!started && !mixingCompleted && motorStatus !== 'running' && (
          <TouchableOpacity
            style={[
              s.ctaBtn,
              { backgroundColor: T.primary, opacity: awaitingConfirm ? 0.6 : 1 },
            ]}
            activeOpacity={0.85}
            disabled={awaitingConfirm}
            onPress={handleStart}
          >
            <Icon
              name={awaitingConfirm ? 'progress-clock' : 'play-circle'}
              size={22}
              color="#fff"
            />
            <Text style={s.ctaBtnText}>
              {awaitingConfirm
                ? 'Waiting for device to confirm…'
                : 'Start pH Mixing (60 s)'}
            </Text>
          </TouchableOpacity>
        )}

        {started && motorStatus === 'running' && (
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
              style={[s.stopBtn, { borderColor: '#EF4444' }]}
              onPress={handleStop}
            >
              <Icon name="stop" size={16} color="#EF4444" />
              <Text style={s.stopBtnText}>Stop</Text>
            </TouchableOpacity>
          </View>
        )}

        {mixingCompleted && (
          <View style={s.completedActions}>
            <TouchableOpacity
              style={[s.resultBtn, { backgroundColor: T.primary }]}
              activeOpacity={0.85}
              onPress={getFinalResults}
            >
              <Icon name="chart-box" size={22} color="#fff" />
              <Text style={s.resultBtnText}>Get Results</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={[s.hint, { color: T.muted }]}>
          {started && motorStatus === 'running'
            ? 'Motor running. Please wait for 60 seconds.'
            : awaitingConfirm
              ? 'Waiting for the device to confirm it has started…'
              : mixingCompleted
                ? 'pH mixing completed successfully.'
                : 'Motor mixes the soil-extractant solution to measure pH'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    paddingBottom: 48,
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
  ecCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    width: '100%',
    marginBottom: Spacing.sm,
  },
  ecCardText: { fontSize: 14, fontWeight: '600' },
  motorRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    marginTop: 8,
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
    gap: 8,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    backgroundColor: '#EF444415',
    height: 48,
    marginTop: 6,
  },
  stopBtnText: { color: '#EF4444', fontSize: 15, fontWeight: '800' },
  completedActions: { width: '100%', gap: 12, marginTop: 10 },
  resultBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    height: 56,
    borderRadius: Radius.lg,
    marginBottom: Spacing.sm,
  },
  resultBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  hint: {
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: Spacing.sm,
    marginTop: Spacing.xs,
  },
});
