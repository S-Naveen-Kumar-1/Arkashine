// src/screens/soilpartner/AddFarmerScreen.jsx

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  Modal,
  PermissionsAndroid,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import Geolocation from '@react-native-community/geolocation';
import { Spacing, Radius, Shadow } from '../theme';
import useTheme from '../hooks/useTheme';
import { TopBar } from '../components/common';
import {
  addFarmer,
  resetAddFarmer,
  checkAadhaar,
  resetCheckAadhaar,
  updateFarmerStatus,
  resetUpdateStatus,
} from '../redux/actions/soilPartnerActions';
import { showMessage } from 'react-native-flash-message';

// ─── All Indian States + UTs ──────────────────────────────────────────────────
const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  // Union Territories
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];

const SEASONS = [
  { value: 'kharif', label: 'Kharif', icon: 'weather-rainy' },
  { value: 'rabi', label: 'Rabi', icon: 'snowflake' },
  { value: 'zaid', label: 'Zaid', icon: 'weather-sunny' },
];

const PRIMARY = '#16A34A';

// ─── Permission helper ────────────────────────────────────────────────────────
async function requestAndroidPermission(type) {
  try {
    if (Platform.OS !== 'android') return true;
    if (type === 'camera') {
      const g = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message: 'Needed to take a farmer photo.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Deny',
          buttonPositive: 'Allow',
        },
      );
      return g === PermissionsAndroid.RESULTS.GRANTED;
    }
    if (type === 'gallery') {
      const perm =
        parseInt(Platform.Version, 10) >= 33
          ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
          : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
      if (await PermissionsAndroid.check(perm)) return true;
      const g = await PermissionsAndroid.request(perm, {
        title: 'Gallery Permission',
        message: 'Needed to choose a farmer photo.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Deny',
        buttonPositive: 'Allow',
      });
      return g === PermissionsAndroid.RESULTS.GRANTED;
    }
    if (type === 'location') {
      const g = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'Needed to auto-fill coordinates.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Deny',
          buttonPositive: 'Allow',
        },
      );
      return g === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  } catch (err) {
    console.warn('Permission error:', err);
    return false;
  }
}

// ─── Photo picker ─────────────────────────────────────────────────────────────
async function pickPhoto(source) {
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
      return result.assets[0];
    }

    return null;
  } catch (error) {
    console.log('Image Picker Error:', error);
    Alert.alert('Error', 'Could not open camera/gallery');
    return null;
  }
}

// ─── FieldLabel ───────────────────────────────────────────────────────────────
function FieldLabel({ label, required, T }) {
  return (
    <Text style={[fl.label, { color: T.muted }]}>
      {label}
      {required && <Text style={{ color: '#EF4444' }}> *</Text>}
    </Text>
  );
}
const fl = StyleSheet.create({
  label: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});

