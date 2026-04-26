// src/screens/phtest/MixerScreen.js
// Triggers mixing motor on hardware device (60 sec), then reads pH & EC

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { Radius, Spacing, Typography } from '../theme';
import { TopBar, ProgressRing } from '../components/common';
import useTheme from '../hooks/useTheme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const MOTOR_DURATION = 60; // seconds

export default function MixerScreen({ navigation }) {
  const theme = useTheme();
  const T = theme.colors;
  const [motorState, setMotorState] = useState('idle'); // 'idle' | 'running' | 'done'
  const [timeLeft, setTimeLeft] = useState(MOTOR_DURATION);
  const timerRef = useRef(null);

  // Spin animation for motor icon
  const spinAnim = useRef(new Animated.Value(0)).current;
  const spinLoop = useRef(null);

  const startSpin = () => {
    spinLoop.current = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    spinLoop.current.start();
  };

  const stopSpin = () => {
    spinLoop.current?.stop();
    spinAnim.setValue(0);
  };

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Start motor
  const handleStart = () => {
    setMotorState('running');
    setTimeLeft(MOTOR_DURATION);
    startSpin();
    // sendMotorCommand('on');   ← real HW call

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          stopSpin();
          setMotorState('done');
          // sendMotorCommand('off');   ← real HW call
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(
    () => () => {
      clearInterval(timerRef.current);
      stopSpin();
    },
    [],
  );

  const progress = MOTOR_DURATION - timeLeft;
  const pct = Math.round((progress / MOTOR_DURATION) * 100);
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <SafeAreaView style={[s.container, { backgroundColor: T.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />

      <TopBar
        title="Mixing Motor"
        onBack={() => navigation.goBack()}
        theme={theme}
      />

      <View style={s.body}>
        {/* Motor visual */}
        <View
          style={[
            s.motorRing,
            {
              borderColor:
                motorState === 'running'
                  ? T.primary
                  : motorState === 'done'
                  ? T.primary
                  : T.border,
              backgroundColor:
                motorState === 'running' ? T.primaryGlow : 'transparent',
            },
          ]}
        >
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Icon
              name="rotate-3d-variant"
              size={64}
              color={
                motorState === 'running'
                  ? T.primary
                  : motorState === 'done'
                  ? T.primary
                  : T.muted
              }
            />
          </Animated.View>
          {motorState === 'done' && (
            <View style={s.doneBadge}>
              <Icon name="check" size={16} color="#fff" />
            </View>
          )}
        </View>

        <Text
          style={[
            s.motorLabel,
            {
              color:
                motorState === 'running'
                  ? T.primary
                  : motorState === 'done'
                  ? T.primary
                  : T.white,
            },
          ]}
        >
          {motorState === 'idle'
            ? 'Motor Ready'
            : motorState === 'running'
            ? 'Motor Running…'
            : 'Mixing Complete ✅'}
        </Text>

        {/* Instruction card */}
        <View
          style={[
            s.instrCard,
            { backgroundColor: T.card, borderColor: T.border },
          ]}
        >
          <Text style={[s.instrTitle, { color: T.white }]}>
            📋 Before Starting
          </Text>
          {[
            'Add 5g soil sample to the beaker',
            'Add 40ml extractant solution',
            'Place the beaker under the mixer',
            'Ensure probe is connected and ready',
          ].map((t, i) => (
            <View key={i} style={s.instrRow}>
              <View style={[s.instrDot, { backgroundColor: T.primary }]}>
                <Text style={s.instrDotNum}>{i + 1}</Text>
              </View>
              <Text style={[s.instrText, { color: T.text }]}>{t}</Text>
            </View>
          ))}
        </View>

        {/* Timer ring (visible while running / done) */}
        {motorState !== 'idle' && (
          <View style={s.ringWrap}>
            <ProgressRing
              size={160}
              progress={progress}
              total={MOTOR_DURATION}
              color={motorState === 'done' ? T.primary : T.primary}
              bg={T.border}
              strokeWidth={10}
            >
              <View style={{ alignItems: 'center' }}>
                {motorState === 'done' ? (
                  <Icon name="check-circle" size={36} color={T.primary} />
                ) : (
                  <>
                    <Text style={[s.timerNum, { color: T.primary }]}>
                      {String(minutes).padStart(2, '0')}:
                      {String(seconds).padStart(2, '0')}
                    </Text>
                    <Text style={[s.timerSub, { color: T.muted }]}>{pct}%</Text>
                  </>
                )}
              </View>
            </ProgressRing>
          </View>
        )}

        {/* CTA */}
        {motorState === 'idle' && (
          <TouchableOpacity
            style={[s.ctaBtn, { backgroundColor: T.primary }]}
            onPress={handleStart}
            activeOpacity={0.85}
          >
            <Icon name="play-circle" size={22} color="#fff" />
            <Text style={s.ctaBtnText}>Start Mixing Motor (60s)</Text>
          </TouchableOpacity>
        )}

        {motorState === 'running' && (
          <View
            style={[
              s.runningBar,
              { backgroundColor: T.cardAlt, borderColor: T.border },
            ]}
          >
            <View style={[s.runningDot, { backgroundColor: T.primary }]} />
            <Text style={[s.runningText, { color: T.text }]}>
              Motor running — do not remove beaker
            </Text>
          </View>
        )}

        {motorState === 'done' && (
          <TouchableOpacity
            style={[s.ctaBtn, { backgroundColor: T.primary }]}
            onPress={() => navigation.replace('PHECResultScreen')}
            activeOpacity={0.85}
          >
            <Icon name="flask-outline" size={22} color="#fff" />
            <Text style={s.ctaBtnText}>Read pH & EC Results →</Text>
          </TouchableOpacity>
        )}

        <Text style={[s.hint, { color: T.muted }]}>
          {motorState === 'idle'
            ? 'Motor mixes the soil-extractant solution for accurate readings'
            : motorState === 'running'
            ? 'Hardware motor is running. Timer will auto-stop at 60 seconds.'
            : 'Solution is ready. Proceed to read pH and EC values from the probe.'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  motorRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    position: 'relative',
  },
  doneBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  motorLabel: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  instrCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    width: '100%',
    marginBottom: Spacing.md,
    gap: 10,
  },
  instrTitle: { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  instrRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  instrDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instrDotNum: { color: '#fff', fontSize: 11, fontWeight: '900' },
  instrText: { fontSize: 13, flex: 1 },
  ringWrap: { marginBottom: Spacing.md },
  timerNum: { fontSize: 32, fontWeight: '900', fontFamily: 'Courier' },
  timerSub: { fontSize: 12, fontWeight: '700' },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    height: 56,
    borderRadius: Radius.lg,
    marginBottom: Spacing.sm,
  },
  ctaBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  runningBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    width: '100%',
    marginBottom: Spacing.sm,
  },
  runningDot: { width: 10, height: 10, borderRadius: 5 },
  runningText: { fontSize: 13, fontWeight: '600' },
  hint: {
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: Spacing.sm,
    marginTop: Spacing.xs,
  },
});
