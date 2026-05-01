// src/components/FloatingDebugPanel.jsx
//
// Global floating debug button — shows:
//   • All commands sent & data received (BLE debug log ring buffer)
//   • Device info: ID, name, UUIDs, handshake status, connection state
//   • Sensor data history
//   • Clear log button
//
// Usage — wrap inside your root Provider (already has Redux access):
//
//   import FloatingDebugPanel from './src/components/FloatingDebugPanel';
//
//   function App() {
//     return (
//       <Provider store={store}>
//         <AppStack />
//         <FloatingDebugPanel />   ← add this
//         <FlashMessage position="top" />
//       </Provider>
//     );
//   }

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Animated,
  PanResponder,
  Dimensions,
  TouchableWithoutFeedback,
  StatusBar,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { clearDebugLog } from '../redux/actions/bleActions';

const { width: SW, height: SH } = Dimensions.get('window');

// ─── Tag colours ──────────────────────────────────────────────────────────────
const TAG_COLORS = {
  CMD:        '#34d399',
  DATA:       '#60a5fa',
  NOTIFY:     '#a78bfa',
  UUID:       '#fbbf24',
  CONNECT:    '#4ade80',
  DISCONNECT: '#f87171',
  RECONNECT:  '#fb923c',
  HANDSHAKE:  '#38bdf8',
  SCAN:       '#38bdf8',
  BLE:        '#94a3b8',
  ERROR:      '#f87171',
};
function tagColor(tag) {
  return TAG_COLORS[tag] ?? '#6b7280';
}

// ─── Tab definitions ──────────────────────────────────────────────────────────
const TABS = [
  { id: 'log',    label: 'Log',    icon: '📋' },
  { id: 'device', label: 'Device', icon: '📡' },
  { id: 'data',   label: 'Data',   icon: '⚡' },
];

// ─── Log Row ──────────────────────────────────────────────────────────────────
function LogRow({ item }) {
  const color = tagColor(item.tag);
  return (
    <View style={lr.row}>
      <Text style={lr.time}>{item.time}</Text>
      <View style={[lr.tagBadge, { borderColor: color + '60' }]}>
        <Text style={[lr.tag, { color }]}>{item.tag}</Text>
      </View>
      <Text style={lr.msg} numberOfLines={2}>{item.message}</Text>
    </View>
  );
}

