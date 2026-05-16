// src/screens/partner/SoilPartnerDashboardScreen.js
import React, { useCallback, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import useTheme from '../hooks/useTheme';
import { Radius, Shadow, Spacing } from '../theme';
import {
  MENU_ITEMS,
  MOCK_KPI,
  MOCK_PARTNER,
  MOCK_PAYMENTS,
  MOCK_SAMPLES,
  MOCK_VILLAGES,
  INCENTIVE_STRUCTURE,
  SAMPLE_LIFECYCLE,
} from './partnerConstants';
import {
  KPIMetricCard,
  PeriodTabs,
  ProgressBar,
  SecTitle,
  StatusBadge,
} from './PartnerComponents';

const { width: SW } = Dimensions.get('window');
const CARD_W = (SW - Spacing.md * 2 - 30) / 4;
const MENU_W = (SW - Spacing.md * 2 - 40) / 5;

// ── Sample status color helper ───────────────────────────────────────────────
function sampleColor(status) {
  const map = {
    collected: '#22C55E',
    packed: '#F59E0B',
    sent: '#3B82F6',
    received: '#A78BFA',
    tested: '#3B82F6',
    advisory_ready: '#A78BFA',
    delivered: '#22C55E',
  };
  return map[status] ?? '#94A3B8';
}

function sampleLabel(status) {
  const found = SAMPLE_LIFECYCLE.find(s => s.key === status);
  return found ? found.label : status;
}

// ─────────────────────────────────────────────────────────────────────────────
// KPI TODAY CARD  (with mini target bar)
// ─────────────────────────────────────────────────────────────────────────────
function KPITodayCard({ icon, label, value, target, color, T }) {
  const pct = target > 0 ? Math.min(value / target, 1) : 0;
  return (
    <View
      style={[
        ktc.card,
        { backgroundColor: T.card, borderColor: T.cardBorder, width: CARD_W },
        Shadow.sm,
      ]}
    >
      <Text style={ktc.icon}>{icon}</Text>
      <Text style={[ktc.value, { color }]}>{value}</Text>
      <Text style={[ktc.label, { color: T.muted }]}>{label}</Text>
      {target > 0 && (
        <>
          <View style={[ktc.bar, { backgroundColor: T.divider }]}>
            <View
              style={[
                ktc.fill,
                { width: `${pct * 100}%`, backgroundColor: color },
              ]}
            />
          </View>
          <Text style={[ktc.target, { color: T.muted }]}>/{target}</Text>
        </>
      )}
    </View>
  );
}
const ktc = StyleSheet.create({
  card: {
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1.5,
    padding: 10,
    gap: 3,
  },
  icon: { fontSize: 20 },
  value: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  label: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  bar: {
    width: '100%',
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
  },
  fill: { height: '100%', borderRadius: 2 },
  target: { fontSize: 9, fontWeight: '600' },
});

// ─────────────────────────────────────────────────────────────────────────────
// TARGET PROGRESS CARD
// ─────────────────────────────────────────────────────────────────────────────
function TargetCard({ icon, label, current, target, color, unit, T }) {
  const pct = Math.min(current / target, 1);
  const fmt = v => (unit === '₹' ? `₹${v.toLocaleString('en-IN')}` : String(v));
  return (
    <View
      style={[
        tgc.card,
        { backgroundColor: T.card, borderColor: T.cardBorder },
        Shadow.sm,
      ]}
    >
      <View style={tgc.row}>
        <Text style={tgc.icon}>{icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[tgc.label, { color: T.muted }]}>{label}</Text>
          <View style={tgc.valRow}>
            <Text style={[tgc.value, { color }]}>{fmt(current)}</Text>
            <Text style={[tgc.total, { color: T.muted }]}>
              {' '}
              / {fmt(target)}
            </Text>
          </View>
        </View>
        <Text style={[tgc.pct, { color }]}>{Math.round(pct * 100)}%</Text>
      </View>
      <ProgressBar pct={pct} color={color} T={T} height={7} />
    </View>
  );
}
const tgc = StyleSheet.create({
  card: {
    borderRadius: Radius.md,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  icon: { fontSize: 22 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  valRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 2 },
  value: { fontSize: 18, fontWeight: '900' },
  total: { fontSize: 13, fontWeight: '500' },
  pct: { fontSize: 16, fontWeight: '900' },
});

// ─────────────────────────────────────────────────────────────────────────────
// MENU ITEM
// ─────────────────────────────────────────────────────────────────────────────
function MenuItem({ item, onPress, T }) {
  return (
    <TouchableOpacity
      onPress={() => onPress(item)}
      activeOpacity={0.75}
      style={[
        mi.item,
        { backgroundColor: T.card, borderColor: T.cardBorder, width: MENU_W },
        Shadow.sm,
      ]}
    >
      <View style={[mi.iconWrap, { backgroundColor: item.color + '18' }]}>
        <Text style={mi.icon}>{item.icon}</Text>
      </View>
      <Text style={[mi.label, { color: T.text }]} numberOfLines={2}>
        {item.label}
      </Text>
    </TouchableOpacity>
  );
}
const mi = StyleSheet.create({
  item: {
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1.5,
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 7,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 22 },
  label: {
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// SAMPLE ROW
// ─────────────────────────────────────────────────────────────────────────────
function SampleRow({ item, onPress, T }) {
  const color = sampleColor(item.status);
  return (
    <TouchableOpacity
      onPress={() => onPress?.(item)}
      activeOpacity={0.75}
      style={[sr.row, { borderBottomColor: T.divider }]}
    >
      <View style={[sr.dot, { backgroundColor: color }]} />
      <View style={{ flex: 1 }}>
        <Text style={[sr.id, { color: T.muted }]}>{item.id}</Text>
        <Text style={[sr.farmer, { color: T.text }]}>{item.farmer}</Text>
        <Text style={[sr.village, { color: T.muted }]}>📍 {item.village}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 5 }}>
        <View style={[sr.badge, { backgroundColor: color + '22' }]}>
          <Text style={[sr.badgeTxt, { color }]}>
            {sampleLabel(item.status)}
          </Text>
        </View>
        <Text style={[sr.date, { color: T.muted }]}>{item.date}</Text>
      </View>
    </TouchableOpacity>
  );
}
const sr = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  id: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4, marginBottom: 2 },
  farmer: { fontSize: 14, fontWeight: '700' },
  village: { fontSize: 11, marginTop: 2 },
  badge: {
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeTxt: { fontSize: 10, fontWeight: '800' },
  date: { fontSize: 10 },
});

// ─────────────────────────────────────────────────────────────────────────────
// VILLAGE ROW
// ─────────────────────────────────────────────────────────────────────────────
function VillageRow({ item, T }) {
  const color = item.covered ? T.primary : T.warning;
  return (
    <View style={[vr.row, { borderBottomColor: T.divider }]}>
      <View style={[vr.dot, { backgroundColor: color }]} />
      <Text style={[vr.name, { color: T.text }]}>{item.name}</Text>
      <View style={vr.stats}>
        <Text style={[vr.stat, { color: T.muted }]}>👨‍🌾 {item.farmers}</Text>
        <Text style={[vr.stat, { color: T.muted }]}>🧪 {item.samples}</Text>
      </View>
      <View style={[vr.badge, { backgroundColor: color + '20' }]}>
        <Text style={[vr.badgeTxt, { color }]}>
          {item.covered ? 'Covered' : 'Pending'}
        </Text>
      </View>
    </View>
  );
}
const vr = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  name: { flex: 1, fontSize: 14, fontWeight: '700' },
  stats: { flexDirection: 'row', gap: 12 },
  stat: { fontSize: 12 },
  badge: {
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeTxt: { fontSize: 10, fontWeight: '800' },
});

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT TAB CONTENT
// ─────────────────────────────────────────────────────────────────────────────
function PaymentContent({ data, T }) {
  const rows = [
    {
      label: 'Soil Test Revenue',
      icon: '🌱',
      value: data.soil,
      color: T.primary,
    },
    { label: 'Device Revenue', icon: '🔬', value: data.device, color: T.blue },
    {
      label: 'Commission Revenue',
      icon: '💼',
      value: data.commission,
      color: T.yellow,
    },
    {
      label: 'Subscription',
      icon: '🔄',
      value: data.subscription,
      color: T.orange,
    },
  ];
  return (
    <View style={{ gap: 8 }}>
      {rows.map(r => (
        <View
          key={r.label}
          style={[
            pc.row,
            { backgroundColor: T.surface, borderColor: T.cardBorder },
          ]}
        >
          <Text style={pc.icon}>{r.icon}</Text>
          <Text style={[pc.label, { color: T.text }]}>{r.label}</Text>
          <Text style={[pc.value, { color: r.color }]}>
            ₹{r.value.toLocaleString('en-IN')}
          </Text>
        </View>
      ))}
      <View
        style={[
          pc.total,
          { backgroundColor: T.primaryDim, borderColor: T.primary + '44' },
        ]}
      >
        <Text style={[pc.totalLabel, { color: T.primary }]}>
          Total Earnings
        </Text>
        <Text style={[pc.totalValue, { color: T.primary }]}>
          ₹{data.total.toLocaleString('en-IN')}
        </Text>
      </View>
    </View>
  );
}
const pc = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    padding: 12,
  },
  icon: { fontSize: 18 },
  label: { flex: 1, fontSize: 13, fontWeight: '600' },
  value: { fontSize: 15, fontWeight: '900' },
  total: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1.5,
    padding: 14,
    marginTop: 4,
  },
  totalLabel: { fontSize: 14, fontWeight: '800' },
  totalValue: { fontSize: 20, fontWeight: '900' },
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
const PERIOD_OPTS = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
];

