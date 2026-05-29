// src/screens/profile/SoilPartnerEnquiryScreen.js

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch, useSelector } from 'react-redux';
import useTheme from '../../hooks/useTheme';
import { Spacing, Radius, Shadow } from '../../theme';
import { TopBar } from '../../components/common';
import {
  submitSoilPartnerEnquiry,
  resetSoilPartnerEnquiry,
} from '../../redux/actions/soilPartnerActions';
import { CommonActions } from '@react-navigation/native';
// ─── Constants ────────────────────────────────────────────────────────────────

const INDIA_STATES = [
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
];

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  multiline = false,
  T,
  error,
  returnKeyType,
  onSubmitEditing,
  inputRef,
}) {
  const [focused, setFocused] = useState(false);
  const borderColor = focused ? '#22C55E' : error ? '#EF4444' : T.cardBorder;

  return (
    <View style={fi.wrap}>
      <Text style={[fi.label, { color: T.muted }]}>{label}</Text>
      <View style={[fi.box, { backgroundColor: T.card, borderColor }]}>
        <MaterialCommunityIcons
          name={icon}
          size={17}
          color={focused ? '#22C55E' : T.muted}
          style={{ marginTop: multiline ? 2 : 0, flexShrink: 0 }}
        />
        <TextInput
          ref={inputRef}
          style={[
            fi.input,
            { color: T.text, height: multiline ? 90 : undefined },
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={T.muted + 'AA'}
          keyboardType={keyboardType}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCapitalize={
            keyboardType === 'email-address' || keyboardType === 'phone-pad'
              ? 'none'
              : 'words'
          }
          autoCorrect={false}
          returnKeyType={returnKeyType ?? (multiline ? 'default' : 'next')}
          onSubmitEditing={onSubmitEditing}
          blurOnSubmit={!multiline}
          // Critical: do NOT intercept touch events
          pointerEvents="auto"
        />
      </View>
      {error ? <Text style={fi.error}>{error}</Text> : null}
    </View>
  );
}

const fi = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 7,
  },
  box: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 13,
    paddingVertical: 12,
  },
  boxFocused: {
    shadowColor: '#22C55E',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  input: { flex: 1, fontSize: 14, fontWeight: '500', padding: 0, margin: 0 },
  error: { fontSize: 11, color: '#EF4444', marginTop: 5 },
});

// ─── State picker ─────────────────────────────────────────────────────────────

