// src/screens/soilpartner/FarmerDetailScreen.jsx
//
// Shows: header, status updater, status history timeline,
//        basic info, location, agriculture details.

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Spacing, Radius, Shadow } from '../theme';
import useTheme from '../hooks/useTheme';
import { TopBar } from '../components/common';
import { fetchFarmerDetail } from '../redux/actions/soilPartnerActions';

const PRIMARY = '#16A34A';

const STATUS_ORDER = [
  {
    key: 'registered',
    label: 'Registered',
    color: '#2563EB',
    icon: 'account-check-outline',
  },
  {
    key: 're_registered',
    label: 'Re-Registered',
    color: '#7C3AED',
    icon: 'account-reactivate-outline',
  },
  {
    key: 'sample_collected',
    label: 'Sample Collected',
    color: '#0891B2',
    icon: 'test-tube',
  },
  {
    key: 'testing_done',
    label: 'Testing Done',
    color: '#D97706',
    icon: 'flask-check-outline',
  },
  {
    key: 'report_delivered',
    label: 'Report Delivered',
    color: '#16A34A',
    icon: 'file-check-outline',
  },
];

function statusMeta(key) {
  return (
    STATUS_ORDER.find(s => s.key === key) ?? {
      key,
      label: key ?? '—',
      color: '#94A3B8',
      icon: 'help-circle-outline',
    }
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────
function Section({ title, icon, color = PRIMARY, children, T }) {
  return (
    <View
      style={[
        sc.card,
        { backgroundColor: T.card, borderColor: T.border ?? T.cardBorder },
      ]}
    >
      <View
        style={[
          sc.header,
          {
            borderBottomColor: T.border ?? T.cardBorder,
            backgroundColor: color + '12',
          },
        ]}
      >
        <View style={[sc.iconWrap, { backgroundColor: color + '22' }]}>
          <MaterialCommunityIcons name={icon} size={15} color={color} />
        </View>
        <Text style={[sc.title, { color: T.text }]}>{title}</Text>
      </View>
      <View style={sc.body}>{children}</View>
    </View>
  );
}
const sc = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: Spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  body: { padding: Spacing.md },
});

// ─── Info row ─────────────────────────────────────────────────────────────────
function InfoRow({ label, value, last, T }) {
  return (
    <View
      style={[
        ir.row,
        !last && {
          borderBottomColor: T.border ?? T.cardBorder,
          borderBottomWidth: 0.5,
        },
      ]}
    >
      <Text style={[ir.label, { color: T.muted ?? T.textSub }]}>{label}</Text>
      <Text style={[ir.value, { color: T.text }]} numberOfLines={2}>
        {value ?? '—'}
      </Text>
    </View>
  );
}
const ir = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10 },
  label: { width: 110, fontSize: 12, flexShrink: 0 },
  value: { flex: 1, fontSize: 13, fontWeight: '700', textAlign: 'right' },
});

// ─── Avatar initials ──────────────────────────────────────────────────────────
function Avatar({ name, color, size = 52 }) {
  const initials = (name ?? 'F')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  return (
    <View
      style={[
        av.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color + '20',
          borderColor: color + '50',
        },
      ]}
    >
      <Text style={[av.text, { color, fontSize: size * 0.34 }]}>
        {initials}
      </Text>
    </View>
  );
}
const av = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  text: { fontWeight: '800' },
});

