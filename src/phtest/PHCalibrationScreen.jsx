// src/screens/phtest/PHCalibrationScreen.jsx
// 3-point pH calibration.
// • Mocks voltage oscillation until real BLE data arrives
// • Once real value arrives → locks it, stops mock
// • Auto-captures on lock (no user action needed)
// • Reconnects device if disconnected mid-flow
// • Skip pH → prompts user to do EC or skip everything (fullFlow)

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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Radius, Spacing } from '../theme';
import { TopBar } from '../components/common';
import useTheme from '../hooks/useTheme';
import {
  savePhPoint,
  persistCalibration,
} from '../redux/actions/calibrationActions';
import { cmdCalibratePhPoint, startScan } from '../redux/actions/bleActions';

// ─── pH buffer points ─────────────────────────────────────────────────────────
const PH_POINTS = [
  {
    id: 'ph4',
    label: 'Buffer Solution pH 4',
    standardPH: 4,
    color: '#EF4444',
    icon: 'numeric-4-circle-outline',
    mockBase: 0.42,
    prepMsg:
      'Pour the pH 4 standard buffer into a clean beaker.\nInsert probe fully and wait for reading to stabilise (≈ 30 s).',
  },
  {
    id: 'ph7',
    label: 'Buffer Solution pH 7',
    standardPH: 7,
    color: '#F59E0B',
    icon: 'numeric-7-circle-outline',
    mockBase: 0.58,
    prepMsg:
      'Rinse probe with distilled water and dry gently.\nPour pH 7 buffer and insert probe fully.',
  },
  {
    id: 'ph9',
    label: 'Buffer Solution pH 9',
    standardPH: 9,
    color: '#3B82F6',
    icon: 'numeric-9-circle-outline',
    mockBase: 0.72,
    prepMsg:
      'Rinse probe with distilled water and dry gently.\nPour pH 9 buffer and insert probe fully.',
  },
];

// ─── useMockLockVoltage ───────────────────────────────────────────────────────
function useMockLockVoltage(active, mockBase, standardPH) {
  const realVoltage = useSelector(
    s => s?.ble?.calibrationPoints?.PH?.[standardPH] ?? null,
  );

  const [displayV, setDisplayV] = useState(null);
  const [isMocking, setIsMocking] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [stable, setStable] = useState(false);

  const mockTimerRef = useRef(null);
  const lockedRef = useRef(false);

  useEffect(() => {
    if (!active) {
      clearInterval(mockTimerRef.current);
      setDisplayV(null);
      setIsMocking(true);
      setIsLocked(false);
      setStable(false);
      lockedRef.current = false;
      return;
    }

    lockedRef.current = false;
    setIsMocking(true);
    setIsLocked(false);
    setStable(false);

    let tick = 0;
    mockTimerRef.current = setInterval(() => {
      tick++;
      const noise =
        Math.max(0.003, 0.025 - tick * 0.001) * (Math.random() - 0.5) * 2;
      setDisplayV(mockBase + noise);
    }, 300);

    return () => clearInterval(mockTimerRef.current);
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!active) return;
    if (realVoltage === null || realVoltage === undefined) return;
    if (lockedRef.current) return;

    lockedRef.current = true;
    clearInterval(mockTimerRef.current);
    setIsMocking(false);
    setIsLocked(true);
    setDisplayV(realVoltage);
    setStable(true);
  }, [realVoltage, active]);

  return { voltage: displayV, isMocking, isLocked, stable };
}

