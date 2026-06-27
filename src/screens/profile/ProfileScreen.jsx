// src/screens/profile/ProfileScreen.js

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Switch,
  Alert,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser, toggleTheme } from '../../redux/actions';
import useTheme from '../../hooks/useTheme';
import { Spacing, Radius, Shadow, Typography } from '../../theme';
import { TextInput } from 'react-native';

// Enable LayoutAnimation for Android
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── FAQ Data ─────────────────────────────────────────────────────────────────
const FAQS = [
  {
    id: 1,
    question: 'What is SoiLENZ?',
    answer:
      'SoiLENZ is Arkashine’s portable soil testing solution that provides instant soil health analysis and nutrient information directly in the field.',
    icon: 'test-tube',
    category: 'SoiLENZ',
  },
  {
    id: 2,
    question: 'How do I perform a soil test?',
    answer:
      'Collect the soil sample as instructed, connect your SoiLENZ device, start a new test from the app, and follow the on-screen steps to generate the report.',
    icon: 'clipboard-check-outline',
    category: 'Testing',
  },
  {
    id: 3,
    question: 'What parameters are measured in a soil test?',
    answer:
      'Depending on the device and package, tests may include pH, EC, Organic Carbon, Nitrogen, Phosphorus, Potassium, Moisture, and other soil health indicators.',
    icon: 'flask-outline',
    category: 'Testing',
  },
  {
    id: 4,
    question: 'How can I view my soil test reports?',
    answer:
      'All completed reports are available in the Reports section where you can view, download, and share them.',
    icon: 'file-chart-outline',
    category: 'Reports',
  },
  {
    id: 5,
    question: 'Why is my device not connecting?',
    answer:
      'Ensure Bluetooth is enabled, the device is charged, and you are within range. Restart the device and try reconnecting from the app.',
    icon: 'bluetooth-connect',
    category: 'Device',
  },
  {
    id: 6,
    question: 'What is a Soil Partner?',
    answer:
      'A Soil Partner is an authorized Arkashine distributor or service provider who helps farmers perform soil testing and provides agricultural advisory services.',
    icon: 'handshake-outline',
    category: 'Soil Partner',
  },
  {
    id: 7,
    question: 'How do I become a Soil Partner?',
    answer:
      'Navigate to the Soil Partner section in the app, review the program details, and submit your application. Our team will contact you after verification.',
    icon: 'account-plus-outline',
    category: 'Soil Partner',
  },
  {
    id: 8,
    question: 'Can I share reports with farmers or clients?',
    answer:
      'Yes. Soil reports can be shared digitally through PDF export or directly from the app.',
    icon: 'share-variant-outline',
    category: 'Reports',
  },
  {
    id: 9,
    question: 'How accurate are Arkashine soil test results?',
    answer:
      'Arkashine devices are calibrated using validated testing methods and provide reliable field-level insights for faster decision making.',
    icon: 'check-decagram-outline',
    category: 'Accuracy',
  },
  {
    id: 10,
    question: 'Who should I contact for support?',
    answer:
      'You can contact the Arkashine support team through the Help & Support section or by using the official support email and phone number provided in the app.',
    icon: 'headset',
    category: 'Support',
  },
];

// ─── Static data ──────────────────────────────────────────────────────────────

const STATS = [
  { label: 'Tests Done', value: '127', icon: 'test-tube', color: '#22C55E' },
  { label: 'Reports', value: '34', icon: 'file-chart', color: '#3B82F6' },
  { label: 'Fields', value: '8', icon: 'map-marker', color: '#F59E0B' },
];

const APP_SETTINGS = [
  {
    key: 'darkMode',
    icon: 'theme-light-dark',
    label: 'Dark Theme',
    sub: 'Switch between light and dark',
    toggle: true,
  },
];

const ACCOUNT_ITEMS = [
  {
    icon: 'lock-reset',
    label: 'Forgot Password',
    sub: 'Request password reset',
    action: 'forgotPassword',
  },
  {
    icon: 'help-circle-outline',
    label: 'Help & Support',
    sub: 'FAQs and contact',
    action: 'help',
  },
];

// ─── SoilPartnerBadge  (Option B — left accent card) ─────────────────────────
// Shown in the profile hero when user.user_type === 'soil_partner'

