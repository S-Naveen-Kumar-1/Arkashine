// src/screens/soilpartner/AddFarmerScreen.jsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
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
import { Spacing, Radius, Shadow } from '../theme';
import useTheme from '../hooks/useTheme';
import { TopBar } from '../components/common';
import {
  addFarmer,
  resetAddFarmer,
  checkAadhaar,
  resetCheckAadhaar,
  updateFarmerStatus,
} from '../redux/actions/soilPartnerActions';
import { showMessage } from 'react-native-flash-message';

const SEASONS = [
  { value: 'kharif', label: 'Kharif', icon: 'weather-rainy' },
  { value: 'rabi', label: 'Rabi', icon: 'snowflake' },
  { value: 'zaid', label: 'Zaid', icon: 'weather-sunny' },
];

const PRIMARY = '#16A34A';

// ─── Permission helper ────────────────────────────────────────────────────────
async function requestAndroidPermission(type) {
  // type: 'camera' | 'gallery'
  try {
    if (Platform.OS !== 'android') return true;

    if (type === 'camera') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message: 'This app needs camera access to take a farmer photo.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Deny',
          buttonPositive: 'Allow',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }

    if (type === 'gallery') {
      // Android 13+ uses READ_MEDIA_IMAGES; older uses READ_EXTERNAL_STORAGE
      const permission =
        parseInt(Platform.Version, 10) >= 33
          ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
          : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

      const status = await PermissionsAndroid.check(permission);
      if (status) return true; // already granted

      const granted = await PermissionsAndroid.request(permission, {
        title: 'Gallery Permission',
        message: 'This app needs gallery access to choose a farmer photo.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Deny',
        buttonPositive: 'Allow',
      });
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }

    return true;
  } catch (err) {
    console.warn('Permission error:', err);
    return false;
  }
}

