import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { BleManager, State } from 'react-native-ble-plx';
import { Buffer } from 'buffer';

const BLEContext = createContext(null);
const bleManager = new BleManager();

export function BLEProvider({ children }) {
  const [bleState, setBleState] = useState('Unknown');
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [bleConfig, setBleConfig] = useState(null);
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
      ...prev.slice(0, 99),
    ]);
  }, []);

  useEffect(() => {
    const sub = bleManager.onStateChange(state => {
      addDebugLog('BLE', `Bluetooth state changed: ${state}`);
      setBleState(state);
    }, true);
    return () => sub.remove();
  }, [addDebugLog]);

  const parseData = useCallback(
    bytes => {
      const raw = bytes.toString('utf-8').trim();
      const timestamp = Date.now();
      dataCounterRef.current += 1;

      addDebugLog('DATA', `Received #${dataCounterRef.current} RAW: ${raw}`);

      try {
        const json = JSON.parse(raw);
        const parsed = {
          ec: json.ec ?? json.EC ?? null,
          ph: json.ph ?? json.pH ?? null,
          voltage: json.voltage ?? json.v ?? null,
          status: json.status ?? null,
          timer: json.timer ?? json.time ?? null,
          raw,
          timestamp,
          receivedCount: dataCounterRef.current,
        };
        addDebugLog(
          'DATA',
          `Parsed JSON: EC=${parsed.ec}, pH=${parsed.ph}, V=${parsed.voltage}`,
        );
        return parsed;
      } catch (e) {
        addDebugLog('DATA', 'Not JSON, trying key-value...');
      }

      const result = {
        ec: null,
        ph: null,
        voltage: null,
        status: null,
        timer: null,
        raw,
        timestamp,
        receivedCount: dataCounterRef.current,
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

      if (result.ec !== null || result.ph !== null) {
        addDebugLog(
          'DATA',
          `Parsed key-value: EC=${result.ec}, pH=${result.ph}, V=${result.voltage}`,
        );
        return result;
      }

      addDebugLog('DATA', 'Fallback - treating as raw string');
      return result;
    },
    [addDebugLog],
  );

  const startNotifications = useCallback(
    (device, cfg) => {
      addDebugLog('NOTIFY', `Starting notifications for ${cfg.notifyUUID}`);
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
      addDebugLog('NOTIFY', 'Monitoring started');
    },
    [parseData, addDebugLog],
  );

  const connect = useCallback(
    async device => {
      try {
        addDebugLog('CONNECT', `Connecting to ${device.name || device.id}`);
        const conn = await device.connect({ timeout: 10000 });
        addDebugLog('CONNECT', 'Connected, discovering services...');

        await conn.discoverAllServicesAndCharacteristics();
        addDebugLog('CONNECT', 'Services discovered');

        const services = await conn.services();
        let cfg = null;

        for (const svc of services) {
          addDebugLog('SERVICE', `Discovered service: ${svc.uuid}`);
          const chars = await svc.characteristics();

          let notifyUUID = null;
          let writeUUID = null;

          for (const c of chars) {
            addDebugLog(
              'CHAR',
              `${c.uuid} - notify: ${c.isNotifiable}, indicate: ${c.isIndicatable}, write-resp: ${c.isWritableWithResponse}, write-no-resp: ${c.isWritableWithoutResponse}`,
            );

            if (c.isNotifiable || c.isIndicatable) notifyUUID = c.uuid;
            if (c.isWritableWithResponse || c.isWritableWithoutResponse)
              writeUUID = c.uuid;
          }

          if (notifyUUID) {
            cfg = {
              serviceUUID: svc.uuid,
              notifyUUID,
              writeUUID: writeUUID || notifyUUID,
            };
            addDebugLog(
              'CONFIG',
              `Auto-detected: Service=${cfg.serviceUUID}, Notify=${cfg.notifyUUID}, Write=${cfg.writeUUID}`,
            );
            break;
          }
        }

        if (!cfg) {
          addDebugLog('ERROR', 'No data characteristic found on this device');
          Alert.alert('Error', 'No data characteristic found on this device.');
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
              addDebugLog('RECONNECT', 'Attempting reconnect...');
              const reconnected = await bleManager.connectToDevice(conn.id, {
                timeout: 8000,
              });
              await reconnected.discoverAllServicesAndCharacteristics();
              setConnectedDevice(reconnected);
              setIsConnected(true);
              startNotifications(reconnected, cfg);
              addDebugLog('RECONNECT', 'Success');
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
    [startNotifications, addDebugLog],
  );

  const sendCommand = useCallback(
    async (command, params = '') => {
      if (!connectedDevice || !bleConfig) {
        addDebugLog('CMD', 'Not connected - cannot send');
        Alert.alert('Not connected', 'Please connect to your device first.');
        return;
      }

      const cmdString = params ? `${command}:${params}` : command;
      const encoded = Buffer.from(cmdString, 'utf-8').toString('base64');

      addDebugLog('CMD', `Sending: ${cmdString}`);

      try {
        if (bleConfig.writeUUID) {
          await connectedDevice.writeCharacteristicWithResponseForService(
            bleConfig.serviceUUID,
            bleConfig.writeUUID,
            encoded,
          );
          addDebugLog('CMD', 'Sent successfully (with response)');
        }
      } catch (e) {
        addDebugLog(
          'CMD',
          `With-response failed, trying without-response: ${e.message}`,
        );
        try {
          await connectedDevice.writeCharacteristicWithoutResponseForService(
            bleConfig.serviceUUID,
            bleConfig.writeUUID,
            encoded,
          );
          addDebugLog('CMD', 'Sent successfully (without response)');
        } catch (e2) {
          addDebugLog('CMD', `Error: ${e2.message}`);
          Alert.alert('Command failed', e2.message);
        }
      }
    },
    [connectedDevice, bleConfig, addDebugLog],
  );

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
      }}
    >
      {children}
    </BLEContext.Provider>
  );
}

export const useBLE = () => {
  const context = useContext(BLEContext);
  if (!context) {
    throw new Error('useBLE must be used within BLEProvider');
  }
  return context;
};