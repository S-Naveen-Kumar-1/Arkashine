// src/screens/phtest/ECCalibrationScreen.jsx
// 3-point EC calibration.
// • Mocks voltage oscillation until real BLE data arrives
// • Once real value arrives → locks it, stops mock, runs stability check
// • Handles device disconnection mid-flow

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
  saveEcPoint,
  persistCalibration,
} from '../redux/actions/calibrationActions';
import { cmdCalibrateEcPoint, startScan } from '../redux/actions/bleActions';

// ─── EC points ────────────────────────────────────────────────────────────────
const EC_POINTS = [
  {
    id: 'ec0',
    label: 'EC 0.0 dS/m (Distilled Water)',
    standardEC: 0.0,
    color: '#3B82F6',
    icon: 'water-outline',
    mockBase: 0.12, // low voltage for near-zero conductivity
    prepMsg:
      'Fill a clean beaker with pure distilled (deionised) water.\nInsert the EC probe fully and wait for reading to stabilise.',
  },
  {
    id: 'ec1413',
    label: 'EC 1.413 dS/m Standard',
    standardEC: 1.413,
    color: '#8B5CF6',
    icon: 'flask-outline',
    mockBase: 0.54, // mid voltage
    prepMsg:
      'Rinse probe with distilled water and dry gently.\nPour 1.413 dS/m EC standard and insert probe fully.',
  },
  {
    id: 'ec1288',
    label: 'EC 12.88 dS/m Standard',
    standardEC: 12.88,
    color: '#F97316',
    icon: 'flask',
    mockBase: 0.91, // high voltage for high conductivity
    prepMsg:
      'Rinse probe with distilled water and dry gently.\nPour 12.88 dS/m EC standard and insert probe fully.',
  },
];

// ─── Mock + lock voltage hook ──────────────────────────────────────────────────
// Phase 1 (isMocking=true):  fake oscillation while waiting for device reply.
// Phase 2 (isLocked=true):   firmware returned ECVoltage → lock it, stable=true,
//                            auto-capture triggers immediately in the parent.

