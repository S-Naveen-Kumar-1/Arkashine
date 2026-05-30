// src/screens/soilpartner/FarmerDetailScreen.jsx

import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { Spacing, Radius, Shadow } from '../theme';
import useTheme from '../hooks/useTheme';
import { TopBar } from '../components/common';
import {
  fetchFarmerDetail,
  updateFarmerStatus,
  uploadFarmerImage,
  updateFarmerDetails,
  deleteFarmerImage,
  fetchFarmerApiCalls,
  resetUpdateStatus,
  resetUploadImage,
  resetUpdateFarmer,
  resetDeleteImage,
  resetFarmerApiCalls,
} from '../redux/actions/soilPartnerActions';
import { showMessage } from 'react-native-flash-message';

const PRIMARY = '#16A34A';

const STATUS_ORDER = [
  {
    key: 'registered',
    label: 'Registered',
    color: '#2563EB',
    icon: 'account-check-outline',
  },
  {
    key: 're_registered',
    label: 'Re-Registered',
    color: '#7C3AED',
    icon: 'account-reactivate-outline',
  },
  {
    key: 'sample_collected',
    label: 'Sample Collected',
    color: '#0891B2',
    icon: 'test-tube',
  },
  {
    key: 'testing_done',
    label: 'Testing Done',
    color: '#D97706',
    icon: 'flask-check-outline',
  },
  {
    key: 'report_delivered',
    label: 'Report Delivered',
    color: '#16A34A',
    icon: 'file-check-outline',
  },
];

const SEASONS = [
  { value: 'kharif', label: 'Kharif' },
  { value: 'rabi', label: 'Rabi' },
  { value: 'zaid', label: 'Zaid' },
];

function statusMeta(key) {
  return (
    STATUS_ORDER.find(s => s.key === key) ?? {
      key,
      label: key ?? '—',
      color: '#94A3B8',
      icon: 'help-circle-outline',
    }
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, color, size = 72, imageUri }) {
  const initials = (name ?? 'F')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  if (imageUri) {
    return (
      <Image
        source={{ uri: imageUri }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2,
          borderColor: color + '60',
        }}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color + '20',
        borderColor: color + '50',
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color, fontSize: size * 0.34, fontWeight: '800' }}>
        {initials}
      </Text>
    </View>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────
function Section({ title, icon, color = PRIMARY, children, T, rightAction }) {
  return (
    <View
      style={[
        sc.card,
        { backgroundColor: T.card, borderColor: T.border ?? T.cardBorder },
      ]}
    >
      <View
        style={[sc.header, { borderBottomColor: T.border ?? T.cardBorder }]}
      >
        <View style={[sc.iconWrap, { backgroundColor: color + '20' }]}>
          <Icon name={icon} size={14} color={color} />
        </View>
        <Text style={[sc.title, { color: T.text }]}>{title}</Text>
        {rightAction}
      </View>
      <View style={sc.body}>{children}</View>
    </View>
  );
}
const sc = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: Spacing.md,
    paddingVertical: 11,
    borderBottomWidth: 0.5,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    flex: 1,
  },
  body: { padding: Spacing.md },
});

// ─── Info row ─────────────────────────────────────────────────────────────────
function InfoRow({ label, value, last, T, icon }) {
  return (
    <View
      style={[
        ir.row,
        !last && {
          borderBottomColor: (T.border ?? T.cardBorder) + '80',
          borderBottomWidth: 0.5,
        },
      ]}
    >
      <View style={ir.left}>
        {icon && (
          <Icon
            name={icon}
            size={12}
            color={T.muted}
            style={{ marginRight: 4 }}
          />
        )}
        <Text style={[ir.label, { color: T.muted }]}>{label}</Text>
      </View>
      <Text style={[ir.value, { color: T.text }]} numberOfLines={2}>
        {value ?? '—'}
      </Text>
    </View>
  );
}
const ir = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11 },
  left: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  label: { fontSize: 12 },
  value: { flex: 1.2, fontSize: 13, fontWeight: '700', textAlign: 'right' },
});

