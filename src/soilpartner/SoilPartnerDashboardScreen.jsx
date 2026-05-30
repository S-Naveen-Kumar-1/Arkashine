// src/screens/soilpartner/SoilPartnerDashboardScreen.jsx

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Typography, Spacing, Radius, Shadow } from '../theme';
import useTheme from '../hooks/useTheme';
import {
  fetchFarmers,
  fetchPayments,
} from '../redux/actions/soilPartnerActions';
import { getUserDevices } from '../redux/actions/index';

// ─── Avatar initials ──────────────────────────────────────────────────────────
function AvatarInitials({ name, size = 52, color, T }) {
  const initials = (name ?? 'U')
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
          backgroundColor: color + '22',
          borderColor: color + '55',
        },
      ]}
    >
      <Text style={[av.text, { color, fontSize: size * 0.36 }]}>
        {initials}
      </Text>
    </View>
  );
}
const av = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  text: { fontWeight: '800' },
});

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ title, icon, color, onPress, actionLabel, T }) {
  return (
    <View style={sh.row}>
      <View style={sh.left}>
        <View style={[sh.iconWrap, { backgroundColor: color + '18' }]}>
          <MaterialCommunityIcons name={icon} size={14} color={color} />
        </View>
        <Text style={[sh.title, { color: T.text }]}>{title}</Text>
      </View>
      {onPress && (
        <TouchableOpacity
          style={sh.action}
          onPress={onPress}
          activeOpacity={0.7}
        >
          <Text style={[sh.actionText, { color }]}>
            {actionLabel ?? 'See all'}
          </Text>
          <MaterialCommunityIcons
            name="chevron-right"
            size={15}
            color={color}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}
const sh = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 15, fontWeight: '800' },
  action: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  actionText: { fontSize: 12, fontWeight: '700' },
});

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color, T }) {
  return (
    <View
      style={[
        stc.card,
        { backgroundColor: T.card, borderColor: T.border ?? T.cardBorder },
      ]}
    >
      <View style={[stc.iconWrap, { backgroundColor: color + '18' }]}>
        <MaterialCommunityIcons name={icon} size={18} color={color} />
      </View>
      <Text style={[stc.value, { color: T.text }]}>{value}</Text>
      <Text style={[stc.label, { color: T.muted ?? T.textSub }]}>{label}</Text>
    </View>
  );
}
const stc = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    alignItems: 'center',
    ...Shadow.sm,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  value: { fontSize: 20, fontWeight: '900', marginBottom: 2 },
  label: { fontSize: 10, fontWeight: '600', textAlign: 'center' },
});

