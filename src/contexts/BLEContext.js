import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import { Alert } from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import { Buffer } from 'buffer';

const BLEContext = createContext(null);
const bleManager = new BleManager();

// ─── Hardcoded UUIDs matching your ESP32 firmware ───────────────────────────
export const HARDCODED_UUIDS = {
  serviceUUID: '12345678-1234-1234-1234-1234567890ab',
  notifyUUID: 'abcd1234-5678-1234-5678-1234567890ab',
  writeUUID: 'abcd1234-5678-1234-5678-1234567890ab', // same char, WRITE+NOTIFY
};

// UUID_MODE controls how the app resolves UUIDs at connect time:
//   'hardcoded' → always use HARDCODED_UUIDS above
//   'auto'      → scan services/characteristics and auto-detect
//   'manual'    → use whatever the user typed in manualUUIDs state
export const UUID_MODES = ['hardcoded', 'auto', 'manual'];

export function BLEProvider({ children }) {
  const [bleState, setBleState] = useState('Unknown');
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [bleConfig, setBleConfig] = useState(null);
  const [uuidMode, setUuidMode] = useState('auto'); // 'hardcoded' | 'auto' | 'manual'
  const [manualUUIDs, setManualUUIDs] = useState({
    serviceUUID: '',
    notifyUUID: '',
    writeUUID: '',
  });
  const [sensorData, setSensorData] = useState({
    ec: null,
    ph: null,
    voltage: null,
    status: null,
    timer: null,
    raw: '',
    timestamp: 0,
    receivedCount: 0,
  });
  const [debugLogs, setDebugLogs] = useState([]);

  const notifySubRef = useRef(null);
  const reconnectRef = useRef(null);
  const dataCounterRef = useRef(0);
  const lastUpdateRef = useRef(0);

  // ─── Logger ─────────────────────────────────────────────────────────────────
  const addDebugLog = useCallback((tag, message) => {
    const logEntry = `[${tag}] ${message}`;
    console.log(logEntry);
    setDebugLogs(prev => [
      {
        id: Date.now() + Math.random(),
        time: new Date().toLocaleTimeString(),
        tag,
        message,
        fullText: logEntry,
      },
      ...prev.slice(0, 199),
    ]);
  }, []);

  // ─── BLE state monitor ──────────────────────────────────────────────────────
  useEffect(() => {
    const sub = bleManager.onStateChange(state => {
      addDebugLog('BLE', `Bluetooth state: ${state}`);
      setBleState(state);
    }, true);
    return () => sub.remove();
  }, [addDebugLog]);

  // ─── Data parser ────────────────────────────────────────────────────────────
  const parseData = useCallback(
    bytes => {
      const raw = bytes.toString('utf-8').trim();
      const timestamp = Date.now();
      dataCounterRef.current += 1;
      addDebugLog('DATA', `#${dataCounterRef.current} RAW: ${raw}`);

      const base = {
        ec: null,
        ph: null,
        voltage: null,
        status: null,
        timer: null,
        raw,
        timestamp,
        receivedCount: dataCounterRef.current,
      };

      try {
        const json = JSON.parse(raw);
        const parsed = {
          ...base,
          ec: json.ec ?? json.EC ?? null,
          ph: json.ph ?? json.pH ?? null,
          voltage: json.voltage ?? json.v ?? null,
          status: json.status ?? null,
          timer: json.timer ?? json.time ?? null,
        };
        addDebugLog(
          'DATA',
          `JSON → EC=${parsed.ec}, pH=${parsed.ph}, V=${parsed.voltage}`,
        );
        return parsed;
      } catch (_) {}

      const result = { ...base };
      for (const pair of raw.split(',')) {
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
      if (result.ec !== null || result.ph !== null) {
        addDebugLog(
          'DATA',
          `KV → EC=${result.ec}, pH=${result.ph}, V=${result.voltage}`,
        );
        return result;
      }

      addDebugLog('DATA', 'Fallback raw string');
      return result;
    },
    [addDebugLog],
  );

  // ─── Start notifications ─────────────────────────────────────────────────────
  const startNotifications = useCallback(
    (device, cfg) => {
      addDebugLog('NOTIFY', `Starting monitor`);
      addDebugLog('NOTIFY', `  ServiceUUID : ${cfg.serviceUUID}`);
      addDebugLog('NOTIFY', `  NotifyUUID  : ${cfg.notifyUUID}`);
      notifySubRef.current?.remove();

      notifySubRef.current = device.monitorCharacteristicForService(
        cfg.serviceUUID,
        cfg.notifyUUID,
        (err, char) => {
          if (err) {
            addDebugLog('NOTIFY', `Error: ${err.message}`);
            return;
          }
          if (char?.value) {
            try {
              const bytes = Buffer.from(char.value, 'base64');
              const parsed = parseData(bytes);
              setSensorData(parsed);
              lastUpdateRef.current = Date.now();
            } catch (e) {
              addDebugLog('NOTIFY', `Parse error: ${e.message}`);
            }
          }
        },
      );
      addDebugLog('NOTIFY', 'Monitor active ✅');
    },
    [parseData, addDebugLog],
  );

  // ─── Resolve UUIDs based on current mode ────────────────────────────────────
  const resolveConfig = useCallback(
    async (conn, currentMode) => {
      if (currentMode === 'hardcoded') {
        addDebugLog('UUID', `Mode: HARDCODED`);
        addDebugLog('UUID', `  Service  : ${HARDCODED_UUIDS.serviceUUID}`);
        addDebugLog('UUID', `  Notify   : ${HARDCODED_UUIDS.notifyUUID}`);
        addDebugLog('UUID', `  Write    : ${HARDCODED_UUIDS.writeUUID}`);
        return { ...HARDCODED_UUIDS };
      }

      if (currentMode === 'manual') {
        addDebugLog('UUID', `Mode: MANUAL`);
        addDebugLog('UUID', `  Service  : ${manualUUIDs.serviceUUID}`);
        addDebugLog('UUID', `  Notify   : ${manualUUIDs.notifyUUID}`);
        addDebugLog('UUID', `  Write    : ${manualUUIDs.writeUUID}`);
        if (!manualUUIDs.serviceUUID || !manualUUIDs.notifyUUID) {
          addDebugLog('UUID', 'ERROR: manual UUIDs incomplete');
          return null;
        }
        return {
          serviceUUID: manualUUIDs.serviceUUID.trim(),
          notifyUUID: manualUUIDs.notifyUUID.trim(),
          writeUUID: (manualUUIDs.writeUUID || manualUUIDs.notifyUUID).trim(),
        };
      }

      // AUTO mode — scan device
      addDebugLog('UUID', 'Mode: AUTO — scanning services...');
      const services = await conn.services();
      for (const svc of services) {
        addDebugLog('UUID', `  Service: ${svc.uuid}`);
        const chars = await svc.characteristics();
        let notifyUUID = null;
        let writeUUID = null;

        for (const c of chars) {
          addDebugLog(
            'UUID',
            `    Char: ${c.uuid} | notify=${c.isNotifiable} indicate=${c.isIndicatable} writeResp=${c.isWritableWithResponse} writeNoResp=${c.isWritableWithoutResponse}`,
          );
          if (c.isNotifiable || c.isIndicatable) notifyUUID = c.uuid;
          if (c.isWritableWithResponse || c.isWritableWithoutResponse)
            writeUUID = c.uuid;
        }

        if (notifyUUID) {
          const cfg = {
            serviceUUID: svc.uuid,
            notifyUUID,
            writeUUID: writeUUID || notifyUUID,
          };
          addDebugLog('UUID', `Auto-detected config:`);
          addDebugLog('UUID', `  Service : ${cfg.serviceUUID}`);
          addDebugLog('UUID', `  Notify  : ${cfg.notifyUUID}`);
          addDebugLog('UUID', `  Write   : ${cfg.writeUUID}`);
          return cfg;
        }
      }

      addDebugLog('UUID', 'ERROR: No notifiable characteristic found');
      return null;
    },
    [manualUUIDs, addDebugLog],
  );

  // ─── Connect ─────────────────────────────────────────────────────────────────
  const connect = useCallback(
    async device => {
      try {
        addDebugLog('CONNECT', `Connecting to: ${device.name || device.id}`);
        addDebugLog('CONNECT', `UUID mode: ${uuidMode.toUpperCase()}`);

        const conn = await device.connect({ timeout: 10000 });
        addDebugLog('CONNECT', 'Connected ✅ — discovering services...');

        await conn.discoverAllServicesAndCharacteristics();
        addDebugLog('CONNECT', 'Service discovery complete');

        const cfg = await resolveConfig(conn, uuidMode);
        if (!cfg) {
          Alert.alert(
            'UUID Error',
            'Could not resolve UUIDs. Check UUID mode & values.',
          );
          conn.cancelConnection();
          return false;
        }

        setBleConfig(cfg);
        setConnectedDevice(conn);
        setIsConnected(true);
        dataCounterRef.current = 0;
        startNotifications(conn, cfg);

        conn.onDisconnected(() => {
          addDebugLog('DISCONNECT', 'Device disconnected');
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
            timestamp: 0,
            receivedCount: 0,
          });

          reconnectRef.current = setTimeout(async () => {
            try {
              addDebugLog(
                'RECONNECT',
                `Attempting reconnect (UUID mode: ${uuidMode})...`,
              );
              const reconnected = await bleManager.connectToDevice(conn.id, {
                timeout: 8000,
              });
              await reconnected.discoverAllServicesAndCharacteristics();
              const newCfg = await resolveConfig(reconnected, uuidMode);
              if (newCfg) {
                setConnectedDevice(reconnected);
                setIsConnected(true);
                setBleConfig(newCfg);
                startNotifications(reconnected, newCfg);
                addDebugLog('RECONNECT', 'Success ✅');
              }
            } catch (e) {
              addDebugLog('RECONNECT', `Failed: ${e.message}`);
            }
          }, 3000);
        });

        return true;
      } catch (e) {
        addDebugLog('CONNECT', `Error: ${e.message}`);
        Alert.alert('Connection Failed', e.message);
        return false;
      }
    },
    [uuidMode, resolveConfig, startNotifications, addDebugLog],
  );

  // ─── Send Command ────────────────────────────────────────────────────────────
  // ESP32 uses PROPERTY_WRITE (with response) on the same char as notify.
  // We try writeWithResponse first (correct for ESP32), fallback to without.
  const sendCommand = useCallback(
    async (command, params = '') => {
      if (!connectedDevice || !bleConfig) {
        addDebugLog('CMD', 'Not connected — cannot send');
        Alert.alert('Not connected', 'Please connect to your device first.');
        return;
      }

      const cmdString = params ? `${command}:${params}` : command;
      const encoded = Buffer.from(cmdString, 'utf-8').toString('base64');

      addDebugLog('CMD', `Sending   : "${cmdString}"`);
      addDebugLog('CMD', `ServiceUUID: ${bleConfig.serviceUUID}`);
      addDebugLog('CMD', `WriteUUID  : ${bleConfig.writeUUID}`);
      addDebugLog('CMD', `Encoded(b64): ${encoded}`);

      // ── Try WRITE WITH RESPONSE first (matches ESP32 PROPERTY_WRITE) ──────────
      try {
        await connectedDevice.writeCharacteristicWithResponseForService(
          bleConfig.serviceUUID,
          bleConfig.writeUUID,
          encoded,
        );
        addDebugLog('CMD', `✅ Sent OK (with-response)`);
        return;
      } catch (e1) {
        addDebugLog('CMD', `Write-with-response failed: ${e1.message}`);
      }

      // ── Fallback: WRITE WITHOUT RESPONSE ─────────────────────────────────────
      try {
        await connectedDevice.writeCharacteristicWithoutResponseForService(
          bleConfig.serviceUUID,
          bleConfig.writeUUID,
          encoded,
        );
        addDebugLog('CMD', `✅ Sent OK (without-response)`);
      } catch (e2) {
        addDebugLog('CMD', `❌ Both write methods failed: ${e2.message}`);
        Alert.alert('Command failed', e2.message);
      }
    },
    [connectedDevice, bleConfig, addDebugLog],
  );

  // ─── Disconnect ──────────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    addDebugLog('DISCONNECT', 'User initiated disconnect');
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
      timestamp: 0,
      receivedCount: 0,
    });
  }, [connectedDevice, addDebugLog]);

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
        debugLogs,
        addDebugLog,
        bleConfig,
        uuidMode,
        setUuidMode,
        manualUUIDs,
        setManualUUIDs,
      }}
    >
      {children}
    </BLEContext.Provider>
  );
}

export const useBLE = () => {
  const context = useContext(BLEContext);
  if (!context) throw new Error('useBLE must be used within BLEProvider');
  return context;
};
