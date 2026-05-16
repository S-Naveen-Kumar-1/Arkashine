// src/screens/map/FarmMapScreen.js
/**
 * FarmMapScreen — OpenStreetMap (FREE, no API key, no billing)
 *
 * Install:
 *   npm install react-native-maps @react-native-community/geolocation
 *
 * Android AndroidManifest.xml — NO Google Maps key needed, just permissions:
 *   <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
 *   <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
 *   <uses-permission android:name="android.permission.INTERNET"/>
 *
 * Android build.gradle (android/build.gradle) — remove or comment out:
 *   // classpath 'com.google.android.gms:...'   ← not needed for OSM
 *
 * iOS Info.plist — just add:
 *   NSLocationWhenInUseUsageDescription  → "Used to show your farm on the map"
 *
 * IMPORTANT: Use PROVIDER_DEFAULT (not PROVIDER_GOOGLE) with UrlTile for OSM
 *
 * Once you get Google Maps API key later, swap:
 *   provider={PROVIDER_DEFAULT} → provider={PROVIDER_GOOGLE}
 *   remove the <UrlTile> component
 *   done ✓
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, {
  Marker,
  Polygon,
  Polyline,
  UrlTile,
  PROVIDER_DEFAULT, // ← key change: NOT PROVIDER_GOOGLE
} from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';

import useTheme from '../hooks/useTheme';
import { Typography, Spacing, Radius, Shadow } from '../theme';

const { width: SW, height: SH } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────────────────────
// DARK THEME CONSTANTS (hardcoded from your darkTheme so UI is always correct)
// ─────────────────────────────────────────────────────────────────────────────
const D = {
  bg: '#0A1628',
  surface: '#0F1F35',
  card: '#132236',
  cardBorder: '#1E3A5F',
  primary: '#22C55E',
  primaryLight: '#4ADE80',
  primaryDim: 'rgba(34,197,94,0.12)',
  blue: '#3B82F6',
  red: '#F87171',
  yellow: '#FBBF24',
  text: '#F1F5F9',
  textSub: '#94A3B8',
  muted: '#4A5568',
  divider: '#1E3A5F',
  warning: '#FBBF24',
};

// ─────────────────────────────────────────────────────────────────────────────
// OSM TILE SERVERS (all free, pick one)
// ─────────────────────────────────────────────────────────────────────────────
const OSM_TILES = {
  // Standard OpenStreetMap
  standard: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  // CartoDB Dark (looks great with your theme)
  dark: 'https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png',
  // CartoDB Light
  light:
    'https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png',
  // Satellite (ESRI — free tier)
  satellite:
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  // Topo
  topo: 'https://tile.opentopomap.org/{z}/{x}/{y}.png',
};

const MAP_TYPES = [
  { key: 'dark', label: 'Dark', icon: '🌑', url: OSM_TILES.dark },
  {
    key: 'satellite',
    label: 'Satellite',
    icon: '🛰️',
    url: OSM_TILES.satellite,
  },
  { key: 'standard', label: 'Streets', icon: '🗺️', url: OSM_TILES.standard },
  { key: 'topo', label: 'Topo', icon: '⛰️', url: OSM_TILES.topo },
];

// ─────────────────────────────────────────────────────────────────────────────
// INDIA DEFAULT REGION
// ─────────────────────────────────────────────────────────────────────────────
const INDIA_REGION = {
  latitude: 20.5937,
  longitude: 78.9629,
  latitudeDelta: 28,
  longitudeDelta: 22,
};

// ─────────────────────────────────────────────────────────────────────────────
// GEOMETRY HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function computeAcres(coords) {
  if (!coords || coords.length < 3) return '0';
  const toRad = d => (d * Math.PI) / 180;
  const E = 6371000;
  let area = 0;
  const n = coords.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const xi =
      toRad(coords[i].longitude) * E * Math.cos(toRad(coords[i].latitude));
    const yi = toRad(coords[i].latitude) * E;
    const xj =
      toRad(coords[j].longitude) * E * Math.cos(toRad(coords[j].latitude));
    const yj = toRad(coords[j].latitude) * E;
    area += xi * yj - xj * yi;
  }
  return (Math.abs(area) / 2 / 4046.86).toFixed(3);
}

function haversineKm(a, b) {
  const toRad = d => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) *
      Math.cos(toRad(b.latitude)) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function getCentroid(coords) {
  if (!coords || coords.length === 0) return null;
  return {
    latitude: coords.reduce((s, c) => s + c.latitude, 0) / coords.length,
    longitude: coords.reduce((s, c) => s + c.longitude, 0) / coords.length,
  };
}

function toDMS(deg, isLat) {
  const abs = Math.abs(deg);
  const d = Math.floor(abs);
  const m = Math.floor((abs - d) * 60);
  const sec = ((abs - d - m / 60) * 3600).toFixed(1);
  const dir = isLat ? (deg >= 0 ? 'N' : 'S') : deg >= 0 ? 'E' : 'W';
  return `${d}°${m}'${sec}"${dir}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// PERMISSIONS
// ─────────────────────────────────────────────────────────────────────────────
async function requestLocationPermission() {
  if (Platform.OS !== 'android') return true;
  try {
    const r = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location Permission',
        message: 'FarmMap needs your location to show your field on the map.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
    );
    return r === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PULSING USER DOT
// ─────────────────────────────────────────────────────────────────────────────
function UserDot() {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 2.0,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1.0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [scale]);
  return (
    <View style={ud.wrap}>
      <Animated.View style={[ud.ring, { transform: [{ scale }] }]} />
      <View style={ud.dot} />
    </View>
  );
}
const ud = StyleSheet.create({
  wrap: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: D.primary + '55',
  },
  dot: {
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: D.primary,
    borderWidth: 3,
    borderColor: '#fff',
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// NUMBERED POINT MARKER
// ─────────────────────────────────────────────────────────────────────────────
function PointDot({ index, isFirst }) {
  const bg = isFirst ? D.primary : D.blue;
  return (
    <View style={[pd.outer, { borderColor: bg, backgroundColor: bg + '28' }]}>
      <View style={[pd.inner, { backgroundColor: bg }]}>
        <Text style={pd.num}>{index + 1}</Text>
      </View>
    </View>
  );
}
const pd = StyleSheet.create({
  outer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  num: { color: '#fff', fontSize: 10, fontWeight: '900' },
});

// ─────────────────────────────────────────────────────────────────────────────
// AREA LABEL MARKER
// ─────────────────────────────────────────────────────────────────────────────
function AreaLabel({ acres }) {
  return (
    <View style={al.wrap}>
      <Text style={al.txt}>{acres} ac</Text>
    </View>
  );
}
const al = StyleSheet.create({
  wrap: {
    backgroundColor: D.card + 'EE',
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1.5,
    borderColor: D.primary + '66',
  },
  txt: { color: D.primary, fontSize: 13, fontWeight: '900' },
});

// ─────────────────────────────────────────────────────────────────────────────
// TOOLBAR BUTTON
// ─────────────────────────────────────────────────────────────────────────────
function ToolBtn({ icon, label, active, danger, disabled, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!!disabled}
      activeOpacity={0.75}
      style={[
        tb.btn,
        active && tb.active,
        danger && tb.danger,
        disabled && tb.disabled,
        Shadow.sm,
      ]}
    >
      <Text
        style={[
          tb.icon,
          active && { color: D.primary },
          danger && { color: D.red },
        ]}
      >
        {icon}
      </Text>
      {label ? (
        <Text
          style={[
            tb.lbl,
            active && { color: D.primary },
            danger && { color: D.red },
          ]}
        >
          {label}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}
const tb = StyleSheet.create({
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: D.card,
    borderWidth: 1.5,
    borderColor: D.cardBorder,
    borderRadius: Radius.md,
    paddingHorizontal: 10,
    paddingVertical: 9,
    minWidth: 52,
    marginBottom: 8,
  },
  active: { backgroundColor: D.primaryDim, borderColor: D.primary },
  danger: { backgroundColor: D.red + '18', borderColor: D.red + '60' },
  disabled: { opacity: 0.3 },
  icon: { fontSize: 20, color: D.textSub },
  lbl: {
    fontSize: 9,
    color: D.muted,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 2,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MAP TYPE CHIP
// ─────────────────────────────────────────────────────────────────────────────
function MapTypeChip({ item, active, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[mc.chip, active && mc.active, Shadow.sm]}
    >
      <Text style={mc.icon}>{item.icon}</Text>
      <Text style={[mc.label, active && { color: D.primary }]}>
        {item.label}
      </Text>
    </TouchableOpacity>
  );
}
const mc = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    backgroundColor: D.card,
    borderColor: D.cardBorder,
  },
  active: { backgroundColor: D.primaryDim, borderColor: D.primary },
  icon: { fontSize: 13 },
  label: { fontSize: 11, fontWeight: '700', color: D.textSub },
});

// ─────────────────────────────────────────────────────────────────────────────
// STAT PILL
// ─────────────────────────────────────────────────────────────────────────────
function StatPill({ value, label, valueColor }) {
  return (
    <View style={[sp.wrap, Shadow.sm]}>
      <Text style={[sp.val, { color: valueColor ?? D.primary }]}>{value}</Text>
      <Text style={sp.lbl}>{label}</Text>
    </View>
  );
}
const sp = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: D.surface,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: D.cardBorder,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  val: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  lbl: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: D.muted,
    marginTop: 3,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// DRAW PANEL
// ─────────────────────────────────────────────────────────────────────────────
function DrawPanel({
  points,
  isClosed,
  onUndo,
  onClear,
  onClose,
  onReopen,
  onSave,
}) {
  const slideY = useRef(new Animated.Value(280)).current;
  useEffect(() => {
    Animated.spring(slideY, {
      toValue: 0,
      tension: 60,
      friction: 12,
      useNativeDriver: true,
    }).start();
  }, []);

  const acres = useMemo(() => computeAcres(points), [points]);
  const perimeter = useMemo(() => {
    if (points.length < 2) return '—';
    let d = 0;
    for (let i = 0; i < points.length; i++)
      d += haversineKm(points[i], points[(i + 1) % points.length]);
    return d.toFixed(2) + ' km';
  }, [points]);

  const canClose = points.length >= 3 && !isClosed;
  const canUndo = points.length > 0 && !isClosed;

  return (
    <Animated.View
      style={[dp.sheet, { transform: [{ translateY: slideY }] }, Shadow.lg]}
    >
      {/* Handle */}
      <View style={dp.handleRow}>
        <View style={dp.handle} />
      </View>

      {/* Stats */}
      <View style={dp.statsRow}>
        <StatPill value={String(points.length)} label="Points" />
        <View style={{ width: 6 }} />
        <StatPill
          value={isClosed ? String(acres) : '—'}
          label="Acres"
          valueColor={isClosed ? D.primary : D.muted}
        />
        <View style={{ width: 6 }} />
        <StatPill
          value={isClosed ? perimeter : '—'}
          label="Perimeter"
          valueColor={isClosed ? D.blue : D.muted}
        />
        <View style={{ width: 6 }} />
        <StatPill
          value={isClosed ? '✓' : '○'}
          label="Status"
          valueColor={isClosed ? D.primary : D.warning}
        />
      </View>

      {/* Hint */}
      {!isClosed && (
        <View style={dp.hint}>
          <Text style={dp.hintTxt}>
            {points.length === 0
              ? '👆  Tap the map to place boundary points'
              : points.length < 3
              ? `📍  ${points.length} point${
                  points.length > 1 ? 's' : ''
                } placed — need at least 3`
              : `✅  ${points.length} points — tap Close Boundary when done`}
          </Text>
        </View>
      )}

      {/* Buttons */}
      <View style={dp.btnRow}>
        {!isClosed ? (
          <>
            <TouchableOpacity
              onPress={onUndo}
              disabled={!canUndo}
              activeOpacity={0.75}
              style={[dp.btn, dp.btnSec, !canUndo && dp.off]}
            >
              <Text style={[dp.btnTxt, { color: D.textSub }]}>↩ Undo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onClear}
              disabled={points.length === 0}
              activeOpacity={0.75}
              style={[dp.btn, dp.btnRed, points.length === 0 && dp.off]}
            >
              <Text style={[dp.btnTxt, { color: D.red }]}>✕ Clear</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onClose}
              disabled={!canClose}
              activeOpacity={0.85}
              style={[dp.btn, dp.btnGreen, !canClose && dp.off]}
            >
              <Text style={[dp.btnTxt, { color: '#fff', fontWeight: '800' }]}>
                ⬡ Close
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              onPress={onReopen}
              activeOpacity={0.75}
              style={[dp.btn, dp.btnSec]}
            >
              <Text style={[dp.btnTxt, { color: D.textSub }]}>✏️ Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onClear}
              activeOpacity={0.75}
              style={[dp.btn, dp.btnRed]}
            >
              <Text style={[dp.btnTxt, { color: D.red }]}>✕ Reset</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onSave}
              activeOpacity={0.85}
              style={[dp.btn, dp.btnGreen]}
            >
              <Text style={[dp.btnTxt, { color: '#fff', fontWeight: '800' }]}>
                ✓ Save
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </Animated.View>
  );
}
const dp = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: D.card,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderTopWidth: 1.5,
    borderTopColor: D.cardBorder,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl + 8,
  },
  handleRow: { alignItems: 'center', paddingTop: 10, marginBottom: 14 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: D.divider },
  statsRow: { flexDirection: 'row', marginBottom: 12 },
  hint: {
    backgroundColor: D.primaryDim,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: D.primary + '44',
  },
  hintTxt: {
    color: D.primary,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  btnRow: { flexDirection: 'row', gap: 8 },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  btnSec: { backgroundColor: D.surface, borderColor: D.cardBorder },
  btnRed: { backgroundColor: D.red + '14', borderColor: D.red + '55' },
  btnGreen: { backgroundColor: D.primary, borderWidth: 0 },
  off: { opacity: 0.3 },
  btnTxt: { fontSize: 13, fontWeight: '700' },
});

