// src/screens/reports/DeviceReadingsScreen.jsx
//
// Uses dynamic field schema from /api/mobile/device-types/{type_key}/field-schema/
// instead of hardcoded column lists.
//
// Schema shapes:
//   soilsaathi → named keys (nitrogen, phosphorous, ph, ec, oc, …)
//   ph_bottle  → generic keys (field1, field2, … + latitude, longitude)
//   atmo_sense / soil_life → generic keys (field1…fieldN)
//
// We show max MAX_PREVIEW_COLS columns in the row preview (fits on screen).
// All fields are shown in ReadingDetailScreen.

import React, { useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Radius, Spacing, Shadow } from '../theme';
import { TopBar } from '../components/common';
import useTheme from '../hooks/useTheme';
import {
  fetchDeviceReadings,
  fetchDeviceFieldSchema,
} from '../redux/actions/reportsActions';

const DEVICE_META = {
  soilsaathi: { icon: 'flask-outline', color: '#16A34A', label: 'SoiLENZ' },
  ph_bottle: {
    icon: 'water-check-outline',
    color: '#2563EB',
    label: 'PHBottle',
  },
  atmo_sense: {
    icon: 'weather-partly-cloudy',
    color: '#7C3AED',
    label: 'AtmoSense',
  },
  soil_life: {
    icon: 'leaf-circle-outline',
    color: '#D97706',
    label: 'SoilLIFE',
  },
};

// Max columns to show in the reading list row preview
const MAX_PREVIEW_COLS = 4;

// Skip these keys in the preview columns (location noise)
const SKIP_PREVIEW_KEYS = new Set([
  'latitude',
  'longitude',
  'area_name',
  'tag',
  'crop_type',
  'created_at',
]);

// ─── Derive preview columns from schema ───────────────────────────────────────
// Returns [{ key, shortLabel, fullLabel }, …] limited to MAX_PREVIEW_COLS
function derivePreviewCols(schema) {
  if (!schema || Object.keys(schema).length === 0) return [];
  return Object.entries(schema)
    .filter(([key]) => !SKIP_PREVIEW_KEYS.has(key))
    .slice(0, MAX_PREVIEW_COLS)
    .map(([key, fullLabel]) => ({
      key,
      fullLabel,
      shortLabel: shortify(key, fullLabel),
    }));
}

function shortify(key, fullLabel) {
  const abbr = {
    nitrogen: 'N',
    phosphorous: 'P',
    potassium: 'K',
    ph: 'pH',
    ec: 'EC',
    oc: 'OC',
    calcium: 'Ca',
    magnesium: 'Mg',
    sulphur: 'S',
    zinc: 'Zn',
    manganese: 'Mn',
    iron: 'Fe',
    copper: 'Cu',
    boron: 'B',
    electrical_conduction: 'EC',
  };
  if (abbr[key]) return abbr[key];
  const firstWord = fullLabel?.split(' ')[0] ?? key;
  return firstWord.length > 5 ? firstWord.slice(0, 4) + '.' : firstWord;
}

function getFieldValue(reading, key) {
  return reading[key] ?? null;
}

function hasData(reading, previewCols) {
  if (previewCols.length === 0) {
    return [
      'nitrogen',
      'phosphorous',
      'potassium',
      'ph',
      'ec',
      'field1',
      'field2',
    ].some(k => (reading[k] ?? 0) > 0);
  }
  return previewCols.some(col => (getFieldValue(reading, col.key) ?? 0) > 0);
}

function fmt(v, dec = 1) {
  if (v == null) return '—';
  const n = Number(v);
  return isNaN(n) ? String(v) : n.toFixed(dec);
}

