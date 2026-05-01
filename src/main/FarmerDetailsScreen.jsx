// src/main/FarmerDetailsScreen.jsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { saveFarmer, setLocation } from '../redux/actions';
import {
  LabeledInput,
  AppButton,
  Dropdown,
  TopBar,
} from '../components/common';
import { Spacing, Typography } from '../theme';
import useTheme, { CROPS } from '../hooks/useTheme';

export default function FarmerDetailsScreen({ navigation }) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const T = theme.colors;

  const farmer = useSelector(s => s.farmer);
  const location = useSelector(s => s.farmer.location);

  const [name, setName] = useState(farmer.name || '');
  const [phone, setPhone] = useState(farmer.phone || '');
  const [crop, setCrop] = useState(farmer.crop || '');
  const [loading, setLoading] = useState(false);
  const [locLoad, setLocLoad] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = 'Farmer name is required';
    if (!/^\d{10}$/.test(phone)) e.phone = 'Enter valid 10-digit phone';
    if (!crop) e.crop = 'Please select a crop';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleGetLocation = () => {
    setLocLoad(true);
    setTimeout(() => {
      dispatch(
        setLocation({
          lat: 12.9716,
          lng: 77.5946,
          address: 'Bangalore, Karnataka',
        }),
      );
      setLocLoad(false);
      Alert.alert('Location Set', 'Bangalore, Karnataka');
    }, 1500);
  };

  const handleSave = () => {
    if (!validate()) return;
    setLoading(true);
    dispatch(saveFarmer({ name, phone, crop }));
    setTimeout(() => {
      setLoading(false);
      navigation.navigate('ReportScreen');
    }, 600);
  };

  return (
    <SafeAreaView style={[s.bg, { backgroundColor: T.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <TopBar
        title="Farmer Details"
        onBack={() => navigation.goBack()}
        theme={theme}
      />

      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ───────────────────────────────────────────── */}
        <View
          style={[
            s.headerCard,
            {
              backgroundColor: T.primaryDim ?? T.primaryGlow,
              borderColor: T.primary,
            },
          ]}
        >
          <Text style={{ fontSize: 36 }}>👨‍🌾</Text>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={[Typography.h4, { color: T.primary }]}>
              Farmer Information
            </Text>
            <Text style={[s.headerSub, { color: T.textSub ?? T.muted }]}>
              Enter details to generate a personalised soil report
            </Text>
          </View>
        </View>

        {/* ── Inputs ───────────────────────────────────────────── */}
        <LabeledInput
          label="Farmer Name"
          value={name}
          onChangeText={setName}
          placeholder="Full name"
          icon="👤"
          theme={theme}
          error={errors.name}
        />
        <LabeledInput
          label="Phone Number"
          value={phone}
          onChangeText={setPhone}
          placeholder="10-digit mobile"
          icon="📱"
          theme={theme}
          error={errors.phone}
          keyboardType="phone-pad"
        />
        <Dropdown
          label="Select Crop"
          options={CROPS}
          value={crop}
          onSelect={setCrop}
          theme={theme}
        />
        {errors.crop ? <Text style={s.errorText}>{errors.crop}</Text> : null}

        {/* ── Location ─────────────────────────────────────────── */}
        <View
          style={[
            s.locationBox,
            { backgroundColor: T.card, borderColor: T.cardBorder },
          ]}
        >
          <Text style={[s.locationLabel, { color: T.text }]}>📍 Location</Text>
          <Text style={[s.locationVal, { color: T.muted }]}>
            {location?.address || 'Not set yet'}
          </Text>
          <AppButton
            label={locLoad ? 'Getting location…' : 'Get Location'}
            onPress={handleGetLocation}
            loading={locLoad}
            color="#3B82F6"
            textColor="#fff"
            size="sm"
            icon="📡"
            style={{ marginTop: 10 }}
          />
        </View>

        <AppButton
          label="Save & Continue"
          onPress={handleSave}
          loading={loading}
          color={T.primary}
          textColor="#fff"
          size="lg"
          icon="✅"
          style={{ marginTop: 8 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1 },
  scroll: { padding: Spacing.lg, paddingBottom: 40 },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: Spacing.lg,
  },
  headerSub: { fontSize: 13, marginTop: 2 },
  errorText: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: -10,
    marginBottom: 10,
  },
  locationBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
  },
  locationLabel: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  locationVal: { fontSize: 13 },
});
