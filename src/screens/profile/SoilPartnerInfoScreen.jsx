// src/screens/profile/SoilPartnerInfoScreen.js
//
// Static info screen — explains the Soil Partner program.
// "Apply Now" navigates to SoilPartnerEnquiryScreen.

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import useTheme from '../../hooks/useTheme';
import { Spacing, Radius, Shadow } from '../../theme';
import { TopBar } from '../../components/common'; // adjust to your TopBar import

// ─── Content data ─────────────────────────────────────────────────────────────

const PARTNER_BENEFITS = [
  {
    icon: 'store-outline',
    color: '#22C55E',
    title: 'Sell Arkashine Products',
    desc: 'Distribute SoiLENZ, PHBottle and AtmoSense devices in your region.',
  },
  {
    icon: 'cash-multiple',
    color: '#3B82F6',
    title: 'Earn Commissions',
    desc: 'Get attractive margins on every device and subscription sold through you.',
  },
  {
    icon: 'chart-line',
    color: '#F59E0B',
    title: 'Access Partner Dashboard',
    desc: 'Real-time sales analytics, lead tracking and inventory management.',
  },
  {
    icon: 'school-outline',
    color: '#A78BFA',
    title: 'Training & Certification',
    desc: 'Free onboarding, product training and a recognised Arkashine certificate.',
  },
  {
    icon: 'headset',
    color: '#EC4899',
    title: 'Dedicated Support',
    desc: 'Priority technical support and a dedicated partner success manager.',
  },
];

