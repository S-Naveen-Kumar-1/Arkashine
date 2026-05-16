// src/screens/partner/SoilPartnerOnboardingScreen.js
import React, { useCallback, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import useTheme from '../hooks/useTheme';
import { Radius, Shadow, Spacing } from '../theme';
import { TRAINING_ITEMS } from './partnerConstants';
import {
  BottomNavBar,
  CheckRow,
  Field,
  InfoBanner,
  ReviewRow,
  SectionCard,
  StepHeader,
  StepProgress,
  StatePicker,
  TagPill,
} from './PartnerComponents';

const STEPS = [
  { icon: '👤', title: 'Personal Profile', subtitle: 'Identity details' },
  { icon: '🏢', title: 'Business Profile', subtitle: 'Network & experience' },
  { icon: '🎓', title: 'Training', subtitle: 'ArkaShine verification' },
  { icon: '🗺️', title: 'Territory', subtitle: 'Your working area' },
  { icon: '✅', title: 'Review & Submit', subtitle: 'Confirm your details' },
];

export default function SoilPartnerOnboardingScreen({ navigation }) {
  const theme = useTheme();
  const T = theme.colors;
  const scrollRef = useRef(null);

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1 — Personal
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [village, setVillage] = useState('');
  const [dist, setDist] = useState('');
  const [state, setState] = useState('');

  // Step 2 — Business
  const [farmerCount, setFarmerCount] = useState('');
  const [activeVills, setActiveVills] = useState('');
  const [experience, setExperience] = useState('');
  const [businessDesc, setBusinessDesc] = useState('');

  // Step 3 — Training
  const [training, setTraining] = useState({
    app: false,
    device: false,
    sampling: false,
    farmer: false,
    payment: false,
  });
  const toggleTraining = useCallback(
    key => setTraining(p => ({ ...p, [key]: !p[key] })),
    [],
  );
  const trainingDone = Object.values(training).filter(Boolean).length;

  // Step 4 — Territory
  const [villageInput, setVillageInput] = useState('');
  const [villageList, setVillageList] = useState([]);
  const [coverageRadius, setCoverageRadius] = useState('');
  const [wantsMore, setWantsMore] = useState(false);
  const [moreNotes, setMoreNotes] = useState('');

  const addVillage = useCallback(() => {
    const v = villageInput.trim();
    if (!v) return;
    if (villageList.includes(v)) {
      Alert.alert('Duplicate', 'Village already added.');
      return;
    }
    setVillageList(p => [...p, v]);
    setVillageInput('');
  }, [villageInput, villageList]);

  const removeVillage = useCallback(
    v => setVillageList(p => p.filter(x => x !== v)),
    [],
  );

  // Validation
  const validate = useCallback(() => {
    if (step === 1) {
      if (!name.trim()) {
        Alert.alert('Required', 'Enter your full name.');
        return false;
      }
      if (mobile.length !== 10) {
        Alert.alert('Invalid', '10-digit mobile required.');
        return false;
      }
      if (aadhaar.length !== 12) {
        Alert.alert('Invalid', '12-digit Aadhaar required.');
        return false;
      }
      if (!village.trim()) {
        Alert.alert('Required', 'Enter your village.');
        return false;
      }
      if (!dist.trim()) {
        Alert.alert('Required', 'Enter your district.');
        return false;
      }
      if (!state) {
        Alert.alert('Required', 'Select your state.');
        return false;
      }
    }
    if (step === 2 && !farmerCount.trim()) {
      Alert.alert('Required', 'Enter your farmer network size.');
      return false;
    }
    if (step === 3 && trainingDone < 5) {
      Alert.alert(
        'Training Incomplete',
        `You have completed ${trainingDone}/5 trainings.\nAll 5 are mandatory to proceed.`,
      );
      return false;
    }
    if (step === 4 && villageList.length === 0) {
      Alert.alert('Required', 'Add at least one village to your territory.');
      return false;
    }
    return true;
  }, [
    step,
    name,
    mobile,
    aadhaar,
    village,
    dist,
    state,
    farmerCount,
    trainingDone,
    villageList,
  ]);

  const goNext = useCallback(() => {
    if (!validate()) return;
    if (step < STEPS.length) {
      setStep(s => s + 1);
      setTimeout(
        () => scrollRef.current?.scrollTo({ y: 0, animated: false }),
        50,
      );
    }
  }, [step, validate]);

  const goBack = useCallback(() => {
    if (step > 1) {
      setStep(s => s - 1);
      setTimeout(
        () => scrollRef.current?.scrollTo({ y: 0, animated: false }),
        50,
      );
    } else navigation?.goBack?.();
  }, [step, navigation]);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    const payload = {
      personal: { name, mobile, aadhaar, village, district: dist, state },
      business: {
        farmerCount,
        activeVillages: activeVills,
        experience,
        businessDesc,
      },
      training,
      territory: {
        villages: villageList,
        coverageRadius,
        wantsMore,
        moreNotes,
      },
      registeredAt: new Date().toISOString(),
    };
    console.log(
      '[SoilPartner] Registration:',
      JSON.stringify(payload, null, 2),
    );
    // TODO: dispatch(registerSoilPartner(payload))
    setTimeout(() => {
      setSubmitting(false);
      Alert.alert(
        '🎉 Registration Submitted!',
        `Welcome ${name}!\nYour Soil Partner profile is under review. We'll verify within 24 hours.`,
        [
          {
            text: 'Go to Dashboard',
            onPress: () => navigation?.replace?.('SoilPartnerDashboard'),
          },
        ],
      );
    }, 1500);
  }, [
    name,
    mobile,
    aadhaar,
    village,
    dist,
    state,
    farmerCount,
    activeVills,
    experience,
    businessDesc,
    training,
    villageList,
    coverageRadius,
    wantsMore,
    moreNotes,
    navigation,
  ]);

  // ─── STEP CONTENT ────────────────────────────────────────────────────────
  const renderContent = () => {
    switch (step) {
      // ── STEP 1 ─────────────────────────────────────────────────────────
      case 1:
        return (
          <>
            <StepHeader
              icon="👤"
              title="Personal Profile"
              subtitle="Your identity details"
              T={T}
            />
            <SectionCard T={T}>
              <Field
                label="Full Name"
                value={name}
                onChangeText={setName}
                placeholder="e.g. Ravi Kumar"
                required
                T={T}
              />
              <Field
                label="Mobile Number"
                value={mobile}
                onChangeText={setMobile}
                placeholder="10-digit mobile"
                required
                keyboardType="phone-pad"
                maxLength={10}
                T={T}
              />
              <Field
                label="Aadhaar Number"
                value={aadhaar}
                onChangeText={setAadhaar}
                placeholder="12-digit Aadhaar"
                required
                keyboardType="numeric"
                maxLength={12}
                hint="Stored securely. Used only for verification."
                T={T}
              />
            </SectionCard>
            <SectionCard T={T}>
              <Field
                label="Village"
                value={village}
                onChangeText={setVillage}
                placeholder="Your village"
                required
                T={T}
              />
              <Field
                label="District"
                value={dist}
                onChangeText={setDist}
                placeholder="Your district"
                required
                T={T}
              />
              <StatePicker value={state} onSelect={setState} T={T} />
            </SectionCard>
            <InfoBanner
              icon="🔒"
              text="Your personal info is encrypted and used only for ArkaShine partner verification."
              color={T.primary}
              T={T}
            />
          </>
        );

      // ── STEP 2 ─────────────────────────────────────────────────────────
      case 2:
        return (
          <>
            <StepHeader
              icon="🏢"
              title="Business Profile"
              subtitle="Your farmer network & experience"
              T={T}
            />
            {/* Live preview metrics */}
            <View style={s.metricRow}>
              {[
                {
                  icon: '👨‍🌾',
                  val: farmerCount || '0',
                  lbl: 'Farmers',
                  col: T.primary,
                },
                {
                  icon: '🏘️',
                  val: activeVills || '0',
                  lbl: 'Villages',
                  col: T.blue,
                },
                {
                  icon: '📅',
                  val: experience ? experience + 'y' : '0y',
                  lbl: 'Exp.',
                  col: T.yellow,
                },
              ].map(m => (
                <View
                  key={m.lbl}
                  style={[
                    s.metricCard,
                    { backgroundColor: T.card, borderColor: T.cardBorder },
                    Shadow.sm,
                  ]}
                >
                  <Text style={s.metricIcon}>{m.icon}</Text>
                  <Text style={[s.metricVal, { color: m.col }]}>{m.val}</Text>
                  <Text style={[s.metricLbl, { color: T.muted }]}>{m.lbl}</Text>
                </View>
              ))}
            </View>
            <SectionCard T={T}>
              <Field
                label="Existing Farmer Network"
                value={farmerCount}
                onChangeText={setFarmerCount}
                placeholder="How many farmers you know"
                keyboardType="numeric"
                required
                hint="Approximate total in your current network"
                T={T}
              />
              <Field
                label="Active Villages"
                value={activeVills}
                onChangeText={setActiveVills}
                placeholder="Villages you currently work in"
                keyboardType="numeric"
                T={T}
              />
              <Field
                label="Years of Experience"
                value={experience}
                onChangeText={setExperience}
                placeholder="e.g. 3"
                keyboardType="numeric"
                maxLength={2}
                T={T}
              />
              <Field
                label="About Your Work"
                value={businessDesc}
                onChangeText={setBusinessDesc}
                placeholder="Brief description of your agricultural work…"
                multiline
                T={T}
              />
            </SectionCard>
            <InfoBanner
              icon="💡"
              text="Your existing network is your biggest asset. ArkaShine will help you grow and earn more."
              color={T.blue}
              T={T}
            />
          </>
        );

      // ── STEP 3 ─────────────────────────────────────────────────────────
      case 3:
        return (
          <>
            <StepHeader
              icon="🎓"
              title="Training Verification"
              subtitle="Confirm completed ArkaShine trainings"
              T={T}
            />
            <View
              style={[
                s.trainingHeader,
                { backgroundColor: T.card, borderColor: T.cardBorder },
                Shadow.sm,
              ]}
            >
              <View
                style={[
                  s.trainingRing,
                  {
                    borderColor:
                      trainingDone === 5
                        ? T.primary
                        : trainingDone >= 3
                        ? T.yellow
                        : T.red,
                  },
                ]}
              >
                <Text
                  style={[
                    s.ringNum,
                    { color: trainingDone === 5 ? T.primary : T.yellow },
                  ]}
                >
                  {trainingDone}
                </Text>
                <Text style={[s.ringOf, { color: T.muted }]}>/5</Text>
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[s.trainingTitle, { color: T.text }]}>
                  ArkaShine Training Status
                </Text>
                <Text style={[s.trainingSub, { color: T.muted }]}>
                  {trainingDone === 5
                    ? '✅ All 5 trainings complete! Ready to proceed.'
                    : `${5 - trainingDone} training${
                        5 - trainingDone > 1 ? 's' : ''
                      } remaining.`}
                </Text>
                {/* Mini progress bar */}
                <View style={[s.miniBarTrack, { backgroundColor: T.divider }]}>
                  <View
                    style={[
                      s.miniBarFill,
                      {
                        width: `${(trainingDone / 5) * 100}%`,
                        backgroundColor:
                          trainingDone === 5 ? T.primary : T.yellow,
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
            <SectionCard T={T}>
              {TRAINING_ITEMS.map(item => (
                <CheckRow
                  key={item.key}
                  label={item.label}
                  icon={item.icon}
                  checked={training[item.key]}
                  onToggle={() => toggleTraining(item.key)}
                  T={T}
                />
              ))}
            </SectionCard>
            {trainingDone < 5 && (
              <InfoBanner
                icon="⚠️"
                text="All 5 trainings are mandatory. Contact your ArkaShine coordinator if you haven't attended."
                color={T.warning}
                T={T}
              />
            )}
          </>
        );

      // ── STEP 4 ─────────────────────────────────────────────────────────
      case 4:
        return (
          <>
            <StepHeader
              icon="🗺️"
              title="Territory Mapping"
              subtitle="Define your working area"
              T={T}
            />
            <SectionCard T={T}>
              <Text style={[s.secLbl, { color: T.textSub }]}>
                Villages in Your Territory *
              </Text>
              <Text style={[s.secHint, { color: T.muted }]}>
                Add each village you plan to serve. You can request additions
                later via admin.
              </Text>
              <View style={s.addVillRow}>
                <TextInput
                  value={villageInput}
                  onChangeText={setVillageInput}
                  placeholder="Village name…"
                  placeholderTextColor={T.muted}
                  style={[
                    s.villInput,
                    {
                      backgroundColor: T.inputBg,
                      borderColor: T.inputBorder,
                      color: T.text,
                    },
                  ]}
                  onSubmitEditing={addVillage}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  onPress={addVillage}
                  activeOpacity={0.85}
                  style={[s.addBtn, { backgroundColor: T.primary }]}
                >
                  <Text style={s.addBtnTxt}>＋ Add</Text>
                </TouchableOpacity>
              </View>
              {villageList.length > 0 && (
                <View style={s.tagWrap}>
                  {villageList.map(v => (
                    <TagPill
                      key={v}
                      label={v}
                      onRemove={() => removeVillage(v)}
                      T={T}
                    />
                  ))}
                </View>
              )}
              {villageList.length > 0 && (
                <View
                  style={[
                    s.villageCount,
                    {
                      backgroundColor: T.primaryDim,
                      borderColor: T.primary + '44',
                    },
                  ]}
                >
                  <Text style={[s.villageCountTxt, { color: T.primary }]}>
                    🏘️ {villageList.length} village
                    {villageList.length > 1 ? 's' : ''} added to your territory
                  </Text>
                </View>
              )}
            </SectionCard>

            <SectionCard T={T}>
              <Field
                label="Coverage Radius (km)"
                value={coverageRadius}
                onChangeText={setCoverageRadius}
                placeholder="e.g. 20"
                keyboardType="numeric"
                hint="Maximum distance you can travel from your home village"
                T={T}
              />
            </SectionCard>

            <TouchableOpacity
              onPress={() => setWantsMore(v => !v)}
              activeOpacity={0.75}
              style={[
                s.toggleRow,
                {
                  backgroundColor: wantsMore ? T.primaryDim : T.card,
                  borderColor: wantsMore ? T.primary : T.cardBorder,
                },
              ]}
            >
              <View
                style={[
                  s.toggleBox,
                  {
                    borderColor: wantsMore ? T.primary : T.muted,
                    backgroundColor: wantsMore ? T.primary : 'transparent',
                  },
                ]}
              >
                {wantsMore ? (
                  <Text
                    style={{ color: '#fff', fontSize: 12, fontWeight: '900' }}
                  >
                    ✓
                  </Text>
                ) : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.toggleLbl, { color: T.text }]}>
                  I want to expand to more areas
                </Text>
                <Text style={[s.toggleSub, { color: T.muted }]}>
                  Admin will review expansion requests
                </Text>
              </View>
            </TouchableOpacity>

            {wantsMore && (
              <SectionCard T={T}>
                <Field
                  label="Preferred Expansion Areas"
                  value={moreNotes}
                  onChangeText={setMoreNotes}
                  placeholder="Describe areas you'd like to work in…"
                  multiline
                  hint="Admin will review and approve based on availability"
                  T={T}
                />
              </SectionCard>
            )}
            <InfoBanner
              icon="📍"
              text="You will be geo-fenced to your approved territory. Expansion requests can be submitted anytime."
              color={T.blue}
              T={T}
            />
          </>
        );

      // ── STEP 5 ─────────────────────────────────────────────────────────
      case 5:
        return (
          <>
            <StepHeader
              icon="✅"
              title="Review & Submit"
              subtitle="Confirm all details before submitting"
              T={T}
            />

            <SectionCard T={T}>
              <Text style={[s.revSection, { color: T.primary }]}>
                👤 Personal Details
              </Text>
              <ReviewRow label="Name" value={name} T={T} />
              <ReviewRow label="Mobile" value={mobile} T={T} />
              <ReviewRow
                label="Aadhaar"
                value={aadhaar.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3')}
                T={T}
              />
              <ReviewRow label="Village" value={village} T={T} />
              <ReviewRow label="District" value={dist} T={T} />
              <ReviewRow label="State" value={state} T={T} />
            </SectionCard>

            <SectionCard T={T}>
              <Text style={[s.revSection, { color: T.primary }]}>
                🏢 Business Profile
              </Text>
              <ReviewRow
                label="Farmer Network"
                value={farmerCount + ' farmers'}
                T={T}
              />
              <ReviewRow
                label="Active Villages"
                value={activeVills || '—'}
                T={T}
              />
              <ReviewRow
                label="Experience"
                value={experience ? experience + ' years' : '—'}
                T={T}
              />
            </SectionCard>

            <SectionCard T={T}>
              <Text style={[s.revSection, { color: T.primary }]}>
                🎓 Training ({trainingDone}/5)
              </Text>
              {TRAINING_ITEMS.map(item => (
                <View
                  key={item.key}
                  style={[s.trainingRevRow, { borderBottomColor: T.divider }]}
                >
                  <Text style={{ fontSize: 16 }}>{item.icon}</Text>
                  <Text style={[s.trainingRevLabel, { color: T.text }]}>
                    {item.label}
                  </Text>
                  <View
                    style={[
                      s.trainingRevBadge,
                      {
                        backgroundColor: training[item.key]
                          ? T.primary + '22'
                          : T.red + '18',
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: training[item.key] ? T.primary : T.red,
                        fontSize: 11,
                        fontWeight: '800',
                      }}
                    >
                      {training[item.key] ? '✓ Done' : '✗ Pending'}
                    </Text>
                  </View>
                </View>
              ))}
            </SectionCard>

            <SectionCard T={T}>
              <Text style={[s.revSection, { color: T.primary }]}>
                🗺️ Territory
              </Text>
              <ReviewRow
                label="Villages"
                value={villageList.join(', ')}
                T={T}
              />
              <ReviewRow
                label="Coverage"
                value={coverageRadius ? coverageRadius + ' km radius' : '—'}
                T={T}
              />
              <ReviewRow
                label="Expand Later"
                value={wantsMore ? 'Yes — expansion requested' : 'No'}
                T={T}
              />
            </SectionCard>

            <View
              style={[
                s.declaration,
                {
                  backgroundColor: T.primaryDim,
                  borderColor: T.primary + '44',
                },
              ]}
            >
              <Text style={[s.declarationTxt, { color: T.primary }]}>
                📋 By submitting, I confirm all information is accurate and I
                agree to operate within my approved territory as a certified
                ArkaShine Soil Partner.
              </Text>
            </View>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[s.root, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.bg} />

      {/* Top bar */}
      <View style={[s.topBar, { borderBottomColor: T.divider }]}>
        <TouchableOpacity
          onPress={goBack}
          activeOpacity={0.75}
          style={s.backBtn}
        >
          <Text style={[s.backArrow, { color: T.text }]}>←</Text>
        </TouchableOpacity>
        <View style={s.topCenter}>
          <Text style={[s.topTitle, { color: T.text }]}>
            Soil Partner Registration
          </Text>
          <Text style={[s.topSub, { color: T.muted }]}>
            Step {step} of {STEPS.length} — {STEPS[step - 1].title}
          </Text>
        </View>
        <View
          style={[
            s.logoChip,
            { backgroundColor: T.primaryDim, borderColor: T.primary + '55' },
          ]}
        >
          <Text style={[s.logoTxt, { color: T.primary }]}>🌱 ArkaSaathi</Text>
        </View>
      </View>

      <StepProgress current={step} total={STEPS.length} T={T} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[s.scroll, { paddingBottom: 130 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderContent()}
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomNavBar
        step={step}
        totalSteps={STEPS.length}
        onBack={goBack}
        onNext={step === STEPS.length ? handleSubmit : goNext}
        nextLabel={
          step === STEPS.length
            ? '🎉 Submit Registration'
            : `Next: ${STEPS[step]?.title ?? 'Submit'} →`
        }
        loading={submitting}
        T={T}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: { fontSize: 22, fontWeight: '300' },
  topCenter: { flex: 1 },
  topTitle: { fontSize: 15, fontWeight: '800' },
  topSub: { fontSize: 11, marginTop: 1 },
  logoChip: {
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1.5,
  },
  logoTxt: { fontSize: 11, fontWeight: '800' },
  scroll: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },

  // metric row
  metricRow: { flexDirection: 'row', gap: 10, marginBottom: Spacing.md },
  metricCard: {
    flex: 1,
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1.5,
    paddingVertical: 14,
    gap: 4,
  },
  metricIcon: { fontSize: 20 },
  metricVal: { fontSize: 20, fontWeight: '900' },
  metricLbl: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  // training header
  trainingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: Spacing.md,
  },
  trainingRing: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  ringNum: { fontSize: 22, fontWeight: '900' },
  ringOf: { fontSize: 14, fontWeight: '700' },
  trainingTitle: { fontSize: 14, fontWeight: '800' },
  trainingSub: { fontSize: 12 },
  miniBarTrack: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 6,
  },
  miniBarFill: { height: '100%', borderRadius: 3 },

  // village input
  secLbl: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  secHint: { fontSize: 12, marginBottom: Spacing.md, lineHeight: 17 },
  addVillRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  villInput: {
    flex: 1,
    height: 46,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: '500',
  },
  addBtn: {
    paddingHorizontal: 18,
    height: 46,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '800' },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  villageCount: {
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  villageCountTxt: { fontSize: 13, fontWeight: '700' },

  // toggle
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: Spacing.md,
  },
  toggleBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  toggleLbl: { fontSize: 14, fontWeight: '700' },
  toggleSub: { fontSize: 12, marginTop: 2 },

  // review
  revSection: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginBottom: 10,
  },
  trainingRevRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  trainingRevLabel: { flex: 1, fontSize: 13, fontWeight: '600' },
  trainingRevBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  declaration: {
    borderRadius: Radius.md,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: Spacing.md,
  },
  declarationTxt: { fontSize: 13, fontWeight: '600', lineHeight: 20 },
});
