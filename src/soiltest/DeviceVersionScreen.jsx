// src/soiltest/DeviceVersionScreen.jsx
//
// Server vs device version (opened from PourScreen's Version button).
//   Server  GET /versions/api/current-version/ — the active version uploaded
//           on the website's Versions page
//   Device  BLE {"CHECKVERSION":"GET"} + {"GETSYSTEMINFO":"GET"} — see
//           cmdGetDeviceVersion; version in state.ble.deviceVersion, device
//           ID / serial in state.ble.systemInfo
//   Update  "Update firmware" (or "Re-install firmware" when the versions
//           already match — same flow) sends BLE
//           {"VERSIONUPDATE":"START"}; on "STARTED" the screen polls
//           {"VERSIONUPDATE":"STATUS"} right away and every POLL_MS until
//           INSTALLED. "Stop update" sends FORSESTOP and ends on the device's
//           {"VERSIONUPDATE":"CANCELLED"} reply.
//           State in state.ble.versionUpdate.
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
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { TopBar } from '../components/common';
import useTheme from '../hooks/useTheme';
import { Radius, Spacing } from '../theme';
import { getServerVersion } from '../redux/actions';
import {
  cmdGetDeviceVersion,
  cmdStartVersionUpdate,
  cmdPollVersionUpdate,
  cmdStopVersionUpdate,
  clearVersionUpdate,
} from '../redux/actions/bleActions';

const GREEN = '#16A34A';
const RED = '#DC2626';
const BLUE = '#2563EB';

// Firmware update progress poll interval, and the statuses that need it.
const POLL_MS = 2000;
const POLLING = ['started', 'running', 'stopping'];