const ELIGIBILITY = [
  'Agri-input dealers, agronomists, or NGOs',
  'Entrepreneurs with local farmer networks',
  'Agricultural colleges and institutes',
  'Government or private agricultural offices',
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Submit Application',
    desc: 'Fill in your contact details and area of operation.',
  },
  {
    step: '02',
    title: 'Review & Approval',
    desc: 'Our partner team reviews your profile within 3–5 business days.',
  },
  {
    step: '03',
    title: 'Onboarding',
    desc: 'Attend a free training session and receive your partner kit.',
  },
  {
    step: '04',
    title: 'Start Earning',
    desc: 'Begin selling devices and earn commissions on every sale.',
  },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SoilPartnerInfoScreen({ navigation }) {
  const theme = useTheme();
  const T = theme.colors;

  return (
    <SafeAreaView style={[s.root, { backgroundColor: T.bg }]} edges={['top']}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.bg} />

      <TopBar
        title="Soil Partner Program"
        subtitle="by Arkashine"
        onBack={() => navigation.goBack()}
        theme={theme}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
      >
        {/* ── Hero ── */}
        <View
          style={[
            s.hero,
            { backgroundColor: '#22C55E0F', borderColor: '#22C55E30' },
          ]}
        >
          <View style={[s.heroIconWrap, { backgroundColor: '#22C55E18' }]}>
            <MaterialCommunityIcons
              name="leaf-circle-outline"
              size={48}
              color="#22C55E"
            />
          </View>
          <Text style={[s.heroTitle, { color: T.text }]}>
            Grow your business with{'\n'}Arkashine Agriculture
          </Text>
          <Text style={[s.heroSub, { color: T.muted }]}>
            Join our network of agri-entrepreneurs across India and bring
            precision soil intelligence to farmers in your area.
          </Text>
          {/* Quick stats */}
          <View style={[s.heroStats, { borderTopColor: '#22C55E20' }]}>
            {[
              { value: '500+', label: 'Active Partners' },
              { value: '18', label: 'States' },
              { value: '₹40K', label: 'Avg. Monthly Earn' },
            ].map((st, i) => (
              <View
                key={i}
                style={[
                  s.heroStat,
                  i < 2 && {
                    borderRightColor: '#22C55E20',
                    borderRightWidth: 1,
                  },
                ]}
              >
                <Text style={[s.heroStatVal, { color: '#22C55E' }]}>
                  {st.value}
                </Text>
                <Text style={[s.heroStatLbl, { color: T.muted }]}>
                  {st.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Benefits ── */}
        <Text style={[s.sectionTitle, { color: T.muted }]}>What you get</Text>
        <View style={s.benefitsWrap}>
          {PARTNER_BENEFITS.map((b, i) => (
            <View
              key={i}
              style={[
                s.benefitCard,
                { backgroundColor: T.card, borderColor: T.cardBorder },
              ]}
            >
              <View style={[s.benefitIco, { backgroundColor: b.color + '18' }]}>
                <MaterialCommunityIcons
                  name={b.icon}
                  size={24}
                  color={b.color}
                />
              </View>
              <Text style={[s.benefitTitle, { color: T.text }]}>{b.title}</Text>
              <Text style={[s.benefitDesc, { color: T.muted }]}>{b.desc}</Text>
            </View>
          ))}
        </View>

        {/* ── How it works ── */}
        <Text style={[s.sectionTitle, { color: T.muted }]}>How it works</Text>
        <View
          style={[
            s.stepsCard,
            { backgroundColor: T.card, borderColor: T.cardBorder },
          ]}
        >
          {HOW_IT_WORKS.map((step, i) => (
            <View
              key={i}
              style={[
                s.stepRow,
                i < HOW_IT_WORKS.length - 1 && {
                  borderBottomColor: T.divider,
                  borderBottomWidth: 1,
                },
              ]}
            >
              {/* Step number + vertical line */}
              <View style={s.stepLeft}>
                <View
                  style={[
                    s.stepNumWrap,
                    { backgroundColor: '#22C55E18', borderColor: '#22C55E40' },
                  ]}
                >
                  <Text style={[s.stepNum, { color: '#22C55E' }]}>
                    {step.step}
                  </Text>
                </View>
                {i < HOW_IT_WORKS.length - 1 && (
                  <View
                    style={[s.stepLine, { backgroundColor: '#22C55E30' }]}
                  />
                )}
              </View>
              <View style={s.stepBody}>
                <Text style={[s.stepTitle, { color: T.text }]}>
                  {step.title}
                </Text>
                <Text style={[s.stepDesc, { color: T.muted }]}>
                  {step.desc}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Eligibility ── */}
        <Text style={[s.sectionTitle, { color: T.muted }]}>Who can apply?</Text>
        <View
          style={[
            s.eligCard,
            { backgroundColor: T.card, borderColor: T.cardBorder },
          ]}
        >
          {ELIGIBILITY.map((line, i) => (
            <View
              key={i}
              style={[
                s.eligRow,
                i < ELIGIBILITY.length - 1 && {
                  borderBottomColor: T.divider,
                  borderBottomWidth: 0.5,
                },
              ]}
            >
              <View style={[s.eligCheck, { backgroundColor: '#22C55E18' }]}>
                <MaterialCommunityIcons
                  name="check"
                  size={14}
                  color="#22C55E"
                />
              </View>
              <Text style={[s.eligText, { color: T.text }]}>{line}</Text>
            </View>
          ))}
        </View>

        {/* ── CTA ── */}
        <TouchableOpacity
          style={s.applyBtn}
          onPress={() => navigation.navigate('SoilPartnerEnquiryScreen')}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="send-outline" size={20} color="#fff" />
          <Text style={s.applyBtnText}>Apply Now — It's Free</Text>
        </TouchableOpacity>

        <Text style={[s.disclaimer, { color: T.muted }]}>
          Our partner team will review your application and reach out within 3–5
          business days. No commitment required.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: Spacing.lg, paddingBottom: 40 },

  // Hero
  hero: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: 10,
    marginBottom: Spacing.lg,
  },
  heroIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 28,
  },
  heroSub: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  heroStats: {
    flexDirection: 'row',
    width: '100%',
    borderTopWidth: 1,
    marginTop: 8,
    paddingTop: 12,
  },
  heroStat: { flex: 1, alignItems: 'center', gap: 3 },
  heroStatVal: { fontSize: 18, fontWeight: '900' },
  heroStatLbl: { fontSize: 10, fontWeight: '600', textAlign: 'center' },

  // Section title
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },

  // Benefits — 2-column grid
  benefitsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: Spacing.lg,
  },
  benefitCard: {
    width: '47.5%',
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 14,
    gap: 8,
    ...Shadow.sm,
  },
  benefitIco: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitTitle: { fontSize: 13, fontWeight: '800', lineHeight: 18 },
  benefitDesc: { fontSize: 11, lineHeight: 16 },

  // How it works
  stepsCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    ...Shadow.sm,
  },
  stepRow: { flexDirection: 'row', padding: 16, gap: 14 },
  stepLeft: { alignItems: 'center', width: 36 },
  stepNumWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNum: { fontSize: 11, fontWeight: '900' },
  stepLine: { width: 1.5, flex: 1, marginTop: 6 },
  stepBody: { flex: 1, paddingTop: 6 },
  stepTitle: { fontSize: 14, fontWeight: '800', marginBottom: 3 },
  stepDesc: { fontSize: 12, lineHeight: 18 },

  // Eligibility
  eligCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    ...Shadow.sm,
  },
  eligRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  eligCheck: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  eligText: { fontSize: 13, flex: 1, lineHeight: 19 },

  // CTA
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#22C55E',
    borderRadius: Radius.lg,
    paddingVertical: 16,
    marginBottom: 14,
    ...Shadow.sm,
  },
  applyBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  disclaimer: { fontSize: 11, textAlign: 'center', lineHeight: 18 },
});
