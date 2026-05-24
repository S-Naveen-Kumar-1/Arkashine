// src/screens/soilpartner/AddFarmerScreen.jsx
//
// Covers all fields from POST /api/mobile/farmers/create/

import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Spacing, Radius, Shadow } from '../theme';
import useTheme from '../hooks/useTheme';
import { TopBar } from '../components/common';
import { addFarmer, resetAddFarmer } from '../redux/actions/soilPartnerActions';
import { showMessage } from 'react-native-flash-message';

const SEASONS = [
  { value: 'kharif', label: 'Kharif' },
  { value: 'rabi', label: 'Rabi' },
  { value: 'zaid', label: 'Zaid' },
];

const PRIMARY = '#16A34A';

// ─── Field component ──────────────────────────────────────────────────────────
function Field({ label, required, error, children, T }) {
  return (
    <View style={f.group}>
      <Text style={[f.label, { color: T.text }]}>
        {label}
        {required && <Text style={{ color: '#EF4444' }}> *</Text>}
      </Text>
      {children}
      {error ? <Text style={f.error}>{error}</Text> : null}
    </View>
  );
}
const f = StyleSheet.create({
  group: { marginBottom: Spacing.md },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  error: { color: '#EF4444', fontSize: 11, marginTop: 4 },
});

// ─── Text input ───────────────────────────────────────────────────────────────
function Input({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  T,
  error,
  ...rest
}) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      style={[
        inp.input,
        {
          backgroundColor: T.inputBg ?? T.card,
          color: T.text,
          borderColor: error
            ? '#EF4444'
            : focused
            ? PRIMARY
            : T.cardBorder ?? T.border,
          borderWidth: focused ? 2 : 1,
        },
      ]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={T.muted ?? T.textSub}
      keyboardType={keyboardType ?? 'default'}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      {...rest}
    />
  );
}
const inp = StyleSheet.create({
  input: {
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    height: 46,
    fontSize: 14,
  },
});