// ─── Step Progress ────────────────────────────────────────────────────────────
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
                style={[s.stepLabel, { color: active ? T.primary : T.muted }]}
              >
                pH {p.standardPH}
              </Text>
            </View>
            {i < points.length - 1 && (
              <View
                style={[
                  s.stepLine,
                  { backgroundColor: done ? T.primary : T.border },
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

// ─── Reconnect Modal ──────────────────────────────────────────────────────────
function ReconnectModal({ visible, onReconnect, T }) {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={rm.overlay}>
        <View
          style={[
            rm.sheet,
            { backgroundColor: T.card, borderColor: '#EF4444' },
          ]}
        >
          <View style={[rm.iconRing, { backgroundColor: '#EF444422' }]}>
            <Icon name="bluetooth-off" size={36} color="#EF4444" />
          </View>
          <Text style={[rm.title, { color: T.white }]}>
            Device Disconnected
          </Text>
          <Text style={[rm.body, { color: T.text }]}>
            The BLE device disconnected during calibration.{'\n'}
            Reconnecting will resume from the current step.
          </Text>
          <TouchableOpacity
            style={[rm.btn, { backgroundColor: T.primary }]}
            onPress={onReconnect}
          >
            <Icon name="bluetooth-connect" size={18} color="#fff" />
            <Text style={rm.btnText}>Reconnect Device</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Skip pH Alert ─────────────────────────────────────────────────────────────
// Shows when user taps "Skip pH Calibration Entirely"
// fullFlow  → ask whether to go to EC or skip everything
// standalone → go straight to summary
function showSkipPhAlert({ fullFlow, navigation }) {
  if (!fullFlow) {
    navigation.replace('CalibrationSummaryScreen');
    return;
  }

  Alert.alert(
    'Skip pH Calibration?',
    'pH calibration will not be saved.\nWould you like to continue with EC Calibration instead?',
    [
      {
        text: 'Do EC Calibration',
        onPress: () =>
          navigation.replace('ECCalibrationScreen', { fullFlow: true }),
      },
      {
        text: 'Skip Everything',
        style: 'destructive',
        onPress: () => navigation.replace('CalibrationSummaryScreen'),
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ],
  );
}

// ─── Prep Card ────────────────────────────────────────────────────────────────
function PrepCard({ point, T, onStart, sending }) {
  const steps = point.prepMsg.split('\n');
  return (
    <View style={[s.card, { backgroundColor: T.card, borderColor: T.border }]}>
      <Text style={[s.cardTitle, { color: T.white }]}>
        📋 Preparation Required
      </Text>
      <View style={[s.prepSteps, { borderColor: T.border }]}>
        {steps.map((step, i) => (
          <View key={i} style={s.prepStep}>
            <View style={[s.prepDot, { backgroundColor: point.color }]}>
              <Text style={s.prepDotNum}>{i + 1}</Text>
            </View>
            <Text style={[s.prepStepText, { color: T.text }]}>{step}</Text>
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
        {sending ? (
          <Icon name="loading" size={18} color="#fff" />
        ) : (
          <Icon name="play-circle" size={18} color="#fff" />
        )}
        <Text style={s.btnPrimaryText}>
          {sending ? 'Sending command…' : 'Start Reading'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Reading Card ─────────────────────────────────────────────────────────────
function ReadingCard({
  point,
  T,
  pulse,
  voltage,
  isMocking,
  isLocked,
  stable,
  onCapture,
  onSkip,
}) {
  const pct = stable ? 100 : isMocking ? 45 : 70;

  return (
    <View
      style={[
        s.card,
        { backgroundColor: T.card, borderColor: point.color + '55' },
      ]}
    >
      {/* Live indicator */}
      <View style={s.liveRow}>
        <Animated.View
          style={[
            s.liveDot,
            { backgroundColor: point.color, transform: [{ scale: pulse }] },
          ]}
        />
        {isMocking && (
          <View
            style={[
              s.mockBadge,
              { backgroundColor: '#F59E0B22', borderColor: '#F59E0B' },
            ]}
          >
            <Text style={{ fontSize: 9, fontWeight: '800', color: '#F59E0B' }}>
              Reading...
            </Text>
          </View>
        )}
        {isLocked && (
          <View
            style={[
              s.mockBadge,
              { backgroundColor: T.primaryGlow, borderColor: T.primary },
            ]}
          >
            <Text style={{ fontSize: 9, fontWeight: '800', color: T.primary }}>
              REAL
            </Text>
          </View>
        )}
      </View>

      {/* Big voltage display */}
      <View style={s.readGrid}>
        <View
          style={[
            s.readBox,
            {
              borderColor: point.color + '66',
              backgroundColor: point.color + '11',
            },
          ]}
        >
          <Text style={[s.readLabel, { color: T.muted }]}>VOLTAGE</Text>
          <Text style={[s.readValue, { color: point.color }]}>
            {voltage !== null ? voltage.toFixed(4) : '–.––––'}
          </Text>
          <Text style={[s.readUnit, { color: T.muted }]}>V</Text>
        </View>
        <View style={[s.readBox, { borderColor: T.border }]}>
          <Text style={[s.readLabel, { color: T.muted }]}>TARGET pH</Text>
          <Text style={[s.readValue, { color: T.primary, fontSize: 32 }]}>
            {point.standardPH}
          </Text>
          <Text style={[s.readUnit, { color: T.muted }]}>buffer</Text>
        </View>
      </View>

      {/* Stability bar */}
      <View style={[s.stabilityBar, { backgroundColor: T.border }]}>
        <View
          style={[
            s.stabilityFill,
            {
              width: `${pct}%`,
              backgroundColor: stable ? T.primary : '#F59E0B',
            },
          ]}
        />
      </View>

      {/* Actions */}
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
            { backgroundColor: stable ? point.color : T.border, flex: 2 },
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

// ─── Done Card ────────────────────────────────────────────────────────────────
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
            pH {point.standardPH} {got ? 'Captured ✅' : 'Skipped'}
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

      {/* Points summary */}
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
            : `Next: pH ${PH_POINTS[step + 1]?.standardPH} `}
        </Text>
        <Icon name="arrow-right" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PHCalibrationScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const T = theme.colors;
  const fullFlow = route?.params?.fullFlow ?? false;

  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState('prep'); // 'prep' | 'reading' | 'done'
  const [captured, setCaptured] = useState({});
  const [sending, setSending] = useState(false);
  const [showReconnect, setShowReconnect] = useState(false);

  const { connected } = useSelector(s => s.ble);
  const wasConnected = useRef(connected);

  const point = PH_POINTS[step];
  const isActive = phase === 'reading';

  const { voltage, isMocking, isLocked, stable } = useMockLockVoltage(
    isActive,
    point.mockBase,
    point.standardPH,
  );

  // Pulse animation
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

  // Disconnection detection
  useEffect(() => {
    if (wasConnected.current && !connected && phase === 'reading') {
      setShowReconnect(true);
    }
    wasConnected.current = connected;
  }, [connected, phase]);

  // Auto dismiss reconnect modal once reconnected
  useEffect(() => {
    if (connected && showReconnect) setShowReconnect(false);
  }, [connected]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStartReading = useCallback(async () => {
    if (!connected) {
      Alert.alert('Not Connected', 'Connect to the device first.');
      return;
    }
    setSending(true);
    await dispatch(cmdCalibratePhPoint(point.standardPH));
    setSending(false);
    setPhase('reading');
  }, [dispatch, point.standardPH, connected]);

  // Auto-capture the moment the real value locks in from firmware
  useEffect(() => {
    if (isLocked && phase === 'reading' && voltage !== null) {
      dispatch(savePhPoint(point.standardPH, voltage));
      setCaptured(prev => ({
        ...prev,
        [point.id]: { voltage, standardPH: point.standardPH },
      }));
      setPhase('done');
    }
  }, [isLocked]); // eslint-disable-line react-hooks/exhaustive-deps

  // Manual capture (fallback if user presses button before auto-capture)
  const handleCapture = useCallback(() => {
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
  }, [voltage, point, dispatch]);

  const handleSkip = useCallback(() => {
    dispatch(savePhPoint(point.standardPH, null));
    setCaptured(prev => ({ ...prev, [point.id]: null }));
    handleNext();
  }, [point, dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNext = useCallback(() => {
    if (step < PH_POINTS.length - 1) {
      setStep(s => s + 1);
      setPhase('prep');
    } else {
      dispatch(persistCalibration());
      if (fullFlow) {
        navigation.replace('ECCalibrationScreen', { fullFlow: true });
      } else {
        navigation.replace('CalibrationSummaryScreen');
      }
    }
  }, [step, fullFlow, navigation, dispatch]);

  const handleReconnect = useCallback(() => {
    dispatch(startScan());
    navigation.navigate('BLEScanScreen');
  }, [dispatch, navigation]);

  // ── Skip pH Entirely ───────────────────────────────────────────────────────
  // fullFlow  → ask user: do EC or skip everything?
  // standalone → go straight to summary
  const handleSkipAll = useCallback(() => {
    if (!fullFlow) {
      navigation.replace('CalibrationSummaryScreen');
      return;
    }

    Alert.alert(
      'Skip pH Calibration?',
      'pH calibration will not be saved.\nWould you like to continue with EC Calibration instead?',
      [
        {
          text: 'Do EC Calibration',
          onPress: () =>
            navigation.replace('ECCalibrationScreen', { fullFlow: true }),
        },
        {
          text: 'Skip Everything',
          style: 'destructive',
          onPress: () => navigation.replace('CalibrationSummaryScreen'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
    );
  }, [fullFlow, navigation]);

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

      <ReconnectModal
        visible={showReconnect}
        onReconnect={handleReconnect}
        T={T}
      />

      {!connected && phase !== 'prep' && (
        <View
          style={[
            s.disconnectBanner,
            { backgroundColor: '#EF444422', borderColor: '#EF4444' },
          ]}
        >
          <Icon name="bluetooth-off" size={14} color="#EF4444" />
          <Text
            style={{
              color: '#EF4444',
              fontSize: 12,
              fontWeight: '700',
              flex: 1,
            }}
          >
            Device disconnected — calibration paused
          </Text>
          <TouchableOpacity onPress={handleReconnect}>
            <Text
              style={{
                color: '#EF4444',
                fontSize: 12,
                fontWeight: '800',
                textDecorationLine: 'underline',
              }}
            >
              Reconnect
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={s.scroll} bounces={false}>
        <StepProgress
          points={PH_POINTS}
          step={step}
          captured={captured}
          T={T}
        />

        {/* Point header */}
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
          <View
            style={[
              s.connDot,
              { backgroundColor: connected ? T.primary : '#EF4444' },
            ]}
          />
        </View>

        {isPrep && (
          <PrepCard
            point={point}
            T={T}
            onStart={handleStartReading}
            sending={sending}
          />
        )}

        {isReading && (
          <ReadingCard
            point={point}
            T={T}
            pulse={pulse}
            voltage={voltage}
            isMocking={isMocking}
            isLocked={isLocked}
            stable={stable}
            onCapture={handleCapture}
            onSkip={handleSkip}
          />
        )}

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

        {/* Skip pH Calibration Entirely — hidden on final done screen */}
        {!isDone && (
          <TouchableOpacity style={s.skipAll} onPress={handleSkipAll}>
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
  disconnectBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: Spacing.md,
    marginTop: 6,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 10,
  },
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
  connDot: { width: 10, height: 10, borderRadius: 5 },
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
  mockBadge: {
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
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
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  stabilityFill: { height: 6, borderRadius: 3 },
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

const rm = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  sheet: {
    borderRadius: Radius.xl,
    borderWidth: 2,
    padding: Spacing.lg,
    width: '100%',
    alignItems: 'center',
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: { fontSize: 20, fontWeight: '900', marginBottom: Spacing.sm },
  body: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    height: 52,
    borderRadius: Radius.lg,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});