// src/soiltest/SensorScreen.jsx
// Soil-test sensor phase: starts BLE streaming, counts down 30 s, dispatches
// real ph/ec/voltage data from Redux ble.sensorData, navigates to ResultsScreen.

import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppButton, ProgressRing, TopBar } from '../components/common';
import useTheme from '../hooks/useTheme';
import { Spacing, Typography } from '../theme';
import { nutrients } from '../utils/constants';
import {
  TEST_SENSOR_START,
  TEST_SENSOR_TICK,
  TEST_SENSOR_DONE,
  TEST_RESULTS_RECEIVED,
} from '../config/actionTypes';
import {
  cmdStartStream,
  cmdStopStream,
  cmdReadSensors,
} from '../redux/actions/bleActions';
import { SENSOR_DURATION } from '../redux/reducers/testReducer';

export function SensorScreen({ navigation }) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const T = theme.colors;

  const { sensorRunning, sensorDone, sensorLeft, sensorTotal } = useSelector(
    s => s.test,
  );
  const { connected, device, sensorData } = useSelector(s => s.ble);

  const sensorDataRef = useRef(sensorData);
  const intervalRef = useRef(null);
  const navigatedRef = useRef(false);

  // Keep a live ref to sensorData so the timeout closure can read the latest value
  useEffect(() => {
    sensorDataRef.current = sensorData;
  }, [sensorData]);

  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (sensorRunning) {
      Animated.loop(
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ).start();
    }
  }, [sensorRunning]);

  const scale = pulse.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.06, 1],
  });

  // Navigate to ResultsScreen once done (deduplicated)
  useEffect(() => {
    if (sensorDone && !navigatedRef.current) {
      navigatedRef.current = true;
      navigation.replace('SoilResultsScreen');
    }
  }, [sensorDone, navigation]);

  // Stop stream on unmount
  useEffect(
    () => () => {
      clearInterval(intervalRef.current);
      dispatch(cmdStopStream());
    },
    [dispatch],
  );

  const handleStart = useCallback(async () => {
    // Start BLE stream so notifications flow in during countdown
    dispatch(cmdStartStream());

    dispatch({ type: TEST_SENSOR_START });

    intervalRef.current = setInterval(() => {
      dispatch({ type: TEST_SENSOR_TICK });
    }, 1000);

    setTimeout(() => {
      clearInterval(intervalRef.current);

      // Also send a discrete READ_SENSORS to capture a final snapshot
      dispatch(cmdReadSensors());

      // Small delay to allow the READ_SENSORS response to arrive
      setTimeout(() => {
        dispatch(cmdStopStream());

        // Commit whatever we have — real BLE data takes priority, fallback to null
        const live = sensorDataRef.current;
        dispatch({
          type: TEST_RESULTS_RECEIVED,
          payload: {
            ph: live?.ph ?? null,
            ec: live?.ec ?? null,
            voltage: live?.voltage ?? null,
            raw: live?.raw ?? '',
          },
        });
        dispatch({ type: TEST_SENSOR_DONE });
      }, 1500); // wait 1.5 s for final read
    }, SENSOR_DURATION * 1000);
  }, [dispatch]);

  const elapsed = sensorTotal - sensorLeft;
  const activeIndex = sensorRunning
    ? Math.floor((elapsed / (sensorTotal || 1)) * nutrients.length)
    : -1;

  return (
    <SafeAreaView style={[s.bg, { backgroundColor: T.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <TopBar
        title="Sensor Reading"
        onBack={() => navigation.goBack()}
        theme={theme}
      />

      <View style={s.center}>
        {/* ── BLE status chip ─────────────────────────────────── */}
        <View
          style={[
            s.bleChip,
            {
              backgroundColor: connected ? T.primaryGlow : T.cardAlt,
              borderColor: connected ? T.primary : T.border,
            },
          ]}
        >
          <Icon
            name={connected ? 'bluetooth-connect' : 'bluetooth-off'}
            size={13}
            color={connected ? T.primary : T.muted}
          />
          <Text
            style={[s.bleChipText, { color: connected ? T.primary : T.muted }]}
          >
            {connected
              ? `${device?.name || 'Device'} connected`
              : 'No device — connect first'}
          </Text>
        </View>

        <Text style={[Typography.h3, { color: T.text }]}>Sensor Operation</Text>
        <Text style={[s.sub, { color: T.textSub }]}>
          {sensorRunning
            ? 'Scanning — please hold still…'
            : 'Start to begin 30-second BLE scan'}
        </Text>

        {/* ── Progress Ring ────────────────────────────────────── */}
        <View style={s.ringWrap}>
          <Animated.View style={{ transform: [{ scale }] }}>
            <ProgressRing
              size={210}
              progress={elapsed}
              total={sensorTotal}
              color={sensorRunning ? T.primary : T.border}
              bg={T.border}
            >
              <View style={{ alignItems: 'center' }}>
                <Text
                  style={[
                    s.timerNum,
                    { color: sensorRunning ? T.primary : T.muted },
                  ]}
                >
                  {sensorRunning ? sensorLeft : SENSOR_DURATION}
                </Text>
                <Text style={[s.timerUnit, { color: T.textSub }]}>sec</Text>
                {/* Show live ph/ec if already receiving */}
                {sensorRunning && sensorData.ph !== null && (
                  <Text style={[s.liveVal, { color: T.primary }]}>
                    pH {sensorData.ph?.toFixed(2)}
                  </Text>
                )}
              </View>
            </ProgressRing>
          </Animated.View>
        </View>

        {/* ── Nutrient Grid (animated during scan) ─────────────── */}
        {sensorRunning && (
          <View style={s.grid}>
            {nutrients.map((item, index) => {
              const isActive = index === activeIndex;
              const isDone = index < activeIndex;
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
                          ? T.primary
                          : T.muted,
                      },
                    ]}
                  >
                    {isActive ? '…' : isDone ? '✔' : '—'}
                  </Text>
                </Animated.View>
              );
            })}
          </View>
        )}

        {/* ── Live data preview ────────────────────────────────── */}
        {sensorRunning &&
          (sensorData.ph !== null || sensorData.ec !== null) && (
            <View
              style={[
                s.liveRow,
                { backgroundColor: T.card, borderColor: T.primary },
              ]}
            >
              <Icon name="wifi" size={14} color={T.primary} />
              <Text style={[s.liveText, { color: T.muted }]}>Live </Text>
              {sensorData.ph !== null && (
                <Text style={[s.liveText, { color: T.primary }]}>
                  pH {sensorData.ph.toFixed(2)}{' '}
                </Text>
              )}
              {sensorData.ec !== null && (
                <Text style={[s.liveText, { color: T.primary }]}>
                  EC {sensorData.ec.toFixed(3)}{' '}
                </Text>
              )}
              {sensorData.voltage !== null && (
                <Text style={[s.liveText, { color: T.muted }]}>
                  {sensorData.voltage.toFixed(3)} V
                </Text>
              )}
            </View>
          )}

        {/* ── Start button ─────────────────────────────────────── */}
        {!sensorRunning && (
          <AppButton
            label={
              connected ? 'Start Sensor (30s)' : 'Connect BLE Device First'
            }
            onPress={
              connected
                ? handleStart
                : () => navigation.navigate('BLEScanScreen')
            }
            color={connected ? T.primary : T.border}
            textColor="#fff"
            size="lg"
            icon={connected ? '▶️' : '📡'}
            style={{ marginTop: 24, width: '90%' }}
          />
        )}

        <Text style={[s.hint, { color: T.muted }]}>
          {sensorRunning
            ? 'Keep device steady. Streaming BLE data…'
            : connected
            ? 'Ensure probe is properly inserted into solution'
            : 'Go to Connect screen and pair your ArkaShine device'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: Spacing.lg,
    paddingTop: 12,
  },
  bleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 10,
  },
  bleChipText: { fontSize: 12, fontWeight: '700' },
  sub: { fontSize: 14, marginBottom: 16, textAlign: 'center' },
  ringWrap: { marginBottom: 16 },
  timerNum: { fontSize: 48, fontWeight: '900', fontFamily: 'monospace' },
  timerUnit: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  liveVal: { fontSize: 12, fontWeight: '800', marginTop: 4 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 6,
  },
  nutriCard: {
    width: '30%',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 14,
    marginBottom: 10,
    alignItems: 'center',
  },
  nutriLabel: { fontSize: 11, fontWeight: '700', marginBottom: 4 },
  nutriValue: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
  },
  liveText: { fontSize: 12, fontWeight: '700' },
  hint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 14,
    paddingHorizontal: 20,
  },
});

export default SensorScreen;
