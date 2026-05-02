// src/components/FloatingDebugPanel.jsx
//
// Global floating debug button — shows:
//   • All commands sent & data received (BLE debug log ring buffer)
//   • Device info: ID, name, UUIDs, handshake status, connection state
//   • Sensor data history
//   • Clear log button

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { clearDebugLog } from '../redux/actions/bleActions';

const { height: SH } = Dimensions.get('window');

// ─── Tag colours ──────────────────────────────────────────────────────────────
const TAG_COLORS = {
  CMD: '#34d399',
  DATA: '#60a5fa',
  NOTIFY: '#a78bfa',
  UUID: '#fbbf24',
  CONNECT: '#4ade80',
  DISCONNECT: '#f87171',
  RECONNECT: '#fb923c',
  HANDSHAKE: '#38bdf8',
  SCAN: '#38bdf8',
  BLE: '#94a3b8',
  ERROR: '#f87171',
  CAL: '#f472b6',
  STATUS: '#4ade80',
};
function tagColor(tag) {
  return TAG_COLORS[tag] ?? '#6b7280';
}

// ─── Tab definitions ──────────────────────────────────────────────────────────
const TABS = [
  { id: 'log', label: 'Log', icon: '📋' },
  { id: 'device', label: 'Device', icon: '📡' },
  { id: 'data', label: 'Data', icon: '⚡' },
];

// ─── Log Row ──────────────────────────────────────────────────────────────────
function LogRow({ item }) {
  const color = tagColor(item.tag);
  return (
    <View style={lr.row}>
      {/* Time — fixed width, never truncated */}
      <Text style={lr.time}>{item.time}</Text>

      {/* Tag badge — fixed width */}
      <View style={[lr.tagBadge, { borderColor: color + '60' }]}>
        <Text style={[lr.tag, { color }]} numberOfLines={1}>
          {item.tag}
        </Text>
      </View>

      {/* Message — takes remaining space, wraps freely */}
      <Text style={lr.msg}>{item.message}</Text>
    </View>
  );
}

// ─── Shared info row used in Device + Data tabs ───────────────────────────────
function InfoRow({ label, value, color, mono = true }) {
  return (
    <View style={dt.row}>
      <Text style={dt.label}>{label}</Text>
      <Text
        style={[dt.value, mono && dt.valueMono, { color: color ?? '#94a3b8' }]}
        selectable
      >
        {value}
      </Text>
    </View>
  );
}