// ─── Season picker ────────────────────────────────────────────────────────────
function SeasonPicker({ value, onChange, T, error }) {
  return (
    <View
      style={[
        sp.row,
        { borderColor: error ? '#EF4444' : T.cardBorder ?? T.border },
      ]}
    >
      {SEASONS.map(s => (
        <TouchableOpacity
          key={s.value}
          style={[
            sp.option,
            value === s.value && {
              backgroundColor: PRIMARY,
              borderColor: PRIMARY,
            },
          ]}
          onPress={() => onChange(s.value)}
        >
          <Text
            style={[sp.optText, { color: value === s.value ? '#fff' : T.text }]}
          >
            {s.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
const sp = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  option: {
    flex: 1,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderColor: 'rgba(0,0,0,0.15)',
  },
  optText: { fontSize: 13, fontWeight: '700' },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function AddFarmerScreen({ navigation }) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const T = theme.colors;

  const { addFarmerLoading, addFarmerError, addFarmerSuccess } = useSelector(
    s => s.soilPartner ?? {},
  );

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

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  // Navigate back on success
  useEffect(() => {
    if (addFarmerSuccess) {
      showMessage({ message: 'Farmer added successfully!', type: 'success' });
      dispatch(resetAddFarmer());
      navigation.goBack();
    }
  }, [addFarmerSuccess]);

  // Show API errors
  useEffect(() => {
    if (addFarmerError) {
      const msg =
        typeof addFarmerError === 'string'
          ? addFarmerError
          : Object.values(addFarmerError).flat().join('\n');
      showMessage({ message: msg, type: 'danger' });
    }
  }, [addFarmerError]);

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
    if (!form.season) e.season = 'Please select a season';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    dispatch(
      addFarmer({
        ...form,
        land_area: Number(form.land_area),
      }),
    );
  };

  return (
    <SafeAreaView style={[s.root, { backgroundColor: T.bg }]}>
      <StatusBar
        barStyle={T.statusBar ?? 'dark-content'}
        backgroundColor={T.bg}
      />
      <TopBar
        title="Add Farmer"
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
          {/* Basic info */}
          <View
            style={[
              s.card,
              {
                backgroundColor: T.card,
                borderColor: T.cardBorder ?? T.border,
              },
            ]}
          >
            <View style={s.cardHeader}>
              <MaterialCommunityIcons
                name="account-outline"
                size={16}
                color={PRIMARY}
              />
              <Text style={[s.cardTitle, { color: T.text }]}>
                Basic Information
              </Text>
            </View>
            <Field
              label="Farmer Name"
              required
              error={errors.farmer_name}
              T={T}
            >
              <Input
                value={form.farmer_name}
                onChangeText={v => set('farmer_name', v)}
                placeholder="Full name"
                T={T}
                error={errors.farmer_name}
              />
            </Field>
            <Field label="Phone" required error={errors.phone} T={T}>
              <Input
                value={form.phone}
                onChangeText={v => set('phone', v)}
                placeholder="Primary phone number"
                keyboardType="phone-pad"
                T={T}
                error={errors.phone}
              />
            </Field>
            <Field label="Secondary Mobile" error={errors.mobile} T={T}>
              <Input
                value={form.mobile}
                onChangeText={v => set('mobile', v)}
                placeholder="Optional"
                keyboardType="phone-pad"
                T={T}
              />
            </Field>
            <Field label="Email" error={errors.email} T={T}>
              <Input
                value={form.email}
                onChangeText={v => set('email', v)}
                placeholder="Optional"
                keyboardType="email-address"
                autoCapitalize="none"
                T={T}
              />
            </Field>
            <Field
              label="Aadhaar Number (12 digits)"
              required
              error={errors.aadhaar_number}
              T={T}
            >
              <Input
                value={form.aadhaar_number}
                onChangeText={v => set('aadhaar_number', v)}
                placeholder="XXXX XXXX XXXX"
                keyboardType="number-pad"
                maxLength={14}
                T={T}
                error={errors.aadhaar_number}
              />
            </Field>
          </View>

          {/* Location */}
          <View
            style={[
              s.card,
              {
                backgroundColor: T.card,
                borderColor: T.cardBorder ?? T.border,
              },
            ]}
          >
            <View style={s.cardHeader}>
              <MaterialCommunityIcons
                name="map-marker-outline"
                size={16}
                color="#2563EB"
              />
              <Text style={[s.cardTitle, { color: T.text }]}>Location</Text>
            </View>
            <Field label="State" required error={errors.state} T={T}>
              <Input
                value={form.state}
                onChangeText={v => set('state', v)}
                placeholder="e.g. Karnataka"
                T={T}
                error={errors.state}
              />
            </Field>
            <Field label="District" required error={errors.district} T={T}>
              <Input
                value={form.district}
                onChangeText={v => set('district', v)}
                placeholder="e.g. Raichur"
                T={T}
                error={errors.district}
              />
            </Field>
            <Field label="Village" required error={errors.village} T={T}>
              <Input
                value={form.village}
                onChangeText={v => set('village', v)}
                placeholder="Village name"
                T={T}
                error={errors.village}
              />
            </Field>
          </View>

          {/* Farm details */}
          <View
            style={[
              s.card,
              {
                backgroundColor: T.card,
                borderColor: T.cardBorder ?? T.border,
              },
            ]}
          >
            <View style={s.cardHeader}>
              <MaterialCommunityIcons
                name="sprout-outline"
                size={16}
                color="#D97706"
              />
              <Text style={[s.cardTitle, { color: T.text }]}>Farm Details</Text>
            </View>
            <Field
              label="Land Area (acres)"
              required
              error={errors.land_area}
              T={T}
            >
              <Input
                value={form.land_area}
                onChangeText={v => set('land_area', v)}
                placeholder="e.g. 5.5"
                keyboardType="decimal-pad"
                T={T}
                error={errors.land_area}
              />
            </Field>
            <Field label="Primary Crop" required error={errors.crop} T={T}>
              <Input
                value={form.crop}
                onChangeText={v => set('crop', v)}
                placeholder="e.g. wheat, arabica_coffee"
                T={T}
                error={errors.crop}
              />
            </Field>
            <Field label="Season" required error={errors.season} T={T}>
              <SeasonPicker
                value={form.season}
                onChange={v => set('season', v)}
                T={T}
                error={errors.season}
              />
              {errors.season ? (
                <Text style={f.error}>{errors.season}</Text>
              ) : null}
            </Field>
          </View>

          {/* Submit */}
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
                <MaterialCommunityIcons
                  name="account-plus"
                  size={20}
                  color="#fff"
                />
                <Text style={s.submitText}>Register Farmer</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: Spacing.lg },

  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.07)',
  },
  cardTitle: { fontSize: 14, fontWeight: '800' },

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 54,
    borderRadius: Radius.lg,
    marginTop: Spacing.sm,
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
