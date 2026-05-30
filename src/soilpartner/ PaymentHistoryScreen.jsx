// src/screens/soilpartner/PaymentHistoryScreen.jsx

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Spacing, Radius, Shadow } from '../theme';
import useTheme from '../hooks/useTheme';
import { TopBar } from '../components/common';
import { fetchPayments } from '../redux/actions/soilPartnerActions';

const PRIMARY = '#16A34A';
const AMBER = '#F59E0B';

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function fmtAmount(val) {
  if (val == null || val === '') return '—';
  const n = Number(val);
  return isNaN(n)
    ? String(val)
    : `₹${n.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
}

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
      <Text
        style={[stc.value, { color }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
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
  value: { fontSize: 16, fontWeight: '900', marginBottom: 2 },
  label: { fontSize: 10, fontWeight: '600', textAlign: 'center' },
});

// ─── Payment card ─────────────────────────────────────────────────────────────
// SWAPPED: paid/pending badge on LEFT, farmer name on RIGHT
function PaymentCard({ payment, T }) {
  const isPaid = payment.status === 'paid';
  const color = isPaid ? PRIMARY : AMBER;
  const amount = payment.amount;
  const farmer = payment.farmer_name ;
  const note = payment.description;
  const createdAt = payment.created_at;
  const paidOn = payment.paid_at;
  const attachments = payment.attachments ?? [];

  return (
    <View
      style={[
        pc.card,
        { backgroundColor: T.card, borderColor: T.border ?? T.cardBorder },
      ]}
    >
      <View style={[pc.accent, { backgroundColor: color }]} />

      <View style={pc.inner}>
        <View style={pc.topRow}>
          {/* ── PAID/PENDING badge (was on right, now LEFT) ── */}
          <View
            style={[
              pc.statusWrap,
              { backgroundColor: color + '18', borderColor: color + '40' },
            ]}
          >
            <View style={[pc.statusDot, { backgroundColor: color }]} />
            <Text style={[pc.statusTxt, { color }]}>
              {isPaid ? 'Paid' : 'Pending'}
            </Text>
          </View>

          {/* ── FARMER NAME + date (was on left, now RIGHT) ── */}
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[pc.farmer, { color: T.text }]} numberOfLines={1}>
              {farmer}
            </Text>
            {createdAt && (
              <Text style={[pc.date, { color: T.muted ?? T.textSub }]}>
                {fmtDate(createdAt)}
              </Text>
            )}
          </View>

          {/* Amount stays right */}
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Text style={[pc.amount, { color: T.text }]}>
              {fmtAmount(amount)}
            </Text>
            {paidOn && (
              <Text style={[pc.paidOn, { color: PRIMARY }]}>
                <MaterialCommunityIcons
                  name="check-circle-outline"
                  size={10}
                  color={PRIMARY}
                />{' '}
                {fmtDate(paidOn)}
              </Text>
            )}
          </View>
        </View>

        {/* Bottom row — note + attachments */}
        {(note && note.trim()) || attachments.length > 0 ? (
          <View
            style={[pc.bottomRow, { borderTopColor: T.border ?? T.cardBorder }]}
          >
            
            {note && note.trim() !== '' && (
              <View style={pc.infoChip}>
                <MaterialCommunityIcons
                  name="note-text-outline"
                  size={11}
                  color={T.muted ?? T.textSub}
                />
                <Text
                  style={[pc.infoChipText, { color: T.muted ?? T.textSub }]}
                  numberOfLines={1}
                >
                  {note}
                </Text>
              </View>
            )}
            {attachments.map((url, idx) => (
              <TouchableOpacity
                key={idx}
                style={pc.infoChip}
                onPress={() => Linking.openURL(url)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="paperclip"
                  size={11}
                  color="#2563EB"
                />
                <Text
                  style={[
                    pc.infoChipText,
                    { color: '#2563EB', textDecorationLine: 'underline' },
                  ]}
                >
                  Attachment {attachments.length > 1 ? idx + 1 : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}
const pc = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  accent: { width: 4, position: 'absolute', top: 0, left: 0, bottom: 0 },
  inner: { marginLeft: 4, padding: Spacing.md },
  topRow: { flexDirection: 'row', alignItems: 'center' },
  // Status badge — LEFT
  statusWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 4,
    flexShrink: 0,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusTxt: { fontSize: 11, fontWeight: '800' },
  // Farmer — RIGHT of badge
  farmer: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  date: { fontSize: 11 },
  amount: { fontSize: 16, fontWeight: '900' },
  paidOn: { fontSize: 10, fontWeight: '600' },
  bottomRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 0.5,
  },
  infoChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoChipText: { fontSize: 11 },
});

// ─── Summary strip ────────────────────────────────────────────────────────────
function SummaryStrip({ meta, T }) {
  return (
    <View
      style={[
        ss.strip,
        { backgroundColor: T.card, borderColor: T.border ?? T.cardBorder },
      ]}
    >
      <View style={ss.item}>
        <Text style={[ss.label, { color: T.muted ?? T.textSub }]}>Total</Text>
        <Text style={[ss.value, { color: T.text }]}>
          {fmtAmount(meta.total_amount)}
        </Text>
        <Text style={[ss.count, { color: T.muted ?? T.textSub }]}>
          {meta.count} records
        </Text>
      </View>
      <View
        style={[ss.divider, { backgroundColor: T.border ?? T.cardBorder }]}
      />
      <View style={ss.item}>
        <Text style={[ss.label, { color: T.muted ?? T.textSub }]}>Paid</Text>
        <Text style={[ss.value, { color: PRIMARY }]}>
          {fmtAmount(meta.paid_amount)}
        </Text>
        <Text style={[ss.count, { color: T.muted ?? T.textSub }]}>
          {meta.paid_count} payments
        </Text>
      </View>
      <View
        style={[ss.divider, { backgroundColor: T.border ?? T.cardBorder }]}
      />
      <View style={ss.item}>
        <Text style={[ss.label, { color: T.muted ?? T.textSub }]}>Pending</Text>
        <Text style={[ss.value, { color: AMBER }]}>
          {fmtAmount(meta.pending_amount)}
        </Text>
        <Text style={[ss.count, { color: T.muted ?? T.textSub }]}>
          {meta.pending_count} pending
        </Text>
      </View>
    </View>
  );
}
const ss = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  item: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  label: { fontSize: 10, fontWeight: '600', marginBottom: 3 },
  value: { fontSize: 16, fontWeight: '900', marginBottom: 2 },
  count: { fontSize: 9, fontWeight: '500' },
  divider: { width: 1, alignSelf: 'stretch' },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function PaymentHistoryScreen({ navigation }) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const T = theme.colors;

  const {
    payments = [],
    paymentsMeta = {},
    paymentsLoading,
  } = useSelector(s => s.soilPartner ?? {});
  const [activeFilter, setActiveFilter] = useState('all');
  const [search, setSearch] = useState('');

  const load = useCallback(
    filter => {
      const filters = {};
      if (filter && filter !== 'all') filters.status = filter;
      dispatch(fetchPayments(filters));
    },
    [dispatch],
  );

  useEffect(() => {
    load('all');
  }, []);

  const handleFilter = key => {
    setActiveFilter(key);
    load(key);
  };

  const filtered = payments.filter(p => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (p.farmer_name ?? '').toLowerCase().includes(q);
  });

  const filters = [
    { key: 'all', label: 'All', color: PRIMARY },
    { key: 'paid', label: 'Paid', color: PRIMARY },
    { key: 'pending', label: 'Pending', color: AMBER },
  ];

  const renderHeader = () => (
    <View>
      <SummaryStrip meta={paymentsMeta} T={T} />

      {/* Search */}
      <View
        style={[
          s.searchBar,
          {
            backgroundColor: T.inputBg ?? T.card,
            borderColor: T.cardBorder ?? T.border,
          },
        ]}
      >
        <MaterialCommunityIcons
          name="magnify"
          size={20}
          color={T.muted ?? T.textSub}
        />
        <TextInput
          style={[s.searchInput, { color: T.text }]}
          placeholder="Search by farmer name…"
          placeholderTextColor={T.muted ?? T.textSub}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
        {search.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearch('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons
              name="close-circle"
              size={16}
              color={T.muted ?? T.textSub}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter pills */}
      <View style={s.filterRow}>
        {filters.map(f => {
          const active = activeFilter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[
                s.filterPill,
                {
                  backgroundColor: active ? f.color : T.card,
                  borderColor: active ? f.color : T.border ?? T.cardBorder,
                },
              ]}
              onPress={() => handleFilter(f.key)}
            >
              <Text style={[s.filterText, { color: active ? '#fff' : T.text }]}>
                {f.label}
              </Text>
              {f.key === 'paid' && paymentsMeta.paid_count > 0 && (
                <View
                  style={[
                    s.filterBadge,
                    { backgroundColor: active ? '#ffffff30' : f.color + '20' },
                  ]}
                >
                  <Text
                    style={[
                      s.filterBadgeText,
                      { color: active ? '#fff' : f.color },
                    ]}
                  >
                    {paymentsMeta.paid_count}
                  </Text>
                </View>
              )}
              {f.key === 'pending' && paymentsMeta.pending_count > 0 && (
                <View
                  style={[
                    s.filterBadge,
                    { backgroundColor: active ? '#ffffff30' : f.color + '20' },
                  ]}
                >
                  <Text
                    style={[
                      s.filterBadgeText,
                      { color: active ? '#fff' : f.color },
                    ]}
                  >
                    {paymentsMeta.pending_count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
        <Text style={[s.resultCount, { color: T.muted ?? T.textSub }]}>
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </Text>
      </View>
    </View>
  );

  const renderEmpty = () => {
    if (paymentsLoading) return null;
    return (
      <View style={s.emptyWrap}>
        <MaterialCommunityIcons
          name="credit-card-off-outline"
          size={52}
          color={T.muted ?? T.textSub}
          style={{ opacity: 0.3 }}
        />
        <Text style={[s.emptyTitle, { color: T.text }]}>No payments found</Text>
        <Text style={[s.emptySub, { color: T.muted ?? T.textSub }]}>
          {activeFilter !== 'all'
            ? `No ${activeFilter} payments yet`
            : 'Your payment history will appear here'}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[s.root, { backgroundColor: T.bg }]}>
      <StatusBar
        barStyle={T.statusBar ?? 'dark-content'}
        backgroundColor={T.bg}
      />
      <TopBar
        title="Payment History"
        subtitle="All transactions"
        onBack={() => navigation.goBack()}
        theme={theme}
      />

      <FlatList
        data={filtered}
        keyExtractor={(item, i) => `${item.id ?? i}`}
        contentContainerStyle={s.list}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={
          paymentsLoading ? (
            <ActivityIndicator
              color={PRIMARY}
              style={{ paddingVertical: Spacing.lg }}
            />
          ) : (
            <View style={{ height: 40 }} />
          )
        }
        renderItem={({ item }) => <PaymentCard payment={item} T={T} />}
        refreshControl={
          <RefreshControl
            refreshing={paymentsLoading}
            onRefresh={() => load(activeFilter)}
            tintColor={PRIMARY}
            colors={[PRIMARY]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  list: { padding: Spacing.lg, paddingTop: Spacing.sm },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 46,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  searchInput: { flex: 1, fontSize: 14 },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.md,
    flexWrap: 'wrap',
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  filterText: { fontSize: 12, fontWeight: '700' },
  filterBadge: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  filterBadgeText: { fontSize: 10, fontWeight: '800' },
  resultCount: { fontSize: 12, marginLeft: 'auto' },
  emptyWrap: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptySub: { fontSize: 13, textAlign: 'center', maxWidth: 240 },
});
