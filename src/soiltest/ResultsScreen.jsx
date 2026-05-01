// src/soiltest/ResultsScreen.jsx
// Shows soil-test results from Redux test.results (ph, ec, voltage from BLE).
// Extended nutrients (N, P, K, etc.) show N/A when not sent by the device.

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { NutrientCard, AppButton, TopBar, Card } from '../components/common';
import useTheme, { getNutrientStatus } from '../hooks/useTheme';
import { Spacing, Typography, Radius } from '../theme';
import { TEST_SAVED } from '../config/actionTypes';

// ─── Nutrient definitions ─────────────────────────────────────────────────────
const NUTRIENTS = [
  { key: 'ph',  label: 'pH',         unit: '',       icon: '🧪', desc: 'Soil acidity / alkalinity' },
  { key: 'ec',  label: 'EC',         unit: 'dS/m',   icon: '⚡', desc: 'Electrical conductivity' },
  { key: 'N',   label: 'Nitrogen',   unit: 'kg/ha',  icon: '🌿', desc: 'Essential for leaf growth' },
  { key: 'P',   label: 'Phosphorus', unit: 'kg/ha',  icon: '🔴', desc: 'Root and flower development' },
  { key: 'K',   label: 'Potassium',  unit: 'kg/ha',  icon: '🔵', desc: 'Overall plant health' },
  { key: 'Ca',  label: 'Calcium',    unit: 'meq/100g', icon: '🟤', desc: 'Cell wall strength' },
  { key: 'Mg',  label: 'Magnesium',  unit: 'meq/100g', icon: '🟢', desc: 'Chlorophyll production' },
  { key: 'S',   label: 'Sulphur',    unit: 'ppm',    icon: '🟡', desc: 'Protein synthesis' },
  { key: 'Zn',  label: 'Zinc',       unit: 'ppm',    icon: '⚪', desc: 'Enzyme activation' },
  { key: 'oc',  label: 'Organic C',  unit: '%',      icon: '🍂', desc: 'Soil organic matter' },
];

