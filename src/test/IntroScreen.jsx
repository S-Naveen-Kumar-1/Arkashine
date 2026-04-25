// src/screens/test/IntroScreen.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { testReset, toggleTheme } from '../store/actions';
import { AppButton, TopBar } from '../components/common';
import { Spacing, Radius, Shadow, Typography } from '../theme';
import useTheme from '../hooks/useTheme';

const STEPS = [
  {
    icon: '🌱',
    step: 'Step 1',
    text: 'Take 5g of soil sample from the test area',
  },
  {
    icon: '⚗️',
    step: 'Step 2',
    text: 'Add 40ml extractant solution to the sample',
  },
  {
    icon: '🔄',
    step: 'Step 3',
    text: 'Mix properly for 2 minutes until dissolved',
  },
  {
    icon: '🧪',
    step: 'Step 4',
    text: 'Pour the solution into the SOILENZ device',
  },
];

export default function IntroScreen({ navigation }) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const T = theme.colors;

  const handleStart = () => {
    dispatch(testReset());
    navigation.navigate('PourScreen');
  };

  return (
    <SafeAreaView style={[s.bg, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.bg} />
      <TopBar
        title="New Soil Test"
        onBack={() => navigation.goBack()}
        rightIcon={theme.dark ? '☀️' : '🌙'}
        onRight={() => dispatch(toggleTheme())}
        theme={theme}
      />
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Hero illustration */}
        <View
          style={[
            s.hero,
            { backgroundColor: T.primaryDim, borderColor: T.cardBorder },
          ]}
        >
          <Text style={s.heroEmoji}>🌾</Text>
          <Text
            style={[
              Typography.h2,
              { color: T.primary, textAlign: 'center', marginTop: 8 },
            ]}
          >
            Soil Testing{'\n'}Made Easy
          </Text>
          <Text style={[s.heroSub, { color: T.textSub }]}>
            SOILENZ connects to your hardware device via Bluetooth and provides
            accurate soil nutrient analysis
          </Text>
        </View>

        {/* Steps */}
        <Text style={[Typography.h4, { color: T.text, marginBottom: 14 }]}>
          How it works
        </Text>
        {STEPS.map((st, i) => (
          <View
            key={i}
            style={[
              s.stepCard,
              { backgroundColor: T.card, borderColor: T.cardBorder },
              Shadow.sm,
            ]}
          >
            <View
              style={[
                s.stepNum,
                { backgroundColor: T.primaryDim, borderColor: T.primary },
              ]}
            >
              <Text style={s.stepEmoji}>{st.icon}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={[s.stepLabel, { color: T.primary }]}>{st.step}</Text>
              <Text style={[s.stepText, { color: T.text }]}>{st.text}</Text>
            </View>
          </View>
        ))}

        {/* Mixture spec box */}
        <View
          style={[
            s.specBox,
            { backgroundColor: T.primaryDim, borderColor: T.primary },
          ]}
        >
          <Text style={s.specTitle}>📋 Solution Specification</Text>
          <View style={s.specRow}>
            <Text style={s.specItem}>
              🪨 Soil sample: <Text style={{ fontWeight: '900' }}>5 grams</Text>
            </Text>
            <Text style={s.specItem}>
              💧 Extractant: <Text style={{ fontWeight: '900' }}>40 ml</Text>
            </Text>
          </View>
        </View>

        <AppButton
          label="Start Test"
          onPress={handleStart}
          color={T.primary}
          textColor="#fff"
          size="lg"
          icon="🚀"
          style={{ marginTop: 8 }}
        />
        <Text style={[s.hint, { color: T.muted }]}>
          Make sure your SOILENZ device is powered on and nearby
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1 },
  scroll: { padding: Spacing.lg, paddingBottom: 40 },
  hero: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  heroEmoji: { fontSize: 64 },
  heroSub: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  stepNum: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepEmoji: { fontSize: 24 },
  stepLabel: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  stepText: { fontSize: 14, lineHeight: 20 },
  specBox: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 14,
    marginBottom: Spacing.lg,
  },
  specTitle: { fontSize: 13, fontWeight: '800', marginBottom: 8 },
  specRow: { flexDirection: 'row', gap: 20 },
  specItem: { fontSize: 14 },
  hint: { fontSize: 12, textAlign: 'center', marginTop: 10 },
});