// ─── Input ────────────────────────────────────────────────────────────────────
function Input({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  T,
  error,
  multiline,
  suffix,
  ...rest
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View
      style={[
        inp.wrap,
        {
          backgroundColor: T.inputBg ?? T.card,
          borderColor: error
            ? '#EF4444'
            : focused
            ? PRIMARY
            : T.cardBorder ?? T.border ?? '#E2E8F0',
          borderWidth: focused ? 2 : 1,
        },
      ]}
    >
      <TextInput
        style={[
          inp.input,
          { color: T.text },
          multiline && { height: 80, textAlignVertical: 'top' },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={T.muted}
        keyboardType={keyboardType ?? 'default'}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        multiline={multiline}
        {...rest}
      />
      {suffix}
    </View>
  );
}
const inp = StyleSheet.create({
  wrap: {
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    minHeight: 46,
  },
  input: { flex: 1, fontSize: 14, paddingVertical: 10 },
});

// ─── SelectButton — tappable field that opens a picker modal ─────────────────
function SelectButton({ value, placeholder, onPress, T, error, icon }) {
  const hasValue = !!value;
  return (
    <TouchableOpacity
      style={[
        sb.wrap,
        {
          backgroundColor: T.inputBg ?? T.card,
          borderColor: error
            ? '#EF4444'
            : T.cardBorder ?? T.border ?? '#E2E8F0',
        },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {icon && (
        <Icon
          name={icon}
          size={15}
          color={hasValue ? PRIMARY : T.muted}
          style={{ marginRight: 6 }}
        />
      )}
      <Text
        style={[sb.txt, { color: hasValue ? T.text : T.muted, flex: 1 }]}
        numberOfLines={1}
      >
        {value || placeholder}
      </Text>
      <Icon
        name={hasValue ? 'close-circle' : 'chevron-down'}
        size={16}
        color={T.muted}
      />
    </TouchableOpacity>
  );
}
const sb = StyleSheet.create({
  wrap: {
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    minHeight: 46,
    borderWidth: 1,
  },
  txt: { fontSize: 14 },
});

// ─── SearchablePickerModal — generic searchable list modal ───────────────────
function SearchablePickerModal({
  visible,
  title,
  items,
  selected,
  onSelect,
  onClose,
  T,
}) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  // Reset query when opened
  useEffect(() => {
    if (visible) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [visible]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(i => i.toLowerCase().includes(q));
  }, [query, items]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={spm.overlay}>
        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={onClose}
          activeOpacity={1}
        />
        <View style={[spm.sheet, { backgroundColor: T.card }]}>
          {/* Handle */}
          <View
            style={[spm.handle, { backgroundColor: T.border ?? '#E2E8F0' }]}
          />

          {/* Header */}
          <View style={spm.header}>
            <Text style={[spm.title, { color: T.text }]}>{title}</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="close" size={22} color={T.muted} />
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View
            style={[
              spm.searchBar,
              { backgroundColor: T.bg, borderColor: T.border ?? '#E2E8F0' },
            ]}
          >
            <Icon name="magnify" size={18} color={T.muted} />
            <TextInput
              ref={inputRef}
              style={[spm.searchInput, { color: T.text }]}
              placeholder={`Search ${title.toLowerCase()}…`}
              placeholderTextColor={T.muted}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Icon name="close-circle" size={16} color={T.muted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Count */}
          <Text style={[spm.count, { color: T.muted }]}>
            {filtered.length} {filtered.length === 1 ? 'result' : 'results'}
          </Text>

          {/* List */}
          <FlatList
            data={filtered}
            keyExtractor={item => item}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isSelected = item === selected;
              return (
                <TouchableOpacity
                  style={[
                    spm.item,
                    {
                      backgroundColor: isSelected
                        ? PRIMARY + '12'
                        : 'transparent',
                      borderColor: isSelected
                        ? PRIMARY + '40'
                        : (T.border ?? '#E2E8F0') + '60',
                    },
                  ]}
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      spm.itemTxt,
                      {
                        color: isSelected ? PRIMARY : T.text,
                        fontWeight: isSelected ? '800' : '500',
                      },
                    ]}
                  >
                    {item}
                  </Text>
                  {isSelected && (
                    <Icon name="check-circle" size={18} color={PRIMARY} />
                  )}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={spm.empty}>
                <Icon
                  name="magnify-close"
                  size={36}
                  color={T.muted}
                  style={{ opacity: 0.3 }}
                />
                <Text style={[spm.emptyTxt, { color: T.muted }]}>
                  No results for "{query}"
                </Text>
              </View>
            }
          />
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
    paddingTop: 12,
    maxHeight: '82%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: 12,
  },
  title: { fontSize: 18, fontWeight: '900' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 8,
  },
  searchInput: { flex: 1, fontSize: 14 },
  count: { fontSize: 11, paddingHorizontal: Spacing.lg, marginBottom: 4 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 13,
    borderBottomWidth: 0.5,
  },
  itemTxt: { fontSize: 15, flex: 1 },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyTxt: { fontSize: 14 },
});

// ─── Card ─────────────────────────────────────────────────────────────────────
function Card({ title, icon, color = PRIMARY, children, T }) {
  return (
    <View
      style={[
        cd.card,
        {
          backgroundColor: T.card,
          borderColor: T.cardBorder ?? T.border ?? '#E2E8F0',
        },
      ]}
    >
      <View
        style={[
          cd.header,
          { borderBottomColor: (T.border ?? '#E2E8F0') + '60' },
        ]}
      >
        <View style={[cd.ico, { backgroundColor: color + '20' }]}>
          <Icon name={icon} size={15} color={color} />
        </View>
        <Text style={[cd.title, { color: T.text }]}>{title}</Text>
      </View>
      <View style={cd.body}>{children}</View>
    </View>
  );
}
const cd = StyleSheet.create({
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
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  ico: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 14, fontWeight: '800' },
  body: { padding: Spacing.md },
});

