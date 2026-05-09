// src/screens/phtest/ECCalibrationScreen.jsx
//
// 3-point EC calibration.
// • Sends {"CALIBERATE":"EC","value":1.413}
// • Reads ble.calibrationPoints.EC[standardEC] (set by CAL_POINT_DONE)
// • Device confirms: {"CALIBERATE":"EC","STATUS":"DONE","value":"1.41","ECVoltage":...}
// • Skip EC → confirmation alert before going to summary

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

// ─── EC calibration points ────────────────────────────────────────────────────
const EC_POINTS = [
  {
    id: 'ec0',
    label: 'EC 0.0 dS/m (Distilled Water)',
    standardEC: 0.0,
    color: '#3B82F6',
    icon: 'water-outline',
    mockBase: 0.12,
    prepMsg:
      'Fill a clean beaker with pure distilled water.\nInsert the EC probe fully and wait for stabilisation.',
  },
  {
    id: 'ec1413',
    label: 'EC 1.413 dS/m Standard',
    standardEC: 1.413,
    color: '#8B5CF6',
    icon: 'flask-outline',
    mockBase: 0.54,
    prepMsg:
      'Rinse probe with distilled water and dry.\nPour 1.413 dS/m EC standard and insert probe fully.',
  },
  {
    id: 'ec1288',
    label: 'EC 12.88 dS/m Standard',
    standardEC: 12.88,
    color: '#F97316',
    icon: 'flask',
    mockBase: 0.91,
    prepMsg:
      'Rinse probe with distilled water and dry.\nPour 12.88 dS/m EC standard and insert probe fully.',
  },
];

