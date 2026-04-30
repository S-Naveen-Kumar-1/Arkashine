// src/contexts/BLEContext.js
// Fully dynamic BLE context for ESP32 — auto-detects UUIDs, performs
// handshake, exposes sendCommand / sensorData / debugLogs to all screens.

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

// ─── Command constants (must match ESP32 firmware) ────────────────────────────
export const CMD = {
  HANDSHAKE: 'HELLO', // initial handshake
  PING: 'PING', // keepalive
  START_PH_CAL: 'CAL_PH_START', // begin pH calibration session
  CAL_PH_POINT: 'CAL_PH', // CAL_PH:<pH value>  e.g. CAL_PH:4
  CAL_PH_DONE: 'CAL_PH_DONE', // commit pH calibration
  START_EC_CAL: 'CAL_EC_START', // begin EC calibration session
  CAL_EC_POINT: 'CAL_EC', // CAL_EC:<dS/m value>  e.g. CAL_EC:1.413
  CAL_EC_DONE: 'CAL_EC_DONE', // commit EC calibration
  READ_VOLTAGE: 'READ_V', // request single voltage reading
  START_READING: 'READ_START', // start continuous pH+EC reading
  STOP_READING: 'READ_STOP', // stop continuous reading
  MOTOR_ON: 'MOTOR_ON', // start mixing motor
  MOTOR_OFF: 'MOTOR_OFF', // stop mixing motor
  RESET_CAL: 'CAL_RESET', // factory-reset calibration
};

// ─── Expected ESP32 response prefixes ────────────────────────────────────────
export const RESP = {
  ACK: 'ACK', // generic acknowledgement
  NACK: 'NACK', // command rejected
  PONG: 'PONG', // reply to PING
  HELLO_OK: 'HELLO_OK', // handshake accepted
  VOLTAGE: 'V=', // voltage reading  V=1.2345
  DATA: 'DATA', // JSON data frame  {"ph":6.5,"ec":1.2,"v":0.34}
  CAL_OK: 'CAL_OK', // calibration point accepted
  CAL_DONE: 'CAL_DONE', // calibration session committed
  ERROR: 'ERR', // device error
};

