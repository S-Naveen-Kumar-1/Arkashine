import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StatusBar,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { C } from '../utils/colors';
import { useBLE } from '../contexts/BLEContext';

export function CalibrationScreen({ navigation, route }) {
  const { user } = route.params;
  const { sensorData, sendCommand, isConnected } = useBLE();
  const [tab, setTab] = useState('ph');

  const [phSteps, setPhSteps] = useState([
    {
      standard: 4,
      label: 'Solution 4',
      livePH: null,
      voltage: null,
      state: 'Ready',
    },
    {
      standard: 7,
      label: 'Solution 7',
      livePH: null,
      voltage: null,
      state: 'Waiting',
    },
    {
      standard: 9,
      label: 'Solution 9',
      livePH: null,
      voltage: null,
      state: 'Waiting',
    },
  ]);
  const [phActiveStep, setPhActiveStep] = useState(0);

  const [ecSteps, setEcSteps] = useState([
    {
      standard: 1.413,
      label: 'Solution 1.413',
      liveEC: null,
      voltage: null,
      state: 'Ready',
    },
    {
      standard: 12.88,
      label: 'Solution 12.88',
      liveEC: null,
      voltage: null,
      state: 'Waiting',
    },
  ]);
  const [ecActiveStep, setEcActiveStep] = useState(0);

  useEffect(() => {
    if (!sensorData) return;
    if (tab === 'ph' && sensorData.ph != null) {
      setPhSteps(prev =>
        prev.map((s, i) =>
          i === phActiveStep && s.state === 'Measuring'
            ? { ...s, livePH: sensorData.ph, voltage: sensorData.voltage }
            : s,
        ),
      );
    }
    if (tab === 'ec' && sensorData.ec != null) {
      setEcSteps(prev =>
        prev.map((s, i) =>
          i === ecActiveStep && s.state === 'Measuring'
            ? { ...s, liveEC: sensorData.ec, voltage: sensorData.voltage }
            : s,
        ),
      );
    }
  }, [sensorData, tab, phActiveStep, ecActiveStep]);

  const startCalibStep = async () => {
    if (tab === 'ph') {
      await sendCommand('START', `calib_ph_${phSteps[phActiveStep].standard}`);
      setPhSteps(prev =>
        prev.map((s, i) =>
          i === phActiveStep ? { ...s, state: 'Measuring' } : s,
        ),
      );
    } else {
      await sendCommand('START', `calib_ec_${ecSteps[ecActiveStep].standard}`);
      setEcSteps(prev =>
        prev.map((s, i) =>
          i === ecActiveStep ? { ...s, state: 'Measuring' } : s,
        ),
      );
    }
  };

  const freezeCalibStep = () => {
    if (tab === 'ph') {
      setPhSteps(prev =>
        prev.map((s, i) =>
          i === phActiveStep ? { ...s, state: 'Frozen' } : s,
        ),
      );
      if (phActiveStep < phSteps.length - 1) {
        setPhSteps(prev =>
          prev.map((s, i) =>
            i === phActiveStep + 1 ? { ...s, state: 'Ready' } : s,
          ),
        );
        setPhActiveStep(phActiveStep + 1);
      }
    } else {
      setEcSteps(prev =>
        prev.map((s, i) =>
          i === ecActiveStep ? { ...s, state: 'Frozen' } : s,
        ),
      );
      if (ecActiveStep < ecSteps.length - 1) {
        setEcSteps(prev =>
          prev.map((s, i) =>
            i === ecActiveStep + 1 ? { ...s, state: 'Ready' } : s,
          ),
        );
        setEcActiveStep(ecActiveStep + 1);
      }
    }
  };

  const stateColor = s =>
    s === 'Frozen'
      ? C.accent
      : s === 'Measuring'
      ? C.yellow
      : s === 'Ready'
      ? C.blue
      : C.muted;

  const steps = tab === 'ph' ? phSteps : ecSteps;
  const activeStep = tab === 'ph' ? phActiveStep : ecActiveStep;
  const allFrozen = steps.every(s => s.state === 'Frozen');

  return (
    <SafeAreaView style={styles.bg}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>100-Test Mandatory Recalibration</Text>
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, tab === 'ph' && styles.tabActive]}
            onPress={() => setTab('ph')}
          >
            <Text
              style={[styles.tabText, tab === 'ph' && styles.tabTextActive]}
            >
              pH Calibration
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'ec' && styles.tabActive]}
            onPress={() => setTab('ec')}
          >
            <Text
              style={[styles.tabText, tab === 'ec' && styles.tabTextActive]}
            >
              EC Calibration
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.instrText}>
          Please press START for each solution respectively to calibrate.
        </Text>

        {steps.map((step, i) => (
          <View
            key={i}
            style={[styles.stepCard, i === activeStep && styles.stepCardActive]}
          >
            <View style={styles.stepHeader}>
              <Text style={styles.stepLabel}>
                Probe in {step.label}
                {'\n'}
                <Text style={styles.stepStd}>
                  (Standard {tab === 'ph' ? 'pH' : 'EC'}: {step.standard})
                </Text>
              </Text>
              <View
                style={[
                  styles.stepState,
                  { borderColor: stateColor(step.state) },
                ]}
              >
                <Text
                  style={[
                    styles.stepStateText,
                    { color: stateColor(step.state) },
                  ]}
                >
                  {step.state}
                </Text>
              </View>
            </View>

            <View style={styles.stepValues}>
              <View style={styles.stepValueBox}>
                <Text style={styles.stepValueLabel}>
                  Live {tab === 'ph' ? 'pH' : 'EC'}
                </Text>
                <Text
                  style={[styles.stepValue, { color: stateColor(step.state) }]}
                >
                  {tab === 'ph'
                    ? step.livePH != null
                      ? step.livePH.toFixed(2)
                      : '0.00'
                    : step.liveEC != null
                    ? step.liveEC.toFixed(3)
                    : '0.000'}
                  {step.state === 'Measuring' && (
                    <Text style={styles.blinkCursor}> |</Text>
                  )}
                </Text>
              </View>

              <View style={styles.stepValueBox}>
                <Text style={styles.stepValueLabel}>Voltage</Text>
                <Text
                  style={[
                    styles.stepValue,
                    { color: step.voltage != null ? C.yellow : C.muted },
                  ]}
                >
                  {step.voltage != null
                    ? step.voltage.toFixed(5) + ' V'
                    : '0.00000 V'}
                </Text>
              </View>
            </View>
          </View>
        ))}

        {!allFrozen ? (
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.startBtn, !isConnected && styles.btnDisabled]}
              disabled={!isConnected}
              onPress={
                steps[activeStep]?.state === 'Measuring'
                  ? freezeCalibStep
                  : startCalibStep
              }
            >
              <Text style={styles.startBtnText}>
                {steps[activeStep]?.state === 'Measuring'
                  ? 'FREEZE / NEXT'
                  : 'START'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.doneBox}>
            <Text style={styles.doneText}>✓ Calibration complete!</Text>
            <TouchableOpacity
              style={styles.doneBtn}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.doneBtnText}>Back to Dashboard</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: C.bg },
  header: { padding: 20, paddingBottom: 8 },
  back: { color: C.accent, fontSize: 14, fontWeight: '700', marginBottom: 10 },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: C.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 4,
  },
  tab: { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center' },
  tabActive: { backgroundColor: C.accent },
  tabText: { color: C.muted, fontWeight: '700', fontSize: 14 },
  tabTextActive: { color: '#000' },
  instrText: {
    fontSize: 12,
    color: C.muted,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  stepCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  stepCardActive: { borderColor: C.accent, borderWidth: 1.5 },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stepLabel: { fontSize: 14, fontWeight: '700', color: C.white },
  stepStd: { fontSize: 12, color: C.muted, fontWeight: '400' },
  stepState: {
    borderRadius: 8,
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  stepStateText: { fontSize: 12, fontWeight: '700' },
  stepValues: { flexDirection: 'row', gap: 12 },
  stepValueBox: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  stepValueLabel: {
    fontSize: 11,
    color: C.muted,
    marginBottom: 4,
    fontWeight: '600',
  },
  stepValue: { fontSize: 22, fontWeight: '800' },
  blinkCursor: { color: C.accent },
  btnRow: { marginHorizontal: 16, marginTop: 8 },
  startBtn: {
    backgroundColor: C.accent,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  startBtnText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  btnDisabled: { opacity: 0.4 },
  doneBox: { alignItems: 'center', marginTop: 20, padding: 20 },
  doneText: {
    fontSize: 18,
    fontWeight: '800',
    color: C.accent,
    marginBottom: 16,
  },
  doneBtn: {
    backgroundColor: C.card,
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: C.accent,
  },
  doneBtnText: { color: C.accent, fontWeight: '700', fontSize: 15 },
});