// ─── Duplicate Aadhaar modal ──────────────────────────────────────────────────
function DuplicateAadhaarModal({
  visible,
  existingFarmer,
  onReRegister,
  onCancel,
  loading,
  T,
}) {
  if (!existingFarmer) return null;
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={dup.overlay}>
        <View style={[dup.box, { backgroundColor: T.card }]}>
          <View style={[dup.iconWrap, { backgroundColor: '#F59E0B18' }]}>
            <Icon name="account-alert-outline" size={32} color="#F59E0B" />
          </View>
          <Text style={[dup.title, { color: T.text }]}>
            Farmer Already Registered
          </Text>
          <Text style={[dup.sub, { color: T.muted }]}>
            A farmer with this Aadhaar is already registered with your account.
          </Text>
          <View
            style={[
              dup.infoBox,
              { backgroundColor: T.bg, borderColor: T.border ?? '#E2E8F0' },
            ]}
          >
            <Text style={[dup.infoName, { color: T.text }]}>
              {existingFarmer.name}
            </Text>
            <Text style={[dup.infoDetail, { color: T.muted }]}>
              {[existingFarmer.village, existingFarmer.phone]
                .filter(Boolean)
                .join(' · ')}
            </Text>
            <View
              style={[
                dup.statusChip,
                { backgroundColor: '#7C3AED18', borderColor: '#7C3AED40' },
              ]}
            >
              <Text style={[dup.statusTxt, { color: '#7C3AED' }]}>
                {existingFarmer.status_display ?? existingFarmer.status}
              </Text>
            </View>
          </View>
          {existingFarmer.reset_hint ? (
            <Text style={[dup.hint, { color: T.muted }]}>
              {existingFarmer.reset_hint}
            </Text>
          ) : null}
          <View
            style={[
              dup.questionBox,
              { backgroundColor: '#2563EB10', borderColor: '#2563EB30' },
            ]}
          >
            <Icon name="help-circle-outline" size={16} color="#2563EB" />
            <Text style={[dup.questionTxt, { color: T.text }]}>
              Do you want to re-register this farmer? Their status will be
              updated to{' '}
              <Text style={{ fontWeight: '900', color: '#7C3AED' }}>
                Re-Registered
              </Text>
              .
            </Text>
          </View>
          <View style={dup.actions}>
            <TouchableOpacity
              style={[dup.cancelBtn, { borderColor: T.border ?? '#E2E8F0' }]}
              onPress={onCancel}
            >
              <Text style={[dup.cancelTxt, { color: T.muted }]}>
                No, Go Back
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                dup.reregBtn,
                { backgroundColor: loading ? '#7C3AED80' : '#7C3AED' },
              ]}
              onPress={onReRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Icon
                    name="account-reactivate-outline"
                    size={16}
                    color="#fff"
                  />
                  <Text style={dup.reregTxt}>Yes, Re-Register</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
const dup = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  box: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    width: '100%',
    alignItems: 'center',
    ...Shadow.lg,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 6,
    textAlign: 'center',
  },
  sub: { fontSize: 13, textAlign: 'center', marginBottom: 14, lineHeight: 18 },
  infoBox: {
    width: '100%',
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    alignItems: 'center',
    gap: 4,
  },
  infoName: { fontSize: 15, fontWeight: '800' },
  infoDetail: { fontSize: 12 },
  statusChip: {
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 4,
  },
  statusTxt: { fontSize: 11, fontWeight: '700' },
  hint: {
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  questionBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  questionTxt: { flex: 1, fontSize: 13, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 10, width: '100%' },
  cancelBtn: {
    flex: 1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingVertical: 13,
    alignItems: 'center',
  },
  cancelTxt: { fontSize: 13, fontWeight: '700' },
  reregBtn: {
    flex: 1,
    borderRadius: Radius.lg,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  reregTxt: { color: '#fff', fontSize: 13, fontWeight: '800' },
});