// ─── useLiveECVoltage ─────────────────────────────────────────────────────────
function useLiveECVoltage(active, mockBase, standardEC) {
  const realVoltage = useSelector(
    s => s?.phtest?.calibrationPoints?.EC?.[standardEC] ?? null,
  );
  const { phPoints, lastCalibrated } = useSelector(s => s.calibration);

  const [displayV, setDisplayV] = useState(null);
  const [isMocking, setIsMocking] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [stable, setStable] = useState(false);

  const mockTimer = useRef(null);
  const lockedRef = useRef(false);

  // Reset / start mock when phase becomes active
  useEffect(() => {
    if (!active) {
      clearInterval(mockTimer.current);
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
    mockTimer.current = setInterval(() => {
      tick++;
      const noise =
        Math.max(0.003, 0.025 - tick * 0.001) * (Math.random() - 0.5) * 2;
      setDisplayV(mockBase + noise);
    }, 300);

    return () => clearInterval(mockTimer.current);
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lock when real BLE voltage arrives
  useEffect(() => {
    if (!active) return;
    if (realVoltage == null) return;
    if (lockedRef.current) return;

    lockedRef.current = true;
    clearInterval(mockTimer.current);
    setIsMocking(false);
    setIsLocked(true);
    setDisplayV(realVoltage);
    setStable(true);
  }, [realVoltage, active]);

  return { voltage: displayV, isMocking, isLocked, stable };
}

// ─── Sub-components ───────────────────────────────────────────────────────────
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
          <Text style={[rm.title, { color: T.white ?? T.text }]}>
            Device Disconnected
          </Text>
          <Text style={[rm.body, { color: T.text }]}>
            Reconnect to resume EC calibration from the current step.
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
      <View style={s.liveRow}>
        <Animated.View
          style={[
            s.liveDot,
            { backgroundColor: point.color, transform: [{ scale: pulse }] },
          ]}
        />
        <View
          style={[
            s.modeBadge,
            {
              backgroundColor: isLocked ? T.primaryGlow : '#F59E0B22',
              borderColor: isLocked ? T.primary : '#F59E0B',
            },
          ]}
        >
          <Text
            style={{
              fontSize: 9,
              fontWeight: '800',
              color: isLocked ? T.primary : '#F59E0B',
            }}
          >
            {isLocked ? 'LIVE' : 'Reading…'}
          </Text>
        </View>
      </View>
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
          <Text style={[s.readLabel, { color: T.muted }]}>EC VOLTAGE</Text>
          <Text style={[s.readValue, { color: point.color }]}>
            {voltage !== null ? voltage.toFixed(4) : '–.––––'}
          </Text>
          <Text style={[s.readUnit, { color: T.muted }]}>V</Text>
        </View>
        <View style={[s.readBox, { borderColor: T.border }]}>
          <Text style={[s.readLabel, { color: T.muted }]}>TARGET EC</Text>
          <Text
            style={[
              s.readValue,
              { color: T.primary, fontSize: point.standardEC >= 10 ? 22 : 28 },
            ]}
          >
            {point.standardEC}
          </Text>
          <Text style={[s.readUnit, { color: T.muted }]}>dS/m</Text>
        </View>
      </View>
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

// ─── Main ─────────────────────────────────────────────────────────────────────
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

  const { voltage, isMocking, isLocked, stable } = useLiveECVoltage(
    isActive,
    point.mockBase,
    point.standardEC,
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

  useEffect(() => {
    if (wasConnected.current && !connected && phase === 'reading')
      setShowReconnect(true);
    wasConnected.current = connected;
  }, [connected, phase]);

  useEffect(() => {
    if (connected && showReconnect) setShowReconnect(false);
  }, [connected]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-capture when device confirms point
  useEffect(() => {
    if (isLocked && phase === 'reading' && voltage !== null) {
      dispatch(saveEcPoint(point.standardEC, voltage));
      setCaptured(prev => ({
        ...prev,
        [point.id]: { voltage, standardEC: point.standardEC },
      }));
      setPhase('done');
    }
  }, [isLocked]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (!voltage) {
      Alert.alert('No Data', 'No voltage received from device.');
      return;
    }
    dispatch(saveEcPoint(point.standardEC, voltage));
    setCaptured(prev => ({
      ...prev,
      [point.id]: { voltage, standardEC: point.standardEC },
    }));
    setPhase('done');
  }, [voltage, point, dispatch]);

  const handleSkip = useCallback(() => {
    dispatch(saveEcPoint(point.standardEC, null));
    setCaptured(prev => ({ ...prev, [point.id]: null }));
    goNext();
  }, [point, dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  const goNext = useCallback(() => {
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
    navigation.replace('DeviceScanScreen');
  }, [dispatch, navigation]);

  // ── Skip EC Entirely ───────────────────────────────────────────────────────
  // Always confirm before discarding remaining EC points
  const handleSkipAll = useCallback(() => {
    Alert.alert(
      'Skip EC Calibration?',
      'Remaining EC calibration points will not be saved.\nAre you sure you want to finish without completing EC calibration?',
      [
        {
          text: 'Skip & Finish',
          style: 'destructive',
          onPress: () => {
            dispatch(persistCalibration());
            navigation.replace('CalibrationSummaryScreen');
          },
        },
        {
          text: 'Continue Calibrating',
          style: 'cancel',
        },
      ],
    );
  }, [dispatch, navigation]);

  const allDone = step === EC_POINTS.length - 1 && phase === 'done';

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
        {/* Step progress */}
        <View style={s.stepRow}>
          {EC_POINTS.map((p, i) => {
            const done = captured[p.id] !== undefined,
              active = i === step;
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
                    style={[
                      s.stepLabel,
                      { color: active ? T.white ?? T.text : T.muted },
                    ]}
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
        {phase === 'prep' && (
          <View
            style={[s.card, { backgroundColor: T.card, borderColor: T.border }]}
          >
            <Text style={[s.cardTitle, { color: T.white ?? T.text }]}>
              📋 Preparation
            </Text>
            {point.prepMsg.split('\n').map((line, i) => (
              <View key={i} style={s.instrRow}>
                <View style={[s.instrDot, { backgroundColor: point.color }]}>
                  <Text style={s.instrDotNum}>{i + 1}</Text>
                </View>
                <Text style={[s.instrText, { color: T.text }]}>{line}</Text>
              </View>
            ))}
            <TouchableOpacity
              style={[
                s.btnPrimary,
                { backgroundColor: sending ? T.border : point.color },
              ]}
              onPress={handleStartReading}
              disabled={sending}
              activeOpacity={0.85}
            >
              <Icon
                name={sending ? 'loading' : 'play-circle'}
                size={18}
                color="#fff"
              />
              <Text style={s.btnPrimaryText}>
                {sending ? 'Sending command…' : 'Start Reading'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* READING */}
        {phase === 'reading' && (
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

        {/* DONE */}
        {phase === 'done' && (
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
                <Text style={[s.cardTitle, { color: T.white ?? T.text }]}>
                  EC {point.standardEC}{' '}
                  {captured[point.id] ? 'Captured ✅' : 'Skipped'}
                </Text>
                {captured[point.id] && (
                  <Text style={[s.cardText, { color: T.muted }]}>
                    Voltage:{' '}
                    <Text style={{ color: T.primary, fontFamily: 'Courier' }}>
                      {captured[point.id].voltage?.toFixed(4)} V
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
              onPress={goNext}
              activeOpacity={0.85}
            >
              <Text style={s.btnPrimaryText}>
                {allDone
                  ? 'Save & Finish EC Cal'
                  : `Next: ${EC_POINTS[step + 1]?.standardEC} dS/m →`}
              </Text>
              <Icon name="arrow-right" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* Skip EC Calibration Entirely — hidden on final done screen */}
        {phase !== 'done' && (
          <TouchableOpacity style={s.skipAll} onPress={handleSkipAll}>
            <Text style={[s.skipAllText, { color: T.muted }]}>
              Skip EC Calibration Entirely
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
  disconnectBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    padding: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginBottom: 4,
    borderRadius: Radius.sm,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  stepItem: { alignItems: 'center', gap: 4 },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: { fontSize: 10, fontWeight: '700' },
  stepLine: { flex: 1, height: 2, marginBottom: 12, marginHorizontal: 4 },
  pointHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  pointTitle: { fontSize: 16, fontWeight: '900' },
  pointSub: { fontSize: 13, marginTop: 2 },
  connDot: { width: 10, height: 10, borderRadius: 5 },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: 12,
  },
  cardTitle: { fontSize: 15, fontWeight: '900' },
  cardText: { fontSize: 13 },
  instrRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  instrDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  instrDotNum: { color: '#fff', fontSize: 11, fontWeight: '900' },
  instrText: { fontSize: 13, flex: 1, lineHeight: 20 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: { width: 10, height: 10, borderRadius: 5 },
  modeBadge: {
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  readGrid: { flexDirection: 'row', gap: 12 },
  readBox: {
    flex: 1,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  readLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  readValue: { fontSize: 28, fontWeight: '900', fontFamily: 'Courier' },
  readUnit: { fontSize: 11, marginTop: 2 },
  stabilityBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  stabilityFill: { height: '100%', borderRadius: 3 },
  actionRow: { flexDirection: 'row', gap: 10 },
  btnOutline: {
    height: 48,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOutlineText: { fontSize: 13, fontWeight: '700' },
  btnCapture: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: Radius.lg,
  },
  btnCaptureText: { fontSize: 14, fontWeight: '800' },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    borderRadius: Radius.lg,
  },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  doneHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
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
    gap: 8,
  },
  capturedListTitle: { fontSize: 11, fontWeight: '700', marginBottom: 4 },
  capturedRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  capturedRowLabel: { flex: 1, fontSize: 13, fontWeight: '600' },
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
    gap: 12,
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: '900' },
  body: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 50,
    borderRadius: Radius.lg,
    paddingHorizontal: 24,
  },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
