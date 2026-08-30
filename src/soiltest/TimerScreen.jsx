// src/screens/test/TimerScreen.js
//
// Architecture matches MixerScreen (Start/Stop flow, status polling,
// countdown-driven completion).
//
// NEW IN THIS VERSION:
// - Accepts `route.params.autoStart` (set by PHECResultScreen when the
//   user taps "Continue to Soil Test (12 Parameter)"). When present, the
//   screen:
//     1. Shows the "Next Steps" info card (moved here from
//        PHECResultScreen's old in-place toggle view) along with a
//        Start button — the motor does NOT start automatically.
//     2. Once the user taps Start, the Next Steps card disappears and
//        the full 12-parameter soil test motor sequence runs
//        (cmdStartPhTestMotor → TEST_RESET → cmdStartSoilTest).
// - Manual entry (no autoStart param) keeps the original Start/Stop
//   button flow using cmdStartSoilSensor, unchanged.
// - On completion (motor stopped / countdown finished) either way, the
//   screen shows a "Connect to SoilLenz" prompt and routes to
//   BLEScanScreen — unchanged from before.

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
import { useDispatch, useSelector } from 'react-redux';
import { Radius, Spacing } from '../theme';
import { TopBar, ProgressRing } from '../components/common';
import useTheme from '../hooks/useTheme';
import {
  cmdCheckSoilMotorStatus,
  cmdStartSoilSensor,
  cmdStopSoilTest,
  cmdStartPhTestMotor,
  cmdStartSoilTest,
  disconnectDevice,
} from '../redux/actions/bleActions';

const MOTOR_DURATION = 60;

