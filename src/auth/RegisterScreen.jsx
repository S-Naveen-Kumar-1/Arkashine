// src/screens/RegisterScreen.jsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { registerUser, toggleTheme, clearAuthError } from '../redux/actions';
import useTheme from '../hooks/useTheme';
import { Spacing, Radius, Shadow } from '../theme';
import { showMessage } from 'react-native-flash-message';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

// ─── Reusable compact input ─────────────────────────────────────────────────
function Field({
  label,
  icon,
  value,
  onChange,
  placeholder,
  error,
  isFocused,
  onFocus,
  onBlur,
  secureTextEntry,
  rightEl,
  inputRef,
  returnKeyType = 'next',
  onSubmitEditing,
  keyboardType = 'default',
  T,
}) {
  return (
    <View style={f.wrap}>
      <Text style={[f.label, { color: T.textSub }]}>{label}</Text>
      <View
        style={[
          f.row,
          {
            borderColor: error
              ? T.red || '#EF4444'
              : isFocused
              ? T.primary
              : T.cardBorder,
            backgroundColor: T.inputBg || T.surface,
            borderWidth: isFocused ? 1.5 : 1,
          },
        ]}
      >
        <MaterialCommunityIcons
          name={icon}
          size={16}
          color={isFocused ? T.primary : T.muted}
          style={f.icon}
        />
        <TextInput
          ref={inputRef}
          style={[f.input, { color: T.text }]}
          placeholder={placeholder}
          placeholderTextColor={T.muted}
          value={value}
          onChangeText={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          secureTextEntry={secureTextEntry}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          blurOnSubmit={false}
          keyboardType={keyboardType}
          autoCapitalize="none"
          autoCorrect={false}
          importantForAutofill="no"
        />
        {rightEl}
      </View>
      {error ? (
        <Text style={[f.err, { color: T.red || '#EF4444' }]}>{error}</Text>
      ) : null}
    </View>
  );
}

const f = StyleSheet.create({
  wrap: { gap: 4 },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    height: 42,
    paddingHorizontal: 10,
  },
  icon: { marginRight: 8 },
  input: { flex: 1, fontSize: 13, height: '100%' },
  err: { fontSize: 10, marginTop: 2 },
});

