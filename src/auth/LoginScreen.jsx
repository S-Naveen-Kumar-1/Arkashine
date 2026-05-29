// src/screens/LoginScreen.jsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { loginUser, toggleTheme, clearAuthError } from '../redux/actions/index';
import useTheme from '../hooks/useTheme';
import { Typography, Spacing, Radius, Shadow } from '../theme';
import { showMessage } from 'react-native-flash-message';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const T = theme.colors;
  const { loading, error } = useSelector(s => s.auth);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState({});
  const [focusedInput, setFocusedInput] = useState(null);

  const usernameRef = useRef(null);
  const passwordRef = useRef(null);

  useEffect(() => {
    dispatch(clearAuthError());
  }, []);

  const validate = () => {
    const e = {};
    if (!username.trim()) e.username = 'Username is required';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Minimum 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setErrors({});
    setFocusedInput(null);
    setShowPass(false);
    dispatch(clearAuthError());
    usernameRef.current?.blur();
    passwordRef.current?.blur();
  };

  const handleLogin = async () => {
    if (!validate()) return;
    try {
      const result = await dispatch(loginUser({ username, password }));
      const data = result?.payload?.data ?? result?.payload;
      if (data?.access) {
        await AsyncStorage.setItem('token', data.access);
        await AsyncStorage.setItem('user', JSON.stringify(data));
        showMessage({ message: 'Welcome back!', type: 'success' });
        const role = data?.user?.role ?? data?.user?.user_type ?? '';
        if (role === 'soil_partner') {
          navigation.navigate('SoilPartnerTabs');
        } else {
          navigation.navigate('AppTabs');
        }
      } else {
        const msg =
          data?.detail ??
          data?.error ??
          result?.error?.message ??
          'Login failed';
        showMessage({ message: msg, type: 'danger' });
      }
    } catch (err) {
      showMessage({ message: 'Login failed', type: 'danger' });
    }
  };

  const inputBorderColor = field =>
    focusedInput === field
      ? T.primary
      : errors[field]
      ? T.red || '#EF4444'
      : T.cardBorder;

  return (
    <SafeAreaView
      style={[s.root, { backgroundColor: T.bg }]}
      edges={['top', 'bottom']}
    >
      <StatusBar barStyle={T.statusBar} backgroundColor={T.bg} />

      {/* Decorative top arc */}
      <View style={[s.topArc, { backgroundColor: T.primaryDim }]} />

      {/* Theme toggle */}
      <TouchableOpacity
        style={[
          s.themeBtn,
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

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={s.kav}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : -20}
      >
        <View style={s.inner}>
          {/* ── Brand ── */}
          <View style={s.brandSection}>
            <View
              style={[
                s.logoRing,
                { borderColor: T.primary, backgroundColor: T.primaryDim },
              ]}
            >
              <MaterialCommunityIcons
                name="sprout"
                size={36}
                color={T.primary}
              />
            </View>
            <Text style={[s.brandName, { color: T.primary }]}>Arkashine</Text>
            <Text style={[s.brandSub, { color: T.textSub }]}>
              Agriculture Intelligence
            </Text>
          </View>

          {/* ── Card ── */}
          <View
            style={[
              s.card,
              { backgroundColor: T.card, borderColor: T.cardBorder },
              Shadow.md,
            ]}
          >
            <Text style={[s.cardTitle, { color: T.text }]}>Sign In</Text>
            <Text style={[s.cardSub, { color: T.textSub }]}>
              Enter your credentials to continue
            </Text>

            {/* API error */}
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
                  size={15}
                  color={T.red || '#EF4444'}
                />
                <Text style={[s.alertText, { color: T.red || '#EF4444' }]}>
                  {error}
                </Text>
              </View>
            ) : null}

            {/* Username */}
            <View style={s.fieldWrap}>
              <Text style={[s.fieldLabel, { color: T.textSub }]}>USERNAME</Text>
              <View
                style={[
                  s.inputRow,
                  {
                    borderColor: inputBorderColor('username'),
                    backgroundColor: T.inputBg || T.surface,
                    borderWidth: focusedInput === 'username' ? 1.5 : 1,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="account-outline"
                  size={18}
                  color={focusedInput === 'username' ? T.primary : T.muted}
                  style={s.inputIcon}
                />
                <TextInput
                  ref={usernameRef}
                  style={[s.input, { color: T.text }]}
                  placeholder="your_username"
                  placeholderTextColor={T.muted}
                  value={username}
                  onChangeText={v => {
                    setUsername(v);
                    if (errors.username)
                      setErrors(p => ({ ...p, username: null }));
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => setFocusedInput('username')}
                  onBlur={() => setFocusedInput(null)}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  blurOnSubmit={false}
                />
                {username.length > 0 && !errors.username && (
                  <MaterialCommunityIcons
                    name="check-circle-outline"
                    size={16}
                    color={T.primary}
                  />
                )}
              </View>
              {errors.username ? (
                <Text style={[s.errMsg, { color: T.red || '#EF4444' }]}>
                  <MaterialCommunityIcons
                    name="alert-circle-outline"
                    size={11}
                  />{' '}
                  {errors.username}
                </Text>
              ) : null}
            </View>

            {/* Password */}
            <View style={s.fieldWrap}>
              <Text style={[s.fieldLabel, { color: T.textSub }]}>PASSWORD</Text>
              <View
                style={[
                  s.inputRow,
                  {
                    borderColor: inputBorderColor('password'),
                    backgroundColor: T.inputBg || T.surface,
                    borderWidth: focusedInput === 'password' ? 1.5 : 1,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="lock-outline"
                  size={18}
                  color={focusedInput === 'password' ? T.primary : T.muted}
                  style={s.inputIcon}
                />
                <TextInput
                  ref={passwordRef}
                  style={[s.input, { color: T.text }]}
                  placeholder="••••••••"
                  placeholderTextColor={T.muted}
                  value={password}
                  onChangeText={v => {
                    setPassword(v);
                    if (errors.password)
                      setErrors(p => ({ ...p, password: null }));
                  }}
                  secureTextEntry={!showPass}
                  onFocus={() => setFocusedInput('password')}
                  onBlur={() => setFocusedInput(null)}
                  returnKeyType="done"
                  onSubmitEditing={() => password.length >= 6 && handleLogin()}
                  blurOnSubmit={false}
                />
                <TouchableOpacity
                  onPress={() => setShowPass(!showPass)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialCommunityIcons
                    name={showPass ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={T.muted}
                  />
                </TouchableOpacity>
              </View>
              {errors.password ? (
                <Text style={[s.errMsg, { color: T.red || '#EF4444' }]}>
                  <MaterialCommunityIcons
                    name="alert-circle-outline"
                    size={11}
                  />{' '}
                  {errors.password}
                </Text>
              ) : null}
            </View>

            {/* Sign in */}
            <TouchableOpacity
              style={[
                s.signInBtn,
                { backgroundColor: T.primary, opacity: loading ? 0.75 : 1 },
              ]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.82}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <MaterialCommunityIcons
                    name="login-variant"
                    size={18}
                    color="#fff"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={s.signInBtnText}>Sign In</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Register link */}
          <View style={s.footer}>
            <View style={[s.dividerLine, { backgroundColor: T.cardBorder }]} />
            <TouchableOpacity
              style={s.footerRow}
              onPress={() => {
                navigation.navigate('RegisterScreen');
                resetForm();
              }}
              activeOpacity={0.7}
            >
              <Text style={[s.footerText, { color: T.textSub }]}>
                New to Arkashine?{' '}
              </Text>
              <Text style={[s.footerAction, { color: T.primary }]}>
                Create account →
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },

  topArc: {
    position: 'absolute',
    top: -height * 0.12,
    left: -width * 0.2,
    width: width * 1.4,
    height: height * 0.34,
    borderRadius: width * 0.7,
    opacity: 0.6,
  },

  themeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 20,
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  kav: { flex: 1 },

  inner: {
    flex: 1,
    paddingHorizontal: 22,
    justifyContent: 'center',
    gap: 20,
  },

  // Brand
  brandSection: { alignItems: 'center', gap: 6 },
  logoRing: {
    width: 72,
    height: 72,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  brandName: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  brandSub: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  // Card
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 22,
    gap: 14,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  cardSub: {
    fontSize: 13,
    marginTop: -8,
  },

  // Alert
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  alertText: { fontSize: 12, flex: 1, lineHeight: 18 },

  // Fields
  fieldWrap: { gap: 5 },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    height: 46,
    paddingHorizontal: 12,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  errMsg: {
    fontSize: 11,
    marginTop: 2,
  },

  // Sign in button
  signInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: Radius.md,
    marginTop: 2,
  },
  signInBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // Footer
  footer: { alignItems: 'center', gap: 12 },
  dividerLine: { height: 1, width: '60%', borderRadius: 4, opacity: 0.4 },
  footerRow: { flexDirection: 'row', alignItems: 'center' },
  footerText: { fontSize: 13 },
  footerAction: { fontSize: 13, fontWeight: '700' },
});
