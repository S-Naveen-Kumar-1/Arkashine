// src/screens/test/CalibrationResultScreen.js
//
// Shows the outcome of a calibration batch: which nutrients were saved
// successfully for the chosen calibration point (BLANK / MIN / MID / MAX),
// which failed, and the raw values that were written to the device.
//
// Navigated to from CalibrationScreen with params:
//   { point: 'blank'|'min'|'mid'|'max', nutrients: string[], results: {
//       [nutrientKey]: { saved: bool, values?: number[], error?: string|null }
//   } }

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
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

  // Fall back to redux state if params weren't passed for some reason
  const reduxCal = useSelector(st => st.soilsaathi);

  const point = route?.params?.point ?? reduxCal.calibrationPoint ?? '—';
  const nutrients =
    route?.params?.nutrients ?? reduxCal.calibrationNutrients ?? [];
  const results = route?.params?.results ?? reduxCal.calibrationResults ?? {};

  const rows = nutrients.map(key => ({
    key,
    label: NUTRIENT_LABELS[key] ?? key,
    ...(results[key] ?? { saved: false, values: null, error: 'No response' }),
  }));

  const savedCount = rows.filter(r => r.saved).length;
  const totalCount = rows.length;
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
        {/* ── SUMMARY CARD ──────────────────────────────────────────────── */}
        <View
          style={[
            s.summaryCard,
            {
              backgroundColor: allOk
                ? T.primaryDim
                : savedCount > 0
                ? theme.dark
                  ? 'rgba(245,158,11,0.12)'
                  : '#FEF3C7'
                : theme.dark
                ? 'rgba(239,68,68,0.12)'
                : '#FEE2E2',
              borderColor: allOk ? T.primary : savedCount > 0 ? T.yellow : T.red,
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
              {savedCount}/{totalCount} nutrients saved · Point:{' '}
              {POINT_LABELS[point] ?? point}
            </Text>
            <Text style={[s.summaryDate, { color: T.muted }]}>{now}</Text>
          </View>
        </View>

        {/* ── PER-NUTRIENT RESULTS ──────────────────────────────────────── */}
        <Text
          style={[Typography.h4, { color: T.text, marginBottom: Spacing.sm }]}
        >
          Nutrient Details
        </Text>

        {rows.length === 0 && (
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

        {rows.map(r => (
          <View
            key={r.key}
            style={[
              s.row,
              {
                backgroundColor: T.card,
                borderColor: r.saved ? T.primary + '55' : T.red + '55',
              },
              Shadow.sm,
            ]}
          >
            <View
              style={[
                s.rowBadge,
                { backgroundColor: r.saved ? T.primary : T.red },
              ]}
            >
              <Text style={s.rowBadgeTxt}>{r.key}</Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[s.rowLabel, { color: T.text }]}>{r.label}</Text>
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
              size={20}
              color={r.saved ? T.primary : T.red}
            />
          </View>
        ))}

        {/* ── ACTIONS ───────────────────────────────────────────────────── */}
        <AppButton
          label="Calibrate Another Point"
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

/* ================= STYLES ================= */

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

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    padding: 12,
    marginBottom: 8,
  },
  rowBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBadgeTxt: { color: '#fff', fontSize: 12, fontWeight: '900' },
  rowLabel: { fontSize: 13, fontWeight: '700' },
  rowVals: { fontSize: 11, marginTop: 2 },
  rowErr: { fontSize: 11, marginTop: 2, fontWeight: '600' },
});