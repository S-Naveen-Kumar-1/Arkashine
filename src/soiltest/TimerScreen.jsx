// src/screens/test/TimerScreen.js

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton, ProgressRing } from '../components/common';
import useTheme from '../hooks/useTheme';
import { Spacing, Typography } from '../theme';
import {
  cmdCheckSoilMotorStatus,
  cmdStartSoilSensor,
  cmdStopSoilTest,
} from '../redux/actions/bleActions';
import { useDispatch, useSelector } from 'react-redux';

const MOTOR_DURATION = 180;

export function TimerScreen({ navigation }) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const T = theme.colors;
  const soilSathiData = useSelector(s => s.soilsaathi);

  const [timeLeft, setTimeLeft] = useState(MOTOR_DURATION);
  const intervalRef = useRef(null);
  useEffect(() => {
    const interval = setInterval(() => {
      dispatch(cmdCheckSoilMotorStatus());
    }, 3000);

    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    if (timeLeft === 0) {
      dispatch(cmdStopSoilTest());
    }
  }, [timeLeft]);

  // start timer on mount
  useEffect(() => {
    setTimeLeft(MOTOR_DURATION);

    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, []);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = MOTOR_DURATION - timeLeft;

  const timerDone = timeLeft === 0;

  // ✅ Skip → go immediately
  const handleSkip = async () => {
    clearInterval(intervalRef.current);

    navigation.replace('SoilTestIntroScreen');
  };

  // ✅ Next → only after timer completes
  const handleNext = () => {
    if (!timerDone) return;
    navigation.replace('SoilTestIntroScreen');
  };

  return (
    <SafeAreaView style={[s.bg, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.bg} />

      <View style={s.center}>
        <Text style={[Typography.h3, { color: T.text, marginBottom: 8 }]}>
          {`Motor State: ${soilSathiData?.motorState}` || 'Idle'}
        </Text>
        {soilSathiData?.motorStateFromBle && (
          <Text style={[Typography.h3, { color: T.text, marginBottom: 8 }]}>
            {`Motor State from ble :${soilSathiData?.motorStateFromBle}`}
          </Text>
        )}
        {!soilSathiData?.motorStateFromBle && (
          <Text style={[Typography.h3, { color: T.text, marginBottom: 8 }]}>
            {'No Response from device'}
          </Text>
        )}

        <Text style={[s.sub, { color: T.textSub }]}>
          Please wait while motor completes
        </Text>

        <View style={s.timerWrap}>
          <ProgressRing
            size={220}
            progress={progress}
            total={MOTOR_DURATION}
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

        {/* Progress bar */}
        <View style={[s.progressBar, { backgroundColor: T.divider }]}>
          <View
            style={[
              s.progressFill,
              {
                backgroundColor: T.primary,
                width: `${(progress / MOTOR_DURATION) * 100}%`,
              },
            ]}
          />
        </View>

        <Text style={[s.progressLabel, { color: T.muted }]}>
          {Math.round((progress / MOTOR_DURATION) * 100)}% complete
        </Text>

        {/* ✅ Buttons */}
        <View style={s.buttonRow}>
          {/* <AppButton
            label="Skip"
            onPress={handleSkip}
            outlined
            color={T.primary}
            textColor={T.primary}
            style={{ flex: 1 }}
          /> */}

          <AppButton
            label="Get Full 12-Parameter Soil Test →"
            onPress={handleNext}
            disabled={!timerDone}
            color={T.primary}
            textColor={T.primary}
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

  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    width: '100%',
  },
});
