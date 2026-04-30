// src/screens/phtest/PHECResultScreen.jsx
// Reads pH & EC from hardware device and displays results with BLE integration

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Modal,
  Animated,
  Easing,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Radius, Spacing } from '../theme';
import { TopBar } from '../components/common';
import useTheme from '../hooks/useTheme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useBLE, CMD } from '../contexts/BLEContext';

// Interpretation helpers
function getPHStatus(ph, T) {
  if (ph === null || ph === undefined) return null;
  if (ph < 5.5)
    return {
      label: 'Strongly Acidic',
      emoji: '🔴',
      color: '#EF4444',
      desc: 'Soil is too acidic. Lime application recommended.',
      level: 'low',
    };
  if (ph < 6.0)
    return {
      label: 'Acidic',
      emoji: '🟠',
      color: '#F97316',
      desc: 'Slightly acidic. Suitable for acid-loving crops.',
      level: 'low',
    };
  if (ph < 6.5)
    return {
      label: 'Slightly Acidic',
      emoji: '🟡',
      color: '#F59E0B',
      desc: 'Suitable for most crops. Monitor regularly.',
      level: 'medium',
    };
  if (ph <= 7.0)
    return {
      label: 'Neutral',
      emoji: '🟢',
      color: T.primary,
      desc: 'Optimal range. Most nutrients are available.',
      level: 'high',
    };
  if (ph <= 7.5)
    return {
      label: 'Slightly Alkaline',
      emoji: '🔵',
      color: '#3B82F6',
      desc: 'Slightly alkaline. Some micronutrients may be less available.',
      level: 'medium',
    };
  if (ph <= 8.0)
    return {
      label: 'Alkaline',
      emoji: '🟣',
      color: '#8B5CF6',
      desc: 'Alkaline soil. Sulphur application may be needed.',
      level: 'low',
    };
  return {
    label: 'Strongly Alkaline',
    emoji: '⛔',
    color: '#EF4444',
    desc: 'Very alkaline. Significant intervention required.',
    level: 'low',
  };
}

function getECStatus(ec, T) {
  if (ec === null || ec === undefined) return null;
  if (ec < 0.1)
    return {
      label: 'Very Low',
      emoji: '⬇️',
      color: T.muted,
      desc: 'Insufficient mineral salts. Fertilisation needed.',
      alert: false,
    };
  if (ec < 0.8)
    return {
      label: 'Low',
      emoji: '🟡',
      color: '#F59E0B',
      desc: 'Low salt content. Suitable for salt-sensitive crops.',
      alert: false,
    };
  if (ec < 1.6)
    return {
      label: 'Optimal',
      emoji: '✅',
      color: T.primary,
      desc: 'Ideal conductivity for most field crops.',
      alert: false,
    };
  if (ec < 3.2)
    return {
      label: 'High',
      emoji: '🟠',
      color: '#F97316',
      desc: 'Elevated salt levels. Monitor crop stress.',
      alert: true,
    };
  return {
    label: 'Very High — Salt Alert',
    emoji: '🔴',
    color: '#EF4444',
    desc: 'Excessive salts detected. Leaching/drainage required.',
    alert: true,
  };
}

