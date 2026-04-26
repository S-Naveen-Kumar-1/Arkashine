// src/screens/test/ResultsScreen.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useSelector } from 'react-redux';
import { NutrientCard, AppButton, TopBar, Card } from '../components/common';
import useTheme, { getNutrientStatus } from '../hooks/useTheme';
import { Spacing, Typography, Radius, Shadow } from '../theme';

const NUTRIENTS = [
  {
    key: 'ph',
    label: 'pH',
    unit: '',
    icon: '🧪',
    desc: 'Soil acidity/alkalinity',
  },
  {
    key: 'ec',
    label: 'EC',
    unit: 'mS/cm',
    icon: '⚡',
    desc: 'Electrical conductivity',
  },
  {
    key: 'N',
    label: 'Nitrogen',
    unit: 'kg/ha',
    icon: '🌿',
    desc: 'Essential for leaf growth',
  },
  {
    key: 'P',
    label: 'Phosphorus',
    unit: 'kg/ha',
    icon: '🔴',
    desc: 'Root and flower development',
  },
  {
    key: 'K',
    label: 'Potassium',
    unit: 'kg/ha',
    icon: '🔵',
    desc: 'Overall plant health',
  },
];

export default function ResultsScreen({ navigation }) {
  const theme = useTheme();
  const T = theme.colors;
  const results = useSelector(s => s.test.results);
  const farmer = useSelector(s => s.farmer);

  if (!results) {
    return (
      <SafeAreaView style={[s.bg, { backgroundColor: T.bg }]}>
        <View style={s.center}>
          <Text style={{ fontSize: 48 }}>⚠️</Text>
          <Text
            style={[
              Typography.h4,
              { color: T.text, marginTop: 16, textAlign: 'center' },
            ]}
          >
            No results yet
          </Text>
          <AppButton
            label="Go Back"
            onPress={() => navigation.goBack()}
            color={T.primary}
            textColor="#fff"
            style={{ marginTop: 20 }}
          />
        </View>
      </SafeAreaView>
    );
  }

  // Overall soil health score
  const statuses = NUTRIENTS.map(n => getNutrientStatus(n.key, results[n.key]));
  const goodCount = statuses.filter(st => st.level === 'medium').length;
  const healthScore = Math.round((goodCount / NUTRIENTS.length) * 100);
  const healthColor =
    healthScore >= 70 ? T.primary : healthScore >= 40 ? T.yellow : T.red;

  return (
    <SafeAreaView style={[s.bg, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.bg} />
      <TopBar
        title="Soil Test Results"
        onBack={() => navigation.goBack()}
        rightIcon="📤"
        onRight={() => navigation.navigate('Report')}
        theme={theme}
      />

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Health score banner */}
        <View
          style={[
            s.scoreBanner,
            { backgroundColor: healthColor + '18', borderColor: healthColor },
          ]}
        >
          <View>
            <Text style={[s.scoreLabel, { color: T.textSub }]}>
              Soil Health Score
            </Text>
            <Text style={[s.scoreVal, { color: healthColor }]}>
              {healthScore}%
            </Text>
            <Text style={[s.scoreHint, { color: T.textSub }]}>
              {healthScore >= 70
                ? '✅ Good soil condition'
                : healthScore >= 40
                ? '⚠️ Needs improvement'
                : '❗ Poor — action needed'}
            </Text>
          </View>
          <Text style={{ fontSize: 56 }}>
            {healthScore >= 70 ? '🌱' : healthScore >= 40 ? '🌿' : '🍂'}
          </Text>
        </View>

        {/* Nutrient grid */}
        <Text style={[Typography.h4, { color: T.text, marginBottom: 12 }]}>
          Nutrient Analysis
        </Text>
        <View style={s.nutriGrid}>
          {NUTRIENTS.map(n => (
            <NutrientCard
              key={n.key}
              label={n.label}
              value={results[n.key]?.toFixed(
                n.key === 'ec' ? 3 : n.key === 'ph' ? 2 : 0,
              )}
              unit={n.unit}
              icon={n.icon}
              status={getNutrientStatus(n.key, results[n.key])}
              theme={theme}
            />
          ))}
        </View>

        {/* Detailed table */}
        <Text style={[Typography.h4, { color: T.text, marginBottom: 12 }]}>
          Detailed Report
        </Text>
        <Card theme={theme}>
          {NUTRIENTS.map((n, i) => {
            const val = results[n.key];
            const st = getNutrientStatus(n.key, val);
            return (
              <View
                key={n.key}
                style={[
                  s.tableRow,
                  i < NUTRIENTS.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: T.divider,
                  },
                ]}
              >
                <Text style={s.tableIcon}>{n.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.tableName, { color: T.text }]}>
                    {n.label}
                  </Text>
                  <Text style={[s.tableDesc, { color: T.muted }]}>
                    {n.desc}
                  </Text>
                </View>
                <Text style={[s.tableVal, { color: T.text }]}>
                  {val != null
                    ? val.toFixed(n.key === 'ec' ? 3 : n.key === 'ph' ? 2 : 0)
                    : '--'}{' '}
                  {n.unit}
                </Text>
                <View
                  style={[
                    s.statusPill,
                    { backgroundColor: st.color + '22', borderColor: st.color },
                  ]}
                >
                  <Text style={[s.statusText, { color: st.color }]}>
                    {st.label}
                  </Text>
                </View>
              </View>
            );
          })}
        </Card>

        {/* CTA buttons */}
        <AppButton
          label="View Recommendations"
          onPress={() => navigation.navigate('RecommendationsScreen')}
          color={T.primary}
          textColor="#fff"
          size="lg"
          icon="📋"
          style={{ marginBottom: 12 }}
        />
        <AppButton
          label="Download Report"
          onPress={() => navigation.navigate('Report')}
          color={T.blue}
          textColor="#fff"
          size="lg"
          icon="🖨️"
          style={{ marginBottom: 12 }}
        />
        <AppButton
          label="Save Farmer Details"
          onPress={() => navigation.navigate('FarmerDetailsScreen')}
          outlined
          color={T.primary}
          size="lg"
          icon="👨‍🌾"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: Spacing.lg, paddingBottom: 40 },
  scoreBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 18,
    marginBottom: 20,
  },
  scoreLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  scoreVal: { fontSize: 48, fontWeight: '900', letterSpacing: -1 },
  scoreHint: { fontSize: 13, marginTop: 4 },
  nutriGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
    marginBottom: 20,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  tableIcon: { fontSize: 22, width: 30 },
  tableName: { fontSize: 14, fontWeight: '700' },
  tableDesc: { fontSize: 11, marginTop: 1 },
  tableVal: {
    fontSize: 13,
    fontWeight: '700',
    minWidth: 80,
    textAlign: 'right',
  },
  statusPill: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
    minWidth: 60,
    alignItems: 'center',
  },
  statusText: { fontSize: 11, fontWeight: '800' },
});