// ─────────────────────────────────────────────────────────────────────────────
// SAVED BOUNDARY CARD
// ─────────────────────────────────────────────────────────────────────────────
function SavedCard({ boundary, onEdit, onDismiss }) {
  const slideY = useRef(new Animated.Value(200)).current;
  useEffect(() => {
    Animated.spring(slideY, {
      toValue: 0,
      tension: 60,
      friction: 12,
      useNativeDriver: true,
    }).start();
  }, []);

  const acres = computeAcres(boundary);
  const date = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <Animated.View
      style={[sv.sheet, { transform: [{ translateY: slideY }] }, Shadow.lg]}
    >
      <View style={sv.header}>
        <View style={sv.pill}>
          <Text style={{ fontSize: 14 }}>✅</Text>
          <Text style={sv.pillTxt}>Boundary Saved</Text>
        </View>
        <TouchableOpacity
          onPress={onDismiss}
          activeOpacity={0.7}
          style={{ padding: 6 }}
        >
          <Text style={{ color: D.muted, fontSize: 11, fontWeight: '700' }}>
            ⌃ Hide
          </Text>
        </TouchableOpacity>
      </View>

      <View style={sv.infoRow}>
        <View style={sv.item}>
          <Text style={[sv.val, { color: D.primary }]}>{acres}</Text>
          <Text style={sv.key}>Acres</Text>
        </View>
        <View style={sv.sep} />
        <View style={sv.item}>
          <Text style={sv.val}>{boundary.length}</Text>
          <Text style={sv.key}>Points</Text>
        </View>
        <View style={sv.sep} />
        <View style={sv.item}>
          <Text style={sv.val}>{date}</Text>
          <Text style={sv.key}>Date</Text>
        </View>
      </View>

      <TouchableOpacity onPress={onEdit} activeOpacity={0.8} style={sv.editBtn}>
        <Text style={{ color: D.textSub, fontSize: 13, fontWeight: '700' }}>
          ✏️ Edit Boundary
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}
const sv = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: D.card,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderTopWidth: 1.5,
    borderTopColor: D.primary + '70',
    padding: Spacing.md,
    paddingBottom: Spacing.xl + 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: D.primaryDim,
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: D.primary + '60',
  },
  pillTxt: { color: D.primary, fontSize: 13, fontWeight: '800' },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: D.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: D.cardBorder,
  },
  item: { flex: 1, alignItems: 'center' },
  val: { color: D.text, fontSize: 19, fontWeight: '900', letterSpacing: -0.3 },
  key: {
    color: D.muted,
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 3,
  },
  sep: { width: 1, height: 38, backgroundColor: D.divider },
  editBtn: {
    backgroundColor: D.surface,
    borderRadius: Radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: D.cardBorder,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// LOCATING OVERLAY
// ─────────────────────────────────────────────────────────────────────────────
function LocatingOverlay() {
  const opacity = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0.9)).current;
  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.15,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.9,
          duration: 750,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [opacity, pulse]);
  return (
    <Animated.View style={[lov.overlay, { opacity }]} pointerEvents="none">
      <View style={[lov.card, Shadow.lg]}>
        <Animated.Text style={[lov.emoji, { transform: [{ scale: pulse }] }]}>
          📡
        </Animated.Text>
        <Text style={lov.title}>Acquiring Location</Text>
        <Text style={lov.sub}>Make sure GPS is on</Text>
      </View>
    </Animated.View>
  );
}
const lov = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: D.bg + 'BB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: D.card,
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    borderColor: D.cardBorder,
    padding: 30,
    alignItems: 'center',
    gap: 8,
    minWidth: 220,
  },
  emoji: { fontSize: 40, marginBottom: 4 },
  title: { color: D.text, fontSize: 16, fontWeight: '800' },
  sub: { color: D.muted, fontSize: 13 },
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function FarmMapScreen({ navigation }) {
  const mapRef = useRef(null);

  // ── location ─────────────────────────────────────────────────────────────
  const [location, setLocation] = useState(null);
  const [locating, setLocating] = useState(true);
  const [locationErr, setLocationErr] = useState(null);

  // ── map ───────────────────────────────────────────────────────────────────
  const [mapStyle, setMapStyle] = useState('dark'); // 'dark' | 'satellite' | 'standard' | 'topo'
  const [mapReady, setMapReady] = useState(false);

  // ── drawing ───────────────────────────────────────────────────────────────
  // pointsRef avoids stale closures in handleMapPress
  const pointsRef = useRef([]);
  const [points, setPoints] = useState([]);
  const [drawing, setDrawing] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const [saved, setSaved] = useState(null);
  const [showSaved, setShowSaved] = useState(false);

  // Atomic update — always keeps ref + state in sync
  const syncPoints = useCallback(updater => {
    const next =
      typeof updater === 'function' ? updater(pointsRef.current) : updater;
    pointsRef.current = next;
    setPoints([...next]);
  }, []);

  // ── current tile URL ──────────────────────────────────────────────────────
  const tileUrl = useMemo(
    () => MAP_TYPES.find(m => m.key === mapStyle)?.url ?? OSM_TILES.dark,
    [mapStyle],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // GET LOCATION — high accuracy first, fallback to low accuracy on timeout
  // ─────────────────────────────────────────────────────────────────────────
  const fetchLocation = useCallback((attempt = 1) => {
    const opts =
      attempt === 1
        ? { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
        : { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 };

    Geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        setLocation({ latitude, longitude });
        setLocating(false);
        setLocationErr(null);
      },
      err => {
        if (attempt === 1) {
          fetchLocation(2);
        } else {
          setLocationErr(err.message ?? 'GPS unavailable');
          setLocating(false);
        }
      },
      opts,
    );
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const granted = await requestLocationPermission();
      if (!alive) return;
      if (!granted) {
        setLocationErr('Location permission denied');
        setLocating(false);
        return;
      }
      fetchLocation(1);
    })();
    return () => {
      alive = false;
    };
  }, [fetchLocation]);

  // Fly to location once map is ready
  useEffect(() => {
    if (mapReady && location) {
      mapRef.current?.animateToRegion(
        { ...location, latitudeDelta: 0.01, longitudeDelta: 0.01 },
        800,
      );
    }
  }, [mapReady, location]);

  // ─────────────────────────────────────────────────────────────────────────
  // MAP PRESS → place point
  // ─────────────────────────────────────────────────────────────────────────
  const handleMapPress = useCallback(
    e => {
      if (!drawing || isClosed) return;
      const coord = e?.nativeEvent?.coordinate;
      if (
        !coord ||
        typeof coord.latitude !== 'number' ||
        typeof coord.longitude !== 'number'
      )
        return;
      syncPoints(prev => [
        ...prev,
        { latitude: coord.latitude, longitude: coord.longitude },
      ]);
    },
    [drawing, isClosed, syncPoints],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // MAP CONTROLS
  // ─────────────────────────────────────────────────────────────────────────
  const goToUser = useCallback(() => {
    if (!location) return;
    mapRef.current?.animateToRegion(
      { ...location, latitudeDelta: 0.006, longitudeDelta: 0.006 },
      500,
    );
  }, [location]);

  const zoomIn = useCallback(() => {
    mapRef.current
      ?.getCamera()
      .then(c => {
        if (c)
          mapRef.current?.animateCamera(
            { zoom: (c.zoom ?? 14) + 1 },
            { duration: 250 },
          );
      })
      .catch(() => {});
  }, []);

  const zoomOut = useCallback(() => {
    mapRef.current
      ?.getCamera()
      .then(c => {
        if (c)
          mapRef.current?.animateCamera(
            { zoom: (c.zoom ?? 14) - 1 },
            { duration: 250 },
          );
      })
      .catch(() => {});
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // DRAWING ACTIONS
  // ─────────────────────────────────────────────────────────────────────────
  const startDrawing = useCallback(() => {
    syncPoints([]);
    setIsClosed(false);
    setDrawing(true);
  }, [syncPoints]);
  const undoPoint = useCallback(
    () => syncPoints(p => p.slice(0, -1)),
    [syncPoints],
  );
  const closeBoundary = useCallback(() => {
    if (pointsRef.current.length >= 3) setIsClosed(true);
  }, []);
  const reopenBoundary = useCallback(() => setIsClosed(false), []);

  const clearAll = useCallback(() => {
    Alert.alert('Clear Boundary', 'Remove all placed points?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          syncPoints([]);
          setIsClosed(false);
          setSaved(null);
          setShowSaved(false);
        },
      },
    ]);
  }, [syncPoints]);

  const exitDrawing = useCallback(() => {
    if (pointsRef.current.length > 0 && !isClosed) {
      Alert.alert('Exit Drawing', 'Discard current boundary?', [
        { text: 'Stay', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            syncPoints([]);
            setIsClosed(false);
            setDrawing(false);
          },
        },
      ]);
    } else {
      setDrawing(false);
    }
  }, [isClosed, syncPoints]);

  const saveBoundary = useCallback(() => {
    const pts = pointsRef.current;
    if (!isClosed || pts.length < 3) return;

    const acres = computeAcres(pts);
    const sqm = (parseFloat(acres) * 4046.86).toFixed(0);
    const center = getCentroid(pts);
    const timestamp = new Date().toISOString();

    const geojson = {
      type: 'Feature',
      properties: {
        area_acres: parseFloat(acres),
        area_sqm: parseInt(sqm, 10),
        num_points: pts.length,
        centroid: center,
        saved_at: timestamp,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            ...pts.map(p => [p.longitude, p.latitude]),
            [pts[0].longitude, pts[0].latitude],
          ],
        ],
      },
    };

    // ── LOG ──────────────────────────────────────────────────────────────
    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║         FARM BOUNDARY — SAVED                     ║');
    console.log('╠════════════════════════════════════════════════════╣');
    console.log(`║  Points   : ${pts.length}`);
    console.log(`║  Area     : ${acres} acres  (${sqm} m²)`);
    console.log(
      `║  Centroid : ${center?.latitude.toFixed(
        6,
      )}, ${center?.longitude.toFixed(6)}`,
    );
    console.log(`║  Saved at : ${timestamp}`);
    console.log('╠════════════════════════════════════════════════════╣');
    pts.forEach((p, i) =>
      console.log(
        `║  [${String(i + 1).padStart(2, '0')}]  ${p.latitude.toFixed(
          7,
        )}, ${p.longitude.toFixed(7)}` +
          `  →  ${toDMS(p.latitude, true)}, ${toDMS(p.longitude, false)}`,
      ),
    );
    console.log('╠════════════════════════════════════════════════════╣');
    console.log('║  GeoJSON:');
    console.log(JSON.stringify(geojson, null, 2));
    console.log('╚════════════════════════════════════════════════════╝\n');
    // ── END LOG ──────────────────────────────────────────────────────────

    setSaved([...pts]);
    setDrawing(false);
    setShowSaved(true);

    if (pts.length >= 2) {
      setTimeout(() => {
        try {
          mapRef.current?.fitToCoordinates(pts, {
            edgePadding: { top: 120, right: 60, bottom: 320, left: 60 },
            animated: true,
          });
        } catch (_) {}
      }, 150);
    }
  }, [isClosed]);

  const editSaved = useCallback(() => {
    if (!saved) return;
    syncPoints([...saved]);
    setIsClosed(true);
    setDrawing(true);
    setSaved(null);
    setShowSaved(false);
  }, [saved, syncPoints]);

  // ─────────────────────────────────────────────────────────────────────────
  // DERIVED VALUES
  // ─────────────────────────────────────────────────────────────────────────
  const polyline = useMemo(() => {
    if (points.length < 2) return [];
    return isClosed ? [...points, points[0]] : points;
  }, [points, isClosed]);

  const liveAcres = useMemo(
    () => (isClosed && points.length >= 3 ? computeAcres(points) : null),
    [points, isClosed],
  );
  const savedCenter = useMemo(
    () => (saved ? getCentroid(saved) : null),
    [saved],
  );
  const savedAcres = useMemo(
    () => (saved ? computeAcres(saved) : '0'),
    [saved],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* ─────────────────────────────────────────────────────────────────
          MAP  — PROVIDER_DEFAULT + UrlTile = OpenStreetMap (free!)
      ───────────────────────────────────────────────────────────────── */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_DEFAULT} // ← NOT PROVIDER_GOOGLE
        mapType="none" // ← must be 'none' when using UrlTile
        initialRegion={INDIA_REGION}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={false}
        showsBuildings={false}
        showsTraffic={false}
        moveOnMarkerPress={false}
        onMapReady={() => setMapReady(true)}
        onPress={handleMapPress}
      >
        {/* OSM tile layer — this IS the map */}
        <UrlTile
          urlTemplate={tileUrl}
          maximumZ={19}
          flipY={false}
          tileSize={256}
          zIndex={-1}
        />

        {/* User location dot */}
        {location && (
          <Marker
            coordinate={location}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
            zIndex={999}
          >
            <UserDot />
          </Marker>
        )}

        {/* Drawing polyline */}
        {polyline.length >= 2 && (
          <Polyline
            coordinates={polyline}
            strokeColor={isClosed ? D.primary : D.primaryLight}
            strokeWidth={isClosed ? 3 : 2.5}
            lineDashPattern={isClosed ? undefined : [10, 5]}
            zIndex={10}
          />
        )}

        {/* Closing edge preview */}
        {!isClosed && points.length >= 3 && (
          <Polyline
            coordinates={[points[points.length - 1], points[0]]}
            strokeColor={D.primary + '55'}
            strokeWidth={1.5}
            lineDashPattern={[4, 10]}
            zIndex={9}
          />
        )}

        {/* Filled polygon when closed */}
        {isClosed && points.length >= 3 && (
          <Polygon
            coordinates={points}
            fillColor={D.primaryDim}
            strokeColor={D.primary}
            strokeWidth={3}
            zIndex={8}
          />
        )}

        {/* Numbered point markers */}
        {points.map((coord, i) => (
          <Marker
            key={`pt-${i}`}
            coordinate={coord}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
            zIndex={20 + i}
          >
            <PointDot index={i} isFirst={i === 0} />
          </Marker>
        ))}

        {/* Saved boundary */}
        {saved && !drawing && (
          <>
            <Polygon
              coordinates={saved}
              fillColor={D.primaryDim}
              strokeColor={D.primaryLight}
              strokeWidth={2.5}
              zIndex={5}
            />
            {savedCenter && (
              <Marker
                coordinate={savedCenter}
                anchor={{ x: 0.5, y: 0.5 }}
                tracksViewChanges={false}
                zIndex={15}
              >
                <AreaLabel acres={savedAcres} />
              </Marker>
            )}
            {saved.map((coord, i) => (
              <Marker
                key={`sv-${i}`}
                coordinate={coord}
                anchor={{ x: 0.5, y: 0.5 }}
                tracksViewChanges={false}
                zIndex={12}
              >
                <View style={vtx.outer}>
                  <View style={vtx.inner} />
                </View>
              </Marker>
            ))}
          </>
        )}
      </MapView>

      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <SafeAreaView style={s.safeHeader} pointerEvents="box-none">
        {/* Top bar */}
        <View style={[s.topBar, Shadow.md]}>
          <TouchableOpacity
            onPress={() => navigation?.goBack?.()}
            style={s.backBtn}
            activeOpacity={0.75}
          >
            <Text style={s.backArrow}>←</Text>
          </TouchableOpacity>

          <View style={s.titleBlock}>
            <Text style={s.title}>Farm Boundary</Text>
            {locating ? (
              <Text style={s.coord}>Acquiring GPS…</Text>
            ) : locationErr ? (
              <Text style={[s.coord, { color: D.red }]}>⚠ {locationErr}</Text>
            ) : location ? (
              <Text style={s.coord}>
                📍 {location.latitude.toFixed(5)},{' '}
                {location.longitude.toFixed(5)}
              </Text>
            ) : null}
          </View>

          {/* OSM credit badge */}
          <View style={s.osmBadge}>
            <Text style={s.osmTxt}>© OSM</Text>
          </View>
        </View>

        {/* Map type chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.chipsScroll}
          contentContainerStyle={{ gap: 8, paddingHorizontal: Spacing.md }}
        >
          {MAP_TYPES.map(item => (
            <MapTypeChip
              key={item.key}
              item={item}
              active={mapStyle === item.key}
              onPress={() => setMapStyle(item.key)}
            />
          ))}
        </ScrollView>

        {/* Draw mode badge */}
        {drawing && (
          <View style={s.badgeRow} pointerEvents="none">
            <View
              style={[
                s.badge,
                { borderColor: isClosed ? D.primary + '66' : D.warning + '66' },
                Shadow.sm,
              ]}
            >
              <View
                style={[
                  s.badgeDot,
                  { backgroundColor: isClosed ? D.primary : D.warning },
                ]}
              />
              <Text
                style={[
                  s.badgeTxt,
                  { color: isClosed ? D.primary : D.warning },
                ]}
              >
                {isClosed
                  ? `Boundary closed · ${liveAcres} ac`
                  : points.length === 0
                  ? 'Tap map to place points'
                  : `${points.length} point${
                      points.length > 1 ? 's' : ''
                    } placed`}
              </Text>
            </View>
          </View>
        )}
      </SafeAreaView>

      {/* ── RIGHT TOOLBAR ────────────────────────────────────────────────── */}
      <View style={s.toolbar} pointerEvents="box-none">
        <ToolBtn icon="📍" label="Me" onPress={goToUser} disabled={!location} />
        <ToolBtn icon="＋" label="In" onPress={zoomIn} />
        <ToolBtn icon="－" label="Out" onPress={zoomOut} />
        {!drawing ? (
          <ToolBtn icon="⬡" label="Draw" onPress={startDrawing} />
        ) : (
          <ToolBtn icon="✕" label="Exit" danger onPress={exitDrawing} />
        )}
      </View>

      {/* ── MY LOCATION FAB ──────────────────────────────────────────────── */}
      {!drawing && (
        <TouchableOpacity
          onPress={location ? goToUser : undefined}
          activeOpacity={location ? 0.85 : 0.5}
          style={[s.fab, !location && { opacity: 0.5 }, Shadow.lg]}
        >
          <Text style={s.fabIcon}>📍</Text>
          <Text style={s.fabLabel}>My Location</Text>
        </TouchableOpacity>
      )}

      {/* ── BOTTOM PANELS ────────────────────────────────────────────────── */}
      {drawing && (
        <DrawPanel
          points={points}
          isClosed={isClosed}
          onUndo={undoPoint}
          onClear={clearAll}
          onClose={closeBoundary}
          onReopen={reopenBoundary}
          onSave={saveBoundary}
        />
      )}

      {showSaved && saved && !drawing && (
        <SavedCard
          boundary={saved}
          onEdit={editSaved}
          onDismiss={() => setShowSaved(false)}
        />
      )}

      {/* ── LOCATING OVERLAY ─────────────────────────────────────────────── */}
      {locating && <LocatingOverlay />}
    </View>
  );
}

