import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Keyboard,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch, useSelector } from 'react-redux';
import { forgotPassword } from '../../redux/actions';
import useTheme from '../../hooks/useTheme';
import { Spacing, Radius, Typography, Shadow } from '../../theme';

export default function ForgotPasswordScreen({ navigation }) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const T = theme.colors;

  const user = useSelector(s => s.auth.user);
  const loading = useSelector(s => s.auth.loading);

  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);

  const username = user?.username ?? '';
  const email =
    user?.email ?? (user?.username ? `${user.username}@soilenz.in` : '');

  const handleSubmit = async () => {
    Keyboard.dismiss();
    if (!phone.trim()) {
      Alert.alert('Phone Required', 'Please enter your phone number.');
      return;
    }
    if (!message.trim()) {
      Alert.alert('Message Required', 'Please describe your issue.');
      return;
    }
    try {
      await dispatch(
        forgotPassword({
          username,
          email,
          phone: phone.trim(),
          message: message.trim(),
        }),
      );
      setSuccess(true);
    } catch {
      Alert.alert('Failed', 'Could not send request. Please try again.');
    }
  };

  // ── Success state ──────────────────────────────────────
  if (success) {
    return (
      <SafeAreaView
        edges={['top', 'bottom']}
        style={[s.bg, { backgroundColor: T.bg }]}
      >
        <StatusBar barStyle={T.statusBar} backgroundColor={T.bg} />
        <View style={s.successRoot}>
          <View
            style={[
              s.successIconRing,
              { borderColor: '#22C55E30', backgroundColor: '#22C55E12' },
            ]}
          >
            <View
              style={[s.successIconInner, { backgroundColor: '#22C55E20' }]}
            >
              <MaterialCommunityIcons
                name="check-circle-outline"
                size={52}
                color="#22C55E"
              />
            </View>
          </View>

          <Text style={[s.successTitle, { color: T.text }]}>Request sent!</Text>
          <Text style={[s.successSub, { color: T.muted }]}>
            Your password reset request has been submitted. The admin will
            review it and reset your password shortly.
          </Text>

          <View
            style={[
              s.summaryCard,
              { backgroundColor: T.card, borderColor: T.cardBorder },
            ]}
          >
            {[
              { icon: 'account-outline', label: 'Username', value: username },
              { icon: 'email-outline', label: 'Email', value: email },
              { icon: 'phone-outline', label: 'Phone', value: phone },
            ].map((row, i, arr) => (
              <View
                key={row.label}
                style={[
                  s.summaryRow,
                  i < arr.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: T.divider,
                  },
                ]}
              >
                <View
                  style={[s.summaryIconBox, { backgroundColor: T.primaryDim }]}
                >
                  <MaterialCommunityIcons
                    name={row.icon}
                    size={16}
                    color={T.primary}
                  />
                </View>
                <View style={s.summaryInfo}>
                  <Text style={[s.summaryLabel, { color: T.muted }]}>
                    {row.label}
                  </Text>
                  <Text style={[s.summaryValue, { color: T.text }]}>
                    {row.value}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[s.backBtn, { backgroundColor: T.primary }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="arrow-left" size={18} color="#fff" />
            <Text style={s.backBtnText}>Back to profile</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Form state ─────────────────────────────────────────
  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[s.bg, { backgroundColor: T.bg }]}
    >
      <StatusBar barStyle={T.statusBar} backgroundColor={T.bg} />

      {/* Header — fixed, outside scroll */}
      <View style={[s.header, { borderBottomColor: T.divider }]}>
        <TouchableOpacity
          style={[
            s.backIconBtn,
            { backgroundColor: T.card, borderColor: T.cardBorder },
          ]}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color={T.text} />
        </TouchableOpacity>
        <Text style={[Typography.h3, { color: T.text }]}>Forgot Password</Text>
        <View style={{ width: 38 }} />
      </View>

      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        {/*
          KeyboardAwareScrollView automatically scrolls the focused
          input into view on both Android and iOS — no hacks needed.
        */}
        <KeyboardAwareScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid
          enableAutomaticScroll
          extraScrollHeight={20}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <View
            style={[
              s.heroCard,
              { backgroundColor: T.card, borderColor: T.cardBorder },
            ]}
          >
            <View style={[s.heroIconWrap, { backgroundColor: T.primaryDim }]}>
              <MaterialCommunityIcons
                name="lock-reset"
                size={32}
                color={T.primary}
              />
            </View>
            <Text style={[s.heroTitle, { color: T.text }]}>
              Reset your password
            </Text>
            <Text style={[s.heroSub, { color: T.muted }]}>
              Fill in the details below. Your username and email are
              auto-filled. An admin will reset your password and notify you.
            </Text>
          </View>

          {/* Read-only fields */}
          <Text style={[s.groupTitle, { color: T.muted }]}>Account info</Text>
          <View
            style={[
              s.fieldsCard,
              { backgroundColor: T.card, borderColor: T.cardBorder },
              Shadow.sm,
            ]}
          >
            {[
              { icon: 'account-outline', label: 'Username', value: username },
              { icon: 'email-outline', label: 'Email', value: email },
            ].map((f, i) => (
              <View
                key={f.label}
                style={[
                  s.readonlyRow,
                  i === 0 && {
                    borderBottomWidth: 1,
                    borderBottomColor: T.divider,
                  },
                ]}
              >
                <View
                  style={[s.fieldIconBox, { backgroundColor: T.primaryDim }]}
                >
                  <MaterialCommunityIcons
                    name={f.icon}
                    size={17}
                    color={T.primary}
                  />
                </View>
                <View style={s.fieldInfo}>
                  <Text style={[s.fieldLabel, { color: T.muted }]}>
                    {f.label}
                  </Text>
                  <Text style={[s.fieldValue, { color: T.text }]}>
                    {f.value}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="lock-outline"
                  size={14}
                  color={T.muted}
                />
              </View>
            ))}
          </View>

          {/* Editable fields */}
          <Text style={[s.groupTitle, { color: T.muted }]}>
            Contact & message
          </Text>

          <View style={s.inputGroup}>
            <Text style={[s.inputLabel, { color: T.muted }]}>
              Phone number *
            </Text>
            <View
              style={[
                s.inputWrap,
                { backgroundColor: T.surface, borderColor: T.cardBorder },
              ]}
            >
              <MaterialCommunityIcons
                name="phone-outline"
                size={18}
                color={T.primary}
              />
              <TextInput
                style={[s.textInput, { color: T.text }]}
                value={phone}
                onChangeText={t => setPhone(t.replace(/[^0-9]/g, ''))}
                placeholder="Enter your phone number"
                placeholderTextColor={T.muted}
                keyboardType="phone-pad"
                maxLength={15}
                returnKeyType="next"
                blurOnSubmit={false}
              />
            </View>
          </View>

          <View style={s.inputGroup}>
            <Text style={[s.inputLabel, { color: T.muted }]}>Message *</Text>
            <View
              style={[
                s.textareaWrap,
                { backgroundColor: T.surface, borderColor: T.cardBorder },
              ]}
            >
              <TextInput
                style={[s.textarea, { color: T.text }]}
                value={message}
                onChangeText={setMessage}
                placeholder="Type your message here"
                placeholderTextColor={T.muted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                returnKeyType="done"
                blurOnSubmit
                scrollEnabled={false}
              />
            </View>
            <Text style={[s.charCount, { color: T.muted }]}>
              {message.length} chars
            </Text>
          </View>

          {/* Info note */}
          <View
            style={[
              s.note,
              { backgroundColor: T.primaryDim, borderColor: T.primary + '30' },
            ]}
          >
            <MaterialCommunityIcons
              name="information-outline"
              size={15}
              color={T.primary}
            />
            <Text style={[s.noteText, { color: T.primary }]}>
              This is a manual process. The admin will be notified and will
              reset your password within 24 hours.
            </Text>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[
              s.submitBtn,
              { backgroundColor: T.primary, opacity: loading ? 0.7 : 1 },
            ]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <MaterialCommunityIcons
                  name="send-outline"
                  size={19}
                  color="#fff"
                />
                <Text style={s.submitText}>Send reset request</Text>
              </>
            )}
          </TouchableOpacity>
        </KeyboardAwareScrollView>
      </TouchableWithoutFeedback>
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
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: 24,
    gap: 10,
  },
  heroIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  heroTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  heroSub: { fontSize: 13, textAlign: 'center', lineHeight: 19 },

  groupTitle: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 10,
  },

  fieldsCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 20,
  },
  readonlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  fieldIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldInfo: { flex: 1 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  fieldValue: { fontSize: 14, fontWeight: '600', marginTop: 2 },

  inputGroup: { marginBottom: 14 },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  textInput: { flex: 1, fontSize: 14, padding: 0 },
  textareaWrap: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  textarea: { fontSize: 14, minHeight: 90 },
  charCount: { fontSize: 11, textAlign: 'right', marginTop: 4 },

  note: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: 10,
    marginBottom: 20,
  },
  noteText: { flex: 1, fontSize: 12, lineHeight: 17 },

  submitBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  successRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  successIconRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successIconInner: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: { fontSize: 24, fontWeight: '900', marginBottom: 10 },
  successSub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  summaryCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 28,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  summaryIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryInfo: { flex: 1 },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  summaryValue: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  backBtn: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  backBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
