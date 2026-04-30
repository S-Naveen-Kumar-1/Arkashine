// src/screens/test/TimerScreen.js
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { testPourDetected } from '../redux/actions';
import { AppButton, ProgressRing } from '../components/common';
import useTheme from '../hooks/useTheme';
import { Spacing, Typography } from '../theme';

export function TimerScreen({ navigation }) {
  const theme = useTheme();
  const T = theme.colors;
  const dispatch = useDispatch();

  const { timerLeft, timerTotal, timerDone } = useSelector(s => s.test);
  const dispatched = useRef(false);

  useEffect(() => {
    if (timerDone && !dispatched.current) {
      dispatched.current = true;
      navigation.replace('SensorScreen');
    }
  }, [timerDone]);

  const minutes = Math.floor(timerLeft / 60);
  const seconds = timerLeft % 60;
  const progress = timerTotal - timerLeft;

  // ✅ Skip handler
  const handleSkip = () => {
    if (dispatched.current) return;
    dispatched.current = true;

    // optional: mark timer as done in redux
    dispatch(testPourDetected());

    navigation.replace('SensorScreen');
  };

  // ✅ Next handler (only when timer completes)
  const handleNext = () => {
    if (!timerDone || dispatched.current) return;
    dispatched.current = true;
    navigation.replace('SensorScreen');
  };

  return (
    <SafeAreaView style={[s.bg, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.bg} />

      <View style={s.center}>
        <Text style={[Typography.h3, { color: T.text, marginBottom: 8 }]}>
          Solution Settling
        </Text>

        <Text style={[s.sub, { color: T.textSub }]}>
          Wait for soil solution to settle
        </Text>

        <View style={s.timerWrap}>
          <ProgressRing
            size={220}
            progress={progress}
            total={timerTotal}
            color={T.primary}
            bg={T.divider}
          >
            <View style={{ alignItems: 'center' }}>
              <Text style={[s.timerNum, { color: T.primary }]}>
                {String(minutes).padStart(2, '0')}:
                {String(seconds).padStart(2, '0')}
              </Text>
              <Text style={[s.timerUnit, { color: T.textSub }]}>remaining</Text>
            </View>
          </ProgressRing>
        </View>

        <View
          style={[
            s.infoCard,
            { backgroundColor: T.primaryDim, borderColor: T.primary },
          ]}
        >
          <Text style={s.infoIcon}>⏳</Text>
          <Text style={[s.infoText, { color: T.text }]}>
            Wait{' '}
            <Text style={{ fontWeight: '900', color: T.primary }}>
              {timerTotal} seconds
            </Text>{' '}
            for the soil solution to properly settle in the device filter
          </Text>
        </View>

        {/* Progress Bar */}
        <View style={[s.progressBar, { backgroundColor: T.divider }]}>
          <View
            style={[
              s.progressFill,
              {
                backgroundColor: T.primary,
                width: `${(progress / (timerTotal || 1)) * 100}%`,
              },
            ]}
          />
        </View>

        <Text style={[s.progressLabel, { color: T.muted }]}>
          {Math.round((progress / (timerTotal || 1)) * 100)}% complete
        </Text>

        <Text style={[s.lockMsg, { color: T.muted }]}>
          🔒 Navigation locked until timer completes
        </Text>

        {/* ✅ Buttons */}
        <View style={s.buttonRow}>
          {/* Skip */}
          <AppButton
            label="Skip"
            onPress={handleSkip}
            outlined
            color={T.primary}
            textColor={T.primary}
            style={{ flex: 1 }}
          />

          {/* Next */}
          <AppButton
            label="Next"
            onPress={handleNext}
            disabled={!timerDone}
            color={T.primary}
            textColor={T.onPrimary} // 👈 use theme contrast color
            style={{ flex: 1 }}
          />
        </View>
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
    fontSize: 15,
    marginBottom: 32,
    textAlign: 'center',
  },

  timerWrap: { marginBottom: 32 },

  timerNum: {
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: 2,
    fontFamily: 'monospace',
  },

  timerUnit: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },

  infoCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    marginBottom: 20,
  },

  infoIcon: { fontSize: 28 },

  infoText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },

  progressBar: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },

  progressFill: {
    height: 6,
    borderRadius: 3,
  },

  progressLabel: {
    fontSize: 12,
  },

  lockMsg: {
    fontSize: 12,
    marginTop: 16,
  },

  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    width: '100%',
  },
});