function useMockLockVoltage(active, mockBase) {
  // EC calibration tracks ECVoltage, not pHVoltage
  const realVoltage = useSelector(s => s.ble.sensorData.ecVoltage);
  const realCount = useSelector(s => s.ble.sensorData.receivedCount);

  const [displayV, setDisplayV] = useState(null);
  const [isMocking, setIsMocking] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [stable, setStable] = useState(false);

  const mockTimer = useRef(null);
  const prevCount = useRef(realCount);

  // ── Reset / start mock ────────────────────────────────────────────
  useEffect(() => {
    if (!active) {
      clearInterval(mockTimer.current);
      setDisplayV(null);
      setIsMocking(true);
      setIsLocked(false);
      setStable(false);
      prevCount.current = realCount;
      return;
    }

    setIsMocking(true);
    setIsLocked(false);
    setStable(false);

    let tick = 0;
    mockTimer.current = setInterval(() => {
      tick++;
      const noise =
        Math.max(0.003, 0.025 - tick * 0.001) * (Math.random() - 0.5) * 2;
      setDisplayV(mockBase + noise);
    }, 300);

    return () => clearInterval(mockTimer.current);
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Real BLE ECVoltage arrived → lock immediately ─────────────────
  useEffect(() => {
    if (!active || realVoltage === null || realVoltage === undefined) return;
    if (realCount === prevCount.current) return;
    prevCount.current = realCount;

    clearInterval(mockTimer.current);
    setIsMocking(false);
    setIsLocked(true);
    setDisplayV(realVoltage);
    setStable(true); // ← firmware confirmed; no window needed
  }, [realVoltage, realCount, active]);

  return { voltage: displayV, isMocking, isLocked, stable };
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
            The BLE device disconnected during EC calibration.{'\n'}
            Reconnect to resume from the current step.
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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ECCalibrationScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const T = theme.colors;
  const fullFlow = route?.params?.fullFlow ?? false;

  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState('prep');
  const [captured, setCaptured] = useState({});
  const [sending, setSending] = useState(false);
  const [showReconnect, setShowReconnect] = useState(false);

  const { connected } = useSelector(s => s.ble);
  const wasConnected = useRef(connected);

  const point = EC_POINTS[step];
  const isActive = phase === 'reading';

  const { voltage, isMocking, isLocked, stable } = useMockLockVoltage(
    isActive,
    point.mockBase,
  );

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

  useEffect(() => {
    if (connected && showReconnect) setShowReconnect(false);
  }, [connected]);

  const handleStartReading = useCallback(async () => {
    if (!connected) {
      Alert.alert('Not Connected', 'Connect to the device first.');
      return;
    }
    setSending(true);
    await dispatch(cmdCalibrateEcPoint(point.standardEC));
    setSending(false);
    setPhase('reading');
  }, [dispatch, point.standardEC, connected]);

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
        'No voltage received. Ensure device is connected and probe is submerged.',
      );
      return;
    }
    dispatch(saveEcPoint(point.standardEC, voltage));
    setCaptured(prev => ({
      ...prev,
      [point.id]: { voltage, standardEC: point.standardEC },
    }));
    setPhase('done');
  }, [stable, voltage, point, dispatch]);

  const handleSkip = useCallback(() => {
    dispatch(saveEcPoint(point.standardEC, null));
    setCaptured(prev => ({ ...prev, [point.id]: null }));
    handleNext();
  }, [point, dispatch]);

  const handleNext = useCallback(() => {
    if (step < EC_POINTS.length - 1) {
      setStep(s => s + 1);
      setPhase('prep');
    } else {
      dispatch(persistCalibration());
      navigation.replace('CalibrationSummaryScreen');
    }
  }, [step, navigation, dispatch]);

  const handleReconnect = useCallback(() => {
    dispatch(startScan());
    navigation.navigate('BLEScanScreen');
  }, [dispatch, navigation]);

  const isDone = phase === 'done';
  const isReading = phase === 'reading';
  const isPrep = phase === 'prep';
  const allDone = step === EC_POINTS.length - 1 && isDone;

  return (
    <SafeAreaView style={[s.container, { backgroundColor: T.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <TopBar
        title="EC Calibration"
        onBack={() => navigation.goBack()}
        theme={theme}
      />

      <ReconnectModal
        visible={showReconnect}
        onReconnect={handleReconnect}
        T={T}
      />

      {/* Disconnection banner */}
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
        {/* Step Progress */}
        <View style={s.stepRow}>
          {EC_POINTS.map((p, i) => {
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
                      <Icon
                        name={p.icon}
                        size={14}
                        color={active ? p.color : T.muted}
                      />
                    )}
                  </View>
                  <Text
                    style={[s.stepLabel, { color: active ? T.white : T.muted }]}
                  >
                    {p.standardEC} dS/m
                  </Text>
                </View>
                {i < EC_POINTS.length - 1 && (
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
              Standard EC: {point.standardEC} dS/m
            </Text>
          </View>
          <View
            style={[
              s.connDot,
              { backgroundColor: connected ? T.primary : '#EF4444' },
            ]}
          />
        </View>

        {/* PREP */}
        {isPrep && (
          <View
            style={[s.card, { backgroundColor: T.card, borderColor: T.border }]}
          >
            <Text style={[s.cardTitle, { color: T.white }]}>
              📋 Preparation Required
            </Text>
            <View style={[s.prepSteps, { borderColor: T.border }]}>
              {point.prepMsg.split('\n').map((step, i) => (
                <View key={i} style={s.prepStep}>
                  <View style={[s.prepDot, { backgroundColor: point.color }]}>
                    <Text style={s.prepDotNum}>{i + 1}</Text>
                  </View>
                  <Text style={[s.prepStepText, { color: T.text }]}>
                    {step}
                  </Text>
                </View>
              ))}
            </View>
            <TouchableOpacity
              style={[
                s.btnPrimary,
                { backgroundColor: sending ? T.border : point.color },
              ]}
              onPress={handleStartReading}
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
        )}

        {/* READING */}
        {isReading && (
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
                  {
                    backgroundColor: point.color,
                    transform: [{ scale: pulse }],
                  },
                ]}
              />
              {/* <Text style={[s.liveText, { color: T.text }]}>
                {isMocking
                  ? '🔄 Mock data — waiting for device…'
                  : isLocked
                  ? '🔗 Live BLE data'
                  : 'Receiving…'}
              </Text> */}
              {isMocking && (
                <View
                  style={[
                    s.mockBadge,
                    { backgroundColor: '#F59E0B22', borderColor: '#F59E0B' },
                  ]}
                >
                  <Text
                    style={{ fontSize: 9, fontWeight: '800', color: '#F59E0B' }}
                  >
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
                  <Text
                    style={{ fontSize: 9, fontWeight: '800', color: T.primary }}
                  >
                    REAL
                  </Text>
                </View>
              )}
            </View>

            {/* Readings */}
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
                <Text style={[s.readLabel, { color: T.muted }]}>TARGET EC</Text>
                <Text style={[s.readValue, { color: T.white, fontSize: 20 }]}>
                  {point.standardEC}
                </Text>
                <Text style={[s.readUnit, { color: T.muted }]}>dS/m</Text>
              </View>
            </View>

            {/* Stability bar */}
            <View style={[s.stabilityBar, { backgroundColor: T.border }]}>
              <View
                style={[
                  s.stabilityFill,
                  {
                    width: `${stable ? 100 : isMocking ? 45 : 70}%`,
                    backgroundColor: stable ? T.primary : '#F59E0B',
                  },
                ]}
              />
            </View>
            {/* <Text
              style={[
                s.stabilityLabel,
                { color: stable ? T.primary : T.muted },
              ]}
            >
              {voltage === null
                ? '⏳ Waiting for device data…'
                : stable
                ? '✅ Signal stable — ready to capture!'
                : isMocking
                ? '⏳ Mock signal stabilising… (waiting for real device)'
                : '⏳ Stabilising real signal…'}
            </Text> */}

            {/* Actions */}
            <View style={s.actionRow}>
              <TouchableOpacity
                style={[s.btnOutline, { borderColor: T.border, flex: 1 }]}
                onPress={handleSkip}
              >
                <Text style={[s.btnOutlineText, { color: T.muted }]}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  s.btnCapture,
                  { backgroundColor: stable ? point.color : T.border, flex: 2 },
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

        {/* DONE */}
        {isDone && (
          <View
            style={[
              s.card,
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
                <Text style={[s.cardTitle, { color: T.white }]}>
                  EC {point.standardEC} dS/m{' '}
                  {captured[point.id] ? 'Captured ✅' : 'Skipped'}
                </Text>
                {captured[point.id] && (
                  <Text
                    style={[s.cardText, { color: T.muted, marginBottom: 0 }]}
                  >
                    Voltage:{' '}
                    <Text style={{ color: T.primary }}>
                      {captured[point.id]?.voltage?.toFixed(4)} V
                    </Text>
                  </Text>
                )}
              </View>
            </View>

            <View style={[s.capturedList, { borderColor: T.border }]}>
              <Text style={[s.capturedListTitle, { color: T.muted }]}>
                Points Recorded
              </Text>
              {EC_POINTS.filter(p => captured[p.id] !== undefined).map(p => (
                <View key={p.id} style={s.capturedRow}>
                  <Text style={{ fontSize: 16 }}>
                    {captured[p.id] ? '✅' : '➖'}
                  </Text>
                  <Text style={[s.capturedRowLabel, { color: T.text }]}>
                    {p.standardEC} dS/m
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
              onPress={handleNext}
              activeOpacity={0.85}
            >
              <Text style={s.btnPrimaryText}>
                {allDone
                  ? 'Save Calibration & Continue →'
                  : `Next: EC ${EC_POINTS[step + 1]?.standardEC} dS/m →`}
              </Text>
              <Icon name="arrow-right" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {!isDone && (
          <TouchableOpacity
            style={s.skipAll}
            onPress={() => navigation.replace('CalibrationSummaryScreen')}
          >
            <Text style={[s.skipAllText, { color: T.muted }]}>
              Skip EC Calibration Entirely
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
  stepLabel: { fontSize: 10, fontWeight: '700', textAlign: 'center' },
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
  pointTitle: { fontSize: 15, fontWeight: '800' },
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
  liveText: { fontSize: 13, fontWeight: '700', flex: 1 },
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
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '800' },
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
    paddingVertical: 5,
  },
  capturedRowLabel: { flex: 1, fontSize: 13, fontWeight: '700' },
  capturedRowVal: { fontSize: 13, fontWeight: '800' },
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
