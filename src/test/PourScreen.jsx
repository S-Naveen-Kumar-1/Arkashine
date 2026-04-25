// src/screens/test/PourScreen.js
import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Animated,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { testPourDetected, startSettleTimer } from '../store/actions';
import { AppButton, TopBar } from '../components/common';
import useTheme from '../hooks/useTheme';
import { Spacing, Radius, Typography } from '../theme';

export default function PourScreen({ navigation }) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const T = theme.colors;
  const { pourDetected } = useSelector(s => s.test);
  const dropAnim = new Animated.Value(0);

  useEffect(() => {
    // Animate drop
    Animated.loop(
      Animated.sequence([
        Animated.timing(dropAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(dropAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  useEffect(() => {
    if (pourDetected) navigation.replace('Timer');
  }, [pourDetected]);

  // Simulate hardware pour signal (in real app, comes from BLE)
  const simulatePour = () => {
    dispatch(testPourDetected());
    dispatch(startSettleTimer());
    navigation.replace('TimerScreen');
  };

  const dropY = dropAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 30],
  });

  return (
    <SafeAreaView style={[s.bg, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.bg} />
      <TopBar
        title="Pour Sample"
        onBack={() => navigation.goBack()}
        theme={theme}
      />

      <View style={s.center}>
        {/* Illustration */}
        <View
          style={[
            s.deviceBox,
            { backgroundColor: T.card, borderColor: T.cardBorder },
          ]}
        >
          <Text style={s.deviceEmoji}>🧫</Text>
          <Animated.Text
            style={[s.dropEmoji, { transform: [{ translateY: dropY }] }]}
          >
            💧
          </Animated.Text>
          <Text style={s.deviceLabel}>SOILENZ Device</Text>
        </View>

        <View
          style={[
            s.instrCard,
            { backgroundColor: T.primaryDim, borderColor: T.primary },
          ]}
        >
          <Text style={s.instrIcon}>⬇️</Text>
          <Text
            style={[Typography.h3, { color: T.primary, textAlign: 'center' }]}
          >
            Pour the prepared solution
          </Text>
          <Text style={[s.instrSub, { color: T.textSub }]}>
            Pour the pH-EC bottle solution (5gm soil + 40ml extractant) into the
            SOILENZ device opening
          </Text>
        </View>

        <View
          style={[
            s.waitBox,
            { backgroundColor: T.card, borderColor: T.cardBorder },
          ]}
        >
          <Animated.View
            style={[
              s.pulseDot,
              { backgroundColor: T.yellow, transform: [{ scale: dropAnim }] },
            ]}
          />
          <Text style={[s.waitText, { color: T.textSub }]}>
            Waiting for hardware signal...
          </Text>
          <Text style={[s.waitHint, { color: T.muted }]}>
            The device will detect when solution is poured
          </Text>
        </View>

        {/* Dev helper — remove in production */}
        <AppButton
          label="Simulate Pour (Dev)"
          onPress={simulatePour}
          color={T.blue}
          textColor="#fff"
          outlined
          style={{ marginTop: 24 }}
        />
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
  deviceBox: {
    width: 160,
    height: 160,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  deviceEmoji: { fontSize: 60 },
  dropEmoji: { position: 'absolute', top: -30, fontSize: 32 },
  deviceLabel: { fontSize: 12, fontWeight: '700', marginTop: 6 },
  instrCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  instrIcon: { fontSize: 36, marginBottom: 10 },
  instrSub: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  waitBox: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  pulseDot: { width: 12, height: 12, borderRadius: 6 },
  waitText: { fontSize: 14, fontWeight: '700', flex: 1 },
  waitHint: { fontSize: 12, marginTop: 2 },
});

// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
