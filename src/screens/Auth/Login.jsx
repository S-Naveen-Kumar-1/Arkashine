import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { Screen, Button, Input, Divider } from '../components/common';
import { C, SPACING, RADIUS } from '../utils/theme';
import { useAuth } from '../contexts/AuthContext';

export function LoginScreen({ navigation }) {
  const { login, isLoading } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors]     = useState({});

  const validate = () => {
    const e = {};
    if (!email.trim())    e.email    = 'Email is required';
    if (!password)        e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    const res = await login({ email: email.trim(), password });
    if (!res.success) setErrors({ general: res.error });
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo area */}
          <View style={styles.logoWrap}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoEmoji}>🔬</Text>
            </View>
            <Text style={styles.logoText}>SOILENZ</Text>
            <Text style={styles.logoSub}>Agricultural Intelligence Platform</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Welcome back</Text>
            <Text style={styles.cardSub}>Sign in to your account</Text>

            {errors.general && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>⚠️  {errors.general}</Text>
              </View>
            )}

            <Input
              label="Email Address"
              icon="📧"
              placeholder="farmer@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              error={errors.email}
            />
            <Input
              label="Password"
              icon="🔒"
              placeholder="Enter your password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              error={errors.password}
            />

            <TouchableOpacity style={styles.forgotWrap}>
              <Text style={styles.forgot}>Forgot password?</Text>
            </TouchableOpacity>

            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={isLoading}
              size="lg"
              style={{ marginTop: 8 }}
            />
          </View>

          <Divider label="or continue with" />

          {/* Social buttons */}
          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialBtn}>
              <Text style={styles.socialIcon}>G</Text>
              <Text style={styles.socialText}>Google</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialBtn}>
              <Text style={styles.socialIcon}>📱</Text>
              <Text style={styles.socialText}>Phone OTP</Text>
            </TouchableOpacity>
          </View>

          {/* Register link */}
          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.lg,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xxl,
  },
  logoWrap: { alignItems: 'center', marginBottom: SPACING.xl },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.primaryGlow,
    borderWidth: 2,
    borderColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoEmoji: { fontSize: 36 },
  logoText: {
    fontSize: 32,
    fontWeight: '900',
    color: C.white,
    letterSpacing: 4,
  },
  logoSub: { fontSize: 12, color: C.muted, marginTop: 4, letterSpacing: 1 },

  card: {
    backgroundColor: C.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: SPACING.md,
  },
  cardTitle: { fontSize: 22, fontWeight: '900', color: C.white, marginBottom: 4 },
  cardSub:   { fontSize: 13, color: C.muted, marginBottom: SPACING.lg },

  errorBanner: {
    backgroundColor: '#7F1D1D44',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: '#EF444466',
    marginBottom: SPACING.md,
  },
  errorBannerText: { color: '#FCA5A5', fontSize: 13 },

  forgotWrap: { alignItems: 'flex-end', marginBottom: 4 },
  forgot: { color: C.primary, fontSize: 12, fontWeight: '700' },

  socialRow: { flexDirection: 'row', gap: 12, marginBottom: SPACING.lg },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.card,
    borderRadius: RADIUS.md,
    padding: 13,
    gap: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  socialIcon: { fontSize: 16, fontWeight: '900', color: C.white },
  socialText: { color: C.text, fontWeight: '700', fontSize: 13 },

  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: { color: C.muted, fontSize: 13 },
  registerLink: { color: C.primary, fontSize: 13, fontWeight: '800' },
});