export default function ResultsScreen({ navigation }) {
  const dispatch = useDispatch();
  const theme    = useTheme();
  const T        = theme.colors;

  const results = useSelector(s => s.test.results);

  // Save to history once when this screen mounts with real results
  const savedRef = React.useRef(false);
  React.useEffect(() => {
    if (results && !savedRef.current) {
      savedRef.current = true;
      dispatch({ type: TEST_SAVED });
    }
  }, [results, dispatch]);

  if (!results) {
    return (
      <SafeAreaView style={[s.bg, { backgroundColor: T.bg }]}>
        <StatusBar barStyle="light-content" backgroundColor={T.bg} />
        <TopBar title="Soil Results" onBack={() => navigation.goBack()} theme={theme} />
        <View style={s.empty}>
          <Icon name="alert-circle-outline" size={56} color={T.warning} />
          <Text style={[s.emptyTitle, { color: T.warning }]}>No results yet</Text>
          <Text style={[s.emptySub, { color: T.muted }]}>
            Complete the soil test sensor phase first
          </Text>
          <AppButton
            label="Go Back"
            onPress={() => navigation.goBack()}
            color={T.primary}
            textColor="#fff"
            style={{ marginTop: 20, width: '70%' }}
          />
        </View>
      </SafeAreaView>
    );
  }

  // Health score from nutrients we actually have
  const scored = NUTRIENTS.filter(n => results[n.key] != null);
  const good   = scored.filter(n => getNutrientStatus(n.key, results[n.key]).level === 'medium').length;
  const healthScore  = scored.length ? Math.round((good / scored.length) * 100) : 0;
  const healthColor  = healthScore >= 70 ? T.primary : healthScore >= 40 ? '#F59E0B' : '#EF4444';

  return (
    <SafeAreaView style={[s.bg, { backgroundColor: T.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <TopBar
        title="Soil Test Results"
        onBack={() => navigation.goBack()}
        rightIcon="📤"
        onRight={() => navigation.navigate('ReportScreen')}
        theme={theme}
      />

      <ScrollView contentContainerStyle={s.scroll}>

        {/* ── Health score banner ─────────────────────────────── */}
        <View style={[s.scoreBanner, { backgroundColor: healthColor + '18', borderColor: healthColor }]}>
          <View>
            <Text style={[s.scoreLabel, { color: T.textSub }]}>Soil Health Score</Text>
            <Text style={[s.scoreVal,   { color: healthColor }]}>{healthScore}%</Text>
            <Text style={[s.scoreHint,  { color: T.textSub }]}>
              {healthScore >= 70 ? '✅ Good soil condition'
                : healthScore >= 40 ? '⚠️ Needs improvement'
                : scored.length === 0 ? 'ℹ️ pH & EC measured — more nutrients need device upgrade'
                : '❗ Poor — action needed'}
            </Text>
          </View>
          <Text style={{ fontSize: 56 }}>
            {healthScore >= 70 ? '🌱' : healthScore >= 40 ? '🌿' : '🍂'}
          </Text>
        </View>

        {/* ── Timestamp + raw BLE payload ──────────────────────── */}
        {results.timestamp && (
          <View style={[s.tsRow, { borderColor: T.border }]}>
            <Icon name="clock-outline" size={13} color={T.muted} />
            <Text style={[s.tsText, { color: T.muted }]}>
              Measured {new Date(results.timestamp).toLocaleTimeString()}
            </Text>
            {results.raw ? (
              <Text style={[s.rawText, { color: T.muted }]} numberOfLines={1}>
                raw: {results.raw}
              </Text>
            ) : null}
          </View>
        )}

        {/* ── Nutrient grid ─────────────────────────────────────── */}
        <Text style={[Typography.h4, { color: T.text, marginBottom: 12 }]}>
          Nutrient Analysis
        </Text>
        <View style={s.nutriGrid}>
          {NUTRIENTS.map(n => (
            <NutrientCard
              key={n.key}
              label={n.label}
              value={results[n.key] != null
                ? results[n.key].toFixed(n.key === 'ec' ? 3 : n.key === 'ph' ? 2 : n.key === 'oc' ? 2 : 0)
                : null}
              unit={n.unit}
              icon={n.icon}
              status={getNutrientStatus(n.key, results[n.key])}
              theme={theme}
            />
          ))}
        </View>

        {/* ── Detailed table ───────────────────────────────────── */}
        <Text style={[Typography.h4, { color: T.text, marginBottom: 12 }]}>
          Detailed Report
        </Text>
        <Card theme={theme}>
          {NUTRIENTS.map((n, i) => {
            const val = results[n.key];
            const st  = getNutrientStatus(n.key, val);
            return (
              <View
                key={n.key}
                style={[
                  s.tableRow,
                  i < NUTRIENTS.length - 1 && { borderBottomWidth: 1, borderBottomColor: T.border },
                ]}
              >
                <Text style={s.tableIcon}>{n.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.tableName, { color: T.text }]}>{n.label}</Text>
                  <Text style={[s.tableDesc, { color: T.muted }]}>{n.desc}</Text>
                </View>
                <Text style={[s.tableVal, { color: T.text }]}>
                  {val != null
                    ? `${val.toFixed(n.key === 'ec' ? 3 : n.key === 'ph' ? 2 : n.key === 'oc' ? 2 : 0)} ${n.unit}`
                    : '— N/A'}
                </Text>
                <View style={[s.statusPill, { backgroundColor: st.color + '22', borderColor: st.color }]}>
                  <Text style={[s.statusText, { color: st.color }]}>{st.label}</Text>
                </View>
              </View>
            );
          })}
        </Card>

        {/* ── CTA buttons ──────────────────────────────────────── */}
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
          label="Full Report"
          onPress={() => navigation.navigate('ReportScreen')}
          color="#3B82F6"
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
  bg:     { flex: 1 },
  empty:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '800', marginTop: 16 },
  emptySub:   { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  scroll: { padding: Spacing.lg, paddingBottom: 40 },
  scoreBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 18,
    marginBottom: 16,
  },
  scoreLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  scoreVal:   { fontSize: 44, fontWeight: '900', letterSpacing: -1 },
  scoreHint:  { fontSize: 12, marginTop: 4 },
  tsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 8,
    marginBottom: 16,
  },
  tsText:    { fontSize: 11, flex: 1 },
  rawText:   { fontSize: 10, flex: 2, fontFamily: 'Courier' },
  nutriGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5, marginBottom: 20 },
  tableRow:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 10 },
  tableIcon: { fontSize: 20, width: 28 },
  tableName: { fontSize: 14, fontWeight: '700' },
  tableDesc: { fontSize: 11, marginTop: 1 },
  tableVal:  { fontSize: 12, fontWeight: '700', minWidth: 80, textAlign: 'right' },
  statusPill: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
    minWidth: 56,
    alignItems: 'center',
  },
  statusText: { fontSize: 10, fontWeight: '800' },
});