// ─── Main screen ────────────────────────────────────────────────────────────
export default function RegisterScreen({ navigation }) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const T = theme.colors;
  const { loading, error } = useSelector(s => s.auth);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState({});
  const [focused, setFocused] = useState(null);

  const firstNameRef = useRef(null);
  const lastNameRef = useRef(null);
  const phoneRef = useRef(null);
  const emailRef = useRef(null);
  const usernameRef = useRef(null);
  const passRef = useRef(null);
  const confirmRef = useRef(null);

  useEffect(() => {
    dispatch(clearAuthError());
  }, []);

  const validateAll = () => {
    const e = {};
    if (!firstName.trim()) e.firstName = 'Required';
    if (!lastName.trim()) e.lastName = 'Required';
    const phoneRe =
      /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
    if (!phoneRe.test(phone.replace(/\s/g, ''))) e.phone = 'Invalid phone';
    if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Invalid email';
    if (!username.trim()) e.username = 'Required';
    else if (username.length < 3) e.username = 'Min 3 chars';
    if (pass.length < 6) e.pass = 'Min 6 chars';
    if (pass !== confirm) e.confirm = 'Passwords mismatch';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validateAll()) return;
    const res = await dispatch(
      registerUser({
        username,
        password: pass,
        email,
        first_name: firstName,
        last_name: lastName,
        phone,
      }),
    );
    if (res.payload?.data?.access) {
      await AsyncStorage.setItem('token', res.payload.data.access);
      await AsyncStorage.setItem('user', JSON.stringify(res.payload.data));
      showMessage({ message: 'Account created!', type: 'success' });
      navigation.navigate('AppTabs');
    } else {
      showMessage({
        message: res.payload?.error || 'Registration failed',
        type: 'danger',
      });
    }
  };

  const resetAndGoBack = () => {
    setFirstName('');
    setLastName('');
    setPhone('');
    setEmail('');
    setUsername('');
    setPass('');
    setConfirm('');
    setErrors({});
    setFocused(null);
    setShowPass(false);
    dispatch(clearAuthError());
    navigation.goBack();
  };

  const eyeToggle = (
    <TouchableOpacity
      onPress={() => setShowPass(!showPass)}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <MaterialCommunityIcons
        name={showPass ? 'eye-off-outline' : 'eye-outline'}
        size={16}
        color={T.muted}
      />
    </TouchableOpacity>
  );

  const strengthColor =
    pass.length === 0
      ? T.cardBorder
      : pass.length < 6
      ? T.red || '#EF4444'
      : pass.length < 10
      ? T.warning || '#F59E0B'
      : T.primary;

  const strengthWidth =
    pass.length === 0 ? 0 : pass.length < 6 ? 30 : pass.length < 10 ? 65 : 100;

  return (
    <SafeAreaView
      style={[s.root, { backgroundColor: T.bg }]}
      edges={['top', 'bottom']}
    >
      <StatusBar barStyle={T.statusBar} backgroundColor={T.bg} />

      {/* Decorative blob */}
      <View style={[s.blob, { backgroundColor: T.primaryDim }]} />

      {/* Header */}
      <View style={[s.header, { borderBottomColor: T.cardBorder }]}>
        <TouchableOpacity
          style={[
            s.headerIconBtn,
            { backgroundColor: T.card, borderColor: T.cardBorder },
          ]}
          onPress={resetAndGoBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={20}
            color={T.primary}
          />
        </TouchableOpacity>

        <View style={s.headerCenter}>
          <MaterialCommunityIcons name="sprout" size={18} color={T.primary} />
          <Text style={[s.headerTitle, { color: T.text }]}>Create Account</Text>
        </View>

        <TouchableOpacity
          style={[
            s.headerIconBtn,
            { backgroundColor: T.card, borderColor: T.cardBorder },
          ]}
          onPress={() => dispatch(toggleTheme())}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons
            name={theme.dark ? 'white-balance-sunny' : 'moon-waning-crescent'}
            size={18}
            color={T.primary}
          />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={s.kav}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : -10}
      >
        <View style={s.body}>
          {/* API error banner */}
          {error ? (
            <View
              style={[
                s.alertBox,
                {
                  backgroundColor: 'rgba(239,68,68,0.08)',
                  borderColor: T.red || '#EF4444',
                },
              ]}
            >
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={14}
                color={T.red || '#EF4444'}
              />
              <Text style={[s.alertText, { color: T.red || '#EF4444' }]}>
                {error}
              </Text>
            </View>
          ) : null}

          {/* Card */}
          <View
            style={[
              s.card,
              { backgroundColor: T.card, borderColor: T.cardBorder },
              Shadow.md,
            ]}
          >
            {/* Row 1: First + Last name */}
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Field
                  label="FIRST NAME"
                  icon="account-outline"
                  value={firstName}
                  onChange={v => {
                    setFirstName(v);
                    if (errors.firstName)
                      setErrors(p => ({ ...p, firstName: null }));
                  }}
                  placeholder="First"
                  error={errors.firstName}
                  isFocused={focused === 'firstName'}
                  onFocus={() => setFocused('firstName')}
                  onBlur={() => setFocused(null)}
                  inputRef={firstNameRef}
                  onSubmitEditing={() => lastNameRef.current?.focus()}
                  T={T}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="LAST NAME"
                  icon="account-outline"
                  value={lastName}
                  onChange={v => {
                    setLastName(v);
                    if (errors.lastName)
                      setErrors(p => ({ ...p, lastName: null }));
                  }}
                  placeholder="Last"
                  error={errors.lastName}
                  isFocused={focused === 'lastName'}
                  onFocus={() => setFocused('lastName')}
                  onBlur={() => setFocused(null)}
                  inputRef={lastNameRef}
                  onSubmitEditing={() => phoneRef.current?.focus()}
                  T={T}
                />
              </View>
            </View>

            {/* Row 2: Phone + Email */}
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Field
                  label="PHONE"
                  icon="phone-outline"
                  value={phone}
                  onChange={v => {
                    setPhone(v);
                    if (errors.phone) setErrors(p => ({ ...p, phone: null }));
                  }}
                  placeholder="+91 98765..."
                  error={errors.phone}
                  isFocused={focused === 'phone'}
                  onFocus={() => setFocused('phone')}
                  onBlur={() => setFocused(null)}
                  inputRef={phoneRef}
                  keyboardType="phone-pad"
                  returnKeyType="done"
                  onSubmitEditing={() => emailRef.current?.focus()}
                  T={T}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="EMAIL"
                  icon="email-outline"
                  value={email}
                  onChange={v => {
                    setEmail(v);
                    if (errors.email) setErrors(p => ({ ...p, email: null }));
                  }}
                  placeholder="you@example.com"
                  error={errors.email}
                  isFocused={focused === 'email'}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                  inputRef={emailRef}
                  keyboardType="email-address"
                  onSubmitEditing={() => usernameRef.current?.focus()}
                  T={T}
                />
              </View>
            </View>

            {/* Username */}
            <Field
              label="USERNAME"
              icon="at"
              value={username}
              onChange={v => {
                setUsername(v);
                if (errors.username) setErrors(p => ({ ...p, username: null }));
              }}
              placeholder="your_username"
              error={errors.username}
              isFocused={focused === 'username'}
              onFocus={() => setFocused('username')}
              onBlur={() => setFocused(null)}
              inputRef={usernameRef}
              onSubmitEditing={() => passRef.current?.focus()}
              T={T}
            />

            {/* Divider */}
            <View style={[s.divider, { backgroundColor: T.cardBorder }]} />

            {/* Row 3: Password + Confirm */}
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Field
                  label="PASSWORD"
                  icon="lock-outline"
                  value={pass}
                  onChange={v => {
                    setPass(v);
                    if (errors.pass) setErrors(p => ({ ...p, pass: null }));
                  }}
                  placeholder="Min 6 chars"
                  error={errors.pass}
                  isFocused={focused === 'pass'}
                  onFocus={() => setFocused('pass')}
                  onBlur={() => setFocused(null)}
                  secureTextEntry={!showPass}
                  rightEl={eyeToggle}
                  inputRef={passRef}
                  returnKeyType="next"
                  onSubmitEditing={() => confirmRef.current?.focus()}
                  T={T}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="CONFIRM"
                  icon="lock-check-outline"
                  value={confirm}
                  onChange={v => {
                    setConfirm(v);
                    if (errors.confirm)
                      setErrors(p => ({ ...p, confirm: null }));
                  }}
                  placeholder="Re-enter"
                  error={errors.confirm}
                  isFocused={focused === 'confirm'}
                  onFocus={() => setFocused('confirm')}
                  onBlur={() => setFocused(null)}
                  secureTextEntry={!showPass}
                  rightEl={
                    confirm.length > 0 ? (
                      <MaterialCommunityIcons
                        name={
                          pass === confirm
                            ? 'check-circle-outline'
                            : 'close-circle-outline'
                        }
                        size={16}
                        color={
                          pass === confirm ? T.primary : T.red || '#EF4444'
                        }
                      />
                    ) : null
                  }
                  inputRef={confirmRef}
                  returnKeyType="done"
                  onSubmitEditing={handleRegister}
                  T={T}
                />
              </View>
            </View>

            {/* Strength bar */}
            {pass.length > 0 && (
              <View style={s.strengthWrap}>
                <View
                  style={[s.strengthTrack, { backgroundColor: T.cardBorder }]}
                >
                  <View
                    style={[
                      s.strengthFill,
                      {
                        width: `${strengthWidth}%`,
                        backgroundColor: strengthColor,
                      },
                    ]}
                  />
                </View>
                <Text style={[s.strengthLabel, { color: strengthColor }]}>
                  {pass.length < 6
                    ? 'Weak'
                    : pass.length < 10
                    ? 'Good'
                    : 'Strong'}
                </Text>
              </View>
            )}

            {/* Submit */}
            <TouchableOpacity
              style={[
                s.submitBtn,
                { backgroundColor: T.primary, opacity: loading ? 0.75 : 1 },
              ]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.82}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <MaterialCommunityIcons
                    name="account-plus-outline"
                    size={18}
                    color="#fff"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={s.submitBtnText}>Create Account</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Sign in footer */}
          <TouchableOpacity
            style={s.signinLink}
            onPress={resetAndGoBack}
            activeOpacity={0.7}
          >
            <Text style={[s.signinText, { color: T.textSub }]}>
              Already have an account?{'  '}
              <Text style={{ color: T.primary, fontWeight: '700' }}>
                Sign In →
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },

  blob: {
    position: 'absolute',
    bottom: -height * 0.1,
    right: -width * 0.2,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    opacity: 0.35,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  headerIconBtn: {
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.1,
  },

  kav: { flex: 1 },

  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    justifyContent: 'center',
    gap: 12,
  },

  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  alertText: { fontSize: 12, flex: 1 },

  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10,
  },

  row: {
    flexDirection: 'row',
    gap: 10,
  },

  divider: {
    height: 0.5,
    marginVertical: 2,
  },

  // Strength bar
  strengthWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: -4,
  },
  strengthTrack: {
    flex: 1,
    height: 3,
    borderRadius: 4,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 4,
  },
  strengthLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    width: 38,
    textAlign: 'right',
  },

  // Submit button
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderRadius: Radius.md,
    marginTop: 2,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // Sign in link
  signinLink: { alignItems: 'center', paddingVertical: 4 },
  signinText: { fontSize: 13 },
});