function SoilPartnerBadge({ T }) {
  return (
    <View
      style={[
        spb.wrap,
        {
          backgroundColor: T.card,
          borderColor: T.cardBorder,
          borderLeftColor: '#22C55E',
        },
      ]}
    >
      {/* Shield icon */}
      <View style={[spb.iconWrap, { backgroundColor: '#22C55E14' }]}>
        <MaterialCommunityIcons name="shield-check" size={22} color="#22C55E" />
      </View>

      {/* Text */}
      <View style={spb.textBlock}>
        <View style={spb.titleRow}>
          <MaterialCommunityIcons
            name="check-decagram"
            size={13}
            color="#22C55E"
          />
          <Text style={spb.title}>Verified Soil Partner</Text>
        </View>
        <Text style={[spb.sub, { color: T.muted }]}>
          Authorised Arkashine distributor · Active
        </Text>
      </View>

      {/* VERIFIED chip */}
      <View style={spb.chip}>
        <Text style={spb.chipText}>VERIFIED</Text>
      </View>
    </View>
  );
}

const spb = StyleSheet.create({
  wrap: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderLeftWidth: 3,
    borderRadius: Radius.md,
    paddingHorizontal: 13,
    paddingVertical: 11,
    marginTop: 12,
    marginBottom: 2,
    // ...Shadow.sm,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textBlock: { flex: 1 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 3,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    color: '#22C55E',
    letterSpacing: 0.1,
  },
  sub: { fontSize: 11 },
  chip: {
    backgroundColor: '#22C55E',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexShrink: 0,
  },
  chipText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.6,
  },
});

// ─── SoilPartnerCard ──────────────────────────────────────────────────────────
// Row that sits inside the Account card.
// Main tap  → SoilPartnerInfoScreen
// Info icon → SoilPartnerInfoScreen (same destination; info is the landing page)
// "Apply"   → navigated from the info screen itself