// ─── Reading row ─────────────────────────────────────────────────────────────
function ReadingRow({ reading, previewCols, color, onPress, T }) {
  const active = hasData(reading, previewCols);
  const date = new Date(reading.created_at);

  return (
    <TouchableOpacity
      style={[s.readingRow, { backgroundColor: T.card, borderColor: T.border }]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      <View
        style={[s.statusDot, { backgroundColor: active ? color : T.border }]}
      />

      <View style={s.rowLeft}>
        {reading.tag ? (
          <Text style={[s.rowTag, { color: T.muted }]}>{reading.tag}</Text>
        ) : null}
        <Text style={[s.rowArea, { color: T.text }]} numberOfLines={1}>
          {reading.area_name || 'Tag'}
        </Text>
      </View>

      <View style={s.colsWrap}>
        {previewCols.map(col => (
          <View key={col.key} style={s.colItem}>
            <Text style={[s.colLbl, { color: T.muted }]}>{col.shortLabel}</Text>
            <Text style={[s.colVal, { color: active ? color : T.textSub }]}>
              {fmt(getFieldValue(reading, col.key))}
            </Text>
          </View>
        ))}
        {previewCols.length === 0 && (
          <Text style={[s.colLbl, { color: T.muted }]}>No schema</Text>
        )}
      </View>

      <View style={s.rowRight}>
        <Text style={[s.rowDate, { color: T.muted }]}>
          {date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
        </Text>
        <Text style={[s.rowTime, { color: T.muted }]}>
          {date.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          })}
        </Text>
        <Icon
          name="chevron-right"
          size={16}
          color={T.muted}
          style={{ marginTop: 4 }}
        />
      </View>
    </TouchableOpacity>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function DeviceReadingsScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const T = theme.colors;

  const { deviceId, deviceName, deviceType, device } = route.params;
  console.log('DeviceReadingsScreen params:', route.params);
  const meta = DEVICE_META[deviceType] || DEVICE_META.soilsaathi;

  const slot = useSelector(s => s.reports.readingsByDevice[deviceId]);
  const readings = slot?.data ?? [];
  const readingsLoading = slot?.loading ?? false;
  const readingsError = slot?.error ?? null;
  const readingsMeta = slot?.meta ?? {};
  const currentPage = readingsMeta.page ?? 1;
  const totalPages = readingsMeta.total_pages ?? 1;

  const schemaSlot = useSelector(s => s.reports.schemas?.[deviceType]);
  const schema = schemaSlot?.schema ?? null;
  const schemaLoading = schemaSlot?.loading ?? false;

  const previewCols = useMemo(() => derivePreviewCols(schema), [schema]);

  useEffect(() => {
    dispatch(fetchDeviceReadings(deviceId, 1));
    if (!schema && !schemaLoading) {
      dispatch(fetchDeviceFieldSchema(deviceType));
    }
  }, [deviceId, deviceType, dispatch]);

  const loadPage = useCallback(
    page => dispatch(fetchDeviceReadings(deviceId, page)),
    [deviceId, dispatch],
  );

  // ── Render helpers ─────────────────────────────────────────────────────────

  const renderHeader = () => {
    const address = [device.address1, device.address2]
      .filter(Boolean)
      .join(', ');

    return (
      <View>
        {/* ── Device info card ── */}
        <View
          style={[
            s.infoCard,
            { backgroundColor: T.card, borderColor: T.border },
          ]}
        >
          {/* Colour accent strip */}
          <View style={[s.infoAccent, { backgroundColor: meta.color }]} />

          {/* ── Top row: icon + name/type + active badge + api pill ── */}
          <View style={s.infoTopRow}>
            {/* Device icon */}
            <View
              style={[
                s.infoIconWrap,
                {
                  backgroundColor: meta.color + '18',
                  borderColor: meta.color + '40',
                },
              ]}
            >
              <Icon name={meta.icon} size={26} color={meta.color} />
            </View>

            {/* Name + type */}
            <View style={s.infoNameBlock}>
              <Text style={[s.infoName, { color: T.text }]}>{device.name}</Text>
              <Text style={[s.infoType, { color: meta.color }]}>
                {meta.label}
              </Text>
            </View>

            {/* Right column: Active badge stacked over API calls pill */}
            <View style={s.infoTopRight}>
              {/* Active badge */}
              <View
                style={[
                  s.statusPill,
                  {
                    backgroundColor: meta.color + '18',
                    borderColor: meta.color + '50',
                  },
                ]}
              >
                <View style={[s.pillDot, { backgroundColor: meta.color }]} />
                <Text style={[s.pillText, { color: meta.color }]}>Active</Text>
              </View>

              {/* API calls mini pill */}
              <View
                style={[
                  s.apiPill,
                  {
                    backgroundColor: T.cardAlt ?? T.bg,
                    borderColor: T.border,
                  },
                ]}
              >
                <Icon name="api" size={11} color={T.muted} />
                <Text style={[s.apiPillText, { color: T.muted }]}>
                  {device.api_used ?? 0} API calls
                </Text>
              </View>
            </View>
          </View>

          {/* ── Info grid ── */}
          {/*
            Layout:
              Row 1: Serial No  |  Device ID
              Row 2: Land       |  Purchased
              Row 3: Address (full width)
          */}
          <View style={[s.infoGrid, { borderTopColor: T.border }]}>
            {/* Row 1 */}
            <InfoCell label="Serial No" value={device.serial_no} T={T} />
            <InfoCell label="Device ID" value={device.devise_id} T={T} />

            {/* Row 2 */}
            <InfoCell label="Land" value={`${device.land} acres`} T={T} />
            <InfoCell
              label="Purchased"
              value={
                device.purchase_date
                  ? new Date(device.purchase_date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })
                  : '—'
              }
              T={T}
            />

            {/* Row 3 — Address spans full width */}
            {address ? (
              <View style={[s.infoCellFull, { borderTopColor: T.border }]}>
                <Text style={[s.infoCellLabel, { color: T.muted }]}>
                  Address
                </Text>
                <Text style={[s.infoCellValueWrap, { color: T.text }]}>
                  {address}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* ── Section header ── */}
        <View style={s.sectionHeader}>
          <Text style={[s.sectionTitle, { color: T.textSub }]}>
            {meta.label} readings
          </Text>
          {readingsMeta.count != null && (
            <View
              style={[
                s.countPill,
                {
                  backgroundColor: meta.color + '18',
                  borderColor: meta.color + '40',
                },
              ]}
            >
              <Text style={[s.countPillText, { color: meta.color }]}>
                {readingsMeta.count} total
              </Text>
            </View>
          )}
        </View>

        {/* Schema loading indicator */}
        {schemaLoading && (
          <View
            style={[
              s.schemaLoadingBar,
              {
                backgroundColor: meta.color + '12',
                borderColor: meta.color + '30',
              },
            ]}
          >
            <ActivityIndicator size="small" color={meta.color} />
            <Text style={[s.schemaLoadingText, { color: meta.color }]}>
              Loading field schema…
            </Text>
          </View>
        )}

        {/* Column header */}
        {!schemaLoading && previewCols.length > 0 && readings.length > 0 && (
          <View style={[s.colHeader, { borderBottomColor: T.border }]}>
            <Text style={[s.colHeaderText, { width: 52, color: T.muted }]}>
              ID / Area
            </Text>
            <View style={s.colsWrap}>
              {previewCols.map(col => (
                <Text
                  key={col.key}
                  style={[s.colHeaderItem, { color: T.muted }]}
                >
                  {col.shortLabel}
                </Text>
              ))}
            </View>
            <Text
              style={[
                s.colHeaderText,
                { width: 62, textAlign: 'right', color: T.muted },
              ]}
            >
              Date
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderFooter = () => {
    if (readingsLoading)
      return (
        <ActivityIndicator
          color={meta.color}
          style={{ marginVertical: Spacing.lg }}
        />
      );
    if (totalPages <= 1) return <View style={{ height: 32 }} />;
    return (
      <View style={s.pagination}>
        <TouchableOpacity
          style={[
            s.pageBtn,
            { borderColor: T.border, opacity: currentPage <= 1 ? 0.35 : 1 },
          ]}
          onPress={() => loadPage(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          <Icon name="chevron-left" size={16} color={T.text} />
          <Text style={[s.pageBtnText, { color: T.text }]}>Prev</Text>
        </TouchableOpacity>
        <Text style={[s.pageInfo, { color: T.muted }]}>
          {currentPage} / {totalPages}
        </Text>
        <TouchableOpacity
          style={[
            s.pageBtn,
            {
              borderColor: T.border,
              opacity: currentPage >= totalPages ? 0.35 : 1,
            },
          ]}
          onPress={() => loadPage(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          <Text style={[s.pageBtnText, { color: T.text }]}>Next</Text>
          <Icon name="chevron-right" size={16} color={T.text} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmpty = () => {
    if (readingsLoading) return null;
    return (
      <View style={s.empty}>
        <Icon
          name="database-off-outline"
          size={44}
          color={T.muted}
          style={{ opacity: 0.3 }}
        />
        <Text style={[s.emptyTitle, { color: T.text }]}>No readings yet</Text>
        <Text style={[s.emptySub, { color: T.muted }]}>
          Run a test to generate your first reading
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[s.root, { backgroundColor: T.bg }]}>
      <StatusBar
        barStyle={T.statusBar ?? 'light-content'}
        backgroundColor={T.bg}
      />
      <TopBar
        title={deviceName}
        subtitle={meta.label}
        onBack={() => navigation.goBack()}
        theme={theme}
      />

      {readingsError && (
        <View
          style={[
            s.errorBar,
            { backgroundColor: '#EF444418', borderColor: '#EF4444' },
          ]}
        >
          <Icon name="alert-circle-outline" size={14} color="#EF4444" />
          <Text style={{ color: '#EF4444', fontSize: 12, flex: 1 }}>
            {readingsError}
          </Text>
          <TouchableOpacity onPress={() => loadPage(1)}>
            <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 12 }}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={readings}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={s.list}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        renderItem={({ item }) => (
          <ReadingRow
            reading={item}
            previewCols={previewCols}
            color={meta.color}
            T={T}
            onPress={() =>
              navigation.navigate(
                deviceType === 'soilsaathi'
                  ? 'SoilSaathiDetailScreen'
                  : 'PhBottleDetailScreen',
                {
                  readingId: item.id,
                  deviceId,
                  deviceType,
                  deviceName,
                  reading: item,
                  // Pass schema so detail screen doesn't need to re-fetch
                  schema,
                },
              )
            }
          />
        )}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

// ─── InfoCell (2-column cells) ────────────────────────────────────────────────
function InfoCell({ label, value, T, accentColor }) {
  return (
    <View style={s.infoCell}>
      <Text style={[s.infoCellLabel, { color: T.muted }]}>{label}</Text>
      <Text
        style={[s.infoCellValue, { color: accentColor ?? T.text }]}
        numberOfLines={1}
      >
        {value ?? '—'}
      </Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1 },
  list: { padding: Spacing.lg, paddingTop: Spacing.sm },

  // ── Info card ──────────────────────────────────────────────────────────────
  infoCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  infoAccent: { height: 4 },

  // Top row: icon | name+type | right-stack
  infoTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: Spacing.md,
  },
  infoIconWrap: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  infoNameBlock: {
    flex: 1,
    minWidth: 0,
  },
  infoName: { fontSize: 17, fontWeight: '800' },
  infoType: { fontSize: 12, fontWeight: '700', marginTop: 2 },

  // Right column: Active badge stacked over API pill
  infoTopRight: {
    alignItems: 'flex-end',
    gap: 6,
    flexShrink: 0,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 11, fontWeight: '700' },

  // API calls pill (smaller, muted)
  apiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  apiPillText: { fontSize: 10, fontWeight: '600' },

  // Info grid
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  // 2-column half-width cell
  infoCell: { width: '50%', paddingVertical: 6, paddingRight: 8 },
  infoCellLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  infoCellValue: { fontSize: 13, fontWeight: '700' },
  // Full-width address cell
  infoCellFull: {
    width: '100%',
    paddingVertical: 6,
    borderTopWidth: 1,
    marginTop: 2,
  },
  infoCellValueWrap: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },

  // ── Section header ─────────────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  countPill: {
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  countPillText: { fontSize: 11, fontWeight: '700' },

  // ── Schema loading bar ─────────────────────────────────────────────────────
  schemaLoadingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 8,
    marginBottom: 8,
  },
  schemaLoadingText: { fontSize: 12, fontWeight: '600' },

  // ── Column header ──────────────────────────────────────────────────────────
  colHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 6,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  colHeaderText: { fontSize: 10, fontWeight: '700' },
  colHeaderItem: {
    flex: 1,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },

  // ── Reading row ────────────────────────────────────────────────────────────
  readingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: 6,
    paddingVertical: 10,
    paddingHorizontal: 10,
    gap: 8,
    ...Shadow.sm,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  rowLeft: { width: 52, flexShrink: 0 },
  rowArea: { fontSize: 12, fontWeight: '700', marginBottom: 1 },
  rowTag: { fontSize: 10 },
  colsWrap: { flex: 1, flexDirection: 'row' },
  colItem: { flex: 1, alignItems: 'center' },
  colLbl: { fontSize: 9, fontWeight: '600', marginBottom: 2 },
  colVal: { fontSize: 11, fontWeight: '800' },
  rowRight: { alignItems: 'flex-end', width: 62, flexShrink: 0 },
  rowDate: { fontSize: 10, fontWeight: '600' },
  rowTime: { fontSize: 9 },

  // ── Pagination ─────────────────────────────────────────────────────────────
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pageBtnText: { fontSize: 13, fontWeight: '700' },
  pageInfo: { fontSize: 13 },

  // ── Error bar ──────────────────────────────────────────────────────────────
  errorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: Radius.sm,
    margin: Spacing.md,
    padding: Spacing.sm,
  },

  // ── Empty state ────────────────────────────────────────────────────────────
  empty: { alignItems: 'center', paddingVertical: Spacing.xl },
  emptyTitle: { fontSize: 15, fontWeight: '700', marginTop: 12 },
  emptySub: { fontSize: 12, marginTop: 6, textAlign: 'center' },
});
