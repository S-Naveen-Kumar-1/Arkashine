// src/screens/test/PourScreen.js

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useDispatch, useSelector } from 'react-redux';
import { testPourDetected, startSettleTimer } from '../redux/actions';
import { AppButton, TopBar } from '../components/common';
import useTheme from '../hooks/useTheme';
import { Spacing, Radius, Typography, Shadow } from '../theme';

export default function PourScreen({ navigation }) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const T = theme.colors;
  const { pourDetected } = useSelector(s => s.test);

  // ✅ FIX: persist animated values
  const dropAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 💧 Drop animation (smooth + realistic)
    Animated.loop(
      Animated.sequence([
        Animated.timing(dropAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(dropAnim, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // 🔵 Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.4,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  useEffect(() => {
    if (pourDetected) navigation.replace('TimerScreen');
  }, [pourDetected]);

  const simulatePour = () => {
    dispatch(testPourDetected());
    dispatch(startSettleTimer());
    navigation.replace('TimerScreen');
  };

  const dropY = dropAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-10, 40],
  });

  return (
    <SafeAreaView style={[s.container, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.bg} />

      <TopBar
        title="Pour Sample"
        onBack={() => navigation.goBack()}
        theme={theme}
      />

      <View style={s.wrapper}>
        {/* 💧 DEVICE VISUAL */}
        <View
          style={[
            s.deviceBox,
            {
              backgroundColor: theme.dark ? T.surface : '#FFFFFF',
              borderColor: T.cardBorder,
            },
            Shadow.md,
          ]}
        >
          <Text style={s.deviceEmoji}>🧫</Text>

          <Animated.Text
            style={[s.dropEmoji, { transform: [{ translateY: dropY }] }]}
          >
            💧
          </Animated.Text>

          <Text style={[s.deviceLabel, { color: T.textSub }]}>
            SOILENZ Device
          </Text>
        </View>

        {/* 📋 INSTRUCTION */}
        <View
          style={[
            s.instructionCard,
            {
              backgroundColor: theme.dark ? 'rgba(34,197,94,0.12)' : '#DCFCE7',
              borderColor: T.primary,
            },
          ]}
        >
          <Text style={s.instrIcon}>⬇️</Text>

          <Text
            style={[Typography.h3, { color: T.primary, textAlign: 'center' }]}
          >
            Pour the Solution
          </Text>

          <Text style={[s.instrText, { color: T.textSub }]}>
            Pour the prepared solution (5g soil + 40ml extractant) into the
            SOILENZ device opening
          </Text>
        </View>

        {/* ⏳ WAITING STATE */}
        <View
          style={[
            s.waitCard,
            {
              backgroundColor: theme.dark ? T.surface : '#FFFFFF',
              borderColor: T.cardBorder,
            },
            Shadow.sm,
          ]}
        >
          <Animated.View
            style={[
              s.pulseDot,
              {
                backgroundColor: T.yellow,
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />

          <View style={{ flex: 1 }}>
            <Text style={[s.waitTitle, { color: T.text }]}>
              Waiting for detection...
            </Text>
            <Text style={[s.waitSub, { color: T.muted }]}>
              Device will auto-detect the poured solution
            </Text>
          </View>
        </View>

        {/* 🧪 DEV BUTTON */}
        <AppButton
          label="Simulate Pour"
          onPress={simulatePour}
          color={T.primary}
          textColor={T.primary}
          outlined
          style={{
            marginTop: 28,
            backgroundColor: T.primaryDim,
            borderColor: T.primary,
            opacity: 0.9,
          }}
        />
      </View>
    </SafeAreaView>
  );
}

/* ================= STYLES ================= */

const s = StyleSheet.create({
  container: { flex: 1 },

  wrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },

  deviceBox: {
    width: 180,
    height: 180,
    borderRadius: 30,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
  },

  deviceEmoji: {
    fontSize: 70,
  },

  dropEmoji: {
    position: 'absolute',
    top: -20,
    fontSize: 34,
  },

  deviceLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },

  instructionCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  },

  instrIcon: {
    fontSize: 36,
    marginBottom: 10,
  },

  instrText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },

  waitCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },

  pulseDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  waitTitle: {
    fontSize: 14,
    fontWeight: '700',
  },

  waitSub: {
    fontSize: 12,
    marginTop: 2,
  },
});
