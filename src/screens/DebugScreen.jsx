import React, { useState, useEffect, useRef } from 'react';
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
import { useBLE } from '../contexts/BLEContext';
import { getTagColor } from '../utils/tagColors';

export function DebugScreen({ navigation, route }) {
  const { user } = route.params;
  const {
    sensorData,
    sendCommand,
    isConnected,
    bleState,
    debugLogs,
    addDebugLog,
  } = useBLE();
  const [commandInput, setCommandInput] = useState('START');
  const [paramInput, setParamInput] = useState('');
  const [displayLogs, setDisplayLogs] = useState(debugLogs);
  const scrollViewRef = useRef(null);

  useEffect(() => {
    setDisplayLogs(debugLogs);
  }, [debugLogs]);

  const testCommand = async () => {
    if (!isConnected) {
      Alert.alert('Not connected', 'Please connect to device first');
      return;
    }
    console.log('[TEST] Sending:', commandInput, paramInput);
    await sendCommand(commandInput, paramInput);
  };

  const loadCommand = (cmd, param = '') => {
    setCommandInput(cmd);
    setParamInput(param);
  };

  return (
    <SafeAreaView style={styles.bg}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>🔧 Debug Console</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Status Section */}
        <View style={styles.statusSection}>
          <Text style={styles.sectionTitle}>📡 Connection Status</Text>

          <View style={styles.statusBox}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Bluetooth:</Text>
              <Text
                style={[
                  styles.statusValue,
                  {
                    color: bleState === 'PoweredOn' ? C.online : C.offline,
                  },
                ]}
              >
                {bleState}
              </Text>
            </View>

            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Device:</Text>
              <Text
                style={[
                  styles.statusValue,
                  { color: isConnected ? C.online : C.offline },
                ]}
              >
                {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
              </Text>
            </View>
          </View>
        </View>

        {/* Sensor Data Section */}
        <View style={styles.dataSection}>
          <Text style={styles.sectionTitle}>📊 Live Sensor Data</Text>

          <View style={styles.dataBox}>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>EC:</Text>
              <Text style={styles.dataValue}>
                {sensorData.ec != null ? sensorData.ec.toFixed(3) : '--.-'}{' '}
                mS/cm
              </Text>
            </View>

            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>pH:</Text>
              <Text style={styles.dataValue}>
                {sensorData.ph != null ? sensorData.ph.toFixed(2) : '--.-'}
              </Text>
            </View>

            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Voltage:</Text>
              <Text style={styles.dataValue}>
                {sensorData.voltage != null
                  ? sensorData.voltage.toFixed(5)
                  : '--.-'}{' '}
                V
              </Text>
            </View>

            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Status:</Text>
              <Text style={styles.dataValue}>{sensorData.status || 'N/A'}</Text>
            </View>

            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Timer:</Text>
              <Text style={styles.dataValue}>
                {sensorData.timer != null ? sensorData.timer + 's' : 'N/A'}
              </Text>
            </View>

            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Received:</Text>
              <Text style={styles.dataValue}>{sensorData.receivedCount}</Text>
            </View>

            <View style={styles.separator} />

            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Raw Data:</Text>
            </View>
            <Text style={styles.rawData}>
              {sensorData.raw || 'No data yet'}
            </Text>

            <Text style={styles.timestamp}>
              Last update: {new Date(sensorData.timestamp).toLocaleTimeString()}
            </Text>
          </View>
        </View>

        {/* Command Tester Section */}
        <View style={styles.commandSection}>
          <Text style={styles.sectionTitle}>🎮 Command Tester</Text>

          <Text style={styles.inputLabel}>Command:</Text>
          <TextInput
            style={styles.input}
            value={commandInput}
            onChangeText={setCommandInput}
            placeholder="e.g., START, ON, OFF"
            placeholderTextColor={C.muted}
          />

          <Text style={styles.inputLabel}>Parameters:</Text>
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

          <Text style={[styles.sectionTitle, { marginTop: 16, fontSize: 13 }]}>
            Quick Presets:
          </Text>

          <View style={styles.presetRow}>
            <TouchableOpacity
              style={styles.presetBtn}
              onPress={() => loadCommand('START')}
            >
              <Text style={styles.presetBtnText}>START</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.presetBtn}
              onPress={() => loadCommand('ON')}
            >
              <Text style={styles.presetBtnText}>ON</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.presetBtn}
              onPress={() => loadCommand('OFF')}
            >
              <Text style={styles.presetBtnText}>OFF</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.presetRow}>
            <TouchableOpacity
              style={styles.presetBtn}
              onPress={() => loadCommand('START', 'calib_ph_4')}
            >
              <Text style={styles.presetBtnText}>CAL pH4</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.presetBtn}
              onPress={() => loadCommand('START', 'calib_ph_7')}
            >
              <Text style={styles.presetBtnText}>CAL pH7</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.presetBtn}
              onPress={() => loadCommand('START', 'calib_ec_1.413')}
            >
              <Text style={styles.presetBtnText}>CAL EC</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Logs Section */}
        <View style={styles.logsSection}>
          <Text style={styles.sectionTitle}>
            📋 Debug Logs ({displayLogs.length})
          </Text>

          {displayLogs.length === 0 ? (
            <View style={styles.emptyLogsBox}>
              <Text style={styles.emptyLogsText}>No logs yet...</Text>
            </View>
          ) : (
            <ScrollView
              ref={scrollViewRef}
              style={styles.logsBox}
              onContentSizeChange={() =>
                scrollViewRef.current?.scrollToEnd({ animated: true })
              }
            >
              {displayLogs.map(log => (
                <View key={log.id} style={styles.logEntry}>
                  <Text style={styles.logTime}>{log.time}</Text>
                  <Text
                    style={[
                      styles.logTag,
                      {
                        color: getTagColor(log.tag),
                      },
                    ]}
                  >
                    [{log.tag}]
                  </Text>
                  <Text style={styles.logMessage}>{log.message}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

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
  statusSection: { padding: 16, paddingBottom: 0 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: C.white,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusBox: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  statusLabel: { fontSize: 12, color: C.muted, fontWeight: '600' },
  statusValue: { fontSize: 13, fontWeight: '700' },
  dataSection: { padding: 16, paddingBottom: 0 },
  dataBox: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 16,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  dataLabel: { fontSize: 12, color: C.muted, fontWeight: '600' },
  dataValue: { fontSize: 13, fontWeight: '700', color: C.accent },
  separator: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 8,
  },
  rawData: {
    backgroundColor: '#0F172A',
    color: C.accent,
    padding: 8,
    borderRadius: 6,
    fontSize: 11,
    fontFamily: 'monospace',
    marginTop: 6,
    overflow: 'hidden',
  },
  timestamp: { fontSize: 10, color: C.muted, marginTop: 8 },
  commandSection: { padding: 16, paddingBottom: 0 },
  inputLabel: {
    fontSize: 12,
    color: C.muted,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: C.card,
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: C.white,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 10,
  },
  sendBtn: {
    backgroundColor: C.accent,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: '#000', fontWeight: '800', fontSize: 13 },
  presetRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  presetBtn: {
    flex: 1,
    backgroundColor: C.blue,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  presetBtnText: { color: C.white, fontWeight: '700', fontSize: 11 },
  logsSection: { padding: 16 },
  logsBox: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: C.border,
    maxHeight: 300,
  },
  emptyLogsBox: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  emptyLogsText: { color: C.muted, fontSize: 13 },
  logEntry: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  logTime: { fontSize: 10, color: C.muted, width: 50, fontWeight: '600' },
  logTag: { fontSize: 10, fontWeight: '800', width: 70 },
  logMessage: { flex: 1, fontSize: 10, color: C.white, marginLeft: 8 },
});
