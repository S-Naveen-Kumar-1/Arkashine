import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Screen, Button, Input, ScreenHeader } from '../components/common';
import { C, SPACING, RADIUS } from '../utils/theme';
import { useAuth } from '../contexts/AuthContext';

const ROLES = ['Farmer', 'Agriculture Officer', 'Researcher', 'Distributor'];

export function RegisterScreen({ navigation }) {
  const { register, isLoading } = useAuth();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirm: '',
    role: 'Farmer',
  });
  const [errors, setErrors] = useState({});

  const set = key => val => setForm(f => ({ ...f, [key]: val }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    if (!form.phone.trim()) e.phone = 'Phone is required';
    if (!form.password) e.password = 'Password required (min 6 chars)';
    else if (form.password.length < 6) e.password = 'Min 6 characters';
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    const res = await register({
      name: form.name,
      email: form.email,
      phone: form.phone,
      password: form.password,
    });
    if (!res.success) setErrors({ general: res.error });
  };

  return (
    <Screen>
      <ScreenHeader
        title="Create Account"
        subtitle="Join the SOILENZ platform"
        onBack={() => navigation.goBack()}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Role selector */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>I am a...</Text>
            <View style={styles.roleRow}>
              {ROLES.map(role => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.roleChip,
                    form.role === role && styles.roleChipActive,
                  ]}
                  onPress={() => set('role')(role)}
                >
                  <Text
                    style={[
                      styles.roleChipText,
                      form.role === role && styles.roleChipTextActive,
                    ]}
                  >
                    {role}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Form */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Personal Info</Text>

            {errors.general && (
              <View style={styles.errorBanner}>
                <Text style={{ color: '#FCA5A5', fontSize: 13 }}>
                  ⚠️ {errors.general}
                </Text>
              </View>
            )}

            <Input
              label="Full Name"
              icon="👤"
              placeholder="e.g., Rajesh Kumar"
              value={form.name}
              onChangeText={set('name')}
              error={errors.name}
            />
            <Input
              label="Phone Number"
              icon="📱"
              placeholder="+91 98765 43210"
              keyboardType="phone-pad"
              value={form.phone}
              onChangeText={set('phone')}
              error={errors.phone}
            />
            <Input
              label="Email Address"
              icon="📧"
              placeholder="farmer@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={form.email}
              onChangeText={set('email')}
              error={errors.email}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Set Password</Text>
            <Input
              label="Password"
              icon="🔒"
              placeholder="Min. 6 characters"
              secureTextEntry
              value={form.password}
              onChangeText={set('password')}
              error={errors.password}
            />
            <Input
              label="Confirm Password"
              icon="🔑"
              placeholder="Re-enter password"
              secureTextEntry
              value={form.confirm}
              onChangeText={set('confirm')}
              error={errors.confirm}
            />
          </View>

          <Button
            title="Create Account"
            onPress={handleRegister}
            loading={isLoading}
            size="lg"
            icon="✅"
          />

          <View style={styles.termsRow}>
            <Text style={styles.termsText}>
              By registering, you agree to our{' '}
              <Text style={{ color: C.primary }}>Terms of Service</Text> and{' '}
              <Text style={{ color: C.primary }}>Privacy Policy</Text>
            </Text>
          </View>

          <View style={styles.loginRow}>
            <Text style={{ color: C.muted, fontSize: 13 }}>
              Already have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text
                style={{ color: C.primary, fontSize: 13, fontWeight: '800' }}
              >
                Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  card: {
    backgroundColor: C.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: SPACING.md,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: C.white,
    marginBottom: SPACING.md,
  },
  sectionLabel: {
    fontSize: 13,
    color: C.muted,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: C.bgAlt,
    borderWidth: 1,
    borderColor: C.borderLight,
  },
  roleChipActive: { backgroundColor: C.primaryGlow, borderColor: C.primary },
  roleChipText: { color: C.muted, fontSize: 12, fontWeight: '700' },
  roleChipTextActive: { color: C.primary },
  errorBanner: {
    backgroundColor: '#7F1D1D44',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: '#EF444466',
    marginBottom: SPACING.md,
  },
  termsRow: { marginTop: SPACING.sm, marginBottom: SPACING.md },
  termsText: {
    color: C.muted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  loginRow: { flexDirection: 'row', justifyContent: 'center' },
});
