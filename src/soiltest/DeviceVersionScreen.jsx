// src/soiltest/DeviceVersionScreen.jsx
//
// Server vs device version (opened from PourScreen's Version button).
//   Server  GET /versions/api/current-version/ — the active version uploaded
//           on the website's Versions page
//   Device  BLE {"CHECKVERSION":"GET"} (falls back to GETSYSTEMINFO) — see
//           cmdGetDeviceVersion; the reply lands in state.ble.deviceVersion
//
// Layout: status card (match / mismatch in red) → the two versions side by
// side → details list → Refresh.

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { TopBar } from '../components/common';
import useTheme from '../hooks/useTheme';
import { Radius, Spacing } from '../theme';
import { getServerVersion } from '../redux/actions';
import { cmdGetDeviceVersion } from '../redux/actions/bleActions';

const GREEN = '#16A34A';
const RED = '#DC2626';
const BLUE = '#2563EB';


// "v1.2.0" / "1.2.0.0" → [1, 2] (trailing zeros dropped so they compare equal)
const versionParts = v => {
  const parts = String(v ?? '')
    .trim()
    .replace(/^v/i, '')
    .split('.')
    .map(n => parseInt(n, 10) || 0);
  while (parts.length > 1 && parts[parts.length - 1] === 0) parts.pop();
  return parts;
};

// -1 device older, 0 same, 1 device newer
const compareVersions = (device, server) => {
  const a = versionParts(device);
  const b = versionParts(server);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
};

const fmtTime = d =>
  d ? d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : null;