export default function PHECResultScreen({ navigation }) {
  const theme = useTheme();
  const T = theme.colors;
  const { sendCommand, sensorData, isConnected, log } = useBLE();

  const [reading, setReading] = useState({
    ph: null,
    ec: null,
    loading: true,
    error: null,
  });
  const [alertVisible, setAlertVisible] = useState(false);
  const [hasShownAlert, setHasShownAlert] = useState(false);

  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const acquireReadings = async () => {
      if (!isConnected) {
        setReading(prev => ({
          ...prev,
          loading: false,
          error: 'Device not connected',
        }));
        return;
      }

      try {
        log('RESULT', 'Requesting final pH & EC readings...');

        // Send READ_VOLTAGE command to trigger a single comprehensive reading
        await sendCommand(CMD.READ_VOLTAGE, '', true, 8000);
        log('RESULT', 'Read command sent, waiting for data...', 'success');

        // Wait a bit for the sensor data to be populated via notifications
        await new Promise(resolve => setTimeout(resolve, 1500));

        const { ph, ec, voltage } = sensorData;

        if (ph === null && ec === null) {
          log('RESULT', 'No sensor data received', 'warn');
          setReading(prev => ({
            ...prev,
            loading: false,
            error: 'Could not acquire sensor readings. Try again.',
          }));
        } else {
          setReading({
            ph,
            ec,
            loading: false,
            error: null,
          });
          log('RESULT', `pH: ${ph}, EC: ${ec}`, 'success');
        }
      } catch (e) {
        log('RESULT', `Reading error: ${e.message}`, 'error');
        setReading(prev => ({
          ...prev,
          loading: false,
          error: `Failed to read from device: ${e.message}`,
        }));
      }
    };

    acquireReadings();
  }, [isConnected, sensorData, sendCommand, log]);

  useEffect(() => {
    if (reading.loading) {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ).start();
    }
  }, [reading.loading]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const phStatus = getPHStatus(reading.ph, T);
  const ecStatus = getECStatus(reading.ec, T);

  useEffect(() => {
    if (
      !reading.loading &&
      ecStatus?.alert &&
      !hasShownAlert &&
      !reading.error
    ) {
      const t = setTimeout(() => {
        setAlertVisible(true);
        setHasShownAlert(true);
      }, 600);
      return () => clearTimeout(t);
    }
  }, [reading.loading, ecStatus?.alert, hasShownAlert, reading.error]);

  if (reading.loading) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: T.bg }]}>
        <StatusBar barStyle="light-content" backgroundColor={T.bg} />
        <TopBar
          title="Reading Results"
          onBack={() => navigation.goBack()}
          theme={theme}
        />
        <View style={s.loadingBody}>
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Icon name="loading" size={56} color={T.primary} />
          </Animated.View>
          <Text style={[s.loadingText, { color: T.primary }]}>
            Reading from device…
          </Text>
          <Text style={[s.loadingSub, { color: T.muted }]}>
            Acquiring pH and EC values via probe
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (reading.error) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: T.bg }]}>
        <StatusBar barStyle="light-content" backgroundColor={T.bg} />
        <TopBar
          title="Reading Error"
          onBack={() => navigation.goBack()}
          theme={theme}
        />
        <View style={s.loadingBody}>
          <Icon name="alert-circle" size={56} color="#EF4444" />
          <Text style={[s.loadingText, { color: '#EF4444' }]}>
            {reading.error}
          </Text>
          <TouchableOpacity
            style={[s.retryBtn, { backgroundColor: T.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={s.retryBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: T.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />

      <TopBar
        title="pH & EC Results"
        onBack={() => navigation.goBack()}
        theme={theme}
      />

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Big readings row */}
        <View style={s.bigRow}>
          {/* pH Big Card */}
          <View
            style={[
              s.bigCard,
              { backgroundColor: T.card, borderColor: phStatus?.color + '66' },
            ]}
          >
            <View
              style={[
                s.bigCardBadge,
                { backgroundColor: phStatus?.color + '22' },
              ]}
            >
              <Text style={[s.bigCardBadgeText, { color: phStatus?.color }]}>
                pH
              </Text>
            </View>
            <Text style={[s.bigValue, { color: phStatus?.color ?? T.white }]}>
              {reading.ph?.toFixed(2)}
            </Text>
            <Text style={[s.bigStatus, { color: phStatus?.color }]}>
              {phStatus?.emoji} {phStatus?.label}
            </Text>
          </View>

          {/* EC Big Card */}
          <View
            style={[
              s.bigCard,
              { backgroundColor: T.card, borderColor: ecStatus?.color + '66' },
            ]}
          >
            <View
              style={[
                s.bigCardBadge,
                { backgroundColor: ecStatus?.color + '22' },
              ]}
            >
              <Text style={[s.bigCardBadgeText, { color: ecStatus?.color }]}>
                EC
              </Text>
            </View>
            <Text style={[s.bigValue, { color: ecStatus?.color ?? T.white }]}>
              {reading.ec?.toFixed(3)}
            </Text>
            <Text style={[s.bigUnit, { color: T.muted }]}>dS/m</Text>
            <Text style={[s.bigStatus, { color: ecStatus?.color }]}>
              {ecStatus?.emoji} {ecStatus?.label}
            </Text>
          </View>
        </View>

        {/* pH Detail */}
        <DetailCard
          icon="ph"
          title="pH Analysis"
          color={phStatus?.color}
          T={T}
          rows={[
            {
              label: 'Measured Value',
              value: `${reading.ph?.toFixed(2)}`,
              highlight: true,
            },
            { label: 'Optimal Range', value: '6.0 – 7.0' },
            { label: 'Soil Reaction', value: phStatus?.label },
            { label: 'Interpretation', value: phStatus?.desc, long: true },
          ]}
        />

        {/* EC Detail */}
        <DetailCard
          icon="lightning-bolt"
          title="EC Analysis"
          color={ecStatus?.color}
          T={T}
          rows={[
            {
              label: 'Measured Value',
              value: `${reading.ec?.toFixed(3)} dS/m`,
              highlight: true,
            },
            { label: 'Optimal Range', value: '0.8 – 1.6 dS/m' },
            { label: 'Salt Level', value: ecStatus?.label },
            { label: 'Interpretation', value: ecStatus?.desc, long: true },
          ]}
        />

        {/* pH scale visual */}
        <PHScale value={reading.ph} T={T} />

        {/* Actions */}
        <TouchableOpacity
          style={[s.ctaBtn, { backgroundColor: T.primary }]}
          onPress={() => navigation.navigate('RecommendationsScreen')}
          activeOpacity={0.85}
        >
          <Icon name="clipboard-list-outline" size={20} color="#fff" />
          <Text style={s.ctaBtnText}>View Recommendations</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.secondBtn, { borderColor: T.border }]}
          onPress={() => navigation.navigate('CalibrationGateScreen')}
          activeOpacity={0.8}
        >
          <Text style={[s.secondBtnText, { color: T.muted }]}>
            Run Another Test
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* EC Alert Modal */}
      <Modal visible={alertVisible} transparent animationType="fade">
        <View style={m.overlay}>
          <View
            style={[
              m.sheet,
              { backgroundColor: T.card, borderColor: T.offline },
            ]}
          >
            <View style={[m.iconRing, { backgroundColor: T.offline + '22' }]}>
              <Icon name="alert-circle" size={40} color={T.offline} />
            </View>
            <Text style={[m.title, { color: T.white }]}>
              ⚠️ High Salt Alert
            </Text>
            <Text style={[m.body, { color: T.text }]}>
              EC value of{' '}
              <Text style={{ color: T.offline, fontWeight: '900' }}>
                {reading.ec?.toFixed(3)} dS/m
              </Text>{' '}
              indicates excessive mineral salts in the soil.
            </Text>
            <Text style={[m.sub, { color: T.muted }]}>
              Consider leaching with irrigation or improving drainage to reduce
              salinity. Avoid high-salt fertilisers.
            </Text>
            <TouchableOpacity
              style={[m.btn, { backgroundColor: T.offline }]}
              onPress={() => setAlertVisible(false)}
            >
              <Text style={m.btnText}>Understood</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Sub-components
