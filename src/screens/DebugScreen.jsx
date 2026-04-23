import React, { useState, useRef } from 'react';
import {
  SafeAreaView,
  StatusBar,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
} from 'react-native';
import { C } from '../utils/colors';
import { useBLE, HARDCODED_UUIDS, UUID_MODES } from '../contexts/BLEContext';
import { getTagColor } from '../utils/tagColors';

export function DebugScreen({ navigation, route }) {
  const { user } = route.params;
  const {
    sensorData,
    sendCommand,
    isConnected,
    bleState,
    debugLogs,
    bleConfig,
    uuidMode,
    setUuidMode,
    manualUUIDs,
    setManualUUIDs,
  } = useBLE();

  const [commandInput, setCommandInput] = useState('START');
  const [paramInput, setParamInput]     = useState('');
  const logsScrollRef = useRef(null);

  const testCommand = async () => {
    if (!isConnected) {
      Alert.alert('Not connected', 'Please connect to device first');
      return;
    }
    await sendCommand(commandInput, paramInput);
  };

  const loadCommand = (cmd, param = '') => {
    setCommandInput(cmd);
    setParamInput(param);
  };

  // Which UUIDs are actually in use right now
  const activeConfig = bleConfig || (
    uuidMode === 'hardcoded' ? HARDCODED_UUIDS :
    uuidMode === 'manual'    ? manualUUIDs    :
    null
  );

  return (
    <SafeAreaView style={styles.bg}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>🔧 Debug Console</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* ── UUID Mode Selector ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔑 UUID Mode</Text>

          <View style={styles.modeRow}>
            {UUID_MODES.map(mode => (
              <TouchableOpacity
                key={mode}
                style={[styles.modeBtn, uuidMode === mode && styles.modeBtnActive]}
                onPress={() => setUuidMode(mode)}
              >
                <Text style={[styles.modeBtnText, uuidMode === mode && styles.modeBtnTextActive]}>
                  {mode.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Show hardcoded values read-only */}
          {uuidMode === 'hardcoded' && (
            <View style={styles.uuidBox}>
              <Text style={styles.uuidNote}>Using firmware-matched UUIDs (read-only)</Text>
              <UUIDRow label="Service" value={HARDCODED_UUIDS.serviceUUID} />
              <UUIDRow label="Notify"  value={HARDCODED_UUIDS.notifyUUID} />
              <UUIDRow label="Write"   value={HARDCODED_UUIDS.writeUUID} />
            </View>
          )}

          {/* Manual UUID inputs */}
          {uuidMode === 'manual' && (
            <View style={styles.uuidBox}>
              <Text style={styles.uuidNote}>Enter your device UUIDs manually</Text>
              {['serviceUUID', 'notifyUUID', 'writeUUID'].map(field => (
                <View key={field} style={{ marginBottom: 8 }}>
                  <Text style={styles.inputLabel}>{field}:</Text>
                  <TextInput
                    style={styles.input}
                    value={manualUUIDs[field]}
                    onChangeText={val => setManualUUIDs(prev => ({ ...prev, [field]: val }))}
                    placeholder={`e.g., xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`}
                    placeholderTextColor={C.muted}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              ))}
            </View>
          )}

          {/* Auto mode description */}
          {uuidMode === 'auto' && (
            <View style={styles.uuidBox}>
              <Text style={styles.uuidNote}>
                Auto-detect: scans all services &amp; characteristics on connect. Check UUID logs after connecting.
              </Text>
            </View>
          )}

          {/* Active config (post-connect) */}
          {bleConfig && (
            <View style={[styles.uuidBox, { borderColor: C.online, marginTop: 8 }]}>
              <Text style={[styles.uuidNote, { color: C.online }]}>✅ Currently active config</Text>
              <UUIDRow label="Service" value={bleConfig.serviceUUID} />
              <UUIDRow label="Notify"  value={bleConfig.notifyUUID} />
              <UUIDRow label="Write"   value={bleConfig.writeUUID} />
            </View>
          )}
        </View>

        {/* ── Connection Status ──────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📡 Connection Status</Text>
          <View style={styles.card}>
            <StatusRow label="Bluetooth" value={bleState}
              color={bleState === 'PoweredOn' ? C.online : C.offline} />
            <StatusRow label="Device"
              value={isConnected ? '🟢 Connected' : '🔴 Disconnected'}
              color={isConnected ? C.online : C.offline} />
            <StatusRow label="UUID Mode" value={uuidMode.toUpperCase()} color={C.accent} />
          </View>
        </View>

        {/* ── Live Sensor Data ───────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Live Sensor Data</Text>
          <View style={styles.card}>
            <StatusRow label="EC"      value={sensorData.ec      != null ? `${sensorData.ec.toFixed(3)} mS/cm` : '--'} color={C.accent} />
            <StatusRow label="pH"      value={sensorData.ph      != null ? sensorData.ph.toFixed(2)            : '--'} color={C.accent} />
            <StatusRow label="Voltage" value={sensorData.voltage != null ? `${sensorData.voltage.toFixed(5)} V`: '--'} color={C.accent} />
            <StatusRow label="Status"  value={sensorData.status  || 'N/A'} color={C.accent} />
            <StatusRow label="Timer"   value={sensorData.timer   != null ? `${sensorData.timer}s`              : 'N/A'} color={C.accent} />
            <StatusRow label="Count"   value={String(sensorData.receivedCount)} color={C.accent} />

            <View style={styles.separator} />
            <Text style={styles.inputLabel}>Raw Data:</Text>
            <Text style={styles.rawData}>{sensorData.raw || 'No data yet'}</Text>
            <Text style={styles.timestamp}>
              Last update: {sensorData.timestamp ? new Date(sensorData.timestamp).toLocaleTimeString() : '—'}
            </Text>
          </View>
        </View>

        {/* ── Command Tester ─────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎮 Command Tester</Text>

          <Text style={styles.inputLabel}>Command:</Text>
          <TextInput
            style={styles.input}
            value={commandInput}
            onChangeText={setCommandInput}
            placeholder="e.g., START, ON, OFF"
            placeholderTextColor={C.muted}
            autoCapitalize="characters"
          />

          <Text style={styles.inputLabel}>Parameters (optional):</Text>
          <TextInput
            style={styles.input}
            value={paramInput}
            onChangeText={setParamInput}
            placeholder="e.g., calib_ph_4"
            placeholderTextColor={C.muted}
          />

          <TouchableOpacity
            style={[styles.sendBtn, !isConnected && styles.sendBtnDisabled]}
            disabled={!isConnected}
            onPress={testCommand}
          >
            <Text style={styles.sendBtnText}>📤 Send Command</Text>
          </TouchableOpacity>

          <Text style={[styles.sectionTitle, { marginTop: 16, fontSize: 12 }]}>Quick Presets:</Text>
          <View style={styles.presetRow}>
            {['START', 'ON', 'OFF'].map(cmd => (
              <TouchableOpacity key={cmd} style={styles.presetBtn} onPress={() => loadCommand(cmd)}>
                <Text style={styles.presetBtnText}>{cmd}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.presetRow}>
            <TouchableOpacity style={styles.presetBtn} onPress={() => loadCommand('START', 'calib_ph_4')}>
              <Text style={styles.presetBtnText}>CAL pH4</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.presetBtn} onPress={() => loadCommand('START', 'calib_ph_7')}>
              <Text style={styles.presetBtnText}>CAL pH7</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.presetBtn} onPress={() => loadCommand('START', 'calib_ec_1.413')}>
              <Text style={styles.presetBtnText}>CAL EC</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Debug Logs ─────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            📋 Debug Logs ({debugLogs.length})
          </Text>

          {debugLogs.length === 0 ? (
            <View style={[styles.card, { padding: 32, alignItems: 'center' }]}>
              <Text style={{ color: C.muted, fontSize: 13 }}>No logs yet...</Text>
            </View>
          ) : (
            <ScrollView
              ref={logsScrollRef}
              style={styles.logsBox}
              nestedScrollEnabled
              onContentSizeChange={() =>
                logsScrollRef.current?.scrollToEnd({ animated: false })
              }
            >
              {[...debugLogs].reverse().map(log => (
                <View key={log.id} style={styles.logEntry}>
                  <Text style={styles.logTime}>{log.time}</Text>
                  <Text style={[styles.logTag, { color: getTagColor(log.tag) }]}>
                    [{log.tag}]
                  </Text>
                  <Text style={styles.logMessage} numberOfLines={3}>
                    {log.message}
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Small helper components ───────────────────────────────────────────────
function StatusRow({ label, value, color }) {
  return (
    <View style={styles.statusRow}>
      <Text style={styles.statusLabel}>{label}:</Text>
      <Text style={[styles.statusValue, { color }]}>{value}</Text>
    </View>
  );
}

function UUIDRow({ label, value }) {
  return (
    <View style={styles.uuidRow}>
      <Text style={styles.uuidLabel}>{label}:</Text>
      <Text style={styles.uuidValue} numberOfLines={1} adjustsFontSizeToFit>
        {value || '—'}
      </Text>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: { color: C.accent, fontSize: 14, fontWeight: '700' },
  title: { fontSize: 18, fontWeight: '900', color: C.white },

  section: { padding: 16, paddingBottom: 0 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: C.white,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  card: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 16,
  },

  // UUID mode
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  modeBtn: {
    flex: 1,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  modeBtnActive: { backgroundColor: C.accent, borderColor: C.accent },
  modeBtnText: { color: C.muted, fontWeight: '700', fontSize: 11 },
  modeBtnTextActive: { color: '#000' },

  uuidBox: {
    backgroundColor: C.card,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 8,
  },
  uuidNote: { fontSize: 11, color: C.muted, marginBottom: 8, fontStyle: 'italic' },
  uuidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
  },
  uuidLabel: { fontSize: 11, color: C.muted, fontWeight: '700', width: 56 },
  uuidValue: { flex: 1, fontSize: 11, color: C.accent, fontFamily: 'monospace' },

  // Status / data rows
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  statusLabel: { fontSize: 12, color: C.muted, fontWeight: '600' },
  statusValue: { fontSize: 13, fontWeight: '700' },

  separator: { height: 1, backgroundColor: C.border, marginVertical: 8 },
  rawData: {
    backgroundColor: '#0F172A',
    color: C.accent,
    padding: 8,
    borderRadius: 6,
    fontSize: 11,
    fontFamily: 'monospace',
    marginTop: 4,
  },
  timestamp: { fontSize: 10, color: C.muted, marginTop: 6 },

  // Command tester
  inputLabel: {
    fontSize: 12,
    color: C.muted,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    backgroundColor: C.card,
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: C.white,
    borderWidth: 1,
    borderColor: C.border,
  },
  sendBtn: {
    backgroundColor: C.accent,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: '#000', fontWeight: '800', fontSize: 13 },

  presetRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  presetBtn: {
    flex: 1,
    backgroundColor: C.blue,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  presetBtnText: { color: C.white, fontWeight: '700', fontSize: 11 },

  // Logs
  logsBox: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: C.border,
    height: 320,           // fixed height → fully scrollable
    marginBottom: 16,
  },
  logEntry: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    flexWrap: 'wrap',
  },
  logTime:    { fontSize: 10, color: C.muted, width: 52, fontWeight: '600' },
  logTag:     { fontSize: 10, fontWeight: '800', width: 68 },
  logMessage: { flex: 1, fontSize: 10, color: C.white, marginLeft: 4 },
});