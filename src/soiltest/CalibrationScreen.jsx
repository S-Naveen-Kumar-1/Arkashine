// src/screens/test/CalibrationScreen.js

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
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import CalibrationResultModal from './CalibrationResultModal';
import CalibrationMatrixModal from './CalibrationMatrixModal';

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
    desc: 'Place the blank / distilled reference sample in the device.',
  },
  {
    key: 'min',
    label: 'Min',
    icon: 'gauge-empty',
    desc: 'Place the MIN standard solution.',
  },
  {
    key: 'mid',
    label: 'Mid',
    icon: 'gauge',
    desc: 'Place the MID standard solution.',
  },
  {
    key: 'max',
    label: 'Max',
    icon: 'gauge-full',
    desc: 'Place the MAX standard solution.',
  },
];
const POINT_KEYS = POINTS.map(p => p.key);

const WAVELENGTH_NM = {
  A: 410,
  B: 435,
  C: 460,
  D: 485,
  E: 510,
  F: 535,
  G: 560,
  H: 585,
  I: 645,
  J: 705,
  K: 900,
  L: 940,
  R: 610,
  S: 680,
  T: 730,
  U: 760,
  V: 810,
  W: 860,
  UVA: 320,
  UVB: 280,
  UVC: 200,
};

const ALL_CHANNELS = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'R',
  'S',
  'T',
  'U',
  'V',
  'W',
  'UVA',
  'UVB',
  'UVC',
];

const POLL_MS = 1500;

const asyncKeyFor = (nutrient, point) => `soil_cal:${nutrient}:${point}`;
const setKeyFor = (nutrient, point) => `${nutrient}:${point}`;