export default function DeviceVersionScreen({ navigation }) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const T = theme.colors;
  const BORDER = T.cardBorder ?? T.border;

  const connected = useSelector(s => s.ble?.connected);
  const bleDevice = useSelector(s => s.ble?.device);
  const deviceVersion = useSelector(s => s.ble?.deviceVersion);

  // { status: 'loading'|'ok'|'error', version?, description?, created_at?, message? }
  const [server, setServer] = useState({ status: 'loading' });
  const [checkedAt, setCheckedAt] = useState(null);

  const fetchServer = useCallback(async () => {
    setServer({ status: 'loading' });
    try {
      const res = await dispatch(getServerVersion());
      const data = res?.payload?.data ?? {};
      setServer(
        data.version
          ? { status: 'ok', ...data }
          : { status: 'error', message: data.message || 'No active version' },
      );
    } catch (e) {
      setServer({ status: 'error', message: 'Could not reach the server' });
    }
    setCheckedAt(new Date());
  }, [dispatch]);

  const fetchDevice = useCallback(() => {
    if (connected) dispatch(cmdGetDeviceVersion());
  }, [connected, dispatch]);

  const refresh = useCallback(() => {
    fetchServer();
    fetchDevice();
  }, [fetchServer, fetchDevice]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const device = !connected
    ? { status: 'error', message: 'Device not connected' }
    : deviceVersion ?? { status: 'loading' };

  const loading = server.status === 'loading' || device.status === 'loading';
  const bothOk = server.status === 'ok' && device.status === 'ok';
  const cmp = bothOk ? compareVersions(device.version, server.version) : null;
  // Any difference between device and server is flagged in red.
  const mismatch = cmp !== null && cmp !== 0;

  // Headline status card
  const status = loading
    ? { color: BLUE, icon: null, title: 'Checking versions…', sub: 'Asking the server and the device' }
    : cmp === 0
    ? { color: GREEN, icon: 'check-decagram', title: 'Device is up to date', sub: `Running ${device.version}, same as the server` }
    : cmp === -1
    ? { color: RED, icon: 'close-octagon', title: 'Version mismatch — update available', sub: `Device ${device.version} does not match server ${server.version}` }
    : cmp === 1
    ? { color: RED, icon: 'close-octagon', title: 'Version mismatch', sub: `Device ${device.version} is ahead of server ${server.version}` }
    : {
        color: RED,
        icon: 'alert-circle',
        title: 'Couldn’t compare versions',
        sub: [server.status === 'error' && `Server: ${server.message}`, device.status === 'error' && `Device: ${device.message}`]
          .filter(Boolean)
          .join(' · '),
      };

  const details = [
    server.created_at && ['calendar-check', 'Server release date', new Date(server.created_at).toLocaleDateString('en-IN')],
    server.description && ['note-text-outline', 'Release notes', server.description],
    bleDevice?.name && ['bluetooth', 'Device name', bleDevice.name],
    device.device_id && ['identifier', 'Device ID', device.device_id],
    device.serial_no && ['barcode', 'Serial no.', device.serial_no],
  ].filter(Boolean);

  return (
    <SafeAreaView style={[s.root, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.bg} />
      <TopBar title="Version" onBack={() => navigation.goBack()} theme={theme} />

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        {/* ── Status ─────────────────────────────────────────── */}
        <View style={[s.status, { backgroundColor: status.color + '12', borderColor: status.color + '55' }]}>
          <View style={[s.statusIcon, { backgroundColor: status.color + '22' }]}>
            {status.icon ? (
              <Icon name={status.icon} size={26} color={status.color} />
            ) : (
              <ActivityIndicator color={status.color} />
            )}
          </View>
          <View style={s.flex}>
            <Text style={[s.statusTitle, { color: T.text }]}>{status.title}</Text>
            {status.sub ? (
              <Text style={[s.statusSub, { color: T.textSub ?? T.muted }]}>{status.sub}</Text>
            ) : null}
          </View>
        </View>

        {/* ── Versions side by side ──────────────────────────── */}
        <View style={s.tiles}>
          <VersionTile
            T={T}
            BORDER={BORDER}
            color={BLUE}
            icon="cloud-outline"
            title="Server"
            caption="Latest release"
            state={server}
          />
          <VersionTile
            T={T}
            BORDER={BORDER}
            color={mismatch ? RED : GREEN}
            icon="chip"
            title="Device"
            caption={bleDevice?.name || 'Connected device'}
            state={device}
            flag={mismatch ? '≠ server' : cmp === 0 ? '= server' : null}
            highlight={mismatch}
          />
        </View>

        {/* ── Details ────────────────────────────────────────── */}
        {details.length ? (
          <View style={[s.card, { backgroundColor: T.card, borderColor: BORDER }]}>
            <Text style={[s.sectionTitle, { color: T.muted }]}>Details</Text>
            {details.map(([icon, label, value], i) => (
              <View
                key={label}
                style={[s.detailRow, i > 0 && { borderTopColor: BORDER, borderTopWidth: StyleSheet.hairlineWidth }]}
              >
                <Icon name={icon} size={16} color={T.muted} />
                <Text style={[s.detailLabel, { color: T.textSub ?? T.muted }]}>{label}</Text>
                <Text style={[s.detailValue, { color: T.text }]} numberOfLines={3}>
                  {value}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* ── Refresh ────────────────────────────────────────── */}
        <TouchableOpacity
          onPress={refresh}
          disabled={loading}
          activeOpacity={0.85}
          style={[s.refresh, { backgroundColor: T.primary }, loading && s.disabled]}
        >
          <Icon name="refresh" size={18} color="#fff" />
          <Text style={s.refreshTxt}>{loading ? 'Checking…' : 'Check again'}</Text>
        </TouchableOpacity>
        {checkedAt ? (
          <Text style={[s.checkedAt, { color: T.muted }]}>Last checked at {fmtTime(checkedAt)}</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function VersionTile({ T, BORDER, color, icon, title, caption, state, flag, highlight }) {
  return (
    <View
      style={[
        s.tile,
        highlight
          ? { backgroundColor: color + '0F', borderColor: color + '88' }
          : { backgroundColor: T.card, borderColor: BORDER },
      ]}
    >
      <View style={s.tileHead}>
        <View style={[s.tileIcon, { backgroundColor: color + '1A' }]}>
          <Icon name={icon} size={18} color={color} />
        </View>
        <Text style={[s.tileTitle, { color: T.muted }]}>{title}</Text>
        {flag ? (
          <View style={[s.flag, { backgroundColor: color + '1F' }]}>
            <Text style={[s.flagTxt, { color }]}>{flag}</Text>
          </View>
        ) : null}
      </View>

      {state.status === 'loading' ? (
        <ActivityIndicator color={color} style={s.tileSpinner} />
      ) : state.status === 'error' ? (
        <View style={s.tileError}>
          <Icon name="alert-circle-outline" size={20} color={RED} />
          <Text style={[s.tileErrorTxt, { color: T.textSub ?? T.muted }]}>{state.message}</Text>
        </View>
      ) : (
        <>
          <Text
            style={[s.tileVersion, { color: highlight ? color : T.text }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {state.version}
          </Text>
          <Text style={[s.tileCaption, { color: T.muted }]} numberOfLines={1}>
            {caption}
          </Text>
        </>
      )}
      <View style={[s.tileBar, { backgroundColor: color }]} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  body: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xl },

  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: 14,
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTitle: { fontSize: 16, fontWeight: '800' },
  statusSub: { fontSize: 12, marginTop: 2, lineHeight: 17 },

  tiles: { flexDirection: 'row', gap: Spacing.md },
  tile: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingTop: 12,
    paddingHorizontal: 12,
    paddingBottom: 16,
    minHeight: 132,
    overflow: 'hidden',
  },
  tileHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  tileIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  flag: { marginLeft: 'auto', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  flagTxt: { fontSize: 10, fontWeight: '800' },
  tileVersion: { fontSize: 26, fontWeight: '900' },
  tileCaption: { fontSize: 11, marginTop: 2 },
  tileSpinner: { marginTop: 18 },
  tileError: { alignItems: 'flex-start', gap: 4, marginTop: 2 },
  tileErrorTxt: { fontSize: 12, lineHeight: 16 },
  tileBar: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 3 },

  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingTop: 6,
    paddingBottom: 4,
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  detailLabel: { fontSize: 13, flex: 1 },
  detailValue: { fontSize: 13, fontWeight: '700', maxWidth: '55%', textAlign: 'right' },

  refresh: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: Radius.md,
    paddingVertical: 13,
    marginTop: Spacing.xs ?? 4,
  },
  disabled: { opacity: 0.6 },
  refreshTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
  checkedAt: { fontSize: 11, textAlign: 'center', marginTop: -4 },
});
