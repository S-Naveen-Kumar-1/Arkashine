import React, { useState, useEffect } from 'react';
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
import { ReadingCard } from '../components/ReadingCard';
import { PHScale } from '../components/PHScale';

export function DashboardScreen({ navigation, route }) {
  const { user } = route.params;
  const { isConnected, sensorData, sendCommand, disconnect } = useBLE();
  const [activeCmd, setActiveCmd] = useState(null);
  const [motorOn, setMotorOn] = useState(false);
  const [dataHistory, setDataHistory] = useState([]);

  useEffect(() => {
    if (sensorData.raw) {
      setDataHistory(prev => [
        {
          ...sensorData,
          id: sensorData.timestamp + Math.random(),
        },
        ...prev.slice(0, 9),
      ]);
    }
  }, [sensorData.timestamp]);

  useEffect(() => {
    if (!isConnected) {
      Alert.alert('Disconnected', 'Device disconnected. Trying to reconnect…');
    }
  }, [isConnected]);

  const handleCommand = async cmd => {
    setActiveCmd(cmd);
    await sendCommand(cmd);
    if (cmd === 'ON') setMotorOn(true);
    if (cmd === 'OFF') setMotorOn(false);
    setTimeout(() => setActiveCmd(null), 800);
  };

  const handleDisconnect = () => {
    Alert.alert('Disconnect', 'Disconnect from device?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: () => {
          disconnect();
          navigation.replace('Scan', { user });
        },
      },
    ]);
  };

  const ecColor = v =>
    !v ? C.muted : v < 1 ? C.red : v > 3 ? C.yellow : C.accent;
  const phColor = v =>
    !v ? C.muted : v < 6 ? C.red : v > 8 ? C.blue : C.accent;
  const phLabel = v =>
    !v
      ? '—'
      : v < 5
      ? 'Very Acidic'
      : v < 6
      ? 'Acidic'
      : v < 7
      ? 'Slightly Acidic'
      : v === 7
      ? 'Neutral'
      : v < 8
      ? 'Slightly Alkaline'
      : 'Alkaline';

  const { ec, ph, voltage, status, timer, raw, receivedCount } = sensorData;

  return (
    <SafeAreaView style={styles.bg}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Arkashine</Text>
            <Text style={styles.headerSub}>
              {user.name} · {user.mobile}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <View
              style={[
                styles.dot,
                { backgroundColor: isConnected ? C.online : C.offline },
              ]}
            />
            <Text
              style={[
                styles.connLabel,
                { color: isConnected ? C.online : C.offline },
              ]}
            >
              {isConnected ? 'Live' : 'Offline'}
            </Text>
            <TouchableOpacity onPress={handleDisconnect} style={styles.discBtn}>
              <Text style={styles.discText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Debug & Tester Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.debugBtn, { marginRight: 8 }]}
            onPress={() => navigation.navigate('Debug', { user })}
          >
            <Text style={styles.debugBtnText}>🔧 Debug</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.debugBtn}
            onPress={() => navigation.navigate('CommunicationTester', { user })}
          >
            <Text style={styles.debugBtnText}>🧪 Tester</Text>
          </TouchableOpacity>
        </View>

        {/* Data counter & status */}
        {receivedCount > 0 && (
          <View style={styles.statsBar}>
            <Text style={styles.statsText}>
              📊 Received: {receivedCount} readings
            </Text>
          </View>
        )}

        {/* Raw data debug strip */}
        {!!raw && (
          <View style={styles.rawStrip}>
            <Text style={styles.rawText} numberOfLines={1}>
              RAW: {raw}
            </Text>
          </View>
        )}

        {/* EC Reading Card */}
        <ReadingCard
          label="EC (Electrical Conductivity)"
          value={ec != null ? ec.toFixed(3) : '--.-'}
          unit="mS/cm"
          color={ecColor(ec)}
        >
          {voltage != null && (
            <Text style={styles.voltageText}>
              Voltage: {voltage.toFixed(5)} V
            </Text>
          )}
          <View style={styles.ecGuide}>
            <View style={styles.ecGuideItem}>
              <Text style={styles.ecGuideLabel}>Low</Text>
              <Text style={{ color: C.red }}>0-1 mS/cm</Text>
            </View>
            <View style={styles.ecGuideItem}>
              <Text style={styles.ecGuideLabel}>Medium</Text>
              <Text style={{ color: C.accent }}>1-3 mS/cm</Text>
            </View>
            <View style={styles.ecGuideItem}>
              <Text style={styles.ecGuideLabel}>High</Text>
              <Text style={{ color: C.yellow }}>3+ mS/cm</Text>
            </View>
          </View>
        </ReadingCard>

        {/* pH Reading Card */}
        <View style={[styles.readingCard, { borderColor: phColor(ph) }]}>
          <Text style={styles.readingLabel}>pH Level</Text>
          <Text style={[styles.readingValue, { color: phColor(ph) }]}>
            {ph != null ? ph.toFixed(2) : '--.-'}
          </Text>
          <Text style={[styles.phTag, { color: phColor(ph) }]}>
            {phLabel(ph)}
          </Text>
          <PHScale ph={ph} />
        </View>

        {/* Status + Timer */}
        <View style={styles.statusRow}>
          {status != null && (
            <View style={styles.statusChip}>
              <Text style={styles.statusText}>Status: {status}</Text>
            </View>
          )}
          {timer != null && (
            <View style={[styles.statusChip, { backgroundColor: '#1E293B' }]}>
              <Text style={[styles.statusText, { color: C.yellow }]}>
                Time remaining: {timer}s
              </Text>
            </View>
          )}
        </View>

        {/* Device Controls */}
        <View style={styles.controlCard}>
          <Text style={styles.controlTitle}>Device Controls</Text>
          <Text style={styles.controlHint}>
            Tub1: 5gm of soil + 50ml DI water
          </Text>

          <TouchableOpacity
            style={[
              styles.ctrlBtn,
              styles.ctrlStart,
              activeCmd === 'START' && styles.ctrlActive,
            ]}
            onPress={() => handleCommand('START')}
          >
            <Text style={styles.ctrlBtnText}>
              {activeCmd === 'START' ? '…' : 'START'}
            </Text>
          </TouchableOpacity>

          <View style={styles.onOffRow}>
            <TouchableOpacity
              style={[
                styles.ctrlHalf,
                styles.ctrlOn,
                motorOn && styles.ctrlOnActive,
                activeCmd === 'ON' && styles.ctrlActive,
              ]}
              onPress={() => handleCommand('ON')}
            >
              <Text style={styles.ctrlBtnText}>ON</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.ctrlHalf,
                styles.ctrlOff,
                !motorOn && styles.ctrlOffActive,
                activeCmd === 'OFF' && styles.ctrlActive,
              ]}
              onPress={() => handleCommand('OFF')}
            >
              <Text style={styles.ctrlBtnText}>OFF</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.ctrlCalib}
            onPress={() => navigation.navigate('Calibration', { user })}
          >
            <Text style={styles.ctrlCalibText}>Go to Calibration Screen →</Text>
          </TouchableOpacity>
        </View>

        {/* Data History */}
        {dataHistory.length > 0 && (
          <View style={styles.historyCard}>
            <Text style={styles.historyTitle}>Recent Readings</Text>
            {dataHistory.map((item, i) => (
              <View key={item.id} style={styles.historyItem}>
                <Text style={styles.historyIndex}>#{i + 1}</Text>
                <View style={styles.historyDetails}>
                  <Text style={styles.historyData}>
                    EC: {item.ec?.toFixed(3) || '--'} | pH:{' '}
                    {item.ph?.toFixed(2) || '--'} | V:{' '}
                    {item.voltage?.toFixed(3) || '--'}
                  </Text>
                  <Text style={styles.historyTime}>
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
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
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: { fontSize: 20, fontWeight: '900', color: C.white },
  headerSub: { fontSize: 12, color: C.muted, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  connLabel: { fontSize: 12, fontWeight: '700' },
  discBtn: {
    marginLeft: 8,
    backgroundColor: '#3D1F1F',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  discText: { color: C.red, fontWeight: '800', fontSize: 14 },
  buttonRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  debugBtn: {
    flex: 1,
    backgroundColor: '#663399',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#9966FF',
  },
  debugBtnText: { color: C.white, fontWeight: '800', fontSize: 12 },
  statsBar: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  statsText: {
    fontSize: 12,
    color: C.accent,
    fontWeight: '700',
  },
  rawStrip: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 20,
    paddingVertical: 6,
  },
  rawText: {
    fontSize: 11,
    color: C.muted,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  readingCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  readingLabel: {
    fontSize: 12,
    color: C.muted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  readingValue: { fontSize: 64, fontWeight: '900', lineHeight: 72 },
  phTag: { fontSize: 16, fontWeight: '700', marginTop: 6 },
  voltageText: { fontSize: 13, color: C.muted, marginTop: 8 },
  ecGuide: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
    justifyContent: 'space-around',
    width: '100%',
  },
  ecGuideItem: { alignItems: 'center' },
  ecGuideLabel: { fontSize: 11, color: C.muted, marginBottom: 4 },
  statusRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  statusChip: {
    backgroundColor: C.card,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: C.border,
  },
  statusText: { fontSize: 12, color: C.accent, fontWeight: '600' },
  controlCard: {
    marginHorizontal: 16,
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  controlTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: C.white,
    marginBottom: 4,
  },
  controlHint: { fontSize: 12, color: C.muted, marginBottom: 16 },
  ctrlBtn: {
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  ctrlStart: { backgroundColor: C.accent },
  ctrlActive: { opacity: 0.7 },
  onOffRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  ctrlHalf: {
    flex: 1,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    borderWidth: 2,
  },
  ctrlOn: { borderColor: C.blue, backgroundColor: 'transparent' },
  ctrlOnActive: { backgroundColor: C.blue },
  ctrlOff: { borderColor: C.red, backgroundColor: 'transparent' },
  ctrlOffActive: { backgroundColor: C.red },
  ctrlBtnText: { color: C.white, fontWeight: '800', fontSize: 16 },
  ctrlCalib: {
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    marginTop: 4,
  },
  ctrlCalibText: { color: C.muted, fontWeight: '600', fontSize: 14 },
  historyCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: C.white,
    marginBottom: 12,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  historyIndex: {
    fontSize: 11,
    color: C.muted,
    fontWeight: '700',
    width: 32,
  },
  historyDetails: { flex: 1 },
  historyData: { fontSize: 12, color: C.white, fontWeight: '600' },
  historyTime: { fontSize: 10, color: C.muted, marginTop: 2 },
});
