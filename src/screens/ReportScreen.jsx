// src/screens/ReportScreen.jsx
// Full soil-test report: farmer info, BLE results, per-nutrient status,
// recommendations summary, and language selector.

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { TopBar } from '../components/common';
import useTheme, {
  getNutrientStatus,
  getRecommendations,
  LANGUAGES,
} from '../hooks/useTheme';
import { Spacing, Radius } from '../theme';
import { REPORT_LANGUAGE_SET } from '../config/actionTypes';

// ─── Nutrients shown in the report ───────────────────────────────────────────
const REPORT_NUTRIENTS = [
  { key: 'ph', label: 'pH', unit: '', icon: 'ph' },
  { key: 'ec', label: 'EC', unit: 'dS/m', icon: 'lightning-bolt' },
  { key: 'N', label: 'Nitrogen', unit: 'kg/ha', icon: 'leaf' },
  { key: 'P', label: 'Phosphorus', unit: 'kg/ha', icon: 'circle' },
  { key: 'K', label: 'Potassium', unit: 'kg/ha', icon: 'water' },
  { key: 'Ca', label: 'Calcium', unit: 'meq/100g', icon: 'molecule' },
  { key: 'Mg', label: 'Magnesium', unit: 'meq/100g', icon: 'atom' },
  { key: 'S', label: 'Sulphur', unit: 'ppm', icon: 'fire' },
  { key: 'Zn', label: 'Zinc', unit: 'ppm', icon: 'hexagon-outline' },
  { key: 'oc', label: 'Organic C', unit: '%', icon: 'leaf-maple' },
];