// ─── Status Timeline ──────────────────────────────────────────────────────────
function StatusTimeline({ history, T }) {
  if (!history || history.length === 0) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: Spacing.md }}>
        <Icon
          name="clock-outline"
          size={28}
          color={T.muted}
          style={{ opacity: 0.4 }}
        />
        <Text style={{ color: T.muted, fontSize: 13, marginTop: 8 }}>
          No history recorded
        </Text>
      </View>
    );
  }
  const sorted = [...history].reverse();
  return (
    <View>
      {sorted.map((item, i) => {
        const meta = statusMeta(item.status ?? item.status_display);
        const isLast = i === sorted.length - 1;
        const ts = item.created_at ?? item.timestamp;
        return (
          <View key={i} style={tl.row}>
            <View style={tl.lineCol}>
              <View style={[tl.dot, { backgroundColor: meta.color }]}>
                <Icon name={meta.icon} size={11} color="#fff" />
              </View>
              {!isLast && (
                <View
                  style={[
                    tl.line,
                    { backgroundColor: (T.border ?? '#E2E8F0') + '80' },
                  ]}
                />
              )}
            </View>
            <View style={[tl.content, !isLast && { paddingBottom: 20 }]}>
              <View style={tl.topRow}>
                <Text style={[tl.status, { color: meta.color }]}>
                  {meta.label}
                </Text>
                <View
                  style={[tl.badge, { backgroundColor: meta.color + '15' }]}
                >
                  <View
                    style={[tl.badgeDot, { backgroundColor: meta.color }]}
                  />
                </View>
              </View>
              {ts && (
                <Text style={[tl.date, { color: T.muted }]}>
                  {new Date(ts).toLocaleString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              )}
              {item.note && (
                <Text
                  style={[tl.note, { color: T.text, backgroundColor: T.bg }]}
                >
                  {item.note}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}
const tl = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  lineCol: { alignItems: 'center', width: 30 },
  dot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: { flex: 1, width: 2, marginTop: 4, minHeight: 16 },
  content: { flex: 1 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  status: { fontSize: 14, fontWeight: '800' },
  badge: { width: 8, height: 8, borderRadius: 4 },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  date: { fontSize: 11 },
  note: { fontSize: 12, marginTop: 4, padding: 8, borderRadius: 6 },
});

// ─── Status Picker Modal ──────────────────────────────────────────────────────
function StatusPickerModal({
  visible,
  currentStatus,
  onSelect,
  onClose,
  loading,
  T,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={spm.overlay}>
        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={onClose}
          activeOpacity={1}
        />
        <View style={[spm.sheet, { backgroundColor: T.card }]}>
          <View
            style={[spm.handle, { backgroundColor: T.border ?? '#E2E8F0' }]}
          />
          <Text style={[spm.title, { color: T.text }]}>Update Status</Text>
          <Text style={[spm.sub, { color: T.muted }]}>
            Select the new status for this farmer
          </Text>
          <View style={spm.list}>
            {STATUS_ORDER.map(s => {
              const active = currentStatus === s.key;
              return (
                <TouchableOpacity
                  key={s.key}
                  style={[
                    spm.option,
                    {
                      borderColor: active
                        ? s.color
                        : (T.border ?? '#E2E8F0') + '80',
                      backgroundColor: active ? s.color + '12' : 'transparent',
                    },
                  ]}
                  onPress={() => onSelect(s.key)}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      spm.optIco,
                      { backgroundColor: active ? s.color : s.color + '20' },
                    ]}
                  >
                    <Icon
                      name={s.icon}
                      size={16}
                      color={active ? '#fff' : s.color}
                    />
                  </View>
                  <Text
                    style={[
                      spm.optLabel,
                      {
                        color: active ? s.color : T.text,
                        fontWeight: active ? '800' : '600',
                      },
                    ]}
                  >
                    {s.label}
                  </Text>
                  {loading && active ? (
                    <ActivityIndicator size="small" color={s.color} />
                  ) : active ? (
                    <Icon name="check-circle" size={18} color={s.color} />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity
            style={[spm.cancelBtn, { borderColor: T.border ?? '#E2E8F0' }]}
            onPress={onClose}
            disabled={loading}
          >
            <Text style={[spm.cancelTxt, { color: T.muted }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
const spm = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.lg,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: '900', marginBottom: 4 },
  sub: { fontSize: 12, marginBottom: 20 },
  list: { gap: 10 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    padding: 14,
  },
  optIco: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optLabel: { flex: 1, fontSize: 14 },
  cancelBtn: {
    marginTop: 16,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
  },
  cancelTxt: { fontSize: 14, fontWeight: '700' },
});

// ─── Edit Farmer Modal ────────────────────────────────────────────────────────
function EditFarmerModal({ visible, farmer, onSave, onClose, loading, T }) {
  const [form, setForm] = useState({});

  useEffect(() => {
    if (farmer && visible) {
      setForm({
        farmer_name: farmer.farmer_name ?? '',
        phone: farmer.phone ?? '',
        mobile: farmer.mobile ?? '',
        email: farmer.email ?? '',
        state: farmer.state ?? '',
        district: farmer.district ?? '',
        village: farmer.village ?? '',
        land_area: farmer.land_area ? String(farmer.land_area) : '',
        crop: farmer.crop ?? '',
        season: farmer.season ?? '',
      });
    }
  }, [farmer, visible]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const InputField = ({ label, field, keyboard = 'default', ...rest }) => (
    <View style={ef.group}>
      <Text style={[ef.label, { color: T.muted }]}>{label}</Text>
      <TextInput
        style={[
          ef.input,
          {
            backgroundColor: T.bg,
            color: T.text,
            borderColor: T.border ?? '#E2E8F0',
          },
        ]}
        value={form[field]}
        onChangeText={v => set(field, v)}
        keyboardType={keyboard}
        placeholderTextColor={T.muted}
        {...rest}
      />
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          <View style={[ef.sheet, { backgroundColor: T.card }]}>
            <View
              style={[ef.handle, { backgroundColor: T.border ?? '#E2E8F0' }]}
            />
            <View style={ef.sheetHeader}>
              <Text style={[ef.sheetTitle, { color: T.text }]}>
                Edit Farmer
              </Text>
              <TouchableOpacity onPress={onClose} disabled={loading}>
                <Icon name="close" size={22} color={T.muted} />
              </TouchableOpacity>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <InputField
                    label="Name"
                    field="farmer_name"
                    autoCapitalize="words"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <InputField
                    label="Phone"
                    field="phone"
                    keyboard="phone-pad"
                  />
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <InputField
                    label="Mobile"
                    field="mobile"
                    keyboard="phone-pad"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <InputField
                    label="Email"
                    field="email"
                    keyboard="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <InputField label="State" field="state" />
                </View>
                <View style={{ flex: 1 }}>
                  <InputField label="District" field="district" />
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <InputField label="Village" field="village" />
                </View>
                <View style={{ flex: 1 }}>
                  <InputField
                    label="Land (acres)"
                    field="land_area"
                    keyboard="decimal-pad"
                  />
                </View>
              </View>
              <InputField label="Crop" field="crop" autoCapitalize="words" />
              <Text style={[ef.label, { color: T.muted }]}>Season</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {SEASONS.map(s => {
                  const active = form.season === s.value;
                  return (
                    <TouchableOpacity
                      key={s.value}
                      style={[
                        ef.seasonBtn,
                        {
                          backgroundColor: active ? PRIMARY : 'transparent',
                          borderColor: active ? PRIMARY : T.border ?? '#E2E8F0',
                        },
                      ]}
                      onPress={() => set('season', s.value)}
                    >
                      <Text
                        style={{
                          color: active ? '#fff' : T.text,
                          fontWeight: '700',
                          fontSize: 13,
                        }}
                      >
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
            <TouchableOpacity
              style={[
                ef.saveBtn,
                { backgroundColor: loading ? PRIMARY + '80' : PRIMARY },
              ]}
              onPress={() => onSave(form)}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Icon name="content-save-outline" size={18} color="#fff" />
                  <Text style={ef.saveTxt}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
const ef = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.lg,
    paddingTop: 12,
    maxHeight: '90%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitle: { fontSize: 18, fontWeight: '900' },
  group: { marginBottom: 12 },
  label: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 5,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 13,
  },
  seasonBtn: {
    flex: 1,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: Radius.lg,
    marginTop: 8,
  },
  saveTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
});

// ─── Photo Picker Modal ───────────────────────────────────────────────────────
// Shows: Take Photo | Choose from Gallery | Delete Photo (if image exists)
function PhotoPickerModal({ visible, onPick, onDelete, onClose, hasImage, T }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
        }}
        onPress={onClose}
        activeOpacity={1}
      >
        <View style={[pp.box, { backgroundColor: T.card }]}>
          <Text style={[pp.title, { color: T.text }]}>Update Photo</Text>

          <TouchableOpacity
            style={[pp.btn, { borderColor: T.border ?? '#E2E8F0' }]}
            onPress={() => onPick('camera')}
          >
            <View style={[pp.btnIco, { backgroundColor: PRIMARY + '15' }]}>
              <Icon name="camera-outline" size={20} color={PRIMARY} />
            </View>
            <Text style={[pp.btnTxt, { color: T.text }]}>Take Photo</Text>
            <Icon name="chevron-right" size={16} color={T.muted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[pp.btn, { borderColor: T.border ?? '#E2E8F0' }]}
            onPress={() => onPick('gallery')}
          >
            <View style={[pp.btnIco, { backgroundColor: '#7C3AED15' }]}>
              <Icon name="image-multiple-outline" size={20} color="#7C3AED" />
            </View>
            <Text style={[pp.btnTxt, { color: T.text }]}>
              Choose from Gallery
            </Text>
            <Icon name="chevron-right" size={16} color={T.muted} />
          </TouchableOpacity>

          {/* Delete photo — only shown if a photo exists */}
          {hasImage && (
            <TouchableOpacity
              style={[
                pp.btn,
                { borderColor: '#EF444430', backgroundColor: '#EF444408' },
              ]}
              onPress={onDelete}
            >
              <View style={[pp.btnIco, { backgroundColor: '#EF444418' }]}>
                <Icon name="trash-can-outline" size={20} color="#EF4444" />
              </View>
              <Text style={[pp.btnTxt, { color: '#EF4444' }]}>
                Delete Photo
              </Text>
              <Icon name="chevron-right" size={16} color="#EF444480" />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={pp.cancelRow} onPress={onClose}>
            <Text style={[pp.cancel, { color: T.muted }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
const pp = StyleSheet.create({
  box: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    width: 300,
    ...Shadow.lg,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 16,
    textAlign: 'center',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  btnIco: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  btnTxt: { flex: 1, fontSize: 14, fontWeight: '700' },
  cancelRow: { alignItems: 'center', paddingTop: 4 },
  cancel: { fontSize: 13, fontWeight: '600' },
});

// ─── Device meta for API readings section ────────────────────────────────────
const DEVICE_COLORS = {
  soilsaathi: '#16A34A',
  ph_bottle: '#2563EB',
  atmo_sense: '#7C3AED',
  soil_life: '#D97706',
  soilsparsh: '#0891B2',
};
const DEVICE_ICONS = {
  soilsaathi: 'flask-outline',
  ph_bottle: 'water-check-outline',
  atmo_sense: 'weather-partly-cloudy',
  soil_life: 'leaf-circle-outline',
  soilsparsh: 'water-check-outline',
};

// ─── Single reading row in the table ─────────────────────────────────────────
function ReadingRow({ reading, colKeys, T, isLast }) {
  return (
    <View
      style={[
        rr.row,
        !isLast && {
          borderBottomColor: (T.border ?? '#E2E8F0') + '60',
          borderBottomWidth: 0.5,
        },
      ]}
    >
      <Text style={[rr.id, { color: T.muted }]}>#{reading.id}</Text>
      {colKeys.map(k => {
        const v = reading[k];
        const display =
          v != null ? String(Number(v).toFixed(v % 1 !== 0 ? 2 : 0)) : '—';
        return (
          <Text
            key={k}
            style={[
              rr.cell,
              { color: v != null && v !== 0 ? T.text : T.muted },
            ]}
            numberOfLines={1}
          >
            {display}
          </Text>
        );
      })}
      <Text style={[rr.date, { color: T.muted }]}>
        {reading.created_at
          ? new Date(reading.created_at).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
            })
          : '—'}
      </Text>
    </View>
  );
}
const rr = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  id: { width: 36, fontSize: 10, fontWeight: '700' },
  cell: { flex: 1, fontSize: 11, fontWeight: '600', textAlign: 'center' },
  date: { width: 52, fontSize: 9, textAlign: 'right' },
});

// ─── Table header ─────────────────────────────────────────────────────────────
function ReadingTableHeader({ colKeys, T }) {
  const labels = {
    field1: 'F1',
    field2: 'F2',
    field3: 'F3',
    field4: 'F4',
    field5: 'F5',
    field6: 'F6',
    field7: 'F7',
    field8: 'F8',
    nitrogen: 'N',
    phosphorous: 'P',
    potassium: 'K',
    ph: 'pH',
    ec: 'EC',
    oc: 'OC',
  };
  return (
    <View
      style={[
        rth.row,
        {
          borderBottomColor: T.border ?? '#E2E8F0',
          backgroundColor: (T.border ?? '#E2E8F0') + '30',
        },
      ]}
    >
      <Text style={[rth.hdr, { width: 36, color: T.muted }]}>ID</Text>
      {colKeys.map(k => (
        <Text key={k} style={[rth.hdr, { flex: 1, color: T.muted }]}>
          {labels[k] ?? k}
        </Text>
      ))}
      <Text
        style={[rth.hdr, { width: 52, textAlign: 'right', color: T.muted }]}
      >
        Date
      </Text>
    </View>
  );
}
const rth = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderRadius: 6,
    gap: 4,
  },
  hdr: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
});

// ─── Per-device reading card ───────────────────────────────────────────────────
function DeviceReadingsCard({ device, T, navigation, farmerId }) {
  const [expanded, setExpanded] = useState(false);
  const color = DEVICE_COLORS[device.device_type] ?? '#6B7280';
  const icon = DEVICE_ICONS[device.device_type] ?? 'devices';

  // Derive column keys from first reading
  const colKeys = useMemo(() => {
    if (!device.readings?.length) return [];
    const first = device.readings[0];
    const fieldKeys = Object.keys(first).filter(
      k =>
        /^field\d+$/.test(k) ||
        ['nitrogen', 'phosphorous', 'potassium', 'ph', 'ec', 'oc'].includes(k),
    );
    // Only include cols that have at least one non-zero value
    return fieldKeys.filter(k =>
      device.readings.some(r => r[k] != null && r[k] !== 0),
    );
  }, [device.readings]);

  return (
    <View
      style={[
        drc.card,
        {
          backgroundColor: T.card,
          borderColor: T.border ?? '#E2E8F0',
          borderLeftColor: color,
          borderLeftWidth: 3,
        },
      ]}
    >
      {/* Header row */}
      <TouchableOpacity
        style={drc.header}
        onPress={() => setExpanded(e => !e)}
        activeOpacity={0.8}
      >
        <View style={[drc.icoWrap, { backgroundColor: color + '18' }]}>
          <Icon name={icon} size={18} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[drc.devName, { color: T.text }]}>
            {device.device_name}
          </Text>
          <Text style={[drc.devType, { color: T.muted }]}>
            {device.device_type?.replace(/_/g, ' ')}
          </Text>
        </View>
        <View
          style={[
            drc.countBadge,
            { backgroundColor: color + '18', borderColor: color + '40' },
          ]}
        >
          <Text style={[drc.countTxt, { color }]}>{device.api_count}</Text>
          <Text style={[drc.countLbl, { color }]}>calls</Text>
        </View>
        <Icon
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={T.muted}
          style={{ marginLeft: 8 }}
        />
      </TouchableOpacity>

      {/* Expanded readings table */}
      {expanded && device.readings?.length > 0 && (
        <View
          style={[
            drc.tableWrap,
            { borderTopColor: (T.border ?? '#E2E8F0') + '60' },
          ]}
        >
          <View style={{ paddingHorizontal: 4 }}>
            <ReadingTableHeader colKeys={colKeys} T={T} />
            {device.readings.map((r, i) => (
              <ReadingRow
                key={r.id}
                reading={r}
                colKeys={colKeys}
                T={T}
                isLast={i === device.readings.length - 1}
              />
            ))}
          </View>
          {device.readings_total_pages > 1 && (
            <Text style={[drc.pageHint, { color: T.muted }]}>
              Page {device.readings_page} of {device.readings_total_pages}
            </Text>
          )}
        </View>
      )}
      {expanded && (!device.readings || device.readings.length === 0) && (
        <View
          style={[
            drc.emptyReadings,
            { borderTopColor: (T.border ?? '#E2E8F0') + '60' },
          ]}
        >
          <Icon
            name="database-off-outline"
            size={24}
            color={T.muted}
            style={{ opacity: 0.4 }}
          />
          <Text style={[drc.emptyTxt, { color: T.muted }]}>
            No readings available
          </Text>
        </View>
      )}
    </View>
  );
}
const drc = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: Spacing.md,
  },
  icoWrap: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  devName: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  devType: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  countBadge: {
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countTxt: { fontSize: 18, fontWeight: '900', lineHeight: 22 },
  countLbl: { fontSize: 9, fontWeight: '600' },
  tableWrap: {
    borderTopWidth: 0.5,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    paddingTop: Spacing.sm,
  },
  pageHint: { fontSize: 10, textAlign: 'center', marginTop: 8 },
  emptyReadings: {
    borderTopWidth: 0.5,
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.md,
  },
  emptyTxt: { fontSize: 12 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function FarmerDetailScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const T = theme.colors;

  const { farmerId, farmer: passedFarmer } = route.params;

  const {
    farmerDetail,
    farmerDetailLoading,
    updateStatusLoading,
    updateStatusSuccess,
    updateStatusError,
    uploadImageLoading,
    uploadImageSuccess,
    deleteImageLoading,
    deleteImageSuccess,
    updateFarmerLoading,
    updateFarmerSuccess,
    updateFarmerError,
    farmerApiCalls,
    farmerApiCallsLoading,
  } = useSelector(s => s.soilPartner ?? {});

  const farmer = farmerDetail ?? passedFarmer;
  const currentMeta = statusMeta(farmer?.status);

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);

  // useRef guards to prevent double-firing
  const statusHandled = useRef(false);
  const imageHandled = useRef(false);
  const deleteHandled = useRef(false);
  const editHandled = useRef(false);

  useEffect(() => {
    if (farmerId) {
      dispatch(fetchFarmerDetail(farmerId));
      dispatch(fetchFarmerApiCalls(farmerId));
    }
  }, [farmerId]);

  // Reset guards when redux clears back to false
  useEffect(() => {
    if (!updateStatusSuccess && !updateStatusError)
      statusHandled.current = false;
  }, [updateStatusSuccess, updateStatusError]);
  useEffect(() => {
    if (!uploadImageSuccess) imageHandled.current = false;
  }, [uploadImageSuccess]);
  useEffect(() => {
    if (!deleteImageSuccess) deleteHandled.current = false;
  }, [deleteImageSuccess]);
  useEffect(() => {
    if (!updateFarmerSuccess) editHandled.current = false;
  }, [updateFarmerSuccess]);

  // Status update success
  useEffect(() => {
    if (updateStatusSuccess && !statusHandled.current) {
      statusHandled.current = true;
      showMessage({ message: 'Status updated successfully!', type: 'success' });
      setStatusModalOpen(false);
      dispatch(resetUpdateStatus());
      dispatch(fetchFarmerDetail(farmerId));
    }
  }, [updateStatusSuccess]);

  // Status update error
  useEffect(() => {
    if (updateStatusError) {
      showMessage({
        message:
          typeof updateStatusError === 'string'
            ? updateStatusError
            : 'Status update failed',
        type: 'danger',
      });
      dispatch(resetUpdateStatus());
    }
  }, [updateStatusError]);

  // Image upload success
  useEffect(() => {
    if (uploadImageSuccess && !imageHandled.current) {
      imageHandled.current = true;
      showMessage({ message: 'Photo updated!', type: 'success' });
      setPhotoModalOpen(false);
      dispatch(resetUploadImage());
      dispatch(fetchFarmerDetail(farmerId));
    }
  }, [uploadImageSuccess]);

  // Image delete success
  useEffect(() => {
    if (deleteImageSuccess && !deleteHandled.current) {
      deleteHandled.current = true;
      showMessage({ message: 'Photo removed!', type: 'success' });
      setPhotoModalOpen(false);
      dispatch(resetDeleteImage());
      dispatch(fetchFarmerDetail(farmerId));
    }
  }, [deleteImageSuccess]);

  // Edit success
  useEffect(() => {
    if (updateFarmerSuccess && !editHandled.current) {
      editHandled.current = true;
      showMessage({ message: 'Farmer details updated!', type: 'success' });
      setEditModalOpen(false);
      dispatch(resetUpdateFarmer());
      dispatch(fetchFarmerDetail(farmerId));
    }
  }, [updateFarmerSuccess]);

  // Edit error
  useEffect(() => {
    if (updateFarmerError) {
      const msg =
        typeof updateFarmerError === 'string'
          ? updateFarmerError
          : Object.values(updateFarmerError).flat().join('\n') ||
            'Update failed';
      showMessage({ message: msg, type: 'danger' });
      dispatch(resetUpdateFarmer());
    }
  }, [updateFarmerError]);

  const handleStatusSelect = useCallback(
    status => {
      if (status === farmer?.status) {
        setStatusModalOpen(false);
        return;
      }
      dispatch(updateFarmerStatus(farmerId, status));
    },
    [farmerId, farmer?.status],
  );

  const handlePhotoSelect = useCallback(
    async source => {
      const opts = {
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 800,
        maxHeight: 800,
      };
      try {
        const result =
          source === 'camera'
            ? await launchCamera(opts)
            : await launchImageLibrary(opts);
        if (!result.didCancel && result.assets?.[0]) {
          setPhotoModalOpen(false);
          dispatch(uploadFarmerImage(farmerId, result.assets[0]));
        }
      } catch {
        Alert.alert('Error', 'Could not open camera/gallery');
      }
    },
    [farmerId],
  );

  const handlePhotoDelete = useCallback(() => {
    Alert.alert(
      'Delete Photo',
      "Are you sure you want to remove this farmer's photo?",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setPhotoModalOpen(false);
            dispatch(deleteFarmerImage(farmerId));
          },
        },
      ],
    );
  }, [farmerId]);

  const handleEditSave = useCallback(
    form => {
      const changes = {};
      if (form.farmer_name?.trim())
        changes.farmer_name = form.farmer_name.trim();
      if (form.phone?.trim()) changes.phone = form.phone.trim();
      if (form.mobile?.trim()) changes.mobile = form.mobile.trim();
      if (form.email?.trim()) changes.email = form.email.trim();
      if (form.state?.trim()) changes.state = form.state.trim();
      if (form.district?.trim()) changes.district = form.district.trim();
      if (form.village?.trim()) changes.village = form.village.trim();
      if (form.land_area) changes.land_area = Number(form.land_area);
      if (form.crop?.trim()) changes.crop = form.crop.trim();
      if (form.season) changes.season = form.season;
      dispatch(updateFarmerDetails(farmerId, changes));
    },
    [farmerId],
  );

  const openMap = useCallback(() => {
    if (!farmer?.latitude || !farmer?.longitude) return;
    const lat = farmer.latitude,
      lng = farmer.longitude;
    const url =
      Platform.OS === 'ios'
        ? `maps:0,0?q=${lat},${lng}`
        : `geo:${lat},${lng}?q=${lat},${lng}`;
    Linking.openURL(url).catch(() =>
      Linking.openURL(`https://maps.google.com/?q=${lat},${lng}`),
    );
  }, [farmer]);

  if (farmerDetailLoading && !farmer) {
    return (
      <SafeAreaView style={[s.root, { backgroundColor: T.bg }]}>
        <TopBar
          title="Farmer"
          onBack={() => navigation.goBack()}
          theme={theme}
        />
        <View style={s.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={{ color: T.muted, marginTop: 12 }}>Loading farmer…</Text>
        </View>
      </SafeAreaView>
    );
  }
  if (!farmer) {
    return (
      <SafeAreaView style={[s.root, { backgroundColor: T.bg }]}>
        <TopBar
          title="Farmer"
          onBack={() => navigation.goBack()}
          theme={theme}
        />
        <View style={s.center}>
          <Icon name="alert-circle-outline" size={40} color="#EF4444" />
          <Text style={{ color: T.text, marginTop: 12 }}>
            Could not load farmer
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const hasLocation = !!(farmer.latitude && farmer.longitude);
  const hasImage = !!farmer.farmer_image;
  const imageLoading = uploadImageLoading || deleteImageLoading;
  const statusIdx = STATUS_ORDER.findIndex(st => st.key === farmer.status);

  return (
    <SafeAreaView style={[s.root, { backgroundColor: T.bg }]}>
      <StatusBar
        barStyle={T.statusBar ?? 'dark-content'}
        backgroundColor={T.bg}
      />

      <TopBar
        title={farmer.farmer_name}
        subtitle={`${farmer.village}, ${farmer.district}`}
        onBack={() => navigation.goBack()}
        theme={theme}
      />

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero card ─────────────────────────────────────── */}
        <View
          style={[
            s.heroCard,
            { backgroundColor: T.card, borderColor: T.border ?? T.cardBorder },
          ]}
        >
          <View style={[s.heroBar, { backgroundColor: currentMeta.color }]} />

          <View style={s.heroBody}>
            {/* Avatar + action buttons */}
            <View style={s.avatarWrap}>
              {imageLoading ? (
                <View
                  style={[
                    s.avatarLoader,
                    { backgroundColor: currentMeta.color + '20' },
                  ]}
                >
                  <ActivityIndicator color={currentMeta.color} />
                </View>
              ) : (
                <Avatar
                  name={farmer.farmer_name}
                  color={currentMeta.color}
                  size={76}
                  imageUri={farmer.farmer_image}
                />
              )}

              {/* Camera button */}
              <TouchableOpacity
                style={[
                  s.cameraBtn,
                  {
                    backgroundColor: T.card,
                    borderColor: T.border ?? '#E2E8F0',
                  },
                ]}
                onPress={() => setPhotoModalOpen(true)}
                disabled={imageLoading}
              >
                <Icon name="camera-plus-outline" size={12} color={T.muted} />
              </TouchableOpacity>

              {/* Delete button — only shown when image exists */}
              {hasImage && !imageLoading && (
                <TouchableOpacity
                  style={[
                    s.deleteBtn,
                    { backgroundColor: '#EF444418', borderColor: '#EF444440' },
                  ]}
                  onPress={handlePhotoDelete}
                >
                  <Icon name="trash-can-outline" size={11} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>

            {/* Info */}
            <View style={s.heroInfo}>
              <View style={s.heroNameRow}>
                <Text style={[s.heroName, { color: T.text }]}>
                  {farmer.farmer_name}
                </Text>
                <TouchableOpacity
                  style={[
                    s.editIconBtn,
                    {
                      backgroundColor: PRIMARY + '15',
                      borderColor: PRIMARY + '40',
                    },
                  ]}
                  onPress={() => setEditModalOpen(true)}
                >
                  <Icon name="pencil-outline" size={14} color={PRIMARY} />
                </TouchableOpacity>
              </View>
              <Text style={[s.heroSub, { color: T.muted }]}>
                {[farmer.village, farmer.district, farmer.state]
                  .filter(Boolean)
                  .join(', ')}
              </Text>
              <View style={s.chipRow}>
                <View
                  style={[
                    s.chip,
                    {
                      backgroundColor: currentMeta.color + '15',
                      borderColor: currentMeta.color + '40',
                    },
                  ]}
                >
                  <View
                    style={[s.chipDot, { backgroundColor: currentMeta.color }]}
                  />
                  <Text style={[s.chipTxt, { color: currentMeta.color }]}>
                    {currentMeta.label}
                  </Text>
                </View>
                {farmer.crop ? (
                  <View
                    style={[
                      s.chip,
                      {
                        backgroundColor: PRIMARY + '12',
                        borderColor: PRIMARY + '30',
                      },
                    ]}
                  >
                    <Icon name="sprout-outline" size={9} color={PRIMARY} />
                    <Text style={[s.chipTxt, { color: PRIMARY }]}>
                      {farmer.crop}
                    </Text>
                  </View>
                ) : null}
                {farmer.land_area ? (
                  <View
                    style={[
                      s.chip,
                      {
                        backgroundColor: '#F59E0B12',
                        borderColor: '#F59E0B30',
                      },
                    ]}
                  >
                    <Icon name="map-outline" size={9} color="#F59E0B" />
                    <Text style={[s.chipTxt, { color: '#F59E0B' }]}>
                      {farmer.land_area} ac
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          {/* Stats strip */}
          <View
            style={[
              s.heroStats,
              { borderTopColor: (T.border ?? '#E2E8F0') + '60' },
            ]}
          >
            <View style={s.heroStat}>
              <Icon name="phone-outline" size={13} color={T.muted} />
              <Text style={[s.heroStatTxt, { color: T.text }]}>
                {farmer.phone ?? '—'}
              </Text>
            </View>
            <View
              style={[
                s.heroStatDiv,
                { backgroundColor: T.border ?? '#E2E8F0' },
              ]}
            />
            <View style={s.heroStat}>
              <Icon name="calendar-outline" size={13} color={T.muted} />
              <Text style={[s.heroStatTxt, { color: T.text }]}>
                {farmer.created_at
                  ? new Date(farmer.created_at).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })
                  : '—'}
              </Text>
            </View>
            {hasLocation && (
              <>
                <View
                  style={[
                    s.heroStatDiv,
                    { backgroundColor: T.border ?? '#E2E8F0' },
                  ]}
                />
                <TouchableOpacity style={s.heroStat} onPress={openMap}>
                  <Icon name="map-marker-outline" size={13} color="#0891B2" />
                  <Text style={[s.heroStatTxt, { color: '#0891B2' }]}>
                    View map
                  </Text>
                  <Icon name="open-in-new" size={10} color="#0891B2" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* ── Current Status ─────────────────────────────────── */}
        <Section
          title="Current Status"
          icon="list-status"
          color={currentMeta.color}
          T={T}
          rightAction={
            <TouchableOpacity
              style={[
                s.editStatusBtn,
                {
                  backgroundColor: currentMeta.color + '15',
                  borderColor: currentMeta.color + '40',
                },
              ]}
              onPress={() => setStatusModalOpen(true)}
              disabled={updateStatusLoading}
            >
              {updateStatusLoading ? (
                <ActivityIndicator
                  size="small"
                  color={currentMeta.color}
                  style={{ marginRight: 4 }}
                />
              ) : (
                <Icon
                  name="pencil-outline"
                  size={13}
                  color={currentMeta.color}
                />
              )}
              <Text style={[s.editStatusTxt, { color: currentMeta.color }]}>
                {updateStatusLoading ? 'Saving…' : 'Change'}
              </Text>
            </TouchableOpacity>
          }
        >
          <View style={s.progressWrap}>
            {STATUS_ORDER.map((st, i) => {
              const done = i <= statusIdx;
              const active = i === statusIdx;
              const isLast = i === STATUS_ORDER.length - 1;
              return (
                <View key={st.key} style={s.progressItem}>
                  {!isLast && (
                    <View
                      style={[
                        s.progressLine,
                        {
                          backgroundColor:
                            i < statusIdx
                              ? STATUS_ORDER[i].color
                              : T.border ?? '#E2E8F0',
                        },
                      ]}
                    />
                  )}
                  <View
                    style={[
                      s.progressDot,
                      {
                        backgroundColor: done
                          ? st.color
                          : T.border ?? '#E2E8F0',
                        borderColor: done ? st.color : T.border ?? '#E2E8F0',
                      },
                    ]}
                  >
                    {done ? (
                      <Icon
                        name={active ? st.icon : 'check'}
                        size={active ? 11 : 10}
                        color="#fff"
                      />
                    ) : null}
                  </View>
                  <Text
                    style={[
                      s.progressLabel,
                      {
                        color: done ? st.color : T.muted,
                        fontWeight: active ? '800' : '500',
                      },
                    ]}
                    numberOfLines={2}
                  >
                    {st.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </Section>

        {/* ── Status history ─────────────────────────────────── */}
        <Section title="Status History" icon="history" color="#7C3AED" T={T}>
          <StatusTimeline history={farmer.status_history ?? []} T={T} />
        </Section>

        {/* ── Basic information ──────────────────────────────── */}
        <Section
          title="Basic Information"
          icon="account-outline"
          color="#2563EB"
          T={T}
        >
          <InfoRow
            label="Phone"
            value={farmer.phone}
            icon="phone-outline"
            T={T}
          />
          <InfoRow
            label="Mobile"
            value={farmer.mobile || '—'}
            icon="cellphone"
            T={T}
          />
          <InfoRow
            label="Email"
            value={farmer.email}
            icon="email-outline"
            T={T}
          />
          <InfoRow
            label="Aadhaar"
            value={farmer.aadhaar_number}
            icon="card-account-details-outline"
            T={T}
          />
          <InfoRow
            label="Soil Partner"
            value={
              farmer.soil_partner_name ??
              farmer.soil_partner?.full_name ??
              farmer.soil_partner?.username ??
              '—'
            }
            icon="account-tie-outline"
            T={T}
          />
          <InfoRow
            label="Registered"
            value={
              farmer.created_at
                ? new Date(farmer.created_at).toLocaleString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '—'
            }
            icon="clock-check-outline"
            T={T}
            last
          />
        </Section>

        {/* ── Location ───────────────────────────────────────── */}
        <Section
          title="Location"
          icon="map-marker-outline"
          color="#0891B2"
          T={T}
          rightAction={
            hasLocation ? (
              <TouchableOpacity
                style={[
                  s.mapBtn,
                  { backgroundColor: '#0891B215', borderColor: '#0891B240' },
                ]}
                onPress={openMap}
              >
                <Icon name="map-outline" size={13} color="#0891B2" />
                <Text style={[s.mapBtnTxt, { color: '#0891B2' }]}>
                  Open Map
                </Text>
              </TouchableOpacity>
            ) : null
          }
        >
          <InfoRow label="State" value={farmer.state} icon="earth" T={T} />
          <InfoRow
            label="District"
            value={farmer.district}
            icon="map-marker-radius-outline"
            T={T}
          />
          <InfoRow
            label="Village"
            value={farmer.village}
            icon="home-outline"
            T={T}
          />
          <InfoRow
            label="Coordinates"
            value={
              hasLocation
                ? `${Number(farmer.latitude).toFixed(5)}, ${Number(
                    farmer.longitude,
                  ).toFixed(5)}`
                : '—'
            }
            icon="crosshairs-gps"
            T={T}
            last
          />
        </Section>

        {/* ── Agriculture ────────────────────────────────────── */}
        <Section
          title="Agriculture"
          icon="sprout-outline"
          color="#D97706"
          T={T}
        >
          <InfoRow
            label="Land Area"
            value={farmer.land_area ? `${farmer.land_area} acres` : '—'}
            icon="texture-box"
            T={T}
          />
          <InfoRow label="Crop" value={farmer.crop} icon="barley" T={T} />
          <InfoRow
            label="Season"
            value={farmer.season_display ?? farmer.season}
            icon="weather-partly-cloudy"
            T={T}
            last
          />
        </Section>

        {/* ── API Readings ────────────────────────────────────── */}
        <View
          style={[
            s.apiSection,
            { backgroundColor: T.card, borderColor: T.border ?? T.cardBorder },
          ]}
        >
          <View
            style={[
              s.apiHeader,
              {
                borderBottomColor: T.border ?? T.cardBorder,
                backgroundColor: '#1D4ED810',
              },
            ]}
          >
            <View style={s.apiHeaderLeft}>
              <View style={[s.apiHdrIco, { backgroundColor: '#1D4ED820' }]}>
                <Icon name="api" size={15} color="#1D4ED8" />
              </View>
              <Text style={[s.apiHdrTitle, { color: T.text }]}>
                API READINGS
              </Text>
            </View>
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              {farmerApiCalls && (
                <View style={[s.apiTotalBadge, { backgroundColor: '#1D4ED8' }]}>
                  <Text style={s.apiTotalTxt}>
                    {farmerApiCalls.total_api_calls} total
                  </Text>
                </View>
              )}
              {farmerApiCallsLoading && (
                <ActivityIndicator size="small" color="#1D4ED8" />
              )}
            </View>
          </View>

          <View style={s.apiBody}>
            {farmerApiCallsLoading && !farmerApiCalls ? (
              <View style={s.apiLoading}>
                <ActivityIndicator color="#1D4ED8" />
                <Text style={[s.apiLoadingTxt, { color: T.muted }]}>
                  Loading API calls…
                </Text>
              </View>
            ) : !farmerApiCalls || farmerApiCalls.devices?.length === 0 ? (
              <View style={s.apiEmpty}>
                <Icon
                  name="database-off-outline"
                  size={36}
                  color={T.muted}
                  style={{ opacity: 0.3 }}
                />
                <Text style={[s.apiEmptyTxt, { color: T.muted }]}>
                  No API readings linked to this farmer yet
                </Text>
              </View>
            ) : (
              farmerApiCalls.devices.map(device => (
                <DeviceReadingsCard
                  key={device.device_id}
                  device={device}
                  T={T}
                  navigation={navigation}
                  farmerId={farmerId}
                />
              ))
            )}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modals */}
      <StatusPickerModal
        visible={statusModalOpen}
        currentStatus={farmer.status}
        onSelect={handleStatusSelect}
        onClose={() => !updateStatusLoading && setStatusModalOpen(false)}
        loading={updateStatusLoading}
        T={T}
      />
      <EditFarmerModal
        visible={editModalOpen}
        farmer={farmer}
        onSave={handleEditSave}
        onClose={() => !updateFarmerLoading && setEditModalOpen(false)}
        loading={updateFarmerLoading}
        T={T}
      />
      <PhotoPickerModal
        visible={photoModalOpen}
        onPick={handlePhotoSelect}
        onDelete={handlePhotoDelete}
        onClose={() => setPhotoModalOpen(false)}
        hasImage={hasImage}
        T={T}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: Spacing.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },

  heroCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  heroBar: { height: 5 },
  heroBody: {
    flexDirection: 'row',
    gap: 14,
    padding: Spacing.md,
    alignItems: 'flex-start',
  },
  avatarWrap: { position: 'relative' },
  avatarLoader: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Camera button — bottom right of avatar
  cameraBtn: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Delete button — top right of avatar, red
  deleteBtn: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroInfo: { flex: 1 },
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  heroName: { fontSize: 19, fontWeight: '900', flex: 1 },
  editIconBtn: {
    width: 30,
    height: 30,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroSub: { fontSize: 12, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipDot: { width: 5, height: 5, borderRadius: 3 },
  chipTxt: { fontSize: 10, fontWeight: '700' },
  heroStats: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  heroStat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  heroStatTxt: { fontSize: 11, fontWeight: '600' },
  heroStatDiv: { width: 1, height: 20, alignSelf: 'center' },

  editStatusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  editStatusTxt: { fontSize: 11, fontWeight: '700' },

  progressWrap: { flexDirection: 'row', alignItems: 'flex-start' },
  progressItem: { flex: 1, alignItems: 'center', position: 'relative' },
  progressDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    zIndex: 1,
  },
  progressLine: {
    position: 'absolute',
    top: 13,
    left: '50%',
    right: '-50%',
    height: 2,
  },
  progressLabel: { fontSize: 9, textAlign: 'center', lineHeight: 12 },

  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  mapBtnTxt: { fontSize: 11, fontWeight: '700' },

  // API readings section
  apiSection: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  apiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    paddingVertical: 11,
    borderBottomWidth: 0.5,
  },
  apiHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  apiHdrIco: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  apiHdrTitle: { fontSize: 13, fontWeight: '800', letterSpacing: 0.6 },
  apiTotalBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  apiTotalTxt: { color: '#fff', fontSize: 11, fontWeight: '800' },
  apiBody: { padding: Spacing.md },
  apiLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: Spacing.md,
  },
  apiLoadingTxt: { fontSize: 13 },
  apiEmpty: { alignItems: 'center', gap: 8, paddingVertical: Spacing.xl },
  apiEmptyTxt: { fontSize: 13, textAlign: 'center', maxWidth: 220 },
});
