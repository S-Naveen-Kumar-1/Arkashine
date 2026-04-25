import React, { useState, useRef } from 'react';
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
import { registerUser, toggleTheme } from '../store/actions';
import useTheme from '../hooks/useTheme';
import { Typography, Spacing, Radius, Shadow } from '../theme';

export default function RegisterScreen({ navigation }) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const T = theme.colors;
  const { loading, error } = useSelector(s => s.auth);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [focusedInput, setFocusedInput] = useState(null);
  const [step, setStep] = useState(1);

  // Refs for keyboard navigation
  const nameRef = useRef(null);
  const phoneRef = useRef(null);
  const emailRef = useRef(null);
  const passRef = useRef(null);
  const confirmRef = useRef(null);
  const scrollViewRef = useRef(null);

  const validateField = (fieldName, value) => {
    switch (fieldName) {
      case 'name':
        return value.trim() ? null : 'Full name is required';
      case 'phone':
        const phoneRegex =
          /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
        return phoneRegex.test(value.replace(/\s/g, ''))
          ? null
          : 'Valid phone number is required';
      case 'email':
        return /\S+@\S+\.\S+/.test(value) ? null : 'Valid email is required';
      case 'pass':
        return value.length >= 6
          ? null
          : 'Password must be at least 6 characters';
      case 'confirm':
        return value === pass ? null : 'Passwords do not match';
      default:
        return null;
    }
  };

  const handleNameChange = value => {
    setName(value);
    if (touched.name) {
      const error = validateField('name', value);
      setErrors(prev => ({ ...prev, name: error }));
    }
  };

  const handlePhoneChange = value => {
    setPhone(value);
    if (touched.phone) {
      const error = validateField('phone', value);
      setErrors(prev => ({ ...prev, phone: error }));
    }
  };

  const handleEmailChange = value => {
    setEmail(value);
    if (touched.email) {
      const error = validateField('email', value);
      setErrors(prev => ({ ...prev, email: error }));
    }
  };

  const handlePassChange = value => {
    setPass(value);
    if (touched.pass) {
      const error = validateField('pass', value);
      setErrors(prev => ({ ...prev, pass: error }));
    }
    if (touched.confirm && confirm) {
      const confirmError = value === confirm ? null : 'Passwords do not match';
      setErrors(prev => ({ ...prev, confirm: confirmError }));
    }
  };

  const handleConfirmChange = value => {
    setConfirm(value);
    if (touched.confirm) {
      const error = validateField('confirm', value);
      setErrors(prev => ({ ...prev, confirm: error }));
    }
  };

  const handleInputBlur = fieldName => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    const value =
      fieldName === 'name'
        ? name
        : fieldName === 'phone'
        ? phone
        : fieldName === 'email'
        ? email
        : fieldName === 'pass'
        ? pass
        : confirm;
    const error = validateField(fieldName, value);
    setErrors(prev => ({ ...prev, [fieldName]: error }));
  };

  const validateStep = stepNum => {
    const e = {};
    if (stepNum === 1) {
      if (!name.trim()) e.name = 'Full name is required';
      if (!phone.trim()) e.phone = 'Phone number is required';
      const phoneRegex =
        /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
      if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
        e.phone = 'Valid phone number is required';
      }
    } else if (stepNum === 2) {
      if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Valid email is required';
      if (pass.length < 6) e.pass = 'Password must be at least 6 characters';
    } else if (stepNum === 3) {
      if (pass !== confirm) e.confirm = 'Passwords do not match';
    }
    return e;
  };

  const handleStep1Continue = () => {
    const e = validateStep(1);
    if (Object.keys(e).length > 0) {
      setErrors(e);
      setTouched({ name: true, phone: true });
      return;
    }
    setErrors({});
    setTouched({});
    setStep(2);
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }, 300);
  };

  const handleStep2Continue = () => {
    const e = validateStep(2);
    if (Object.keys(e).length > 0) {
      setErrors(e);
      setTouched({ email: true, pass: true });
      return;
    }
    setErrors({});
    setTouched({});
    setStep(3);
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }, 300);
  };

  const handleRegister = () => {
    const e = validateStep(3);
    if (Object.keys(e).length > 0) {
      setErrors(e);
      setTouched({ confirm: true });
      return;
    }
    console.log('Registering user:', { name, phone, email, pass });
    dispatch(registerUser(name, email, pass, phone));
  };

  // Keyboard navigation handlers
  const handleNameSubmit = () => {
    phoneRef.current?.focus();
  };

  const handlePhoneSubmit = () => {
    if (step === 1) {
      handleStep1Continue();
    }
  };

  const handleEmailSubmit = () => {
    passRef.current?.focus();
  };

  const handlePassSubmit = () => {
    confirmRef.current?.focus();
  };

  const handleConfirmSubmit = () => {
    if (step === 3) {
      handleRegister();
    }
  };

  const handleInputFocus = (inputName, scrollY) => {
    setFocusedInput(inputName);
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: scrollY,
        animated: true,
      });
    }, 200);
  };

  const progressPercentage = (step / 3) * 100;

  const renderStepInput = (
    label,
    icon,
    value,
    onChange,
    onBlur,
    placeholder,
    error,
    keyboardType = 'default',
    isPassword = false,
    returnKeyType = 'next',
    onSubmitEditing,
    scrollY,
    inputRef,
  ) => {
    const isValid = value.length > 0 && !error;

    return (
      <View style={s.inputGroup}>
        <View style={s.inputHeader}>
          <View style={[s.iconBox, { backgroundColor: `${T.primary}15` }]}>
            <MaterialCommunityIcons name={icon} size={20} color={T.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.inputLabel, { color: T.text }]}>{label}</Text>
            {error && (
              <Text
                style={[
                  s.inputHint,
                  { color: error ? T.error || '#EF4444' : T.textSub },
                ]}
              >
                {` ${error}`}
              </Text>
            )}
          </View>
        </View>
        <View
          style={[
            s.modernInput,
            {
              borderColor: error
                ? T.error || '#EF4444'
                : isValid
                ? T.success || '#10B981'
                : focusedInput === label
                ? T.primary
                : T.cardBorder,
              backgroundColor:
                focusedInput === label ? `${T.primary}08` : T.inputBg || T.card,
              borderWidth: error || focusedInput === label ? 2 : 1,
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
            onFocus={() => handleInputFocus(label, scrollY)}
            onBlur={() => {
              setFocusedInput(null);
              onBlur(label);
            }}
            keyboardType={keyboardType}
            secureTextEntry={isPassword && !showPass}
            returnKeyType={returnKeyType}
            onSubmitEditing={onSubmitEditing}
            blurOnSubmit={false}
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

  return (
    <SafeAreaView style={[s.bg, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.bg} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Minimal Header */}
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
          scrollEnabled={true}
          bounces={false}
        >
          {/* Progress Section */}
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

          {/* Main Content Card */}
          <View
            style={[
              s.contentCard,
              { backgroundColor: T.card, borderColor: T.cardBorder },
              Shadow.lg,
            ]}
          >
            {/* Error Banner */}
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

            {/* Step 1: Personal Info */}
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
                    We'll use this information to personalize your experience
                  </Text>
                </View>

                {renderStepInput(
                  'Full Name',
                  'account',
                  name,
                  handleNameChange,
                  handleInputBlur,
                  'Your Full Name',
                  errors.name,
                  'default',
                  false,
                  'next',
                  handleNameSubmit,
                  50,
                  nameRef,
                )}

                {renderStepInput(
                  'Phone Number',
                  'phone',
                  phone,
                  handlePhoneChange,
                  handleInputBlur,
                  'Your Phone Number',
                  errors.phone,
                  'phone-pad',
                  false,
                  'done',
                  handlePhoneSubmit,
                  100,
                  phoneRef,
                )}

                <TouchableOpacity
                  style={[s.nextBtn, { backgroundColor: T.primary }]}
                  onPress={handleStep1Continue}
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

            {/* Step 2: Email & Password */}
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

                {renderStepInput(
                  'Email Address',
                  'email-outline',
                  email,
                  handleEmailChange,
                  handleInputBlur,
                  'you@example.com',
                  errors.email,
                  'email-address',
                  false,
                  'next',
                  handleEmailSubmit,
                  50,
                  emailRef,
                )}

                {renderStepInput(
                  'Password',
                  'lock-outline',
                  pass,
                  handlePassChange,
                  handleInputBlur,
                  'Min 6 characters',
                  errors.pass,
                  'default',
                  true,
                  'next',
                  handlePassSubmit,
                  100,
                  passRef,
                )}

                <View style={s.passwordRequirements}>
                  <View
                    style={[
                      s.requirement,
                      {
                        opacity: pass.length >= 6 ? 1 : 0.5,
                      },
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
                      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
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
                    onPress={handleStep2Continue}
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

            {/* Step 3: Confirmation */}
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
                    Verify your password
                  </Text>
                  <Text style={[s.stepSubtitle, { color: T.textSub }]}>
                    Make sure your passwords match
                  </Text>
                </View>

                {renderStepInput(
                  'Confirm Password',
                  'lock-check-outline',
                  confirm,
                  handleConfirmChange,
                  handleInputBlur,
                  'Re-enter your password',
                  errors.confirm,
                  'default',
                  true,
                  'done',
                  handleConfirmSubmit,
                  50,
                  confirmRef,
                )}

                <TouchableOpacity
                  style={s.showPassRow}
                  onPress={() => setShowPass(!showPass)}
                  activeOpacity={0.6}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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
                  <View style={s.summaryItem}>
                    <MaterialCommunityIcons
                      name="account"
                      size={18}
                      color={T.primary}
                    />
                    <Text style={[s.summaryLabel, { color: T.text }]}>
                      {name || 'Your name'}
                    </Text>
                  </View>
                  <View style={s.summaryItem}>
                    <MaterialCommunityIcons
                      name="phone"
                      size={18}
                      color={T.primary}
                    />
                    <Text style={[s.summaryLabel, { color: T.text }]}>
                      {phone || 'Your phone'}
                    </Text>
                  </View>
                  <View style={s.summaryItem}>
                    <MaterialCommunityIcons
                      name="email"
                      size={18}
                      color={T.primary}
                    />
                    <Text style={[s.summaryLabel, { color: T.text }]}>
                      {email || 'Your email'}
                    </Text>
                  </View>
                </View>

                <View style={s.stepNavigation}>
                  <TouchableOpacity
                    style={[s.backBtn, { borderColor: T.cardBorder }]}
                    onPress={() => {
                      setStep(2);
                      setErrors({});
                      setTouched({});
                      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
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

          {/* Sign In Link */}
          <TouchableOpacity
            style={s.signInFooter}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={[s.signInFooterText, { color: T.textSub }]}>
              Already have an account?{' '}
              <Text style={{ color: T.primary, fontWeight: '700' }}>
                Sign In
              </Text>
            </Text>
          </TouchableOpacity>

          {/* Terms */}
          <View style={s.termsSection}>
            <MaterialCommunityIcons
              name="shield-check-outline"
              size={14}
              color={T.primary}
            />
            <Text style={[s.termsText, { color: T.muted }]}>
              {' '}
              Your data is encrypted and secure
            </Text>
          </View>
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 0.5,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    paddingBottom: 80,
  },
  progressSection: {
    marginBottom: Spacing.xl,
  },
  progressInfo: {
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  contentCard: {
    borderRadius: Radius.xl,
    borderWidth: 0.5,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  stepContent: {},
  stepHeader: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  stepIcon: {
    width: 72,
    height: 72,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  stepSubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: Spacing.lg,
    borderWidth: 1,
  },
  errorBannerText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  inputHint: {
    fontSize: 12,
    fontWeight: '400',
  },
  modernInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 0,
    height: 52,
  },
  modernTextInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    paddingVertical: 0,
  },
  passwordRequirements: {
    marginTop: -8,
    marginBottom: Spacing.lg,
    paddingHorizontal: 14,
  },
  requirement: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  requirementText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 8,
  },
  showPassRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: Spacing.lg,
  },
  showPassText: {
    fontSize: 13,
    fontWeight: '600',
  },
  summaryBox: {
    borderRadius: Radius.lg,
    padding: 14,
    marginBottom: Spacing.lg,
    borderWidth: 1,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 10,
  },
  stepNavigation: {
    flexDirection: 'row',
    gap: 12,
  },
  backBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    paddingVertical: 12,
    borderWidth: 1.5,
    gap: 6,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  nextBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 6,
  },
  nextBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  signInFooter: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  signInFooterText: {
    fontSize: 13,
    fontWeight: '500',
  },
  termsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: 40,
  },
  termsText: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});