export function TimerScreen({ navigation, route }) {
  const theme = useTheme();
  const T = theme.colors;
  const dispatch = useDispatch();

  // Set by PHECResultScreen's "Continue to Soil Test (12 Parameter)" button
  const autoStart = !!route?.params?.autoStart;

  // ── BLE connection state (same source MixerScreen reads from) ────────
  const { connected, device, lastDeviceError } = useSelector(s => s.ble);

  // ── Soil sensor status text, same source the original screen used.
  const soilSathiData = useSelector(s => s.soilsaathi);

  // =====================================================
  // STATES
  // =====================================================
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(MOTOR_DURATION);
  const [starting, setStarting] = useState(false); // brief "kicking off" state for autoStart

  // =====================================================
  // REFS
  // =====================================================
  const timerRef = useRef(null);
  const statusIntervalRef = useRef(null);

  // =====================================================
  // POLL SOIL MOTOR STATUS (only while running, like Mixer)
  // =====================================================
  useEffect(() => {
    if (started && !completed) {
      if (!statusIntervalRef.current) {
        statusIntervalRef.current = setInterval(() => {
          dispatch(cmdCheckSoilMotorStatus());
        }, 3000);
      }
    } else if (statusIntervalRef.current) {
      clearInterval(statusIntervalRef.current);
      statusIntervalRef.current = null;
    }

    return () => {};
  }, [started, completed, dispatch]);

  // =====================================================
  // COUNTDOWN TIMER — drives completion locally, same as before
  // =====================================================
  useEffect(() => {
    if (started && !completed && !timerRef.current) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
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
  }, [started, completed]);

  // when countdown hits zero: stop the test on the device and flip to
  // the completed state
  useEffect(() => {
    if (started && timeLeft === 0 && !completed) {
      dispatch(cmdStopSoilTest());
      setCompleted(true);
      setStarted(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
        statusIntervalRef.current = null;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, started, completed]);

  // =====================================================
  // CLEANUP
  // =====================================================
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (statusIntervalRef.current) clearInterval(statusIntervalRef.current);
    };
  }, []);

  // =====================================================
  // START — manual entry (Start button), soil-sensor-only test
  // =====================================================
  const handleStart = async () => {
    try {
      if (started || !connected) return;

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      setCompleted(false);
      setTimeLeft(MOTOR_DURATION);

      await dispatch(cmdStartSoilSensor());
      setStarted(true);
    } catch (e) {
      setStarted(false);
    }
  };

  // =====================================================
  // START — arrived from Results screen, full 12-parameter soil test
  // Mirrors what PHECResultScreen's old handleStartSoilTest used to do.
  // =====================================================
  const startFullSoilTest = async () => {
    try {
      setStarting(true);
      setCompleted(false);
      setTimeLeft(MOTOR_DURATION);

      await dispatch(cmdStartPhTestMotor());
      dispatch({ type: 'TEST_RESET' });
      await dispatch(cmdStartSoilTest());

      setStarted(true);
    } catch (e) {
      setStarted(false);
    } finally {
      setStarting(false);
    }
  };

  // =====================================================
  // STOP
  // =====================================================
  const handleStop = async () => {
    try {
      await dispatch(cmdStopSoilTest());

      setStarted(false);
      setTimeLeft(MOTOR_DURATION);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
        statusIntervalRef.current = null;
      }
    } catch (e) {}
  };

  // ── Completed action: no results screen — just point the user at
  // connecting to SoilLenz. Drop the current connection first so
  // DeviceScanScreen starts clean and does a fresh scan for nearby
  // devices instead of showing the just-used device as still connected.
  // ───────────────────────────────────────────────────────────────────
  const handleGoConnect = () => {
    dispatch(disconnectDevice());
    navigation.navigate('BLEScanScreen', { rescan: true });
  };

  // =====================================================
  // CALCULATIONS
  // =====================================================
  const progress = MOTOR_DURATION - timeLeft;
  const pct = Math.round((progress / MOTOR_DURATION) * 100);
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  // =====================================================
  // UI
  // =====================================================
  return (
    <SafeAreaView style={[s.container, { backgroundColor: T.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />

      <TopBar
        title="Soil Test Timer"
        onBack={() => navigation.goBack()}
        theme={theme}
      />

      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── BLE CONNECTED CHIP ─────────────────────────────────── */}
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

        {/* ── SOIL MOTOR STATUS CHIP ─────────────────────────────── */}
        <View
          style={[
            s.chip,
            {
              backgroundColor: T.cardAlt,
              borderColor: started
                ? T.primary
                : completed
                ? '#10B981'
                : T.orange,
            },
          ]}
        >
          <Text
            style={[
              s.chipText,
              {
                color: started ? T.primary : completed ? '#10B981' : T.orange,
              },
            ]}
          >
            {started
              ? '🔵 Motor RUNNING'
              : completed
              ? '✅ Test DONE'
              : starting
              ? '🟡 Starting…'
              : '🟠 Motor STOPPED'}
          </Text>
        </View>

        {soilSathiData?.motorStateFromBle ? (
          <Text style={[s.deviceStatus, { color: T.textSub }]}>
            {`Device status: ${soilSathiData.motorStateFromBle}`}
          </Text>
        ) : (
          started && (
            <Text style={[s.deviceStatus, { color: T.textSub }]}>
              No response from device
            </Text>
          )
        )}

        {/* ── MOTOR ICON ──────────────────────────────────────────── */}
        <View
          style={[
            s.motorRing,
            {
              borderColor: T.primary,
              backgroundColor: started ? T.primaryGlow : 'transparent',
            },
          ]}
        >
          <Icon name="rotate-3d-variant" size={64} color={T.primary} />
        </View>

        <Text style={[s.motorLabel, { color: T.primary }]}>
          {started
            ? 'Motor Running…'
            : completed
            ? 'Test Completed ✅'
            : starting
            ? 'Starting Soil Test…'
            : 'Motor Ready'}
        </Text>

        {/* ── NEXT STEPS CARD — only when arriving from Results screen,
            and only before the test starts. Moved here from
            PHECResultScreen's old in-place toggle view. Hidden once the
            motor is running/started so it doesn't stick around. ───── */}
        {autoStart && !started && !completed && (
          <View
            style={[
              s.nextStepsCard,
              { backgroundColor: T.card, borderColor: T.border },
            ]}
          >
            <Text style={[s.nextStepsTitle, { color: T.primary }]}>
              🚀 Next Steps
            </Text>
            <Text style={[s.nextStepsSubtitle, { color: T.muted }]}>
              You've completed the pH/EC test. Next we'll run the full soil
              nutrient analysis.
            </Text>

            <View style={s.stepDivider} />

            {[
              {
                title: 'Start SoilLenz Test',
                desc: 'The motor mixes soil with extractant solution for nutrient extraction',
              },
              {
                title: 'Wait for Mixing to Complete',
                desc: 'The motor runs for 60 seconds to ensure proper soil-extractant mixing',
              },
              {
                title: 'Reconnect for the Full Profile',
                desc: 'Once mixing finishes, reconnect to SoilLenz to pull the complete nutrient profile',
              },
            ].map((step, i) => (
              <View key={i} style={s.stepRow}>
                <View style={[s.stepNumber, { backgroundColor: T.primaryGlow }]}>
                  <Text style={[s.stepNumberText, { color: T.primary }]}>
                    {i + 1}
                  </Text>
                </View>
                <View style={s.stepContent}>
                  <Text style={[s.stepTitle, { color: T.text }]}>
                    {step.title}
                  </Text>
                  <Text style={[s.stepDescription, { color: T.muted }]}>
                    {step.desc}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── START BUTTON — autoStart flow. Motor no longer starts on
            its own; the user taps this after reading the Next Steps
            card, then the card disappears and the motor runs. ────── */}
        {autoStart && !started && !completed && (
          <TouchableOpacity
            style={[
              s.ctaBtn,
              {
                backgroundColor: T.primary,
                opacity: connected ? 1 : 0.5,
              },
            ]}
            activeOpacity={0.85}
            disabled={!connected || starting}
            onPress={startFullSoilTest}
          >
            <Icon
              name={starting ? 'loading' : 'play-circle'}
              size={22}
              color="#fff"
            />
            <Text style={s.ctaBtnText}>
              {starting ? 'Starting…' : 'Start Soil Test (60 s)'}
            </Text>
          </TouchableOpacity>
        )}

        {/* ── INSTRUCTIONS (only before starting, manual-entry flow) ── */}
        {!autoStart && !started && !completed && (
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
              'Add soil sample to the sensor chamber',
              'Ensure probe is inserted correctly',
              'Keep the device steady during the test',
              'Ensure device is connected and ready',
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

        {/* ── TIMER ───────────────────────────────────────────────── */}
        {started && (
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

        {/* ── START BUTTON — manual-entry flow only. The autoStart flow
            has its own Start button rendered above, next to the Next
            Steps card. ─────────────────────────────────────────────── */}
        {!autoStart && !started && !completed && (
          <TouchableOpacity
            style={[
              s.ctaBtn,
              {
                backgroundColor: T.primary,
                opacity: connected ? 1 : 0.5,
              },
            ]}
            activeOpacity={0.85}
            disabled={!connected}
            onPress={handleStart}
          >
            <Icon name="play-circle" size={22} color="#fff" />
            <Text style={s.ctaBtnText}>Start Soil Test (60 s)</Text>
          </TouchableOpacity>
        )}

        {!connected && !started && !completed && (
          <Text style={[s.hint, { color: T.orange }]}>
            Connect to SoilLenz before starting the test
          </Text>
        )}

        {/* ── RUNNING SECTION ─────────────────────────────────────── */}
        {started && (
          <View style={s.runningRow}>
            <View
              style={[
                s.runningBar,
                { backgroundColor: T.cardAlt, borderColor: T.border },
              ]}
            >
              <View style={[s.runningDot, { backgroundColor: T.primary }]} />
              <Text style={[s.runningText, { color: T.text }]}>
                Motor running — do not disturb the device
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

        {/* ── COMPLETED ACTIONS ───────────────────────────────────
            No "Get Results" / no result screen. Just prompt to connect
            to SoilLenz and route to BLEScanScreen.
        ──────────────────────────────────────────────────────── */}
        {completed && (
          <View style={s.completedActions}>
            <View
              style={[
                s.connectCard,
                { backgroundColor: T.card, borderColor: T.border },
              ]}
            >
              <Icon
                name="bluetooth-off"
                size={28}
                color={T.primary}
                style={{ marginBottom: 8 }}
              />
              <Text style={[s.connectTitle, { color: T.text }]}>
                Connect to SoilLenz
              </Text>
              <Text style={[s.connectMsg, { color: T.textSub }]}>
                Please connect to your SoilLenz device to continue.
              </Text>
            </View>

            <TouchableOpacity
              style={[s.ctaBtn, { backgroundColor: T.primary }]}
              activeOpacity={0.85}
              onPress={handleGoConnect}
            >
              <Icon name="bluetooth-connect" size={22} color="#fff" />
              <Text style={s.ctaBtnText}>Connect to SoilLenz</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── HINT ─────────────────────────────────────────────────── */}
        <Text style={[s.hint, { color: T.muted }]}>
          {started
            ? 'Motor running. Please wait for 60 seconds.'
            : completed
            ? 'Test completed. Connect to SoilLenz to continue.'
            : starting
            ? 'Kicking off the soil test motor…'
            : 'Motor runs the soil sensor test for accurate readings'}
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}

// =====================================================
// STYLES
// =====================================================
const s = StyleSheet.create({
  container: { flex: 1 },

  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    paddingBottom: 48,
  },

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
  chipText: {
    fontSize: 11,
    fontWeight: '700',
  },

  deviceStatus: {
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'center',
  },

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

  // ─── Next Steps card (moved here from PHECResultScreen) ───────────
  nextStepsCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    width: '100%',
    marginBottom: Spacing.md,
  },
  nextStepsTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  nextStepsSubtitle: {
    fontSize: 13,
    lineHeight: 20,
  },
  stepDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginVertical: 10,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '900',
  },
  stepContent: { flex: 1 },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  stepDescription: {
    fontSize: 12,
    lineHeight: 18,
  },

  instrCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    width: '100%',
    marginBottom: Spacing.md,
    gap: 10,
  },
  instrTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  instrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  instrDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instrDotNum: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
  },
  instrText: {
    fontSize: 13,
    flex: 1,
  },

  ringWrap: { marginBottom: Spacing.md },
  timerNum: {
    fontSize: 32,
    fontWeight: '900',
    fontFamily: 'Courier',
  },
  timerSub: {
    fontSize: 12,
    fontWeight: '700',
  },

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
  ctaBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },

  runningRow: {
    width: '100%',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  runningBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    width: '100%',
  },
  runningDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  runningText: {
    fontSize: 13,
    fontWeight: '600',
  },
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
  stopBtnText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '800',
  },

  completedActions: {
    width: '100%',
    gap: 12,
    marginTop: 10,
  },
  connectCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    width: '100%',
    alignItems: 'center',
  },
  connectTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
  },
  connectMsg: {
    fontSize: 13,
    textAlign: 'center',
  },

  hint: {
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: Spacing.sm,
    marginTop: Spacing.xs,
  },
});