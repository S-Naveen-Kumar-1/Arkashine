import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  createContext,
  useContext,
} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  TextInput,
  PermissionsAndroid,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { BleManager, State } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// ─────────────────────────────────────────────────────────────
// GLOBAL BLE MANAGER (singleton)
// ─────────────────────────────────────────────────────────────
const bleManager = new BleManager();
const Stack = createStackNavigator();

// ─────────────────────────────────────────────────────────────
// BLE CONTEXT — shared across all screens
// ─────────────────────────────────────────────────────────────
const BLEContext = createContext(null);

function BLEProvider({ children }) {
  const [bleState, setBleState] = useState('Unknown');
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [bleConfig, setBleConfig] = useState(null); // {serviceUUID, notifyUUID, writeUUID}
  const [sensorData, setSensorData] = useState({
    ec: null,
    ph: null,
    voltage: null,
    status: null,
    timer: null,
    raw: '',
  });
  const notifySubRef = useRef(null);
  const reconnectRef = useRef(null);

  // Monitor Bluetooth state (on/off)
  useEffect(() => {
    const sub = bleManager.onStateChange(state => {
      setBleState(state);
    }, true);
    return () => sub.remove();
  }, []);

  // ── PARSE incoming BLE bytes from device ─────────────────
  // Your device may send JSON or custom string — adjust here
  const parseData = useCallback(bytes => {
    const raw = bytes.toString('utf-8').trim();

    // Try JSON first: {"ec":1.413,"ph":7.0,"voltage":1.9,"status":"ok"}
    try {
      const json = JSON.parse(raw);
      return {
        ec: json.ec ?? json.EC ?? null,
        ph: json.ph ?? json.pH ?? null,
        voltage: json.voltage ?? json.v ?? null,
        status: json.status ?? null,
        timer: json.timer ?? json.time ?? null,
        raw,
      };
    } catch (_) {}

    // Try key=value pairs: ec=1.413,ph=7.0,voltage=1.9
    const result = {
      ec: null,
      ph: null,
      voltage: null,
      status: null,
      timer: null,
      raw,
    };
    const pairs = raw.split(',');
    for (const pair of pairs) {
      const [k, v] = pair.split('=');
      if (!k || !v) continue;
      const key = k.trim().toLowerCase();
      const val = v.trim();
      if (key === 'ec') result.ec = parseFloat(val);
      else if (key === 'ph') result.ph = parseFloat(val);
      else if (key === 'voltage' || key === 'v')
        result.voltage = parseFloat(val);
      else if (key === 'status') result.status = val;
      else if (key === 'timer' || key === 'time')
        result.timer = parseInt(val, 10);
    }
    if (result.ec !== null || result.ph !== null) return result;

    // Fallback — treat as plain string
    return {
      ec: null,
      ph: null,
      voltage: null,
      status: null,
      timer: null,
      raw,
    };
  }, []);

  // ── Start notifications after connect ────────────────────
  const startNotifications = useCallback(
    (device, cfg) => {
      notifySubRef.current?.remove();

      notifySubRef.current = device.monitorCharacteristicForService(
        cfg.serviceUUID,
        cfg.notifyUUID,
        (err, char) => {
          if (err) {
            console.warn('Notify error:', err.message);
            return;
          }
          if (char?.value) {
            const bytes = Buffer.from(char.value, 'base64');
            const parsed = parseData(bytes);
            setSensorData(parsed);
          }
        },
      );
    },
    [parseData],
  );

  // ── CONNECT to a scanned device ──────────────────────────
  const connect = useCallback(
    async device => {
      try {
        const conn = await device.connect({ timeout: 10000 });
        await conn.discoverAllServicesAndCharacteristics();

        // Auto-detect service + notify + write characteristics
        const services = await conn.services();
        let cfg = null;

        for (const svc of services) {
          const chars = await svc.characteristics();
          let notifyUUID = null;
          let writeUUID = null;

          for (const c of chars) {
            if (c.isNotifiable || c.isIndicatable) notifyUUID = c.uuid;
            if (c.isWritableWithResponse || c.isWritableWithoutResponse)
              writeUUID = c.uuid;
          }

          if (notifyUUID) {
            cfg = {
              serviceUUID: svc.uuid,
              notifyUUID,
              writeUUID: writeUUID || notifyUUID, // some devices use same char for both
            };
            break;
          }
        }

        if (!cfg) {
          Alert.alert('Error', 'No data characteristic found on this device.');
          return false;
        }

        setBleConfig(cfg);
        setConnectedDevice(conn);
        setIsConnected(true);
        startNotifications(conn, cfg);

        // Handle unexpected disconnection
        conn.onDisconnected(() => {
          console.log('Device disconnected');
          setIsConnected(false);
          setConnectedDevice(null);
          notifySubRef.current?.remove();
          setSensorData({
            ec: null,
            ph: null,
            voltage: null,
            status: null,
            timer: null,
            raw: '',
          });
          // Auto-reconnect after 3s
          reconnectRef.current = setTimeout(async () => {
            try {
              const reconnected = await bleManager.connectToDevice(conn.id, {
                timeout: 8000,
              });
              await reconnected.discoverAllServicesAndCharacteristics();
              setConnectedDevice(reconnected);
              setIsConnected(true);
              startNotifications(reconnected, cfg);
            } catch {
              console.log('Reconnect failed');
            }
          }, 3000);
        });

        return true;
      } catch (e) {
        Alert.alert('Connection Failed', e.message);
        return false;
      }
    },
    [startNotifications],
  );

  // ── SEND command to device ────────────────────────────────
  // Commands seen in your screenshots: START, ON, OFF
  const sendCommand = useCallback(
    async (command, params = '') => {
      if (!connectedDevice || !bleConfig) {
        Alert.alert('Not connected', 'Please connect to your device first.');
        return;
      }

      // Build command string — adjust format to match your firmware
      // Options: plain string "START", JSON '{"cmd":"START"}', or custom bytes
      const cmdString = params ? `${command}:${params}` : command;
      const encoded = Buffer.from(cmdString, 'utf-8').toString('base64');

      try {
        if (bleConfig.writeUUID) {
          await connectedDevice.writeCharacteristicWithResponseForService(
            bleConfig.serviceUUID,
            bleConfig.writeUUID,
            encoded,
          );
          console.log('Command sent:', cmdString);
        }
      } catch (e) {
        // Try without response if with-response fails
        try {
          await connectedDevice.writeCharacteristicWithoutResponseForService(
            bleConfig.serviceUUID,
            bleConfig.writeUUID,
            encoded,
          );
        } catch (e2) {
          Alert.alert('Command failed', e2.message);
        }
      }
    },
    [connectedDevice, bleConfig],
  );

  // ── DISCONNECT ────────────────────────────────────────────
  const disconnect = useCallback(() => {
    clearTimeout(reconnectRef.current);
    notifySubRef.current?.remove();
    connectedDevice?.cancelConnection();
    setConnectedDevice(null);
    setIsConnected(false);
    setBleConfig(null);
    setSensorData({
      ec: null,
      ph: null,
      voltage: null,
      status: null,
      timer: null,
      raw: '',
    });
  }, [connectedDevice]);

  useEffect(() => {
    return () => {
      clearTimeout(reconnectRef.current);
      notifySubRef.current?.remove();
    };
  }, []);

  return (
    <BLEContext.Provider
      value={{
        bleState,
        connectedDevice,
        isConnected,
        sensorData,
        connect,
        disconnect,
        sendCommand,
      }}
    >
      {children}
    </BLEContext.Provider>
  );
}