// ─── Quick action tile ────────────────────────────────────────────────────────
function QuickAction({ icon, label, color, onPress, badge, T }) {
  return (
    <TouchableOpacity
      style={[
        qa.tile,
        { backgroundColor: T.card, borderColor: T.border ?? T.cardBorder },
      ]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      <View
        style={[
          qa.iconWrap,
          { backgroundColor: color + '18', borderColor: color + '35' },
        ]}
      >
        <MaterialCommunityIcons name={icon} size={26} color={color} />
        {badge != null && badge > 0 && (
          <View style={[qa.badge, { backgroundColor: color }]}>
            <Text style={qa.badgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
      </View>
      <Text style={[qa.label, { color: T.text }]} numberOfLines={2}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
const qa = StyleSheet.create({
  tile: {
    flex: 1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 10,
    minHeight: 100,
    ...Shadow.sm,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  label: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
});

// ─── Farmer row ───────────────────────────────────────────────────────────────
// SWAPPED: status pill is now on the LEFT, name/info on the RIGHT
function FarmerRow({ farmer, T, onPress }) {
  const statusColor =
    {
      registered: '#16A34A',
      re_registered: '#2563EB',
      pending: '#F59E0B',
    }[farmer.status] ?? '#94A3B8';

  return (
    <TouchableOpacity
      style={[fr.row, { borderBottomColor: T.border ?? T.cardBorder }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <AvatarInitials
        name={farmer.farmer_name}
        size={38}
        color={statusColor}
        T={T}
      />

      {/* ── STATUS PILL (was on right, now on left after avatar) ── */}
      <View
        style={[
          fr.statusPill,
          {
            backgroundColor: statusColor + '18',
            borderColor: statusColor + '50',
          },
        ]}
      >
        <Text style={[fr.statusText, { color: statusColor }]}>
          {farmer.season_display ?? farmer.season}
        </Text>
      </View>

      {/* ── NAME + SUB (was on left, now on right) ── */}
      <View style={fr.info}>
        <Text style={[fr.name, { color: T.text }]} numberOfLines={1}>
          {farmer.farmer_name}
        </Text>
        <Text style={[fr.sub, { color: T.muted ?? T.textSub }]}>
          {farmer.village}, {farmer.district} · {farmer.crop}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
const fr = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  info: { flex: 1 },
  name: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
    textAlign: 'right',
  },
  sub: { fontSize: 11, textAlign: 'right' },
  statusPill: {
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexShrink: 0,
  },
  statusText: { fontSize: 10, fontWeight: '700' },
});

// ─── Payment row ──────────────────────────────────────────────────────────────
// SWAPPED: paid/pending badge now LEFT side, farmer name now RIGHT side
function PaymentRow({ payment, T }) {
  const isPaid = payment.status === 'paid';
  const color = isPaid ? '#16A34A' : '#F59E0B';
  const amount = payment.amount ?? '—';
  const date = payment.created_at;
  const paidOn = payment.paid_at;
  const farmer = payment.farmer_name;
  const attachments = payment.attachments ?? [];

  return (
    <View style={[pr.row, { borderBottomColor: T.border ?? T.cardBorder }]}>
      <View style={[pr.dot, { backgroundColor: color }]} />

      {/* ── PAID/PENDING badge (was on right, now on left) ── */}
      <View
        style={[
          pr.badge,
          { backgroundColor: color + '18', borderColor: color + '40' },
        ]}
      >
        <Text style={[pr.badgeText, { color }]}>
          {isPaid ? 'Paid' : 'Pending'}
        </Text>
      </View>

      {/* ── FARMER NAME + meta (was on left, now on right) ── */}
      <View style={pr.info}>
        {date && (
          <Text style={[pr.date, { color: T.muted ?? T.textSub }]}>
            {new Date(date).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
        )}
        {paidOn && (
          <Text style={[pr.date, { color: '#16A34A' }]}>
            Paid
            {new Date(paidOn).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
        )}
      </View>

      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[pr.amount, { color: T.text }]}>₹{amount}</Text>
        <Text style={[pr.farmer, { color: T.textSub }]} numberOfLines={1}>
          {farmer}
        </Text>
        {attachments.map((url, idx) => (
          <TouchableOpacity
            key={idx}
            onPress={() => Linking.openURL(url)}
            activeOpacity={0.7}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 2,
              marginTop: 2,
            }}
          >
            <MaterialCommunityIcons
              name="paperclip"
              size={12}
              color="#2563EB"
            />
            <Text
              style={{
                fontSize: 9,
                color: '#2563EB',
                fontWeight: '700',
                textDecorationLine: 'underline',
              }}
            >
              {attachments.length > 1 ? `File ${idx + 1}` : 'File'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
const pr = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  dot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  badge: {
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexShrink: 0,
  },
  badgeText: { fontSize: 10, fontWeight: '800' },
  info: { flex: 1 },
  farmer: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  date: { fontSize: 10 },
  amount: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function SoilPartnerDashboardScreen({ navigation }) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const T = theme.colors;

  const user = useSelector(s => s.auth?.user);
  const token = useSelector(s => s.auth?.token);
  const devices = useSelector(s => s.userDevices?.devices);

  useEffect(() => {
    if (token) dispatch(getUserDevices(token));
  }, [token]);

  const {
    farmers,
    farmersCount,
    farmersLoading,
    payments,
    paymentsMeta,
    paymentsLoading,
  } = useSelector(s => s.soilPartner ?? {});

  const safeFarmers = farmers ?? [];
  const safePayments = payments ?? [];

  const load = useCallback(() => {
    dispatch(fetchFarmers());
    dispatch(fetchPayments());
  }, [dispatch]);
  useEffect(() => {
    load();
  }, [load]);

  const PRIMARY = '#16A34A',
    BLUE = '#2563EB',
    AMBER = '#F59E0B',
    PURPLE = '#7C3AED';
  const displayName = user?.full_name ?? user?.username ?? 'Partner';

  return (
    <SafeAreaView style={[s.root, { backgroundColor: T.bg }]}>
      <StatusBar
        barStyle={T.statusBar ?? 'dark-content'}
        backgroundColor={T.bg}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl
            refreshing={farmersLoading || paymentsLoading}
            onRefresh={load}
            tintColor={PRIMARY}
            colors={[PRIMARY]}
          />
        }
      >
        {/* Header */}
        <View
          style={[s.header, { borderBottomColor: T.border ?? T.cardBorder }]}
        >
          <View style={s.headerLeft}>
            <AvatarInitials
              name={displayName}
              size={52}
              color={PRIMARY}
              T={T}
            />
            <View style={{ flex: 1 }}>
              <Text style={[s.greeting, { color: T.muted ?? T.textSub }]}>
                Good day,
              </Text>
              <Text style={[s.name, { color: T.text }]} numberOfLines={1}>
                {displayName}
              </Text>
              <View
                style={[
                  s.rolePill,
                  {
                    backgroundColor: PRIMARY + '18',
                    borderColor: PRIMARY + '40',
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="account-tie"
                  size={10}
                  color={PRIMARY}
                />
                <Text style={[s.roleText, { color: PRIMARY }]}>
                  Soil Partner
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          <StatCard
            icon="account-group-outline"
            label="My Farmers"
            value={farmersCount ?? safeFarmers.length}
            color={PRIMARY}
            T={T}
          />
          <StatCard
            icon="check-circle-outline"
            label="Paid (₹)"
            value={paymentsMeta?.paid_amount ?? '0'}
            color={BLUE}
            T={T}
          />
          <StatCard
            icon="clock-outline"
            label="Pending (₹)"
            value={paymentsMeta?.pending_amount ?? '0'}
            color={AMBER}
            T={T}
          />
        </View>

        {/* Quick actions */}
        <View style={s.section}>
          <SectionHeader
            title="Quick Actions"
            icon="lightning-bolt"
            color={PRIMARY}
            T={T}
          />
          <View style={s.qaGrid}>
            <QuickAction
              icon="account-group-outline"
              label="My Farmers"
              color={PRIMARY}
              badge={farmersCount}
              T={T}
              onPress={() => navigation.navigate('FarmersListScreen')}
            />
            <QuickAction
              icon="account-plus-outline"
              label="Add Farmer"
              color={BLUE}
              T={T}
              onPress={() => navigation.navigate('AddFarmerScreen')}
            />
          </View>
          <View style={[s.qaGrid, { marginTop: Spacing.md }]}>
            <QuickAction
              icon="devices"
              label="My Devices"
              color={PURPLE}
              T={T}
              onPress={() =>
                navigation.navigate('SoilPartnerTabs', { screen: 'Products' })
              }
            />
            <QuickAction
              icon="credit-card-outline"
              label="Payment History"
              color={AMBER}
              badge={paymentsMeta?.pending_count}
              T={T}
              onPress={() => navigation.navigate('PaymentHistoryScreen')}
            />
          </View>
        </View>

        {/* Recent farmers */}
        <View
          style={[
            s.section,
            s.card,
            { backgroundColor: T.card, borderColor: T.border ?? T.cardBorder },
          ]}
        >
          <SectionHeader
            title="Recent Farmers"
            icon="account-group-outline"
            color={PRIMARY}
            T={T}
            onPress={() => navigation.navigate('FarmersListScreen')}
            actionLabel="View all"
          />
          {farmersLoading && safeFarmers.length === 0 ? (
            <ActivityIndicator
              color={PRIMARY}
              style={{ paddingVertical: Spacing.lg }}
            />
          ) : safeFarmers.length === 0 ? (
            <View style={s.emptyWrap}>
              <MaterialCommunityIcons
                name="account-off-outline"
                size={36}
                color={T.muted ?? T.textSub}
                style={{ opacity: 0.3 }}
              />
              <Text style={[s.emptyText, { color: T.muted ?? T.textSub }]}>
                No farmers registered yet
              </Text>
              <TouchableOpacity
                style={[s.addBtn, { backgroundColor: PRIMARY }]}
                onPress={() => navigation.navigate('AddFarmerScreen')}
              >
                <MaterialCommunityIcons name="plus" size={14} color="#fff" />
                <Text style={s.addBtnText}>Add your first farmer</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {safeFarmers.slice(0, 4).map(f => (
                <FarmerRow
                  key={f.id}
                  farmer={f}
                  T={T}
                  onPress={() =>
                    navigation.navigate('FarmerDetailScreen', {
                      farmerId: f.id,
                      farmer: f,
                    })
                  }
                />
              ))}
              {safeFarmers.length > 4 && (
                <TouchableOpacity
                  style={s.seeMoreBtn}
                  onPress={() => navigation.navigate('FarmersListScreen')}
                >
                  <Text style={[s.seeMoreText, { color: PRIMARY }]}>
                    +{safeFarmers.length - 4} more farmers
                  </Text>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={14}
                    color={PRIMARY}
                  />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* Payments summary */}
        <View
          style={[
            s.section,
            s.card,
            { backgroundColor: T.card, borderColor: T.border ?? T.cardBorder },
          ]}
        >
          <SectionHeader
            title="Payments"
            icon="credit-card-outline"
            color={AMBER}
            T={T}
            onPress={() => navigation.navigate('PaymentHistoryScreen')}
            actionLabel="Full history"
          />
          <View
            style={[
              s.paymentTotals,
              {
                backgroundColor: T.bg ?? '#F8FAFC',
                borderColor: T.border ?? T.cardBorder,
              },
            ]}
          >
            <View style={s.totalItem}>
              <Text style={[s.totalLabel, { color: T.muted ?? T.textSub }]}>
                Total
              </Text>
              <Text style={[s.totalValue, { color: T.text }]}>
                ₹{paymentsMeta?.total_amount ?? '0'}
              </Text>
            </View>
            <View
              style={[
                s.totalDivider,
                { backgroundColor: T.border ?? T.cardBorder },
              ]}
            />
            <View style={s.totalItem}>
              <Text style={[s.totalLabel, { color: T.muted ?? T.textSub }]}>
                Paid
              </Text>
              <Text style={[s.totalValue, { color: '#16A34A' }]}>
                ₹{paymentsMeta?.paid_amount ?? '0'}
              </Text>
            </View>
            <View
              style={[
                s.totalDivider,
                { backgroundColor: T.border ?? T.cardBorder },
              ]}
            />
            <View style={s.totalItem}>
              <Text style={[s.totalLabel, { color: T.muted ?? T.textSub }]}>
                Pending
              </Text>
              <Text style={[s.totalValue, { color: AMBER }]}>
                ₹{paymentsMeta?.pending_amount ?? '0'}
              </Text>
            </View>
          </View>
          {paymentsLoading && safePayments.length === 0 ? (
            <ActivityIndicator
              color={AMBER}
              style={{ paddingVertical: Spacing.lg }}
            />
          ) : safePayments.length === 0 ? (
            <View style={s.emptyWrap}>
              <MaterialCommunityIcons
                name="credit-card-off-outline"
                size={32}
                color={T.muted ?? T.textSub}
                style={{ opacity: 0.3 }}
              />
              <Text style={[s.emptyText, { color: T.muted ?? T.textSub }]}>
                No payment records
              </Text>
            </View>
          ) : (
            safePayments
              .slice(0, 4)
              .map((p, i) => <PaymentRow key={i} payment={p} T={T} />)
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingBottom: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 0.5,
    marginBottom: Spacing.lg,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  greeting: { fontSize: 11, fontWeight: '500' },
  name: { fontSize: 17, fontWeight: '900', marginBottom: 4 },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  roleText: { fontSize: 10, fontWeight: '700' },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    ...Shadow.sm,
  },
  qaGrid: { flexDirection: 'row', gap: Spacing.md },
  emptyWrap: { alignItems: 'center', paddingVertical: Spacing.xl, gap: 10 },
  emptyText: { fontSize: 13 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 4,
  },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  seeMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 10,
  },
  seeMoreText: { fontSize: 12, fontWeight: '700' },
  paymentTotals: {
    flexDirection: 'row',
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  totalItem: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  totalLabel: { fontSize: 10, fontWeight: '600', marginBottom: 3 },
  totalValue: { fontSize: 15, fontWeight: '900' },
  totalDivider: { width: 1, alignSelf: 'stretch' },
});
