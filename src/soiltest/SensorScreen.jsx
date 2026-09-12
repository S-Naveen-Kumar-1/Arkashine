// src/screens/test/SensorScreen.js

import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  Animated,
  Easing,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppButton, ProgressRing, TopBar } from '../components/common';
import useTheme from '../hooks/useTheme';
import { Spacing, Typography } from '../theme';
import { nutrients } from '../utils/constants';
import { useDispatch, useSelector } from 'react-redux';
import { showMessage } from 'react-native-flash-message';
import {
  cmdCheckSoilSensorStatus,
  cmdGetSoilResult,
} from '../redux/actions/bleActions';

export function SensorScreen({ navigation }) {
  const { connected, device } = useSelector(s => s.ble);
  const soilSathiData = useSelector(s => s.soilsaathi);
  const theme = useTheme();
  const dispatch = useDispatch();
  const T = theme.colors;

  console.log('[SensorScreen] Connected:', connected, 'Device:', device?.name);
  console.log(
    '[SensorScreen] Soil Sathi Data:',
    JSON.stringify(soilSathiData, null, 2),
  );

  // ✅ TIMER - Count UP from 0 until STOPPED
  const [sensorTime, setSensorTime] = useState(0);
  const [timerDone, setTimerDone] = useState(false);
  const [sensorStopped, setSensorStopped] = useState(false);
  const [timerStarted, setTimerStarted] = useState(false);

  const intervalRef = useRef(null);
  const startFallbackRef = useRef(null);
  const sensorStateFromBle = soilSathiData?.sensorStateFromBle;

  // True until the device's first status confirmation arrives (or the
  // fallback grace period elapses) — see the mount-only effect below.
  const [awaitingStart, setAwaitingStart] = useState(true);

  // Check sensor status every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      dispatch(cmdCheckSoilSensorStatus());
    }, 3000);

    return () => clearInterval(interval);
  }, [dispatch]);

  // ✅ Monitor sensor status from BLE and stop timer when STOPPED
  useEffect(() => {
    const status = sensorStateFromBle;
    console.log('[SensorScreen] Status from BLE:', status);

    // Check for STOPPED status (case insensitive)
    if (status && status.toLowerCase() === 'stopped') {
      console.log('[SensorScreen] Sensor stopped - stopping timer');
      setSensorStopped(true);
      setTimerDone(true);
      setTimerStarted(false);

      // Clear the interval if it exists
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [sensorStateFromBle]);

  // Actually starts the count-up timer. Called at most once per screen
  // visit — either as soon as the device confirms it's reading, or after
  // the fallback grace period below if no confirmation ever arrives.
  const beginTimer = () => {
    console.log('[SensorScreen] Starting timer from 0');
    setAwaitingStart(false);
    setSensorTime(0);
    setTimerDone(false);
    setSensorStopped(false);
    setTimerStarted(true);

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setSensorTime(prev => prev + 1);
    }, 1000);

    if (startFallbackRef.current) {
      clearTimeout(startFallbackRef.current);
      startFallbackRef.current = null;
    }
  };

  // ✅ FIX (issue #5): this used to be keyed on [sensorStateFromBle] and
  // re-ran — resetting sensorTime back to 0 — on every distinct BLE status
  // string (not_started → reading → running → …). It now runs once on
  // mount only, and waits for the device's first non-idle status before
  // starting at all (issue #3: the app timer no longer starts before the
  // device physically does), falling back to starting anyway after a
  // grace period so a firmware that never sends this status doesn't leave
  // the user stuck.
  useEffect(() => {
    const initialStatus = sensorStateFromBle;

    if (initialStatus && initialStatus.toLowerCase() === 'stopped') {
      console.log('[SensorScreen] Sensor already stopped - not starting timer');
      setSensorStopped(true);
      setTimerDone(true);
      setTimerStarted(false);
      setAwaitingStart(false);
      return;
    }

    if (initialStatus && initialStatus.toLowerCase() !== 'not_started') {
      beginTimer();
    } else {
      startFallbackRef.current = setTimeout(() => {
        showMessage({
          message: 'Started without confirmation',
          description: 'No status received from the device — check the connection.',
          type: 'warning',
          duration: 3000,
        });
        beginTimer();
      }, 9000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (startFallbackRef.current) {
        clearTimeout(startFallbackRef.current);
        startFallbackRef.current = null;
      }
      setTimerStarted(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If we're still waiting for the device's first confirmation and a
  // status update arrives before the fallback timeout fires, start now.
  useEffect(() => {
    if (!awaitingStart) return;
    const status = sensorStateFromBle;
    if (
      status &&
      status.toLowerCase() !== 'not_started' &&
      status.toLowerCase() !== 'stopped'
    ) {
      beginTimer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sensorStateFromBle, awaitingStart]);

  // 🔵 Animation
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, [pulse]);

  const scale = pulse.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.06, 1],
  });

  const handleFetchResults = async () => {
    console.log('[SensorScreen] Fetching results...');
    await dispatch(cmdGetSoilResult());
    // Navigate to results screen
    navigation.replace('SoilResultsScreen');
  };

  // Check if results are available
  const hasResults =
    soilSathiData?.bleResultData &&
    Object.keys(soilSathiData.bleResultData).length > 0;

  // Format the time as MM:SS
  const formatTime = seconds => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Calculate which nutrient is currently being processed
  const TOTAL_NUTRIENTS = nutrients.length;
  const ESTIMATED_TOTAL_TIME = 150; // 2.5 minutes in seconds

  const getNutrientProgress = currentTime => {
    const timePerNutrient = ESTIMATED_TOTAL_TIME / TOTAL_NUTRIENTS;
    const currentIndex = Math.min(
      Math.floor(currentTime / timePerNutrient),
      TOTAL_NUTRIENTS - 1,
    );
    return currentIndex;
  };

  // Determine if we should show the fetch button
  const shouldShowButton = sensorStopped || timerDone;

  // ✅ Split nutrients into rows of 3
  const chunkArray = (array, size) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  };

  const nutrientRows = chunkArray(nutrients, 3);

  // ✅ Render a single nutrient item
  const renderNutrientItem = (item, index, rowIndex) => {
    const globalIndex = rowIndex * 3 + index;
    const activeIndex = getNutrientProgress(sensorTime);
    const isActive = globalIndex === activeIndex && !sensorStopped && timerStarted;
    const isDone = globalIndex < activeIndex || sensorStopped;

    // Calculate if this item should have a margin right (not the last item in the row)
    const isLastInRow = index === 2 || index === nutrients.length - 1;

    return (
      <Animated.View
        key={item.key}
        style={[
          s.nutriCard,
          {
            backgroundColor: T.card,
            borderColor: isActive
              ? T.primary
              : isDone
              ? T.primaryGlow
              : T.border,
            transform: [{ scale: isActive ? scale : 1 }],
            marginRight: isLastInRow ? 0 : 8,
          },
        ]}
      >
        <Text style={[s.nutriLabel, { color: T.textSub }]}>
          {item.label}
        </Text>

        <Text
          style={[
            s.nutriValue,
            {
              color: isActive
                ? T.primary
                : isDone
                ? '#22C55E'
                : T.muted,
            },
          ]}
        >
          {isActive ? '…' : isDone ? '✔' : '—'}
        </Text>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={[s.bg, { backgroundColor: T.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />

      <TopBar
        title="Sensor Reading"
        onBack={() => navigation.goBack()}
        theme={theme}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* BLE Connection Status */}
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
              {device?.name || 'Connected'}
            </Text>
          </View>
        )}

        <Text style={[Typography.h3, { color: T.text }]}>Sensor Operation</Text>

        {/* Sensor Status */}
        {!soilSathiData?.sensorStateFromBle && (
          <Text style={[s.sub, { color: T.textSub }]}>
            {'No Response from device'}
          </Text>
        )}

        {soilSathiData?.sensorStateFromBle && (
          <Text
            style={[s.sub, { color: sensorStopped ? '#22C55E' : T.textSub }]}
          >
            {sensorStopped
              ? '✅ Sensor reading complete'
              : soilSathiData?.sensorStateFromBle ||
                'Scanning — please hold still…'}
          </Text>
        )}

        {/* Timer Display — compact, single line */}
        <View style={s.timerWrap}>
          <View style={s.timerBox}>
            <Text
              style={[
                s.timerNum,
                { color: sensorStopped ? '#22C55E' : T.primary },
              ]}
            >
              {sensorStopped ? '✓' : formatTime(sensorTime)}
            </Text>
            <Text style={[s.timerUnit, { color: T.textSub }]}>
              {sensorStopped ? 'Done' : timerStarted ? 'Elapsed' : 'Waiting...'}
            </Text>
          </View>
        </View>

        {/* Progress Bar - Show overall progress */}
        <View style={s.progressWrap}>
          <View style={[s.progressBar, { backgroundColor: T.border }]}>
            <View
              style={[
                s.progressFill,
                {
                  backgroundColor: sensorStopped ? '#22C55E' : T.primary,
                  width: `${Math.min(
                    (sensorTime / ESTIMATED_TOTAL_TIME) * 100,
                    100,
                  )}%`,
                },
              ]}
            />
          </View>
          <Text style={[s.progressText, { color: T.textSub }]}>
            {Math.min(
              Math.round((sensorTime / ESTIMATED_TOTAL_TIME) * 100),
              100,
            )}
            % complete
          </Text>
        </View>

        {/* ✅ Nutrient grid with proper row alignment */}
        <View style={s.grid}>
          {nutrientRows.map((row, rowIndex) => (
            <View key={rowIndex} style={s.row}>
              {row.map((item, index) => renderNutrientItem(item, index, rowIndex))}
              {/* Add empty placeholders for incomplete rows */}
              {row.length < 3 && (
                <>
                  {Array(3 - row.length)
                    .fill(null)
                    .map((_, i) => (
                      <View
                        key={`empty-${i}`}
                        style={[
                          s.nutriCard,
                          {
                            backgroundColor: 'transparent',
                            borderColor: 'transparent',
                            opacity: 0,
                          },
                        ]}
                      />
                    ))}
                </>
              )}
            </View>
          ))}
        </View>

        {/* Results Preview - Show when sensor is stopped and results are available */}
        {sensorStopped && hasResults && (
          <View
            style={[
              s.resultPreview,
              {
                backgroundColor: T.card,
                borderColor: '#22C55E',
                borderWidth: 1.5,
              },
            ]}
          >
            <Text style={[s.resultTitle, { color: '#22C55E' }]}>
              ✅ Soil Analysis Complete
            </Text>
            <View style={s.resultRow}>
              <Text style={[s.resultLabel, { color: T.textSub }]}>N:</Text>
              <Text style={[s.resultValue, { color: T.text }]}>
                {soilSathiData.bleResultData.N?.toFixed(2) || '--'}
              </Text>
              <Text style={[s.resultLabel, { color: T.textSub }]}>P:</Text>
              <Text style={[s.resultValue, { color: T.text }]}>
                {soilSathiData.bleResultData.P?.toFixed(2) || '--'}
              </Text>
              <Text style={[s.resultLabel, { color: T.textSub }]}>K:</Text>
              <Text style={[s.resultValue, { color: T.text }]}>
                {soilSathiData.bleResultData.K?.toFixed(2) || '--'}
              </Text>
            </View>
            <Text style={[s.resultSub, { color: T.muted }]}>
              pH: {soilSathiData.bleResultData.ph?.toFixed(2) || '--'} · EC:{' '}
              {soilSathiData.bleResultData.ec?.toFixed(2) || '--'}
            </Text>
          </View>
        )}

      </ScrollView>

      {/* Floating footer — stays in place regardless of scroll position */}
      {shouldShowButton && (
        <View
          style={[
            s.footer,
            { backgroundColor: T.bg, borderTopColor: T.border },
          ]}
        >
          <AppButton
            label={hasResults ? 'View Full Results' : 'Fetch Results'}
            onPress={handleFetchResults}
            color={T.primary}
            textColor="#fff"
            style={{ width: '100%' }}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: Spacing.lg,
    paddingTop: 12,
    paddingBottom: 20,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: Spacing.lg,
    paddingTop: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 10,
  },
  chipText: { fontSize: 12, fontWeight: '700' },
  sub: { fontSize: 14, marginBottom: 16, textAlign: 'center' },
  timerWrap: { marginBottom: 12 },
  timerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  timerNum: {
    fontSize: 28,
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  timerUnit: {
    fontSize: 13,
    fontWeight: '700',
  },
  progressWrap: {
    width: '100%',
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  grid: {
    width: '100%',
    marginTop: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  nutriCard: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1.5,
    paddingVertical: 6,
    paddingHorizontal: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: '31%',
  },
  nutriLabel: {
    fontSize: 10,
    fontWeight: '700',
    flexShrink: 1,
  },
  nutriValue: { fontSize: 12, fontWeight: '800', marginLeft: 4 },
  resultPreview: {
    borderRadius: 12,
    padding: 14,
    width: '100%',
    marginTop: 12,
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  resultLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  resultValue: {
    fontSize: 14,
    fontWeight: '800',
    marginRight: 4,
  },
  resultSub: {
    fontSize: 11,
    marginTop: 6,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
});

export default SensorScreen;