// src/screens/phtest/PHCalibrationScreen.js
// 3-point pH calibration: pH 4 → pH 7 → pH 9
// Reads live voltage from hardware BLE/USB device

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
import { Radius, Spacing, Typography } from '../theme';

import { TopBar } from '../components/common';
import useTheme from '../hooks/useTheme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
// import { readDeviceVoltage, saveCalibrationToDevice } from '../../utils/hardware';

// ─── Constants ─────────────────────────────────────────────────────────────────
const PH_POINTS = [
  {
    id: 'ph4',
    label: 'Buffer Solution pH 4',
    standardPH: 4,
    color: '#EF4444', // red
    icon: 'numeric-4-circle-outline',
    prepMsg:
      'Pour the pH 4 standard buffer solution into a clean beaker.\nInsert the probe tip fully into the solution and wait for the reading to stabilise (≈ 30 sec).',
  },
  {
    id: 'ph7',
    label: 'Buffer Solution pH 7',
    standardPH: 7,
    color: '#F59E0B', // amber
    icon: 'numeric-7-circle-outline',
    prepMsg:
      'Rinse the probe with distilled water and dry gently.\nPour the pH 7 standard buffer solution and insert the probe fully.',
  },
  {
    id: 'ph9',
    label: 'Buffer Solution pH 9',
    standardPH: 9,
    color: '#3B82F6', // blue
    icon: 'numeric-9-circle-outline',
    prepMsg:
      'Rinse the probe with distilled water and dry gently.\nPour the pH 9 standard buffer solution and insert the probe fully.',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
/** Simulate live voltage from hardware — replace with real BLE/serial read */
function useLiveVoltage(active) {
  const [voltage, setVoltage] = useState(0.0);
  const [stable, setStable] = useState(false);
  const interval = useRef(null);

  useEffect(() => {
    if (!active) {
      setVoltage(0.0);
      setStable(false);
      if (interval.current) clearInterval(interval.current);
      return;
    }

    let ticks = 0;
    interval.current = setInterval(() => {
      ticks++;
      // Simulate voltage converging to a stable value
      const noise = (Math.random() - 0.5) * 0.003;
      const target = 0.18 + active * 0.06; // mock: varies per point index
      const cur = target + noise * Math.max(0, 1 - ticks / 20);
      setVoltage(parseFloat(cur.toFixed(4)));
      if (ticks >= 20) setStable(true);
    }, 500);

    return () => clearInterval(interval.current);
  }, [active]);

  return { voltage, stable };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function PHCalibrationScreen({ navigation, route }) {
  const theme = useTheme();
  const fullFlow = route?.params?.fullFlow ?? false;
  const T = theme.colors;
  const [step, setStep] = useState(0); // 0, 1, 2
  const [phase, setPhase] = useState('prep'); // 'prep' | 'reading' | 'done'
  const [captured, setCaptured] = useState({}); // { ph4: {voltage, livePhEst}, ... }

  const point = PH_POINTS[step];
  const { voltage, stable } = useLiveVoltage(
    phase === 'reading' ? step + 1 : 0,
  );

  // pulse animation for live dot
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (phase !== 'reading') return;
    const anim = Animated.loop(
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
    anim.start();
    return () => anim.stop();
  }, [phase]);

  // Capture voltage for current point
  const handleCapture = useCallback(() => {
    if (!stable) {
      Alert.alert(
        'Not Stable',
        'Wait for the reading to stabilise before capturing.',
      );
      return;
    }
    const livePhEst = point.standardPH; // trust standard; voltage is what we store
    setCaptured(prev => ({ ...prev, [point.id]: { voltage, livePhEst } }));
    setPhase('done');
  }, [stable, voltage, point]);

  // Move to next point or finish
  const handleNext = useCallback(() => {
    if (step < PH_POINTS.length - 1) {
      setStep(s => s + 1);
      setPhase('prep');
    } else {
      // All 3 points done → save & navigate
      const calData = {
        type: 'ph',
        timestamp: Date.now(),
        points: PH_POINTS.map(p => ({
          standardPH: p.standardPH,
          voltage: captured[p.id]?.voltage ?? null,
        })),
      };
      // saveCalibrationToDevice(calData);  ← real HW call
      console.log(
        '[CAL] Saved pH calibration:',
        JSON.stringify(calData, null, 2),
      );

      if (fullFlow) {
        navigation.replace('ECCalibrationScreen', {
          fullFlow: true,
          phCalData: calData,
        });
      } else {
        navigation.replace('CalibrationSummaryScreen', { phCalData: calData });
      }
    }
  }, [step, captured, fullFlow, navigation]);

  const handleSkip = useCallback(() => {
    // Mark point as skipped with null voltage
    setCaptured(prev => ({ ...prev, [point.id]: null }));
    handleNext();
  }, [point.id, handleNext]);

  const isDone = phase === 'done';
  const isReading = phase === 'reading';
  const isPrep = phase === 'prep';
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
        {/* ── Step Progress ─────────────────────────────────────────────── */}
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

        {/* ── Active Point Header ───────────────────────────────────────── */}
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

        {/* ── PHASE: PREP ───────────────────────────────────────────────── */}
        {isPrep && (
          <View
            style={[
              s.prepCard,
              { backgroundColor: T.card, borderColor: T.border },
            ]}
          >
            <Text style={[s.prepTitle, { color: T.white }]}>
              📋 Preparation Required
            </Text>
            <Text style={[s.prepText, { color: T.text }]}>{point.prepMsg}</Text>

            <View style={[s.prepSteps, { borderColor: T.border }]}>
              {[
                'Prepare the standard buffer solution',
                'Clean probe with distilled water',
                'Insert probe fully into solution',
                'Wait for probe to temperature-equilise',
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
              onPress={() => setPhase('reading')}
              activeOpacity={0.85}
            >
              <Icon name="play" size={18} color="#fff" />
              <Text style={s.btnPrimaryText}>Start Reading Voltage</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── PHASE: READING ────────────────────────────────────────────── */}
        {isReading && (
          <View
            style={[
              s.readCard,
              { backgroundColor: T.card, borderColor: point.color + '66' },
            ]}
          >
            {/* Live indicator */}
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
              <Text
                style={[s.liveText, { color: stable ? T.primary : T.warning }]}
              >
                {stable ? 'Stable — Ready to Capture' : 'Reading…'}
              </Text>
            </View>

            {/* Readings grid */}
            <View style={s.readGrid}>
              <View
                style={[
                  s.readBox,
                  { borderColor: T.border, backgroundColor: T.cardAlt },
                ]}
              >
                <Text style={[s.readLabel, { color: T.muted }]}>Live pH</Text>
                <Text style={[s.readValue, { color: T.primary }]}>
                  {point.standardPH.toFixed(2)}
                </Text>
              </View>
              <View
                style={[
                  s.readBox,
                  {
                    borderColor: stable ? T.primary : T.warning,
                    backgroundColor: stable
                      ? T.primaryGlow
                      : 'rgba(245,158,11,0.1)',
                  },
                ]}
              >
                <Text style={[s.readLabel, { color: T.muted }]}>Voltage</Text>
                <Text
                  style={[
                    s.readValue,
                    { color: stable ? T.primary : T.warning },
                  ]}
                >
                  {voltage.toFixed(4)} V
                </Text>
              </View>
            </View>

            {/* Stability bar */}
            <View style={[s.stabilityBar, { backgroundColor: T.border }]}>
              <Animated.View
                style={[
                  s.stabilityFill,
                  {
                    backgroundColor: stable ? T.primary : T.warning,
                    width: stable ? '100%' : '60%',
                  },
                ]}
              />
            </View>
            <Text style={[s.stabilityLabel, { color: T.muted }]}>
              {stable
                ? '✅ Signal stable'
                : '⏳ Waiting for signal to stabilise…'}
            </Text>

            <View style={s.actionRow}>
              <TouchableOpacity
                style={[s.btnOutline, { borderColor: T.border, flex: 1 }]}
                onPress={handleSkip}
                activeOpacity={0.7}
              >
                <Text style={[s.btnOutlineText, { color: T.muted }]}>Skip</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  s.btnCapture,
                  { backgroundColor: stable ? T.primary : T.border, flex: 2 },
                ]}
                onPress={handleCapture}
                disabled={!stable}
                activeOpacity={0.85}
              >
                <Icon
                  name="check-circle"
                  size={18}
                  color={stable ? '#fff' : T.muted}
                />
                <Text
                  style={[
                    s.btnCaptureText,
                    { color: stable ? '#fff' : T.muted },
                  ]}
                >
                  Capture Reading
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── PHASE: DONE ───────────────────────────────────────────────── */}
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
                  {captured[point.id] ? 'Captured' : 'Skipped'}
                </Text>
                {captured[point.id] && (
                  <Text style={[s.doneVoltage, { color: T.muted }]}>
                    Voltage:{' '}
                    <Text style={{ color: T.primary }}>
                      {captured[point.id]?.voltage?.toFixed(4)} V
                    </Text>
                  </Text>
                )}
              </View>
            </View>

            {/* All previous captured */}
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
        {!isDone && (
          <TouchableOpacity
            style={s.skipAll}
            onPress={() => {
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

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: Spacing.md, paddingBottom: Spacing.xl },

  // Steps
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  stepItem: { alignItems: 'center', flex: 1 },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: Radius.lg,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepNum: { fontSize: 13, fontWeight: '900' },
  stepLabel: { fontSize: 11, fontWeight: '700' },
  stepLine: { flex: 1, height: 2, marginBottom: 20 },

  // Point header
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

  // Prep
  prepCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  prepTitle: { fontSize: 15, fontWeight: '800', marginBottom: Spacing.sm },
  prepText: { fontSize: 13, lineHeight: 20, marginBottom: Spacing.md },
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

  // Reading
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

  // Done
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

  // Buttons
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