// ─── Core photo picker ────────────────────────────────────────────────────────
async function pickPhoto(source) {
  // 1. Request permission on Android
  const hasPermission = await requestAndroidPermission(source);
  if (!hasPermission) {
    Alert.alert(
      'Permission Required',
      source === 'camera'
        ? 'Camera access was denied. Please enable it in Settings → Apps → Permissions.'
        : 'Gallery access was denied. Please enable it in Settings → Apps → Permissions.',
      [{ text: 'OK' }],
    );
    return null;
  }

  // 2. Image picker options
  const options = {
    mediaType: 'photo',
    quality: 0.8,
    maxWidth: 800,
    maxHeight: 800,
    includeBase64: false,
    saveToPhotos: false,
  };

  try {
    const result =
      source === 'camera'
        ? await launchCamera(options)
        : await launchImageLibrary(options);

    // User cancelled — not an error
    if (result.didCancel) return null;

    // Picker-level error
    if (result.errorCode) {
      const messages = {
        camera_unavailable: 'Camera is not available on this device.',
        permission: 'Permission denied. Please check your device settings.',
        others: result.errorMessage ?? 'Could not open picker.',
      };
      Alert.alert('Error', messages[result.errorCode] ?? messages.others);
      return null;
    }

    // Successful pick
    const asset = result.assets?.[0];
    if (!asset) return null;
    return asset;
  } catch (err) {
    console.error('Image picker error:', err);
    Alert.alert('Error', 'Could not open the photo picker. Please try again.');
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

// ─── DuplicateAadhaarModal ────────────────────────────────────────────────────
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
              {existingFarmer.village} · {existingFarmer.phone}
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
          <View style={dup.actions}>
            <TouchableOpacity
              style={[dup.cancelBtn, { borderColor: T.border ?? '#E2E8F0' }]}
              onPress={onCancel}
            >
              <Text style={[dup.cancelTxt, { color: T.muted }]}>Go Back</Text>
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
                  <Text style={dup.reregTxt}>Re-Register</Text>
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
    marginBottom: 10,
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
    marginBottom: 16,
    fontStyle: 'italic',
  },
  actions: { flexDirection: 'row', gap: 10, width: '100%' },
  cancelBtn: {
    flex: 1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelTxt: { fontSize: 14, fontWeight: '700' },
  reregBtn: {
    flex: 1,
    borderRadius: Radius.lg,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  reregTxt: { color: '#fff', fontSize: 14, fontWeight: '800' },
});

// ─── PhotoPickerModal ─────────────────────────────────────────────────────────
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
  });
  const [errors, setErrors] = useState({});
  const [photo, setPhoto] = useState(null);
  const [aadhaarDirty, setAadhaarDirty] = useState(false);
  const [dupModalOpen, setDupModalOpen] = useState(false);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [pickerBusy, setPickerBusy] = useState(false); // prevents double-tap
  const aadhaarTimer = useRef(null);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  // ── Side effects ────────────────────────────────────────────────────────────
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
    if (updateStatusSuccess && dupModalOpen) {
      showMessage({
        message: 'Farmer re-registered successfully!',
        type: 'success',
      });
      dispatch(resetCheckAadhaar());
      setDupModalOpen(false);
      navigation.goBack();
    }
  }, [updateStatusSuccess]);

  // ── Aadhaar debounce ────────────────────────────────────────────────────────
  const handleAadhaarChange = useCallback(val => {
    set('aadhaar_number', val);
    setAadhaarDirty(true);
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

  // ── Photo picker ─────────────────────────────────────────────────────────────
  const handlePhotoPick = useCallback(
    async source => {
      if (pickerBusy) return; // prevent double-tap race
      setPickerBusy(true);
      setPhotoModalOpen(false);

      // Small delay so the modal animation finishes before the picker opens
      // (prevents a known iOS black-screen glitch when modal + picker overlap)
      await new Promise(resolve =>
        setTimeout(resolve, Platform.OS === 'ios' ? 350 : 150),
      );

      const asset = await pickPhoto(source);
      setPickerBusy(false);

      if (asset) setPhoto(asset);
    },
    [pickerBusy],
  );

  // ── Re-register ──────────────────────────────────────────────────────────────
  const handleReRegister = useCallback(() => {
    if (aadhaarCheck?.id)
      dispatch(updateFarmerStatus(aadhaarCheck.id, 're_registered'));
  }, [aadhaarCheck]);

  const handleDupCancel = () => {
    setDupModalOpen(false);
    dispatch(resetCheckAadhaar());
  };

  // ── Validation ───────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.farmer_name.trim()) e.farmer_name = 'Required';
    if (!form.phone.trim()) e.phone = 'Required';
    if (!form.aadhaar_number.trim()) e.aadhaar_number = 'Required';
    else if (form.aadhaar_number.replace(/\s/g, '').length !== 12)
      e.aadhaar_number = 'Must be 12 digits';
    if (!form.state.trim()) e.state = 'Required';
    if (!form.district.trim()) e.district = 'Required';
    if (!form.village.trim()) e.village = 'Required';
    if (!form.land_area) e.land_area = 'Required';
    else if (isNaN(Number(form.land_area))) e.land_area = 'Must be a number';
    if (!form.crop.trim()) e.crop = 'Required';
    if (!form.season) e.season = 'Select a season';
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
    if (photo) {
      payload.farmer_image = {
        uri: photo.uri,
        type: photo.type ?? 'image/jpeg',
        name: photo.fileName ?? `farmer_${Date.now()}.jpg`,
      };
    }
    dispatch(addFarmer(payload));
  };

  // ── Aadhaar suffix icon ──────────────────────────────────────────────────────
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

  // ── Render ───────────────────────────────────────────────────────────────────
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

          {/* ── Basic info ─────────────────────────────────── */}
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

          {/* ── Location ───────────────────────────────────── */}
          <Card
            title="Location"
            icon="map-marker-outline"
            color="#2563EB"
            T={T}
          >
            <View style={s.row}>
              <View style={s.col}>
                <FieldLabel label="State" required T={T} />
                <Input
                  value={form.state}
                  onChangeText={v => set('state', v)}
                  placeholder="e.g. Karnataka"
                  T={T}
                  error={errors.state}
                />
                {errors.state && <Text style={s.err}>{errors.state}</Text>}
              </View>
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
            </View>
            <FieldLabel label="Village" required T={T} />
            <Input
              value={form.village}
              onChangeText={v => set('village', v)}
              placeholder="Village name"
              T={T}
              error={errors.village}
            />
            {errors.village && <Text style={s.err}>{errors.village}</Text>}
          </Card>

          {/* ── Farm details ────────────────────────────────── */}
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

      {/* Modals */}
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

  // Photo section
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

  // Aadhaar banner
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

  // Season
  seasonRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  seasonBtn: {
    flex: 1,
    borderRadius: Radius.lg,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 4,
  },
  seasonTxt: { fontSize: 12 },

  // Submit
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