function DetailCard({ icon, title, color, T, rows }) {
  return (
    <View
      style={[
        dc.card,
        {
          backgroundColor: T.card,
          borderColor: color + '44',
          borderLeftColor: color,
          borderLeftWidth: 4,
        },
      ]}
    >
      <View style={dc.header}>
        <Icon name={icon} size={18} color={color} />
        <Text style={[dc.title, { color: T.white }]}>{title}</Text>
      </View>
      {rows.map((r, i) => (
        <View
          key={i}
          style={[
            dc.row,
            i > 0 && { borderTopWidth: 1, borderTopColor: T.border },
          ]}
        >
          <Text style={[dc.label, { color: T.muted }]}>{r.label}</Text>
          <Text
            style={[
              dc.val,
              {
                color: r.highlight ? color ?? T.white : T.text,
                flex: r.long ? 1 : undefined,
              },
            ]}
          >
            {r.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

function PHScale({ value, T }) {
  const pct = value != null ? ((value - 0) / 14) * 100 : null;
  const SEGMENTS = [
    { label: '0–4', color: '#EF4444' },
    { label: '4–6', color: '#F97316' },
    { label: '6–7', color: T.primary },
    { label: '7–8', color: '#3B82F6' },
    { label: '8–14', color: '#8B5CF6' },
  ];
  return (
    <View style={[ph.card, { backgroundColor: T.card, borderColor: T.border }]}>
      <Text style={[ph.title, { color: T.white }]}>pH Scale</Text>
      <View style={ph.barRow}>
        {SEGMENTS.map(seg => (
          <View
            key={seg.label}
            style={[ph.seg, { backgroundColor: seg.color }]}
          />
        ))}
        {pct !== null && (
          <View style={[ph.needle, { left: `${pct}%` }]}>
            <View style={[ph.needleLine, { backgroundColor: T.white }]} />
            <Text style={ph.needleVal}>{value?.toFixed(1)}</Text>
          </View>
        )}
      </View>
      <View style={ph.labels}>
        {['0', '2', '4', '6', '8', '10', '12', '14'].map(v => (
          <Text key={v} style={[ph.scaleLabel, { color: T.muted }]}>
            {v}
          </Text>
        ))}
      </View>
      <View style={ph.legend}>
        <Text style={[ph.legendText, { color: '#EF4444' }]}>Acidic</Text>
        <Text style={[ph.legendText, { color: T.primary }]}>Neutral</Text>
        <Text style={[ph.legendText, { color: '#8B5CF6' }]}>Alkaline</Text>
      </View>
    </View>
  );
}

// Styles
const s = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: Spacing.md, paddingBottom: Spacing.xl },
  loadingBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: { fontSize: 18, fontWeight: '800' },
  loadingSub: { fontSize: 13 },
  retryBtn: {
    height: 52,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  retryBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  bigRow: { flexDirection: 'row', gap: 12, marginBottom: Spacing.md },
  bigCard: {
    flex: 1,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    padding: Spacing.md,
    alignItems: 'center',
  },
  bigCardBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 8,
  },
  bigCardBadgeText: { fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  bigValue: {
    fontSize: 40,
    fontWeight: '900',
    fontFamily: 'Courier',
    letterSpacing: -1,
  },
  bigUnit: { fontSize: 12, marginTop: 2, marginBottom: 4 },
  bigStatus: { fontSize: 12, fontWeight: '800', textAlign: 'center' },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 56,
    borderRadius: Radius.lg,
    marginBottom: Spacing.sm,
  },
  ctaBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  secondBtn: {
    height: 48,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondBtnText: { fontSize: 14, fontWeight: '600' },
});

const dc = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  title: { fontSize: 15, fontWeight: '800' },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 8,
    gap: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    flex: 1,
  },
  val: { fontSize: 14, fontWeight: '700', textAlign: 'right', maxWidth: '60%' },
});

const ph = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  title: { fontSize: 14, fontWeight: '800', marginBottom: Spacing.sm },
  barRow: {
    height: 20,
    flexDirection: 'row',
    borderRadius: 10,
    overflow: 'visible',
    marginBottom: 4,
    position: 'relative',
  },
  seg: { flex: 1 },
  needle: {
    position: 'absolute',
    top: -4,
    alignItems: 'center',
    transform: [{ translateX: -1 }],
  },
  needleLine: { width: 2, height: 28 },
  needleVal: { fontSize: 10, fontWeight: '800', marginTop: 2 },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  scaleLabel: { fontSize: 10 },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  legendText: { fontSize: 11, fontWeight: '700' },
});

const m = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  sheet: {
    borderRadius: Radius.xl,
    borderWidth: 2,
    padding: Spacing.lg,
    width: '100%',
    alignItems: 'center',
  },
  iconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  sub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  btn: {
    width: '100%',
    height: 52,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
