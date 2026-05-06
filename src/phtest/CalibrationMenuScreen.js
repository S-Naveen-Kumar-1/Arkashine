// src/screens/phtest/CalibrationMenuScreen.js
// Choose between pH calibration and EC calibration

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { Radius, Spacing, Typography } from '../theme';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TopBar } from '../components/common';
import useTheme from '../hooks/useTheme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function CalibrationMenuScreen({ navigation }) {
  const theme = useTheme();
  const T = theme.colors;
  const OPTIONS = [
    {
      id: 'ph',
      icon: 'ph',
      label: 'pH Calibration',
      desc: '3-point calibration using buffer solutions pH 4, 7 & 9',
      color: T.primary,
      points: 'pH 4 · pH 7 · pH 9',
      screen: 'PHCalibrationScreen',
    },
    {
      id: 'ec',
      icon: 'lightning-bolt',
      label: 'EC Calibration',
      desc: '3-point calibration using standard conductivity solutions',
      color: T.primary,
      points: '0.0 · 1.413 · 12.88 dS/m',
      screen: 'ECCalibrationScreen',
    },
  ];

  return (
    <SafeAreaView style={[s.container, { backgroundColor: T.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />

      <TopBar
        title="Calibration"
        onBack={() => navigation.goBack()}
        theme={theme}
      />

      <View style={s.body}>
        <Text style={[s.heading, { color: T.primary }]}>
          Select Calibration Type
        </Text>
        <Text style={[s.sub, { color: T.text }]}>
          Calibrate pH first, then EC for best results
        </Text>

        {OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.id}
            style={[s.card, { backgroundColor: T.card, borderColor: T.border }]}
            onPress={() => navigation.replace(opt.screen)}
            activeOpacity={0.8}
          >
            {/* Left accent bar */}
            <View style={[s.accent, { backgroundColor: opt.color }]} />

            <View
              style={[
                s.iconWrap,
                {
                  backgroundColor: opt.color + '22',
                  borderColor: opt.color + '44',
                },
              ]}
            >
              <Icon name={opt.icon} size={28} color={opt.color} />
            </View>

            <View style={s.cardBody}>
              <Text style={[s.cardTitle, { color: T.white }]}>{opt.label}</Text>
              <Text style={[s.cardDesc, { color: T.text }]}>{opt.desc}</Text>
              <View
                style={[
                  s.pointsChip,
                  {
                    backgroundColor: opt.color + '18',
                    borderColor: opt.color + '55',
                  },
                ]}
              >
                <Text style={[s.pointsText, { color: opt.color }]}>
                  {opt.points}
                </Text>
              </View>
            </View>

            <Icon name="chevron-right" size={22} color={T.muted} />
          </TouchableOpacity>
        ))}

        {/* Full calibration shortcut */}
        <TouchableOpacity
          style={[
            s.fullBtn,
            { backgroundColor: T.primaryGlow, borderColor: T.primary },
          ]}
          onPress={() =>
            navigation.replace('PHCalibrationScreen', { fullFlow: true })
          }
          activeOpacity={0.8}
        >
          <Icon name="play-circle-outline" size={22} color={T.primary} />
          <Text style={[s.fullBtnText, { color: T.primary }]}>
            Run Full Calibration (pH + EC)
          </Text>
        </TouchableOpacity>

        <Text style={[s.note, { color: T.muted }]}>
          💡 Calibration data is saved to the device and used as reference for
          all future tests
        </Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  body: {
    flex: 1,
    padding: Spacing.lg,
  },
  heading: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  sub: {
    fontSize: 14,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: 14,
    overflow: 'hidden',
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: Radius.lg,
    borderBottomLeftRadius: Radius.lg,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  cardDesc: { fontSize: 13, lineHeight: 18, marginBottom: 8 },
  pointsChip: {
    alignSelf: 'flex-start',
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pointsText: { fontSize: 11, fontWeight: '700' },
  fullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: Radius.lg,
    borderWidth: 1,
    height: 52,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  fullBtnText: { fontSize: 15, fontWeight: '800' },
  note: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
});