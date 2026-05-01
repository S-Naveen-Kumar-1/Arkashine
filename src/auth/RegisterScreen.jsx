import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { registerUser, toggleTheme, clearAuthError } from '../redux/actions';
import useTheme from '../hooks/useTheme';
import { Typography, Spacing, Radius, Shadow } from '../theme';
import { showMessage } from 'react-native-flash-message';

export default function RegisterScreen({ navigation }) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const T = theme.colors;
  const { loading, error } = useSelector(s => s.auth);

  // ── Fields ──────────────────────────────────────────────
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [username, setUsername] = useState('');

  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [focusedInput, setFocusedInput] = useState(null);
  const [step, setStep] = useState(1);

  // ── Refs ─────────────────────────────────────────────────
  const firstNameRef = useRef(null);
  const lastNameRef = useRef(null);
  const phoneRef = useRef(null);
  const emailRef = useRef(null);
  const passRef = useRef(null);
  const confirmRef = useRef(null);
  const usernameRef = useRef(null);
  const scrollViewRef = useRef(null);

  // ── Validation ───────────────────────────────────────────
  const validateField = (field, value) => {
    switch (field) {
      case 'firstName':
        return value.trim() ? null : 'First name is required';
      case 'lastName':
        return value.trim() ? null : 'Last name is required';
      case 'phone': {
        const r =
          /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
        return r.test(value.replace(/\s/g, ''))
          ? null
          : 'Valid phone number required';
      }
      case 'email':
        return /\S+@\S+\.\S+/.test(value) ? null : 'Valid email required';
      case 'pass':
        return value.length >= 6 ? null : 'At least 6 characters';
      case 'confirm':
        return value === pass ? null : 'Passwords do not match';
      case 'username':
        if (!value.trim()) return 'Username is required';
        if (value.length < 3) return 'At least 3 characters';
        return null;
      default:
        return null;
    }
  };

  const makeHandler = (field, setter) => value => {
    setter(value);
    if (touched[field]) {
      setErrors(prev => ({ ...prev, [field]: validateField(field, value) }));
    }
  };

  const handleInputBlur = (field, currentValue) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    setErrors(prev => ({
      ...prev,
      [field]: validateField(field, currentValue),
    }));
    setFocusedInput(null);
  };

  const validateStep = n => {
    const e = {};
    if (n === 1) {
      if (!firstName.trim()) e.firstName = 'First name is required';
      if (!lastName.trim()) e.lastName = 'Last name is required';
      const r =
        /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
      if (!r.test(phone.replace(/\s/g, '')))
        e.phone = 'Valid phone number required';
    }
    if (n === 2) {
      if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Valid email required';
      if (pass.length < 6) e.pass = 'At least 6 characters';
    }
    if (n === 3) {
      if (pass !== confirm) e.confirm = 'Passwords do not match';
      if (!username.trim()) e.username = 'Username is required';
      else if (username.length < 3) e.username = 'At least 3 characters';
    }
    return e;
  };

  const goStep = (n, prevStep) => {
    const e = validateStep(prevStep);
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    setErrors({});
    setTouched({});
    setStep(n);
    setTimeout(
      () => scrollViewRef.current?.scrollTo({ y: 0, animated: true }),
      300,
    );
  };

  const handleRegister = async () => {
    const e = validateStep(3);
    if (Object.keys(e).length) {
      setErrors(e);
      setTouched({ confirm: true, username: true });
      return;
    }
    const regiRes = await dispatch(
      registerUser({
        username,
        password: pass,
        email,
        first_name: firstName,
        last_name: lastName,
        phone,
      }),
    );
    if (regiRes.payload?.data?.access) {
      showMessage({
        message: 'Account Created Successfully',
        type: 'success',
      });
      navigation.navigate('AppTabs');
    } else {
      showMessage({
        message: regiRes.payload?.error || 'Registration Failed',
        type: 'danger',
      });
      console.log(
        'Registration failed, error:',
        regiRes.payload?.error || regiRes.error,
      );
    }

    console.log('Registration response:', regiRes);
  };

  const handleInputFocus = (inputName, scrollY) => {
    setFocusedInput(inputName);
    setTimeout(
      () => scrollViewRef.current?.scrollTo({ y: scrollY, animated: true }),
      200,
    );
  };

  const progressPercentage = (step / 3) * 100;

  // ── Shared input renderer ────────────────────────────────
  const renderInput = ({
    label,
    icon,
    value,
    onChange,
    field,
    placeholder,
    keyboardType = 'default',
    isPassword = false,
    returnKeyType = 'next',
    onSubmitEditing,
    scrollY,
    inputRef,
  }) => {
    const err = errors[field];
    const isValid = value.length > 0 && !err;
    return (
      <View style={s.inputGroup}>
        <View style={s.inputHeader}>
          <View style={[s.iconBox, { backgroundColor: `${T.primary}15` }]}>
            <MaterialCommunityIcons name={icon} size={20} color={T.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.inputLabel, { color: T.text }]}>{label}</Text>
            {err ? (
              <Text style={[s.inputHint, { color: T.error || '#EF4444' }]}>
                {err}
              </Text>
            ) : null}
          </View>
        </View>
        <View
          style={[
            s.modernInput,
            {
              borderColor: err
                ? T.error || '#EF4444'
                : isValid
                ? T.success || '#10B981'
                : focusedInput === field
                ? T.primary
                : T.cardBorder,
              backgroundColor:
                focusedInput === field ? `${T.primary}08` : T.inputBg || T.card,
              borderWidth: err || focusedInput === field ? 2 : 1,
            },
          ]}
        >
          <TextInput
            ref={inputRef}
            style={[s.modernTextInput, { color: T.text }]}
            placeholder={placeholder}
            placeholderTextColor={`${T.textSub}80`}
            value={value}
            onChangeText={onChange}
            onFocus={() => handleInputFocus(field, scrollY)}
            onBlur={() => handleInputBlur(field, value)}
            keyboardType={keyboardType}
            secureTextEntry={isPassword && !showPass}
            returnKeyType={returnKeyType}
            onSubmitEditing={onSubmitEditing}
            blurOnSubmit={false}
            importantForAutofill="no"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {isValid && (
            <MaterialCommunityIcons
              name="check-circle"
              size={20}
              color={T.success || '#10B981'}
            />
          )}
        </View>
      </View>
    );
  };
  const resetForm = async () => {
    setFirstName('');
    setLastName('');
    setPhone('');
    setEmail('');
    setPass('');
    setConfirm('');
    setUsername('');

    setErrors({});
    setTouched({});
    setFocusedInput(null);
    setShowPass(false);
    setStep(1);
    dispatch(clearAuthError());
  };
  useEffect(() => {
    dispatch(clearAuthError());
  }, []);
  const handleGoBackToLogin = async () => {
    await resetForm();
    navigation.goBack();
  };
  // ── Render ───────────────────────────────────────────────
  return (
    <SafeAreaView style={[s.bg, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.bg} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={[s.header, { borderBottomColor: T.cardBorder }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={s.headerBtn}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={T.primary}
            />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: T.text }]}>Create Account</Text>
          <TouchableOpacity
            style={[
              s.headerBtn,
              { backgroundColor: T.card, borderColor: T.cardBorder },
            ]}
            onPress={() => dispatch(toggleTheme())}
          >
            <MaterialCommunityIcons
              name={theme.dark ? 'white-balance-sunny' : 'moon-waning-crescent'}
              size={18}
              color={T.primary}
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Progress */}
          <View style={s.progressSection}>
            <View style={s.progressInfo}>
              <Text style={[s.progressLabel, { color: T.textSub }]}>
                Step {step} of 3
              </Text>
              <Text style={[s.progressTitle, { color: T.text }]}>
                {step === 1 && 'Personal Information'}
                {step === 2 && 'Email & Credentials'}
                {step === 3 && 'Confirm Details'}
              </Text>
            </View>
            <View
              style={[
                s.progressBar,
                { backgroundColor: `${T.primary}20`, overflow: 'hidden' },
              ]}
            >
              <Animated.View
                style={[
                  s.progressFill,
                  {
                    backgroundColor: T.primary,
                    width: `${progressPercentage}%`,
                  },
                ]}
              />
            </View>
          </View>

          {/* Card */}
          <View
            style={[
              s.contentCard,
              { backgroundColor: T.card, borderColor: T.cardBorder },
              Shadow.lg,
            ]}
          >
            {/* Error banner */}
            {error ? (
              <View
                style={[
                  s.errorBanner,
                  {
                    borderColor: T.error || '#EF4444',
                    backgroundColor: `${T.error || '#EF4444'}15`,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="alert-circle-outline"
                  size={20}
                  color={T.error || '#EF4444'}
                />
                <Text
                  style={[
                    s.errorBannerText,
                    { color: T.error || '#EF4444', marginLeft: 12 },
                  ]}
                >
                  {error}
                </Text>
              </View>
            ) : null}

            {/* ── STEP 1: Personal Info ── */}
            {step === 1 && (
              <View style={s.stepContent}>
                <View style={s.stepHeader}>
                  <View
                    style={[s.stepIcon, { backgroundColor: `${T.primary}20` }]}
                  >
                    <MaterialCommunityIcons
                      name="account-details"
                      size={32}
                      color={T.primary}
                    />
                  </View>
                  <Text style={[s.stepTitle, { color: T.text }]}>
                    Tell us about yourself
                  </Text>
                  <Text style={[s.stepSubtitle, { color: T.textSub }]}>
                    We'll use this to personalise your experience
                  </Text>
                </View>

                {/* First + Last name side by side */}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    {renderInput({
                      label: 'First Name',
                      icon: 'account',
                      field: 'firstName',
                      value: firstName,
                      onChange: makeHandler('firstName', setFirstName),
                      placeholder: 'Jane',
                      inputRef: firstNameRef,
                      scrollY: 50,
                      onSubmitEditing: () => lastNameRef.current?.focus(),
                    })}
                  </View>
                  <View style={{ flex: 1 }}>
                    {renderInput({
                      label: 'Last Name',
                      icon: 'account-outline',
                      field: 'lastName',
                      value: lastName,
                      onChange: makeHandler('lastName', setLastName),
                      placeholder: 'Doe',
                      inputRef: lastNameRef,
                      scrollY: 50,
                      onSubmitEditing: () => phoneRef.current?.focus(),
                    })}
                  </View>
                </View>

                {renderInput({
                  label: 'Phone Number',
                  icon: 'phone',
                  field: 'phone',
                  value: phone,
                  onChange: makeHandler('phone', setPhone),
                  placeholder: '+91 98765 43210',
                  keyboardType: 'phone-pad',
                  returnKeyType: 'done',
                  inputRef: phoneRef,
                  scrollY: 100,
                  onSubmitEditing: () => goStep(2, 1),
                })}

                <TouchableOpacity
                  style={[s.nextBtn, { backgroundColor: T.primary }]}
                  onPress={() => goStep(2, 1)}
                  activeOpacity={0.8}
                >
                  <Text style={s.nextBtnText}>Continue</Text>
                  <MaterialCommunityIcons
                    name="arrow-right"
                    size={18}
                    color="#fff"
                    style={{ marginLeft: 8 }}
                  />
                </TouchableOpacity>
              </View>
            )}

            {/* ── STEP 2: Email & Password ── */}
            {step === 2 && (
              <View style={s.stepContent}>
                <View style={s.stepHeader}>
                  <View
                    style={[s.stepIcon, { backgroundColor: `${T.primary}20` }]}
                  >
                    <MaterialCommunityIcons
                      name="shield-lock"
                      size={32}
                      color={T.primary}
                    />
                  </View>
                  <Text style={[s.stepTitle, { color: T.text }]}>
                    Secure your account
                  </Text>
                  <Text style={[s.stepSubtitle, { color: T.textSub }]}>
                    Create a unique email and strong password
                  </Text>
                </View>

                {renderInput({
                  label: 'Email Address',
                  icon: 'email-outline',
                  field: 'email',
                  value: email,
                  onChange: makeHandler('email', setEmail),
                  placeholder: 'jane@example.com',
                  keyboardType: 'email-address',
                  inputRef: emailRef,
                  scrollY: 50,
                  onSubmitEditing: () => passRef.current?.focus(),
                })}

                {renderInput({
                  label: 'Password',
                  icon: 'lock-outline',
                  field: 'pass',
                  value: pass,
                  onChange: makeHandler('pass', setPass),
                  placeholder: 'Min 6 characters',
                  isPassword: true,
                  inputRef: passRef,
                  scrollY: 110,
                  returnKeyType: 'done',
                  onSubmitEditing: () => goStep(3, 2),
                })}

                <View style={s.passwordRequirements}>
                  <View
                    style={[
                      s.requirement,
                      { opacity: pass.length >= 6 ? 1 : 0.5 },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={
                        pass.length >= 6 ? 'check-circle' : 'circle-outline'
                      }
                      size={16}
                      color={
                        pass.length >= 6 ? T.success || '#10B981' : T.muted
                      }
                    />
                    <Text
                      style={[
                        s.requirementText,
                        {
                          color:
                            pass.length >= 6 ? T.success || '#10B981' : T.muted,
                        },
                      ]}
                    >
                      At least 6 characters
                    </Text>
                  </View>
                </View>

                <View style={s.stepNavigation}>
                  <TouchableOpacity
                    style={[s.backBtn, { borderColor: T.cardBorder }]}
                    onPress={() => {
                      setStep(1);
                      setErrors({});
                      setTouched({});
                    }}
                  >
                    <MaterialCommunityIcons
                      name="arrow-left"
                      size={18}
                      color={T.primary}
                    />
                    <Text style={[s.backBtnText, { color: T.primary }]}>
                      Back
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.nextBtn, { backgroundColor: T.primary }]}
                    onPress={() => goStep(3, 2)}
                    activeOpacity={0.8}
                  >
                    <Text style={s.nextBtnText}>Continue</Text>
                    <MaterialCommunityIcons
                      name="arrow-right"
                      size={18}
                      color="#fff"
                      style={{ marginLeft: 8 }}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ── STEP 3: Confirm + Username ── */}
            {step === 3 && (
              <View style={s.stepContent}>
                <View style={s.stepHeader}>
                  <View
                    style={[s.stepIcon, { backgroundColor: `${T.primary}20` }]}
                  >
                    <MaterialCommunityIcons
                      name="check-circle-outline"
                      size={32}
                      color={T.primary}
                    />
                  </View>
                  <Text style={[s.stepTitle, { color: T.text }]}>
                    Almost there!
                  </Text>
                  <Text style={[s.stepSubtitle, { color: T.textSub }]}>
                    Confirm your password and pick a username
                  </Text>
                </View>

                {renderInput({
                  label: 'Confirm Password',
                  icon: 'lock-check-outline',
                  field: 'confirm',
                  value: confirm,
                  onChange: makeHandler('confirm', setConfirm),
                  placeholder: 'Re-enter your password',
                  isPassword: true,
                  inputRef: confirmRef,
                  scrollY: 50,
                  onSubmitEditing: () => usernameRef.current?.focus(),
                })}

                <TouchableOpacity
                  style={s.showPassRow}
                  onPress={() => setShowPass(!showPass)}
                  activeOpacity={0.6}
                >
                  <MaterialCommunityIcons
                    name={showPass ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={T.primary}
                  />
                  <Text
                    style={[
                      s.showPassText,
                      { color: T.primary, marginLeft: 8 },
                    ]}
                  >
                    {showPass ? 'Hide' : 'Show'} passwords
                  </Text>
                </TouchableOpacity>

                {/* Username — very last input of all */}
                {renderInput({
                  label: 'Username',
                  icon: 'at',
                  field: 'username',
                  value: username,
                  onChange: makeHandler('username', setUsername),
                  placeholder: 'janedoe',
                  inputRef: usernameRef,
                  scrollY: 160,
                  returnKeyType: 'done',
                  onSubmitEditing: handleRegister,
                })}

                {/* Availability hint */}
                {username.length >= 3 && !errors.username && (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginTop: -6,
                      marginBottom: 10,
                      paddingHorizontal: 4,
                    }}
                  >
                    <MaterialCommunityIcons
                      name="clock-check-outline"
                      size={13}
                      color={T.textSub}
                    />
                    <Text
                      style={{ fontSize: 11, color: T.textSub, marginLeft: 5 }}
                    >
                      Availability checked on submit
                    </Text>
                  </View>
                )}

                {/* Summary */}
                <View
                  style={[
                    s.summaryBox,
                    {
                      backgroundColor: `${T.primary}10`,
                      borderColor: `${T.primary}30`,
                    },
                  ]}
                >
                  {[
                    { icon: 'account', text: `${firstName} ${lastName}` },
                    { icon: 'phone', text: phone },
                    { icon: 'email-outline', text: email },
                  ].map(({ icon, text }) => (
                    <View key={icon} style={s.summaryItem}>
                      <MaterialCommunityIcons
                        name={icon}
                        size={18}
                        color={T.primary}
                      />
                      <Text style={[s.summaryLabel, { color: T.text }]}>
                        {text}
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={s.stepNavigation}>
                  <TouchableOpacity
                    style={[s.backBtn, { borderColor: T.cardBorder }]}
                    onPress={() => {
                      setStep(2);
                      setErrors({});
                      setTouched({});
                    }}
                  >
                    <MaterialCommunityIcons
                      name="arrow-left"
                      size={18}
                      color={T.primary}
                    />
                    <Text style={[s.backBtnText, { color: T.primary }]}>
                      Back
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      s.nextBtn,
                      {
                        backgroundColor: T.primary,
                        opacity: loading ? 0.7 : 1,
                      },
                    ]}
                    onPress={handleRegister}
                    activeOpacity={0.8}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Text style={s.nextBtnText}>Create Account</Text>
                        <MaterialCommunityIcons
                          name="check"
                          size={18}
                          color="#fff"
                          style={{ marginLeft: 8 }}
                        />
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Sign in footer */}
          <TouchableOpacity
            style={s.signInFooter}
            onPress={handleGoBackToLogin}
            activeOpacity={0.7}
          >
            <Text style={[s.signInFooterText, { color: T.textSub }]}>
              Already have an account?{' '}
              <Text style={{ color: T.primary, fontWeight: '700' }}>
                Sign In
              </Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: 0.5,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
  },
  headerTitle: { fontSize: 15, fontWeight: '700' },
  scroll: { paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 40 },
  progressSection: { marginBottom: 12 },
  progressInfo: { marginBottom: 6 },
  progressLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  progressTitle: { fontSize: 15, fontWeight: '700' },
  progressBar: { height: 3, borderRadius: 2 },
  progressFill: { height: '100%', borderRadius: 2 },
  contentCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  stepContent: {},
  stepHeader: { alignItems: 'center', marginBottom: 10 },
  stepIcon: {
    width: 52,
    height: 52,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  stepTitle: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  stepSubtitle: { fontSize: 12 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: Radius.md,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
  },
  errorBannerText: { fontSize: 12, flex: 1 },
  inputGroup: { marginBottom: 10 },
  inputHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  inputLabel: { fontSize: 12, fontWeight: '600' },
  inputHint: { fontSize: 11 },
  modernInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    height: 46,
  },
  modernTextInput: { flex: 1, fontSize: 14 },
  passwordRequirements: {
    marginTop: -4,
    marginBottom: 10,
    paddingHorizontal: 12,
  },
  requirement: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  requirementText: { fontSize: 11, marginLeft: 6 },
  showPassRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 10,
  },
  showPassText: { fontSize: 12, fontWeight: '600' },
  summaryBox: {
    borderRadius: Radius.lg,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  summaryItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  summaryLabel: { fontSize: 12, marginLeft: 8 },
  stepNavigation: { flexDirection: 'row', gap: 10 },
  backBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    paddingVertical: 10,
    borderWidth: 1,
  },
  backBtnText: { fontSize: 13, fontWeight: '700' },
  nextBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    paddingVertical: 12,
  },
  nextBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  signInFooter: { paddingVertical: 10, alignItems: 'center' },
  signInFooterText: { fontSize: 12 },
});