function SoilPartnerCard({ onPress, onInfoPress, T }) {
  return (
    <TouchableOpacity
      style={[
        spCard.wrap,
        { backgroundColor: T.card, borderColor: T.cardBorder },
      ]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      {/* Icon */}
      <View style={[spCard.iconWrap, { backgroundColor: '#22C55E18' }]}>
        <MaterialCommunityIcons
          name="handshake-outline"
          size={22}
          color="#22C55E"
        />
      </View>

      {/* Text */}
      <View style={spCard.body}>
        <View style={spCard.titleRow}>
          <Text style={[spCard.title, { color: T.text }]}>
            Become a Soil Partner
          </Text>
          {/* ⓘ info icon — navigates to the same info screen */}
          <TouchableOpacity
            style={[
              spCard.infoBtn,
              { backgroundColor: '#22C55E12', borderColor: '#22C55E30' },
            ]}
            onPress={onInfoPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons
              name="information-outline"
              size={14}
              color="#22C55E"
            />
          </TouchableOpacity>
        </View>
        <Text style={[spCard.sub, { color: T.muted }]}>
          Distribute Arkashine devices · Earn commissions
        </Text>
      </View>

      {/* NEW badge + chevron */}
      <View style={spCard.right}>
        <View style={spCard.newBadge}>
          <Text style={spCard.newBadgeTxt}>NEW</Text>
        </View>
        <MaterialCommunityIcons
          name="chevron-right"
          size={18}
          color={T.muted}
          style={{ marginTop: 4 }}
        />
      </View>
    </TouchableOpacity>
  );
}

// ─── FAQ Item Component ────────────────────────────────────────────────────────

function FAQItem({ faq, T, expanded, onToggle }) {
  return (
    <View
      style={[
        faqItem.wrap,
        { backgroundColor: T.card, borderColor: T.cardBorder },
        expanded && { backgroundColor: T.primaryDim },
      ]}
    >
      <TouchableOpacity
        style={faqItem.header}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={[faqItem.iconBox, { backgroundColor: T.primary + '20' }]}>
          <MaterialCommunityIcons name={faq.icon} size={18} color={T.primary} />
        </View>

        <View style={faqItem.headerText}>
          <Text style={[faqItem.category, { color: T.muted }]}>
            {faq.category}
          </Text>
          <Text style={[faqItem.question, { color: T.text }]} numberOfLines={2}>
            {faq.question}
          </Text>
        </View>

        <MaterialCommunityIcons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={T.primary}
          style={{ marginLeft: 8 }}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={[faqItem.body, { borderTopColor: T.divider }]}>
          <Text style={[faqItem.answer, { color: T.text }]}>{faq.answer}</Text>
          <View style={faqItem.footer}>
            <MaterialCommunityIcons
              name="check-circle"
              size={14}
              color={T.primary}
            />
            <Text style={[faqItem.helpful, { color: T.primary }]}>
              Was this helpful?
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
const spCard = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  body: { flex: 1 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  title: { fontSize: 14, fontWeight: '700' },
  infoBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sub: { fontSize: 12 },
  right: { alignItems: 'flex-end', gap: 2 },
  newBadge: {
    backgroundColor: '#22C55E',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  newBadgeTxt: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
const faqItem = StyleSheet.create({
  wrap: {
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
    // ...Shadow.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerText: {
    flex: 1,
  },
  category: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  question: {
    fontSize: 13,
    fontWeight: '700',
  },
  body: {
    borderTopWidth: 1,
    padding: 14,
    paddingTop: 12,
  },
  answer: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 20,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  helpful: {
    fontSize: 12,
    fontWeight: '600',
  },
});

// ─── Help Modal Component ──────────────────────────────────────────────────────

function HelpSupportModal({ T, onClose }) {
  const [expandedId, setExpandedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleToggle = id => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  const filteredFaqs = FAQS.filter(
    faq =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.category.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <View style={[helpModal.container, { backgroundColor: T.bg }]}>
      {/* Header */}
      <View style={[helpModal.header, { borderBottomColor: T.divider }]}>
        <View>
          <Text style={[helpModal.title, { color: T.text }]}>
            Help & Support
          </Text>
          <Text style={[helpModal.subtitle, { color: T.muted }]}>
            Find answers to your questions
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} hitSlop={{ all: 8 }}>
          <MaterialCommunityIcons name="close" size={24} color={T.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Search Bar */}
        <View style={helpModal.searchContainer}>
          <View
            style={[
              helpModal.searchBox,
              { backgroundColor: T.card, borderColor: T.cardBorder },
            ]}
          >
            <MaterialCommunityIcons name="magnify" size={20} color={T.muted} />
            <TextInput
              placeholder="Search FAQs..."
              placeholderTextColor={T.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={[helpModal.searchInput, { color: T.text }]}
            />
            {searchQuery !== '' && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialCommunityIcons
                  name="close-circle"
                  size={18}
                  color={T.muted}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Contact Info */}
        <View style={helpModal.contactSection}>
          <Text style={[helpModal.sectionTitle, { color: T.muted }]}>
            Contact Us
          </Text>
          <View
            style={[
              helpModal.contactCard,
              { backgroundColor: T.card, borderColor: T.cardBorder },
            ]}
          >
            <View
              style={[
                helpModal.contactIcon,
                { backgroundColor: T.primary + '20' },
              ]}
            >
              <MaterialCommunityIcons
                name="email-outline"
                size={20}
                color={T.primary}
              />
            </View>
            <View style={helpModal.contactInfo}>
              <Text style={[helpModal.contactLabel, { color: T.muted }]}>
                Email
              </Text>
              <Text style={[helpModal.contactValue, { color: T.text }]}>
                support@arkashine.com
              </Text>
            </View>
          </View>

          <View
            style={[
              helpModal.contactCard,
              { backgroundColor: T.card, borderColor: T.cardBorder },
            ]}
          >
            <View
              style={[
                helpModal.contactIcon,
                { backgroundColor: T.primary + '20' },
              ]}
            >
              <MaterialCommunityIcons
                name="phone-outline"
                size={20}
                color={T.primary}
              />
            </View>
            <View style={helpModal.contactInfo}>
              <Text style={[helpModal.contactLabel, { color: T.muted }]}>
                Phone
              </Text>
              <Text style={[helpModal.contactValue, { color: T.text }]}>
                +91-XXXX-XXXX-XX
              </Text>
            </View>
          </View>
        </View>

        {/* FAQs Section */}
        <View style={helpModal.faqSection}>
          <Text style={[helpModal.sectionTitle, { color: T.muted }]}>
            Frequently Asked Questions ({filteredFaqs.length})
          </Text>

          {filteredFaqs.length > 0 ? (
            filteredFaqs.map(faq => (
              <FAQItem
                key={faq.id}
                faq={faq}
                T={T}
                expanded={expandedId === faq.id}
                onToggle={() => handleToggle(faq.id)}
              />
            ))
          ) : (
            <View style={helpModal.emptyState}>
              <MaterialCommunityIcons
                name="search-web"
                size={48}
                color={T.muted}
              />
              <Text style={[helpModal.emptyText, { color: T.muted }]}>
                No FAQs found
              </Text>
              <Text style={[helpModal.emptySubtext, { color: T.muted }]}>
                Try a different search term
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const helpModal = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  contactSection: {
    paddingHorizontal: Spacing.lg,
    marginTop: 8,
    marginBottom: 20,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
    gap: 12,
    // ...Shadow.sm,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  faqSection: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 12,
    marginTop: 4,
  },
});

// ─── ProfileScreen ────────────────────────────────────────────────────────────

export default function ProfileScreen({ navigation }) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const T = theme.colors;

  const user = useSelector(s => s.auth.user);
  const isDark = useSelector(s => s.theme.isDark);

  const [toggles, setToggles] = useState({
    notifs: true,
    location: true,
    bluetooth: false,
  });

  const [showHelpModal, setShowHelpModal] = useState(false);

  const initials = (user?.name || user?.username || 'U')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleAccountAction = action => {
    if (action === 'forgotPassword')
      navigation.navigate('ForgotPasswordScreen');
    if (action === 'help') {
      setShowHelpModal(true);
    }
  };

  const handleToggle = key => {
    if (key === 'darkMode') {
      dispatch(toggleTheme());
      return;
    }
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getToggleVal = key => (key === 'darkMode' ? isDark : toggles[key]);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          dispatch(logoutUser());
          navigation.replace('LoginScreen');
        },
      },
    ]);
  };

  if (showHelpModal) {
    return (
      <SafeAreaView style={[s.bg, { backgroundColor: T.bg }]}>
        <StatusBar barStyle={T.statusBar} backgroundColor={T.bg} />
        <HelpSupportModal T={T} onClose={() => setShowHelpModal(false)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.bg, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.bg} />

      {/* Header */}
      <View style={[s.header, { borderBottomColor: T.divider }]}>
        <Text style={[Typography.h3, { color: T.text }]}>Profile</Text>
        <TouchableOpacity
          style={[
            s.settingsBtn,
            { backgroundColor: T.card, borderColor: T.cardBorder },
          ]}
        >
          <MaterialCommunityIcons
            name="cog-outline"
            size={20}
            color={T.primary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* ── Profile Hero ── */}
        <View
          style={[
            s.profileHero,
            { backgroundColor: T.card, borderColor: T.cardBorder },
          ]}
        >
          <View style={s.avatarWrap}>
            <View style={[s.avatar, { backgroundColor: T.primary }]}>
              <Text style={s.avatarText}>{initials}</Text>
            </View>
            <View
              style={[
                s.avatarBadge,
                { backgroundColor: T.online, borderColor: T.surface },
              ]}
            />
            <TouchableOpacity
              style={[
                s.editAvatar,
                { backgroundColor: T.surface, borderColor: T.cardBorder },
              ]}
            >
              <MaterialCommunityIcons
                name="camera-outline"
                size={14}
                color={T.primary}
              />
            </TouchableOpacity>
          </View>
          <Text style={[s.profileName, { color: T.text }]}>
            {user?.name || user?.username || 'User'}
          </Text>
          {user?.user_type === 'soil_partner' && <SoilPartnerBadge T={T} />}
          <View
            style={[
              s.emailChip,
              { backgroundColor: T.primaryDim, borderColor: T.primary + '40' },
              user?.user_type === 'soil_partner' && { marginTop: 8 },
            ]}
          >
            <MaterialCommunityIcons
              name="email-outline"
              size={12}
              color={T.primary}
            />
            <Text style={[s.emailText, { color: T.primary }]}>
              {user?.email ||
                user?.username + '@soilenz.in' ||
                'user@soilenz.in'}
            </Text>
          </View>
        </View>

        {/* ── Stats ── */}
        <View style={s.statsRow}>
          {STATS.map(st => (
            <View
              key={st.label}
              style={[
                s.statCard,
                { backgroundColor: T.card, borderColor: T.cardBorder },
                // Shadow.sm,
              ]}
            >
              <View style={[s.statIcon, { backgroundColor: st.color + '18' }]}>
                <MaterialCommunityIcons
                  name={st.icon}
                  size={18}
                  color={st.color}
                />
              </View>
              <Text style={[s.statVal, { color: T.text }]}>{st.value}</Text>
              <Text style={[s.statLabel, { color: T.muted }]}>{st.label}</Text>
            </View>
          ))}
        </View>

        {/* ── App Settings ── */}
        <Text style={[s.groupTitle, { color: T.muted }]}>App Settings</Text>
        <View
          style={[
            s.settingsCard,
            { backgroundColor: T.card, borderColor: T.cardBorder },
            // Shadow.sm,
          ]}
        >
          {APP_SETTINGS.map((item, i) => (
            <View
              key={item.key}
              style={[
                s.settingRow,
                i < APP_SETTINGS.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: T.divider,
                },
              ]}
            >
              <View
                style={[s.settingIconBox, { backgroundColor: T.primaryDim }]}
              >
                <MaterialCommunityIcons
                  name={item.icon}
                  size={18}
                  color={T.primary}
                />
              </View>
              <View style={s.settingInfo}>
                <Text style={[s.settingLabel, { color: T.text }]}>
                  {item.label}
                </Text>
                <Text style={[s.settingSub, { color: T.muted }]}>
                  {item.sub}
                </Text>
              </View>
              {item.toggle && (
                <Switch
                  value={getToggleVal(item.key)}
                  onValueChange={() => handleToggle(item.key)}
                  trackColor={{ false: T.divider, true: T.primary + '60' }}
                  thumbColor={getToggleVal(item.key) ? T.primary : T.muted}
                  style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
                />
              )}
            </View>
          ))}
        </View>

        {/* ── Account ── */}
        <Text style={[s.groupTitle, { color: T.muted }]}>Account</Text>
        <View
          style={[
            s.settingsCard,
            { backgroundColor: T.card, borderColor: T.cardBorder },
          ]}
        >
          {ACCOUNT_ITEMS.map((item, i) => (
            <TouchableOpacity
              key={item.action}
              onPress={() => handleAccountAction(item.action)}
              style={[
                s.settingRow,
                { borderBottomWidth: 1, borderBottomColor: T.divider },
              ]}
              activeOpacity={0.75}
            >
              <View
                style={[s.settingIconBox, { backgroundColor: T.primaryDim }]}
              >
                <MaterialCommunityIcons
                  name={item.icon}
                  size={18}
                  color={T.primary}
                />
              </View>
              <View style={s.settingInfo}>
                <Text style={[s.settingLabel, { color: T.text }]}>
                  {item.label}
                </Text>
                <Text style={[s.settingSub, { color: T.muted }]}>
                  {item.sub}
                </Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={18}
                color={T.muted}
              />
            </TouchableOpacity>
          ))}

          {/* Soil Partner — hidden once user is already a partner */}
          {user?.user_type !== 'soil_partner' && (
            <SoilPartnerCard
              T={T}
              onPress={() => navigation.navigate('SoilPartnerInfoScreen')}
              onInfoPress={() => navigation.navigate('SoilPartnerInfoScreen')}
            />
          )}
        </View>

        {/* ── App info ── */}
        <View
          style={[
            s.appInfoCard,
            { backgroundColor: T.card, borderColor: T.cardBorder },
          ]}
        >
          <View
            style={[
              s.appLogoWrap,
              { backgroundColor: T.primaryDim, borderColor: T.primary },
            ]}
          >
            <MaterialCommunityIcons name="leaf" size={24} color={T.primary} />
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={[s.appName, { color: T.text }]}>ARKASHINE</Text>
            <Text style={[s.appVer, { color: T.muted }]}>
              Version 1.0.0 · Agriculture Intelligence
            </Text>
          </View>
        </View>

        {/* ── Logout ── */}
        <TouchableOpacity
          style={[
            s.logoutBtn,
            { backgroundColor: T.red + '15', borderColor: T.red + '50' },
          ]}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="logout-variant"
            size={20}
            color={T.red}
          />
          <Text style={[s.logoutText, { color: T.red }]}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={[s.footer, { color: T.muted }]}>
          © 2026 Arkashine · Agricultural Intelligence Platform
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  bg: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  settingsBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileHero: {
    margin: Spacing.lg,
    borderRadius: 20,
    borderWidth: 1,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarWrap: { position: 'relative', marginBottom: 14 },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '900' },
  avatarBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  editAvatar: {
    position: 'absolute',
    bottom: -4,
    left: -4,
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: { fontSize: 22, fontWeight: '900', marginBottom: 4 },
  emailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  emailText: { fontSize: 12, fontWeight: '600' },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: 8,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 10,
    alignItems: 'center',
    gap: 4,
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statVal: { fontSize: 18, fontWeight: '900' },
  statLabel: { fontSize: 10, fontWeight: '600', textAlign: 'center' },
  groupTitle: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    paddingHorizontal: Spacing.lg,
    marginBottom: 10,
  },
  settingsCard: {
    marginHorizontal: Spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 20,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  settingIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: 14, fontWeight: '700' },
  settingSub: { fontSize: 12, marginTop: 1 },
  appInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  appLogoWrap: {
    width: 48,
    height: 48,
    borderRadius: 15,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: { fontSize: 16, fontWeight: '900' },
  appVer: { fontSize: 12, marginTop: 2 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginHorizontal: Spacing.lg,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    marginBottom: 16,
  },
  logoutText: { fontSize: 15, fontWeight: '800' },
  footer: { textAlign: 'center', fontSize: 11, paddingBottom: 20 },
});
