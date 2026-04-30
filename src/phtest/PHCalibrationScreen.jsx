// src/screens/phtest/PHCalibrationScreen.jsx
// 3-point pH calibration with full BLE integration

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Animated,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Radius, Spacing } from '../theme';
import { TopBar } from '../components/common';
import useTheme from '../hooks/useTheme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useBLE, CMD } from '../contexts/BLEContext';

const PH_POINTS = [
  {
    id: 'ph4',
    label: 'Buffer Solution pH 4',
    standardPH: 4,
    color: '#EF4444',
    icon: 'numeric-4-circle-outline',
    prepMsg:
      'Pour the pH 4 standard buffer solution into a clean beaker.\nInsert the probe tip fully and wait for the reading to stabilise (≈ 30 s).',
  },
  {
    id: 'ph7',
    label: 'Buffer Solution pH 7',
    standardPH: 7,
    color: '#F59E0B',
    icon: 'numeric-7-circle-outline',
    prepMsg:
      'Rinse the probe with distilled water and dry gently.\nPour the pH 7 buffer solution and insert the probe fully.',
  },
  {
    id: 'ph9',
    label: 'Buffer Solution pH 9',
    standardPH: 9,
    color: '#3B82F6',
    icon: 'numeric-9-circle-outline',
    prepMsg:
      'Rinse the probe with distilled water and dry gently.\nPour the pH 9 buffer solution and insert the probe fully.',
  },
];

const STABLE_WINDOW = 10;
const STABLE_VARIANCE = 0.005;

function useStabilityTracker(liveVoltage, active) {
  const [stable, setStable] = useState(false);
  const [progress, setProgress] = useState(0);
  const history = useRef([]);

  useEffect(() => {
    if (!active) {
      history.current = [];
      setStable(false);
      setProgress(0);
      return;
    }
    if (liveVoltage == null || isNaN(liveVoltage)) return;

    history.current = [
      ...history.current.slice(-(STABLE_WINDOW - 1)),
      liveVoltage,
    ];
    const n = history.current.length;
    const pct = Math.min(100, Math.round((n / STABLE_WINDOW) * 100));
    setProgress(pct);

    if (n >= STABLE_WINDOW) {
      const mean = history.current.reduce((a, b) => a + b, 0) / n;
      const variance =
        history.current.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n;
      const stdDev = Math.sqrt(variance);
      setStable(stdDev < STABLE_VARIANCE);
    }
  }, [liveVoltage, active]);

  return { stable, progress };
}