// ─── saved boundary vertex ────────────────────────────────────────────────────
const vtx = StyleSheet.create({
  outer: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: D.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  inner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: D.primaryLight,
  },
});

// ─── main styles ──────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: D.bg },
  safeHeader: { position: 'absolute', top: 0, left: 0, right: 0 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.sm,
    marginTop: 6,
    backgroundColor: D.card + 'F4',
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: D.cardBorder,
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: 11,
    gap: 10,
  },
  backBtn: { width: 32, alignItems: 'center', justifyContent: 'center' },
  backArrow: { color: D.text, fontSize: 22, fontWeight: '300' },
  titleBlock: { flex: 1 },
  title: { color: D.text, fontSize: 16, fontWeight: '700' },
  coord: {
    color: D.muted,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 10,
    marginTop: 2,
  },

  osmBadge: {
    backgroundColor: D.surface,
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: D.cardBorder,
  },
  osmTxt: { color: D.muted, fontSize: 9, fontWeight: '700' },

  chipsScroll: { marginTop: 10 },

  badgeRow: { alignItems: 'center', marginTop: 10 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: D.card + 'EE',
    borderRadius: Radius.full,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1.5,
  },
  badgeDot: { width: 8, height: 8, borderRadius: 4 },
  badgeTxt: { fontSize: 12, fontWeight: '700' },

  toolbar: {
    position: 'absolute',
    right: Spacing.sm,
    top: SH * 0.27,
    alignItems: 'center',
  },

  fab: {
    position: 'absolute',
    bottom: 36,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: D.primary,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: Radius.full,
  },
  fabIcon: { fontSize: 16 },
  fabLabel: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