export function BLEProvider({ children }) {
  // ─── State ──────────────────────────────────────────────────────────────────
  const [bleState, setBleState] = useState('Unknown');
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [bleConfig, setBleConfig] = useState(null); // {serviceUUID, notifyUUID, writeUUID}
  const [handshakeDone, setHandshakeDone] = useState(false);
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

  // ─── Refs ───────────────────────────────────────────────────────────────────
  const notifySubRef = useRef(null);
  const reconnectRef = useRef(null);
  const dataCounterRef = useRef(0);
  const pendingCmds = useRef({}); // command → { resolve, reject, timer }
  const pingTimerRef = useRef(null);

  // ─── Logger ─────────────────────────────────────────────────────────────────
  const log = useCallback((tag, message, level = 'info',bleConfig) => {
    const text = `[${tag}] ${message}`;

    console.log(text, bleConfig, connectedDevice, 'config and device in log'); // Also log to console for debugging
    setDebugLogs(prev => [
      {
        id: Date.now() + Math.random(),
        time: new Date().toLocaleTimeString(),
        tag,
        message,
        level, // 'info' | 'warn' | 'error' | 'success'
        fullText: text,
        bleConfig,
      },
      ...prev.slice(0, 299),
    ]);
  }, []);

  // ─── BLE adapter state monitor ──────────────────────────────────────────────
  useEffect(() => {
    const sub = bleManager.onStateChange(state => {
      log('BLE', `Adapter state → ${state}`);
      setBleState(state);
    }, true);
    return () => sub.remove();
  }, [log]);

  // ─── Inbound frame parser ───────────────────────────────────────────────────
  // Handles both command ACKs (resolves pending promises) and async data frames.
  const handleInboundFrame = useCallback(
    raw => {
      dataCounterRef.current += 1;
      log('RX', `#${dataCounterRef.current} "${raw}"`);

      // ── Try to resolve a pending command first ────────────────────────────
      for (const [cmdKey, pending] of Object.entries(pendingCmds.current)) {
        if (
          raw.startsWith(RESP.ACK) ||
          raw.startsWith(RESP.PONG) ||
          raw.startsWith(RESP.HELLO_OK) ||
          raw.startsWith(RESP.CAL_OK) ||
          raw.startsWith(RESP.CAL_DONE) ||
          raw.startsWith(RESP.VOLTAGE)
        ) {
          log('RX', `Resolving pending "${cmdKey}" with "${raw}"`, 'success');
          clearTimeout(pending.timer);
          pending.resolve(raw);
          delete pendingCmds.current[cmdKey];
          break;
        }
        if (raw.startsWith(RESP.NACK) || raw.startsWith(RESP.ERROR)) {
          log('RX', `NACK/ERR for "${cmdKey}": ${raw}`, 'error');
          clearTimeout(pending.timer);
          pending.reject(new Error(raw));
          delete pendingCmds.current[cmdKey];
          break;
        }
      }

      // ── Parse sensor/data frames (may arrive independently of commands) ───
      const timestamp = Date.now();
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

      // JSON frame: {"ph":6.5,"ec":1.2,"v":0.34,"status":"ok"}
      if (raw.startsWith('{')) {
        try {
          const j = JSON.parse(raw);
          const parsed = {
            ...base,
            ec: j.ec ?? j.EC ?? null,
            ph: j.ph ?? j.pH ?? null,
            voltage: j.voltage ?? j.v ?? null,
            status: j.status ?? null,
            timer: j.timer ?? j.time ?? null,
          };
          log(
            'DATA',
            `JSON → pH=${parsed.ph} EC=${parsed.ec} V=${parsed.voltage}`,
            'success',
          );
          setSensorData(parsed);
          return;
        } catch (_) {
          log('DATA', 'JSON parse failed, trying KV', 'warn');
        }
      }

      // KV frame: ph=6.50,ec=1.200,v=0.3421
      if (raw.includes('=')) {
        const result = { ...base };
        for (const pair of raw.split(',')) {
          const eqIdx = pair.indexOf('=');
          if (eqIdx === -1) continue;
          const k = pair.slice(0, eqIdx).trim().toLowerCase();
          const val = pair.slice(eqIdx + 1).trim();
          if (k === 'ph') result.ph = parseFloat(val);
          else if (k === 'ec') result.ec = parseFloat(val);
          else if (k === 'v' || k === 'voltage')
            result.voltage = parseFloat(val);
          else if (k === 'status') result.status = val;
          else if (k === 'timer' || k === 'time')
            result.timer = parseInt(val, 10);
        }
        if (
          result.ph !== null ||
          result.ec !== null ||
          result.voltage !== null
        ) {
          log(
            'DATA',
            `KV → pH=${result.ph} EC=${result.ec} V=${result.voltage}`,
            'success',
          );
          setSensorData(result);
          return;
        }
      }

      // Voltage-only frame: V=1.2345
      if (raw.toUpperCase().startsWith('V=')) {
        const v = parseFloat(raw.slice(2));
        if (!isNaN(v)) {
          setSensorData(prev => ({ ...prev, voltage: v, raw, timestamp }));
          log('DATA', `Voltage only → ${v} V`);
        }
        return;
      }

      log('DATA', `Unparsed frame (stored as raw)`, 'warn');
      setSensorData(prev => ({ ...prev, raw, timestamp }));
    },
    [log],
  );

  // ─── Start BLE notifications ──────────────────────────────────────────────
  const startNotifications = useCallback(
    (device, cfg) => {
      log('NOTIFY', `Subscribing to ${cfg.notifyUUID}`);
      notifySubRef.current?.remove();
      notifySubRef.current = device.monitorCharacteristicForService(
        cfg.serviceUUID,
        cfg.notifyUUID,
        (err, char) => {
          if (err) {
            log('NOTIFY', `Monitor error: ${err.message}`, 'error');
            return;
          }
          if (char?.value) {
            try {
              const bytes = Buffer.from(char.value, 'base64');
              const raw = bytes.toString('utf-8').trim();
              handleInboundFrame(raw);
            } catch (e) {
              log('NOTIFY', `Decode error: ${e.message}`, 'error');
            }
          }
        },
      );
      log('NOTIFY', 'Subscribed ✅', 'success');
    },
    [handleInboundFrame, log],
  );

  // ─── Dynamic UUID resolver — scans ESP32 services/characteristics ─────────
  //
  // Strategy:
  //   1. Skip standard BLE services (0x1800, 0x1801, 0x180A, etc.)
  //   2. For each custom service, find the first notifiable characteristic
  //      and the first writable characteristic (may be same UUID).
  //   3. Prefer characteristics that are BOTH writable and notifiable (ESP32
  //      PROPERTY_WRITE | PROPERTY_NOTIFY on same char is very common).
  //   4. Return the first valid service that has at least a notify char.
  // ──────────────────────────────────────────────────────────────────────────
  const STANDARD_BLE_SERVICES = new Set([
    '00001800-0000-1000-8000-00805f9b34fb', // Generic Access
    '00001801-0000-1000-8000-00805f9b34fb', // Generic Attribute
    '0000180a-0000-1000-8000-00805f9b34fb', // Device Information
    '0000180f-0000-1000-8000-00805f9b34fb', // Battery
    '0000fe59-0000-1000-8000-00805f9b34fb', // Nordic DFU
  ]);

  const resolveUUIDs = useCallback(
    async conn => {
      log('UUID', 'Starting dynamic UUID resolution...');
      const services = await conn.services();
      log('UUID', `Found ${services.length} service(s)`);

      for (const svc of services) {
        const svcLower = svc.uuid.toLowerCase();

        if (STANDARD_BLE_SERVICES.has(svcLower)) {
          log('UUID', `  Skip standard service: ${svc.uuid}`);
          continue;
        }

        log('UUID', `  Probing custom service: ${svc.uuid}`);
        let chars;
        try {
          chars = await svc.characteristics();
        } catch (e) {
          log('UUID', `  Failed to read chars: ${e.message}`, 'warn');
          continue;
        }

        let notifyUUID = null;
        let writeUUID = null;
        let combinedUUID = null; // char with BOTH notify+write (ESP32 common)

        for (const c of chars) {
          const props = [
            c.isNotifiable ? 'NOTIFY' : null,
            c.isIndicatable ? 'INDICATE' : null,
            c.isWritableWithResponse ? 'WRITE' : null,
            c.isWritableWithoutResponse ? 'WRITE_NO_RSP' : null,
            c.isReadable ? 'READ' : null,
          ]
            .filter(Boolean)
            .join('|');

          log('UUID', `    Char ${c.uuid} [${props}]`);

          const canNotify = c.isNotifiable || c.isIndicatable;
          const canWrite =
            c.isWritableWithResponse || c.isWritableWithoutResponse;

          if (canNotify && canWrite) {
            combinedUUID = c.uuid;
            log(
              'UUID',
              `    ✅ Combined NOTIFY+WRITE char: ${c.uuid}`,
              'success',
            );
          } else {
            if (canNotify && !notifyUUID) notifyUUID = c.uuid;
            if (canWrite && !writeUUID) writeUUID = c.uuid;
          }
        }

        // Prefer the combined UUID pattern common in ESP32 custom services
        const resolvedNotify = combinedUUID ?? notifyUUID;
        const resolvedWrite = combinedUUID ?? writeUUID ?? notifyUUID;

        if (resolvedNotify) {
          const cfg = {
            serviceUUID: svc.uuid,
            notifyUUID: resolvedNotify,
            writeUUID: resolvedWrite,
          };
          log('UUID', `✅ Resolved config:`, 'success');
          log('UUID', `   Service: ${cfg.serviceUUID}`);
          log('UUID', `   Notify : ${cfg.notifyUUID}`);
          log('UUID', `   Write  : ${cfg.writeUUID}`);
          return cfg;
        }

        log('UUID', `  No notify char found, trying next service`, 'warn');
      }

      log('UUID', '❌ Could not find any notifiable characteristic', 'error');
      return null;
    },
    [log],
  );

  // ─── Perform initial handshake ────────────────────────────────────────────
  //   Sends CMD.HANDSHAKE and waits up to 5 s for HELLO_OK response.
  //   On success sets handshakeDone=true. On failure logs warning but does
  //   NOT abort — device may not implement handshake.
  const performHandshake = useCallback(
    async (device, cfg) => {
      log('HANDSHAKE', `Sending "${CMD.HANDSHAKE}"...`);
      try {
        const resp = await _sendAndWait(device, cfg, CMD.HANDSHAKE, '', 5000);
        if (
          resp &&
          (resp.startsWith(RESP.HELLO_OK) || resp.startsWith(RESP.ACK))
        ) {
          log('HANDSHAKE', `✅ Device acknowledged: "${resp}"`, 'success');
          setHandshakeDone(true);
          return true;
        }
        log('HANDSHAKE', `⚠️ Unexpected handshake response: "${resp}"`, 'warn');
      } catch (e) {
        log(
          'HANDSHAKE',
          `⚠️ No handshake response (${e.message}) — continuing anyway`,
          'warn',
        );
      }
      // Non-fatal: older ESP32 firmware may not respond to HELLO
      setHandshakeDone(true);
      return false;
    },
    [log],
  );

  // ─── Low-level: write a raw base64 string to the write characteristic ──────
  const _writeRaw = useCallback(
    async (device, cfg, encoded) => {
      console.log(`_writeRaw to ${cfg}: ${encoded} (b64)`);
      // Try WRITE WITH RESPONSE first (matches ESP32 PROPERTY_WRITE)
      try {
        await device.writeCharacteristicWithResponseForService(
          cfg.serviceUUID,
          cfg.writeUUID,
          encoded,
        );
        return;
      } catch (e1) {
        log('TX', `Write-with-response failed: ${e1.message}`, 'warn');
      }
      // Fallback: WRITE WITHOUT RESPONSE
      await device.writeCharacteristicWithoutResponseForService(
        cfg.serviceUUID,
        cfg.writeUUID,
        encoded,
      );
    },
    [log],
  );

  // ─── Send command and wait for response (returns promise) ─────────────────
  //   cmdString: e.g.  "CAL_PH:4"
  //   timeout  : ms to wait before rejecting (default 6000)
  const _sendAndWait = useCallback(
    (device, cfg, command, params = '', timeout = 6000) => {
      return new Promise(async (resolve, reject) => {
        const cmdString = params ? `${command}:${params}` : command;
        const encoded = Buffer.from(cmdString, 'utf-8').toString('base64');

        log('TX', `Sending "${cmdString}" (b64: ${encoded})`);

        // Register pending command BEFORE writing so the notify callback can
        // resolve it if the response arrives very quickly.
        const timer = setTimeout(() => {
          if (pendingCmds.current[command]) {
            log('TX', `Timeout waiting for response to "${command}"`, 'warn');
            delete pendingCmds.current[command];
            reject(new Error(`Timeout: no response to ${command}`));
          }
        }, timeout);

        pendingCmds.current[command] = { resolve, reject, timer };

        try {
          await _writeRaw(device, cfg, encoded);
          log('TX', `✅ "${cmdString}" written`, 'success');
        } catch (e) {
          clearTimeout(timer);
          delete pendingCmds.current[command];
          log(
            'TX',
            `❌ Write failed for "${cmdString}": ${e.message}`,
            'error',
          );
          reject(e);
        }
      });
    },
    [_writeRaw, log],
  );

  // ─── Public: sendCommand — fire-and-forget or awaitable ───────────────────
  //   Exposed via context. Screens call e.g.:
  //     await sendCommand(CMD.CAL_PH_POINT, '4')
  //     await sendCommand(CMD.START_READING)
  const sendCommand = useCallback(
    async (command, params = '', awaitResponse = true, timeout = 6000) => {
      if (!connectedDevice || !bleConfig) {
        log('CMD', 'Not connected — cannot send', 'error');
        Alert.alert('Not connected', 'Please connect to your device first.');
        throw new Error('Not connected');
      }

      if (awaitResponse) {
        return _sendAndWait(
          connectedDevice,
          bleConfig,
          command,
          params,
          timeout,
        );
      }

      // Fire-and-forget
      const cmdString = params ? `${command}:${params}` : command;
      const encoded = Buffer.from(cmdString, 'utf-8').toString('base64');
      log('TX', `Fire-and-forget "${cmdString}"`);
      try {
        await _writeRaw(connectedDevice, bleConfig, encoded);
        log('TX', `✅ "${cmdString}" sent`, 'success');
      } catch (e) {
        log('TX', `❌ "${cmdString}" failed: ${e.message}`, 'error');
        throw e;
      }
    },
    [connectedDevice, bleConfig, _sendAndWait, _writeRaw, log],
  );

  // ─── Keepalive ping every 15 s ────────────────────────────────────────────
  const startKeepalive = useCallback(
    (device, cfg) => {
      stopKeepalive();
      pingTimerRef.current = setInterval(async () => {
        try {
          const encoded = Buffer.from(CMD.PING, 'utf-8').toString('base64');
          await _writeRaw(device, cfg, encoded);
          log('PING', 'PING sent');
        } catch (e) {
          log('PING', `PING failed: ${e.message}`, 'warn');
        }
      }, 15000);
    },
    [_writeRaw, log],
  );

  const stopKeepalive = useCallback(() => {
    if (pingTimerRef.current) {
      clearInterval(pingTimerRef.current);
      pingTimerRef.current = null;
    }
  }, []);

  // ─── Connect ──────────────────────────────────────────────────────────────
  const connect = useCallback(
    async device => {
      try {
        log('CONNECT', `Connecting to "${device.name || device.id}"...`);

        const conn = await device.connect({ timeout: 12000 });
        log('CONNECT', '✅ Connected — discovering services...', 'success');

        await conn.discoverAllServicesAndCharacteristics();
        log('CONNECT', 'Service discovery complete');

        // Dynamically resolve UUIDs
        const cfg = await resolveUUIDs(conn);
        if (!cfg) {
          Alert.alert(
            'UUID Error',
            'Could not find a notifiable characteristic on this device.\n\nMake sure the correct ESP32 firmware is running.',
          );
          await conn.cancelConnection().catch(() => {});
          return false;
        }

        console.log('Resolved BLE config:', cfg);
        setBleConfig(cfg);
        setConnectedDevice(conn);
        setIsConnected(true);
        dataCounterRef.current = 0;

        // Subscribe to notifications before handshake
        startNotifications(conn, cfg);

        // Short delay to let notification subscription settle on some Android
        // versions before we write the handshake byte.
        await new Promise(r => setTimeout(r, 300));

        // Initial handshake
        await performHandshake(conn, cfg);

        // Start keepalive
        startKeepalive(conn, cfg);

        // Handle unexpected disconnects
        conn.onDisconnected(() => {
          log('DISCONNECT', '⚠️ Device disconnected unexpectedly', 'warn');
          stopKeepalive();
          setIsConnected(false);
          setConnectedDevice(null);
          setHandshakeDone(false);
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

          // Auto-reconnect after 3 s
          reconnectRef.current = setTimeout(async () => {
            try {
              log('RECONNECT', `Attempting reconnect to ${conn.id}...`);
              const reConn = await bleManager.connectToDevice(conn.id, {
                timeout: 10000,
              });
              await reConn.discoverAllServicesAndCharacteristics();
              const newCfg = await resolveUUIDs(reConn);
              if (newCfg) {
                setBleConfig(newCfg);
                setConnectedDevice(reConn);
                setIsConnected(true);
                startNotifications(reConn, newCfg);
                await new Promise(r => setTimeout(r, 300));
                await performHandshake(reConn, newCfg);
                startKeepalive(reConn, newCfg);
                log('RECONNECT', '✅ Reconnected', 'success');
              }
            } catch (e) {
              log('RECONNECT', `Failed: ${e.message}`, 'error');
            }
          }, 3000);
        });

        return true;
      } catch (e) {
        log('CONNECT', `❌ ${e.message}`, 'error');
        Alert.alert('Connection Failed', e.message);
        return false;
      }
    },
    [
      resolveUUIDs,
      startNotifications,
      performHandshake,
      startKeepalive,
      stopKeepalive,
      log,
    ],
  );

  // ─── Disconnect ────────────────────────────────────────────────────────────
  const disconnect = useCallback(async () => {
    log('DISCONNECT', 'User initiated disconnect');
    clearTimeout(reconnectRef.current);
    stopKeepalive();
    notifySubRef.current?.remove();
    // Clear all pending command promises
    for (const [key, pending] of Object.entries(pendingCmds.current)) {
      clearTimeout(pending.timer);
      pending.reject(new Error('Disconnected'));
    }
    pendingCmds.current = {};
    try {
      await connectedDevice?.cancelConnection();
    } catch (_) {}
    setConnectedDevice(null);
    setIsConnected(false);
    setBleConfig(null);
    setHandshakeDone(false);
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
  }, [connectedDevice, stopKeepalive, log]);

  // ─── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearTimeout(reconnectRef.current);
      stopKeepalive();
      notifySubRef.current?.remove();
    };
  }, [stopKeepalive]);

  // ─── Context value ─────────────────────────────────────────────────────────
  return (
    <BLEContext.Provider
      value={{
        bleState,
        connectedDevice,
        isConnected,
        handshakeDone,
        bleConfig,
        sensorData,
        connect,
        disconnect,
        sendCommand,
        CMD,
        RESP,
        debugLogs,
        log,
      }}
    >
      {children}
    </BLEContext.Provider>
  );
}

export const useBLE = () => {
  const ctx = useContext(BLEContext);
  if (!ctx) throw new Error('useBLE must be used within BLEProvider');
  return ctx;
};
