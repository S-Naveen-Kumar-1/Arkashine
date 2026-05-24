// src/screens/LoginScreen.jsx

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { loginUser, toggleTheme, clearAuthError } from '../redux/actions/index';
import useTheme from '../hooks/useTheme';
import { Typography, Spacing, Radius, Shadow } from '../theme';
import { showMessage } from 'react-native-flash-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  const scrollViewRef = useRef(null);

  useEffect(() => {
    dispatch(clearAuthError());
  }, []);

  const validate = () => {
    const e = {};
    if (!username.trim()) e.username = 'Please enter username';
    if (!password) e.password = 'Please enter password';
    else if (password.length < 6)
      e.password = 'Password must be at least 6 characters';
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

  // FIX: removed the erroneous navigation.navigate('AppTabs') before validation.
  // Now only navigates on confirmed successful login (access token present).
  const handleLogin = async () => {
    if (!validate()) return;

    try {
      const result = await dispatch(loginUser({ username, password }));
      const data = result?.payload?.data ?? result?.payload;

      if (data?.access) {
        // SAVE LOGIN DATA
        await AsyncStorage.setItem('token', data.access);
        await AsyncStorage.setItem('user', JSON.stringify(data));

        showMessage({
          message: 'Welcome back!',
          type: 'success',
        });

        const role = data?.user?.role ?? data?.user?.user_type ?? '';
        if (role === 'soil_partner' ) {
          navigation.navigate('SoilPartnerTabs'); // your soil partner tab navigator
        } else {
          navigation.navigate('AppTabs');
        }
      } else {
        const msg =
          data?.detail ??
          data?.error ??
          result?.error?.message ??
          'Login failed';

        showMessage({
          message: msg,
          type: 'danger',
        });
      }
    } catch (err) {
      console.log('Login error:', err);
      showMessage({
        message: 'Login failed',
        type: 'danger',
      });
    }
  };
  const handleInputFocus = (inputName, scrollY) => {
    setFocusedInput(inputName);
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: scrollY, animated: true });
    }, 200);
  };

  return (
    <SafeAreaView style={[s.bg, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.bg} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Theme toggle */}
          <TouchableOpacity
            style={[
              s.themeBtn,
              { backgroundColor: T.card, borderColor: T.cardBorder },
            ]}
            onPress={() => dispatch(toggleTheme())}
          >
            <MaterialCommunityIcons
              name={theme.dark ? 'white-balance-sunny' : 'moon-waning-crescent'}
              size={20}
              color={T.primary}
            />
          </TouchableOpacity>

          {/* Logo */}
          <View style={s.logoWrap}>
            <View
              style={[
                s.logoCircle,
                { backgroundColor: T.primaryDim, borderColor: T.primary },
              ]}
            >
              <MaterialCommunityIcons name="leaf" size={52} color={T.primary} />
            </View>
            <Text
              style={[
                Typography.h1,
                { color: T.primary, marginTop: 20, letterSpacing: 0.5 },
              ]}
            >
              Arkashine
            </Text>
            <Text style={[s.tagline, { color: T.textSub }]}>
              Agriculture Intelligence
            </Text>
          </View>

          {/* Card */}
          <View
            style={[
              s.card,
              { backgroundColor: T.card, borderColor: T.cardBorder },
              Shadow.lg,
            ]}
          >
            <Text style={[Typography.h3, { color: T.text }]}>Welcome Back</Text>
            <Text style={[s.cardSub, { color: T.textSub }]}>
              Sign in to your account
            </Text>

            {/* API error banner */}
            {error ? (
              <View
                style={[
                  s.errorBanner,
                  {
                    borderColor: T.error || '#EF4444',
                    backgroundColor: 'rgba(239,68,68,0.1)',
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="alert-circle"
                  size={18}
                  color={T.error || '#EF4444'}
                />
                <Text
                  style={[
                    s.errorText,
                    { color: T.error || '#EF4444', marginLeft: 10 },
                  ]}
                >
                  {error}
                </Text>
              </View>
            ) : null}

            {/* Username */}
            <View style={s.inputGroup}>
              <View style={s.inputLabelRow}>
                <MaterialCommunityIcons
                  name="account"
                  size={16}
                  color={T.primary}
                />
                <Text style={[s.label, { color: T.text, marginLeft: 8 }]}>
                  Username
                </Text>
              </View>
              <View
                style={[
                  s.inputContainer,
                  {
                    borderColor:
                      focusedInput === 'username'
                        ? T.primary
                        : errors.username
                        ? T.error || '#EF4444'
                        : T.cardBorder,
                    backgroundColor: T.inputBg || T.card,
                    borderWidth: focusedInput === 'username' ? 2 : 1,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="account-outline"
                  size={20}
                  color={focusedInput === 'username' ? T.primary : T.textSub}
                  style={{ marginRight: 12 }}
                />
                <TextInput
                  ref={usernameRef}
                  style={[s.textInput, { color: T.text }]}
                  placeholder="Enter your username"
                  placeholderTextColor={T.textSub}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => handleInputFocus('username', 80)}
                  onBlur={() => setFocusedInput(null)}
                  returnKeyType="next"
                  onSubmitEditing={() =>
                    username.trim() && passwordRef.current?.focus()
                  }
                  blurOnSubmit={false}
                />
              </View>
              {errors.username && (
                <Text
                  style={[
                    s.errorMsg,
                    { color: T.error || '#EF4444', marginTop: 6 },
                  ]}
                >
                  {errors.username}
                </Text>
              )}
            </View>

            {/* Password */}
            <View style={[s.inputGroup, { marginTop: Spacing.lg }]}>
              <View style={s.inputLabelRow}>
                <MaterialCommunityIcons
                  name="lock"
                  size={16}
                  color={T.primary}
                />
                <Text style={[s.label, { color: T.text, marginLeft: 8 }]}>
                  Password
                </Text>
              </View>
              <View
                style={[
                  s.inputContainer,
                  {
                    borderColor:
                      focusedInput === 'password'
                        ? T.primary
                        : errors.password
                        ? T.error || '#EF4444'
                        : T.cardBorder,
                    backgroundColor: T.inputBg || T.card,
                    borderWidth: focusedInput === 'password' ? 2 : 1,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="lock-outline"
                  size={20}
                  color={focusedInput === 'password' ? T.primary : T.textSub}
                  style={{ marginRight: 12 }}
                />
                <TextInput
                  ref={passwordRef}
                  style={[s.textInput, { color: T.text }]}
                  placeholder="Enter your password"
                  placeholderTextColor={T.textSub}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPass}
                  onFocus={() => handleInputFocus('password', 150)}
                  onBlur={() => setFocusedInput(null)}
                  returnKeyType="done"
                  onSubmitEditing={() => password.length >= 6 && handleLogin()}
                  blurOnSubmit={false}
                />
                <TouchableOpacity
                  onPress={() => setShowPass(!showPass)}
                  style={s.eyeBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialCommunityIcons
                    name={showPass ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={T.textSub}
                  />
                </TouchableOpacity>
              </View>
              {errors.password && (
                <Text
                  style={[
                    s.errorMsg,
                    { color: T.error || '#EF4444', marginTop: 6 },
                  ]}
                >
                  {errors.password}
                </Text>
              )}
            </View>

            {/* Sign in button */}
            <TouchableOpacity
              style={[
                s.signInBtn,
                { backgroundColor: T.primary, opacity: loading ? 0.7 : 1 },
              ]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <MaterialCommunityIcons
                    name="login-variant"
                    size={20}
                    color="#fff"
                    style={{ marginRight: 10 }}
                  />
                  <Text style={s.signInText}>Sign In</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={[s.divider, { backgroundColor: T.cardBorder }]} />

            <TouchableOpacity
              style={s.registerLinkRow}
              onPress={() => {
                navigation.navigate('RegisterScreen');
                resetForm();
              }}
              activeOpacity={0.7}
            >
              <Text style={[s.registerText, { color: T.textSub }]}>
                Don't have an account?{' '}
              </Text>
              <Text style={[s.registerAction, { color: T.primary }]}>
                Create one
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 16, paddingVertical: 12 },

  themeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    ...Shadow.sm,
  },

  logoWrap: { alignItems: 'center', marginBottom: 18 },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagline: { fontSize: 13, marginTop: 6, letterSpacing: 0.2 },

  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  cardSub: { fontSize: 13, marginBottom: 10 },

  errorBanner: {
    borderRadius: Radius.md,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: { fontSize: 13, flex: 1 },

  inputGroup: { marginBottom: 10 },
  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: { fontSize: 12, fontWeight: '600' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    height: 46,
  },
  textInput: { flex: 1, fontSize: 14 },
  eyeBtn: { padding: 6, marginRight: -6 },
  errorMsg: { fontSize: 11 },

  signInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    paddingVertical: 12,
    marginTop: Spacing.lg,
    marginBottom: 10,
  },
  signInText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  divider: { height: 1, marginVertical: 10 },
  registerLinkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: { fontSize: 12 },
  registerAction: { fontSize: 12, fontWeight: '700' },
});