export default function CalibrationScreen({ navigation }) {
  const theme = useTheme();
  const T = theme.colors;
  const dispatch = useDispatch();

  const { connected } = useSelector(st => st.ble || { connected: false });
  const {
    calibrationPhase = 'idle',
    calibrationResults = null,
    calibrationError = null,
    calibrationTable = null,
    calibrationProgress = null,
    calibrationLiveChannels = {},
  } = useSelector(st => st.soilsaathi || {});

  console.log(
    calibrationPhase,
    calibrationResults,
    calibrationError,
    calibrationProgress,
    ' calibrationLiveChannels',
  );
  // ─── Local state ──────────────────────────────────────────────────────────
  const [selectedNutrient, setSelectedNutrient] = useState(null);
  const [selectedPoint, setSelectedPoint] = useState('blank');
  const [running, setRunning] = useState(false);
  const [stepStatus, setStepStatus] = useState('idle');
  const [seenChannels, setSeenChannels] = useState({});
  const [loopNumber, setLoopNumber] = useState(0);
  const [totalLoops, setTotalLoops] = useState(100);
  const [currentPhase, setCurrentPhase] = useState('spectral');

  // ─── Source-of-truth for "is this done" — fixes the race with calibrationTable
  const [completedSet, setCompletedSet] = useState(new Set());
  const [cachedValues, setCachedValues] = useState({}); // "nutrient:point" -> values[]

  // ─── Result / matrix modals ────────────────────────────────────────────────
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultEntry, setResultEntry] = useState(null);
  const [matrixModalVisible, setMatrixModalVisible] = useState(false);

  const pollRef = useRef(null);

  // ─── Init: fetch device table + hydrate from AsyncStorage (survives restarts) ─
  useEffect(() => {
    dispatch(cmdGetSoilCalibrationData());
    hydrateFromStorage();
    return () => clearInterval(pollRef.current);
  }, []);

  const hydrateFromStorage = async () => {
    try {
      const allKeys = [];
      NUTRIENTS.forEach(n =>
        POINT_KEYS.forEach(p => allKeys.push(asyncKeyFor(n.key, p))),
      );
      const pairs = await AsyncStorage.multiGet(allKeys);
      const nextSet = new Set();
      const nextValues = {};
      pairs.forEach(([key, raw]) => {
        if (!raw) return;
        const parts = key.split(':'); // soil_cal:NUT:POINT
        const nutrient = parts[1];
        const point = parts[2];
        try {
          const parsed = JSON.parse(raw);
          nextSet.add(setKeyFor(nutrient, point));
          nextValues[setKeyFor(nutrient, point)] = parsed.values;
        } catch (_) {}
      });
      if (nextSet.size) {
        setCompletedSet(prev => new Set([...prev, ...nextSet]));
        setCachedValues(prev => ({ ...nextValues, ...prev }));
      }
    } catch (e) {
      console.log('[UI] hydrateFromStorage failed:', e.message);
    }
  };

  // ─── Sync completedSet from the device's authoritative table when it arrives ─
  useEffect(() => {
    if (!calibrationTable) return;
    setCompletedSet(prev => {
      const next = new Set(prev);
      NUTRIENTS.forEach(n => {
        POINT_KEYS.forEach(p => {
          const row = calibrationTable?.[n.key]?.[p];
          const done = Array.isArray(row) && row.some(v => Number(v) !== 0);
          const k = setKeyFor(n.key, p);
          if (done) next.add(k);
          // Note: we don't remove keys the device doesn't have yet — avoids
          // flicker if the table response is momentarily stale/partial.
        });
      });
      return next;
    });
  }, [calibrationTable]);

  // ─── Sync loop number from firmware progress updates ────────────────────
  useEffect(() => {
    if (calibrationProgress) {
      setLoopNumber(Number(calibrationProgress.loop) || 0);
      setTotalLoops(Number(calibrationProgress.total) || 100);
      setCurrentPhase(calibrationProgress.phase || 'spectral');
    }
  }, [calibrationProgress, calibrationLiveChannels]);

  // ─── Handle phase changes ──────────────────────────────────────────────
  useEffect(() => {
    if (!running) return;

    if (calibrationPhase === 'reading') {
      if (stepStatus !== 'reading') setStepStatus('reading');
      return;
    }
    if (calibrationPhase === 'done' && stepStatus === 'reading') {
      stopPolling();
      handleCalibrationDone();
      return;
    }
    if (calibrationPhase === 'error' && stepStatus === 'reading') {
      stopPolling();
      setStepStatus('error');
    }
  }, [calibrationPhase, running]);

  // ─── Helpers ────────────────────────────────────────────────────────────
  const stopPolling = () => {
    clearInterval(pollRef.current);
    pollRef.current = null;
  };

  const chooseNutrient = key => {
    if (running) return;
    setSelectedNutrient(prev => (prev === key ? null : key));
    setSeenChannels({});
  };

  const choosePoint = key => {
    if (running) return;
    setSelectedPoint(key);
    setSeenChannels({});
  };

  const isCalibrated = (key, point) => completedSet.has(setKeyFor(key, point));

  const nutrientFullyCalibrated = key =>
    POINT_KEYS.every(p => isCalibrated(key, p));

  const findNextTarget = (fromNutrient, fromPoint) => {
    const nutrientIdx = NUTRIENTS.findIndex(n => n.key === fromNutrient);
    const pointIdx = POINT_KEYS.indexOf(fromPoint);

    for (let p = pointIdx + 1; p < POINT_KEYS.length; p++) {
      if (!isCalibrated(fromNutrient, POINT_KEYS[p])) {
        return { nutrient: fromNutrient, point: POINT_KEYS[p] };
      }
    }
    for (let n = nutrientIdx + 1; n < NUTRIENTS.length; n++) {
      const key = NUTRIENTS[n].key;
      for (let p = 0; p < POINT_KEYS.length; p++) {
        if (!isCalibrated(key, POINT_KEYS[p]))
          return { nutrient: key, point: POINT_KEYS[p] };
      }
    }
    for (let n = 0; n < nutrientIdx; n++) {
      const key = NUTRIENTS[n].key;
      for (let p = 0; p < POINT_KEYS.length; p++) {
        if (!isCalibrated(key, POINT_KEYS[p]))
          return { nutrient: key, point: POINT_KEYS[p] };
      }
    }
    return null;
  };

  // ─── Start calibration (nutrient/point can be overridden, e.g. from "Next") ─
  const handleStartCalibration = () => {
    if (!selectedNutrient) {
      Alert.alert(
        'Select a nutrient',
        'Please select one nutrient to calibrate.',
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
    if (isCalibrated(selectedNutrient, selectedPoint)) {
      Alert.alert(
        'Already Calibrated',
        `${selectedNutrient} ${selectedPoint.toUpperCase()} is already calibrated. Do you want to re-calibrate it?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Re-calibrate', onPress: () => startCalibration() },
        ],
      );
      return;
    }
    startCalibration();
  };

  const startCalibration = (nutrientOverride, pointOverride) => {
    const nutrient = nutrientOverride ?? selectedNutrient;
    const point = pointOverride ?? selectedPoint;

    setSelectedNutrient(nutrient);
    setSelectedPoint(point);
    setRunning(true);
    setStepStatus('starting');
    setSeenChannels({});
    setLoopNumber(0);
    setTotalLoops(100);
    setCurrentPhase('spectral');

    dispatch(cmdStartSoilCalibration([nutrient], point));

    stopPolling();
    dispatch(cmdCheckSoilCalibrationStatus()); // ← add this line
    pollRef.current = setInterval(() => {
      dispatch(cmdCheckSoilCalibrationStatus());
    }, POLL_MS);
  };

  const handleCalibrationDone = async () => {
    const result = calibrationResults?.[selectedNutrient];
    const entry = {
      nutrient: selectedNutrient,
      point: selectedPoint,
      saved: !!result?.saved,
      values: result?.values ?? null,
      error: result?.error ?? (result ? null : 'No response from device'),
      savedAt: Date.now(),
    };

    if (entry.saved) {
      const k = setKeyFor(entry.nutrient, entry.point);
      // Optimistic update — don't wait for the device table round-trip
      setCompletedSet(prev => new Set(prev).add(k));
      setCachedValues(prev => ({ ...prev, [k]: entry.values }));
      try {
        await AsyncStorage.setItem(
          asyncKeyFor(entry.nutrient, entry.point),
          JSON.stringify({ values: entry.values, savedAt: entry.savedAt }),
        );
      } catch (e) {
        console.log('[UI] AsyncStorage save failed:', e.message);
      }
    }

    setStepStatus('saved');
    setRunning(false);
    dispatch(cmdGetSoilCalibrationData());

    setResultEntry(entry);
    setResultModalVisible(true);
  };

  const handleRetry = () => {
    setStepStatus('starting');
    setSeenChannels({});
    setLoopNumber(0);
    setRunning(true);
    dispatch(cmdStartSoilCalibration([selectedNutrient], selectedPoint));
    stopPolling();
    pollRef.current = setInterval(() => {
      dispatch(cmdCheckSoilCalibrationStatus());
    }, POLL_MS);
  };

  const handleCancel = () => {
    stopPolling();
    dispatch(cmdStopSoilCalibration());
    setRunning(false);
    setStepStatus('idle');
    dispatch(cmdGetSoilCalibrationData());
  };

  // ─── Result modal actions ──────────────────────────────────────────────
  const closeResultModal = () => {
    setResultModalVisible(false);
    setStepStatus('idle');
  };

  const handleModalRecalibrate = () => {
    const { nutrient, point } = resultEntry;
    setResultModalVisible(false);
    startCalibration(nutrient, point);
  };

  const handleModalNext = () => {
    const target = findNextTarget(resultEntry.nutrient, resultEntry.point);
    setResultModalVisible(false);
    if (!target) {
      setStepStatus('idle');
      return; // everything calibrated
    }
    startCalibration(target.nutrient, target.point);
  };

  // ─── Matrix modal ──────────────────────────────────────────────────────
  const handleMatrixCellSelect = (nutrient, point) => {
    setMatrixModalVisible(false);
    setSelectedNutrient(nutrient);
    setSelectedPoint(point);
    setSeenChannels({});
  };

  // ─── Derived values ──────────────────────────────────────────────────────
  const currentPointMeta = POINTS.find(p => p.key === selectedPoint);
  const isPointCalibrated = selectedNutrient
    ? isCalibrated(selectedNutrient, selectedPoint)
    : false;
  const nextTargetForModal = resultEntry
    ? findNextTarget(resultEntry.nutrient, resultEntry.point)
    : null;
  const totalDone = NUTRIENTS.reduce(
    (acc, n) => acc + POINT_KEYS.filter(p => isCalibrated(n.key, p)).length,
    0,
  );

  const stepPct = (() => {
    if (stepStatus === 'saved') return 100;
    if (!loopNumber || !totalLoops) return 0;
    const frac = Math.min(loopNumber / totalLoops, 1);
    return currentPhase === 'uv'
      ? Math.round(50 + frac * 50)
      : Math.round(frac * 50);
  })();

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[s.root, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.bg} />
      <TopBar
        title={running ? 'Calibrating…' : 'Sensor Calibration'}
        onBack={() => (running ? handleCancel() : navigation.goBack())}
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

      {!running ? (
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Overview bar */}
          <TouchableOpacity
            style={[
              s.overviewBar,
              { backgroundColor: T.card, borderColor: T.cardBorder },
            ]}
            onPress={() => setMatrixModalVisible(true)}
            activeOpacity={0.8}
          >
            <Icon name="grid" size={18} color={T.primary} />
            <Text style={[s.overviewTxt, { color: T.text }]}>
              {totalDone}/{NUTRIENTS.length * POINT_KEYS.length} points
              calibrated
            </Text>
            <Icon name="chevron-right" size={18} color={T.muted} />
          </TouchableOpacity>

          {/* Step 1: Select Nutrient */}
          <Text style={[Typography.h4, { color: T.text, marginBottom: 4 }]}>
            1. Select ONE nutrient to calibrate
          </Text>
          <Text
            style={[s.subtle, { color: T.textSub, marginBottom: Spacing.sm }]}
          >
            Choose the nutrient you want to calibrate. Only one nutrient at a
            time.
          </Text>

          <View style={s.sectionHeadRow}>
            <Text style={[Typography.h4, { color: T.text }]}>
              {selectedNutrient
                ? `Selected: ${selectedNutrient}`
                : 'Nothing selected'}
            </Text>
            {selectedNutrient != null && (
              <TouchableOpacity onPress={() => setSelectedNutrient(null)}>
                <Text style={[s.linkTxt, { color: T.muted }]}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={s.grid}>
            {NUTRIENTS.map(n => {
              const active = selectedNutrient === n.key;
              const done = nutrientFullyCalibrated(n.key);
              return (
                <TouchableOpacity
                  key={n.key}
                  activeOpacity={0.8}
                  onPress={() => chooseNutrient(n.key)}
                  style={[
                    s.nutCard,
                    {
                      backgroundColor: active ? T.primaryDim : T.card,
                      borderColor: active ? T.primary : T.cardBorder,
                      opacity: done ? 0.7 : 1,
                    },
                    Shadow.sm,
                  ]}
                >
                  <View
                    style={[
                      s.radioDot,
                      { borderColor: active ? T.primary : T.cardBorder },
                    ]}
                  >
                    {active && (
                      <View
                        style={[s.radioDotFill, { backgroundColor: T.primary }]}
                      />
                    )}
                  </View>
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

          {/* Step 2: Select Mode/Point */}
          <Text
            style={[
              Typography.h4,
              { color: T.text, marginTop: Spacing.md, marginBottom: 4 },
            ]}
          >
            2. Select calibration point
          </Text>
          <Text
            style={[s.subtle, { color: T.textSub, marginBottom: Spacing.sm }]}
          >
            Choose which calibration point to read for the selected nutrient.
          </Text>

          <View style={s.pointGrid}>
            {POINTS.map(p => {
              const active = selectedPoint === p.key;
              const calibrated = selectedNutrient
                ? isCalibrated(selectedNutrient, p.key)
                : false;
              return (
                <TouchableOpacity
                  key={p.key}
                  activeOpacity={0.8}
                  onPress={() => choosePoint(p.key)}
                  style={[
                    s.pointCard,
                    {
                      backgroundColor: active ? T.primaryDim : T.card,
                      borderColor: active
                        ? T.primary
                        : calibrated
                        ? T.success || '#22C55E'
                        : T.cardBorder,
                      borderWidth: active ? 2.5 : 1.5,
                      opacity: calibrated ? 0.7 : 1,
                    },
                    Shadow.sm,
                  ]}
                >
                  <Icon
                    name={p.icon}
                    size={24}
                    color={active ? T.primary : T.textSub}
                  />
                  <Text
                    style={[
                      s.pointLabel,
                      { color: active ? T.primary : T.text },
                    ]}
                  >
                    {p.label}
                  </Text>
                  {calibrated && (
                    <View
                      style={[
                        s.pointCalibratedBadge,
                        { backgroundColor: T.success || '#22C55E' },
                      ]}
                    >
                      <Icon name="check-bold" size={10} color="#fff" />
                    </View>
                  )}
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
              {currentPointMeta?.desc}
            </Text>
          </View>

          {selectedNutrient && selectedPoint && (
            <View
              style={[
                s.statusIndicator,
                {
                  backgroundColor: isPointCalibrated
                    ? T.success + '15'
                    : T.primaryDim,
                  borderColor: isPointCalibrated
                    ? T.success || '#22C55E'
                    : T.primary,
                },
              ]}
            >
              <Icon
                name={
                  isPointCalibrated ? 'check-circle' : 'information-outline'
                }
                size={16}
                color={isPointCalibrated ? T.success || '#22C55E' : T.primary}
              />
              <Text
                style={[
                  s.statusIndicatorText,
                  {
                    color: isPointCalibrated
                      ? T.success || '#22C55E'
                      : T.textSub,
                  },
                ]}
              >
                {isPointCalibrated
                  ? `${selectedNutrient} ${selectedPoint.toUpperCase()} is already calibrated`
                  : `${selectedNutrient} ${selectedPoint.toUpperCase()} is not yet calibrated`}
              </Text>
            </View>
          )}

          <AppButton
            label="Start Calibration"
            onPress={handleStartCalibration}
            color={T.primary}
            textColor="#fff"
            icon="🎯"
            style={{ marginTop: Spacing.md }}
          />
          <Text style={[s.hint, { color: T.muted }]}>
            Each calibration point takes about a minute: 100 spectral loops +
            100 UV loops.
          </Text>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              s.overallCard,
              { backgroundColor: T.card, borderColor: T.cardBorder },
            ]}
          >
            <View style={s.overallRow}>
              <Text style={[s.overallTitle, { color: T.text }]}>
                {selectedNutrient} · {currentPointMeta?.label}
              </Text>
              <Text style={[s.overallPct, { color: T.primary }]}>
                {stepPct}%
              </Text>
            </View>
            <View style={[s.barTrack, { backgroundColor: T.cardBorder }]}>
              <View
                style={[
                  s.barFill,
                  { width: `${stepPct}%`, backgroundColor: T.primary },
                ]}
              />
            </View>
          </View>

          <View
            style={[
              s.stepCard,
              { backgroundColor: T.card, borderColor: T.cardBorder },
              Shadow.sm,
            ]}
          >
            <View style={s.stepHeadRow}>
              <View style={[s.nutBadge, { backgroundColor: T.primary }]}>
                <Text style={s.nutBadgeTxt}>{selectedNutrient}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.stepTitle, { color: T.text }]}>
                  {currentPointMeta?.label}
                </Text>
                <Text style={[s.stepSub, { color: T.textSub }]}>
                  Calibrating {selectedNutrient}
                </Text>
              </View>
              <Icon
                name={currentPointMeta?.icon ?? 'gauge'}
                size={26}
                color={T.primary}
              />
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
                {currentPointMeta?.desc}
              </Text>
            </View>

            {(stepStatus === 'starting' || stepStatus === 'reading') && (
              <>
                <View
                  style={[
                    s.statusCard,
                    {
                      backgroundColor: T.primaryDim,
                      borderColor: T.cardBorder,
                    },
                  ]}
                >
                  <ActivityIndicator color={T.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.statusTitle, { color: T.text }]}>
                      {stepStatus === 'starting'
                        ? 'Sending command to device…'
                        : currentPhase === 'uv'
                        ? 'Generating report…'
                        : 'Reading spectral channels…'}
                    </Text>
                    {currentPhase === 'spectral' && (
                      <Text style={[s.statusSub, { color: T.textSub }]}>
                        Loop {loopNumber}/{totalLoops}
                      </Text>
                    )}
                    {currentPhase === 'uv' && (
                      <Text style={[s.statusSub, { color: T.textSub }]}>
                        Preparing results…
                      </Text>
                    )}
                  </View>
                </View>

                <View
                  style={[
                    s.barTrack,
                    { backgroundColor: T.cardBorder, marginTop: 10 },
                  ]}
                >
                  <View
                    style={[
                      s.barFill,
                      { width: `${stepPct}%`, backgroundColor: T.primary },
                    ]}
                  />
                </View>

                <Text style={[s.channelsHeader, { color: T.textSub }]}>
                  Live channel readings ({Object.keys(seenChannels).length}/21)
                </Text>
                <View style={s.channelGrid}>
                  {ALL_CHANNELS.map(ch => {
                    const val = calibrationLiveChannels?.[ch];
                    const hasValue = val != null;
                    return (
                      <View
                        key={ch}
                        style={[
                          s.channelCell,
                          {
                            backgroundColor: hasValue ? T.primaryDim : T.bg,
                            borderColor: hasValue
                              ? T.primary + '55'
                              : T.cardBorder,
                            opacity: hasValue ? 1 : 0.5,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            s.channelKey,
                            { color: hasValue ? T.primary : T.muted },
                          ]}
                        >
                          {ch}
                        </Text>
                        <Text style={[s.channelNm, { color: T.muted }]}>
                          {WAVELENGTH_NM[ch]}nm
                        </Text>
                        <Text
                          style={[
                            s.channelVal,
                            { color: hasValue ? T.text : T.muted },
                          ]}
                          numberOfLines={1}
                        >
                          {val != null ? Number(val).toFixed(2) : '—'}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </>
            )}

            {stepStatus === 'error' && (
              <View
                style={[
                  s.statusCard,
                  { backgroundColor: T.red + '15', borderColor: T.red },
                ]}
              >
                <Icon name="alert-circle" size={22} color={T.red} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.statusTitle, { color: T.text }]}>
                    Reading failed
                  </Text>
                  <Text style={[s.statusSub, { color: T.red }]}>
                    {calibrationError ?? 'The device reported an error.'}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {stepStatus === 'error' ? (
            <View
              style={{ flexDirection: 'row', gap: 10, marginTop: Spacing.sm }}
            >
              <AppButton
                label="Retry"
                onPress={handleRetry}
                color={T.primary}
                textColor="#fff"
                style={{ flex: 1 }}
              />
              <AppButton
                label="Cancel"
                onPress={handleCancel}
                color={T.muted}
                textColor={T.muted}
                outlined
                style={{ flex: 1 }}
              />
            </View>
          ) : (
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
            Do not disconnect the device while a reading is in progress.
          </Text>
        </ScrollView>
      )}

      <CalibrationResultModal
        visible={resultModalVisible}
        entry={resultEntry}
        pointMeta={
          resultEntry ? POINTS.find(p => p.key === resultEntry.point) : null
        }
        nextTarget={nextTargetForModal}
        onClose={closeResultModal}
        onRecalibrate={handleModalRecalibrate}
        onNext={handleModalNext}
        theme={theme}
      />

      <CalibrationMatrixModal
        visible={matrixModalVisible}
        nutrients={NUTRIENTS}
        points={POINTS}
        completedSet={completedSet}
        onClose={() => setMatrixModalVisible(false)}
        onSelectCell={handleMatrixCellSelect}
        theme={theme}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: Spacing.lg, paddingBottom: 40 },
  subtle: { fontSize: 12, lineHeight: 17 },
  overviewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: Spacing.md,
  },
  overviewTxt: { flex: 1, fontSize: 12, fontWeight: '700' },
  warnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  warnText: { fontSize: 12, fontWeight: '600', flex: 1 },
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
  radioDot: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDotFill: { width: 6, height: 6, borderRadius: 3 },
  nutKey: { fontSize: 16, fontWeight: '900' },
  nutLabel: { fontSize: 10, marginTop: 2, textAlign: 'center' },
  hint: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: Spacing.lg,
    lineHeight: 16,
  },
  pointGrid: { flexDirection: 'row', gap: 10, marginBottom: Spacing.md },
  pointCard: {
    flex: 1,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    paddingVertical: 14,
    alignItems: 'center',
    position: 'relative',
  },
  pointLabel: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  pointCalibratedBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  descCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
  },
  descText: { fontSize: 12, lineHeight: 18, flex: 1 },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 10,
    marginBottom: Spacing.md,
  },
  statusIndicatorText: { fontSize: 12, fontWeight: '600' },
  overallCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 12,
    marginBottom: Spacing.md,
  },
  overallRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  overallTitle: { fontSize: 13, fontWeight: '700' },
  overallPct: { fontSize: 13, fontWeight: '800' },
  barTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  stepCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: 16,
    marginBottom: Spacing.md,
  },
  stepHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  nutBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nutBadgeTxt: { color: '#fff', fontSize: 14, fontWeight: '900' },
  stepTitle: { fontSize: 16, fontWeight: '800' },
  stepSub: { fontSize: 12, marginTop: 2, fontWeight: '600' },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 14,
  },
  statusTitle: { fontSize: 13, fontWeight: '700' },
  statusSub: { fontSize: 11, marginTop: 2 },
  channelsHeader: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  channelGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  channelCell: {
    width: '22%',
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  channelKey: { fontSize: 12, fontWeight: '900' },
  channelNm: { fontSize: 8, marginTop: 1 },
  channelVal: { fontSize: 11, fontWeight: '700', marginTop: 3 },
});
