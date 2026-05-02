// src/screens/ble/BLEScanScreen.jsx
// Scan → list → connect → handshake (ARKASHINE_DEVICE / ARKASHINE_TRUE) → navigate
// All state via Redux. No Context.

import React, { useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Radius, Spacing } from '../../theme';
import { TopBar } from '../../components/common';
import useTheme from '../../hooks/useTheme';
import {
  initBLE,
  startScan,
  stopScan,
  connectDevice,
  disconnectDevice,
  cmdReadSensors,
} from '../../redux/actions/bleActions';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BLEScanScreen({ route, navigation }) {
  const item = route?.params?.item;

  const dispatch = useDispatch();
  const theme = useTheme();
  const T = theme.colors;

  const {
    bleAdapterState,
    scanning,
    devices,
    connected,
    connectingDeviceId,
    device: connectedDevice,
    error,
    bleConfig,
    handshakeStatus,
    handshakeRaw,
  } = useSelector(s => s.ble);

  // Start adapter monitor once
  useEffect(() => {
    dispatch(initBLE());
  }, [dispatch]);

  // Auto-scan when BT powers on
  useEffect(() => {
    if (bleAdapterState === 'PoweredOn') dispatch(startScan());
  }, [bleAdapterState, dispatch]);

  useEffect(
    () => () => {
      dispatch(stopScan());
    },
    [dispatch],
  );

  const handleScanToggle = useCallback(() => {
    scanning ? dispatch(stopScan()) : dispatch(startScan());
  }, [scanning, dispatch]);

  const handleConnect = useCallback(
    device => {
      if (connected && connectedDevice?.id === device.id) {
        dispatch(disconnectDevice());
      } else {
        dispatch(connectDevice(device));
      }
    },
    [connected, connectedDevice, dispatch],
  );

  const handleProceed = useCallback(async () => {
    await dispatch(cmdReadSensors()); // sends {"TEST":"START"}
    if (item?.name === 'Ph Bottle') {
      navigation.navigate('CalibrationGateScreen');
    } else if (item?.name === 'SOILENZ') {
      navigation.navigate('IntroScreen');
    }
  }, [dispatch, item, navigation]);

  const btOff =
    bleAdapterState !== 'PoweredOn' && bleAdapterState !== 'Unknown';

  return (
    <SafeAreaView style={[s.container, { backgroundColor: T.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <TopBar
        title="Connect Device"
        onBack={() => navigation.goBack()}
        theme={theme}
      />

      <View style={s.body}>
        {/* ── BT Off ─────────────────────────────────────────────── */}
        {btOff && (
          <View
            style={[
              s.alertBox,
              { borderColor: T.warning, backgroundColor: T.warning + '18' },
            ]}
          >
            <Icon name="bluetooth-off" size={18} color={T.warning} />
            <Text style={[s.alertText, { color: T.warning }]}>
              Bluetooth is {bleAdapterState.toLowerCase()}. Enable it to scan.
            </Text>
          </View>
        )}

        {/* ── Connected Banner ────────────────────────────────────── */}
        {connected && connectedDevice && (
          <ConnectedBanner
            device={connectedDevice}
            bleConfig={bleConfig}
            handshakeStatus={handshakeStatus}
            handshakeRaw={handshakeRaw}
            T={T}
            onDisconnect={() => dispatch(disconnectDevice())}
            onProceed={handleProceed}
          />
        )}

        {/* ── Header row ──────────────────────────────────────────── */}
        <View style={s.headerRow}>
          <View>
            <Text style={[s.title, { color: T.primary }]}>Nearby Devices</Text>
            <Text style={[s.sub, { color: T.muted }]}>
              {scanning
                ? 'Scanning for BLE devices…'
                : `${devices.length} device${
                    devices.length !== 1 ? 's' : ''
                  } found`}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              s.scanBtn,
              {
                backgroundColor: scanning
                  ? 'rgba(239,68,68,0.12)'
                  : T.primaryGlow,
                borderColor: scanning ? '#ef4444' : T.primary,
              },
            ]}
            onPress={handleScanToggle}
            disabled={btOff}
            activeOpacity={0.8}
          >
            {scanning ? (
              <>
                <ActivityIndicator size="small" color="#ef4444" />
                <Text style={[s.scanBtnText, { color: '#ef4444' }]}>Stop</Text>
              </>
            ) : (
              <>
                <Icon name="bluetooth-transfer" size={16} color={T.primary} />
                <Text style={[s.scanBtnText, { color: T.primary }]}>Scan</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Error ───────────────────────────────────────────────── */}
        {error && (
          <View
            style={[
              s.alertBox,
              {
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239,68,68,0.08)',
              },
            ]}
          >
            <Icon name="alert-circle-outline" size={16} color="#ef4444" />
            <Text style={[s.alertText, { color: '#ef4444' }]}>{error}</Text>
          </View>
        )}

        {/* ── Device list ─────────────────────────────────────────── */}
        {devices.length === 0 && !scanning ? (
          <EmptyState T={T} btOff={btOff} onScan={handleScanToggle} />
        ) : (
          <FlatList
            data={devices}
            keyExtractor={item => item.id}
            contentContainerStyle={s.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <DeviceRow
                device={item}
                isConnected={connected && connectedDevice?.id === item.id}
                isConnecting={connectingDeviceId === item.id}
                T={T}
                onPress={() => handleConnect(item)}
              />
            )}
          />
        )}

        {/* ── Pulse while scanning, no devices yet ────────────────── */}
        {scanning && devices.length === 0 && (
          <View style={s.pulseWrap}>
            <PulseRing T={T} />
            <Text style={[s.pulseText, { color: T.muted }]}>
              Looking for BLE devices…
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

// ─── ConnectedBanner ─────────────────────────────────────────────────────────
function ConnectedBanner({
  device,
  bleConfig,
  handshakeStatus,
  handshakeRaw,
  T,
  onDisconnect,
  onProceed,
}) {
  const handshakePending = handshakeStatus === 'pending';
  const handshakeDone = handshakeStatus === 'success';
  const handshakeFailed = handshakeStatus === 'failed';

  const hsColor = handshakeDone
    ? T.primary
    : handshakeFailed
    ? '#ef4444'
    : T.warning ?? '#f59e0b';

  const hsLabel = handshakePending
    ? 'Handshake…'
    : handshakeDone
    ? 'ArkaShine Verified ✅'
    : handshakeFailed
    ? 'Handshake Failed ❌'
    : 'Awaiting handshake';

  return (
    <View
      style={[
        cb.wrap,
        { backgroundColor: T.primaryGlow, borderColor: T.primary },
      ]}
    >
      {/* ── Top row: icon + name + buttons ─────────────────── */}
      <View style={cb.topRow}>
        <Icon name="bluetooth-connect" size={20} color={T.primary} />
        <Text style={[cb.name, { color: T.primary, flex: 1 }]}>
          {device.name || 'Device'}
        </Text>
        <TouchableOpacity
          style={[cb.proceedBtn, { backgroundColor: T.primary }]}
          onPress={onProceed}
        >
          <Text style={cb.proceedText}>Begin Test →</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onDisconnect} style={{ padding: 4 }}>
          <Icon name="close" size={18} color={T.muted} />
        </TouchableOpacity>
      </View>

      {/* ── Handshake status ─────────────────────────────── */}
      <View style={[cb.hsRow, { borderColor: hsColor + '44' }]}>
        {handshakePending ? (
          <ActivityIndicator size="small" color={hsColor} />
        ) : (
          <Icon
            name={
              handshakeDone
                ? 'shield-check'
                : handshakeFailed
                ? 'shield-off'
                : 'shield-outline'
            }
            size={14}
            color={hsColor}
          />
        )}
        <Text style={[cb.hsLabel, { color: hsColor }]}>{hsLabel}</Text>
      </View>

      {/* ── Handshake raw data received ──────────────────── */}
      {handshakeRaw != null && (
        <View style={[cb.rawBox, { borderColor: T.border }]}>
          <Text style={[cb.rawLabel, { color: T.muted }]}>
            Handshake raw recv:
          </Text>
          <Text style={[cb.rawVal, { color: T.primary }]}>{handshakeRaw}</Text>
        </View>
      )}

      {/* ── UUID info ────────────────────────────────────── */}
      {bleConfig && (
        <View style={[cb.uuidBox, { borderColor: T.border }]}>
          <UUIDRow label="SVC" value={bleConfig.serviceUUID} T={T} />
          <UUIDRow label="NTF" value={bleConfig.notifyUUID} T={T} />
          <UUIDRow label="WRT" value={bleConfig.writeUUID} T={T} />
        </View>
      )}
    </View>
  );
}

function UUIDRow({ label, value, T }) {
  return (
    <View style={cb.uuidRow}>
      <Text style={[cb.uuidLabel, { color: T.muted }]}>{label}</Text>
      <Text
        style={[cb.uuidVal, { color: T.textSub ?? T.text }]}
        numberOfLines={1}
        ellipsizeMode="middle"
      >
        {value}
      </Text>
    </View>
  );
}

// ─── DeviceRow ────────────────────────────────────────────────────────────────
function DeviceRow({ device, isConnected, isConnecting, T, onPress }) {
  const strength = rssiStrength(device.rssi);
  return (
    <TouchableOpacity
      style={[
        dr.card,
        {
          backgroundColor: isConnected ? T.primaryGlow : T.card,
          borderColor: isConnected ? T.primary : T.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View
        style={[
          dr.icon,
          { backgroundColor: isConnected ? T.primary + '33' : T.cardAlt },
        ]}
      >
        <Icon
          name={isConnected ? 'bluetooth-connect' : 'bluetooth'}
          size={22}
          color={isConnected ? T.primary : T.muted}
        />
      </View>
      <View style={dr.info}>
        <Text
          style={[dr.name, { color: isConnected ? T.primary : T.orange }]}
          numberOfLines={1}
        >
          {device.name || 'Unknown Device'}
        </Text>
        <Text style={[dr.id, { color: T.muted }]} numberOfLines={1}>
          {device.id}
        </Text>
        {device.rssi != null && (
          <Text style={[dr.rssi, { color: T.muted }]}>{device.rssi} dBm</Text>
        )}
      </View>
      <SignalBars strength={strength} active={isConnected} T={T} />
      <TouchableOpacity
        style={[
          dr.btn,
          {
            backgroundColor: isConnected
              ? 'rgba(239,68,68,0.12)'
              : T.primary + '22',
            borderColor: isConnected ? '#ef4444' : T.primary,
          },
        ]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        {isConnecting ? (
          <ActivityIndicator size="small" color={T.primary} />
        ) : (
          <Text
            style={[dr.btnText, { color: isConnected ? '#ef4444' : T.primary }]}
          >
            {isConnected ? 'Disconnect' : 'Connect'}
          </Text>
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function SignalBars({ strength, active, T }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 2,
        marginRight: 6,
      }}
    >
      {[1, 2, 3].map(b => (
        <View
          key={b}
          style={{
            width: 4,
            height: b * 6 + 4,
            borderRadius: 2,
            backgroundColor:
              b <= strength ? (active ? T.primary : T.muted) : T.border,
          }}
        />
      ))}
    </View>
  );
}

function EmptyState({ T, btOff, onScan }) {
  return (
    <View style={es.wrap}>
      <Icon
        name={btOff ? 'bluetooth-off' : 'bluetooth-search'}
        size={56}
        color={T.border}
      />
      <Text style={[es.title, { color: T.textSub }]}>
        {btOff ? 'Bluetooth is off' : 'No devices found'}
      </Text>
      <Text style={[es.sub, { color: T.muted }]}>
        {btOff
          ? 'Enable Bluetooth and scan again'
          : 'Make sure your Arkashine device is powered on and nearby'}
      </Text>
      {!btOff && (
        <TouchableOpacity
          style={[
            es.btn,
            { borderColor: T.primary, backgroundColor: T.primaryGlow },
          ]}
          onPress={onScan}
        >
          <Icon name="refresh" size={16} color={T.primary} />
          <Text style={[es.btnText, { color: T.primary }]}>Scan Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function PulseRing({ T }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [anim]);

  return (
    <Animated.View
      style={[
        pr.ring,
        {
          borderColor: T.primary,
          opacity: anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.3, 1],
          }),
          transform: [
            {
              scale: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.9, 1.1],
              }),
            },
          ],
        },
      ]}
    >
      <Icon name="bluetooth-transfer" size={32} color={T.primary} />
    </Animated.View>
  );
}

function rssiStrength(rssi) {
  if (!rssi) return 0;
  if (rssi >= -60) return 3;
  if (rssi >= -75) return 2;
  if (rssi >= -90) return 1;
  return 0;
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1 },
  body: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  alertBox: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  alertText: { fontSize: 13, flex: 1, lineHeight: 18 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  title: { fontSize: 20, fontWeight: '900', letterSpacing: -0.4 },
  sub: { fontSize: 12, marginTop: 2 },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  scanBtnText: { fontSize: 13, fontWeight: '800' },
  list: { paddingBottom: Spacing.xl },
  pulseWrap: { alignItems: 'center', paddingTop: 40, gap: 12 },
  pulseText: { fontSize: 13 },
});

const cb = StyleSheet.create({
  wrap: {
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  name: { fontSize: 14, fontWeight: '800' },
  proceedBtn: {
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  proceedText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  hsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: Radius.sm,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  hsLabel: { fontSize: 12, fontWeight: '700' },
  rawBox: {
    borderRadius: Radius.sm,
    borderWidth: 1,
    padding: 8,
  },
  rawLabel: { fontSize: 10, fontWeight: '700', marginBottom: 2 },
  rawVal: { fontSize: 11, fontFamily: 'Courier', fontWeight: '700' },
  uuidBox: {
    borderRadius: Radius.sm,
    borderWidth: 1,
    padding: 8,
    gap: 4,
  },
  uuidRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  uuidLabel: { fontSize: 10, fontWeight: '800', width: 28 },
  uuidVal: { fontSize: 10, flex: 1, fontFamily: 'Courier' },
});

const dr = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: 10,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '800' },
  id: { fontSize: 10, marginTop: 1 },
  rssi: { fontSize: 10, marginTop: 1 },
  btn: {
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  btnText: { fontSize: 12, fontWeight: '800' },
});

const es = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingTop: 60,
  },
  title: { fontSize: 16, fontWeight: '800' },
  sub: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 8,
  },
  btnText: { fontSize: 14, fontWeight: '800' },
});

const pr = StyleSheet.create({
  ring: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
