// MixerScreen.jsx

import React, { useEffect, useRef, useState } from 'react';

import {
  View,
  Text,
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
  cmdStartPhTestMotor,
  cmdStopPhTestMotor,
} from '../redux/actions/bleActions';

const MOTOR_DURATION = 60;

export default function MixerScreen({ navigation }) {
  const theme = useTheme();

  const T = theme.colors;

  const dispatch = useDispatch();

  const { connected, device, motorStatus, lastDeviceError } = useSelector(
    s => s.ble,
  );

  // =====================================================
  // STATES
  // =====================================================

  const [started, setStarted] = useState(false);

  const [motorTimeLeft, setMotorTimeLeft] = useState(MOTOR_DURATION);

  const [mixingCompleted, setMixingCompleted] = useState(false);

  // =====================================================
  // REFS
  // =====================================================

  const timerRef = useRef(null);

  const motorStatusIntervalRef = useRef(null);

  // =====================================================
  // CHECK MOTOR STATUS
  // =====================================================

  useEffect(() => {
    if (started && motorStatus === 'running') {
      if (!motorStatusIntervalRef.current) {
        motorStatusIntervalRef.current = setInterval(() => {
          dispatch(cmdCheckMotorStatus());
        }, 3000);
      }
    } else {
      if (motorStatusIntervalRef.current) {
        clearInterval(motorStatusIntervalRef.current);

        motorStatusIntervalRef.current = null;
      }
    }

    return () => {};
  }, [started, motorStatus, dispatch]);

  // =====================================================
  // MAIN TIMER
  // =====================================================

  useEffect(() => {
    // stop timer if motor stopped
    if (motorStatus !== 'running') {
      if (started) {
        setStarted(false);
      }

      if (timerRef.current) {
        clearInterval(timerRef.current);

        timerRef.current = null;
      }

      // MOTOR COMPLETED
      if (motorStatus === 'done') {
        setMotorTimeLeft(0);

        setMixingCompleted(true);
      }

      return;
    }

    // create timer
    if (started && motorStatus === 'running' && !timerRef.current) {
      timerRef.current = setInterval(() => {
        setMotorTimeLeft(prev => {
          // completed
          if (prev <= 1) {
            clearInterval(timerRef.current);

            timerRef.current = null;

            setStarted(false);

            setMixingCompleted(true);

            return 0;
          }

          return prev - 1;
        });
      }, 1000);
    }

    return () => {};
  }, [started, motorStatus]);

  // =====================================================
  // CLEANUP
  // =====================================================

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      if (motorStatusIntervalRef.current) {
        clearInterval(motorStatusIntervalRef.current);
      }
    };
  }, []);

  // =====================================================
  // START
  // =====================================================

  const handleStart = async () => {
    try {
      // prevent multiple starts
      if (started || motorStatus === 'running') {
        return;
      }

      // clear previous timer
      if (timerRef.current) {
        clearInterval(timerRef.current);

        timerRef.current = null;
      }

      setMixingCompleted(false);

      setMotorTimeLeft(MOTOR_DURATION);

      await dispatch(cmdStartPhTestMotor());

      setStarted(true);
    } catch (e) {
      setStarted(false);
    }
  };

  // =====================================================
  // STOP
  // =====================================================

  const handleStop = async () => {
    try {
      await dispatch(cmdStopPhTestMotor());

      setStarted(false);

      setMixingCompleted(false);

      setMotorTimeLeft(MOTOR_DURATION);

      // clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);

        timerRef.current = null;
      }

      // clear polling
      if (motorStatusIntervalRef.current) {
        clearInterval(motorStatusIntervalRef.current);

        motorStatusIntervalRef.current = null;
      }
    } catch (e) {}
  };

  // =====================================================
  // CALCULATIONS
  // =====================================================

  const progress = MOTOR_DURATION - motorTimeLeft;

  const pct = Math.round((progress / MOTOR_DURATION) * 100);

  const minutes = Math.floor(motorTimeLeft / 60);

  const seconds = motorTimeLeft % 60;

  // =====================================================
  // UI
  // =====================================================
  const getPhMotorResults = async () => {
    await dispatch(cmdGetFinalResult());
    navigation.navigate('PHECResultScreen');
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
        {/* ====================================== */}
        {/* BLE CONNECTED */}
        {/* ====================================== */}

        {connected && (
          <View
            style={[
              s.chip,
              {
                backgroundColor: T.primaryGlow,

                borderColor: T.primary,
              },
            ]}
          >
            <Icon name="bluetooth-connect" size={13} color={T.primary} />

            <Text style={[s.chipText, { color: T.primary }]}>
              {device?.name}
            </Text>
          </View>
        )}

        {/* ====================================== */}
        {/* MOTOR STATUS */}
        {/* ====================================== */}

        <View
          style={[
            s.chip,
            {
              backgroundColor: T.cardAlt,

              borderColor:
                motorStatus === 'running'
                  ? T.primary
                  : motorStatus === 'done'
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
                    : motorStatus === 'done'
                    ? '#10B981'
                    : T.orange,
              },
            ]}
          >
            {motorStatus === 'running'
              ? '🔵 Motor RUNNING'
              : motorStatus === 'done'
              ? '✅ Motor DONE'
              : '🟠 Motor STOPPED'}
          </Text>
        </View>

        {/* ====================================== */}
        {/* MOTOR ICON */}
        {/* ====================================== */}

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
            ? 'Mixing Completed ✅'
            : 'Motor Ready'}
        </Text>

        {/* ====================================== */}
        {/* INSTRUCTIONS */}
        {/* ====================================== */}

        {!started && !mixingCompleted && motorStatus !== 'running' && (
          <View
            style={[
              s.instrCard,
              {
                backgroundColor: T.card,

                borderColor: T.border,
              },
            ]}
          >
            <Text
              style={[
                s.instrTitle,
                {
                  color: T.primary,
                },
              ]}
            >
              📋 Before Starting
            </Text>

            {[
              'Add 5 g soil sample to the beaker',
              'Add 40 ml extractant solution',
              'Place the beaker under the mixer',
              'Ensure probe is connected and ready',
            ].map((t, i) => (
              <View key={i} style={s.instrRow}>
                <View
                  style={[
                    s.instrDot,
                    {
                      backgroundColor: T.primary,
                    },
                  ]}
                >
                  <Text style={s.instrDotNum}>{i + 1}</Text>
                </View>

                <Text
                  style={[
                    s.instrText,
                    {
                      color: T.text,
                    },
                  ]}
                >
                  {t}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ====================================== */}
        {/* TIMER */}
        {/* ====================================== */}

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
              <View
                style={{
                  alignItems: 'center',
                }}
              >
                <Text
                  style={[
                    s.timerNum,
                    {
                      color: T.primary,
                    },
                  ]}
                >
                  {String(minutes).padStart(2, '0')}:
                  {String(seconds).padStart(2, '0')}
                </Text>

                <Text
                  style={[
                    s.timerSub,
                    {
                      color: T.muted,
                    },
                  ]}
                >
                  {pct}%
                </Text>
              </View>
            </ProgressRing>
          </View>
        )}

        {/* ====================================== */}
        {/* START BUTTON */}
        {/* ====================================== */}

        {!started && !mixingCompleted && motorStatus !== 'running' && (
          <TouchableOpacity
            style={[
              s.ctaBtn,
              {
                backgroundColor: T.primary,
              },
            ]}
            activeOpacity={0.85}
            onPress={handleStart}
          >
            <Icon name="play-circle" size={22} color="#fff" />

            <Text style={s.ctaBtnText}>Start Mixing Motor (60 s)</Text>
          </TouchableOpacity>
        )}

        {/* ====================================== */}
        {/* RUNNING SECTION */}
        {/* ====================================== */}

        {started && motorStatus === 'running' && (
          <View style={s.runningRow}>
            <View
              style={[
                s.runningBar,
                {
                  backgroundColor: T.cardAlt,

                  borderColor: T.border,
                },
              ]}
            >
              <View
                style={[
                  s.runningDot,
                  {
                    backgroundColor: T.primary,
                  },
                ]}
              />

              <Text
                style={[
                  s.runningText,
                  {
                    color: T.text,
                  },
                ]}
              >
                Motor running — do not remove beaker
              </Text>
            </View>

            {/* STOP */}

            <TouchableOpacity
              style={[
                s.stopBtn,
                {
                  borderColor: '#EF4444',
                },
              ]}
              onPress={handleStop}
            >
              <Icon name="stop" size={16} color="#EF4444" />

              <Text style={s.stopBtnText}>Stop</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ====================================== */}
        {/* COMPLETED ACTIONS */}
        {/* ====================================== */}

        {mixingCompleted && (
          <View style={s.completedActions}>
            {/* RE RUN */}

            <TouchableOpacity
              style={[
                s.reRunBtn,
                {
                  borderColor: T.primary,

                  backgroundColor: T.primaryGlow,
                },
              ]}
              activeOpacity={0.85}
              onPress={handleStart}
            >
              <Icon name="restart" size={20} color={T.primary} />

              <Text
                style={[
                  s.reRunBtnText,
                  {
                    color: T.primary,
                  },
                ]}
              >
                Re-Run
              </Text>
            </TouchableOpacity>

            {/* GET RESULTS */}

            <TouchableOpacity
              style={[
                s.resultBtn,
                {
                  backgroundColor: T.primary,
                },
              ]}
              activeOpacity={0.85}
              onPress={getPhMotorResults}
            >
              <Icon name="chart-box" size={22} color="#fff" />

              <Text style={s.resultBtnText}>Get Results</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ====================================== */}
        {/* HINT */}
        {/* ====================================== */}

        <Text style={[s.hint, { color: T.muted }]}>
          {started && motorStatus === 'running'
            ? 'Motor running. Please wait for 60 seconds.'
            : mixingCompleted
            ? 'Mixing completed successfully.'
            : 'Motor mixes the soil-extractant solution for accurate readings'}
        </Text>

        {/* ====================================== */}
        {/* ERROR */}
        {/* ====================================== */}

        {!!lastDeviceError && (
          <Text
            style={{
              marginTop: 10,
              color: '#EF4444',
              fontSize: 12,
              textAlign: 'center',
            }}
          >
            {lastDeviceError}
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

// =====================================================
// STYLES
// =====================================================

const s = StyleSheet.create({
  container: {
    flex: 1,
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

  ringWrap: {
    marginBottom: Spacing.md,
  },

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
    gap: 6,
    borderRadius: Radius.lg,
    borderWidth: 1,
    height: 40,
  },

  stopBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
  },

  completedActions: {
    width: '100%',
    gap: 12,
    marginTop: 10,
  },

  reRunBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    height: 52,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
  },

  reRunBtnText: {
    fontSize: 15,
    fontWeight: '800',
  },

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

  resultBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },

  hint: {
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: Spacing.sm,
    marginTop: Spacing.xs,
  },
});
