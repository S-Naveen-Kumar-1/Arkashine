import React, { useState, useCallback, useRef } from 'react';
import {
  SafeAreaView,
  StatusBar,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { C } from '../utils/colors';
import { useBLE } from '../contexts/BLEContext';

export function CommunicationTesterScreen({ navigation, route }) {
  const { user } = route.params;
  const {
    sensorData,
    sendCommand,
    isConnected,
    bleState,
    debugLogs,
    addDebugLog,
    bleConfig,
    connectedDevice,
  } = useBLE();

  const [testResults, setTestResults] = useState([]);
  const [testRunning, setTestRunning] = useState(false);
  const scrollViewRef = useRef(null);

  const testConnection = useCallback(async () => {
    const result = {
      id: Date.now(),
      name: 'Connection Test',
      status: 'running',
      time: new Date().toLocaleTimeString(),
      details: [],
    };

    try {
      result.details.push(`✓ Device connected: ${isConnected}`);
      result.details.push(`✓ Bluetooth state: ${bleState}`);
      result.details.push(`✓ Device exists: ${!!connectedDevice}`);
      result.details.push(`✓ BLE config exists: ${!!bleConfig}`);

      if (isConnected && connectedDevice && bleConfig) {
        result.status = 'pass';
        result.details.push('✅ All connection checks passed!');
      } else {
        result.status = 'fail';
        result.details.push('❌ Connection incomplete');
      }
    } catch (e) {
      result.status = 'fail';
      result.details.push(`❌ Error: ${e.message}`);
    }

    setTestResults(prev => [result, ...prev]);
    addDebugLog('TEST', `Connection Test: ${result.status}`);
    return result.status === 'pass';
  }, [isConnected, bleState, connectedDevice, bleConfig, addDebugLog]);

  const testCommandSending = useCallback(async () => {
    const result = {
      id: Date.now(),
      name: 'Command Sending Test',
      status: 'running',
      time: new Date().toLocaleTimeString(),
      details: [],
      command: 'START',
    };

    try {
      if (!isConnected) {
        result.status = 'fail';
        result.details.push('❌ Not connected to device');
        setTestResults(prev => [result, ...prev]);
        return false;
      }

      const beforeTime = Date.now();
      result.details.push(`📤 Sending command: START`);
      result.details.push(`⏱️ Timestamp: ${beforeTime}`);

      await sendCommand('START');

      const afterTime = Date.now();
      const duration = afterTime - beforeTime;

      result.details.push(`✓ Command sent`);
      result.details.push(`⏱️ Send duration: ${duration}ms`);

      if (sensorData && sensorData.raw) {
        result.details.push(`✓ Data received from device`);
        result.details.push(`📊 Raw data: ${sensorData.raw}`);
        result.status = 'pass';
      } else {
        result.details.push(
          `⚠️ No response yet (wait a moment for device to respond)`,
        );
        result.status = 'partial';
      }
    } catch (e) {
      result.status = 'fail';
      result.details.push(`❌ Error: ${e.message}`);
    }

    setTestResults(prev => [result, ...prev]);
    addDebugLog('TEST', `Command Test: ${result.status}`);
    return result.status === 'pass';
  }, [isConnected, sendCommand, sensorData, addDebugLog]);

  const testDataReception = useCallback(async () => {
    const result = {
      id: Date.now(),
      name: 'Data Reception Test',
      status: 'running',
      time: new Date().toLocaleTimeString(),
      details: [],
    };

    try {
      if (sensorData.receivedCount === 0) {
        result.status = 'fail';
        result.details.push('❌ No data received from hardware');
        result.details.push('⚠️ Make sure hardware is sending data');
      } else {
        result.status = 'pass';
        result.details.push(
          `✓ Data packets received: ${sensorData.receivedCount}`,
        );
        result.details.push(
          `✓ EC: ${sensorData.ec != null ? sensorData.ec : 'N/A'}`,
        );
        result.details.push(
          `✓ pH: ${sensorData.ph != null ? sensorData.ph : 'N/A'}`,
        );
        result.details.push(
          `✓ Voltage: ${
            sensorData.voltage != null ? sensorData.voltage : 'N/A'
          }`,
        );
        result.details.push(`✓ Latest raw: ${sensorData.raw}`);
        result.details.push(
          `✓ Last update: ${new Date(
            sensorData.timestamp,
          ).toLocaleTimeString()}`,
        );
      }
    } catch (e) {
      result.status = 'fail';
      result.details.push(`❌ Error: ${e.message}`);
    }

    setTestResults(prev => [result, ...prev]);
    addDebugLog('TEST', `Data Reception: ${result.status}`);
    return result.status === 'pass';
  }, [sensorData, addDebugLog]);

  const testOnOffCommand = useCallback(
    async cmd => {
      const result = {
        id: Date.now(),
        name: `${cmd} Command Test`,
        status: 'running',
        time: new Date().toLocaleTimeString(),
        details: [],
        command: cmd,
      };

      try {
        result.details.push(`📤 Sending command: ${cmd}`);
        const startTime = Date.now();

        await sendCommand(cmd);

        const duration = Date.now() - startTime;
        result.details.push(`✓ ${cmd} command sent (${duration}ms)`);
        result.details.push(
          '⏳ Wait 2 seconds and check if device state changes',
        );
        result.status = 'pass';
      } catch (e) {
        result.status = 'fail';
        result.details.push(`❌ Error: ${e.message}`);
      }

      setTestResults(prev => [result, ...prev]);
      addDebugLog('TEST', `${cmd} Command: ${result.status}`);
    },
    [sendCommand, addDebugLog],
  );

  const runAllTests = async () => {
    setTestRunning(true);
    setTestResults([]);

    const connOk = await testConnection();
    await new Promise(r => setTimeout(r, 500));

    if (!connOk) {
      Alert.alert('Test Failed', 'Connection test failed. Cannot proceed.');
      setTestRunning(false);
      return;
    }

    await testDataReception();
    await new Promise(r => setTimeout(r, 500));

    await testCommandSending();
    await new Promise(r => setTimeout(r, 2000));

    await testDataReception();
    await new Promise(r => setTimeout(r, 500));

    setTestRunning(false);
    Alert.alert(
      'Tests Complete',
      'Check results below. Look for ✓ (pass) and ✅ (complete)',
    );
  };

  return (
    <SafeAreaView style={styles.bg}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>🧪 Communication Tester</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Quick Status */}
        <View style={styles.statusSection}>
          <Text style={styles.sectionTitle}>📡 Status</Text>
          <View style={styles.statusBox}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Connection:</Text>
              <Text
                style={[
                  styles.statusValue,
                  { color: isConnected ? C.online : C.offline },
                ]}
              >
                {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Data Packets:</Text>
              <Text style={[styles.statusValue, { color: C.accent }]}>
                {sensorData.receivedCount}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Last Data:</Text>
              <Text style={[styles.statusValue, { color: C.accent }]}>
                {new Date(sensorData.timestamp).toLocaleTimeString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Automated Tests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🤖 Automated Tests</Text>

          <TouchableOpacity
            style={[styles.runAllBtn, testRunning && styles.runAllBtnDisabled]}
            disabled={testRunning || !isConnected}
            onPress={runAllTests}
          >
            <Text style={styles.runAllBtnText}>
              {testRunning ? '⏳ Running...' : '▶️ Run All Tests'}
            </Text>
          </TouchableOpacity>

          <View style={styles.quickTestsRow}>
            <TouchableOpacity
              style={styles.quickTestBtn}
              onPress={testConnection}
              disabled={testRunning}
            >
              <Text style={styles.quickTestText}>Connection</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickTestBtn}
              onPress={testDataReception}
              disabled={testRunning}
            >
              <Text style={styles.quickTestText}>Data Rx</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickTestBtn}
              onPress={testCommandSending}
              disabled={testRunning}
            >
              <Text style={styles.quickTestText}>Cmd Tx</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Manual Command Tests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎮 Manual Command Tests</Text>

          <View style={styles.manualCmdRow}>
            <TouchableOpacity
              style={styles.manualCmdBtn}
              onPress={() => testOnOffCommand('ON')}
              disabled={!isConnected}
            >
              <Text style={styles.manualCmdText}>Test ON</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.manualCmdBtn}
              onPress={() => testOnOffCommand('OFF')}
              disabled={!isConnected}
            >
              <Text style={styles.manualCmdText}>Test OFF</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.manualCmdBtn}
              onPress={() => testOnOffCommand('START')}
              disabled={!isConnected}
            >
              <Text style={styles.manualCmdText}>Test START</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Current Sensor Data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Current Sensor Data</Text>

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
              <Text style={styles.dataLabel}>Raw:</Text>
              <Text style={styles.dataValue} numberOfLines={2}>
                {sensorData.raw || 'No data'}
              </Text>
            </View>
          </View>
        </View>

        {/* Test Results */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            📋 Test Results ({testResults.length})
          </Text>

          {testResults.length === 0 ? (
            <View style={styles.emptyResultsBox}>
              <Text style={styles.emptyResultsText}>No tests run yet...</Text>
              <Text style={styles.emptyResultsHint}>
                Click "Run All Tests" to start
              </Text>
            </View>
          ) : (
            <View>
              {testResults.map(result => (
                <View
                  key={result.id}
                  style={[
                    styles.resultCard,
                    result.status === 'pass' && styles.resultCardPass,
                    result.status === 'fail' && styles.resultCardFail,
                    result.status === 'partial' && styles.resultCardPartial,
                    result.status === 'running' && styles.resultCardRunning,
                  ]}
                >
                  <View style={styles.resultHeader}>
                    <Text style={styles.resultName}>{result.name}</Text>
                    <Text
                      style={[
                        styles.resultStatus,
                        result.status === 'pass' && styles.statusPass,
                        result.status === 'fail' && styles.statusFail,
                        result.status === 'partial' && styles.statusPartial,
                        result.status === 'running' && styles.statusRunning,
                      ]}
                    >
                      {result.status === 'pass' && '✅ PASS'}
                      {result.status === 'fail' && '❌ FAIL'}
                      {result.status === 'partial' && '⚠️ PARTIAL'}
                      {result.status === 'running' && '⏳ RUNNING'}
                    </Text>
                  </View>

                  <Text style={styles.resultTime}>{result.time}</Text>

                  <View style={styles.resultDetails}>
                    {result.details.map((detail, i) => (
                      <Text key={i} style={styles.resultDetail}>
                        {detail}
                      </Text>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Debugging Guide */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔍 Debugging Guide</Text>

          <View style={styles.guideBox}>
            <Text style={styles.guideTitle}>If Commands Not Received:</Text>
            <Text style={styles.guideText}>
              1. Check Hardware is powered ON{'\n'}
              2. Verify BLE service/characteristic UUIDs{'\n'}
              3. Look at Debug Console → 📋 Logs{'\n'}
              4. Check if write characteristic is writable{'\n'}
              5. Try sending commands via Debug Console
            </Text>

            <Text style={[styles.guideTitle, { marginTop: 12 }]}>
              If Data Not Received:
            </Text>
            <Text style={styles.guideText}>
              1. Check Hardware is sending data{'\n'}
              2. Verify notification characteristic is notifiable{'\n'}
              3. Check data format (JSON vs key-value){'\n'}
              4. Look at Raw data strip on Dashboard{'\n'}
              5. Increase BLE scan time
            </Text>
          </View>
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
  section: { padding: 16, paddingBottom: 0 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: C.white,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusSection: { padding: 16, paddingBottom: 0 },
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
  runAllBtn: {
    backgroundColor: C.accent,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  runAllBtnDisabled: { opacity: 0.5 },
  runAllBtnText: { color: '#000', fontWeight: '900', fontSize: 14 },
  quickTestsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickTestBtn: {
    flex: 1,
    backgroundColor: C.blue,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  quickTestText: { color: C.white, fontWeight: '700', fontSize: 11 },
  manualCmdRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  manualCmdBtn: {
    flex: 1,
    backgroundColor: '#6B21A8',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  manualCmdText: { color: C.white, fontWeight: '700', fontSize: 11 },
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
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  dataLabel: { fontSize: 12, color: C.muted, fontWeight: '600' },
  dataValue: {
    fontSize: 12,
    fontWeight: '700',
    color: C.accent,
    maxWidth: '60%',
  },
  emptyResultsBox: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 16,
  },
  emptyResultsText: { color: C.white, fontSize: 14, fontWeight: '600' },
  emptyResultsHint: { color: C.muted, fontSize: 12, marginTop: 6 },
  resultCard: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: C.border,
  },
  resultCardPass: { borderColor: C.online, backgroundColor: '#0D3B1A' },
  resultCardFail: { borderColor: C.red, backgroundColor: '#3D0D0D' },
  resultCardPartial: { borderColor: C.yellow, backgroundColor: '#3D2D0D' },
  resultCardRunning: { borderColor: C.blue, backgroundColor: '#0D1F3D' },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  resultName: { fontSize: 13, fontWeight: '800', color: C.white },
  resultStatus: { fontSize: 12, fontWeight: '700' },
  statusPass: { color: C.online },
  statusFail: { color: C.red },
  statusPartial: { color: C.yellow },
  statusRunning: { color: C.blue },
  resultTime: { fontSize: 10, color: C.muted, marginBottom: 8 },
  resultDetails: { backgroundColor: '#0F172A', borderRadius: 8, padding: 10 },
  resultDetail: { fontSize: 11, color: C.accent, marginBottom: 4 },
  guideBox: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 16,
  },
  guideTitle: { fontSize: 12, fontWeight: '800', color: C.white },
  guideText: { fontSize: 11, color: C.muted, marginTop: 6, lineHeight: 18 },
});