// ─── Device Tab ───────────────────────────────────────────────────────────────
function DeviceTab({ ble }) {
  const {
    connected,
    connecting,
    device,
    bleConfig,
    handshakeStatus,
    handshakeRaw,
    bleAdapterState,
    error,
  } = ble;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={dt.scrollContent}>
      <InfoRow
        label="Adapter State"
        value={bleAdapterState ?? '—'}
        color={bleAdapterState === 'PoweredOn' ? '#4ade80' : '#f87171'}
      />
      <InfoRow
        label="Connected"
        value={connected ? 'YES ✅' : 'NO ❌'}
        color={connected ? '#4ade80' : '#f87171'}
      />
      <InfoRow
        label="Connecting"
        value={connecting ? 'YES…' : 'No'}
        color={connecting ? '#fbbf24' : '#6b7280'}
      />
      <InfoRow label="Device ID" value={device?.id ?? '—'} color="#a78bfa" />
      <InfoRow
        label="Device Name"
        value={device?.name ?? '—'}
        color="#a78bfa"
      />
      <InfoRow
        label="Handshake"
        value={handshakeStatus ?? 'none'}
        color={
          handshakeStatus === 'success'
            ? '#4ade80'
            : handshakeStatus === 'failed'
            ? '#f87171'
            : '#6b7280'
        }
      />
      <InfoRow
        label="Handshake Raw"
        value={handshakeRaw ?? '—'}
        color="#94a3b8"
      />
      <InfoRow
        label="Last Error"
        value={error ?? '—'}
        color={error ? '#f87171' : '#6b7280'}
      />

      {bleConfig && (
        <View style={dt.uuidBox}>
          <Text style={dt.uuidHeader}>UUIDs (Hardcoded Firmware)</Text>
          {[
            { label: 'Service UUID', value: bleConfig.serviceUUID },
            { label: 'Notify UUID', value: bleConfig.notifyUUID },
            { label: 'Write UUID', value: bleConfig.writeUUID },
          ].map((r, i) => (
            <View key={i} style={dt.uuidRow}>
              <Text style={dt.uuidLabel}>{r.label}</Text>
              <Text style={dt.uuidVal} selectable>
                {r.value}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

// ─── Data Tab ─────────────────────────────────────────────────────────────────
function DataTab({ ble }) {
  const { sensorData, lastReceived, lastCmd, lastCmdError } = ble;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={dt.scrollContent}>
      <InfoRow
        label="pH"
        value={sensorData.ph !== null ? sensorData.ph?.toFixed(4) : '—'}
        color="#60a5fa"
      />
      <InfoRow
        label="TDS / EC"
        value={sensorData.ec !== null ? sensorData.ec?.toFixed(4) : '—'}
        color="#34d399"
      />
      <InfoRow
        label="pH Voltage"
        value={
          sensorData.voltage !== null
            ? `${sensorData.voltage?.toFixed(6)} V`
            : '—'
        }
        color="#fbbf24"
      />
      <InfoRow
        label="EC Voltage"
        value={
          sensorData.ecVoltage !== null
            ? `${sensorData.ecVoltage?.toFixed(6)} V`
            : '—'
        }
        color="#fb923c"
      />
      <InfoRow
        label="Temperature"
        value={
          sensorData.temperature !== null
            ? `${sensorData.temperature?.toFixed(2)} °C${
                sensorData.temperatureFallback ? ' ⚠️ fallback' : ''
              }`
            : '—'
        }
        color={sensorData.temperatureFallback ? '#F59E0B' : '#94a3b8'}
      />
      <InfoRow
        label="Received #"
        value={String(sensorData.receivedCount ?? 0)}
        color="#a78bfa"
      />
      <InfoRow
        label="Last Received"
        value={lastReceived ? new Date(lastReceived).toLocaleTimeString() : '—'}
        color="#94a3b8"
      />
      <InfoRow label="Last Command" value={lastCmd ?? '—'} color="#34d399" />
      <InfoRow
        label="CMD Error"
        value={lastCmdError ?? '—'}
        color={lastCmdError ? '#f87171' : '#6b7280'}
      />

      {sensorData.raw && (
        <View style={dt.uuidBox}>
          <Text style={dt.uuidHeader}>Raw Payload</Text>
          <Text style={dt.rawText} selectable>
            {sensorData.raw}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FloatingDebugPanel() {
  const dispatch = useDispatch();
  const ble = useSelector(s => s.ble);
  const debugLogs = ble.debugLogs ?? [];

  const [visible, setVisible] = useState(false);
  const [tab, setTab] = useState('log');

  const handleClear = useCallback(() => dispatch(clearDebugLog()), [dispatch]);

  const isConnected = ble.connected;
  const hasError = !!ble.error || ble.handshakeStatus === 'failed';

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
      <View style={fl.fab}>
        <TouchableOpacity
          style={fl.fabTouch}
          onPress={() => setVisible(true)}
          activeOpacity={0.85}
        >
          <View style={[fl.dot, { backgroundColor: dotColor }]} />
          <Text style={fl.fabIcon}>🔧</Text>
          {debugLogs.length > 0 && (
            <View style={fl.badge}>
              <Text style={fl.badgeText}>
                {debugLogs.length > 99 ? '99+' : debugLogs.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

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
          {/* ── Header ─────────────────────────────────────────────── */}
          <View style={p.header}>
            <View style={p.headerLeft}>
              <Text style={p.headerTitle}>🔧 BLE Debug</Text>
              <View
                style={[
                  p.statusChip,
                  { backgroundColor: dotColor + '20', borderColor: dotColor },
                ]}
              >
                <View style={[p.statusDot, { backgroundColor: dotColor }]} />
                <Text
                  style={[p.statusText, { color: dotColor }]}
                  numberOfLines={1}
                >
                  {ble.connecting
                    ? 'Connecting…'
                    : isConnected
                    ? ble.device?.name ?? 'Connected'
                    : 'Disconnected'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setVisible(false)}
              style={p.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={p.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* ── Tabs ───────────────────────────────────────────────── */}
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
                  {t.id === 'log' && debugLogs.length > 0
                    ? ` (${debugLogs.length})`
                    : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Body ───────────────────────────────────────────────── */}
          <View style={p.body}>
            {/* LOG TAB */}
            {tab === 'log' && (
              <>
                <View style={p.logActions}>
                  <Text style={p.logHint}>
                    Latest first · {debugLogs.length} entries
                  </Text>
                  <TouchableOpacity onPress={handleClear} style={p.clearBtn}>
                    <Text style={p.clearBtnText}>🗑 Clear</Text>
                  </TouchableOpacity>
                </View>

                {debugLogs.length === 0 ? (
                  <View style={p.emptyState}>
                    <Text style={p.emptyText}>No log entries yet</Text>
                    <Text style={p.emptyHint}>
                      Commands and responses will appear here
                    </Text>
                  </View>
                ) : (
                  <FlatList
                    data={[...debugLogs].reverse()}
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
    right: 20,
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
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SH * 0.82,
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: '#1e293b',
    overflow: 'hidden',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  headerTitle: {
    color: '#f1f5f9',
    fontSize: 15,
    fontWeight: '900',
    flexShrink: 0,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 4,
    flexShrink: 1, // ← lets chip shrink if device name is long
    minWidth: 0,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    flexShrink: 1, // ← wraps instead of clipping
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    flexShrink: 0,
  },
  closeIcon: { color: '#94a3b8', fontSize: 15, fontWeight: '700' },

  // Tabs
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#38bdf8' },
  tabIcon: { fontSize: 12 },
  tabLabel: { fontSize: 12, fontWeight: '600', color: '#475569' },
  tabLabelActive: { color: '#38bdf8', fontWeight: '800' },

  // Body
  body: { flex: 1 },

  // Log toolbar
  logActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  logHint: { fontSize: 10, color: '#475569' },
  clearBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#1e293b',
    borderRadius: 8,
  },
  clearBtnText: { fontSize: 11, color: '#94a3b8', fontWeight: '700' },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: { color: '#475569', fontSize: 14, fontWeight: '700' },
  emptyHint: { color: '#334155', fontSize: 12 },
});

// ─── Log row styles ───────────────────────────────────────────────────────────
const lr = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 6,
  },
  time: {
    // Fixed width so it never squeezes siblings
    width: 62,
    fontSize: 9,
    color: '#334155',
    fontFamily: 'Courier',
    paddingTop: 2,
    flexShrink: 0,
  },
  tagBadge: {
    // Fixed width for tag column — keeps log aligned
    width: 68,
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  tag: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  msg: {
    // flex: 1 + no numberOfLines = wraps to as many lines as needed
    flex: 1,
    fontSize: 10,
    color: '#94a3b8',
    lineHeight: 15,
    fontFamily: 'Courier',
    // Do NOT set numberOfLines here — let it wrap freely
  },
  sep: { height: 1, backgroundColor: '#1e293b' },
});

// ─── Device / Data tab styles ─────────────────────────────────────────────────
const dt = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    paddingBottom: 24,
  },
  row: {
    // Stack label above value on narrow screens so neither gets clipped
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    gap: 8,
  },
  label: {
    // Fixed-width label column
    width: 110,
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
    flexShrink: 0,
    paddingTop: 1,
  },
  value: {
    // Takes remaining space and wraps
    flex: 1,
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 16,
    // No numberOfLines → wraps freely
  },
  valueMono: {
    fontFamily: 'Courier',
  },

  // UUID / raw payload box
  uuidBox: {
    marginTop: 14,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    padding: 12,
  },
  uuidHeader: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  uuidRow: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#0f172a',
  },
  uuidLabel: {
    color: '#475569',
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 3,
  },
  uuidVal: {
    // UUID strings are long — wrap instead of clip
    color: '#a78bfa',
    fontSize: 10,
    fontFamily: 'Courier',
    lineHeight: 15,
  },
  rawText: {
    color: '#94a3b8',
    fontSize: 10,
    fontFamily: 'Courier',
    lineHeight: 16,
  },
});
