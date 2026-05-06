// src/screens/phtest/PHECResultScreen.jsx

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { TopBar } from '../components/common';
import useTheme from '../hooks/useTheme';
import { Radius, Spacing, Shadow } from '../theme';

import {
  cmdGetFinalResult,
  cmdCheckMotorStatus,
} from '../redux/actions/bleActions';

// ✅ SAFE NUMBER (FIXED)
const toNumber = v => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// ───────── RECOMMENDATIONS ─────────
function getRecommendations(ph, tds) {
  const recs = [];

  if (ph != null) {
    if (ph < 5.5) recs.push('🔴 Strongly acidic → Apply agricultural lime');
    else if (ph < 6.5) recs.push('🟡 Slightly acidic → Add compost or lime');
    else if (ph <= 7.5) recs.push('🟢 pH optimal → Maintain current practices');
    else if (ph <= 8.5)
      recs.push('🔵 Alkaline → Add organic matter or sulphur');
    else recs.push('⛔ Highly alkaline → Immediate soil correction needed');
  }

  if (tds != null) {
    if (tds < 200) recs.push('⬇️ Very low nutrients → Apply NPK fertilizers');
    else if (tds < 800) recs.push('🟡 Low nutrients → Increase fertilization');
    else if (tds < 1600) recs.push('✅ Nutrient level optimal');
    else if (tds < 3200) recs.push('🟠 High salts → Reduce fertilizer usage');
    else recs.push('🚨 Very high salts → Flush soil immediately');
  }

  recs.push('🔬 For full analysis, test all 12 soil parameters');

  return recs;
}

export default function PHECResultScreen({ navigation }) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const T = theme.colors;

  const ble = useSelector(s => s.ble || {});
  const {
    sensorData,
    finalResult,
    motorStatus,
    testStarted,
    lastDeviceError,
    lastCmdError,
    connected,
  } = ble;

  const [fetching, setFetching] = useState(false);

  // ✅ SAFE SOURCE
  const data = finalResult ?? sensorData ?? {};

  // ✅ SUPPORT BOTH FORMATS (CRITICAL FIX)
  const ph = toNumber(data?.ph ?? data?.pH);
  const tds = toNumber(data?.ec ?? data?.TDS);
  const temp = toNumber(data?.temperature);

  const phVoltage = toNumber(data?.voltage ?? data?.pHVoltage);
  const ecVoltage = toNumber(data?.ecVoltage ?? data?.ECVoltage);

  const hasData = ph !== null || tds !== null;

  // if (__DEV__) {
  //   console.log('Result Screen: ble data', ble);
  // }

  const recs = getRecommendations(ph, tds);

  const handleRetry = () => {
    setFetching(true);
    dispatch(cmdGetFinalResult());
    setTimeout(() => setFetching(false), 1000);
  };

  const handleCheckMotor = () => {
    dispatch(cmdCheckMotorStatus());
  };

  // ───────── RUNNING ─────────

  // // ───────── NO DATA ─────────
  // if (!hasData) {
  //   return (
  //     <SafeAreaView style={[s.container, { backgroundColor: T.bg }]}>
  //       <StatusBar barStyle={T.statusBar} backgroundColor={T.bg} />
  //       <TopBar
  //         title="No Data"
  //         onBack={() => navigation.goBack()}
  //         theme={theme}
  //       />
  //     </SafeAreaView>
  //   );
  // }

  // ───────── MAIN UI ─────────
  return (
    <SafeAreaView style={[s.container, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.bg} />
      <TopBar
        title="Soil Test Result"
        onHome={() => navigation.navigate('ProductsListingScreen')}
        theme={theme}
      />

      <ScrollView contentContainerStyle={s.scroll}>
        {/* STATUS */}
        <View style={[s.statusStrip, { backgroundColor: T.card }]}>
          <Text style={{ color: connected ? T.primary : T.error }}>
            {connected ? 'Connected' : 'Disconnected'}
          </Text>
        </View>

        {/* DATA */}
        <Card title="pH" value={ph?.toFixed(2)} T={T} />
        <Card title="TDS (ppm)" value={tds?.toFixed(0)} T={T} />
        <Card
          title="Temperature"
          value={temp != null ? `${temp.toFixed(1)} °C` : '--'}
          T={T}
        />

        <Card
          title="pH Voltage"
          value={phVoltage != null ? `${phVoltage.toFixed(4)} V` : '--'}
          T={T}
          mono
        />

        <Card
          title="EC Voltage"
          value={ecVoltage != null ? `${ecVoltage.toFixed(4)} V` : '--'}
          T={T}
          mono
        />

        {/* RECOMMENDATIONS */}
        <View
          style={[
            s.card,
            { backgroundColor: T.card, borderColor: T.cardBorder },
          ]}
        >
          <Text style={[s.sectionTitle, { color: T.primary }]}>
            Recommendations
          </Text>
          {recs.map((r, i) => (
            <Text
              key={i}
              style={{ color: T.text, fontSize: 13, marginBottom: 6 }}
            >
              • {r}
            </Text>
          ))}
        </View>
        {!hasData && (
          <View style={s.center}>
            <Text style={[s.title, { color: T.textSub }]}>
              No Data Received From Device
            </Text>

            <TouchableOpacity
              style={[s.btn, { backgroundColor: T.primary }]}
              onPress={handleRetry}
            >
              <Text style={s.btnText}>
                {fetching ? 'Fetching...' : 'Fetch Result'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* CTA */}
        <TouchableOpacity
          style={[s.ctaBtn, { backgroundColor: T.primary }]}
          onPress={() => navigation.replace('SoilTestIntroScreen')}
        >
          <Icon name="flask-outline" size={20} color="#fff" />
          <Text style={s.ctaText}>Get Full 12 Parameter Soil Test →</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ───────── CARD ─────────
function Card({ title, value, T, mono }) {
  return (
    <View
      style={[s.card, { backgroundColor: T.card, borderColor: T.cardBorder }]}
    >
      <Text style={[s.label, { color: T.textSub }]}>{title}</Text>
      <Text
        style={[
          s.value,
          { color: T.text, fontFamily: mono ? 'Courier' : undefined },
        ]}
      >
        {value ?? '--'}
      </Text>
    </View>
  );
}

// ───────── STYLES ─────────
const s = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: Spacing.md },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  title: { fontSize: 18, fontWeight: 'bold' },

  card: {
    padding: 16,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: 10,
    ...Shadow.sm,
  },

  sectionTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 10 },

  label: { fontSize: 13 },
  value: { fontSize: 22, fontWeight: 'bold' },

  btn: {
    marginTop: 20,
    padding: 14,
    borderRadius: Radius.lg,
    alignItems: 'center',
  },

  btnText: { color: '#fff', fontWeight: 'bold' },

  statusStrip: {
    padding: 10,
    borderRadius: Radius.md,
    marginBottom: 10,
  },

  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 56,
    borderRadius: Radius.lg,
    marginTop: 10,
  },

  ctaText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
  },
});