export default function SoilPartnerDashboardScreen({ navigation }) {
  const theme = useTheme();
  const T = theme.colors;
  const [payPeriod, setPayPeriod] = useState('today');

  const handleMenu = useCallback(
    item => {
      navigation?.navigate?.(item.screen);
    },
    [navigation],
  );

  const handleSamplePress = useCallback(
    sample => {
      navigation?.navigate?.('TrackSamples', { sampleId: sample.id });
    },
    [navigation],
  );

  const kpi = MOCK_KPI.today;
  const monthly = MOCK_KPI.monthly;
  const perf = MOCK_KPI.performance;

  return (
    <SafeAreaView style={[s.root, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.bg} />

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HERO ──────────────────────────────────────────────────────── */}
        <View
          style={[
            s.hero,
            { backgroundColor: T.card, borderColor: T.cardBorder },
            Shadow.md,
          ]}
        >
          <View
            style={[
              s.heroAvatar,
              { backgroundColor: T.primaryDim, borderColor: T.primary + '55' },
            ]}
          >
            <Text style={[s.heroInitial, { color: T.primary }]}>
              {MOCK_PARTNER.name.charAt(0)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={s.heroNameRow}>
              <Text style={[s.heroName, { color: T.text }]}>
                {MOCK_PARTNER.name}
              </Text>
              <View
                style={[
                  s.partnerBadge,
                  {
                    backgroundColor: T.primaryDim,
                    borderColor: T.primary + '55',
                  },
                ]}
              >
                <Text style={[s.partnerBadgeTxt, { color: T.primary }]}>
                  🌱 Soil Partner
                </Text>
              </View>
            </View>
            <Text style={[s.heroLoc, { color: T.muted }]}>
              📍 {MOCK_PARTNER.village}, {MOCK_PARTNER.district},{' '}
              {MOCK_PARTNER.state}
            </Text>
            <Text style={[s.heroId, { color: T.muted }]}>
              {MOCK_PARTNER.id}
            </Text>
            <View style={s.heroStats}>
              <Text style={[s.heroStat, { color: T.textSub }]}>
                👨‍🌾 {MOCK_PARTNER.farmerNetwork}
              </Text>
              <Text style={[s.heroStat, { color: T.textSub }]}>
                🏘️ {MOCK_PARTNER.activeVillages} villages
              </Text>
              <Text style={[s.heroStat, { color: T.muted }]}>
                Since {MOCK_PARTNER.joined}
              </Text>
            </View>
          </View>
        </View>

        {/* ── ALL-TIME STATS ────────────────────────────────────────────── */}
        <View style={s.allTimeRow}>
          {[
            {
              icon: '👨‍🌾',
              val: MOCK_KPI.allTime.farmers,
              lbl: 'Farmers',
              col: T.primary,
            },
            {
              icon: '🧪',
              val: MOCK_KPI.allTime.tests,
              lbl: 'Tests',
              col: T.blue,
            },
            {
              icon: '📄',
              val: MOCK_KPI.allTime.reports,
              lbl: 'Reports',
              col: T.yellow,
            },
            {
              icon: '⭐',
              val: MOCK_KPI.allTime.repeat,
              lbl: 'Repeat',
              col: T.orange,
            },
          ].map(m => (
            <View
              key={m.lbl}
              style={[
                s.allTimeCard,
                { backgroundColor: T.card, borderColor: T.cardBorder },
                Shadow.sm,
              ]}
            >
              <Text style={s.allTimeIcon}>{m.icon}</Text>
              <Text style={[s.allTimeVal, { color: m.col }]}>{m.val}</Text>
              <Text style={[s.allTimeLbl, { color: T.muted }]}>{m.lbl}</Text>
            </View>
          ))}
        </View>

        {/* ── TODAY'S KPIs ──────────────────────────────────────────────── */}
        <SecTitle
          title="Today's Activity"
          action="View All"
          onAction={() => navigation?.navigate?.('TrackSamples')}
          T={T}
        />
        <View style={s.kpiRow}>
          <KPITodayCard
            icon="🧪"
            label="Collected"
            value={kpi.collected}
            target={6}
            color={T.primary}
            T={T}
          />
          <KPITodayCard
            icon="🔬"
            label="Tested"
            value={kpi.tested}
            target={6}
            color={T.blue}
            T={T}
          />
          <KPITodayCard
            icon="⏳"
            label="Pending"
            value={kpi.pending}
            target={0}
            color={T.warning}
            T={T}
          />
          <KPITodayCard
            icon="📄"
            label="Delivered"
            value={kpi.delivered}
            target={6}
            color={T.orange}
            T={T}
          />
        </View>

        {/* ── MONTHLY TARGETS ───────────────────────────────────────────── */}
        <SecTitle title="Monthly Targets" T={T} />
        <TargetCard
          icon="🧪"
          label="Samples Collected"
          current={monthly.samples}
          target={monthly.samplesTarget}
          color={T.primary}
          T={T}
        />
        <TargetCard
          icon="👨‍🌾"
          label="Farmers Onboarded"
          current={monthly.farmers}
          target={monthly.farmersTarget}
          color={T.blue}
          T={T}
        />
        <TargetCard
          icon="💰"
          label="Revenue (₹)"
          current={monthly.revenue}
          target={monthly.revenueTarget}
          color={T.yellow}
          unit="₹"
          T={T}
        />

        {/* ── QUICK ACTIONS ─────────────────────────────────────────────── */}
        <SecTitle title="Quick Actions" T={T} />
        <View style={s.menuGrid}>
          {MENU_ITEMS.map(item => (
            <MenuItem key={item.key} item={item} onPress={handleMenu} T={T} />
          ))}
        </View>

        {/* ── RECENT SAMPLES ────────────────────────────────────────────── */}
        <SecTitle
          title="Recent Samples"
          action="Track All →"
          onAction={() => navigation?.navigate?.('TrackSamples')}
          T={T}
        />
        <View
          style={[
            s.card,
            { backgroundColor: T.card, borderColor: T.cardBorder },
            Shadow.sm,
          ]}
        >
          {MOCK_SAMPLES.map(item => (
            <SampleRow
              key={item.id}
              item={item}
              onPress={handleSamplePress}
              T={T}
            />
          ))}
        </View>

        {/* ── MY VILLAGES ───────────────────────────────────────────────── */}
        <SecTitle
          title="My Villages"
          action="See All →"
          onAction={() => navigation?.navigate?.('PartnerVillages')}
          T={T}
        />
        <View
          style={[
            s.card,
            { backgroundColor: T.card, borderColor: T.cardBorder },
            Shadow.sm,
          ]}
        >
          {MOCK_VILLAGES.slice(0, 5).map(v => (
            <VillageRow key={v.id} item={v} T={T} />
          ))}
        </View>

        {/* ── PAYMENT SUMMARY ───────────────────────────────────────────── */}
        <SecTitle
          title="Payment Summary"
          action="Details →"
          onAction={() => navigation?.navigate?.('PartnerPayments')}
          T={T}
        />
        <PeriodTabs
          value={payPeriod}
          onChange={setPayPeriod}
          options={PERIOD_OPTS}
          T={T}
        />
        <View
          style={[
            s.card,
            { backgroundColor: T.card, borderColor: T.cardBorder },
            Shadow.sm,
          ]}
        >
          <PaymentContent data={MOCK_PAYMENTS[payPeriod]} T={T} />
        </View>

        {/* ── PERFORMANCE SCORE ─────────────────────────────────────────── */}
        <SecTitle title="Performance Score" T={T} />
        <View
          style={[
            s.card,
            { backgroundColor: T.card, borderColor: T.cardBorder },
            Shadow.md,
          ]}
        >
          {[
            { label: 'Activity Score', score: perf.activity, color: T.primary },
            { label: 'Revenue Score', score: perf.revenue, color: T.blue },
            {
              label: 'Farmer Satisfaction Score',
              score: perf.satisfaction,
              color: T.yellow,
            },
          ].map(item => (
            <View key={item.label} style={s.perfRow}>
              <Text style={[s.perfLabel, { color: T.text }]}>{item.label}</Text>
              <View style={{ flex: 1, marginHorizontal: 10 }}>
                <ProgressBar
                  pct={item.score / 100}
                  color={item.color}
                  T={T}
                  height={7}
                />
              </View>
              <Text style={[s.perfScore, { color: item.color }]}>
                {item.score}
              </Text>
            </View>
          ))}
        </View>

        {/* ── INCENTIVE STRUCTURE ───────────────────────────────────────── */}
        <SecTitle title="Incentive Structure" T={T} />
        <View
          style={[
            s.incentiveCard,
            { backgroundColor: T.primaryDim, borderColor: T.primary + '55' },
          ]}
        >
          <Text style={[s.incentiveTitle, { color: T.primary }]}>
            🎯 Your Earnings Per Action
          </Text>
          {INCENTIVE_STRUCTURE.map(item => (
            <View
              key={item.label}
              style={[s.incentiveRow, { borderBottomColor: T.primary + '22' }]}
            >
              <Text style={[s.incentiveLabel, { color: T.primary + 'CC' }]}>
                {item.label}
              </Text>
              <Text style={[s.incentiveVal, { color: T.primary }]}>
                {item.value}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: Spacing.md, paddingBottom: 40 },

  hero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: Spacing.md,
  },
  heroAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInitial: { fontSize: 24, fontWeight: '900' },
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 3,
  },
  heroName: { fontSize: 17, fontWeight: '900' },
  partnerBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1.5,
  },
  partnerBadgeTxt: { fontSize: 10, fontWeight: '800' },
  heroLoc: { fontSize: 12, marginBottom: 2 },
  heroId: { fontSize: 10, marginBottom: 6 },
  heroStats: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  heroStat: { fontSize: 11, fontWeight: '600' },

  allTimeRow: { flexDirection: 'row', gap: 10, marginBottom: Spacing.md },
  allTimeCard: {
    flex: 1,
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1.5,
    paddingVertical: 12,
    gap: 4,
  },
  allTimeIcon: { fontSize: 18 },
  allTimeVal: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  allTimeLbl: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  kpiRow: { flexDirection: 'row', gap: 10, marginBottom: Spacing.lg },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.lg,
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: Spacing.lg,
  },

  perfRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  perfLabel: { fontSize: 12, fontWeight: '600', width: 140 },
  perfScore: { fontSize: 14, fontWeight: '900', width: 32, textAlign: 'right' },

  incentiveCard: {
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: Spacing.lg,
  },
  incentiveTitle: { fontSize: 14, fontWeight: '900', marginBottom: 12 },
  incentiveRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
  },
  incentiveLabel: { fontSize: 13, fontWeight: '500' },
  incentiveVal: { fontSize: 14, fontWeight: '900' },
});