const mb = bytes => (bytes / (1024 * 1024)).toFixed(1);


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
  const versionUpdate = useSelector(s => s.ble?.versionUpdate);
  const systemInfo = useSelector(s => s.ble?.systemInfo);

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

  // Start each visit without a stale "update started" from last time.
  useEffect(() => {
    dispatch(clearVersionUpdate());
  }, [dispatch]);

  // Once the device says STARTED, ask for STATUS immediately, then keep
  // polling until it reports INSTALLED / CANCELLED / ERROR.
  const polling = POLLING.includes(versionUpdate?.status);
  useEffect(() => {
    if (!polling || !connected) return undefined;
    dispatch(cmdPollVersionUpdate());
    const id = setInterval(() => dispatch(cmdPollVersionUpdate()), POLL_MS);
    return () => clearInterval(id);
  }, [polling, connected, dispatch]);

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
    ? { color: BLUE, icon: null, title: 'Checking firmware…', sub: 'Asking the server and your SoiLENZ device' }
    : cmp === 0
    ? { color: GREEN, icon: 'check-decagram', title: 'SoiLENZ firmware is up to date', sub: `Your device is on the latest firmware (${device.version})` }
    : cmp === -1
    ? { color: RED, icon: 'update', title: 'SoiLENZ firmware update available', sub: `Your device is on ${device.version} — the latest firmware is ${server.version}` }
    : cmp === 1
    ? { color: RED, icon: 'alert-octagon', title: 'SoiLENZ firmware differs from server', sub: `Your device is on ${device.version} — the server lists ${server.version}` }
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
    systemInfo?.device_id && ['identifier', 'Device ID', systemInfo.device_id],
    systemInfo?.serial_no && ['barcode', 'Serial no.', systemInfo.serial_no],
  ].filter(Boolean);

  return (
    <SafeAreaView style={[s.root, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.bg} />
      <TopBar title="Version" onBack={() => navigation.goBack()} theme={theme} />

      <ScrollView
        contentContainerStyle={s.body}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={refresh}
            tintColor={T.primary}
            colors={[T.primary]}
            progressBackgroundColor={T.card}
          />
        }
      >
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

        {/* ── Firmware update / re-install (once both versions are known) */}
        {versionUpdate || (cmp !== null && connected) ? (
          polling ? (
            <UpdateProgress
              T={T}
              BORDER={BORDER}
              update={versionUpdate}
              targetVersion={server.version}
              onStop={() => dispatch(cmdStopVersionUpdate())}
            />
          ) : versionUpdate?.status === 'installed' ? (
            <View style={[s.updateDone, { backgroundColor: GREEN + '14', borderColor: GREEN + '55' }]}>
              <Icon name="check-decagram" size={18} color={GREEN} />
              <Text style={[s.updateDoneTxt, { color: T.text }]}>
                Firmware {server.version ?? ''} installed — the device is restarting
              </Text>
            </View>
          ) : (
            <>
              <TouchableOpacity
                onPress={() => dispatch(cmdStartVersionUpdate())}
                disabled={versionUpdate?.status === 'sending' || !connected}
                activeOpacity={0.85}
                style={[
                  s.updateBtn,
                  // Same version → softer "re-install" style; otherwise red.
                  cmp === 0 && { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: GREEN },
                  (versionUpdate?.status === 'sending' || !connected) && s.disabled,
                ]}
              >
                {versionUpdate?.status === 'sending' ? (
                  <ActivityIndicator size="small" color={cmp === 0 ? GREEN : '#fff'} />
                ) : (
                  <Icon name={cmp === 0 ? 'restore' : 'download'} size={18} color={cmp === 0 ? GREEN : '#fff'} />
                )}
                <Text style={[s.updateBtnTxt, cmp === 0 && { color: GREEN }]}>
                  {versionUpdate?.status === 'sending'
                    ? 'Starting update…'
                    : versionUpdate?.status === 'error'
                    ? 'Try again'
                    : cmp === 0
                    ? 'Re-install firmware'
                    : 'Update firmware'}
                </Text>
              </TouchableOpacity>
              {versionUpdate?.status === 'error' ? (
                <Text style={s.updateErr}>{versionUpdate.message}</Text>
              ) : versionUpdate?.status === 'cancelled' ? (
                <Text style={[s.updateNote, { color: T.muted }]}>Update stopped</Text>
              ) : null}
            </>
          )
        ) : null}

        {/* ── Versions side by side ──────────────────────────── */}
        <View style={s.tiles}>
          <VersionTile
            T={T}
            BORDER={BORDER}
            color={BLUE}
            icon="cloud-outline"
            title="Latest firmware"
            caption="Available on server"
            state={server}
          />
          <VersionTile
            T={T}
            BORDER={BORDER}
            color={mismatch ? RED : GREEN}
            icon="chip"
            title="SoiLENZ device"
            caption={bleDevice?.name || 'Connected device'}
            state={device}
            flag={cmp === -1 ? 'Update available' : mismatch ? 'Differs' : cmp === 0 ? 'Up to date' : null}
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

// targetVersion: the server's active version (what's being installed) — shown
// instead of the version field in the device's STATUS replies.
function UpdateProgress({ T, BORDER, update, targetVersion, onStop }) {
  const stopping = update?.status === 'stopping';
  const pct = Math.max(0, Math.min(100, update?.percent ?? 0));
  const color = stopping ? RED : BLUE;
  return (
    <View style={[s.progress, { backgroundColor: T.card, borderColor: BORDER }]}>
      <View style={s.progressHead}>
        <View style={[s.progressIcon, { backgroundColor: color + '1A' }]}>
          <ActivityIndicator size="small" color={color} />
        </View>
        <View style={s.flex}>
          <Text style={[s.progressTitle, { color: T.text }]}>
            {stopping ? 'Stopping update…' : update?.stage || 'Update started'}
          </Text>
          <Text style={[s.progressSub, { color: T.textSub ?? T.muted }]} numberOfLines={2}>
            {update?.message || 'Checking progress…'}
          </Text>
        </View>
        <Text style={[s.progressPct, { color }]}>{pct}%</Text>
      </View>

      <View style={[s.track, { backgroundColor: color + '22' }]}>
        <View style={[s.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      {update?.bytes_total ? (
        <Text style={[s.progressMeta, { color: T.muted }]}>
          {mb(update.bytes_downloaded)} MB of {mb(update.bytes_total)} MB
          {targetVersion ? `  ·  firmware ${targetVersion}` : ''}
        </Text>
      ) : null}

      <TouchableOpacity
        onPress={onStop}
        disabled={stopping}
        style={[s.stopBtn, { borderColor: RED }, stopping && s.disabled]}
      >
        <Icon name="stop-circle-outline" size={16} color={RED} />
        <Text style={s.stopTxt}>{stopping ? 'Stopping…' : 'Stop update'}</Text>
      </TouchableOpacity>
    </View>
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
        <Text style={[s.tileTitle, { color: T.muted }]} numberOfLines={2}>
          {title}
        </Text>
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
          {flag ? (
            <View style={[s.flag, { backgroundColor: color + '1F' }]}>
              <Icon
                name={highlight ? 'arrow-up-circle' : 'check-circle'}
                size={12}
                color={color}
              />
              <Text style={[s.flagTxt, { color }]} numberOfLines={1}>
                {flag}
              </Text>
            </View>
          ) : null}
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

  updateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: RED,
    borderRadius: Radius.md,
    paddingVertical: 13,
    marginTop: -4,
  },
  updateBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
  updateErr: { color: RED, fontSize: 12, textAlign: 'center', marginTop: -6 },
  updateDone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: 12,
    marginTop: -4,
  },
  updateDoneTxt: { flex: 1, fontSize: 13, fontWeight: '700' },
  updateNote: { fontSize: 12, textAlign: 'center', marginTop: -6 },

  progress: { borderWidth: 1, borderRadius: Radius.lg, padding: 14, gap: 10, marginTop: -4 },
  progressHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  progressIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTitle: { fontSize: 15, fontWeight: '800' },
  progressSub: { fontSize: 12, marginTop: 2 },
  progressPct: { fontSize: 20, fontWeight: '900' },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  progressMeta: { fontSize: 11, marginTop: -4 },
  stopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingVertical: 10,
  },
  stopTxt: { color: RED, fontSize: 14, fontWeight: '800' },

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
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  flag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 8,
  },
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
