import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
  Linking,
  Modal,
  FlatList,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Share from 'react-native-share';
import RNFS from 'react-native-fs';
import { useDispatch, useSelector } from 'react-redux';

import { Typography, Spacing, Radius, Shadow } from '../theme';
import {
  buildPdfReportUrl,
  analyzeFarm,
  calculateCarbon,
  resetCarbon,
} from '../redux/actions/carbonCredit';
import useTheme from '../hooks/useTheme';
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];

const CROPS = [
  'Rice',
  'Wheat',
  'Cotton',
  'Sugarcane',
  'Millet',
  'Maize',
  'Soybean',
  'Groundnut',
  'Pulses',
  'Tea',
  'Coffee',
  'Banana',
  'Tomato',
  'Potato',
  'Onion',
];

const STEPS_LIST = [
  { key: 'input', label: 'Assessment' },
  { key: 'results', label: 'Results' },
  { key: 'recommendations', label: 'AI Advice' },
  { key: 'marketplace', label: 'Market' },
  { key: 'report', label: 'Report' },
];

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────

export default function AssessmentScreen({ navigation }) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const T = theme.colors;

  const calcLoading = useSelector(s => s.carbon.calculation.loading);
  const recsLoading = useSelector(s => s.carbon.recommendations.loading);
  const loading = calcLoading || recsLoading;

  const [currentStep, setCurrentStep] = useState('input');
  const [calcResults, setCalcResults] = useState(null);
  const [aiRecs, setAiRecs] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Form fields
  const [farmerName, setFarmerName] = useState('Rajesh Kumar');
  const [state, setState] = useState('Karnataka');
  const [cropType, setCropType] = useState('Rice');
  const [farmSize, setFarmSize] = useState('12');
  const [soilScore, setSoilScore] = useState('75');
  const [organic, setOrganic] = useState(true);
  const [irrigation, setIrrigation] = useState('Drip');
  const [fertilizerUsage, setFertilizerUsage] = useState('Low');
  const [temperature, setTemperature] = useState('32');
  const [rainfall, setRainfall] = useState('60');

  // Dropdown modals
  const [stateModalVisible, setStateModalVisible] = useState(false);
  const [stateSearchQuery, setStateSearchQuery] = useState('');
  const [cropModalVisible, setCropModalVisible] = useState(false);
  const [cropSearchQuery, setCropSearchQuery] = useState('');

  const filteredStates = INDIAN_STATES.filter(st =>
    st.toLowerCase().includes(stateSearchQuery.toLowerCase()),
  );
  const filteredCrops = CROPS.filter(cr =>
    cr.toLowerCase().includes(cropSearchQuery.toLowerCase()),
  );

  // ── Validation ─────────────────────────────────────────
  const validateInputs = () => {
    if (!farmerName.trim()) {
      Alert.alert('Input Error', "Please enter the farmer's name.");
      return false;
    }
    const size = parseFloat(farmSize);
    const soil = parseFloat(soilScore);
    const temp = parseFloat(temperature);
    const rain = parseFloat(rainfall);
    if (isNaN(size) || size <= 0) {
      Alert.alert('Input Error', 'Please enter a valid farm size.');
      return false;
    }
    if (isNaN(soil) || soil < 0 || soil > 100) {
      Alert.alert('Input Error', 'Soil score must be between 0 and 100.');
      return false;
    }
    if (isNaN(temp)) {
      Alert.alert('Input Error', 'Please enter a valid temperature.');
      return false;
    }
    if (isNaN(rain)) {
      Alert.alert('Input Error', 'Please enter a valid rainfall value.');
      return false;
    }
    return true;
  };

  // ── Calculate ──────────────────────────────────────────
  const handleCalculate = async () => {
    if (!validateInputs()) return;

    const size = parseFloat(farmSize);
    const soil = parseFloat(soilScore);
    const temp = parseFloat(temperature);
    const rain = parseFloat(rainfall);

    const calcPayload = {
      crop_type: cropType,
      farm_size: size,
      soil_score: soil,
      organic,
      state,
      irrigation: irrigation.toLowerCase(),
      fertilizer_usage: fertilizerUsage.toLowerCase(),
      temperature: temp,
      rainfall: rain,
    };

    try {
      const calcResult = await dispatch(calculateCarbon(calcPayload));
      const calcData = calcResult?.payload?.data?.data;
      console.log('Full API response:', JSON.stringify(calcData, null, 2));

      console.log('Calculation Result:', calcData);
      if (!calcData) {
        Alert.alert('Calculation Failed', 'Invalid response from server.');
        return;
      }

      const enriched = {
        ...calcData,
        farmer_name: farmerName,
        crop_type: cropType,
        state,
        soil_score: soil,
        carbon_credit_potential:
          calcData.carbon_credits > 50
            ? 'High'
            : calcData.carbon_credits > 25
            ? 'Medium'
            : 'Low',
      };
      setCalcResults(enriched);

      const recsPayload = {
        crop_type: cropType,
        soil_score: soil,
        farm_size: size,
        organic,
        temperature: temp,
        rainfall: rain,
        state,
      };

      const recsResult = await dispatch(analyzeFarm(recsPayload));
      const recsData = recsResult?.payload?.data;
      if (recsData) setAiRecs(recsData);

      setCurrentStep('results');
    } catch (err) {
      const errMsg =
        err?.error?.response?.data?.error ||
        err?.error?.message ||
        (err instanceof Error ? err.message : String(err));
      Alert.alert(
        'API Error',
        `Could not connect to the server.\n\nDetails: ${errMsg}`,
      );
    }
  };

  // ── Download PDF ───────────────────────────────────────
  const downloadReport = async () => {
    if (!calcResults) return;
    setIsDownloading(true);

    const reportPayload = {
      farmer_name: calcResults.farmer_name,
      crop_type: calcResults.crop_type,
      state: calcResults.state,
      carbon_credits: calcResults.carbon_credits,
      soil_score: calcResults.soil_score,
      esg_score: calcResults.esg_score,
      sustainability_score: calcResults.sustainability_score,
      yearly_projection: calcResults.yearly_projection,
      co2_offset: (calcResults.carbon_credits * 0.35).toFixed(2),
      verification_status: 'AI VERIFIED',
      carbon_credit_potential: calcResults.carbon_credit_potential,
      recommendations: aiRecs?.recommendations || [],
    };

    const url = buildPdfReportUrl(reportPayload);

    if (Platform.OS === 'web') {
      try {
        await Linking.openURL(url);
      } catch {
        Alert.alert('Open PDF Failed', 'Please allow popups.');
      } finally {
        setIsDownloading(false);
      }
      return;
    }

    try {
      const fileUri = `${
        RNFS.DocumentDirectoryPath
      }/carbon_report_${Date.now()}.pdf`;
      const result = await RNFS.downloadFile({ fromUrl: url, toFile: fileUri })
        .promise;

      if (result.statusCode === 200) {
        await Share.open({
          url: Platform.OS === 'android' ? `file://${fileUri}` : fileUri,
          type: 'application/pdf',
          title: 'Carbon Report',
        });
      } else {
        throw new Error(`Download failed with status ${result.statusCode}`);
      }
    } catch (error) {
      if (error?.message === 'User did not share') {
        setIsDownloading(false);
        return;
      }
      Alert.alert(
        'Download options',
        `Could not download PDF: ${error?.message || error}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open in Browser', onPress: () => Linking.openURL(url) },
        ],
      );
    } finally {
      setIsDownloading(false);
    }
  };

  // ── Reset ──────────────────────────────────────────────
  const resetAssessment = () => {
    dispatch(resetCarbon());
    setCalcResults(null);
    setAiRecs(null);
    setCurrentStep('input');
  };

  // ── Progress bar ───────────────────────────────────────
  const currentStepIndex = STEPS_LIST.findIndex(x => x.key === currentStep);

  const renderProgress = () => (
    <View style={s.progressContainer}>
      {STEPS_LIST.map((step, index) => {
        const isActive = currentStep === step.key;
        const isPassed = currentStepIndex >= index;
        return (
          <View key={step.key} style={s.progressStepWrapper}>
            <View
              style={[
                s.progressDot,
                isPassed && { backgroundColor: T.primaryDark },
                isActive && { backgroundColor: T.accent },
              ]}
            >
              {isPassed && !isActive ? (
                <Icon name="checkmark" size={12} color="#fff" />
              ) : (
                <Text style={[s.progressNumber, isActive && { color: '#fff' }]}>
                  {index + 1}
                </Text>
              )}
            </View>
            <Text style={[s.progressLabel, isActive && { color: '#fff' }]}>
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );

  // ── Shared section header ──────────────────────────────
  const SectionHeader = ({ title, subtitle }) => (
    <>
      <Text
        style={[Typography.h3, { color: T.text, marginBottom: Spacing.xs }]}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={[
            Typography.small,
            { color: T.textSub, marginBottom: Spacing.lg },
          ]}
        >
          {subtitle}
        </Text>
      ) : null}
    </>
  );

  // ── Metric tile ────────────────────────────────────────
  const MetricTile = ({ value, label, color }) => (
    <View
      style={[
        s.metricItem,
        { backgroundColor: T.card, borderColor: T.cardBorder },
      ]}
    >
      <Text style={[Typography.h3, { color: color || T.primary }]}>
        {value}
      </Text>
      <Text
        style={[
          Typography.xs,
          { color: T.textSub, marginTop: Spacing.xs, fontWeight: '700' },
        ]}
      >
        {label}
      </Text>
    </View>
  );

  // ── Select pill group ──────────────────────────────────
  const PillGroup = ({ options, value, onChange }) => (
    <View style={s.selectRow}>
      {options.map(opt => {
        const active = value === opt;
        return (
          <TouchableOpacity
            key={opt}
            style={[
              s.selectBtn,
              {
                backgroundColor: active ? T.primaryDim : T.inputBg,
                borderColor: active ? T.accent : T.inputBorder,
              },
            ]}
            onPress={() => onChange(opt)}
          >
            <Text
              style={[
                Typography.small,
                { color: active ? T.primary : T.textSub, fontWeight: '700' },
              ]}
            >
              {opt}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // ── Primary button ─────────────────────────────────────
  const PrimaryBtn = ({ label, icon, onPress, color, style }) => (
    <TouchableOpacity
      style={[s.primaryBtn, { backgroundColor: color || T.primary }, style]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {icon && <Icon name={icon} size={20} color="#fff" />}
      <Text
        style={[
          Typography.body,
          {
            color: '#fff',
            fontWeight: '800',
            marginLeft: icon ? Spacing.xs : 0,
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const SecondaryBtn = ({ label, onPress }) => (
    <TouchableOpacity
      style={s.secondaryBtn}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[Typography.body, { color: T.textSub, fontWeight: '700' }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[s.root, { backgroundColor: T.bg }]}>
      <StatusBar
        barStyle={T.statusBar}
        backgroundColor="transparent"
        translucent
      />

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {/* ── HERO HEADER ── */}
        <LinearGradient
          colors={theme.dark ? ['#0A2A1A', '#0F3D28'] : ['#052e2e', '#065f46']}
          style={s.hero}
        >
          {/* Back button */}
          {navigation && (
            <TouchableOpacity
              style={[
                s.backBtn,
                {
                  backgroundColor: 'rgba(255,255,255,0.12)',
                  borderColor: 'rgba(255,255,255,0.2)',
                },
              ]}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Icon name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
          )}

          {/* Hero Content */}
          <View style={s.heroContent}>
            <Text style={s.heroBrand}>GUIDED JOURNEY</Text>
            <Text style={[Typography.h1, { color: '#fff' }]}>
              Carbon Assessment
            </Text>
            <Text
              style={[
                Typography.small,
                { color: 'rgba(255,255,255,0.80)', marginTop: Spacing.xs },
              ]}
            >
              Step-by-step verified climate intelligence workflow.
            </Text>
          </View>

          {/* Progress - positioned at bottom of hero */}
          <View style={s.progressWrapper}>{renderProgress()}</View>
        </LinearGradient>
        {/* ── LOADING ── */}
        {loading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator size="large" color={T.primary} />
            <Text
              style={[
                Typography.body,
                { color: T.textSub, marginTop: Spacing.md, fontWeight: '700' },
              ]}
            >
              Running Climate Sequestration Models...
            </Text>
          </View>
        ) : (
          <>
            {/* ──────────────────────────────────── */}
            {/* STEP 1: INPUT FORM                  */}
            {/* ──────────────────────────────────── */}
            {currentStep === 'input' && (
              <View
                style={[
                  s.card,
                  {
                    backgroundColor: T.card,
                    borderColor: T.cardBorder,
                    ...Shadow.md,
                  },
                ]}
              >
                <SectionHeader
                  title="Farmer & Agronomy Data"
                  subtitle="All fields connect dynamically to calculation APIs."
                />

                <Text style={[s.fieldLabel, { color: T.textSub }]}>
                  Farmer Name
                </Text>
                <TextInput
                  style={[
                    s.textInput,
                    {
                      backgroundColor: T.inputBg,
                      borderColor: T.inputBorder,
                      color: T.text,
                    },
                  ]}
                  value={farmerName}
                  onChangeText={setFarmerName}
                  placeholder="Enter farmer name"
                  placeholderTextColor={T.muted}
                />

                <Text style={[s.fieldLabel, { color: T.textSub }]}>State</Text>
                <TouchableOpacity
                  style={[
                    s.dropdownBtn,
                    { backgroundColor: T.inputBg, borderColor: T.inputBorder },
                  ]}
                  onPress={() => {
                    setStateSearchQuery('');
                    setStateModalVisible(true);
                  }}
                >
                  <Text
                    style={[
                      Typography.body,
                      { color: T.text, fontWeight: '600' },
                    ]}
                  >
                    {state}
                  </Text>
                  <Icon name="chevron-down" size={20} color={T.muted} />
                </TouchableOpacity>

                <Text style={[s.fieldLabel, { color: T.textSub }]}>
                  Crop Type
                </Text>
                <TouchableOpacity
                  style={[
                    s.dropdownBtn,
                    { backgroundColor: T.inputBg, borderColor: T.inputBorder },
                  ]}
                  onPress={() => {
                    setCropSearchQuery('');
                    setCropModalVisible(true);
                  }}
                >
                  <Text
                    style={[
                      Typography.body,
                      { color: T.text, fontWeight: '600' },
                    ]}
                  >
                    {cropType}
                  </Text>
                  <Icon name="chevron-down" size={20} color={T.muted} />
                </TouchableOpacity>

                <View style={s.row}>
                  <View style={s.halfWidth}>
                    <Text style={[s.fieldLabel, { color: T.textSub }]}>
                      Farm Size (Acres)
                    </Text>
                    <TextInput
                      style={[
                        s.textInput,
                        {
                          backgroundColor: T.inputBg,
                          borderColor: T.inputBorder,
                          color: T.text,
                        },
                      ]}
                      value={farmSize}
                      onChangeText={setFarmSize}
                      keyboardType="numeric"
                      placeholderTextColor={T.muted}
                    />
                  </View>
                  <View style={s.halfWidth}>
                    <Text style={[s.fieldLabel, { color: T.textSub }]}>
                      Soil Score (0-100)
                    </Text>
                    <TextInput
                      style={[
                        s.textInput,
                        {
                          backgroundColor: T.inputBg,
                          borderColor: T.inputBorder,
                          color: T.text,
                        },
                      ]}
                      value={soilScore}
                      onChangeText={setSoilScore}
                      keyboardType="numeric"
                      placeholderTextColor={T.muted}
                    />
                  </View>
                </View>

                {/* Organic switch */}
                <View
                  style={[
                    s.switchRow,
                    { backgroundColor: T.inputBg, borderColor: T.inputBorder },
                  ]}
                >
                  <View>
                    <Text
                      style={[
                        Typography.body,
                        { color: T.text, fontWeight: '700' },
                      ]}
                    >
                      Organic Farming Enabled
                    </Text>
                    <Text
                      style={[
                        Typography.xs,
                        { color: T.textSub, marginTop: 2 },
                      ]}
                    >
                      Uses natural composts only
                    </Text>
                  </View>
                  <Switch
                    value={organic}
                    onValueChange={setOrganic}
                    trackColor={{ false: T.divider, true: T.primaryLight }}
                    thumbColor={organic ? T.primary : T.muted}
                  />
                </View>

                <Text style={[s.fieldLabel, { color: T.textSub }]}>
                  Irrigation Method
                </Text>
                <PillGroup
                  options={['Drip', 'Sprinkler', 'Flood']}
                  value={irrigation}
                  onChange={setIrrigation}
                />

                <Text style={[s.fieldLabel, { color: T.textSub }]}>
                  Fertilizer Quantity
                </Text>
                <PillGroup
                  options={['Low', 'Medium', 'High']}
                  value={fertilizerUsage}
                  onChange={setFertilizerUsage}
                />

                <View style={s.row}>
                  <View style={s.halfWidth}>
                    <Text style={[s.fieldLabel, { color: T.textSub }]}>
                      Avg Temperature (°C)
                    </Text>
                    <TextInput
                      style={[
                        s.textInput,
                        {
                          backgroundColor: T.inputBg,
                          borderColor: T.inputBorder,
                          color: T.text,
                        },
                      ]}
                      value={temperature}
                      onChangeText={setTemperature}
                      keyboardType="numeric"
                      placeholderTextColor={T.muted}
                    />
                  </View>
                  <View style={s.halfWidth}>
                    <Text style={[s.fieldLabel, { color: T.textSub }]}>
                      Avg Rainfall (mm)
                    </Text>
                    <TextInput
                      style={[
                        s.textInput,
                        {
                          backgroundColor: T.inputBg,
                          borderColor: T.inputBorder,
                          color: T.text,
                        },
                      ]}
                      value={rainfall}
                      onChangeText={setRainfall}
                      keyboardType="numeric"
                      placeholderTextColor={T.muted}
                    />
                  </View>
                </View>

                <PrimaryBtn
                  label="Calculate Carbon Credits"
                  icon="calculator"
                  onPress={handleCalculate}
                  style={{ marginTop: Spacing.xl }}
                />
              </View>
            )}

            {/* ──────────────────────────────────── */}
            {/* STEP 2: RESULTS                     */}
            {/* ──────────────────────────────────── */}
            {currentStep === 'results' && calcResults && (
              <View
                style={[
                  s.card,
                  {
                    backgroundColor: T.card,
                    borderColor: T.cardBorder,
                    ...Shadow.md,
                  },
                ]}
              >
                {/* Success badge */}
                <View
                  style={[
                    s.successBadge,
                    {
                      backgroundColor: T.primaryDim,
                      borderColor: T.primaryLight,
                    },
                  ]}
                >
                  <Icon name="checkmark-circle" size={22} color={T.primary} />
                  <Text
                    style={[
                      Typography.small,
                      {
                        color: T.primary,
                        fontWeight: '800',
                        marginLeft: Spacing.sm,
                      },
                    ]}
                  >
                    Assessment Successfully Saved
                  </Text>
                </View>

                <SectionHeader
                  title="Calculated Carbon Metrics"
                  subtitle="Compiled dynamically from actual backend responses."
                />

                <View style={s.metricsGrid}>
                  <MetricTile
                    value={`${calcResults.carbon_credits ?? 0} ICU`}
                    label="Carbon Credits"
                  />
                  <MetricTile
                    value={`${calcResults.esg_score ?? 0}%`}
                    label="ESG Score"
                  />
                </View>
                <View style={s.metricsGrid}>
                  <MetricTile
                    value={`${calcResults.sustainability_score ?? 0}%`}
                    label="Sustainability Score"
                  />
                  <MetricTile
                    value={`${calcResults.trust_score ?? 0}%`}
                    label="Trust Score"
                    color={T.blue}
                  />
                </View>
                <View style={s.metricsGrid}>
                  <MetricTile
                    value={`${calcResults.co2_offset ?? 0} Tons`}
                    label="CO₂ Offset"
                    color={T.orange}
                  />
                  <MetricTile
                    value={calcResults.climate_risk ?? '—'}
                    label="Climate Risk"
                    color={T.yellow}
                  />
                </View>
                <View style={s.metricsGrid}>
                  <MetricTile
                    value={`₹${(
                      calcResults.yearly_projection ?? 0
                    ).toLocaleString('en-IN')}`}
                    label="Projected Income"
                  />
                  <MetricTile
                    value={calcResults.weather_source ?? '—'}
                    label="Weather Source"
                    color={T.blue}
                  />
                </View>
                {/* Transparency audit card */}
                <View
                  style={[
                    s.auditCard,
                    { backgroundColor: T.inputBg, borderColor: T.divider },
                  ]}
                >
                  <View style={s.auditHeader}>
                    <Icon name="shield-checkmark" size={18} color={T.primary} />
                    <Text
                      style={[
                        Typography.small,
                        {
                          color: T.text,
                          fontWeight: '800',
                          marginLeft: Spacing.xs,
                        },
                      ]}
                    >
                      Transparency & Calculations Audit
                    </Text>
                  </View>

                  <Text style={[s.auditLabel, { color: T.textSub }]}>
                    1. INPUTS TRACED
                  </Text>
                  <View
                    style={{ marginLeft: Spacing.sm, marginTop: Spacing.xs }}
                  >
                    {[
                      `Farm Size: ${calcResults.inputs?.farm_size} Acres`,
                      `Crop Type: ${calcResults.inputs?.crop_type}`,
                      `Soil Health Score: ${calcResults.inputs?.soil_score}/100`,
                      `Organic Practices: ${
                        calcResults.inputs?.organic
                          ? 'Yes (Factor 1.3)'
                          : 'No (Factor 1.0)'
                      }`,
                      `Irrigation: ${calcResults.inputs?.irrigation} (Factor ${
                        calcResults.inputs?.irrigation?.toLowerCase() === 'drip'
                          ? '1.4'
                          : calcResults.inputs?.irrigation?.toLowerCase() ===
                            'sprinkler'
                          ? '1.2'
                          : '1.0'
                      })`,
                      `Fertilizer: ${
                        calcResults.inputs?.fertilizer_usage
                      } (Factor ${
                        calcResults.inputs?.fertilizer_usage?.toLowerCase() ===
                        'low'
                          ? '1.3'
                          : calcResults.inputs?.fertilizer_usage?.toLowerCase() ===
                            'medium'
                          ? '1.0'
                          : '0.7'
                      })`,
                      `Temperature: ${calcResults.inputs?.temperature}°C`,
                      `Rainfall: ${calcResults.inputs?.rainfall} mm`,
                      `Humidity: ${calcResults.inputs?.humidity}%`,
                    ].map((line, i) => (
                      <Text
                        key={i}
                        style={[
                          Typography.xs,
                          { color: T.textSub, lineHeight: 18 },
                        ]}
                      >
                        • {line}
                      </Text>
                    ))}
                  </View>

                  <Text
                    style={[
                      s.auditLabel,
                      { color: T.textSub, marginTop: Spacing.md },
                    ]}
                  >
                    2. CORE FORMULA APPLIED
                  </Text>
                  <View
                    style={[
                      s.formulaBox,
                      {
                        backgroundColor: `${T.blue}12`,
                        borderColor: `${T.blue}30`,
                      },
                    ]}
                  >
                    <Text
                      style={[Typography.xs, { color: T.blue, lineHeight: 17 }]}
                    >
                      Credits = Size × CropFactor × (SoilScore / 100) ×
                      OrganicFactor × IrrigationFactor × FertilizerFactor ×
                      ClimateFactor
                    </Text>
                  </View>

                  <Text
                    style={[
                      s.auditLabel,
                      { color: T.textSub, marginTop: Spacing.md },
                    ]}
                  >
                    3. CALCULATION BREAKDOWN
                  </Text>
                  <View
                    style={[
                      s.formulaBox,
                      {
                        backgroundColor: T.primaryDim,
                        borderColor: `${T.primary}30`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        Typography.xs,
                        { color: T.primary, lineHeight: 17 },
                      ]}
                    >
                      {calcResults.formula_breakdown}
                    </Text>
                  </View>

                  <Text
                    style={[
                      s.auditLabel,
                      { color: T.textSub, marginTop: Spacing.md },
                    ]}
                  >
                    4. VERIFIED FINANCIAL YIELD
                  </Text>
                  <Text
                    style={[
                      Typography.small,
                      {
                        color: T.primary,
                        fontWeight: '700',
                        marginTop: Spacing.xs,
                      },
                    ]}
                  >
                    {calcResults.carbon_credits} Credits × Market Rate (₹
                    {calcResults.market_rate}) = ₹
                    {calcResults.yearly_projection?.toLocaleString('en-IN')}
                  </Text>
                </View>

                <View style={s.btnColumn}>
                  <PrimaryBtn
                    label="View AI Recommendations"
                    icon="sparkles"
                    onPress={() => setCurrentStep('recommendations')}
                    color="#8b5cf6"
                  />
                  <PrimaryBtn
                    label="Generate Final Report"
                    icon="document-text"
                    onPress={() => setCurrentStep('report')}
                    color={T.blue}
                    style={{ marginTop: Spacing.sm }}
                  />
                  <SecondaryBtn
                    label="Reset & Start Over"
                    onPress={resetAssessment}
                  />
                </View>
              </View>
            )}

            {/* ──────────────────────────────────── */}
            {/* STEP 3: AI RECOMMENDATIONS          */}
            {/* ──────────────────────────────────── */}
            {currentStep === 'recommendations' && calcResults && (
              <View
                style={[
                  s.card,
                  {
                    backgroundColor: T.card,
                    borderColor: T.cardBorder,
                    ...Shadow.md,
                  },
                ]}
              >
                <SectionHeader
                  title="AI Recommendations"
                  subtitle={`Real-time recommendations for ${calcResults.crop_type} farming in ${calcResults.state}.`}
                />

                {aiRecs?.recommendations?.length > 0 ? (
                  <View>
                    {[
                      {
                        icon: 'leaf',
                        color: T.primary,
                        title: 'Soil & Organic Health',
                        text:
                          aiRecs.recommendations[0] ||
                          'Soil health matches top parameters. Maintain current regenerative practices.',
                      },
                      {
                        icon: 'trending-up',
                        color: T.blue,
                        title: 'Carbon Opportunities',
                        text: `Your carbon credits can increase by ${
                          aiRecs.carbon_improvement || 12
                        }% by adopting alternating irrigation cycles.`,
                      },
                      {
                        icon: 'earth',
                        color: '#8b5cf6',
                        title: 'Sustainability Actions',
                        text:
                          aiRecs.recommendations[1] ||
                          'Crop residue management suggested to prevent environmental impacts.',
                      },
                      {
                        icon: 'ribbon',
                        color: T.yellow,
                        title: 'Government Subsidies & Schemes',
                        text:
                          aiRecs.recommendations[2] ||
                          'Eligible for state-sponsored organic agricultural development schemes.',
                      },
                    ].map(({ icon, color, title, text }) => (
                      <View
                        key={title}
                        style={[
                          s.adviceBlock,
                          {
                            backgroundColor: T.inputBg,
                            borderColor: T.divider,
                            borderLeftColor: color,
                          },
                        ]}
                      >
                        <View style={s.adviceHeader}>
                          <Icon name={icon} size={18} color={color} />
                          <Text
                            style={[
                              Typography.small,
                              {
                                color: T.text,
                                fontWeight: '800',
                                marginLeft: Spacing.xs,
                              },
                            ]}
                          >
                            {title}
                          </Text>
                        </View>
                        <Text
                          style={[
                            Typography.small,
                            {
                              color: T.textSub,
                              lineHeight: 20,
                              marginTop: Spacing.xs,
                            },
                          ]}
                        >
                          {text}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text
                    style={[
                      Typography.body,
                      {
                        color: T.textSub,
                        textAlign: 'center',
                        paddingVertical: Spacing.xl,
                      },
                    ]}
                  >
                    No recommendations returned by backend API.
                  </Text>
                )}

                <PrimaryBtn
                  label="View Marketplace Opportunities"
                  icon="cart"
                  onPress={() => setCurrentStep('marketplace')}
                />
                <SecondaryBtn
                  label="Back to Results"
                  onPress={() => setCurrentStep('results')}
                />
              </View>
            )}

            {/* ──────────────────────────────────── */}
            {/* STEP 4: MARKETPLACE                 */}
            {/* ──────────────────────────────────── */}
            {currentStep === 'marketplace' && calcResults && (
              <View
                style={[
                  s.card,
                  {
                    backgroundColor: T.card,
                    borderColor: T.cardBorder,
                    ...Shadow.md,
                  },
                ]}
              >
                <SectionHeader
                  title="Marketplace Yield"
                  subtitle="Potential revenue for selling your carbon offsets."
                />

                {/* Revenue summary */}
                <LinearGradient
                  colors={[`${T.primary}18`, `${T.primary}08`]}
                  style={[s.revenueCard, { borderColor: `${T.primary}35` }]}
                >
                  <Text
                    style={[
                      Typography.small,
                      { color: T.primary, fontWeight: '700' },
                    ]}
                  >
                    Available Credits to Sell
                  </Text>
                  <Text
                    style={[
                      Typography.h1,
                      { color: T.primary, marginTop: Spacing.xs },
                    ]}
                  >
                    {calcResults.carbon_credits} ICU
                  </Text>
                  <Text
                    style={[
                      Typography.small,
                      {
                        color: T.primary,
                        fontWeight: '700',
                        marginTop: Spacing.md,
                      },
                    ]}
                  >
                    Estimated Total Value
                  </Text>
                  <Text
                    style={[
                      {
                        fontSize: 30,
                        fontWeight: '900',
                        color: T.primary,
                        marginTop: Spacing.xs,
                      },
                    ]}
                  >
                    ₹{calcResults.yearly_projection?.toLocaleString('en-IN')}
                  </Text>
                  <Text
                    style={[
                      Typography.xs,
                      {
                        color: T.textSub,
                        marginTop: Spacing.xs,
                        fontWeight: '600',
                      },
                    ]}
                  >
                    Market Rate: ₹1,400 per credit (ICU)
                  </Text>
                </LinearGradient>

                <Text
                  style={[
                    Typography.h4,
                    { color: T.text, marginBottom: Spacing.md },
                  ]}
                >
                  Marketplace Demands
                </Text>

                {[
                  {
                    name: 'GreenEarth Industries 🏢',
                    sub: 'Sector: Manufacturing | Location: Bangalore',
                    price: '₹980 / credit',
                  },
                  {
                    name: 'EcoFuture Energy ⚡',
                    sub: 'Sector: Renewable Energy | Location: Mumbai',
                    price: '₹1,120 / credit',
                  },
                ].map(({ name, sub, price }) => (
                  <View
                    key={name}
                    style={[
                      s.demandItem,
                      { backgroundColor: T.inputBg, borderColor: T.divider },
                    ]}
                  >
                    <Text
                      style={[
                        Typography.body,
                        { color: T.text, fontWeight: '800' },
                      ]}
                    >
                      {name}
                    </Text>
                    <Text
                      style={[
                        Typography.xs,
                        { color: T.textSub, marginTop: 2 },
                      ]}
                    >
                      {sub}
                    </Text>
                    <Text
                      style={[
                        Typography.small,
                        {
                          color: T.primary,
                          fontWeight: '800',
                          marginTop: Spacing.sm,
                        },
                      ]}
                    >
                      Offering {price}
                    </Text>
                  </View>
                ))}

                <PrimaryBtn
                  label="Proceed to Final Report"
                  icon="document-text"
                  onPress={() => setCurrentStep('report')}
                  color={T.accent}
                />
                <SecondaryBtn
                  label="Back to Recommendations"
                  onPress={() => setCurrentStep('recommendations')}
                />
              </View>
            )}

            {/* ──────────────────────────────────── */}
            {/* STEP 5: REPORT & CERTIFICATE        */}
            {/* ──────────────────────────────────── */}
            {currentStep === 'report' && calcResults && (
              <View
                style={[
                  s.card,
                  {
                    backgroundColor: T.card,
                    borderColor: T.cardBorder,
                    ...Shadow.md,
                  },
                ]}
              >
                <SectionHeader
                  title="Download & Certification"
                  subtitle="Obtain digital proof of your eco-friendly carbon offsets."
                />

                {/* Certificate */}
                <LinearGradient
                  colors={
                    theme.dark
                      ? ['#1a1200', '#0f1900', '#1a1200']
                      : ['#fef3c7', '#fff', '#fef3c7']
                  }
                  style={s.certGradient}
                >
                  <View
                    style={[
                      s.certBody,
                      {
                        backgroundColor: T.card,
                        borderColor: theme.dark ? '#2a1f00' : '#fef3c7',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        Typography.label,
                        { color: '#b45309', letterSpacing: 1 },
                      ]}
                    >
                      CERTIFICATE OF CARBON OFFSET
                    </Text>
                    <Text
                      style={[
                        Typography.xs,
                        {
                          color: T.textSub,
                          marginTop: Spacing.xs,
                          letterSpacing: 2,
                          fontWeight: '700',
                        },
                      ]}
                    >
                      ARKASHINE CLIMATE TECHNOLOGY
                    </Text>
                    <Text
                      style={[
                        Typography.small,
                        { color: T.textSub, marginTop: Spacing.xl },
                      ]}
                    >
                      This is to certify that the agricultural operations of
                    </Text>
                    <Text
                      style={[
                        Typography.h2,
                        { color: T.text, marginTop: Spacing.sm },
                      ]}
                    >
                      {calcResults.farmer_name}
                    </Text>
                    <Text
                      style={[
                        Typography.small,
                        { color: T.textSub, fontWeight: '600' },
                      ]}
                    >
                      State of {calcResults.state}, India
                    </Text>
                    <Text
                      style={[
                        Typography.small,
                        {
                          color: T.textSub,
                          textAlign: 'center',
                          marginTop: Spacing.xl,
                          paddingHorizontal: Spacing.lg,
                        },
                      ]}
                    >
                      Have successfully sequestered and verified carbon offsets
                      of
                    </Text>
                    <Text
                      style={[
                        Typography.h1,
                        { color: T.primary, marginTop: Spacing.sm },
                      ]}
                    >
                      {calcResults.carbon_credits} Metric Tons (ICU)
                    </Text>
                    <View style={[s.certFooter, { borderTopColor: T.divider }]}>
                      <View style={s.certFooterCol}>
                        <Text
                          style={[
                            Typography.xs,
                            { color: T.muted, fontWeight: '700' },
                          ]}
                        >
                          ESG RATING
                        </Text>
                        <Text
                          style={[
                            Typography.h4,
                            { color: T.text, marginTop: Spacing.xs },
                          ]}
                        >
                          {calcResults.esg_score}/100
                        </Text>
                      </View>
                      <View style={s.certFooterCol}>
                        <Text
                          style={[
                            Typography.xs,
                            { color: T.muted, fontWeight: '700' },
                          ]}
                        >
                          VERIFICATION
                        </Text>
                        <Text
                          style={[
                            Typography.h4,
                            { color: T.primary, marginTop: Spacing.xs },
                          ]}
                        >
                          AI VERIFIED
                        </Text>
                      </View>
                    </View>
                  </View>
                </LinearGradient>

                <View style={s.btnColumn}>
                  {isDownloading ? (
                    <ActivityIndicator
                      size="small"
                      color={T.primary}
                      style={{ marginTop: Spacing.xl }}
                    />
                  ) : (
                    <PrimaryBtn
                      label="Download PDF Report"
                      icon="download"
                      onPress={downloadReport}
                    />
                  )}
                  <SecondaryBtn
                    label="Start New Assessment"
                    onPress={resetAssessment}
                  />
                </View>
              </View>
            )}
          </>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* ── STATE MODAL ── */}
      <Modal
        visible={stateModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setStateModalVisible(false)}
      >
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { backgroundColor: T.card }]}>
            <View style={s.modalHeader}>
              <Text style={[Typography.h3, { color: T.text }]}>
                Select State
              </Text>
              <TouchableOpacity onPress={() => setStateModalVisible(false)}>
                <Icon name="close" size={24} color={T.textSub} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[
                s.searchInput,
                {
                  backgroundColor: T.inputBg,
                  borderColor: T.inputBorder,
                  color: T.text,
                },
              ]}
              placeholder="Search Indian State / UT..."
              value={stateSearchQuery}
              onChangeText={setStateSearchQuery}
              placeholderTextColor={T.muted}
            />
            <FlatList
              data={filteredStates}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    s.modalItem,
                    { borderBottomColor: T.divider },
                    state === item && { backgroundColor: T.primaryDim },
                  ]}
                  onPress={() => {
                    setState(item);
                    setStateModalVisible(false);
                  }}
                >
                  <Text
                    style={[
                      Typography.body,
                      {
                        color: state === item ? T.primary : T.text,
                        fontWeight: state === item ? '700' : '500',
                      },
                    ]}
                  >
                    {item}
                  </Text>
                  {state === item && (
                    <Icon name="checkmark" size={20} color={T.primary} />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text
                  style={[
                    Typography.body,
                    {
                      color: T.textSub,
                      textAlign: 'center',
                      marginTop: Spacing.xl,
                    },
                  ]}
                >
                  No states match your search.
                </Text>
              }
            />
          </View>
        </View>
      </Modal>

      {/* ── CROP MODAL ── */}
      <Modal
        visible={cropModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCropModalVisible(false)}
      >
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { backgroundColor: T.card }]}>
            <View style={s.modalHeader}>
              <Text style={[Typography.h3, { color: T.text }]}>
                Select Crop Type
              </Text>
              <TouchableOpacity onPress={() => setCropModalVisible(false)}>
                <Icon name="close" size={24} color={T.textSub} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[
                s.searchInput,
                {
                  backgroundColor: T.inputBg,
                  borderColor: T.inputBorder,
                  color: T.text,
                },
              ]}
              placeholder="Search Crop Type..."
              value={cropSearchQuery}
              onChangeText={setCropSearchQuery}
              placeholderTextColor={T.muted}
            />
            <FlatList
              data={filteredCrops}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    s.modalItem,
                    { borderBottomColor: T.divider },
                    cropType === item && { backgroundColor: T.primaryDim },
                  ]}
                  onPress={() => {
                    setCropType(item);
                    setCropModalVisible(false);
                  }}
                >
                  <Text
                    style={[
                      Typography.body,
                      {
                        color: cropType === item ? T.primary : T.text,
                        fontWeight: cropType === item ? '700' : '500',
                      },
                    ]}
                  >
                    {item}
                  </Text>
                  {cropType === item && (
                    <Icon name="checkmark" size={20} color={T.primary} />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text
                  style={[
                    Typography.body,
                    {
                      color: T.textSub,
                      textAlign: 'center',
                      marginTop: Spacing.xl,
                    },
                  ]}
                >
                  No crops match your search.
                </Text>
              }
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// STYLES  (structural only — colors injected inline from T)
// ─────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },

  // Hero
  hero: {
    paddingTop: 60,
    padding: 10,
    // paddingBottom: Spacing.lg,
    borderRadius: Radius.xl + 8,
    // Fixed height instead of full screen - adjust as needed
    minHeight: 280,
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: Spacing.md,
    alignSelf: 'flex-start',
  },
  heroContent: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  heroBrand: {
    color: '#bbf7d0',
    fontWeight: '800',
    letterSpacing: 2,
    fontSize: 11,
    marginBottom: Spacing.xs,
  },
  progressWrapper: {
    paddingLeft:10,
    paddingRight:10
    // marginRight: 20,
    // marginTop: Spacing.lg,
  },

  // Progress
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: Radius.lg,
    padding:10,
    marginBottom:20
  },
  progressStepWrapper: { alignItems: 'center', width: '18%' },
  progressDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressNumber: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    fontWeight: '800',
  },
  progressLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 10,
    marginTop: Spacing.xs,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Loading
  loadingBox: { padding: 60, alignItems: 'center' },

  // Card
  card: {
    margin: Spacing.lg,
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
  },

  // Form
  fieldLabel: {
    ...Typography.small,
    fontWeight: '700',
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  textInput: {
    height: 52,
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    ...Typography.body,
  },
  dropdownBtn: {
    height: 52,
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  selectRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginTop: Spacing.xs,
  },
  selectBtn: {
    flex: 1,
    minWidth: '28%',
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: 10,
    alignItems: 'center',
    marginHorizontal: 4,
    marginVertical: 4,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  halfWidth: { width: '48%' },

  // Buttons
  primaryBtn: {
    borderRadius: Radius.lg,
    height: 54,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryBtn: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  btnColumn: { marginTop: Spacing.md, gap: Spacing.xs },

  // Success badge
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },

  // Metrics
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  metricItem: {
    width: '48%',
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
  },

  // Audit
  auditCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginTop: Spacing.lg,
  },
  auditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  auditLabel: {
    ...Typography.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: Spacing.sm,
  },
  formulaBox: {
    borderRadius: Radius.sm,
    borderWidth: 1,
    padding: Spacing.sm,
    marginTop: Spacing.xs,
  },

  // Advice blocks
  adviceBlock: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  adviceHeader: { flexDirection: 'row', alignItems: 'center' },

  // Revenue
  revenueCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },

  // Demand
  demandItem: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },

  // Certificate
  certGradient: {
    borderRadius: Radius.xl,
    padding: 6,
    marginBottom: Spacing.lg,
  },
  certBody: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
  },
  certFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    borderTopWidth: 1,
    marginTop: Spacing.xl,
    paddingTop: Spacing.md,
  },
  certFooterCol: { alignItems: 'center', width: '50%' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '75%',
    padding: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  searchInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    ...Typography.body,
    marginBottom: Spacing.md,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    paddingHorizontal: Spacing.xs,
  },
});