const useBLE = () => useContext(BLEContext);

// ─────────────────────────────────────────────────────────────
// PERMISSIONS HELPER
// ─────────────────────────────────────────────────────────────
async function requestBLEPermissions() {
  if (Platform.OS !== 'android') return true;
  const api = Platform.Version;
  if (api >= 31) {
    const result = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ]);
    return Object.values(result).every(
      v => v === PermissionsAndroid.RESULTS.GRANTED,
    );
  } else {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }
}

// ─────────────────────────────────────────────────────────────
// COLORS & THEME
// ─────────────────────────────────────────────────────────────
const C = {
  bg: '#0A0F1E',
  surface: '#111827',
  card: '#1A2236',
  border: '#2A3650',
  accent: '#00C896',
  accentDim: '#007A5E',
  blue: '#3B82F6',
  red: '#EF4444',
  yellow: '#F59E0B',
  white: '#F0F4FF',
  muted: '#6B7A99',
  online: '#22C55E',
  offline: '#EF4444',
};

// ─────────────────────────────────────────────────────────────
// SCREEN 1 — SPLASH
// ─────────────────────────────────────────────────────────────
function SplashScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    const t = setTimeout(() => navigation.replace('Login'), 2200);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={ss.splash}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
          alignItems: 'center',
        }}
      >
        <View style={ss.splashLogo}>
          <Text style={ss.splashLogoText}>A</Text>
        </View>
        <Text style={ss.splashTitle}>ARKASHINE</Text>
        <Text style={ss.splashSub}>Soil Intelligence System</Text>
        <View style={ss.splashDot} />
      </Animated.View>
    </View>
  );
}

