import React, { useState, useRef, useEffect } from 'react';
import {
  SafeAreaView,
  StatusBar,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  Animated,
  StyleSheet,
} from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import { requestBLEPermissions } from '../../utils/permissions';
const bleManager = new BleManager();
import { C } from '../../utils/colors';
import {useBLE} from '../../contexts/BLEContext';
export function ScanScreen({ navigation, route }) {
  const { user } = { name: 'User' }; //route.params;
  const { bleState, connect, isConnected } = useBLE();
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState([]);
  const [connecting, setConnecting] = useState(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (scanning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [scanning]);

  const scan = async () => {
    const ok = await requestBLEPermissions();
    if (!ok) {
      Alert.alert('Permission denied', 'Bluetooth permissions are required.');
      return;
    }
    if (bleState !== 'PoweredOn') {
      Alert.alert('Bluetooth off', 'Please turn on Bluetooth.');
      return;
    }

    setDevices([]);
    setScanning(true);

    bleManager.startDeviceScan(
      null,
      { allowDuplicates: false },
      (err, device) => {
        if (err) {
          console.error('Scan error:', err);
          setScanning(false);
          return;
        }
        if (device) {
          setDevices(prev =>
            prev.find(d => d.id === device.id) ? prev : [...prev, device],
          );
        }
      },
    );

    setTimeout(() => {
      bleManager.stopDeviceScan();
      setScanning(false);
    }, 15000);
  };

  const stopScan = () => {
    bleManager.stopDeviceScan();
    setScanning(false);
  };

  const handleConnect = async device => {
    setConnecting(device.id);
    bleManager.stopDeviceScan();
    setScanning(false);
    const ok = await connect(device);
    setConnecting(null);
    if (ok) navigation.navigate('CalibrationGateScreen');
  };

  const getSignalStrength = rssi => {
    if (!rssi) return { label: '?', color: C.muted };
    if (rssi > -60) return { label: 'Strong', color: C.online };
    if (rssi > -75) return { label: 'Good', color: C.yellow };
    return { label: 'Weak', color: C.red };
  };

  return (
    <SafeAreaView style={styles.bg}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={styles.container}>
        <Text style={styles.heading}>Find Your Device</Text>
        <Text style={styles.sub}>
          Hello, {'naveen'} — scan for nearby Arkashine devices
        </Text>

        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={[styles.scanBtn, scanning && styles.scanBtnActive]}
            onPress={scanning ? stopScan : scan}
          >
            {scanning ? (
              <View style={styles.scanningRow}>
                <ActivityIndicator
                  color="#000"
                  size="small"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.scanBtnText}>Scanning… tap to stop</Text>
              </View>
            ) : (
              <Text style={styles.scanBtnText}>Scan for BLE Devices</Text>
            )}
          </TouchableOpacity>
        </Animated.View>

        {!scanning && devices.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>○</Text>
            <Text style={styles.emptyText}>No devices found</Text>
            <Text style={styles.emptyHint}>
              Make sure your device is powered on and nearby
            </Text>
          </View>
        )}

        <FlatList
          data={devices}
          keyExtractor={d => d.id}
          style={{ marginTop: 16 }}
          renderItem={({ item }) => {
            const sig = getSignalStrength(item.rssi);
            const isConnecting = connecting === item.id;
            return (
              <TouchableOpacity
                style={styles.deviceCard}
                onPress={() => handleConnect(item)}
                disabled={isConnecting}
              >
                <View style={styles.deviceLeft}>
                  <View style={[styles.deviceIcon, { borderColor: sig.color }]}>
                    <Text style={[styles.deviceIconText, { color: sig.color }]}>
                      BT
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.deviceName}>
                      {item.name || 'Unknown Device'}
                    </Text>
                    <Text style={styles.deviceId} numberOfLines={1}>
                      {item.id}
                    </Text>
                  </View>
                </View>
                <View style={styles.deviceRight}>
                  {isConnecting ? (
                    <ActivityIndicator color={C.accent} size="small" />
                  ) : (
                    <>
                      <Text style={[styles.signalLabel, { color: sig.color }]}>
                        {sig.label}
                      </Text>
                      <Text style={styles.rssi}>{item.rssi} dBm</Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: C.bg },
  container: { flex: 1, padding: 20, paddingTop: 24 },
  heading: { fontSize: 24, fontWeight: '800', color: C.white, marginBottom: 4 },
  sub: { fontSize: 14, color: C.muted, marginBottom: 24 },
  scanBtn: {
    backgroundColor: C.accent,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 4,
  },
  scanBtnActive: { backgroundColor: '#00A07A' },
  scanBtnText: { color: '#000', fontSize: 16, fontWeight: '800' },
  scanningRow: { flexDirection: 'row', alignItems: 'center' },
  emptyBox: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 40, color: C.muted, marginBottom: 12 },
  emptyText: { fontSize: 16, color: C.white, fontWeight: '600' },
  emptyHint: {
    fontSize: 13,
    color: C.muted,
    textAlign: 'center',
    marginTop: 6,
  },
  deviceCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: C.border,
  },
  deviceLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  deviceIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  deviceIconText: { fontSize: 12, fontWeight: '800' },
  deviceName: {
    fontSize: 15,
    fontWeight: '700',
    color: C.white,
    maxWidth: 180,
  },
  deviceId: { fontSize: 11, color: C.muted, marginTop: 2, maxWidth: 180 },
  deviceRight: { alignItems: 'flex-end' },
  signalLabel: { fontSize: 12, fontWeight: '700' },
  rssi: { fontSize: 11, color: C.muted, marginTop: 2 },
});
