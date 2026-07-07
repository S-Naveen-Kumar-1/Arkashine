// src/screens/test/CalibrationScreen.js
//
// Sensor Calibration screen
// ───────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppButton, TopBar } from '../components/common';
import useTheme from '../hooks/useTheme';
import { Spacing, Radius, Shadow, Typography } from '../theme';
import {
  cmdStartSoilCalibration,
  cmdStopSoilCalibration,
  cmdCheckSoilCalibrationStatus,
  cmdGetSoilCalibrationData,
} from '../redux/actions/bleActions';

// ─────────────────────────────────────────────────────────────────────────────
// 12 nutrients calibrated by the SOILENZ sensor (matches NUTRIENT_CONFIG /
// CALIBRATION_NUTRIENTS on the device side)
// ─────────────────────────────────────────────────────────────────────────────
const NUTRIENTS = [
  { key: 'OC', label: 'Organic Carbon' },
  { key: 'N', label: 'Nitrogen' },
  { key: 'P', label: 'Phosphorous' },
  { key: 'K', label: 'Potassium' },
  { key: 'Ca', label: 'Calcium' },
  { key: 'Mg', label: 'Magnesium' },
  { key: 'S', label: 'Sulphur' },
  { key: 'Fe', label: 'Iron' },
  { key: 'Mn', label: 'Manganese' },
  { key: 'Cu', label: 'Copper' },
  { key: 'Zn', label: 'Zinc' },
  { key: 'B', label: 'Boron' },
];

const POINTS = [
  {
    key: 'blank',
    label: 'Blank',
    icon: 'water-off-outline',
    desc: 'Place the blank / distilled reference sample in the device, then read the baseline signal. This is subtracted from every future reading.',
  },
  {
    key: 'min',
    label: 'Min',
    icon: 'gauge-empty',
    desc: 'Place the MIN standard solution for the selected nutrients, then read. Use the lowest reference concentration.',
  },
  {
    key: 'mid',
    label: 'Mid',
    icon: 'gauge',
    desc: 'Place the MID standard solution for the selected nutrients, then read. Use the middle reference concentration.',
  },
  {
    key: 'max',
    label: 'Max',
    icon: 'gauge-full',
    desc: 'Place the MAX standard solution for the selected nutrients, then read. Use the highest reference concentration.',
  },
];

// Only used to space out status polls — this is NOT a timeout, it never
// cancels anything on its own.
const POLL_MS = 1500;