const ss = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogo: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: C.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: C.accent,
  },
  splashLogoText: { fontSize: 52, fontWeight: '900', color: C.accent },
  splashTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: C.white,
    letterSpacing: 6,
  },
  splashSub: { fontSize: 14, color: C.muted, marginTop: 6, letterSpacing: 2 },
  splashDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.accent,
    marginTop: 30,
  },
});

// ─────────────────────────────────────────────────────────────
// SCREEN 2 — LOGIN (matches device user details form)
// ─────────────────────────────────────────────────────────────
function LoginScreen({ navigation }) {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const { bleState } = useBLE();

  const proceed = () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter your name');
      return;
    }
    if (!mobile.trim()) {
      Alert.alert('Required', 'Please enter your mobile number');
      return;
    }
    navigation.navigate('Scan', {
      user: { name: name.trim(), mobile: mobile.trim() },
    });
  };

  return (
    <SafeAreaView style={ls.bg}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView
        contentContainerStyle={ls.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={ls.heading}>Enter User Details</Text>
        <Text style={ls.sub}>Required to begin soil testing</Text>

        {/* BLE warning */}
        {bleState !== 'PoweredOn' && (
          <View style={ls.warning}>
            <Text style={ls.warningText}>
              Bluetooth is {bleState === 'PoweredOff' ? 'OFF' : 'unavailable'} —
              please enable it
            </Text>
          </View>
        )}

        <Text style={ls.label}>Name</Text>
        <TextInput
          style={ls.input}
          placeholder="Enter your name"
          placeholderTextColor={C.muted}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />

        <Text style={ls.label}>Mobile Number</Text>
        <TextInput
          style={ls.input}
          placeholder="Enter mobile number"
          placeholderTextColor={C.muted}
          value={mobile}
          onChangeText={setMobile}
          keyboardType="phone-pad"
          maxLength={15}
        />

        <TouchableOpacity style={ls.btn} onPress={proceed}>
          <Text style={ls.btnText}>Continue to Device Scan</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const ls = StyleSheet.create({
  bg: { flex: 1, backgroundColor: C.bg },
  container: { padding: 24, paddingTop: 40 },
  heading: { fontSize: 26, fontWeight: '800', color: C.white, marginBottom: 6 },
  sub: { fontSize: 14, color: C.muted, marginBottom: 28 },
  warning: {
    backgroundColor: '#7C2D12',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  warningText: { color: '#FCA5A5', fontSize: 13 },
  label: {
    fontSize: 13,
    color: C.muted,
    marginBottom: 6,
    marginTop: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: C.white,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: C.border,
  },
  btn: {
    backgroundColor: C.accent,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  btnText: { color: '#000', fontSize: 16, fontWeight: '800' },
});

// ─────────────────────────────────────────────────────────────
// SCREEN 3 — SCAN & CONNECT
// ─────────────────────────────────────────────────────────────
function ScanScreen({ navigation, route }) {
  const { user } = route.params;
  const { bleState, connect, isConnected } = useBLE();
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState([]);
  const [connecting, setConnecting] = useState(null); // device id being connected
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation while scanning
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
    if (ok) navigation.navigate('Dashboard', { user });
  };

  const getSignalStrength = rssi => {
    if (!rssi) return { label: '?', color: C.muted };
    if (rssi > -60) return { label: 'Strong', color: C.online };
    if (rssi > -75) return { label: 'Good', color: C.yellow };
    return { label: 'Weak', color: C.red };
  };

  return (
    <SafeAreaView style={sc.bg}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={sc.container}>
        <Text style={sc.heading}>Find Your Device</Text>
        <Text style={sc.sub}>
          Hello, {user.name} — scan for nearby Arkashine devices
        </Text>

        {/* Scan button with pulse */}
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={[sc.scanBtn, scanning && sc.scanBtnActive]}
            onPress={scanning ? stopScan : scan}
          >
            {scanning ? (
              <View style={sc.scanningRow}>
                <ActivityIndicator
                  color="#000"
                  size="small"
                  style={{ marginRight: 8 }}
                />
                <Text style={sc.scanBtnText}>Scanning… tap to stop</Text>
              </View>
            ) : (
              <Text style={sc.scanBtnText}>Scan for BLE Devices</Text>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Device list */}
        {!scanning && devices.length === 0 && (
          <View style={sc.emptyBox}>
            <Text style={sc.emptyIcon}>○</Text>
            <Text style={sc.emptyText}>No devices found</Text>
            <Text style={sc.emptyHint}>
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
                style={sc.deviceCard}
                onPress={() => handleConnect(item)}
                disabled={isConnecting}
              >
                <View style={sc.deviceLeft}>
                  <View style={[sc.deviceIcon, { borderColor: sig.color }]}>
                    <Text style={[sc.deviceIconText, { color: sig.color }]}>
                      BT
                    </Text>
                  </View>
                  <View>
                    <Text style={sc.deviceName}>
                      {item.name || 'Unknown Device'}
                    </Text>
                    <Text style={sc.deviceId} numberOfLines={1}>
                      {item.id}
                    </Text>
                  </View>
                </View>
                <View style={sc.deviceRight}>
                  {isConnecting ? (
                    <ActivityIndicator color={C.accent} size="small" />
                  ) : (
                    <>
                      <Text style={[sc.signalLabel, { color: sig.color }]}>
                        {sig.label}
                      </Text>
                      <Text style={sc.rssi}>{item.rssi} dBm</Text>
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

const sc = StyleSheet.create({
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

// ─────────────────────────────────────────────────────────────
// SCREEN 4 — DASHBOARD (main screen after connect)
// ─────────────────────────────────────────────────────────────
function DashboardScreen({ navigation, route }) {
  const { user } = route.params;
  const { isConnected, sensorData, sendCommand, disconnect } = useBLE();
  const [activeCmd, setActiveCmd] = useState(null); // which button is active
  const [motorOn, setMotorOn] = useState(false);

  // If disconnected, go back to scan
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

  const { ec, ph, voltage, status, timer, raw } = sensorData;

  return (
    <SafeAreaView style={ds.bg}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={ds.header}>
          <View>
            <Text style={ds.headerTitle}>Arkashine</Text>
            <Text style={ds.headerSub}>
              {user.name} · {user.mobile}
            </Text>
          </View>
          <View style={ds.headerRight}>
            <View
              style={[
                ds.dot,
                { backgroundColor: isConnected ? C.online : C.offline },
              ]}
            />
            <Text
              style={[
                ds.connLabel,
                { color: isConnected ? C.online : C.offline },
              ]}
            >
              {isConnected ? 'Live' : 'Offline'}
            </Text>
            <TouchableOpacity onPress={handleDisconnect} style={ds.discBtn}>
              <Text style={ds.discText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Raw data debug strip */}
        {!!raw && (
          <View style={ds.rawStrip}>
            <Text style={ds.rawText} numberOfLines={1}>
              RAW: {raw}
            </Text>
          </View>
        )}

        {/* ── EC Reading Card ── */}
        <View style={[ds.readingCard, { borderColor: ecColor(ec) }]}>
          <Text style={ds.readingLabel}>EC (Electrical Conductivity)</Text>
          <Text style={[ds.readingValue, { color: ecColor(ec) }]}>
            {ec != null ? ec.toFixed(3) : '--.-'}
          </Text>
          <Text style={ds.readingUnit}>mS/cm</Text>
          {voltage != null && (
            <Text style={ds.voltageText}>Voltage: {voltage.toFixed(5)} V</Text>
          )}
        </View>

        {/* ── pH Reading Card ── */}
        <View style={[ds.readingCard, { borderColor: phColor(ph) }]}>
          <Text style={ds.readingLabel}>pH Level</Text>
          <Text style={[ds.readingValue, { color: phColor(ph) }]}>
            {ph != null ? ph.toFixed(2) : '--.-'}
          </Text>
          <Text style={[ds.phTag, { color: phColor(ph) }]}>{phLabel(ph)}</Text>

          {/* pH scale bar */}
          <View style={ds.scaleContainer}>
            <View style={ds.scaleFill}>
              <View style={[ds.scaleSegAcid, { flex: 6 }]} />
              <View style={[ds.scaleSegNeutral, { flex: 2 }]} />
              <View style={[ds.scaleSegAlkaline, { flex: 6 }]} />
            </View>
            {ph != null && (
              <View style={[ds.scaleMarker, { left: `${(ph / 14) * 100}%` }]} />
            )}
            <View style={ds.scaleLabels}>
              {['0', '2', '4', '6', '7', '8', '10', '12', '14'].map(n => (
                <Text key={n} style={ds.scaleTick}>
                  {n}
                </Text>
              ))}
            </View>
          </View>
        </View>

        {/* ── Status + Timer ── */}
        <View style={ds.statusRow}>
          {status != null && (
            <View style={ds.statusChip}>
              <Text style={ds.statusText}>Status: {status}</Text>
            </View>
          )}
          {timer != null && (
            <View style={[ds.statusChip, { backgroundColor: '#1E293B' }]}>
              <Text style={[ds.statusText, { color: C.yellow }]}>
                Time remaining: {timer}s
              </Text>
            </View>
          )}
        </View>

        {/* ── Device Controls ── */}
        <View style={ds.controlCard}>
          <Text style={ds.controlTitle}>Device Controls</Text>
          <Text style={ds.controlHint}>Tub1: 5gm of soil + 50ml DI water</Text>

          {/* START */}
          <TouchableOpacity
            style={[
              ds.ctrlBtn,
              ds.ctrlStart,
              activeCmd === 'START' && ds.ctrlActive,
            ]}
            onPress={() => handleCommand('START')}
          >
            <Text style={ds.ctrlBtnText}>
              {activeCmd === 'START' ? '…' : 'START'}
            </Text>
          </TouchableOpacity>

          {/* ON / OFF row — matches your device screen */}
          <View style={ds.onOffRow}>
            <TouchableOpacity
              style={[
                ds.ctrlHalf,
                ds.ctrlOn,
                motorOn && ds.ctrlOnActive,
                activeCmd === 'ON' && ds.ctrlActive,
              ]}
              onPress={() => handleCommand('ON')}
            >
              <Text style={ds.ctrlBtnText}>ON</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                ds.ctrlHalf,
                ds.ctrlOff,
                !motorOn && ds.ctrlOffActive,
                activeCmd === 'OFF' && ds.ctrlActive,
              ]}
              onPress={() => handleCommand('OFF')}
            >
              <Text style={ds.ctrlBtnText}>OFF</Text>
            </TouchableOpacity>
          </View>

          {/* Calibration shortcut */}
          <TouchableOpacity
            style={ds.ctrlCalib}
            onPress={() => navigation.navigate('Calibration', { user })}
          >
            <Text style={ds.ctrlCalibText}>Go to Calibration Screen →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const ds = StyleSheet.create({
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
  readingUnit: { fontSize: 14, color: C.muted, marginTop: 2 },
  phTag: { fontSize: 16, fontWeight: '700', marginTop: 6 },
  voltageText: { fontSize: 13, color: C.muted, marginTop: 8 },
  scaleContainer: { width: '100%', marginTop: 16 },
  scaleFill: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  scaleSegAcid: { backgroundColor: '#EF4444' },
  scaleSegNeutral: { backgroundColor: '#22C55E' },
  scaleSegAlkaline: { backgroundColor: '#3B82F6' },
  scaleMarker: {
    position: 'absolute',
    top: -4,
    width: 4,
    height: 18,
    backgroundColor: C.white,
    borderRadius: 2,
    marginLeft: -2,
  },
  scaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  scaleTick: { fontSize: 10, color: C.muted },
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
});

// ─────────────────────────────────────────────────────────────
// SCREEN 5 — CALIBRATION
// (Matches your screenshots: pH 4/7/9 and EC 1.413/12.88)
// ─────────────────────────────────────────────────────────────
function CalibrationScreen({ navigation, route }) {
  const { user } = route.params;
  const { sensorData, sendCommand, isConnected } = useBLE();
  const [tab, setTab] = useState('ph'); // 'ph' or 'ec'

  // pH calibration state — 3 point: 4, 7, 9
  const [phSteps, setPhSteps] = useState([
    {
      standard: 4,
      label: 'Solution 4',
      livePH: null,
      voltage: null,
      state: 'Ready',
    },
    {
      standard: 7,
      label: 'Solution 7',
      livePH: null,
      voltage: null,
      state: 'Waiting',
    },
    {
      standard: 9,
      label: 'Solution 9',
      livePH: null,
      voltage: null,
      state: 'Waiting',
    },
  ]);
  const [phActiveStep, setPhActiveStep] = useState(0);

  // EC calibration state — 2 point: 1.413, 12.88
  const [ecSteps, setEcSteps] = useState([
    {
      standard: 1.413,
      label: 'Solution 1.413',
      liveEC: null,
      voltage: null,
      state: 'Ready',
    },
    {
      standard: 12.88,
      label: 'Solution 12.88',
      liveEC: null,
      voltage: null,
      state: 'Waiting',
    },
  ]);
  const [ecActiveStep, setEcActiveStep] = useState(0);

  // Update live readings into calibration steps
  useEffect(() => {
    if (!sensorData) return;
    if (tab === 'ph' && sensorData.ph != null) {
      setPhSteps(prev =>
        prev.map((s, i) =>
          i === phActiveStep && s.state === 'Measuring'
            ? { ...s, livePH: sensorData.ph, voltage: sensorData.voltage }
            : s,
        ),
      );
    }
    if (tab === 'ec' && sensorData.ec != null) {
      setEcSteps(prev =>
        prev.map((s, i) =>
          i === ecActiveStep && s.state === 'Measuring'
            ? { ...s, liveEC: sensorData.ec, voltage: sensorData.voltage }
            : s,
        ),
      );
    }
  }, [sensorData, tab, phActiveStep, ecActiveStep]);

  const startCalibStep = async () => {
    if (tab === 'ph') {
      const cmd = `CALIB_PH:${phSteps[phActiveStep].standard}`;
      await sendCommand('START', `calib_ph_${phSteps[phActiveStep].standard}`);
      setPhSteps(prev =>
        prev.map((s, i) =>
          i === phActiveStep ? { ...s, state: 'Measuring' } : s,
        ),
      );
    } else {
      await sendCommand('START', `calib_ec_${ecSteps[ecActiveStep].standard}`);
      setEcSteps(prev =>
        prev.map((s, i) =>
          i === ecActiveStep ? { ...s, state: 'Measuring' } : s,
        ),
      );
    }
  };

  const freezeCalibStep = () => {
    if (tab === 'ph') {
      setPhSteps(prev =>
        prev.map((s, i) =>
          i === phActiveStep ? { ...s, state: 'Frozen' } : s,
        ),
      );
      if (phActiveStep < phSteps.length - 1) {
        setPhSteps(prev =>
          prev.map((s, i) =>
            i === phActiveStep + 1 ? { ...s, state: 'Ready' } : s,
          ),
        );
        setPhActiveStep(phActiveStep + 1);
      }
    } else {
      setEcSteps(prev =>
        prev.map((s, i) =>
          i === ecActiveStep ? { ...s, state: 'Frozen' } : s,
        ),
      );
      if (ecActiveStep < ecSteps.length - 1) {
        setEcSteps(prev =>
          prev.map((s, i) =>
            i === ecActiveStep + 1 ? { ...s, state: 'Ready' } : s,
          ),
        );
        setEcActiveStep(ecActiveStep + 1);
      }
    }
  };

  const stateColor = s =>
    s === 'Frozen'
      ? C.accent
      : s === 'Measuring'
      ? C.yellow
      : s === 'Ready'
      ? C.blue
      : C.muted;

  const steps = tab === 'ph' ? phSteps : ecSteps;
  const activeStep = tab === 'ph' ? phActiveStep : ecActiveStep;
  const allFrozen = steps.every(s => s.state === 'Frozen');

  return (
    <SafeAreaView style={cs.bg}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={cs.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={cs.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={cs.title}>100-Test Mandatory Recalibration</Text>
        </View>

        {/* Tab switcher */}
        <View style={cs.tabs}>
          <TouchableOpacity
            style={[cs.tab, tab === 'ph' && cs.tabActive]}
            onPress={() => setTab('ph')}
          >
            <Text style={[cs.tabText, tab === 'ph' && cs.tabTextActive]}>
              pH Calibration
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[cs.tab, tab === 'ec' && cs.tabActive]}
            onPress={() => setTab('ec')}
          >
            <Text style={[cs.tabText, tab === 'ec' && cs.tabTextActive]}>
              EC Calibration
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={cs.instrText}>
          Please press START for each solution respectively to calibrate.
        </Text>

        {/* Calibration step rows */}
        {steps.map((step, i) => (
          <View
            key={i}
            style={[cs.stepCard, i === activeStep && cs.stepCardActive]}
          >
            <View style={cs.stepHeader}>
              <Text style={cs.stepLabel}>
                Probe in {step.label}
                {'\n'}
                <Text style={cs.stepStd}>
                  (Standard {tab === 'ph' ? 'pH' : 'EC'}: {step.standard})
                </Text>
              </Text>
              <View
                style={[cs.stepState, { borderColor: stateColor(step.state) }]}
              >
                <Text
                  style={[cs.stepStateText, { color: stateColor(step.state) }]}
                >
                  {step.state}
                </Text>
              </View>
            </View>

            <View style={cs.stepValues}>
              <View style={cs.stepValueBox}>
                <Text style={cs.stepValueLabel}>
                  Live {tab === 'ph' ? 'pH' : 'EC'}
                </Text>
                <Text style={[cs.stepValue, { color: stateColor(step.state) }]}>
                  {tab === 'ph'
                    ? step.livePH != null
                      ? step.livePH.toFixed(2)
                      : '0.00'
                    : step.liveEC != null
                    ? step.liveEC.toFixed(3)
                    : '0.000'}
                  {step.state === 'Measuring' && (
                    <Text style={cs.blinkCursor}> |</Text>
                  )}
                </Text>
              </View>

              <View style={cs.stepValueBox}>
                <Text style={cs.stepValueLabel}>Voltage</Text>
                <Text
                  style={[
                    cs.stepValue,
                    { color: step.voltage != null ? C.yellow : C.muted },
                  ]}
                >
                  {step.voltage != null
                    ? step.voltage.toFixed(5) + ' V'
                    : '0.00000 V'}
                </Text>
              </View>
            </View>
          </View>
        ))}

        {/* Action buttons */}
        {!allFrozen ? (
          <View style={cs.btnRow}>
            <TouchableOpacity
              style={[cs.startBtn, !isConnected && cs.btnDisabled]}
              disabled={!isConnected}
              onPress={
                steps[activeStep]?.state === 'Measuring'
                  ? freezeCalibStep
                  : startCalibStep
              }
            >
              <Text style={cs.startBtnText}>
                {steps[activeStep]?.state === 'Measuring'
                  ? 'FREEZE / NEXT'
                  : 'START'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={cs.doneBox}>
            <Text style={cs.doneText}>Calibration complete!</Text>
            <TouchableOpacity
              style={cs.doneBtn}
              onPress={() => navigation.goBack()}
            >
              <Text style={cs.doneBtnText}>Back to Dashboard</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const cs = StyleSheet.create({
  bg: { flex: 1, backgroundColor: C.bg },
  header: { padding: 20, paddingBottom: 8 },
  back: { color: C.accent, fontSize: 14, fontWeight: '700', marginBottom: 10 },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: C.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 4,
  },
  tab: { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center' },
  tabActive: { backgroundColor: C.accent },
  tabText: { color: C.muted, fontWeight: '700', fontSize: 14 },
  tabTextActive: { color: '#000' },
  instrText: {
    fontSize: 12,
    color: C.muted,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  stepCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  stepCardActive: { borderColor: C.accent, borderWidth: 1.5 },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stepLabel: { fontSize: 14, fontWeight: '700', color: C.white },
  stepStd: { fontSize: 12, color: C.muted, fontWeight: '400' },
  stepState: {
    borderRadius: 8,
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  stepStateText: { fontSize: 12, fontWeight: '700' },
  stepValues: { flexDirection: 'row', gap: 12 },
  stepValueBox: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  stepValueLabel: {
    fontSize: 11,
    color: C.muted,
    marginBottom: 4,
    fontWeight: '600',
  },
  stepValue: { fontSize: 22, fontWeight: '800' },
  blinkCursor: { color: C.accent },
  btnRow: { marginHorizontal: 16, marginTop: 8 },
  startBtn: {
    backgroundColor: C.accent,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  startBtnText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  btnDisabled: { opacity: 0.4 },
  doneBox: { alignItems: 'center', marginTop: 20, padding: 20 },
  doneText: {
    fontSize: 18,
    fontWeight: '800',
    color: C.accent,
    marginBottom: 16,
  },
  doneBtn: {
    backgroundColor: C.card,
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: C.accent,
  },
  doneBtnText: { color: C.accent, fontWeight: '700', fontSize: 15 },
});

// ─────────────────────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BLEProvider>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{ headerShown: false }}
          initialRouteName="Splash"
        >
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Scan" component={ScanScreen} />
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen name="Calibration" component={CalibrationScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </BLEProvider>
  );
}
