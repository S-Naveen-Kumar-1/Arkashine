// src/screens/test/IntroScreen.js

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { testReset } from '../redux/actions/soilsaathiActions';
import { AppButton, TopBar } from '../components/common';
import { Spacing, Radius, Shadow, Typography } from '../theme';
import useTheme from '../hooks/useTheme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
const STEPS = [
  {
    icon: 'sprout',
    text: 'Take 5g of soil sample from the test area',
  },
  {
    icon: 'flask-outline',
    text: 'Add 40ml extractant solution to the sample',
  },
  {
    icon: 'sync',
    text: 'Mix properly for 2 minutes until dissolved',
  },
  {
    icon: 'test-tube',
    text: 'Pour the solution into the SOILENZ device',
  },
];

export default function IntroScreen({ navigation }) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const T = theme.colors;

  const handleStart = () => {
    dispatch(testReset());
    navigation.replace('PourScreen');
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.bg} />

      <TopBar
        title="New Soil Test"
        onBack={() => navigation.goBack()}
        rightIcon={theme.dark ? '☀️' : '🌙'}
        theme={theme}
      />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} bounces={false}>
        {/* HERO */}
        <View
          style={[
            s.hero,
            {
              backgroundColor: theme.dark ? 'rgba(34,197,94,0.08)' : '#ECFDF5',
              borderColor: T.cardBorder,
            },
            Shadow.md,
          ]}
        >
          {/* Badge */}
          <View style={[s.badge, { backgroundColor: T.primary }]}>
            <Text style={s.badgeText}>SOILENZ DEVICE</Text>
          </View>

          <Icon name="leaf" size={24} color={T.primary} />

          <Text
            style={[
              Typography.h3,
              { color: T.text, textAlign: 'center', marginTop: 4 },
            ]}
          >
            Soil Testing Made Easy
          </Text>

          <Text
            style={[
              Typography.small,
              {
                color: T.textSub,
                textAlign: 'center',
                marginTop: 2,
                paddingHorizontal: 10,
              },
            ]}
          >
            Accurate nutrient analysis using your SOILENZ device
          </Text>
        </View>

        {/* SECTION TITLE */}
        <Text
          style={[Typography.h4, { color: T.text, marginBottom: Spacing.xs }]}
        >
          How it works
        </Text>

        {/* STEPS */}
        {STEPS.map((st, i) => (
          <View
            key={i}
            style={[
              s.stepCard,
              {
                backgroundColor: theme.dark ? T.surface : '#FFFFFF',
                borderColor: T.cardBorder,
              },
              Shadow.sm,
            ]}
          >
            {/* Step Number */}
            <View
              style={[
                s.stepNum,
                {
                  backgroundColor: T.primary,
                  borderColor: T.primary,
                },
              ]}
            >
              <Text style={s.stepNumText}>{i + 1}</Text>
            </View>

            {/* Step Content */}
            <View
              style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
            >
              <Icon
                name={st.icon}
                size={18}
                color={T.primary}
                style={{ marginRight: 8 }}
              />

              <Text style={[s.stepText, { color: T.text, flex: 1 }]}>
                {st.text}
              </Text>
            </View>
          </View>
        ))}

        {/* SPEC BOX */}
        <View
          style={[
            s.specBox,
            {
              backgroundColor: theme.dark ? 'rgba(34,197,94,0.12)' : '#DCFCE7',
              borderColor: T.primary,
            },
          ]}
        >
          <Text style={[s.specTitle, { color: T.primary }]}>
            Solution Ratio
          </Text>

          <View style={s.specRow}>
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <Icon name="shovel" size={16} color={T.primary} />
              <Text style={[s.specItem, { color: T.text }]}>
                Soil: <Text style={s.bold}>5g</Text>
              </Text>
            </View>

            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <Icon name="water" size={16} color={T.primary} />
              <Text style={[s.specItem, { color: T.text }]}>
                Extractant: <Text style={s.bold}>40ml</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* CTA */}
        <AppButton
          label="Start Soil Test"
          onPress={handleStart}
          color={T.primary}
          textColor="#fff"
          size="lg"
          icon="🚀"
          style={[
            s.cta,
            {
              shadowColor: T.primary,
            },
          ]}
        />

        {/* FOOTER NOTE */}
        <Text style={[s.hint, { color: T.muted }]}>
          Ensure your SOILENZ device is powered on and nearby
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ================= STYLES ================= */

const s = StyleSheet.create({
  container: { flex: 1 },

  scroll: {
    padding: 10,
    paddingBottom: 12,
  },

  hero: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 8,
  },

  heroEmoji: {
    fontSize: 48, // ↓ reduced from 64
  },

  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    marginBottom: 6,
  },

  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },

  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 8,
    marginBottom: 6,
    gap: 8,
  },

  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  stepNumText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 12,
  },

  stepText: {
    fontSize: 13, // ↓ reduced
    lineHeight: 18,
  },

  specBox: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 8,
    marginTop: 2,
    marginBottom: 8,
  },

  specTitle: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
  },

  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  specItem: {
    fontSize: 13,
  },

  bold: {
    fontWeight: '900',
  },

  cta: {
    marginTop: 2,
    borderRadius: Radius.lg,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },

  hint: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
});
