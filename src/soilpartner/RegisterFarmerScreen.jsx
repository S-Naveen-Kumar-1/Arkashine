// src/screens/partner/RegisterFarmerScreen.js
import React, { useCallback, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import useTheme from '../../hooks/useTheme';
import { Radius, Shadow, Spacing } from '../../theme';
import {
  CROPS,
  FARMER_STATUSES,
  MOCK_VILLAGES,
  SEASONS,
} from './partnerConstants';
import {
  BottomNavBar,
  Field,
  InfoBanner,
  OptionPicker,
  SectionCard,
  StepHeader,
} from './PartnerComponents';

export function RegisterFarmerScreen({ navigation }) {
  const theme = useTheme();
  const T = theme.colors;
  const scrollRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);

  const [farmerName, setFarmerName] = useState('');
  const [mobile, setMobile] = useState('');
  const [village, setVillage] = useState('');
  const [land, setLand] = useState('');
  const [crop, setCrop] = useState('');
  const [season, setSeason] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');

  const villageOptions = MOCK_VILLAGES.map(v => v.name);

  const handleSubmit = useCallback(async () => {
    if (!farmerName.trim()) {
      Alert.alert('Required', 'Enter farmer name.');
      return;
    }
    if (mobile.length !== 10) {
      Alert.alert('Invalid', '10-digit mobile required.');
      return;
    }
    if (!village) {
      Alert.alert('Required', 'Select a village.');
      return;
    }
    if (!land.trim()) {
      Alert.alert('Required', 'Enter land area.');
      return;
    }
    if (!crop) {
      Alert.alert('Required', 'Select a crop.');
      return;
    }
    if (!season) {
      Alert.alert('Required', 'Select a season.');
      return;
    }

    setSubmitting(true);
    const payload = {
      name: farmerName,
      mobile,
      village,
      land: parseFloat(land),
      crop,
      season,
      latitude: parseFloat(lat) || 0,
      longitude: parseFloat(lng) || 0,
      status: 'registered',
      registeredAt: new Date().toISOString(),
    };
    console.log('[RegisterFarmer] Payload:', JSON.stringify(payload, null, 2));
    // TODO: dispatch(registerFarmer(payload))
    setTimeout(() => {
      setSubmitting(false);
      Alert.alert(
        '✅ Farmer Registered!',
        `${farmerName} has been registered successfully.`,
        [
          { text: 'Done', onPress: () => navigation?.goBack?.() },
          {
            text: 'Register Another',
            onPress: () => {
              setFarmerName('');
              setMobile('');
              setVillage('');
              setLand('');
              setCrop('');
              setSeason('');
              setLat('');
              setLng('');
            },
          },
        ],
      );
    }, 1200);
  }, [farmerName, mobile, village, land, crop, season, lat, lng, navigation]);

  return (
    <SafeAreaView style={[s.root, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.bg} />
      <View style={[s.topBar, { borderBottomColor: T.divider }]}>
        <TouchableOpacity
          onPress={() => navigation?.goBack?.()}
          style={s.backBtn}
          activeOpacity={0.75}
        >
          <Text style={[s.backArrow, { color: T.text }]}>←</Text>
        </TouchableOpacity>
        <Text style={[s.topTitle, { color: T.text }]}>Register Farmer</Text>
        <View
          style={[
            s.badge,
            { backgroundColor: T.primaryDim, borderColor: T.primary + '55' },
          ]}
        >
          <Text style={[s.badgeTxt, { color: T.primary }]}>👨‍🌾 New</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[s.scroll, { paddingBottom: 130 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <StepHeader
            icon="👨‍🌾"
            title="Farmer Registration"
            subtitle="Register a new farmer in your territory"
            T={T}
          />

          <SectionCard T={T}>
            <Field
              label="Farmer Name"
              value={farmerName}
              onChangeText={setFarmerName}
              placeholder="Full name"
              required
              T={T}
            />
            <Field
              label="Mobile Number"
              value={mobile}
              onChangeText={setMobile}
              placeholder="10-digit mobile"
              required
              keyboardType="phone-pad"
              maxLength={10}
              T={T}
            />
          </SectionCard>

          <SectionCard T={T}>
            <OptionPicker
              label="Village"
              value={village}
              options={villageOptions}
              onSelect={setVillage}
              required
              T={T}
            />
            <Field
              label="Land Area (acres)"
              value={land}
              onChangeText={setLand}
              placeholder="e.g. 2.5"
              keyboardType="decimal-pad"
              required
              T={T}
            />
            <OptionPicker
              label="Crop"
              value={crop}
              options={CROPS}
              onSelect={setCrop}
              required
              T={T}
            />
            <OptionPicker
              label="Season"
              value={season}
              options={SEASONS}
              onSelect={setSeason}
              required
              T={T}
            />
          </SectionCard>

          <SectionCard T={T}>
            <Text style={[s.secLabel, { color: T.textSub }]}>
              📍 Geo-location (optional)
            </Text>
            <Text style={[s.secHint, { color: T.muted }]}>
              GPS coordinates of the farm. Use device GPS or enter manually.
            </Text>
            <View style={s.geoRow}>
              <View style={{ flex: 1 }}>
                <Field
                  label="Latitude"
                  value={lat}
                  onChangeText={setLat}
                  placeholder="e.g. 15.3542"
                  keyboardType="decimal-pad"
                  T={T}
                />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Field
                  label="Longitude"
                  value={lng}
                  onChangeText={setLng}
                  placeholder="e.g. 76.1549"
                  keyboardType="decimal-pad"
                  T={T}
                />
              </View>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                s.gpsBtn,
                { backgroundColor: T.surface, borderColor: T.cardBorder },
              ]}
              onPress={() =>
                Alert.alert('GPS', 'Enable location to auto-fill coordinates.')
              }
            >
              <Text style={[s.gpsBtnTxt, { color: T.primary }]}>
                📡 Use Current GPS Location
              </Text>
            </TouchableOpacity>
          </SectionCard>

          {/* Status Flow */}
          <SectionCard T={T}>
            <Text style={[s.secLabel, { color: T.textSub }]}>
              Farmer Journey Stages
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={s.stageRow}>
                {FARMER_STATUSES.map((st, i) => (
                  <React.Fragment key={st.key}>
                    <View
                      style={[
                        s.stageItem,
                        {
                          borderColor: i === 1 ? T.primary : T.cardBorder,
                          backgroundColor: i === 1 ? T.primaryDim : T.surface,
                        },
                      ]}
                    >
                      <Text style={s.stageIcon}>{st.icon}</Text>
                      <Text
                        style={[
                          s.stageLbl,
                          { color: i === 1 ? T.primary : T.muted },
                        ]}
                        numberOfLines={2}
                      >
                        {st.label}
                      </Text>
                    </View>
                    {i < FARMER_STATUSES.length - 1 && (
                      <Text style={[s.stageArrow, { color: T.muted }]}>›</Text>
                    )}
                  </React.Fragment>
                ))}
              </View>
            </ScrollView>
            <Text style={[s.secHint, { color: T.muted, marginTop: 8 }]}>
              New registration starts at "Registered" stage. Status updates
              automatically as soil test progresses.
            </Text>
          </SectionCard>

          <InfoBanner
            icon="📋"
            text="After registration, collect a soil sample from this farmer's field and submit for testing."
            color={T.primary}
            T={T}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomNavBar
        step={1}
        totalSteps={1}
        onNext={handleSubmit}
        nextLabel="✅ Register Farmer"
        loading={submitting}
        T={T}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: { fontSize: 22, fontWeight: '300' },
  topTitle: { flex: 1, fontSize: 16, fontWeight: '800' },
  badge: {
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1.5,
  },
  badgeTxt: { fontSize: 11, fontWeight: '800' },
  scroll: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  secLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  secHint: { fontSize: 12, lineHeight: 17 },
  geoRow: { flexDirection: 'row' },
  gpsBtn: {
    borderRadius: Radius.md,
    borderWidth: 1.5,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  gpsBtnTxt: { fontSize: 14, fontWeight: '700' },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  stageItem: {
    alignItems: 'center',
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    paddingVertical: 8,
    paddingHorizontal: 8,
    width: 72,
  },
  stageIcon: { fontSize: 16, marginBottom: 4 },
  stageLbl: {
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 13,
  },
  stageArrow: { fontSize: 18, fontWeight: '300', paddingHorizontal: 2 },
});

// ═════════════════════════════════════════════════════════════════════════════
// TRACK SAMPLES SCREEN
// ═════════════════════════════════════════════════════════════════════════════
import { MOCK_SAMPLES as SAMPLES } from './partnerConstants';
import {
  SampleStepper,
  EmptyState,
  SecTitle as SecT,
} from './PartnerComponents';

export function TrackSamplesScreen({ navigation, route }) {
  const theme = useTheme();
  const T = theme.colors;
  const [selected, setSelected] = useState(
    route?.params?.sampleId
      ? SAMPLES.find(s => s.id === route.params.sampleId)
      : null,
  );
  const [filter, setFilter] = useState('all');

  const filters = ['all', 'collected', 'sent', 'tested', 'delivered'];
  const filtered =
    filter === 'all' ? SAMPLES : SAMPLES.filter(s => s.status === filter);

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

  return (
    <SafeAreaView style={[ts.root, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.bg} />
      <View style={[ts.topBar, { borderBottomColor: T.divider }]}>
        <TouchableOpacity
          onPress={() =>
            selected ? setSelected(null) : navigation?.goBack?.()
          }
          style={ts.backBtn}
          activeOpacity={0.75}
        >
          <Text style={[ts.backArrow, { color: T.text }]}>←</Text>
        </TouchableOpacity>
        <Text style={[ts.topTitle, { color: T.text }]}>
          {selected ? selected.id : 'Track Samples'}
        </Text>
      </View>

      {selected ? (
        // ── Detail View ────────────────────────────────────────────────────
        <ScrollView
          contentContainerStyle={ts.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              ts.detailCard,
              { backgroundColor: T.card, borderColor: T.cardBorder },
              Shadow.md,
            ]}
          >
            <View style={ts.detailRow}>
              <Text style={[ts.detailLabel, { color: T.muted }]}>
                Sample ID
              </Text>
              <Text style={[ts.detailValue, { color: T.primary }]}>
                {selected.id}
              </Text>
            </View>
            <View style={ts.detailRow}>
              <Text style={[ts.detailLabel, { color: T.muted }]}>Farmer</Text>
              <Text style={[ts.detailValue, { color: T.text }]}>
                {selected.farmer}
              </Text>
            </View>
            <View style={ts.detailRow}>
              <Text style={[ts.detailLabel, { color: T.muted }]}>Village</Text>
              <Text style={[ts.detailValue, { color: T.text }]}>
                📍 {selected.village}
              </Text>
            </View>
            <View style={ts.detailRow}>
              <Text style={[ts.detailLabel, { color: T.muted }]}>Date</Text>
              <Text style={[ts.detailValue, { color: T.text }]}>
                {selected.date}
              </Text>
            </View>
          </View>

          <View
            style={[
              ts.stepperCard,
              { backgroundColor: T.card, borderColor: T.cardBorder },
              Shadow.sm,
            ]}
          >
            <Text style={[ts.stepperTitle, { color: T.text }]}>
              Sample Lifecycle
            </Text>
            <SampleStepper currentStatus={selected.status} T={T} />
          </View>

          {/* Delivery tracking */}
          <View
            style={[
              ts.deliveryCard,
              { backgroundColor: T.card, borderColor: T.cardBorder },
              Shadow.sm,
            ]}
          >
            <Text style={[ts.stepperTitle, { color: T.text }]}>
              Advisory Delivery Tracking
            </Text>
            {[
              {
                label: 'Report Sent',
                done: ['advisory_ready', 'delivered'].includes(selected.status),
                icon: '📄',
              },
              {
                label: 'WhatsApp Delivered',
                done: selected.status === 'delivered',
                icon: '💬',
              },
              {
                label: 'Printed Copy',
                done: selected.status === 'delivered',
                icon: '🖨️',
              },
              {
                label: 'Advisory Explained',
                done: selected.status === 'delivered',
                icon: '🗣️',
              },
            ].map(item => (
              <View
                key={item.label}
                style={[ts.deliveryRow, { borderBottomColor: T.divider }]}
              >
                <View
                  style={[
                    ts.deliveryDot,
                    { backgroundColor: item.done ? T.primary : T.cardBorder },
                  ]}
                >
                  {item.done ? (
                    <Text
                      style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}
                    >
                      ✓
                    </Text>
                  ) : null}
                </View>
                <Text style={ts.deliveryIcon}>{item.icon}</Text>
                <Text
                  style={[
                    ts.deliveryLabel,
                    { color: item.done ? T.text : T.muted },
                  ]}
                >
                  {item.label}
                </Text>
                <Text
                  style={[
                    ts.deliveryStatus,
                    { color: item.done ? T.primary : T.muted },
                  ]}
                >
                  {item.done ? 'Done' : 'Pending'}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      ) : (
        // ── List View ──────────────────────────────────────────────────────
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={ts.filtersScroll}
            contentContainerStyle={{
              gap: 8,
              paddingHorizontal: Spacing.md,
              paddingVertical: 8,
            }}
          >
            {filters.map(f => (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                activeOpacity={0.75}
                style={[
                  ts.filterChip,
                  {
                    backgroundColor: filter === f ? T.primary : T.card,
                    borderColor: filter === f ? T.primary : T.cardBorder,
                  },
                ]}
              >
                <Text
                  style={[
                    ts.filterTxt,
                    { color: filter === f ? '#fff' : T.muted },
                  ]}
                >
                  {f === 'all' ? '📦 All' : sampleLabel(f)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView
            contentContainerStyle={ts.scroll}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={[
                ts.listCard,
                { backgroundColor: T.card, borderColor: T.cardBorder },
                Shadow.sm,
              ]}
            >
              {filtered.length === 0 ? (
                <EmptyState
                  icon="📦"
                  title="No samples found"
                  subtitle="No samples match this filter."
                  T={T}
                />
              ) : (
                filtered.map(item => {
                  const color = sampleColor(item.status);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => setSelected(item)}
                      activeOpacity={0.75}
                      style={[ts.sampleRow, { borderBottomColor: T.divider }]}
                    >
                      <View
                        style={[ts.sampleDot, { backgroundColor: color }]}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={[ts.sampleId, { color: T.muted }]}>
                          {item.id}
                        </Text>
                        <Text style={[ts.sampleFarmer, { color: T.text }]}>
                          {item.farmer}
                        </Text>
                        <Text style={[ts.sampleVillage, { color: T.muted }]}>
                          📍 {item.village}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <View
                          style={[
                            ts.statusBadge,
                            { backgroundColor: color + '22' },
                          ]}
                        >
                          <Text style={[ts.statusTxt, { color }]}>
                            {sampleLabel(item.status)}
                          </Text>
                        </View>
                        <Text style={[ts.sampleDate, { color: T.muted }]}>
                          {item.date}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}

const ts = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: { fontSize: 22, fontWeight: '300' },
  topTitle: { flex: 1, fontSize: 16, fontWeight: '800' },
  filtersScroll: { maxHeight: 54 },
  filterChip: {
    borderRadius: Radius.full,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filterTxt: { fontSize: 12, fontWeight: '700' },
  scroll: { padding: Spacing.md },
  listCard: { borderRadius: Radius.lg, borderWidth: 1.5, padding: 16 },
  sampleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  sampleDot: { width: 10, height: 10, borderRadius: 5 },
  sampleId: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  sampleFarmer: { fontSize: 14, fontWeight: '700' },
  sampleVillage: { fontSize: 11, marginTop: 2 },
  statusBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  statusTxt: { fontSize: 10, fontWeight: '800' },
  sampleDate: { fontSize: 10 },
  detailCard: {
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E3A5F',
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  detailValue: { fontSize: 14, fontWeight: '700' },
  stepperCard: {
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: Spacing.md,
  },
  stepperTitle: { fontSize: 15, fontWeight: '800', marginBottom: 14 },
  deliveryCard: {
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: Spacing.md,
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  deliveryDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliveryIcon: { fontSize: 16 },
  deliveryLabel: { flex: 1, fontSize: 13, fontWeight: '600' },
  deliveryStatus: { fontSize: 12, fontWeight: '700' },
});

// ═════════════════════════════════════════════════════════════════════════════
// PARTNER PAYMENTS SCREEN
// ═════════════════════════════════════════════════════════════════════════════
import { MOCK_PAYMENTS as PAYMENTS } from './partnerConstants';

const PERIOD_OPTS = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
];

export function PartnerPaymentsScreen({ navigation }) {
  const theme = useTheme();
  const T = theme.colors;
  const [period, setPeriod] = useState('month');

  const data = PAYMENTS[period];

  const rows = [
    {
      label: 'Soil Test Revenue',
      icon: '🌱',
      value: data.soil,
      color: T.primary,
      desc: '₹200 × tests done',
    },
    {
      label: 'Device Revenue',
      icon: '🔬',
      value: data.device,
      color: T.blue,
      desc: 'Device rental income',
    },
    {
      label: 'Commission Revenue',
      icon: '💼',
      value: data.commission,
      color: T.yellow,
      desc: '5–10% on products sold',
    },
    {
      label: 'Subscription',
      icon: '🔄',
      value: data.subscription,
      color: T.orange,
      desc: 'Monthly recurring',
    },
  ];

  return (
    <SafeAreaView style={[py.root, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.bg} />
      <View style={[py.topBar, { borderBottomColor: T.divider }]}>
        <TouchableOpacity
          onPress={() => navigation?.goBack?.()}
          style={py.backBtn}
          activeOpacity={0.75}
        >
          <Text style={[py.backArrow, { color: T.text }]}>←</Text>
        </TouchableOpacity>
        <Text style={[py.topTitle, { color: T.text }]}>Payment Summary</Text>
      </View>

      <ScrollView
        contentContainerStyle={py.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Period tabs */}
        <View
          style={[
            py.periodRow,
            { backgroundColor: T.surface, borderColor: T.cardBorder },
          ]}
        >
          {PERIOD_OPTS.map(opt => (
            <TouchableOpacity
              key={opt.key}
              onPress={() => setPeriod(opt.key)}
              activeOpacity={0.75}
              style={[
                py.periodTab,
                period === opt.key && { backgroundColor: T.primary },
              ]}
            >
              <Text
                style={[
                  py.periodTxt,
                  { color: period === opt.key ? '#fff' : T.muted },
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Total hero */}
        <View
          style={[
            py.totalCard,
            { backgroundColor: T.card, borderColor: T.primary + '66' },
            Shadow.md,
          ]}
        >
          <Text style={[py.totalLbl, { color: T.muted }]}>
            Total Earnings · {PERIOD_OPTS.find(o => o.key === period)?.label}
          </Text>
          <Text style={[py.totalVal, { color: T.primary }]}>
            ₹{data.total.toLocaleString('en-IN')}
          </Text>
          <View
            style={[
              py.totalBadge,
              { backgroundColor: T.primaryDim, borderColor: T.primary + '44' },
            ]}
          >
            <Text style={[py.totalBadgeTxt, { color: T.primary }]}>
              💹 Revenue Growing
            </Text>
          </View>
        </View>

        {/* Revenue breakdown */}
        <Text style={[py.secTitle, { color: T.text }]}>Revenue Breakdown</Text>
        {rows.map(row => (
          <View
            key={row.label}
            style={[
              py.row,
              { backgroundColor: T.card, borderColor: T.cardBorder },
              Shadow.sm,
            ]}
          >
            <View
              style={[py.rowIconWrap, { backgroundColor: row.color + '18' }]}
            >
              <Text style={py.rowIcon}>{row.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[py.rowLabel, { color: T.text }]}>{row.label}</Text>
              <Text style={[py.rowDesc, { color: T.muted }]}>{row.desc}</Text>
            </View>
            <Text style={[py.rowValue, { color: row.color }]}>
              ₹{row.value.toLocaleString('en-IN')}
            </Text>
          </View>
        ))}

        {/* Service ledger */}
        <Text style={[py.secTitle, { color: T.text }]}>Service Ledger</Text>
        <View
          style={[
            py.ledgerCard,
            { backgroundColor: T.card, borderColor: T.cardBorder },
            Shadow.sm,
          ]}
        >
          {[
            {
              date: '14 Mar',
              desc: 'Soil test — Mahesh Patil',
              credit: 200,
              type: 'credit',
            },
            {
              date: '13 Mar',
              desc: 'Farmer registration bonus',
              credit: 50,
              type: 'credit',
            },
            {
              date: '13 Mar',
              desc: 'Sample collection — Raju',
              credit: 30,
              type: 'credit',
            },
            {
              date: '12 Mar',
              desc: 'Report delivery bonus',
              credit: 25,
              type: 'credit',
            },
            {
              date: '11 Mar',
              desc: 'Product commission',
              credit: 180,
              type: 'credit',
            },
            {
              date: '10 Mar',
              desc: 'Device revenue share',
              credit: 300,
              type: 'credit',
            },
          ].map((tx, i) => (
            <View key={i} style={[py.txRow, { borderBottomColor: T.divider }]}>
              <Text style={[py.txDate, { color: T.muted }]}>{tx.date}</Text>
              <Text style={[py.txDesc, { color: T.text }]}>{tx.desc}</Text>
              <Text style={[py.txAmt, { color: T.primary }]}>
                +₹{tx.credit}
              </Text>
            </View>
          ))}
        </View>

        {/* Incentive reminder */}
        <View
          style={[
            py.incentCard,
            { backgroundColor: T.primaryDim, borderColor: T.primary + '44' },
          ]}
        >
          <Text style={[py.incentTitle, { color: T.primary }]}>
            🎯 Earn More
          </Text>
          <Text style={[py.incentBody, { color: T.primary + 'BB' }]}>
            Complete your monthly target of 60 samples to unlock a ₹2,000 bonus
            incentive. You need {60 - 38} more samples this month.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const py = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: { fontSize: 22, fontWeight: '300' },
  topTitle: { flex: 1, fontSize: 16, fontWeight: '800' },
  scroll: { padding: Spacing.md, paddingBottom: 40 },
  periodRow: {
    flexDirection: 'row',
    borderRadius: Radius.md,
    borderWidth: 1.5,
    overflow: 'hidden',
    marginBottom: 16,
  },
  periodTab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  periodTxt: { fontSize: 12, fontWeight: '700' },
  totalCard: {
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    padding: 20,
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: 8,
  },
  totalLbl: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalVal: { fontSize: 42, fontWeight: '900', letterSpacing: -1 },
  totalBadge: {
    borderRadius: Radius.full,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  totalBadgeTxt: { fontSize: 12, fontWeight: '800' },
  secTitle: { fontSize: 16, fontWeight: '800', marginBottom: 12, marginTop: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 10,
  },
  rowIconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIcon: { fontSize: 22 },
  rowLabel: { fontSize: 14, fontWeight: '700' },
  rowDesc: { fontSize: 11, marginTop: 2 },
  rowValue: { fontSize: 18, fontWeight: '900' },
  ledgerCard: {
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  txDate: { fontSize: 11, fontWeight: '600', width: 50 },
  txDesc: { flex: 1, fontSize: 13, fontWeight: '500' },
  txAmt: { fontSize: 14, fontWeight: '900' },
  incentCard: {
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: Spacing.md,
  },
  incentTitle: { fontSize: 14, fontWeight: '900', marginBottom: 6 },
  incentBody: { fontSize: 13, lineHeight: 20 },
});

// ═════════════════════════════════════════════════════════════════════════════
// PARTNER VILLAGES SCREEN
// ═════════════════════════════════════════════════════════════════════════════
import { MOCK_FARMERS as FARMERS } from './partnerConstants';

export function PartnerVillagesScreen({ navigation }) {
  const theme = useTheme();
  const T = theme.colors;
  const [selected, setSelected] = useState(null);

  const farmers = selected
    ? FARMERS.filter(f => f.village === selected.name)
    : [];

  return (
    <SafeAreaView style={[pv.root, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.bg} />
      <View style={[pv.topBar, { borderBottomColor: T.divider }]}>
        <TouchableOpacity
          onPress={() =>
            selected ? setSelected(null) : navigation?.goBack?.()
          }
          style={pv.backBtn}
          activeOpacity={0.75}
        >
          <Text style={[pv.backArrow, { color: T.text }]}>←</Text>
        </TouchableOpacity>
        <Text style={[pv.topTitle, { color: T.text }]}>
          {selected ? selected.name : 'My Villages'}
        </Text>
        <View
          style={[
            pv.badge,
            { backgroundColor: T.primaryDim, borderColor: T.primary + '55' },
          ]}
        >
          <Text style={[pv.badgeTxt, { color: T.primary }]}>
            🏘️ {MOCK_VILLAGES.length}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={pv.scroll}
        showsVerticalScrollIndicator={false}
      >
        {!selected ? (
          // ── Village list ─────────────────────────────────────────────────
          <>
            {/* Summary */}
            <View style={pv.summRow}>
              {[
                {
                  icon: '🏘️',
                  val: MOCK_VILLAGES.length,
                  lbl: 'Total',
                  col: T.primary,
                },
                {
                  icon: '✅',
                  val: MOCK_VILLAGES.filter(v => v.covered).length,
                  lbl: 'Covered',
                  col: T.blue,
                },
                {
                  icon: '⏳',
                  val: MOCK_VILLAGES.filter(v => !v.covered).length,
                  lbl: 'Pending',
                  col: T.yellow,
                },
                {
                  icon: '👨‍🌾',
                  val: MOCK_VILLAGES.reduce((s, v) => s + v.farmers, 0),
                  lbl: 'Farmers',
                  col: T.orange,
                },
              ].map(m => (
                <View
                  key={m.lbl}
                  style={[
                    pv.summCard,
                    { backgroundColor: T.card, borderColor: T.cardBorder },
                    Shadow.sm,
                  ]}
                >
                  <Text style={pv.summIcon}>{m.icon}</Text>
                  <Text style={[pv.summVal, { color: m.col }]}>{m.val}</Text>
                  <Text style={[pv.summLbl, { color: T.muted }]}>{m.lbl}</Text>
                </View>
              ))}
            </View>

            {MOCK_VILLAGES.map(v => {
              const covered = v.covered;
              const color = covered ? T.primary : T.warning;
              return (
                <TouchableOpacity
                  key={v.id}
                  onPress={() => setSelected(v)}
                  activeOpacity={0.75}
                  style={[
                    pv.villCard,
                    { backgroundColor: T.card, borderColor: T.cardBorder },
                    Shadow.sm,
                  ]}
                >
                  <View style={pv.villRow}>
                    <View style={[pv.villDot, { backgroundColor: color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[pv.villName, { color: T.text }]}>
                        {v.name}
                      </Text>
                      <View style={pv.villStats}>
                        <Text style={[pv.villStat, { color: T.muted }]}>
                          👨‍🌾 {v.farmers} farmers
                        </Text>
                        <Text style={[pv.villStat, { color: T.muted }]}>
                          🧪 {v.samples} samples
                        </Text>
                      </View>
                    </View>
                    <View>
                      <View
                        style={[
                          pv.villBadge,
                          { backgroundColor: color + '20' },
                        ]}
                      >
                        <Text style={[pv.villBadgeTxt, { color }]}>
                          {covered ? 'Covered' : 'Pending'}
                        </Text>
                      </View>
                      <Text style={[pv.villArrow, { color: T.muted }]}>›</Text>
                    </View>
                  </View>
                  <View style={[pv.villBar, { backgroundColor: T.divider }]}>
                    <View
                      style={[
                        pv.villFill,
                        {
                          width: `${
                            Math.min(v.samples / Math.max(v.farmers, 1), 1) *
                            100
                          }%`,
                          backgroundColor: color,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[pv.villPct, { color: T.muted }]}>
                    {v.samples}/{v.farmers} tested
                  </Text>
                </TouchableOpacity>
              );
            })}
          </>
        ) : (
          // ── Village detail — farmers list ────────────────────────────────
          <>
            <View
              style={[
                pv.detailHeader,
                { backgroundColor: T.card, borderColor: T.cardBorder },
                Shadow.md,
              ]}
            >
              <Text style={[pv.detailTitle, { color: T.primary }]}>
                🏘️ {selected.name}
              </Text>
              <View style={pv.detailStats}>
                <View
                  style={[
                    pv.detailStat,
                    {
                      backgroundColor: T.primaryDim,
                      borderColor: T.primary + '44',
                    },
                  ]}
                >
                  <Text style={[pv.detailStatVal, { color: T.primary }]}>
                    {selected.farmers}
                  </Text>
                  <Text style={[pv.detailStatLbl, { color: T.primary }]}>
                    Farmers
                  </Text>
                </View>
                <View
                  style={[
                    pv.detailStat,
                    {
                      backgroundColor: T.blue + '18',
                      borderColor: T.blue + '44',
                    },
                  ]}
                >
                  <Text style={[pv.detailStatVal, { color: T.blue }]}>
                    {selected.samples}
                  </Text>
                  <Text style={[pv.detailStatLbl, { color: T.blue }]}>
                    Samples
                  </Text>
                </View>
                <View
                  style={[
                    pv.detailStat,
                    {
                      backgroundColor: T.cardBorder + '40',
                      borderColor: T.cardBorder,
                    },
                  ]}
                >
                  <Text style={[pv.detailStatVal, { color: T.text }]}>
                    {selected.covered ? 'Yes' : 'No'}
                  </Text>
                  <Text style={[pv.detailStatLbl, { color: T.muted }]}>
                    Covered
                  </Text>
                </View>
              </View>
            </View>

            <Text style={[pv.farmersTitle, { color: T.text }]}>
              Farmers in {selected.name}
            </Text>

            {farmers.length === 0 ? (
              <View
                style={[
                  pv.emptyCard,
                  { backgroundColor: T.card, borderColor: T.cardBorder },
                ]}
              >
                <Text style={pv.emptyIcon}>👨‍🌾</Text>
                <Text style={[pv.emptyTxt, { color: T.muted }]}>
                  No farmers registered yet in this village.
                </Text>
                <TouchableOpacity
                  onPress={() => navigation?.navigate?.('RegisterFarmer')}
                  activeOpacity={0.85}
                  style={[pv.emptyBtn, { backgroundColor: T.primary }]}
                >
                  <Text style={pv.emptyBtnTxt}>+ Register Farmer</Text>
                </TouchableOpacity>
              </View>
            ) : (
              farmers.map(f => {
                const st = FARMER_STATUSES.find(s => s.key === f.status) ?? {};
                return (
                  <View
                    key={f.id}
                    style={[
                      pv.farmerCard,
                      { backgroundColor: T.card, borderColor: T.cardBorder },
                      Shadow.sm,
                    ]}
                  >
                    <View style={pv.farmerRow}>
                      <View
                        style={[
                          pv.farmerAvatar,
                          { backgroundColor: T.primaryDim },
                        ]}
                      >
                        <Text style={[pv.farmerInitial, { color: T.primary }]}>
                          {f.name.charAt(0)}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[pv.farmerName, { color: T.text }]}>
                          {f.name}
                        </Text>
                        <Text style={[pv.farmerMobile, { color: T.muted }]}>
                          📞 {f.mobile}
                        </Text>
                        <View style={pv.farmerMeta}>
                          <Text style={[pv.farmerTag, { color: T.textSub }]}>
                            🌾 {f.crop}
                          </Text>
                          <Text style={[pv.farmerTag, { color: T.textSub }]}>
                            📐 {f.land} ac
                          </Text>
                        </View>
                      </View>
                      <View
                        style={[
                          pv.farmerBadge,
                          { backgroundColor: (st.color ?? T.muted) + '22' },
                        ]}
                      >
                        <Text style={{ fontSize: 12 }}>{st.icon ?? '•'}</Text>
                        <Text
                          style={[
                            pv.farmerBadgeTxt,
                            { color: st.color ?? T.muted },
                          ]}
                        >
                          {st.label ?? f.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}

            <TouchableOpacity
              onPress={() => navigation?.navigate?.('RegisterFarmer')}
              activeOpacity={0.85}
              style={[pv.addFarmerBtn, { backgroundColor: T.primary }]}
            >
              <Text style={pv.addFarmerTxt}>
                ＋ Register New Farmer in {selected.name}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const pv = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: { fontSize: 22, fontWeight: '300' },
  topTitle: { flex: 1, fontSize: 16, fontWeight: '800' },
  badge: {
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1.5,
  },
  badgeTxt: { fontSize: 11, fontWeight: '800' },
  scroll: { padding: Spacing.md, paddingBottom: 40 },
  summRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.md },
  summCard: {
    flex: 1,
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1.5,
    paddingVertical: 12,
    gap: 3,
  },
  summIcon: { fontSize: 18 },
  summVal: { fontSize: 18, fontWeight: '900' },
  summLbl: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  villCard: {
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 10,
  },
  villRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  villDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  villName: { fontSize: 16, fontWeight: '800' },
  villStats: { flexDirection: 'row', gap: 14, marginTop: 3 },
  villStat: { fontSize: 12 },
  villBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignItems: 'center',
  },
  villBadgeTxt: { fontSize: 10, fontWeight: '800' },
  villArrow: { fontSize: 18, textAlign: 'center', marginTop: 4 },
  villBar: { height: 5, borderRadius: 3, overflow: 'hidden', marginBottom: 5 },
  villFill: { height: '100%', borderRadius: 3 },
  villPct: { fontSize: 10, fontWeight: '600' },
  detailHeader: {
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: Spacing.md,
  },
  detailTitle: { fontSize: 20, fontWeight: '900', marginBottom: 12 },
  detailStats: { flexDirection: 'row', gap: 10 },
  detailStat: {
    flex: 1,
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1.5,
    paddingVertical: 10,
  },
  detailStatVal: { fontSize: 18, fontWeight: '900' },
  detailStatLbl: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  farmersTitle: { fontSize: 15, fontWeight: '800', marginBottom: 12 },
  emptyCard: {
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  emptyIcon: { fontSize: 36 },
  emptyTxt: { fontSize: 13, textAlign: 'center' },
  emptyBtn: {
    borderRadius: Radius.lg,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  emptyBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '800' },
  farmerCard: {
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 10,
  },
  farmerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  farmerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  farmerInitial: { fontSize: 20, fontWeight: '900' },
  farmerName: { fontSize: 15, fontWeight: '800' },
  farmerMobile: { fontSize: 12, marginTop: 2 },
  farmerMeta: { flexDirection: 'row', gap: 10, marginTop: 4 },
  farmerTag: { fontSize: 12 },
  farmerBadge: {
    borderRadius: Radius.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    gap: 3,
  },
  farmerBadgeTxt: { fontSize: 10, fontWeight: '800' },
  addFarmerBtn: {
    borderRadius: Radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  addFarmerTxt: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