export default function ReportScreen({ navigation }) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const T = theme.colors;

  const results = useSelector(s => s.test.results);
  const farmer = useSelector(s => s.farmer);
  const language = useSelector(s => s.report.language);
  const testCount = useSelector(s => s.test.testCount);

  const [langOpen, setLangOpen] = useState(false);

  const recs = getRecommendations(results, farmer.crop);

  // ── helpers ────────────────────────────────────────────────
  function fmt(key, val) {
    if (val == null) return '—';
    if (key === 'ph') return val.toFixed(2);
    if (key === 'ec') return val.toFixed(3);
    if (key === 'oc') return val.toFixed(2);
    return val.toFixed(0);
  }

  const typeColors = {
    fertilizer: '#22C55E',
    water: '#3B82F6',
    check: '#F59E0B',
    spray: '#A78BFA',
    amendment: '#F97316',
  };

  return (
    <SafeAreaView style={[s.bg, { backgroundColor: T.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <TopBar
        title="Soil Test Report"
        onBack={() => navigation.goBack()}
        theme={theme}
      />

      <ScrollView contentContainerStyle={s.scroll}>
        {/* ── Language selector ─────────────────────────────── */}
        <View style={[s.langRow, { borderColor: T.cardBorder }]}>
          <Icon name="translate" size={16} color={T.muted} />
          <Text style={[s.langLabel, { color: T.muted }]}>Language:</Text>
          <TouchableOpacity
            style={[
              s.langPill,
              { borderColor: T.primary, backgroundColor: T.primaryDim },
            ]}
            onPress={() => setLangOpen(v => !v)}
          >
            <Text style={[s.langPillText, { color: T.primary }]}>
              {language}
            </Text>
            <Icon
              name={langOpen ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={T.primary}
            />
          </TouchableOpacity>
        </View>
        {langOpen && (
          <View
            style={[
              s.langList,
              { backgroundColor: T.card, borderColor: T.cardBorder },
            ]}
          >
            {LANGUAGES.map(lang => (
              <TouchableOpacity
                key={lang}
                style={[s.langItem, { borderBottomColor: T.cardBorder }]}
                onPress={() => {
                  dispatch({ type: REPORT_LANGUAGE_SET, payload: lang });
                  setLangOpen(false);
                }}
              >
                <Text
                  style={[
                    s.langItemText,
                    { color: lang === language ? T.primary : T.text },
                  ]}
                >
                  {lang}
                </Text>
                {lang === language && (
                  <Icon name="check" size={14} color={T.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Report header ─────────────────────────────────── */}
        <View
          style={[
            s.headerCard,
            { backgroundColor: T.card, borderColor: T.cardBorder },
          ]}
        >
          <View style={[s.headerIconRing, { backgroundColor: T.primaryDim }]}>
            <Icon name="file-chart" size={28} color={T.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.headerTitle, { color: T.primary }]}>
              ArkaShine Soil Report
            </Text>
            <Text style={[s.headerSub, { color: T.muted }]}>
              {results?.timestamp
                ? new Date(results.timestamp).toLocaleString()
                : 'Date not available'}
              {'  ·  '}Test #{testCount}
            </Text>
          </View>
        </View>

        {/* ── Farmer section ────────────────────────────────── */}
        <SectionTitle icon="account" label="Farmer Details" T={T} />
        <View
          style={[
            s.infoCard,
            { backgroundColor: T.card, borderColor: T.cardBorder },
          ]}
        >
          <InfoRow
            icon="account-outline"
            label="Name"
            value={farmer.name || '—'}
            T={T}
          />
          <InfoRow
            icon="phone-outline"
            label="Phone"
            value={farmer.phone || '—'}
            T={T}
          />
          <InfoRow
            icon="sprout-outline"
            label="Crop"
            value={farmer.crop || '—'}
            T={T}
          />
          <InfoRow
            icon="map-marker-outline"
            label="Location"
            value={farmer.location?.address || '—'}
            T={T}
            last
          />
        </View>

        {/* ── Test results ──────────────────────────────────── */}
        <SectionTitle icon="flask-outline" label="Test Results" T={T} />
        <View
          style={[
            s.infoCard,
            { backgroundColor: T.card, borderColor: T.cardBorder },
          ]}
        >
          {REPORT_NUTRIENTS.map((n, i) => {
            const val = results?.[n.key] ?? null;
            const st = getNutrientStatus(n.key, val);
            return (
              <View
                key={n.key}
                style={[
                  s.nutriRow,
                  i < REPORT_NUTRIENTS.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: T.cardBorder,
                  },
                ]}
              >
                <Icon
                  name={n.icon}
                  size={16}
                  color={st.color}
                  style={{ width: 22 }}
                />
                <Text style={[s.nutriName, { color: T.text }]}>{n.label}</Text>
                <Text
                  style={[s.nutriVal, { color: T.text, fontFamily: 'Courier' }]}
                >
                  {fmt(n.key, val)}
                  {val != null && n.unit ? ` ${n.unit}` : ''}
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
        </View>

        {/* ── Raw BLE payload ───────────────────────────────── */}
        {results?.raw ? (
          <View
            style={[
              s.rawCard,
              {
                backgroundColor: T.surface ?? T.card,
                borderColor: T.cardBorder,
              },
            ]}
          >
            <Icon name="code-json" size={13} color={T.muted} />
            <Text style={[s.rawLabel, { color: T.muted }]}>
              BLE raw payload:
            </Text>
            <Text style={[s.rawVal, { color: T.text, fontFamily: 'Courier' }]}>
              {results.raw}
            </Text>
          </View>
        ) : null}

        {/* ── Recommendations ───────────────────────────────── */}
        <SectionTitle
          icon="lightbulb-outline"
          label={`Recommendations${farmer.crop ? ` — ${farmer.crop}` : ''}`}
          T={T}
        />
        {recs.length === 0 ? (
          <View style={[s.emptyRec, { borderColor: T.cardBorder }]}>
            <Text style={[s.emptyRecText, { color: T.muted }]}>
              {results
                ? 'All nutrient levels are adequate.'
                : 'Run a soil test to get recommendations.'}
            </Text>
          </View>
        ) : (
          recs.map((r, i) => (
            <View
              key={i}
              style={[
                s.recRow,
                {
                  backgroundColor: T.card,
                  borderColor: T.cardBorder,
                  borderLeftColor: typeColors[r.type] ?? T.primary,
                },
              ]}
            >
              <View
                style={[
                  s.recDayBadge,
                  { backgroundColor: (typeColors[r.type] ?? T.primary) + '22' },
                ]}
              >
                <Text
                  style={[s.recDay, { color: typeColors[r.type] ?? T.primary }]}
                >
                  Day {r.day}
                </Text>
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[s.recAction, { color: T.text }]}>
                  {r.icon} {r.action}
                </Text>
                <Text style={[s.recQty, { color: T.muted }]}>{r.qty}</Text>
              </View>
            </View>
          ))
        )}

        {/* ── Footer note ───────────────────────────────────── */}
        <View style={[s.footerNote, { borderColor: T.cardBorder }]}>
          <Icon name="information-outline" size={14} color={T.muted} />
          <Text style={[s.footerText, { color: T.muted }]}>
            Generated by ArkaShine · BLE device: automatic UUID detection ·
            Values from live sensor readings
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────
function SectionTitle({ icon, label, T }) {
  return (
    <View style={s.sectionTitle}>
      <Icon name={icon} size={16} color={T.primary} />
      <Text style={[s.sectionTitleText, { color: T.primary }]}>{label}</Text>
    </View>
  );
}

function InfoRow({ icon, label, value, T, last }) {
  return (
    <View
      style={[
        s.infoRow,
        !last && { borderBottomWidth: 1, borderBottomColor: T.cardBorder },
      ]}
    >
      <Icon name={icon} size={15} color={T.muted} style={{ width: 22 }} />
      <Text style={[s.infoLabel, { color: T.muted }]}>{label}</Text>
      <Text style={[s.infoValue, { color: T.text }]}>{value}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  bg: { flex: 1 },
  scroll: { padding: Spacing.md, paddingBottom: 40 },

  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 10,
    marginBottom: 12,
  },
  langLabel: { fontSize: 12, fontWeight: '700', flex: 1 },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  langPillText: { fontSize: 13, fontWeight: '800' },
  langList: {
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  langItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
  },
  langItemText: { fontSize: 14 },

  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  headerIconRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '900' },
  headerSub: { fontSize: 11, marginTop: 2 },

  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    marginTop: 4,
  },
  sectionTitleText: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  infoCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
  },
  infoLabel: { fontSize: 12, fontWeight: '700', width: 72 },
  infoValue: { fontSize: 13, flex: 1 },

  nutriRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
  },
  nutriName: { fontSize: 13, fontWeight: '700', flex: 1 },
  nutriVal: {
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
    minWidth: 54,
    alignItems: 'center',
  },
  statusText: { fontSize: 10, fontWeight: '800' },

  rawCard: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 10,
    marginBottom: Spacing.md,
  },
  rawLabel: { fontSize: 11, fontWeight: '700' },
  rawVal: { fontSize: 11, flex: 1 },

  recRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: 12,
    marginBottom: 8,
  },
  recDayBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 56,
    alignItems: 'center',
  },
  recDay: { fontSize: 12, fontWeight: '800' },
  recAction: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  recQty: { fontSize: 13 },

  emptyRec: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 16,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  emptyRecText: { fontSize: 13, textAlign: 'center' },

  footerNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 12,
    marginTop: 8,
  },
  footerText: { fontSize: 11, flex: 1, lineHeight: 16 },
});