export default function PHCalibrationScreen({ navigation, route }) {
  const theme = useTheme();
  const T = theme.colors;
  const fullFlow = route?.params?.fullFlow ?? false;

  const { sendCommand, sensorData, isConnected, log ,bleConfig} = useBLE();

  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState('prep');
  const [captured, setCaptured] = useState({});
  const [cmdError, setCmdError] = useState(null);
  const [isCalibrationStarted, setIsCalibrationStarted] = useState(false);

  const point = PH_POINTS[step];
  const isReading = phase === 'reading' || phase === 'capturing';
  const liveVoltage = sensorData?.voltage ?? null;

  const { stable, progress } = useStabilityTracker(liveVoltage, isReading);

  const pulse = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(null);

  useEffect(() => {
    if (isReading) {
      pulseAnim.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1.5,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 1.0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      );
      pulseAnim.current.start();
    } else {
      pulseAnim.current?.stop();
      pulse.setValue(1);
    }
    return () => pulseAnim.current?.stop();
  }, [isReading, pulse]);

  const handleStartReading = useCallback(async () => {
    if (!isConnected) {
      Alert.alert(
        'Not connected',
        'Connect to your device before calibrating.',
      );
      return;
    }
    setPhase('starting');
    setCmdError(null);
    log(
      'PH_CAL',
      `Starting pH calibration at step ${step} (${point.standardPH})`,
      "",
      bleConfig
    );

    try {
      // Begin calibration session on first point only
      if (step === 0 && !isCalibrationStarted) {
        await sendCommand(CMD.START_PH_CAL, '', true, 5000);
        log('PH_CAL', 'CAL_PH_START acknowledged ✅', 'success');
        setIsCalibrationStarted(true);
      }

      // Request continuous voltage readings
      await sendCommand(CMD.START_READING, '', true, 5000);
      log('PH_CAL', 'Voltage reading started ✅', 'success');

      setPhase('reading');
    } catch (e) {
      log('PH_CAL', `Start error: ${e.message}`, 'error');
      setCmdError(`Failed to start reading: ${e.message}`);
      setPhase('prep');
    }
  }, [isConnected, step, point, sendCommand, log, isCalibrationStarted]);

  const handleCapture = useCallback(async () => {
    if (!stable) {
      Alert.alert(
        'Not Stable',
        'Wait for the voltage to stabilise before capturing.',
      );
      return;
    }
    if (liveVoltage == null) {
      Alert.alert('No Reading', 'No voltage data received from device.');
      return;
    }

    setPhase('capturing');
    log('PH_CAL', `Capturing pH ${point.standardPH} @ ${liveVoltage} V`);

    try {
      // Send calibration point to device: CAL_PH:<standardPH>
      const resp = await sendCommand(
        CMD.CAL_PH_POINT,
        `${point.standardPH}`,
        true,
        6000,
      );
      log(
        'PH_CAL',
        `CAL_PH:${point.standardPH} response: ${resp}`,
        'success',
      );

      setCaptured(prev => ({
        ...prev,
        [point.id]: { voltage: liveVoltage, standardPH: point.standardPH },
      }));
      setPhase('done');
    } catch (e) {
      log('PH_CAL', `Capture error: ${e.message}`, 'error');
      setCmdError(`Capture failed: ${e.message}`);
      setPhase('reading');
    }
  }, [stable, liveVoltage, point, sendCommand, log]);

  const handleNext = useCallback(async () => {
    if (step < PH_POINTS.length - 1) {
      setStep(s => s + 1);
      setPhase('prep');
      setCmdError(null);
    } else {
      // Last point done — commit calibration
      log('PH_CAL', 'All pH points captured — sending CAL_PH_DONE');
      try {
        await sendCommand(CMD.CAL_PH_DONE, '', true, 6000);
        log('PH_CAL', 'pH calibration committed ✅', 'success');
      } catch (e) {
        log('PH_CAL', `CAL_PH_DONE warning: ${e.message}`, 'warn');
      }

      // Stop reading
      try {
        await sendCommand(CMD.STOP_READING, '', false);
      } catch (_) {}

      const calData = {
        type: 'ph',
        timestamp: Date.now(),
        points: PH_POINTS.map(p => ({
          standardPH: p.standardPH,
          voltage: captured[p.id]?.voltage ?? null,
        })),
      };
      log('PH_CAL', `pH cal data: ${JSON.stringify(calData)}`);

      if (fullFlow) {
        navigation.replace('ECCalibrationScreen', {
          fullFlow: true,
          phCalData: calData,
        });
      } else {
        navigation.replace('CalibrationSummaryScreen', { phCalData: calData });
      }
    }
  }, [step, captured, fullFlow, navigation, sendCommand, log]);

  const handleSkip = useCallback(async () => {
    log('PH_CAL', `Skipping pH ${point.standardPH}`);
    try {
      await sendCommand(CMD.STOP_READING, '', false);
    } catch (_) {}
    setCaptured(prev => ({ ...prev, [point.id]: null }));
    if (step < PH_POINTS.length - 1) {
      setStep(s => s + 1);
      setPhase('prep');
    } else {
      handleNext();
    }
  }, [point, step, sendCommand, handleNext, log]);

  const isDone = phase === 'done';
  const isStarting = phase === 'starting';
  const isCapturing = phase === 'capturing';
  const allPointsDone = step === PH_POINTS.length - 1 && isDone;

  return (
    <SafeAreaView style={[s.container, { backgroundColor: T.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <TopBar
        title="pH Calibration"
        onBack={() => navigation.goBack()}
        theme={theme}
      />

      <ScrollView contentContainerStyle={s.scroll} bounces={false}>
        {/* Step progress */}
        <View style={s.stepRow}>
          {PH_POINTS.map((p, i) => {
            const done = captured[p.id] !== undefined;
            const active = i === step;
            return (
              <React.Fragment key={p.id}>
                <View style={s.stepItem}>
                  <View
                    style={[
                      s.stepCircle,
                      {
                        borderColor: done
                          ? T.primary
                          : active
                          ? p.color
                          : T.border,
                      },
                      done && { backgroundColor: T.primary },
                      active && !done && { backgroundColor: p.color + '22' },
                    ]}
                  >
                    {done ? (
                      <Icon name="check" size={14} color="#fff" />
                    ) : (
                      <Text
                        style={[
                          s.stepNum,
                          { color: active ? p.color : T.muted },
                        ]}
                      >
                        {p.standardPH}
                      </Text>
                    )}
                  </View>
                  <Text
                    style={[s.stepLabel, { color: active ? T.white : T.muted }]}
                  >
                    pH {p.standardPH}
                  </Text>
                </View>
                {i < PH_POINTS.length - 1 && (
                  <View
                    style={[
                      s.stepLine,
                      {
                        backgroundColor: captured[p.id] ? T.primary : T.border,
                      },
                    ]}
                  />
                )}
              </React.Fragment>
            );
          })}
        </View>

        {/* Active point header */}
        <View
          style={[
            s.pointHeader,
            {
              backgroundColor: point.color + '18',
              borderColor: point.color + '55',
            },
          ]}
        >
          <Icon name={point.icon} size={32} color={point.color} />
          <View style={{ flex: 1 }}>
            <Text style={[s.pointTitle, { color: point.color }]}>
              {point.label}
            </Text>
            <Text style={[s.pointSub, { color: T.text }]}>
              Standard pH: {point.standardPH}
            </Text>
          </View>
        </View>

        {/* Error banner */}
        {cmdError && (
          <View
            style={[
              s.errorBanner,
              { backgroundColor: '#EF444422', borderColor: '#EF4444' },
            ]}
          >
            <Icon name="alert-circle" size={16} color="#EF4444" />
            <Text style={[s.errorText, { color: '#EF4444' }]}>{cmdError}</Text>
            <TouchableOpacity onPress={() => setCmdError(null)}>
              <Icon name="close" size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        )}

        {/* PREP PHASE */}
        {phase === 'prep' && (
          <View
            style={[s.card, { backgroundColor: T.card, borderColor: T.border }]}
          >
            <Text style={[s.cardTitle, { color: T.white }]}>
              📋 Preparation
            </Text>
            <Text style={[s.cardText, { color: T.text }]}>{point.prepMsg}</Text>

            <View
              style={[
                s.prepSteps,
                { borderColor: T.border, backgroundColor: T.cardAlt },
              ]}
            >
              {[
                'Ensure probe is clean and connected to device',
                'Pour buffer solution into beaker',
                'Insert probe fully (tip submerged)',
                'Tap "Start Reading" when ready',
              ].map((t, i) => (
                <View key={i} style={s.prepStep}>
                  <View style={[s.prepDot, { backgroundColor: point.color }]}>
                    <Text style={s.prepDotNum}>{i + 1}</Text>
                  </View>
                  <Text style={[s.prepStepText, { color: T.text }]}>{t}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[s.btnPrimary, { backgroundColor: point.color }]}
              onPress={handleStartReading}
              activeOpacity={0.85}
            >
              <Icon name="play-circle" size={20} color="#fff" />
              <Text style={s.btnPrimaryText}>Start Reading</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STARTING PHASE */}
        {isStarting && (
          <View
            style={[
              s.card,
              { backgroundColor: T.card, borderColor: point.color + '55' },
            ]}
          >
            <View style={s.centeredRow}>
              <ActivityIndicator color={point.color} size="large" />
              <Text style={[s.cardTitle, { color: T.white, marginTop: 12 }]}>
                Initialising device…
              </Text>
              <Text
                style={[s.cardText, { color: T.muted, textAlign: 'center' }]}
              >
                Sending calibration command to ESP32
              </Text>
            </View>
          </View>
        )}

        {/* READING PHASE */}
        {(phase === 'reading' || phase === 'capturing') && (
          <View
            style={[
              s.readCard,
              {
                backgroundColor: T.card,
                borderColor: stable ? point.color : T.border,
              },
            ]}
          >
            <View style={s.liveRow}>
              <Animated.View
                style={[
                  s.liveDot,
                  {
                    backgroundColor: stable ? point.color : '#F59E0B',
                    transform: [{ scale: pulse }],
                  },
                ]}
              />
              <Text
                style={[
                  s.liveText,
                  { color: stable ? point.color : '#F59E0B' },
                ]}
              >
                {stable ? '● STABLE' : '● LIVE — stabilising…'}
              </Text>
            </View>

            <View style={s.readGrid}>
              <View
                style={[
                  s.readBox,
                  { borderColor: point.color + '66', flex: 2 },
                ]}
              >
                <Text style={[s.readLabel, { color: T.muted }]}>VOLTAGE</Text>
                <Text style={[s.readValue, { color: point.color }]}>
                  {liveVoltage != null ? liveVoltage.toFixed(4) : '---'}
                </Text>
                <Text style={[s.readUnit, { color: T.muted }]}>V</Text>
              </View>
              <View
                style={[
                  s.readBox,
                  { borderColor: T.border },
                ]}
              >
                <Text style={[s.readLabel, { color: T.muted }]}>TARGET</Text>
                <Text style={[s.readValue, { color: T.white, fontSize: 20 }]}>
                  pH {point.standardPH}
                </Text>
              </View>
            </View>

            <View style={[s.stabilityBar, { backgroundColor: T.border }]}>
              <View
                style={[
                  s.stabilityFill,
                  {
                    width: `${progress}%`,
                    backgroundColor: stable ? point.color : '#F59E0B',
                  },
                ]}
              />
            </View>
            <Text
              style={[
                s.stabilityLabel,
                { color: stable ? point.color : T.muted },
              ]}
            >
              {stable
                ? '✅ Reading stable — ready to capture'
                : `Collecting samples… ${progress}%`}
            </Text>

            <View style={s.actionRow}>
              <TouchableOpacity
                style={[
                  s.btnCapture,
                  {
                    flex: 2,
                    backgroundColor: stable ? point.color : T.border,
                    opacity: isCapturing ? 0.7 : 1,
                  },
                ]}
                onPress={handleCapture}
                disabled={!stable || isCapturing}
                activeOpacity={0.85}
              >
                {isCapturing ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Icon name="check-circle" size={18} color="#fff" />
                )}
                <Text style={[s.btnCaptureText, { color: '#fff' }]}>
                  {isCapturing
                    ? 'Sending to device…'
                    : `Capture pH ${point.standardPH}`}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.btnOutline, { flex: 1, borderColor: T.border }]}
                onPress={handleSkip}
                disabled={isCapturing}
              >
                <Text style={[s.btnOutlineText, { color: T.muted }]}>Skip</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* DONE PHASE */}
        {isDone && (
          <View
            style={[
              s.doneCard,
              {
                backgroundColor: T.card,
                borderColor: captured[point.id] ? T.primary : T.border,
              },
            ]}
          >
            <View style={s.doneHeader}>
              <View
                style={[
                  s.doneIcon,
                  {
                    backgroundColor: captured[point.id]
                      ? T.primary + '22'
                      : T.border,
                  },
                ]}
              >
                <Icon
                  name={
                    captured[point.id] ? 'check-circle' : 'minus-circle-outline'
                  }
                  size={28}
                  color={captured[point.id] ? T.primary : T.muted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.doneTitle, { color: T.white }]}>
                  pH {point.standardPH}{' '}
                  {captured[point.id] ? 'Captured ✅' : 'Skipped'}
                </Text>
                {captured[point.id] && (
                  <Text style={[s.doneVoltage, { color: T.muted }]}>
                    Voltage:{' '}
                    <Text style={{ color: T.primary }}>
                      {captured[point.id].voltage.toFixed(4)} V
                    </Text>
                  </Text>
                )}
              </View>
            </View>

            {Object.keys(captured).length > 0 && (
              <View style={[s.capturedList, { borderColor: T.border }]}>
                <Text style={[s.capturedListTitle, { color: T.muted }]}>
                  Calibration Points Recorded
                </Text>
                {PH_POINTS.filter(p => captured[p.id] !== undefined).map(p => (
                  <View key={p.id} style={s.capturedRow}>
                    <Text style={{ fontSize: 18 }}>
                      {captured[p.id] ? '✅' : '➖'}
                    </Text>
                    <Text style={[s.capturedRowLabel, { color: T.text }]}>
                      pH {p.standardPH}
                    </Text>
                    <Text
                      style={[
                        s.capturedRowVal,
                        { color: captured[p.id] ? T.primary : T.muted },
                      ]}
                    >
                      {captured[p.id]
                        ? `${captured[p.id].voltage.toFixed(4)} V`
                        : 'Skipped'}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={[
                s.btnPrimary,
                { backgroundColor: allPointsDone ? T.primary : point.color },
              ]}
              onPress={handleNext}
              activeOpacity={0.85}
            >
              <Text style={s.btnPrimaryText}>
                {allPointsDone
                  ? fullFlow
                    ? 'Next: EC Calibration →'
                    : 'Save & Finish pH Calibration'
                  : `Next: pH ${PH_POINTS[step + 1]?.standardPH} →`}
              </Text>
              <Icon name="arrow-right" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* Skip all */}
        {!isDone && !isStarting && (
          <TouchableOpacity
            style={s.skipAll}
            onPress={async () => {
              try {
                await sendCommand(CMD.STOP_READING, '', false);
              } catch (_) {}
              if (fullFlow) {
                navigation.replace('ECCalibrationScreen', { fullFlow: true });
              } else {
                navigation.goBack();
              }
            }}
          >
            <Text style={[s.skipAllText, { color: T.muted }]}>
              Skip pH Calibration Entirely
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: Spacing.md, paddingBottom: Spacing.xl },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  stepItem: { alignItems: 'center', flex: 1 },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepNum: { fontSize: 13, fontWeight: '900' },
  stepLabel: { fontSize: 11, fontWeight: '700' },
  stepLine: { flex: 1, height: 2, marginBottom: 20 },
  pointHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  pointTitle: { fontSize: 16, fontWeight: '800' },
  pointSub: { fontSize: 13, marginTop: 2 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  errorText: { flex: 1, fontSize: 12, fontWeight: '600' },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', marginBottom: Spacing.sm },
  cardText: { fontSize: 13, lineHeight: 20, marginBottom: Spacing.md },
  centeredRow: { alignItems: 'center', paddingVertical: Spacing.lg },
  prepSteps: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    gap: 10,
  },
  prepStep: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  prepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prepDotNum: { color: '#fff', fontSize: 11, fontWeight: '900' },
  prepStepText: { fontSize: 13, flex: 1 },
  readCard: {
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: Spacing.md,
  },
  liveDot: { width: 10, height: 10, borderRadius: 5 },
  liveText: { fontSize: 13, fontWeight: '700' },
  readGrid: { flexDirection: 'row', gap: 12, marginBottom: Spacing.sm },
  readBox: {
    flex: 1,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  readLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  readValue: { fontSize: 26, fontWeight: '900', fontFamily: 'Courier' },
  readUnit: { fontSize: 12, marginTop: 2 },
  stabilityBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  stabilityFill: { height: 4, borderRadius: 2 },
  stabilityLabel: {
    fontSize: 12,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  doneCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  doneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: Spacing.md,
  },
  doneIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneTitle: { fontSize: 16, fontWeight: '800' },
  doneVoltage: { fontSize: 13, marginTop: 3 },
  capturedList: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  capturedListTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  capturedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  capturedRowLabel: { flex: 1, fontSize: 14, fontWeight: '700' },
  capturedRowVal: { fontSize: 14, fontWeight: '800', fontFamily: 'Courier' },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: Radius.lg,
    marginTop: Spacing.xs,
  },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  btnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  btnOutlineText: { fontSize: 14, fontWeight: '600' },
  btnCapture: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: Radius.lg,
  },
  btnCaptureText: { fontSize: 15, fontWeight: '800' },
  actionRow: { flexDirection: 'row', gap: 12 },
  skipAll: { alignItems: 'center', paddingVertical: Spacing.md },
  skipAllText: { fontSize: 13, textDecorationLine: 'underline' },
});