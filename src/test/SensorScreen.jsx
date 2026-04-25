// src/screens/test/SensorScreen.js
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { startSensorCountdown, testResultsReceived } from '../store/actions';
import { AppButton, ProgressRing } from '../components/common';
import useTheme from '../hooks/useTheme';
import { Spacing, Typography } from '../theme';

export function SensorScreen({ navigation }) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const T = theme.colors;
  const { sensorRunning, sensorDone, sensorLeft, sensorTotal, livePH, liveEC } =
    useSelector(s => s.test);

  useEffect(() => {
    if (sensorDone) {
      // Simulate final results from hardware
      dispatch(
        testResultsReceived({
          ph: livePH || 6.8,
          ec: liveEC || 0.42,
          N: 210,
          P: 14,
          K: 180,
          timestamp: Date.now(),
        }),
      );
      navigation.replace('ResultsScreen');
    }
  }, [sensorDone]);

  const handleStart = () => {
    dispatch(
      startSensorCountdown(() => ({
        ph: 6.5 + Math.random() * 1.5,
        ec: 0.3 + Math.random() * 1.5,
      })),
    );
  };

  const elapsed = sensorTotal - sensorLeft;

  return (
    <SafeAreaView style={[s.bg, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.bg} />
      <View style={s.center}>
        <Text style={[Typography.h3, { color: T.text, marginBottom: 6 }]}>
          Sensor Operation
        </Text>
        <Text style={[s.sub, { color: T.textSub }]}>
          {sensorRunning
            ? '🟢 Sensor Running — 30 seconds'
            : 'Press Start Sensor to begin reading'}
        </Text>

        {/* Timer ring */}
        <View style={s.ringWrap}>
          <ProgressRing
            size={200}
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
        </View>

        {/* Live readings */}
        {sensorRunning && (
          <View style={s.liveRow}>
            <View
              style={[
                s.liveCard,
                { backgroundColor: T.card, borderColor: T.cardBorder },
              ]}
            >
              <Text style={s.liveIcon}>🧪</Text>
              <Text style={[s.liveLabel, { color: T.textSub }]}>pH</Text>
              <Text style={[s.liveValue, { color: T.primary }]}>
                {livePH != null ? livePH.toFixed(2) : '--'}
              </Text>
            </View>
            <View
              style={[
                s.liveCard,
                { backgroundColor: T.card, borderColor: T.cardBorder },
              ]}
            >
              <Text style={s.liveIcon}>⚡</Text>
              <Text style={[s.liveLabel, { color: T.textSub }]}>EC</Text>
              <Text style={[s.liveValue, { color: T.blue }]}>
                {liveEC != null ? liveEC.toFixed(3) : '--'}
              </Text>
            </View>
          </View>
        )}

        {!sensorRunning && (
          <AppButton
            label="Start Sensor"
            onPress={handleStart}
            color={T.primary}
            textColor="#fff"
            size="lg"
            icon="▶️"
            style={{ marginTop: 24, width: '80%' }}
          />
        )}

        <Text style={[s.hint, { color: T.muted }]}>
          {sensorRunning
            ? 'Sensor is measuring soil properties. Please wait...'
            : 'Ensure the device probe is fully submerged in the solution'}
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
  sub: { fontSize: 14, marginBottom: 24, textAlign: 'center' },
  ringWrap: { marginBottom: 28 },
  timerNum: { fontSize: 48, fontWeight: '900', fontFamily: 'monospace' },
  timerUnit: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  liveRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  liveCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    alignItems: 'center',
    width: 130,
  },
  liveIcon: { fontSize: 28, marginBottom: 6 },
  liveLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  liveValue: { fontSize: 28, fontWeight: '900' },
  hint: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 16,
    paddingHorizontal: 20,
  },
});

export default SensorScreen;
