// src/screens/phtest/PHCalibrationScreen.jsx
// 3-point pH calibration.
// Sends BLE command → waits for voltage in Redux sensorData → stores to Redux calibration.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Animated,
  ScrollView,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Radius, Spacing } from '../theme';
import { TopBar } from '../components/common';
import useTheme from '../hooks/useTheme';
import {
  savePhPoint,
  persistCalibration,
} from '../redux/actions/calibrationActions';
import { cmdCalibratePhPoint } from '../redux/actions/bleActions';

const PH_POINTS = [
  {
    id: 'ph4',
    label: 'Buffer Solution pH 4',
    standardPH: 4,
    color: '#EF4444',
    icon: 'numeric-4-circle-outline',
    prepMsg:
      'Pour the pH 4 standard buffer into a clean beaker.\nInsert probe fully and wait for reading to stabilise (≈ 30 s).',
  },
  {
    id: 'ph7',
    label: 'Buffer Solution pH 7',
    standardPH: 7,
    color: '#F59E0B',
    icon: 'numeric-7-circle-outline',
    prepMsg:
      'Rinse probe with distilled water and dry gently.\nPour pH 7 buffer and insert probe fully.',
  },
  {
    id: 'ph9',
    label: 'Buffer Solution pH 9',
    standardPH: 9,
    color: '#3B82F6',
    icon: 'numeric-9-circle-outline',
    prepMsg:
      'Rinse probe with distilled water and dry gently.\nPour pH 9 buffer and insert probe fully.',
  },
];

// ─── Stability detection ──────────────────────────────────────────────────────
// Watches Redux sensorData.voltage and declares stable when
// variance < threshold for STABLE_WINDOW consecutive ticks.
const STABLE_WINDOW = 8; // ticks (~4 s at 500 ms)
const STABLE_THRESHOLD = 0.003; // volts

