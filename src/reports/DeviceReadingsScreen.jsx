// src/screens/reports/DeviceReadingsScreen.jsx
//
// Screen 2: Device info header + paginated list of readings.
// Adapts column display based on devise_type (ph_bottle vs soilsaathi).
// Tapping a reading row → ReadingDetailScreen

import React, { useEffect, useCallback } from 'react';
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
import { fetchDeviceReadings } from '../redux/actions/reportsActions';

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

// Columns shown in the reading rows per device type
const SOILLENZ_COLS = ['N', 'P', 'K', 'pH', 'EC'];
const PHBOTTLE_COLS = ['pH', 'EC', 'pH V', 'EC V'];

function hasData(reading) {
  return (
    (reading.nitrogen ?? 0) > 0 ||
    (reading.phosphorous ?? 0) > 0 ||
    (reading.potassium ?? 0) > 0 ||
    (reading.ph ?? 0) > 0 ||
    (reading.ec ?? 0) > 0 ||
    (reading.ph_value ?? 0) > 0
  );
}

function fmt(v, dec = 1) {
  if (v == null) return '—';
  return Number(v).toFixed(dec);
}

function ReadingRow({ reading, deviceType, color, onPress, T }) {
  const isSoil = deviceType === 'soilsaathi';
  const active = hasData(reading);
  const date = new Date(reading.created_at);

  const cols = isSoil
    ? [
        fmt(reading.nitrogen, 0),
        fmt(reading.phosphorous, 0),
        fmt(reading.potassium, 0),
        fmt(reading.ph, 1),
        fmt(reading.ec, 1),
      ]
    : [
        fmt(reading.ph_value ?? reading.ph, 2),
        fmt(reading.ec, 2),
        fmt(reading.ph_voltage, 3),
        fmt(reading.ec_voltage, 3),
      ];

  const labels = isSoil ? SOILLENZ_COLS : PHBOTTLE_COLS;

  return (
    <TouchableOpacity
      style={[s.readingRow, { backgroundColor: T.card, borderColor: T.border }]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      {/* Status dot */}
      <View
        style={[s.statusDot, { backgroundColor: active ? color : T.border }]}
      />

      {/* ID + area */}
      <View style={s.rowLeft}>
        <Text style={[s.rowId, { color: T.muted }]}>#{reading.id}</Text>
        <Text style={[s.rowArea, { color: T.text }]} numberOfLines={1}>
          {reading.area_name || 'No area'}
        </Text>
        {reading.tag ? (
          <Text style={[s.rowTag, { color: T.muted }]}>{reading.tag}</Text>
        ) : null}
      </View>

      {/* Mini nutrient chips */}
      <View style={s.colsWrap}>
        {labels.map((lbl, i) => (
          <View key={lbl} style={s.colItem}>
            <Text style={[s.colLbl, { color: T.muted }]}>{lbl}</Text>
            <Text style={[s.colVal, { color: active ? color : T.textSub }]}>
              {cols[i]}
            </Text>
          </View>
        ))}
      </View>

      {/* Date + chevron */}
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

export default function DeviceReadingsScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const T = theme.colors;

  const { deviceId, deviceName, deviceType, device } = route.params;
  const meta = DEVICE_META[deviceType] || DEVICE_META.soilsaathi;
  const isSoil = deviceType === 'soilsaathi';

  const slot = useSelector(s => s.reports.readingsByDevice[deviceId]);
  const readings = slot?.data ?? [];
  const readingsLoading = slot?.loading ?? false;
  const readingsError = slot?.error ?? null;
  const readingsMeta = slot?.meta ?? {};
  const currentPage = readingsMeta.page ?? 1;
  const totalPages = readingsMeta.total_pages ?? 1;

  useEffect(() => {
    dispatch(fetchDeviceReadings(deviceId, 1));
  }, [deviceId, dispatch]);

  const loadPage = useCallback(
    page => dispatch(fetchDeviceReadings(deviceId, page)),
    [deviceId, dispatch],
  );

  const renderHeader = () => (
    <View>
      {/* ── Device info card ─────────────────────────────────── */}
      <View
        style={[s.infoCard, { backgroundColor: T.card, borderColor: T.border }]}
      >
        {/* Top accent */}
        <View style={[s.infoAccent, { backgroundColor: meta.color }]} />

        {/* Device identity */}
        <View style={s.infoTopRow}>
          <View
            style={[
              s.infoIconWrap,
              {
                backgroundColor: meta.color + '18',
                borderColor: meta.color + '40',
              },
            ]}
          >
            <Icon name={meta.icon} size={28} color={meta.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.infoName, { color: T.text }]}>{device.name}</Text>
            <Text style={[s.infoType, { color: meta.color }]}>
              {meta.label}
            </Text>
          </View>
          {/* Active/Inactive indicator */}
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
        </View>

        {/* Info grid */}
        <View style={[s.infoGrid, { borderTopColor: T.border }]}>
          <InfoCell label="Serial No" value={device.serial_no} T={T} />
          <InfoCell label="Device ID" value={device.devise_id} T={T} />
          <InfoCell label="Land" value={`${device.land} acres`} T={T} />
          <InfoCell
            label="API calls"
            value={device.api_count ?? 0}
            T={T}
            accentColor={meta.color}
          />
          <InfoCell
            label="Address"
            value={[device.address1, device.address2]
              .filter(Boolean)
              .join(', ')}
            T={T}
          />
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
        </View>
      </View>

      {/* ── Section header ───────────────────────────────────── */}
      <View style={s.sectionHeader}>
        <Text style={[s.sectionTitle, { color: T.textSub }]}>
          {isSoil ? 'Soil readings' : 'pH / EC readings'}
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

      {/* ── Column labels ────────────────────────────────────── */}
      {readings.length > 0 && (
        <View style={[s.colHeader, { borderBottomColor: T.border }]}>
          <Text style={[s.colHeaderText, { width: 52, color: T.muted }]}>
            ID / Area
          </Text>
          <View style={s.colsWrap}>
            {(isSoil ? SOILLENZ_COLS : PHBOTTLE_COLS).map(l => (
              <Text key={l} style={[s.colHeaderItem, { color: T.muted }]}>
                {l}
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
            deviceType={deviceType}
            color={meta.color}
            T={T}
            onPress={() =>
              navigation.navigate('ReadingDetailScreen', {
                readingId: item.id,
                deviceId,
                deviceType,
                deviceName,
                reading: item,
              })
            }
          />
        )}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

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

const s = StyleSheet.create({
  root: { flex: 1 },
  list: { padding: Spacing.lg, paddingTop: Spacing.sm },

  // Device info card
  infoCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  infoAccent: { height: 4 },
  infoTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: Spacing.md,
  },
  infoIconWrap: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoName: { fontSize: 17, fontWeight: '800' },
  infoType: { fontSize: 12, fontWeight: '700', marginTop: 2 },
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

  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  infoCell: { width: '50%', paddingVertical: 6, paddingRight: 8 },
  infoCellLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  infoCellValue: { fontSize: 13, fontWeight: '700' },

  // Section header
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

  // Column header
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

  // Reading row
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
  rowId: { fontSize: 10, fontWeight: '600' },
  rowArea: { fontSize: 12, fontWeight: '700', marginBottom: 1 },
  rowTag: { fontSize: 10 },
  colsWrap: { flex: 1, flexDirection: 'row' },
  colItem: { flex: 1, alignItems: 'center' },
  colLbl: { fontSize: 9, fontWeight: '600', marginBottom: 2 },
  colVal: { fontSize: 11, fontWeight: '800' },
  rowRight: { alignItems: 'flex-end', width: 62, flexShrink: 0 },
  rowDate: { fontSize: 10, fontWeight: '600' },
  rowTime: { fontSize: 9 },

  // Pagination
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

  // Error bar
  errorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: Radius.sm,
    margin: Spacing.md,
    padding: Spacing.sm,
  },

  empty: { alignItems: 'center', paddingVertical: Spacing.xl },
  emptyTitle: { fontSize: 15, fontWeight: '700', marginTop: 12 },
  emptySub: { fontSize: 12, marginTop: 6, textAlign: 'center' },
});