// ─── Photo picker modal ───────────────────────────────────────────────────────
function PhotoPickerModal({ visible, onPick, onClose, T }) {
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
        <View style={[ppm.box, { backgroundColor: T.card }]}>
          <Text style={[ppm.title, { color: T.text }]}>Add Photo</Text>
          <TouchableOpacity
            style={[ppm.btn, { borderColor: T.border ?? '#E2E8F0' }]}
            onPress={() => onPick('camera')}
          >
            <View style={[ppm.btnIco, { backgroundColor: PRIMARY + '15' }]}>
              <Icon name="camera-outline" size={22} color={PRIMARY} />
            </View>
            <View style={ppm.btnText}>
              <Text style={[ppm.btnTitle, { color: T.text }]}>Take Photo</Text>
              <Text style={[ppm.btnSub, { color: T.muted }]}>
                Use device camera
              </Text>
            </View>
            <Icon name="chevron-right" size={16} color={T.muted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[ppm.btn, { borderColor: T.border ?? '#E2E8F0' }]}
            onPress={() => onPick('gallery')}
          >
            <View style={[ppm.btnIco, { backgroundColor: '#7C3AED15' }]}>
              <Icon name="image-multiple-outline" size={22} color="#7C3AED" />
            </View>
            <View style={ppm.btnText}>
              <Text style={[ppm.btnTitle, { color: T.text }]}>
                Choose from Gallery
              </Text>
              <Text style={[ppm.btnSub, { color: T.muted }]}>
                Browse your photos
              </Text>
            </View>
            <Icon name="chevron-right" size={16} color={T.muted} />
          </TouchableOpacity>
          <TouchableOpacity style={ppm.cancelRow} onPress={onClose}>
            <Text style={[ppm.cancelTxt, { color: T.muted }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
const ppm = StyleSheet.create({
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
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  btnText: { flex: 1 },
  btnTitle: { fontSize: 14, fontWeight: '700' },
  btnSub: { fontSize: 11, marginTop: 1 },
  cancelRow: { alignItems: 'center', paddingTop: 4 },
  cancelTxt: { fontSize: 13, fontWeight: '600' },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function AddFarmerScreen({ navigation }) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const T = theme.colors;

  const {
    addFarmerLoading,
    addFarmerError,
    addFarmerSuccess,
    aadhaarCheck,
    aadhaarCheckLoading,
    updateStatusLoading,
    updateStatusSuccess,
    updateStatusError,
  } = useSelector(s => s.soilPartner ?? {});

  const [form, setForm] = useState({
    farmer_name: '',
    phone: '',
    aadhaar_number: '',
    state: '',
    district: '',
    village: '',
    land_area: '',
    crop: '',
    season: '',
    mobile: '',
    email: '',
    latitude: '',
    longitude: '',
  });
  const [errors, setErrors] = useState({});
  const [photo, setPhoto] = useState(null);
  const [aadhaarDirty, setAadhaarDirty] = useState(false);
  const [dupModalOpen, setDupModalOpen] = useState(false);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [statePickerOpen, setStatePickerOpen] = useState(false);
  const [pickerBusy, setPickerBusy] = useState(false);
  const [locLoading, setLocLoading] = useState(false);
  const aadhaarTimer = useRef(null);
  const reregHandled = useRef(false);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  // ── Side effects ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (addFarmerSuccess) {
      showMessage({
        message: 'Farmer registered successfully!',
        type: 'success',
      });
      dispatch(resetAddFarmer());
      navigation.goBack();
    }
  }, [addFarmerSuccess]);

  useEffect(() => {
    if (addFarmerError) {
      const msg =
        typeof addFarmerError === 'string'
          ? addFarmerError
          : Object.values(addFarmerError).flat().join('\n');
      showMessage({ message: msg, type: 'danger' });
    }
  }, [addFarmerError]);

  useEffect(() => {
    if (aadhaarCheck?.exists && aadhaarDirty) setDupModalOpen(true);
  }, [aadhaarCheck]);

  useEffect(() => {
    if (updateStatusSuccess && dupModalOpen && !reregHandled.current) {
      reregHandled.current = true;
      showMessage({
        message: 'Farmer re-registered successfully!',
        type: 'success',
      });
      dispatch(resetCheckAadhaar());
      dispatch(resetUpdateStatus());
      setDupModalOpen(false);
      navigation.goBack();
    }
  }, [updateStatusSuccess]);

  useEffect(() => {
    if (updateStatusError && dupModalOpen) {
      showMessage({
        message:
          typeof updateStatusError === 'string'
            ? updateStatusError
            : 'Re-registration failed',
        type: 'danger',
      });
      dispatch(resetUpdateStatus());
    }
  }, [updateStatusError]);

  // ── Aadhaar ───────────────────────────────────────────────────────────────
  const handleAadhaarChange = useCallback(val => {
    set('aadhaar_number', val);
    setAadhaarDirty(true);
    reregHandled.current = false;
    const clean = val.replace(/\s/g, '');
    if (aadhaarTimer.current) clearTimeout(aadhaarTimer.current);
    if (clean.length === 12) {
      aadhaarTimer.current = setTimeout(
        () => dispatch(checkAadhaar(clean)),
        500,
      );
    } else {
      dispatch(resetCheckAadhaar());
    }
  }, []);

  // ── Location ──────────────────────────────────────────────────────────────
  const handleUseMyLocation = useCallback(async () => {
    const ok = await requestAndroidPermission('location');
    if (!ok) {
      Alert.alert(
        'Permission Required',
        'Location access denied. Enable in Settings.',
      );
      return;
    }
    setLocLoading(true);
    Geolocation.getCurrentPosition(
      pos => {
        set('latitude', pos.coords.latitude.toFixed(6));
        set('longitude', pos.coords.longitude.toFixed(6));
        setLocLoading(false);
        showMessage({ message: 'Location filled!', type: 'success' });
      },
      err => {
        setLocLoading(false);
        Alert.alert('Location Error', err.message ?? 'Could not get location.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    );
  }, []);

  // ── Photo ─────────────────────────────────────────────────────────────────
  const handlePhotoPick = useCallback(
    async source => {
      if (pickerBusy) return;
      setPickerBusy(true);
      setPhotoModalOpen(false);
      await new Promise(r => setTimeout(r, Platform.OS === 'ios' ? 350 : 150));
      const asset = await pickPhoto(source);
      setPickerBusy(false);
      if (asset) setPhoto(asset);
    },
    [pickerBusy],
  );

  // ── Re-register ───────────────────────────────────────────────────────────
  const handleReRegister = useCallback(() => {
    if (aadhaarCheck?.id) {
      reregHandled.current = false;
      dispatch(updateFarmerStatus(aadhaarCheck.id, 're_registered'));
    }
  }, [aadhaarCheck]);

  const handleDupCancel = () => {
    setDupModalOpen(false);
    dispatch(resetCheckAadhaar());
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.farmer_name.trim()) e.farmer_name = 'Required';
    if (!form.phone.trim()) e.phone = 'Required';
    if (!form.aadhaar_number.trim()) e.aadhaar_number = 'Required';
    else if (form.aadhaar_number.replace(/\s/g, '').length !== 12)
      e.aadhaar_number = 'Must be 12 digits';
    if (!form.state) e.state = 'Select a state';
    if (!form.district.trim()) e.district = 'Required';
    if (!form.village.trim()) e.village = 'Required';
    if (!form.land_area) e.land_area = 'Required';
    else if (isNaN(Number(form.land_area))) e.land_area = 'Must be a number';
    if (!form.crop.trim()) e.crop = 'Required';
    if (!form.season) e.season = 'Select a season';
    if (form.latitude && isNaN(Number(form.latitude)))
      e.latitude = 'Must be a number';
    if (form.longitude && isNaN(Number(form.longitude)))
      e.longitude = 'Must be a number';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (aadhaarCheck?.exists) {
      setDupModalOpen(true);
      return;
    }
    if (!validate()) return;
    const payload = { ...form, land_area: Number(form.land_area) };
    if (form.latitude) payload.latitude = Number(form.latitude);
    if (form.longitude) payload.longitude = Number(form.longitude);
    if (photo)
      payload.farmer_image = {
        uri: photo.uri,
        type: photo.type ?? 'image/jpeg',
        name: photo.fileName ?? `farmer_${Date.now()}.jpg`,
      };
    dispatch(addFarmer(payload));
  };

  const aadhaarSuffix = () => {
    if (form.aadhaar_number.replace(/\s/g, '').length !== 12) return null;
    if (aadhaarCheckLoading)
      return (
        <ActivityIndicator
          size="small"
          color={PRIMARY}
          style={{ marginLeft: 8 }}
        />
      );
    if (aadhaarCheck?.exists)
      return (
        <Icon
          name="alert-circle"
          size={18}
          color="#F59E0B"
          style={{ marginLeft: 8 }}
        />
      );
    if (aadhaarCheck && !aadhaarCheck.exists)
      return (
        <Icon
          name="check-circle"
          size={18}
          color="#16A34A"
          style={{ marginLeft: 8 }}
        />
      );
    return null;
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[s.root, { backgroundColor: T.bg }]}>
      <StatusBar
        barStyle={T.statusBar ?? 'dark-content'}
        backgroundColor={T.bg}
      />
      <TopBar
        title="Register Farmer"
        onBack={() => navigation.goBack()}
        theme={theme}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Photo ──────────────────────────────────────── */}
          <View style={s.photoSection}>
            <TouchableOpacity
              style={[
                s.photoBtn,
                {
                  backgroundColor: T.card,
                  borderColor: T.cardBorder ?? T.border ?? '#E2E8F0',
                },
              ]}
              onPress={() => setPhotoModalOpen(true)}
              disabled={pickerBusy}
            >
              {photo ? (
                <Image source={{ uri: photo.uri }} style={s.photoImg} />
              ) : (
                <View style={s.photoPlaceholder}>
                  <Icon name="camera-plus-outline" size={28} color={T.muted} />
                  <Text style={[s.photoPlaceholderTxt, { color: T.muted }]}>
                    Add Photo
                  </Text>
                </View>
              )}
              {photo && (
                <View style={s.cameraOverlay}>
                  <View
                    style={[
                      s.changeChip,
                      { backgroundColor: 'rgba(0,0,0,0.6)' },
                    ]}
                  >
                    <Icon name="camera-outline" size={11} color="#fff" />
                    <Text style={s.changeChipTxt}>Change</Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
            <View style={s.photoInfo}>
              <Text style={[s.photoTitle, { color: T.text }]}>
                Farmer Photo
              </Text>
              <Text style={[s.photoSub, { color: T.muted }]}>
                Optional · JPG or PNG
              </Text>
              {photo && (
                <TouchableOpacity
                  onPress={() => setPhoto(null)}
                  style={s.removeBtn}
                >
                  <Icon name="close-circle" size={13} color="#EF4444" />
                  <Text style={s.removeTxt}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ── Basic Information ───────────────────────────── */}
          <Card
            title="Basic Information"
            icon="account-outline"
            color={PRIMARY}
            T={T}
          >
            <View style={s.row}>
              <View style={s.col}>
                <FieldLabel label="Full Name" required T={T} />
                <Input
                  value={form.farmer_name}
                  onChangeText={v => set('farmer_name', v)}
                  placeholder="Farmer Name"
                  T={T}
                  error={errors.farmer_name}
                  autoCapitalize="words"
                />
                {errors.farmer_name && (
                  <Text style={s.err}>{errors.farmer_name}</Text>
                )}
              </View>
              <View style={s.col}>
                <FieldLabel label="Phone" required T={T} />
                <Input
                  value={form.phone}
                  onChangeText={v => set('phone', v)}
                  placeholder="10-digit"
                  keyboardType="phone-pad"
                  T={T}
                  error={errors.phone}
                  maxLength={10}
                />
                {errors.phone && <Text style={s.err}>{errors.phone}</Text>}
              </View>
            </View>
            <View style={s.row}>
              <View style={s.col}>
                <FieldLabel label="Secondary Mobile" T={T} />
                <Input
                  value={form.mobile}
                  onChangeText={v => set('mobile', v)}
                  placeholder="Optional"
                  keyboardType="phone-pad"
                  T={T}
                />
              </View>
              <View style={s.col}>
                <FieldLabel label="Email" T={T} />
                <Input
                  value={form.email}
                  onChangeText={v => set('email', v)}
                  placeholder="Optional"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  T={T}
                />
              </View>
            </View>
            <FieldLabel label="Aadhaar Number" required T={T} />
            <Input
              value={form.aadhaar_number}
              onChangeText={handleAadhaarChange}
              placeholder="12-digit Aadhaar"
              keyboardType="number-pad"
              maxLength={12}
              T={T}
              error={
                errors.aadhaar_number ||
                (aadhaarCheck?.exists ? 'duplicate' : null)
              }
              suffix={aadhaarSuffix()}
            />
            {errors.aadhaar_number && (
              <Text style={s.err}>{errors.aadhaar_number}</Text>
            )}
            {aadhaarCheck?.exists && (
              <TouchableOpacity
                style={[
                  s.aadhaarBanner,
                  { backgroundColor: '#F59E0B12', borderColor: '#F59E0B40' },
                ]}
                onPress={() => setDupModalOpen(true)}
              >
                <Icon name="alert-circle-outline" size={14} color="#F59E0B" />
                <Text style={[s.aadhaarBannerTxt, { color: '#F59E0B' }]}>
                  Aadhaar already registered — tap to re-register
                </Text>
                <Icon name="chevron-right" size={14} color="#F59E0B" />
              </TouchableOpacity>
            )}
            {aadhaarCheck && !aadhaarCheck.exists && (
              <View
                style={[
                  s.aadhaarBanner,
                  { backgroundColor: '#16A34A12', borderColor: '#16A34A40' },
                ]}
              >
                <Icon name="check-circle-outline" size={14} color="#16A34A" />
                <Text style={[s.aadhaarBannerTxt, { color: '#16A34A' }]}>
                  Aadhaar is available
                </Text>
              </View>
            )}
          </Card>

          {/* ── Location ────────────────────────────────────── */}
          <Card
            title="Location"
            icon="map-marker-outline"
            color="#2563EB"
            T={T}
          >
            {/* State — searchable picker */}
            <FieldLabel label="State" required T={T} />
            <SelectButton
              value={form.state}
              placeholder="Select state…"
              onPress={() => setStatePickerOpen(true)}
              T={T}
              error={!!errors.state}
              icon="map-outline"
            />
            {/* Clear state chip */}
            {form.state ? (
              <TouchableOpacity
                style={[
                  s.selectedChip,
                  {
                    backgroundColor: PRIMARY + '12',
                    borderColor: PRIMARY + '30',
                  },
                ]}
                onPress={() => setStatePickerOpen(true)}
              >
                <Icon name="map-outline" size={12} color={PRIMARY} />
                <Text style={[s.selectedChipTxt, { color: PRIMARY }]}>
                  {form.state}
                </Text>
                <TouchableOpacity
                  onPress={() => set('state', '')}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Icon name="close-circle" size={14} color={PRIMARY} />
                </TouchableOpacity>
              </TouchableOpacity>
            ) : null}
            {errors.state && (
              <Text style={[s.err, { marginBottom: 8 }]}>{errors.state}</Text>
            )}

            {/* District + Village */}
            <View style={[s.row, { marginTop: 10 }]}>
              <View style={s.col}>
                <FieldLabel label="District" required T={T} />
                <Input
                  value={form.district}
                  onChangeText={v => set('district', v)}
                  placeholder="e.g. Raichur"
                  T={T}
                  error={errors.district}
                />
                {errors.district && (
                  <Text style={s.err}>{errors.district}</Text>
                )}
              </View>
              <View style={s.col}>
                <FieldLabel label="Village" required T={T} />
                <Input
                  value={form.village}
                  onChangeText={v => set('village', v)}
                  placeholder="Village name"
                  T={T}
                  error={errors.village}
                />
                {errors.village && <Text style={s.err}>{errors.village}</Text>}
              </View>
            </View>

            {/* Lat / Lng */}
            <View style={s.row}>
              <View style={s.col}>
                <FieldLabel label="Latitude" T={T} />
                <Input
                  value={form.latitude}
                  onChangeText={v => set('latitude', v)}
                  placeholder="e.g. 18.5204"
                  keyboardType="decimal-pad"
                  T={T}
                  error={errors.latitude}
                  suffix={
                    form.latitude ? (
                      <Icon
                        name="crosshairs-gps"
                        size={14}
                        color="#16A34A"
                        style={{ marginLeft: 4 }}
                      />
                    ) : null
                  }
                />
                {errors.latitude && (
                  <Text style={s.err}>{errors.latitude}</Text>
                )}
              </View>
              <View style={s.col}>
                <FieldLabel label="Longitude" T={T} />
                <Input
                  value={form.longitude}
                  onChangeText={v => set('longitude', v)}
                  placeholder="e.g. 73.8567"
                  keyboardType="decimal-pad"
                  T={T}
                  error={errors.longitude}
                  suffix={
                    form.longitude ? (
                      <Icon
                        name="crosshairs-gps"
                        size={14}
                        color="#16A34A"
                        style={{ marginLeft: 4 }}
                      />
                    ) : null
                  }
                />
                {errors.longitude && (
                  <Text style={s.err}>{errors.longitude}</Text>
                )}
              </View>
            </View>

            {/* Use My Location */}
            <TouchableOpacity
              style={[
                s.locationBtn,
                { backgroundColor: '#2563EB12', borderColor: '#2563EB40' },
              ]}
              onPress={handleUseMyLocation}
              disabled={locLoading}
              activeOpacity={0.8}
            >
              {locLoading ? (
                <ActivityIndicator size="small" color="#2563EB" />
              ) : (
                <Icon name="crosshairs-gps" size={16} color="#2563EB" />
              )}
              <Text style={[s.locationBtnTxt, { color: '#2563EB' }]}>
                {locLoading ? 'Getting location…' : 'Use My Location'}
              </Text>
            </TouchableOpacity>
          </Card>

          {/* ── Farm Details ─────────────────────────────────── */}
          <Card
            title="Farm Details"
            icon="sprout-outline"
            color="#D97706"
            T={T}
          >
            <View style={s.row}>
              <View style={s.col}>
                <FieldLabel label="Land Area (acres)" required T={T} />
                <Input
                  value={form.land_area}
                  onChangeText={v => set('land_area', v)}
                  placeholder="e.g. 5.5"
                  keyboardType="decimal-pad"
                  T={T}
                  error={errors.land_area}
                />
                {errors.land_area && (
                  <Text style={s.err}>{errors.land_area}</Text>
                )}
              </View>
              <View style={s.col}>
                <FieldLabel label="Primary Crop" required T={T} />
                <Input
                  value={form.crop}
                  onChangeText={v => set('crop', v)}
                  placeholder="e.g. Wheat"
                  T={T}
                  error={errors.crop}
                  autoCapitalize="words"
                />
                {errors.crop && <Text style={s.err}>{errors.crop}</Text>}
              </View>
            </View>
            <FieldLabel label="Season" required T={T} />
            <View style={s.seasonRow}>
              {SEASONS.map(ss => {
                const active = form.season === ss.value;
                return (
                  <TouchableOpacity
                    key={ss.value}
                    style={[
                      s.seasonBtn,
                      {
                        backgroundColor: active
                          ? PRIMARY + '15'
                          : 'transparent',
                        borderColor: active
                          ? PRIMARY
                          : T.cardBorder ?? T.border ?? '#E2E8F0',
                        borderWidth: active ? 2 : 1,
                      },
                    ]}
                    onPress={() => set('season', ss.value)}
                  >
                    <Icon
                      name={ss.icon}
                      size={18}
                      color={active ? PRIMARY : T.muted}
                    />
                    <Text
                      style={[
                        s.seasonTxt,
                        {
                          color: active ? PRIMARY : T.text,
                          fontWeight: active ? '800' : '600',
                        },
                      ]}
                    >
                      {ss.label}
                    </Text>
                    {active && (
                      <Icon name="check-circle" size={14} color={PRIMARY} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            {errors.season && <Text style={s.err}>{errors.season}</Text>}
          </Card>

          {/* ── Submit ──────────────────────────────────────── */}
          <TouchableOpacity
            style={[
              s.submitBtn,
              { backgroundColor: addFarmerLoading ? PRIMARY + '80' : PRIMARY },
            ]}
            onPress={handleSubmit}
            disabled={addFarmerLoading}
            activeOpacity={0.85}
          >
            {addFarmerLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Icon name="account-plus-outline" size={20} color="#fff" />
                <Text style={s.submitTxt}>Register Farmer</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Modals ─────────────────────────────────────────── */}
      <SearchablePickerModal
        visible={statePickerOpen}
        title="State / UT"
        items={INDIAN_STATES}
        selected={form.state}
        onSelect={v => set('state', v)}
        onClose={() => setStatePickerOpen(false)}
        T={T}
      />
      <DuplicateAadhaarModal
        visible={dupModalOpen}
        existingFarmer={aadhaarCheck?.exists ? aadhaarCheck : null}
        onReRegister={handleReRegister}
        onCancel={handleDupCancel}
        loading={updateStatusLoading}
        T={T}
      />
      <PhotoPickerModal
        visible={photoModalOpen}
        onPick={handlePhotoPick}
        onClose={() => setPhotoModalOpen(false)}
        T={T}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: Spacing.lg },
  row: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  col: { flex: 1 },
  err: { color: '#EF4444', fontSize: 11, marginTop: 3 },

  photoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: Spacing.md,
  },
  photoBtn: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderStyle: 'dashed',
    overflow: 'hidden',
    ...Shadow.sm,
  },
  photoImg: { width: 88, height: 88 },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  photoPlaceholderTxt: { fontSize: 11, fontWeight: '600' },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: 8,
  },
  changeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  changeChipTxt: { color: '#fff', fontSize: 10, fontWeight: '700' },
  photoInfo: { flex: 1 },
  photoTitle: { fontSize: 15, fontWeight: '800', marginBottom: 3 },
  photoSub: { fontSize: 12 },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  removeTxt: { color: '#EF4444', fontSize: 12, fontWeight: '700' },

  aadhaarBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 10,
    marginTop: 8,
  },
  aadhaarBannerTxt: { fontSize: 12, fontWeight: '600', flex: 1 },

  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 8,
  },
  selectedChipTxt: { fontSize: 13, fontWeight: '700' },

  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingVertical: 11,
    marginTop: 4,
  },
  locationBtnTxt: { fontSize: 13, fontWeight: '700' },

  seasonRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  seasonBtn: {
    flex: 1,
    borderRadius: Radius.lg,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 4,
  },
  seasonTxt: { fontSize: 12 },

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 54,
    borderRadius: Radius.lg,
    marginTop: Spacing.sm,
    ...Shadow.md,
  },
  submitTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
