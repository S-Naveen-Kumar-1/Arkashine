// src/screens/test/SensorScreen.js
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { startSensorCountdown, testResultsReceived } from '../store/actions';
import { AppButton, ProgressRing } from '../components/common';
import useTheme from '../hooks/useTheme';
import { Spacing, Typography } from '../theme';
import { nutrients } from '../utils/constants';

export function SensorScreen({ navigation }) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const T = theme.colors;

  const { sensorRunning, sensorDone, sensorLeft, sensorTotal } = useSelector(
    s => s.test,
  );

  // 🔥 animation refs
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

  // ✅ Navigate when done
  useEffect(() => {
    if (sensorDone) {
      dispatch(
        testResultsReceived({
          ph: 6.8,
          ec: 0.42,
          P: 14,
          K: 180,
          Ca: 3.2,
          Mg: 1.4,
          S: 12,
          Zn: 0.6,
          Mn: 2.1,
          Fe: 4.5,
          Cu: 0.3,
          B: 0.5,
          oc: 0.75,
          timestamp: Date.now(),
        }),
      );

      navigation.replace('ResultsScreen');
    }
  }, [sensorDone]);

  const handleStart = () => {
    dispatch(startSensorCountdown());
  };

  const elapsed = sensorTotal - sensorLeft;

  // 🔥 current scanning index
  const activeIndex = Math.floor(
    (elapsed / (sensorTotal || 1)) * nutrients.length,
  );

  return (
    <SafeAreaView style={[s.bg, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.bg} />

      <View style={s.center}>
        {/* Header */}
        <Text style={[Typography.h3, { color: T.text }]}>Sensor Operation</Text>

        <Text style={[s.sub, { color: T.textSub }]}>
          {sensorRunning
            ? 'Scanning nutrients...'
            : 'Start sensor to begin analysis'}
        </Text>

        {/* 🔥 Progress Ring */}
        <View style={s.ringWrap}>
          <Animated.View style={{ transform: [{ scale }] }}>
            <ProgressRing
              size={210}
              progress={elapsed}
              total={sensorTotal}
              color={sensorRunning ? T.primary : T.divider}
              bg={T.divider}
            >
              <View style={{ alignItems: 'center' }}>
                <Text
                  style={[
                    s.timerNum,
                    { color: sensorRunning ? T.primary : T.muted },
                  ]}
                >
                  {sensorRunning ? sensorLeft : '30'}
                </Text>
                <Text style={[s.timerUnit, { color: T.textSub }]}>sec</Text>
              </View>
            </ProgressRing>
          </Animated.View>
        </View>

        {/* 🔥 Nutrient Grid */}
        {sensorRunning && (
          <View style={s.grid}>
            {nutrients.map((item, index) => {
              const isActive = index === activeIndex;
              const isDone = index < activeIndex;

              return (
                <Animated.View
                  key={item.key}
                  style={[
                    s.card,
                    {
                      backgroundColor: T.card,
                      borderColor: isActive
                        ? T.primary
                        : isDone
                        ? T.primaryDim
                        : T.cardBorder,
                      transform: [{ scale: isActive ? scale : 1 }],
                    },
                  ]}
                >
                  <Text style={[s.label, { color: T.textSub }]}>
                    {item.label}
                  </Text>

                  <Text
                    style={[
                      s.value,
                      {
                        color: isActive
                          ? T.primary
                          : isDone
                          ? T.primaryDim
                          : T.muted,
                      },
                    ]}
                  >
                    {isActive ? 'Scanning...' : isDone ? '✔' : '—'}
                  </Text>
                </Animated.View>
              );
            })}
          </View>
        )}

        {/* Start Button */}
        {!sensorRunning && (
          <AppButton
            label="Start Sensor"
            onPress={handleStart}
            color={T.primary}
            textColor={T.onPrimary}
            size="lg"
            icon="▶️"
            style={{ marginTop: 24, width: '80%' }}
          />
        )}

        {/* Footer */}
        <Text style={[s.hint, { color: T.muted }]}>
          {sensorRunning
            ? 'Device is scanning soil nutrients. Please wait...'
            : 'Ensure probe is properly inserted into solution'}
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
    justifyContent: 'center',
    padding: Spacing.lg,
  },

  sub: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },

  ringWrap: { marginBottom: 24 },

  timerNum: {
    fontSize: 52,
    fontWeight: '900',
    fontFamily: 'monospace',
  },

  timerUnit: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
  },

  card: {
    width: '30%',
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 18,
    marginBottom: 14,
    alignItems: 'center',
    elevation: 2,
  },

  label: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },

  value: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  hint: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 18,
    paddingHorizontal: 20,
  },
});

export default SensorScreen;