export default function CalibrationScreen({ navigation }) {
  const theme = useTheme();
  const T = theme.colors;
  const dispatch = useDispatch();

  const { connected } = useSelector(st => st.ble);
  const {
    calibrationPhase,
    calibrationResults,
    calibrationPoint,
    calibrationNutrients,
    calibrationError,
    calibrationTable,
  } = useSelector(st => st.soilsaathi);
  console.log('CalibrationScreen: redux state', {
    calibrationPhase,
    calibrationResults,
    calibrationPoint,
    calibrationNutrients,
    calibrationError,
  }); 

  const [selected, setSelected] = useState([]);
  const [point, setPoint] = useState('blank');
  const [starting, setStarting] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);

  const pollRef = useRef(null);
  const elapsedRef = useRef(null);

  // Pull the existing calibration table once, so we can show "already
  // calibrated" badges on the nutrient grid.
  useEffect(() => {
    dispatch(cmdGetSoilCalibrationData());
    return () => {
      clearInterval(pollRef.current);
      clearInterval(elapsedRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleNutrient = key => {
    setSelected(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key],
    );
  };

  const selectAll = () => setSelected(NUTRIENTS.map(n => n.key));
  const clearAll = () => setSelected([]);

  const isCalibrated = key => {
    const row = calibrationTable?.[key]?.[point];
    if (!row || !Array.isArray(row)) return false;
    return row.some(v => Number(v) !== 0);
  };

  // Stops the status-poll loop and the elapsed-time counter. This is only
  // ever called when the device itself reports done/error, or the user
  // explicitly taps Cancel — never on a timer.
  const stopPolling = () => {
    clearInterval(pollRef.current);
    clearInterval(elapsedRef.current);
    pollRef.current = null;
    elapsedRef.current = null;
  };

  const handleStart = () => {
    if (selected.length === 0) {
      Alert.alert(
        'Select nutrients',
        'Please select at least one nutrient to calibrate.',
      );
      return;
    }
    if (!connected) {
      Alert.alert(
        'Not connected',
        'Connect to the SOILENZ device before calibrating.',
      );
      return;
    }

    setStarting(true);
    setElapsedSec(0);
    dispatch(cmdStartSoilCalibration(selected, point));

    // Keep polling status indefinitely — no cutoff. The device decides
    // when calibration is done, not a client-side timer.
    pollRef.current = setInterval(() => {
      dispatch(cmdCheckSoilCalibrationStatus());
    }, POLL_MS);

    // Purely cosmetic "time elapsed" counter for the status card below —
    // does not stop or cancel anything by itself.
    elapsedRef.current = setInterval(() => {
      setElapsedSec(sec => sec + 1);
    }, 1000);
  };

  const handleCancel = () => {
    stopPolling();
    setStarting(false);
    dispatch(cmdStopSoilCalibration());
  };

  // Watch calibration phase updates coming back over BLE. The ONLY things
  // that end the "starting" state are the device reporting 'done' or
  // 'error' — or the user hitting Cancel above.
  useEffect(() => {
    if (!starting) return;

    if (calibrationPhase === 'done') {
      stopPolling();
      setStarting(false);
      dispatch(cmdGetSoilCalibrationData());
      navigation.navigate('CalibrationResultScreen', {
        point: calibrationPoint ?? point,
        nutrients: calibrationNutrients ?? selected,
        results: calibrationResults ?? {},
      });
    } else if (calibrationPhase === 'error') {
      stopPolling();
      setStarting(false);
      Alert.alert(
        'Calibration failed',
        calibrationError ?? 'The device reported an error during calibration.',
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calibrationPhase]);

  const activePoint = POINTS.find(p => p.key === point);

  const formatElapsed = sec => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={[s.root, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.bg} />

      <TopBar
        title="Sensor Calibration"
        onBack={() => navigation.goBack()}
        theme={theme}
      />

      {!connected && (
        <View
          style={[
            s.warnBanner,
            { backgroundColor: T.red + '15', borderColor: T.red + '55' },
          ]}
        >
          <Icon name="bluetooth-off" size={16} color={T.red} />
          <Text style={[s.warnText, { color: T.red }]}>
            Device not connected — connect before starting calibration.
          </Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── CALIBRATION POINT ─────────────────────────────────────────── */}
        <Text
          style={[Typography.h4, { color: T.text, marginBottom: Spacing.sm }]}
        >
          Calibration Point
        </Text>

        <View style={s.pointRow}>
          {POINTS.map(p => {
            const active = p.key === point;
            return (
              <TouchableOpacity
                key={p.key}
                activeOpacity={0.8}
                disabled={starting}
                onPress={() => setPoint(p.key)}
                style={[
                  s.pointChip,
                  {
                    backgroundColor: active ? T.primary : T.card,
                    borderColor: active ? T.primary : T.cardBorder,
                    opacity: starting ? 0.6 : 1,
                  },
                  Shadow.sm,
                ]}
              >
                <Icon
                  name={p.icon}
                  size={18}
                  color={active ? '#fff' : T.textSub}
                />
                <Text
                  style={[s.pointLabel, { color: active ? '#fff' : T.text }]}
                >
                  {p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View
          style={[
            s.descCard,
            { backgroundColor: T.primaryDim, borderColor: T.cardBorder },
          ]}
        >
          <Icon
            name="information-outline"
            size={16}
            color={T.primary}
            style={{ marginTop: 1 }}
          />
          <Text style={[s.descText, { color: T.textSub }]}>
            {activePoint?.desc}
          </Text>
        </View>

        {/* ── NUTRIENT SELECTION ────────────────────────────────────────── */}
        <View style={s.sectionHeadRow}>
          <Text style={[Typography.h4, { color: T.text }]}>
            Select Nutrients ({selected.length}/{NUTRIENTS.length})
          </Text>
          <View style={{ flexDirection: 'row', gap: 14 }}>
            <TouchableOpacity onPress={selectAll} disabled={starting}>
              <Text style={[s.linkTxt, { color: T.primary }]}>Select all</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={clearAll} disabled={starting}>
              <Text style={[s.linkTxt, { color: T.muted }]}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.grid}>
          {NUTRIENTS.map(n => {
            const active = selected.includes(n.key);
            const done = isCalibrated(n.key);
            return (
              <TouchableOpacity
                key={n.key}
                activeOpacity={0.8}
                disabled={starting}
                onPress={() => toggleNutrient(n.key)}
                style={[
                  s.nutCard,
                  {
                    backgroundColor: active ? T.primaryDim : T.card,
                    borderColor: active ? T.primary : T.cardBorder,
                    opacity: starting ? 0.6 : 1,
                  },
                  Shadow.sm,
                ]}
              >
                {done && (
                  <View style={[s.doneBadge, { backgroundColor: T.primary }]}>
                    <Icon name="check-bold" size={9} color="#fff" />
                  </View>
                )}
                <Text
                  style={[s.nutKey, { color: active ? T.primary : T.text }]}
                >
                  {n.key}
                </Text>
                <Text
                  style={[s.nutLabel, { color: T.textSub }]}
                  numberOfLines={1}
                >
                  {n.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── LIVE STATUS (no timeout — just informational) ───────────────── */}
        {starting && (
          <View
            style={[
              s.statusCard,
              { backgroundColor: T.card, borderColor: T.cardBorder },
            ]}
          >
            <ActivityIndicator color={T.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[s.statusTitle, { color: T.text }]}>
                {calibrationPhase === 'reading'
                  ? 'Reading sensor…'
                  : 'Starting calibration…'}
              </Text>
              <Text style={[s.statusSub, { color: T.textSub }]}>
                {activePoint?.label} · {selected.join(', ')}
              </Text>
            </View>
            <Text style={[s.statusTimer, { color: T.muted }]}>
              {formatElapsed(elapsedSec)}
            </Text>
          </View>
        )}

        <AppButton
          label={starting ? 'Calibrating…' : 'Start Calibration'}
          onPress={handleStart}
          color={T.primary}
          textColor="#fff"
          disabled={starting}
          icon="🎯"
          style={{ marginTop: Spacing.md, opacity: starting ? 0.7 : 1 }}
        />

        {starting && (
          <AppButton
            label="Cancel"
            onPress={handleCancel}
            color={T.red}
            textColor={T.red}
            outlined
            style={{ marginTop: Spacing.sm }}
          />
        )}

        <Text style={[s.hint, { color: T.muted }]}>
          {starting
            ? 'Waiting for the device to finish — this can take a while. It will move on automatically as soon as the device reports it is done.'
            : 'One sensor reading is shared across all selected nutrients for this calibration point.'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ================= STYLES ================= */

const s = StyleSheet.create({
  root: { flex: 1 },

  scroll: { padding: Spacing.lg, paddingBottom: 40 },

  warnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  warnText: { fontSize: 12, fontWeight: '600', flex: 1 },

  pointRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.md },
  pointChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    paddingVertical: 12,
  },
  pointLabel: { fontSize: 12, fontWeight: '800' },

  descCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 12,
    marginBottom: Spacing.lg,
  },
  descText: { fontSize: 12, lineHeight: 18, flex: 1 },

  sectionHeadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  linkTxt: { fontSize: 12, fontWeight: '700' },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  nutCard: {
    width: '31%',
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    paddingVertical: 14,
    marginBottom: 10,
    alignItems: 'center',
    position: 'relative',
  },
  doneBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nutKey: { fontSize: 16, fontWeight: '900' },
  nutLabel: { fontSize: 10, marginTop: 2, textAlign: 'center' },

  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 14,
    marginTop: Spacing.sm,
  },
  statusTitle: { fontSize: 13, fontWeight: '700' },
  statusSub: { fontSize: 11, marginTop: 2 },
  statusTimer: {
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },

  hint: { fontSize: 11, textAlign: 'center', marginTop: Spacing.lg },
});
