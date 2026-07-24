// src/screens/test/CalibrationResultScreen.js

import React from 'react';
import { View, Text, StyleSheet, StatusBar, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppButton, TopBar } from '../components/common';
import useTheme from '../hooks/useTheme';
import { Spacing, Radius, Shadow, Typography } from '../theme';

const NUTRIENT_LABELS = {
  OC: 'Organic Carbon',
  N: 'Nitrogen',
  P: 'Phosphorous',
  K: 'Potassium',
  Ca: 'Calcium',
  Mg: 'Magnesium',
  S: 'Sulphur',
  Fe: 'Iron',
  Mn: 'Manganese',
  Cu: 'Copper',
  Zn: 'Zinc',
  B: 'Boron',
};

const POINT_LABELS = { blank: 'Blank', min: 'Min', mid: 'Mid', max: 'Max' };
const POINT_ORDER = ['blank', 'min', 'mid', 'max'];

function formatVals(values) {
  if (!Array.isArray(values) || values.length === 0) return '—';
  const shown = values.slice(0, 5).map(v => {
    const num = Number(v);
    return Number.isFinite(num) ? num.toFixed(2) : String(v);
  });
  const more = values.length > 5 ? ` +${values.length - 5} more` : '';
  return shown.join(', ') + more;
}

export default function CalibrationResultScreen({ navigation, route }) {
  const theme = useTheme();
  const T = theme.colors;

  const session = route?.params?.session ?? [];

  const byNutrient = {};
  session.forEach(entry => {
    if (!byNutrient[entry.nutrient]) byNutrient[entry.nutrient] = {};
    byNutrient[entry.nutrient][entry.point] = entry;
  });
  const nutrientKeys = Object.keys(byNutrient);

  const savedCount = session.filter(e => e.saved).length;
  const totalCount = session.length;
  const allOk = totalCount > 0 && savedCount === totalCount;

  const now = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <SafeAreaView style={[s.root, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.bg} />
      <TopBar
        title="Calibration Result"
        onBack={() => navigation.goBack()}
        theme={theme}
      />

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            s.summaryCard,
            {
              backgroundColor: allOk
                ? T.primaryDim
                : savedCount > 0
                ? '#FEF3C7'
                : '#FEE2E2',
              borderColor: allOk
                ? T.primary
                : savedCount > 0
                ? T.yellow
                : T.red,
            },
          ]}
        >
          <View
            style={[
              s.summaryIcon,
              {
                backgroundColor: allOk
                  ? T.primary
                  : savedCount > 0
                  ? T.yellow
                  : T.red,
              },
            ]}
          >
            <Icon
              name={allOk ? 'check-bold' : savedCount > 0 ? 'alert' : 'close'}
              size={22}
              color="#fff"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[Typography.h3, { color: T.text }]}>
              {allOk
                ? 'Calibration Complete'
                : savedCount > 0
                ? 'Partially Completed'
                : 'Calibration Failed'}
            </Text>
            <Text style={[s.summarySub, { color: T.textSub }]}>
              {savedCount}/{totalCount} points saved · {nutrientKeys.length}{' '}
              nutrient{nutrientKeys.length === 1 ? '' : 's'}
            </Text>
            <Text style={[s.summaryDate, { color: T.muted }]}>{now}</Text>
          </View>
        </View>

        {nutrientKeys.length === 0 && (
          <View
            style={[
              s.emptyCard,
              { backgroundColor: T.card, borderColor: T.cardBorder },
            ]}
          >
            <Text style={[s.emptyTxt, { color: T.muted }]}>
              No calibration results to display.
            </Text>
          </View>
        )}

        {nutrientKeys.map(nut => {
          const points = byNutrient[nut];
          const nutSaved = POINT_ORDER.filter(p => points[p]?.saved).length;
          const nutTotal = POINT_ORDER.filter(p => points[p]).length;
          return (
            <View
              key={nut}
              style={[
                s.nutGroup,
                { backgroundColor: T.card, borderColor: T.cardBorder },
                Shadow.sm,
              ]}
            >
              <View style={s.nutGroupHead}>
                <View
                  style={[
                    s.nutBadge,
                    {
                      backgroundColor:
                        nutSaved === nutTotal ? T.primary : T.yellow,
                    },
                  ]}
                >
                  <Text style={s.nutBadgeTxt}>{nut}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.nutGroupTitle, { color: T.text }]}>
                    {NUTRIENT_LABELS[nut] ?? nut}
                  </Text>
                  <Text style={[s.nutGroupSub, { color: T.textSub }]}>
                    {nutSaved}/{nutTotal} points saved
                  </Text>
                </View>
              </View>

              {POINT_ORDER.filter(p => points[p]).map(p => {
                const r = points[p];
                return (
                  <View
                    key={p}
                    style={[
                      s.row,
                      {
                        borderColor: r.saved ? T.primary + '55' : T.red + '55',
                        backgroundColor: T.bg,
                      },
                    ]}
                  >
                    <Text style={[s.rowPointLabel, { color: T.text }]}>
                      {POINT_LABELS[p]}
                    </Text>
                    <View style={{ flex: 1 }}>
                      {r.saved ? (
                        <Text style={[s.rowVals, { color: T.textSub }]}>
                          {formatVals(r.values)}
                        </Text>
                      ) : (
                        <Text style={[s.rowErr, { color: T.red }]}>
                          {r.error ?? 'Failed to save'}
                        </Text>
                      )}
                    </View>
                    <Icon
                      name={r.saved ? 'check-circle' : 'close-circle'}
                      size={18}
                      color={r.saved ? T.primary : T.red}
                    />
                  </View>
                );
              })}
            </View>
          );
        })}

        <AppButton
          label="Calibrate More"
          onPress={() => navigation.goBack()}
          color={T.primary}
          textColor="#fff"
          style={{ marginTop: Spacing.lg }}
        />
        <AppButton
          label="Done"
          onPress={() => navigation.popToTop()}
          color={T.primary}
          textColor={T.primary}
          outlined
          style={{ marginTop: Spacing.sm }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: Spacing.lg, paddingBottom: 40 },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: 16,
    marginBottom: Spacing.lg,
  },
  summaryIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summarySub: { fontSize: 12, marginTop: 2, fontWeight: '600' },
  summaryDate: { fontSize: 11, marginTop: 4 },
  emptyCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
  },
  emptyTxt: { fontSize: 13, fontStyle: 'italic' },
  nutGroup: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  nutGroupHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  
  nutBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nutBadgeTxt: { color: '#fff', fontSize: 11, fontWeight: '900' },
  nutGroupTitle: { fontSize: 13, fontWeight: '800' },
  nutGroupSub: { fontSize: 11, marginTop: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: 10,
    marginTop: 6,
  },
  rowPointLabel: { fontSize: 12, fontWeight: '800', width: 42 },
  rowVals: { fontSize: 11 },
  rowErr: { fontSize: 11, fontWeight: '600' },
});