function useVoltageStability(active) {
  const voltage = useSelector(s => s.ble.sensorData.voltage);
  const [stable, setStable] = useState(false);
  const [displayV, setDisplayV] = useState(null);
  const windowRef = useRef([]);

  useEffect(() => {
    if (!active) {
      windowRef.current = [];
      setStable(false);
      setDisplayV(null);
      return;
    }
    if (voltage === null || voltage === undefined) return;

    setDisplayV(voltage);
    const w = windowRef.current;
    w.push(voltage);
    if (w.length > STABLE_WINDOW) w.shift();

    if (w.length === STABLE_WINDOW) {
      const max = Math.max(...w);
      const min = Math.min(...w);
      setStable(max - min < STABLE_THRESHOLD);
    }
  }, [active, voltage]);

  return { voltage: displayV, stable };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function PHCalibrationScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const T = theme.colors;
  const fullFlow = route?.params?.fullFlow ?? false;

  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState('prep'); // 'prep' | 'reading' | 'done'
  const [captured, setCaptured] = useState({});
  const [sending, setSending] = useState(false);

  const point = PH_POINTS[step];
  const isActive = phase === 'reading';
  const { voltage, stable } = useVoltageStability(isActive);

  // Pulse animation for live dot
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (phase !== 'reading') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.5,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [phase]);

  // Start reading: send BLE command to device
  const handleStartReading = useCallback(async () => {
    setSending(true);
    await dispatch(cmdCalibratePhPoint(point.standardPH));
    setSending(false);
    setPhase('reading');
  }, [dispatch, point.standardPH]);

  // Capture current voltage
  const handleCapture = useCallback(() => {
    if (!stable) {
      Alert.alert(
        'Not Stable',
        'Wait for the reading to stabilise before capturing.',
      );
      return;
    }
    if (voltage === null) {
      Alert.alert(
        'No Data',
        'No voltage received from device. Ensure device is connected and probe is submerged.',
      );
      return;
    }
    dispatch(savePhPoint(point.standardPH, voltage));
    setCaptured(prev => ({
      ...prev,
      [point.id]: { voltage, standardPH: point.standardPH },
    }));
    setPhase('done');
  }, [stable, voltage, point, dispatch]);

  const handleSkip = useCallback(() => {
    // Mark as skipped (null voltage)
    dispatch(savePhPoint(point.standardPH, null));
    setCaptured(prev => ({ ...prev, [point.id]: null }));
    handleNext();
  }, [point, dispatch]);

  const handleNext = useCallback(() => {
    if (step < PH_POINTS.length - 1) {
      setStep(s => s + 1);
      setPhase('prep');
    } else {
      // Done — persist to device and navigate
      dispatch(persistCalibration());
      if (fullFlow) {
        navigation.replace('ECCalibrationScreen', { fullFlow: true });
      } else {
        navigation.replace('CalibrationSummaryScreen');
      }
    }
  }, [step, fullFlow, navigation, dispatch]);

  const isDone = phase === 'done';
  const isReading = phase === 'reading';
  const isPrep = phase === 'prep';
  const allDone = step === PH_POINTS.length - 1 && isDone;

  return (
    <SafeAreaView style={[s.container, { backgroundColor: T.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <TopBar
        title="pH Calibration"
        onBack={() => navigation.goBack()}
        theme={theme}
      />

      <ScrollView contentContainerStyle={s.scroll} bounces={false}>
        {/* ── Step Progress ──────────────────────────────────────── */}
        <StepProgress
          points={PH_POINTS}
          step={step}
          captured={captured}
          T={T}
        />

        {/* ── Point header ───────────────────────────────────────── */}
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

        {/* ── PREP ───────────────────────────────────────────────── */}
        {isPrep && (
          <PrepCard
            point={point}
            T={T}
            onStart={handleStartReading}
            sending={sending}
          />
        )}

        {/* ── READING ────────────────────────────────────────────── */}
        {isReading && (
          <ReadingCard
            point={point}
            T={T}
            pulse={pulse}
            voltage={voltage}
            stable={stable}
            standardPH={point.standardPH}
            onCapture={handleCapture}
            onSkip={handleSkip}
          />
        )}

        {/* ── DONE ───────────────────────────────────────────────── */}
        {isDone && (
          <DoneCard
            point={point}
            T={T}
            captured={captured}
            allDone={allDone}
            fullFlow={fullFlow}
            step={step}
            onNext={handleNext}
          />
        )}

        {/* ── Skip entirely ──────────────────────────────────────── */}
        {!isDone && (
          <TouchableOpacity
            style={s.skipAll}
            onPress={() => {
              if (fullFlow)
                navigation.replace('ECCalibrationScreen', { fullFlow: true });
              else navigation.goBack();
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

// ─── Sub-components ───────────────────────────────────────────────────────────
function StepProgress({ points, step, captured, T }) {
  return (
    <View style={s.stepRow}>
      {points.map((p, i) => {
        const done = captured[p.id] !== undefined;
        const active = i === step;
        return (
          <React.Fragment key={p.id}>
            <View style={s.stepItem}>
              <View
                style={[
                  s.stepCircle,
                  {
                    borderColor: done ? T.primary : active ? p.color : T.border,
                    backgroundColor: done
                      ? T.primary
                      : active
                      ? p.color + '22'
                      : 'transparent',
                  },
                ]}
              >
                {done ? (
                  <Icon name="check" size={14} color="#fff" />
                ) : (
                  <Text
                    style={[s.stepNum, { color: active ? p.color : T.muted }]}
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
            {i < points.length - 1 && (
              <View
                style={[
                  s.stepLine,
                  { backgroundColor: captured[p.id] ? T.primary : T.border },
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

function PrepCard({ point, T, onStart, sending }) {
  const steps = [
    'Prepare the standard buffer solution',
    'Clean probe with distilled water',
    'Insert probe fully into solution',
    'Wait for probe to temperature-equalise',
  ];
  return (
    <View style={[s.card, { backgroundColor: T.card, borderColor: T.border }]}>
      <Text style={[s.cardTitle, { color: T.white }]}>
        📋 Preparation Required
      </Text>
      <Text style={[s.cardText, { color: T.text }]}>{point.prepMsg}</Text>
      <View style={[s.prepSteps, { borderColor: T.border }]}>
        {steps.map((t, i) => (
          <View key={i} style={s.prepStep}>
            <View style={[s.prepDot, { backgroundColor: point.color }]}>
              <Text style={s.prepDotNum}>{i + 1}</Text>
            </View>
            <Text style={[s.prepStepText, { color: T.text }]}>{t}</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity
        style={[
          s.btnPrimary,
          { backgroundColor: sending ? T.border : point.color },
        ]}
        onPress={onStart}
        disabled={sending}
        activeOpacity={0.85}
      >
        <Icon name={sending ? 'loading' : 'play'} size={18} color="#fff" />
        <Text style={s.btnPrimaryText}>
          {sending ? 'Sending Command…' : 'Start Reading Voltage'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function ReadingCard({
  point,
  T,
  pulse,
  voltage,
  stable,
  standardPH,
  onCapture,
  onSkip,
}) {
  return (
    <View
      style={[
        s.card,
        {
          backgroundColor: T.card,
          borderColor: point.color + '66',
          borderWidth: 1.5,
        },
      ]}
    >
      <View style={s.liveRow}>
        <Animated.View
          style={[
            s.liveDot,
            {
              backgroundColor: stable ? T.primary : T.warning,
              transform: [{ scale: pulse }],
            },
          ]}
        />
        <Text style={[s.liveText, { color: stable ? T.primary : T.warning }]}>
          {stable ? 'Stable — Ready to Capture' : 'Stabilising…'}
        </Text>
      </View>
      <View style={s.readGrid}>
        <View
          style={[
            s.readBox,
            { borderColor: T.border, backgroundColor: T.cardAlt },
          ]}
        >
          <Text style={[s.readLabel, { color: T.muted }]}>Standard pH</Text>
          <Text style={[s.readValue, { color: T.primary }]}>
            {standardPH.toFixed(2)}
          </Text>
        </View>
        <View
          style={[
            s.readBox,
            {
              borderColor: stable ? T.primary : T.warning,
              backgroundColor: stable ? T.primaryGlow : 'rgba(245,158,11,0.1)',
            },
          ]}
        >
          <Text style={[s.readLabel, { color: T.muted }]}>Live Voltage</Text>
          <Text
            style={[s.readValue, { color: stable ? T.primary : T.warning }]}
          >
            {voltage !== null ? voltage.toFixed(4) : '----'} V
          </Text>
        </View>
      </View>
      <View style={[s.stabilityBar, { backgroundColor: T.border }]}>
        <View
          style={[
            s.stabilityFill,
            {
              backgroundColor: stable ? T.primary : T.warning,
              width: stable ? '100%' : '55%',
            },
          ]}
        />
      </View>
      <Text style={[s.stabilityLabel, { color: T.muted }]}>
        {voltage === null
          ? '⏳ Waiting for device data…'
          : stable
          ? '✅ Signal stable'
          : '⏳ Stabilising…'}
      </Text>
      <View style={s.actionRow}>
        <TouchableOpacity
          style={[s.btnOutline, { borderColor: T.border, flex: 1 }]}
          onPress={onSkip}
        >
          <Text style={[s.btnOutlineText, { color: T.muted }]}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            s.btnCapture,
            {
              backgroundColor: stable ? point.color : T.border,
              flex: 2,
            },
          ]}
          onPress={onCapture}
          disabled={!stable}
          activeOpacity={0.85}
        >
          <Icon
            name="check-circle"
            size={18}
            color={stable ? '#fff' : T.muted}
          />
          <Text
            style={[s.btnCaptureText, { color: stable ? '#fff' : T.muted }]}
          >
            Capture Reading
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function DoneCard({ point, T, captured, allDone, fullFlow, step, onNext }) {
  const got = captured[point.id];
  return (
    <View
      style={[
        s.card,
        { backgroundColor: T.card, borderColor: got ? T.primary : T.border },
      ]}
    >
      <View style={s.doneHeader}>
        <View
          style={[
            s.doneIcon,
            { backgroundColor: got ? T.primary + '22' : T.border },
          ]}
        >
          <Icon
            name={got ? 'check-circle' : 'minus-circle-outline'}
            size={28}
            color={got ? T.primary : T.muted}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.cardTitle, { color: T.white }]}>
            pH {point.standardPH} {got ? 'Captured' : 'Skipped'}
          </Text>
          {got && (
            <Text style={[s.cardText, { color: T.muted, marginBottom: 0 }]}>
              Voltage:{' '}
              <Text style={{ color: T.primary }}>
                {got.voltage?.toFixed(4)} V
              </Text>
            </Text>
          )}
        </View>
      </View>

      {/* Captured so far */}
      <View style={[s.capturedList, { borderColor: T.border }]}>
        <Text style={[s.capturedListTitle, { color: T.muted }]}>
          Points Recorded
        </Text>
        {PH_POINTS.filter(p => captured[p.id] !== undefined).map(p => (
          <View key={p.id} style={s.capturedRow}>
            <Text style={{ fontSize: 16 }}>{captured[p.id] ? '✅' : '➖'}</Text>
            <Text style={[s.capturedRowLabel, { color: T.text }]}>
              pH {p.standardPH}
            </Text>
            <Text
              style={[
                s.capturedRowVal,
                {
                  color: captured[p.id] ? T.primary : T.muted,
                  fontFamily: 'Courier',
                },
              ]}
            >
              {captured[p.id]
                ? `${captured[p.id].voltage?.toFixed(4)} V`
                : 'Skipped'}
            </Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[
          s.btnPrimary,
          { backgroundColor: allDone ? T.primary : point.color },
        ]}
        onPress={onNext}
        activeOpacity={0.85}
      >
        <Text style={s.btnPrimaryText}>
          {allDone
            ? fullFlow
              ? 'Next: EC Calibration →'
              : 'Save & Finish pH Cal'
            : `Next: pH ${PH_POINTS[step + 1]?.standardPH} →`}
        </Text>
        <Icon name="arrow-right" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
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
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', marginBottom: Spacing.sm },
  cardText: { fontSize: 13, lineHeight: 20, marginBottom: Spacing.md },
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
  actionRow: { flexDirection: 'row', gap: 12 },
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
  capturedRowVal: { fontSize: 14, fontWeight: '800' },
  skipAll: { alignItems: 'center', paddingVertical: Spacing.md },
  skipAllText: { fontSize: 13, textDecorationLine: 'underline' },
});