// ─── Status timeline ──────────────────────────────────────────────────────────
function StatusTimeline({ history, T }) {
  if (!history || history.length === 0) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: Spacing.md }}>
        <Text style={[{ color: T.muted ?? T.textSub, fontSize: 13 }]}>
          No history recorded
        </Text>
      </View>
    );
  }

  return (
    <View style={tl.wrap}>
      {history.map((item, i) => {
        const meta = statusMeta(item.status);
        const isLast = i === history.length - 1;
        return (
          <View key={i} style={tl.row}>
            {/* Line */}
            <View style={tl.lineCol}>
              <View
                style={[
                  tl.dot,
                  {
                    backgroundColor: meta.color,
                    borderColor: meta.color + '40',
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={meta.icon}
                  size={12}
                  color="#fff"
                />
              </View>
              {!isLast && (
                <View
                  style={[
                    tl.line,
                    { backgroundColor: T.border ?? T.cardBorder },
                  ]}
                />
              )}
            </View>
            {/* Content */}
            <View
              style={[tl.content, !isLast && { paddingBottom: Spacing.lg }]}
            >
              <Text style={[tl.status, { color: meta.color }]}>
                {meta.label}
              </Text>
              {item.created_at && (
                <Text style={[tl.date, { color: T.muted ?? T.textSub }]}>
                  {new Date(item.created_at).toLocaleString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              )}
              {item.note && (
                <Text
                  style={[tl.note, { color: T.text, backgroundColor: T.bg }]}
                >
                  {item.note}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}
const tl = StyleSheet.create({
  wrap: {},
  row: { flexDirection: 'row', gap: 12 },
  lineCol: { alignItems: 'center', width: 28 },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  line: { flex: 1, width: 2, marginTop: 4 },
  content: { flex: 1 },
  status: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  date: { fontSize: 11 },
  note: { fontSize: 12, marginTop: 4, padding: 8, borderRadius: 6 },
});

// ─── Status update buttons ────────────────────────────────────────────────────
function StatusUpdater({ currentStatus, T }) {
  return (
    <View style={su.wrap}>
      <Text style={[su.label, { color: T.muted ?? T.textSub }]}>
        Update status:
      </Text>
      <View style={su.row}>
        {STATUS_ORDER.map(s => {
          const active = currentStatus === s.key;
          return (
            <TouchableOpacity
              key={s.key}
              style={[
                su.btn,
                {
                  backgroundColor: active ? s.color : T.card,
                  borderColor: active ? s.color : T.border ?? T.cardBorder,
                },
              ]}
              activeOpacity={0.8}
            >
              <Text style={[su.btnText, { color: active ? '#fff' : T.text }]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
const su = StyleSheet.create({
  wrap: {},
  label: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btn: {
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  btnText: { fontSize: 12, fontWeight: '700' },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function FarmerDetailScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const T = theme.colors;

  const { farmerId, farmer: passedFarmer } = route.params;

  const { farmerDetail, farmerDetailLoading } = useSelector(
    s => s.soilPartner ?? {},
  );
  const farmer = farmerDetail ?? passedFarmer;

  useEffect(() => {
    if (farmerId) dispatch(fetchFarmerDetail(farmerId));
  }, [farmerId, dispatch]);

  const currentMeta = statusMeta(farmer?.status);

  if (farmerDetailLoading && !farmer) {
    return (
      <SafeAreaView style={[s.root, { backgroundColor: T.bg }]}>
        <TopBar
          title="Farmer"
          onBack={() => navigation.goBack()}
          theme={theme}
        />
        <View style={s.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={[s.loadText, { color: T.muted ?? T.textSub }]}>
            Loading farmer…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!farmer) {
    return (
      <SafeAreaView style={[s.root, { backgroundColor: T.bg }]}>
        <TopBar
          title="Farmer"
          onBack={() => navigation.goBack()}
          theme={theme}
        />
        <View style={s.center}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={40}
            color="#EF4444"
          />
          <Text style={[s.loadText, { color: T.text }]}>
            Could not load farmer
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.root, { backgroundColor: T.bg }]}>
      <StatusBar
        barStyle={T.statusBar ?? 'dark-content'}
        backgroundColor={T.bg}
      />

      <TopBar
        title={farmer.farmer_name}
        subtitle={`${farmer.village}, ${farmer.district}, ${farmer.state}`}
        onBack={() => navigation.goBack()}
        theme={theme}
      />

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero header ───────────────────────────────────── */}
        <View
          style={[
            s.heroCard,
            { backgroundColor: T.card, borderColor: T.border ?? T.cardBorder },
          ]}
        >
          <View
            style={[s.heroAccent, { backgroundColor: currentMeta.color }]}
          />
          <View style={s.heroInner}>
            <Avatar
              name={farmer.farmer_name}
              color={currentMeta.color}
              size={64}
            />
            <View style={{ flex: 1 }}>
              <Text style={[s.heroName, { color: T.text }]}>
                {farmer.farmer_name}
              </Text>
              <Text style={[s.heroSub, { color: T.muted ?? T.textSub }]}>
                {farmer.village}, {farmer.district}
              </Text>
              <View style={s.heroChips}>
                <View
                  style={[
                    s.heroBadge,
                    {
                      backgroundColor: currentMeta.color + '18',
                      borderColor: currentMeta.color + '50',
                    },
                  ]}
                >
                  <View
                    style={[s.heroDot, { backgroundColor: currentMeta.color }]}
                  />
                  <Text style={[s.heroBadgeText, { color: currentMeta.color }]}>
                    {currentMeta.label}
                  </Text>
                </View>
                <View
                  style={[
                    s.heroBadge,
                    {
                      backgroundColor: T.bg,
                      borderColor: T.border ?? T.cardBorder,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="sprout-outline"
                    size={10}
                    color={PRIMARY}
                  />
                  <Text style={[s.heroBadgeText, { color: PRIMARY }]}>
                    {farmer.crop}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ── Status updater ─────────────────────────────────── */}
        <Section
          title="Status"
          icon="list-status"
          color={currentMeta.color}
          T={T}
        >
          <StatusUpdater currentStatus={farmer.status} T={T} />
        </Section>

        {/* ── Status history timeline ────────────────────────── */}
        <Section title="Status History" icon="history" color="#7C3AED" T={T}>
          <StatusTimeline history={farmer.status_history ?? []} T={T} />
        </Section>

        {/* ── Basic information ──────────────────────────────── */}
        <Section
          title="Basic Information"
          icon="account-outline"
          color="#2563EB"
          T={T}
        >
          <InfoRow label="Phone" value={farmer.phone} T={T} />
          <InfoRow label="Mobile" value={farmer.mobile || '—'} T={T} />
          <InfoRow label="Email" value={farmer.email} T={T} />
          <InfoRow label="Aadhaar" value={farmer.aadhaar_number} T={T} />
          <InfoRow
            label="Soil Partner"
            value={
              farmer.soil_partner_name ??
              farmer.soil_partner?.full_name ??
              farmer.soil_partner?.username ??
              '—'
            }
            T={T}
          />
          <InfoRow
            label="Registered"
            value={
              farmer.created_at
                ? new Date(farmer.created_at).toLocaleString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '—'
            }
            T={T}
            last
          />
        </Section>

        {/* ── Location ───────────────────────────────────────── */}
        <Section
          title="Location"
          icon="map-marker-outline"
          color="#0891B2"
          T={T}
        >
          <InfoRow label="State" value={farmer.state} T={T} />
          <InfoRow label="District" value={farmer.district} T={T} />
          <InfoRow label="Village" value={farmer.village} T={T} />
          <InfoRow
            label="Lat / Lng"
            value={
              farmer.latitude && farmer.longitude
                ? `${Number(farmer.latitude).toFixed(6)},  ${Number(
                    farmer.longitude,
                  ).toFixed(6)}`
                : '—'
            }
            T={T}
            last
          />
        </Section>

        {/* ── Agriculture details ────────────────────────────── */}
        <Section
          title="Agriculture Details"
          icon="sprout-outline"
          color="#D97706"
          T={T}
        >
          <InfoRow
            label="Land Area"
            value={`${farmer.land_area} acres`}
            T={T}
          />
          <InfoRow label="Crop" value={farmer.crop} T={T} />
          <InfoRow
            label="Season"
            value={farmer.season_display ?? farmer.season}
            T={T}
            last
          />
        </Section>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: Spacing.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadText: { fontSize: 13 },

  heroCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  heroAccent: { height: 4 },
  heroInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: Spacing.md,
  },
  heroName: { fontSize: 18, fontWeight: '900', marginBottom: 3 },
  heroSub: { fontSize: 12, marginBottom: 6 },
  heroChips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  heroDot: { width: 6, height: 6, borderRadius: 3 },
  heroBadgeText: { fontSize: 10, fontWeight: '700' },
});