// ─── Device Tab ───────────────────────────────────────────────────────────────
function DeviceTab({ ble }) {
  const { connected, connecting, device, bleConfig, handshakeStatus, handshakeRaw, bleAdapterState, error } = ble;

  const rows = [
    { label: 'Adapter State',  value: bleAdapterState,            color: bleAdapterState === 'PoweredOn' ? '#4ade80' : '#f87171' },
    { label: 'Connected',      value: connected ? 'YES ✅' : 'NO ❌', color: connected ? '#4ade80' : '#f87171' },
    { label: 'Connecting',     value: connecting ? 'YES…' : 'No',    color: connecting ? '#fbbf24' : '#6b7280' },
    { label: 'Device ID',      value: device?.id     ?? '—',         color: '#a78bfa' },
    { label: 'Device Name',    value: device?.name   ?? '—',         color: '#a78bfa' },
    { label: 'Handshake',      value: handshakeStatus ?? 'none',     color: handshakeStatus === 'success' ? '#4ade80' : handshakeStatus === 'failed' ? '#f87171' : '#6b7280' },
    { label: 'Handshake Raw',  value: handshakeRaw   ?? '—',         color: '#94a3b8' },
    { label: 'Last Error',     value: error          ?? '—',         color: error ? '#f87171' : '#6b7280' },
  ];

  const uuidRows = bleConfig
    ? [
        { label: 'Service UUID',  value: bleConfig.serviceUUID },
        { label: 'Notify UUID',   value: bleConfig.notifyUUID  },
        { label: 'Write UUID',    value: bleConfig.writeUUID   },
      ]
    : [];

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 12 }}>
      {rows.map((r, i) => (
        <View key={i} style={dt.row}>
          <Text style={dt.label}>{r.label}</Text>
          <Text style={[dt.value, { color: r.color }]} selectable numberOfLines={1}>{r.value}</Text>
        </View>
      ))}
      {uuidRows.length > 0 && (
        <View style={dt.uuidBox}>
          <Text style={dt.uuidHeader}>UUIDs (Auto-Detected)</Text>
          {uuidRows.map((r, i) => (
            <View key={i} style={dt.uuidRow}>
              <Text style={dt.uuidLabel}>{r.label}</Text>
              <Text style={dt.uuidVal} selectable numberOfLines={1}>{r.value}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

// ─── Data Tab ─────────────────────────────────────────────────────────────────
function DataTab({ ble }) {
  const { sensorData, rawPayload, lastReceived, lastCmd, lastCmdError } = ble;

  const rows = [
    { label: 'pH',              value: sensorData.ph       !== null ? sensorData.ph?.toFixed(4)       : '—', color: '#60a5fa' },
    { label: 'EC (dS/m)',       value: sensorData.ec       !== null ? sensorData.ec?.toFixed(4)       : '—', color: '#34d399' },
    { label: 'Voltage (V)',     value: sensorData.voltage  !== null ? sensorData.voltage?.toFixed(6)  : '—', color: '#fbbf24' },
    { label: 'Status',         value: sensorData.status   ?? '—',                                              color: '#94a3b8' },
    { label: 'Timer',          value: sensorData.timer    ?? '—',                                              color: '#94a3b8' },
    { label: 'Received Count', value: String(sensorData.receivedCount ?? 0),                                   color: '#a78bfa' },
    { label: 'Last Received',  value: lastReceived ? new Date(lastReceived).toLocaleTimeString() : '—',         color: '#94a3b8' },
    { label: 'Last Command',   value: lastCmd     ?? '—',                                                      color: '#34d399' },
    { label: 'Last CMD Error', value: lastCmdError ?? '—',                                                     color: lastCmdError ? '#f87171' : '#6b7280' },
  ];

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 12 }}>
      {rows.map((r, i) => (
        <View key={i} style={dt.row}>
          <Text style={dt.label}>{r.label}</Text>
          <Text style={[dt.value, { color: r.color }]} selectable numberOfLines={2}>{r.value}</Text>
        </View>
      ))}
      {rawPayload && (
        <View style={dt.rawBox}>
          <Text style={dt.uuidHeader}>Raw Payload</Text>
          <Text style={dt.rawText} selectable>{rawPayload}</Text>
        </View>
      )}
    </ScrollView>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FloatingDebugPanel() {
  const dispatch   = useDispatch();
  const ble        = useSelector(s => s.ble);
  const debugLogs  = ble.debugLogs;

  const [visible, setVisible] = useState(false);
  const [tab,     setTab]     = useState('log');


  const handleClear = useCallback(() => dispatch(clearDebugLog()), [dispatch]);

  const isConnected = ble.connected;
  const hasError    = !!ble.error || ble.handshakeStatus === 'failed';

  // Dot colour: red = error, green = connected, yellow = connecting, grey = off
  const dotColor = hasError
    ? '#f87171'
    : ble.connecting
    ? '#fbbf24'
    : isConnected
    ? '#4ade80'
    : '#6b7280';

  return (
    <>
      {/* ── Floating button ──────────────────────────────────────── */}
      <Animated.View
        style={[fl.fab, ]}
        // {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={fl.fabTouch}
          onPress={() => setVisible(true)}
          activeOpacity={0.85}
        >
          {/* BLE status dot */}
          <View style={[fl.dot, { backgroundColor: dotColor }]} />
          <Text style={fl.fabIcon}>🔧</Text>
          {/* Unread log count badge */}
          {debugLogs.length > 0 && (
            <View style={fl.badge}>
              <Text style={fl.badgeText}>
                {debugLogs.length > 99 ? '99+' : debugLogs.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* ── Debug panel modal ────────────────────────────────────── */}
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={() => setVisible(false)}
        statusBarTranslucent
      >
        <TouchableWithoutFeedback onPress={() => setVisible(false)}>
          <View style={p.overlay} />
        </TouchableWithoutFeedback>

        <View style={p.sheet}>
          {/* Header */}
          <View style={p.header}>
            <View style={p.headerLeft}>
              <Text style={p.headerTitle}>🔧 BLE Debug</Text>
              <View style={[p.statusChip, { backgroundColor: dotColor + '20', borderColor: dotColor }]}>
                <View style={[p.statusDot, { backgroundColor: dotColor }]} />
                <Text style={[p.statusText, { color: dotColor }]}>
                  {ble.connecting ? 'Connecting…' : isConnected ? `${ble.device?.name ?? 'Connected'}` : 'Disconnected'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setVisible(false)} style={p.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={p.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={p.tabs}>
            {TABS.map(t => (
              <TouchableOpacity
                key={t.id}
                style={[p.tab, tab === t.id && p.tabActive]}
                onPress={() => setTab(t.id)}
                activeOpacity={0.7}
              >
                <Text style={p.tabIcon}>{t.icon}</Text>
                <Text style={[p.tabLabel, tab === t.id && p.tabLabelActive]}>
                  {t.label}
                  {t.id === 'log' && debugLogs.length > 0 ? ` (${debugLogs.length})` : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab content */}
          <View style={p.body}>
            {/* LOG TAB */}
            {tab === 'log' && (
              <>
                <View style={p.logActions}>
                  <Text style={p.logHint}>Latest first · {debugLogs.length} entries</Text>
                  <TouchableOpacity onPress={handleClear} style={p.clearBtn}>
                    <Text style={p.clearBtnText}>🗑 Clear</Text>
                  </TouchableOpacity>
                </View>
                {debugLogs.length === 0 ? (
                  <View style={p.emptyState}>
                    <Text style={p.emptyText}>No log entries yet</Text>
                    <Text style={p.emptyHint}>Commands and responses will appear here</Text>
                  </View>
                ) : (
                  <FlatList
                    data={debugLogs}
                    keyExtractor={item => String(item.id)}
                    renderItem={({ item }) => <LogRow item={item} />}
                    style={{ flex: 1 }}
                    showsVerticalScrollIndicator
                    ItemSeparatorComponent={() => <View style={lr.sep} />}
                  />
                )}
              </>
            )}

            {/* DEVICE TAB */}
            {tab === 'device' && <DeviceTab ble={ble} />}

            {/* DATA TAB */}
            {tab === 'data' && <DataTab ble={ble} />}
          </View>
        </View>
      </Modal>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const fl = StyleSheet.create({
  fab: {
    position: 'absolute',
    zIndex: 9999,
    elevation: 20,
    bottom: 30,
    right: 30,
  },
  fabTouch: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#111827',
    borderWidth: 1.5,
    borderColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 12,
  },
  fabIcon: { fontSize: 22 },
  dot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#111827',
  },
  badge: {
    position: 'absolute',
    bottom: 3,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },
});

const p = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SH * 0.80,
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  headerTitle: { color: '#f1f5f9', fontSize: 16, fontWeight: '900' },
  statusChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 20, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  closeBtn: {
    width: 32, height: 32, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#1e293b', borderRadius: 16,
  },
  closeIcon: { color: '#94a3b8', fontSize: 15, fontWeight: '700' },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 10,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#38bdf8' },
  tabIcon: { fontSize: 13 },
  tabLabel: { fontSize: 12, fontWeight: '600', color: '#475569' },
  tabLabelActive: { color: '#38bdf8', fontWeight: '800' },
  body: { flex: 1, padding: 8 },
  logActions: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 4, paddingVertical: 6,
  },
  logHint: { fontSize: 10, color: '#475569' },
  clearBtn: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#1e293b', borderRadius: 8 },
  clearBtnText: { fontSize: 11, color: '#94a3b8', fontWeight: '700' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { color: '#475569', fontSize: 14, fontWeight: '700' },
  emptyHint: { color: '#334155', fontSize: 12 },
});

const lr = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  time: { fontSize: 9, color: '#334155', width: 58, fontFamily: 'Courier', paddingTop: 1 },
  tagBadge: {
    borderRadius: 3, borderWidth: 1,
    paddingHorizontal: 4, paddingVertical: 1,
    minWidth: 58, alignItems: 'center',
  },
  tag: { fontSize: 9, fontWeight: '900', letterSpacing: 0.3 },
  msg: { fontSize: 10, color: '#94a3b8', flex: 1, lineHeight: 14, fontFamily: 'Courier' },
  sep: { height: 1, backgroundColor: '#0f172a' },
});

const dt = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingVertical: 8, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: '#1e293b',
    gap: 12,
  },
  label: { color: '#475569', fontSize: 11, fontWeight: '700', width: 110 },
  value: { fontSize: 11, flex: 1, fontFamily: 'Courier' },
  uuidBox: {
    marginTop: 12, borderRadius: 8,
    backgroundColor: '#1e293b', padding: 10,
  },
  uuidHeader: { color: '#38bdf8', fontSize: 10, fontWeight: '800', marginBottom: 6, textTransform: 'uppercase' },
  uuidRow: { paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#0f172a' },
  uuidLabel: { color: '#475569', fontSize: 9, fontWeight: '700', marginBottom: 2 },
  uuidVal: { color: '#a78bfa', fontSize: 10, fontFamily: 'Courier' },
  rawBox: { marginTop: 12, borderRadius: 8, backgroundColor: '#1e293b', padding: 10 },
  rawText: { color: '#94a3b8', fontSize: 10, fontFamily: 'Courier', lineHeight: 16 },
});