function StatePicker({ value, onSelect, error, T }) {
  const [open, setOpen] = useState(false);
  const borderColor = error ? '#EF4444' : value ? '#22C55E' : T.cardBorder;

  return (
    <View style={fi.wrap}>
      <Text style={[fi.label, { color: T.muted }]}>State *</Text>
      <TouchableOpacity
        style={[fi.box, { backgroundColor: T.card, borderColor }]}
        onPress={() => {
          Keyboard.dismiss();
          setOpen(true);
        }}
        activeOpacity={0.75}
      >
        <MaterialCommunityIcons
          name="map-outline"
          size={17}
          color={value ? '#22C55E' : T.muted}
          style={{ flexShrink: 0 }}
        />
        <Text
          style={[
            fi.input,
            { color: value ? T.text : T.muted + 'AA', paddingTop: 1 },
          ]}
          numberOfLines={1}
        >
          {value || 'Select your state'}
        </Text>
        <MaterialCommunityIcons
          name="chevron-down"
          size={17}
          color={T.muted}
          style={{ flexShrink: 0 }}
        />
      </TouchableOpacity>
      {error ? <Text style={fi.error}>{error}</Text> : null}

      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOpen(false)}
      >
        <SafeAreaView style={[spm.root, { backgroundColor: T.bg }]}>
          <View style={[spm.header, { borderBottomColor: T.divider }]}>
            <Text style={[spm.title, { color: T.text }]}>Select State</Text>
            <TouchableOpacity
              style={[
                spm.closeBtn,
                { backgroundColor: T.card, borderColor: T.cardBorder },
              ]}
              onPress={() => setOpen(false)}
            >
              <MaterialCommunityIcons name="close" size={18} color={T.muted} />
            </TouchableOpacity>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {INDIA_STATES.map(st => (
              <TouchableOpacity
                key={st}
                style={[spm.item, { borderBottomColor: T.divider }]}
                onPress={() => {
                  onSelect(st);
                  setOpen(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={[spm.itemText, { color: T.text }]}>{st}</Text>
                {value === st && (
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={20}
                    color="#22C55E"
                  />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const spm = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 17, fontWeight: '800' },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 0.5,
  },
  itemText: { fontSize: 15 },
});

// ─── Success view ─────────────────────────────────────────────────────────────

function SuccessView({ onDone, T }) {
  return (
    <View style={succ.root}>
      <View
        style={[
          succ.iconRing,
          { backgroundColor: '#22C55E18', borderColor: '#22C55E40' },
        ]}
      >
        <MaterialCommunityIcons
          name="check-circle-outline"
          size={72}
          color="#22C55E"
        />
      </View>
      <Text style={[succ.title, { color: T.text }]}>
        Application Submitted!
      </Text>
      <Text style={[succ.sub, { color: T.muted }]}>
        Thank you for your interest in the Soil Partner program.{'\n'}
        Our team will reach out within 3–5 business days.
      </Text>
      <View
        style={[
          succ.timeline,
          { backgroundColor: T.card, borderColor: T.cardBorder },
        ]}
      >
        {[
          {
            icon: 'check-circle',
            color: '#22C55E',
            label: 'Application received',
            done: true,
          },
          {
            icon: 'clock-outline',
            color: '#F59E0B',
            label: 'Under review (3–5 days)',
            done: false,
          },
          {
            icon: 'phone-outline',
            color: '#3B82F6',
            label: 'Our team contacts you',
            done: false,
          },
          {
            icon: 'handshake-outline',
            color: '#A78BFA',
            label: 'Welcome to the program!',
            done: false,
          },
        ].map((step, i, arr) => (
          <View
            key={i}
            style={[
              succ.tlRow,
              i < arr.length - 1 && {
                borderBottomColor: T.divider,
                borderBottomWidth: 0.5,
              },
            ]}
          >
            <View style={[succ.tlIcon, { backgroundColor: step.color + '18' }]}>
              <MaterialCommunityIcons
                name={step.icon}
                size={18}
                color={step.color}
              />
            </View>
            <Text
              style={[succ.tlLabel, { color: step.done ? T.text : T.muted }]}
            >
              {step.label}
            </Text>
            {step.done && (
              <View style={[succ.doneBadge, { backgroundColor: '#22C55E18' }]}>
                <Text style={[succ.doneTxt, { color: '#22C55E' }]}>Done</Text>
              </View>
            )}
          </View>
        ))}
      </View>
      <TouchableOpacity style={succ.btn} onPress={onDone} activeOpacity={0.85}>
        <Text style={succ.btnText}>Back to Profile</Text>
      </TouchableOpacity>
    </View>
  );
}

const succ = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  iconRing: {
    width: 120,
    height: 120,
    borderRadius: 36,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 10,
  },
  sub: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  timeline: {
    width: '100%',
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 28,
  },
  tlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  tlIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  tlLabel: { flex: 1, fontSize: 13, fontWeight: '600' },
  doneBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  doneTxt: { fontSize: 10, fontWeight: '800' },
  btn: {
    backgroundColor: '#22C55E',
    borderRadius: Radius.lg,
    paddingVertical: 15,
    paddingHorizontal: 40,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function SoilPartnerEnquiryScreen({ navigation }) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const T = theme.colors;

  const { status } = useSelector(s => s.soilPartner ?? { status: 'idle' });

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    state: '',
    city: '',
    message: '',
  });
  const [errors, setErrs] = useState({});

  // Refs for focus-chaining
  const emailRef = useRef(null);
  const phoneRef = useRef(null);
  const cityRef = useRef(null);
  const messageRef = useRef(null);

  useEffect(
    () => () => {
      dispatch(resetSoilPartnerEnquiry());
    },
    [],
  );

  const set = key => val => setForm(prev => ({ ...prev, [key]: val }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email))
      e.email = 'Valid email required';
    if (!form.phone.trim() || form.phone.length < 10)
      e.phone = 'Valid 10-digit number required';
    if (!form.state) e.state = 'Please select a state';
    if (!form.city.trim()) e.city = 'City is required';
    setErrs(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    Keyboard.dismiss();
    if (!validate()) return;
    dispatch(submitSoilPartnerEnquiry(form));
  };

  // ── Success ──────────────────────────────────────────────────────────────────
  if (status === 'success') {
    return (
      <SafeAreaView style={[s.root, { backgroundColor: T.bg }]} edges={['top']}>
        <StatusBar barStyle={T.statusBar} backgroundColor={T.bg} />
        <TopBar
          title="Application Sent"
          onBack={() => navigation.goBack()}
          theme={theme}
        />
        <SuccessView
          onDone={() =>
            navigation.reset({
              index: 0,
              routes: [
                {
                  name: 'AppTabs',
                  state: {
                    routes: [{ name: 'Profile' }],
                  },
                },
              ],
            })
          }
          T={T}
        />
      </SafeAreaView>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[s.root, { backgroundColor: T.bg }]} edges={['top']}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.bg} />
      <TopBar
        title="Become a Soil Partner"
        subtitle="Fill in your details below"
        onBack={() => navigation.goBack()}
        theme={theme}
      />

      {/*
        KEY FIX:
        - KeyboardAvoidingView wraps everything
        - behavior='padding' on iOS, 'height' on Android
        - ScrollView uses keyboardShouldPersistTaps='handled' (NOT 'always')
          so tapping outside a field dismisses the keyboard,
          but tapping a button/input still works
        - No TouchableWithoutFeedback wrapper (that blocks input events)
      */}
      <KeyboardAvoidingView
        style={s.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          // Prevents the scroll view from stealing focus from inputs
          keyboardDismissMode="interactive"
        >
          {/* ── Progress bar ── */}
          <View
            style={[
              s.progressCard,
              { backgroundColor: T.card, borderColor: T.cardBorder },
            ]}
          >
            <View style={s.progressRow}>
              {['Contact', 'Location', 'Message'].map((step, i) => (
                <React.Fragment key={step}>
                  <View style={s.progressStep}>
                    <View
                      style={[s.progressDot, { backgroundColor: '#22C55E' }]}
                    >
                      <MaterialCommunityIcons
                        name="check"
                        size={12}
                        color="#fff"
                      />
                    </View>
                    <Text style={[s.progressLabel, { color: '#22C55E' }]}>
                      {step}
                    </Text>
                  </View>
                  {i < 2 && (
                    <View
                      style={[s.progressLine, { backgroundColor: '#22C55E40' }]}
                    />
                  )}
                </React.Fragment>
              ))}
            </View>
          </View>

          {/* ── Error / duplicate banner ── */}
          {(status === 'error' || status === 'duplicate') && (
            <View
              style={[
                s.banner,
                { backgroundColor: '#EF444412', borderColor: '#EF444440' },
              ]}
            >
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={18}
                color="#EF4444"
              />
              <Text style={s.bannerText}>
                {status === 'duplicate'
                  ? 'An application with this email is already pending review.'
                  : 'Something went wrong. Please check your details and try again.'}
              </Text>
            </View>
          )}

          {/* ── Contact ── */}
          <Text style={[s.sectionLabel, { color: T.muted }]}>
            Contact details
          </Text>

          <Field
            label="Full Name *"
            icon="account-outline"
            value={form.name}
            onChangeText={set('name')}
            placeholder="Your full name"
            T={T}
            error={errors.name}
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
          />
          <Field
            label="Email Address *"
            icon="email-outline"
            value={form.email}
            onChangeText={set('email')}
            placeholder="you@example.com"
            T={T}
            error={errors.email}
            keyboardType="email-address"
            inputRef={emailRef}
            returnKeyType="next"
            onSubmitEditing={() => phoneRef.current?.focus()}
          />
          <Field
            label="Phone Number *"
            icon="phone-outline"
            value={form.phone}
            onChangeText={set('phone')}
            placeholder="10-digit mobile number"
            T={T}
            error={errors.phone}
            keyboardType="phone-pad"
            inputRef={phoneRef}
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
          />

          {/* ── Location ── */}
          <Text style={[s.sectionLabel, { color: T.muted }]}>
            Your location
          </Text>

          <StatePicker
            value={form.state}
            onSelect={set('state')}
            error={errors.state}
            T={T}
          />

          <Field
            label="City *"
            icon="city-variant-outline"
            value={form.city}
            onChangeText={set('city')}
            placeholder="Your city"
            T={T}
            error={errors.city}
            inputRef={cityRef}
            returnKeyType="next"
            onSubmitEditing={() => messageRef.current?.focus()}
          />

          {/* ── About you ── */}
          <Text style={[s.sectionLabel, { color: T.muted }]}>About you</Text>

          <Field
            label="Message (optional)"
            icon="message-text-outline"
            value={form.message}
            onChangeText={set('message')}
            placeholder="Tell us about your farmer network, experience, or why you want to join…"
            T={T}
            multiline
            inputRef={messageRef}
          />

          {/* ── Submit ── */}
          <TouchableOpacity
            style={[s.submitBtn, status === 'loading' && { opacity: 0.65 }]}
            onPress={handleSubmit}
            disabled={status === 'loading'}
            activeOpacity={0.85}
          >
            {status === 'loading' ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialCommunityIcons
                  name="send-outline"
                  size={20}
                  color="#fff"
                />
                <Text style={s.submitBtnText}>Submit Application</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={[s.privacyNote, { color: T.muted }]}>
            By submitting you agree to Arkashine's partner terms. Your data is
            kept private and only used for partner onboarding.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },
  kav: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.lg, paddingBottom: 60 },

  progressCard: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 14,
    marginBottom: Spacing.lg,
    ...Shadow.sm,
  },
  progressRow: { flexDirection: 'row', alignItems: 'center' },
  progressStep: { alignItems: 'center', gap: 5 },
  progressDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressLabel: { fontSize: 10, fontWeight: '700' },
  progressLine: { flex: 1, height: 2, marginHorizontal: 6, marginBottom: 14 },

  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 13,
    marginBottom: Spacing.md,
  },
  bannerText: { flex: 1, color: '#EF4444', fontSize: 13, lineHeight: 19 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
    marginTop: 4,
  },

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#22C55E',
    borderRadius: Radius.lg,
    paddingVertical: 16,
    marginTop: 8,
    marginBottom: 14,
    ...Shadow.sm,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  privacyNote: { fontSize: 11, textAlign: 'center', lineHeight: 17 },
});
