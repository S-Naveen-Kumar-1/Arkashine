// src/soiltest/SensorScreen.jsx

import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppButton, ProgressRing, TopBar } from '../components/common';
import useTheme from '../hooks/useTheme';
import { Spacing, Typography } from '../theme';
import { nutrients } from '../utils/constants';
import { useDispatch, useSelector } from 'react-redux';
import {
  cmdCheckSoilSensorStatus,
  cmdGetSoilResult,
} from '../redux/actions/bleActions';

export function SensorScreen({ navigation }) {
  const theme = useTheme();
  const dispatch = useDispatch();
  const T = theme.colors;
  const soilSathiData = useSelector(s => s.soilsaathi);

  // ✅ TIMER (LOCAL - 60 sec)
  const SENSOR_DURATION = 60;
  const [sensorLeft, setSensorLeft] = useState(SENSOR_DURATION);
  const sensorTotal = SENSOR_DURATION;
  const [timerDone, setTimerDone] = useState(false);

  const intervalRef = useRef(null);

  useEffect(() => {
    const interval = setInterval(() => {
      dispatch(cmdCheckSoilSensorStatus());
    }, 3000);

    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    setSensorLeft(SENSOR_DURATION);
    setTimerDone(false);

    intervalRef.current = setInterval(() => {
      setSensorLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setTimerDone(true); // ✅ mark complete
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, []);

  // 🔵 Animation (unchanged)
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
  }, []);

  const scale = pulse.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.06, 1],
  });

  // ✅ progress calculation
  const elapsed = sensorTotal - sensorLeft;

  const activeIndex = Math.floor(
    (elapsed / (sensorTotal || 1)) * nutrients.length,
  );
  const handleFetchResults = async () => {
    await dispatch(cmdGetSoilResult());
    navigation.replace('SoilResultsScreen');
  };

  return (
    <SafeAreaView style={[s.bg, { backgroundColor: T.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />

      <TopBar
        title="Sensor Reading"
        onBack={() => navigation.goBack()}
        theme={theme}
      />

      <View style={s.center}>
        {/* BLE UI (static) */}
        <View
          style={[
            s.bleChip,
            {
              backgroundColor: T.cardAlt,
              borderColor: T.border,
            },
          ]}
        >
          <Icon name="bluetooth-off" size={13} color={T.muted} />
          <Text style={[s.bleChipText, { color: T.muted }]}>
            Device not connected
          </Text>
        </View>

        <Text style={[Typography.h3, { color: T.text }]}>Sensor Operation</Text>

        {!soilSathiData?.sensorStateFromBle && (
          <Text style={[s.sub, { color: T.textSub }]}>
            {'No Response from device'}
          </Text>
        )}
        {soilSathiData?.sensorStateFromBle && (
          <Text style={[s.sub, { color: T.textSub }]}>
            {soilSathiData?.sensorStateFromBle ||
              'Scanning — please hold still…'}
          </Text>
        )}

        {/* 🔵 Progress Ring */}
        <View style={s.ringWrap}>
          <Animated.View style={{ transform: [{ scale }] }}>
            <ProgressRing
              size={210}
              progress={elapsed}
              total={sensorTotal}
              color={T.primary}
              bg={T.border}
            >
              <View style={{ alignItems: 'center' }}>
                <Text style={[s.timerNum, { color: T.primary }]}>
                  {sensorLeft}
                </Text>
                <Text style={[s.timerUnit, { color: T.textSub }]}>sec</Text>
              </View>
            </ProgressRing>
          </Animated.View>
        </View>

        {/* Nutrient grid (unchanged UI) */}
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

        {/* Static live preview */}
        {/* <View
          style={[
            s.liveRow,
            { backgroundColor: T.card, borderColor: T.primary },
          ]}
        >
          <Icon name="wifi" size={14} color={T.primary} />
          <Text style={[s.liveText, { color: T.muted }]}>Live </Text>
          <Text style={[s.liveText, { color: T.primary }]}>pH -- </Text>
          <Text style={[s.liveText, { color: T.primary }]}>EC -- </Text>
          <Text style={[s.liveText, { color: T.muted }]}>-- V</Text>
        </View> */}
        {timerDone && (
          <AppButton
            label="Fetch Results"
            onPress={handleFetchResults}
            color={T.primary}
            textColor="#fff"
            style={{ marginTop: 20, width: '100%' }}
          />
        )}
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
  timerUnit: { fontSize: 13, fontWeight: '600' },
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
    paddingVertical: 4,
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
});

export default SensorScreen;
