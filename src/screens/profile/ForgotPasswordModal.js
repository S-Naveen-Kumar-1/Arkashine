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
          {/* Icon */}
          <View
            style={[
              s.successIconRing,
              { borderColor: '#22C55E30', backgroundColor: '#22C55E10' },
            ]}
          >
            <View
              style={[s.successIconInner, { backgroundColor: '#22C55E1A' }]}
            >
              <MaterialCommunityIcons
                name="check-circle-outline"
                size={48}
                color="#22C55E"
              />
            </View>
          </View>

          <Text style={[s.successTitle, { color: T.text }]}>Request sent!</Text>
          <Text style={[s.successSub, { color: T.muted }]}>
            Your password reset request has been submitted. The admin will
            review it and reset your password shortly.
          </Text>

          {/* Summary card */}
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
                    borderBottomWidth: 0.5,
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

      {/* Header */}
      <View
        style={[
          s.header,
          { backgroundColor: T.card, borderBottomColor: T.divider },
        ]}
      >
        <TouchableOpacity
          style={[
            s.backIconBtn,
            { backgroundColor: T.surface, borderColor: T.cardBorder },
          ]}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color={T.text} />
        </TouchableOpacity>
        <Text style={[Typography.h3, { color: T.text }]}>Forgot Password</Text>
        <View style={{ width: 38 }} />
      </View>

      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAwareScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid
          enableAutomaticScroll
          extraScrollHeight={20}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Compact hero ── */}
          <View
            style={[
              s.heroCard,
              { backgroundColor: T.card, borderColor: T.cardBorder },
            ]}
          >
            <View style={[s.heroIconWrap, { backgroundColor: T.primaryDim }]}>
              <MaterialCommunityIcons
                name="lock-reset"
                size={22}
                color={T.primary}
              />
            </View>
            <View style={s.heroText}>
              <Text style={[s.heroTitle, { color: T.text }]}>
                Reset your password
              </Text>
              <Text style={[s.heroSub, { color: T.muted }]}>
                Fill in the details below — an admin will reset your password
                within 24 hrs.
              </Text>
            </View>
          </View>

          {/* ── Account info ── */}
          <Text style={[s.groupTitle, { color: T.muted }]}>Account info</Text>
          <View
            style={[
              s.fieldsCard,
              { backgroundColor: T.card, borderColor: T.cardBorder },
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
                    borderBottomWidth: 0.5,
                    borderBottomColor: T.divider,
                  },
                ]}
              >
                <View
                  style={[s.fieldIconBox, { backgroundColor: T.primaryDim }]}
                >
                  <MaterialCommunityIcons
                    name={f.icon}
                    size={16}
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
                  size={13}
                  color={T.muted}
                />
              </View>
            ))}
          </View>

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
                size={17}
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

          {/* ── Info note ── */}
          <View
            style={[
              s.note,
              { backgroundColor: T.primaryDim, borderColor: T.primary + '25' },
            ]}
          >
            <MaterialCommunityIcons
              name="information-outline"
              size={14}
              color={T.primary}
            />
            <Text style={[s.noteText, { color: T.primary }]}>
              This is a manual process. The admin will be notified and will
              reset your password within 24 hours.
            </Text>
          </View>

          {/* ── Submit ── */}
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
                  size={18}
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

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  backIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Compact hero ──
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 0.5,
    padding: 14,
    marginBottom: 20,
  },
  heroIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  heroText: { flex: 1 },
  heroTitle: { fontSize: 14, fontWeight: '600', marginBottom: 3 },
  heroSub: { fontSize: 12, lineHeight: 17 },

  // ── Section label ──
  groupTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },

  // ── Read-only fields card ──
  fieldsCard: {
    borderRadius: 14,
    borderWidth: 0.5,
    overflow: 'hidden',
    marginBottom: 20,
  },
  readonlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  fieldIconBox: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldInfo: { flex: 1 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldValue: { fontSize: 13, fontWeight: '500', marginTop: 2 },

  // ── Inputs ──
  inputGroup: { marginBottom: 12 },
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
    borderWidth: 0.5,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  textInput: { flex: 1, fontSize: 14, padding: 0 },
  textareaWrap: {
    borderWidth: 0.5,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  textarea: { fontSize: 14, minHeight: 88 },
  charCount: { fontSize: 11, textAlign: 'right', marginTop: 4 },

  // ── Note ──
  note: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    borderWidth: 0.5,
    borderRadius: Radius.md,
    padding: 10,
    marginBottom: 18,
  },
  noteText: { flex: 1, fontSize: 12, lineHeight: 17 },

  // ── Submit button ──
  submitBtn: {
    borderRadius: 13,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  submitText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // ── Success state ──
  successRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  successIconRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  successIconInner: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: { fontSize: 22, fontWeight: '800', marginBottom: 10 },
  successSub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 26,
    paddingHorizontal: 8,
  },
  summaryCard: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 0.5,
    overflow: 'hidden',
    marginBottom: 26,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
    gap: 12,
  },
  summaryIconBox: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryInfo: { flex: 1 },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: { fontSize: 13, fontWeight: '500', marginTop: 2 },
  backBtn: {
    width: '100%',
    borderRadius: 13,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  backBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
