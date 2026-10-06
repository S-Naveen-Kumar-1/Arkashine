// src/screens/test/PourScreen.js

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Animated,
  Easing,
  ScrollView,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { startMotorTimer } from '../redux/actions/soilsaathiActions';
import { AppButton, TopBar } from '../components/common';
import useTheme from '../hooks/useTheme';
import { Spacing, Radius, Shadow } from '../theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import ActiveFarmerBanner from '../components/ActiveFarmerBanner';
import ActiveDeviceBanner from '../components/ActiveDeviceBanner';

export default function PourScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const T = theme.colors;

  // ✅ FIX: persist animated values
  const dropAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 💧 Drop animation (smooth + realistic)
    Animated.loop(
      Animated.sequence([
        Animated.timing(dropAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(dropAnim, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // 🔵 Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.4,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const startCalibrate = async () => {
    navigation.replace('SoilCalibrationScreen', route?.params);
  };

  // Farmer + device are chosen here, right before the test starts.
  const deviceBannerRef = useRef(null);

  // Active version on the server (DeviceVersionScreen).
  const openVersion = () => {
    navigation.navigate('DeviceVersionScreen');
  };

  const startSoilTest = () => {
    // Several linked SoiLENZ devices → the user must pick which one gets
    // this reading first (opens the picker).
    if (deviceBannerRef.current && !deviceBannerRef.current.ensureSelected()) {
      return;
    }
    // The actual start sequence (TEST_RESET / stop / start sensor) now
    // happens after the filter-wait step, once the user has removed the
    // filter paper — see FilterWaitScreen.
    navigation.replace('FilterWaitScreen', route?.params);
  };

  const dropY = dropAnim.interpolate({
    inputRange: [0, 1],
    // Stays inside the device box (falls onto the dish) so it never runs
    // into the farmer/device rows above.
    outputRange: [0, 34],
  });

  return (
    <SafeAreaView style={[s.container, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.bg} />

      <TopBar
        title="Pour Sample"
        onBack={() => navigation.goBack()}
        theme={theme}
      />
      <ActiveFarmerBanner allowSelect />
      <ActiveDeviceBanner ref={deviceBannerRef} deviceType="soilsaathi" allowSelect />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.wrapper}
        showsVerticalScrollIndicator={false}
      >
        {/* 💧 DEVICE VISUAL */}
        <View
          style={[
            s.deviceBox,
            {
              backgroundColor: theme.dark ? T.surface : '#FFFFFF',
              borderColor: T.cardBorder,
            },
            Shadow.md,
          ]}
        >
          <Text style={s.deviceEmoji}>🧫</Text>

          <Animated.Text
            style={[s.dropEmoji, { transform: [{ translateY: dropY }] }]}
          >
            💧
          </Animated.Text>

          <Text style={[s.deviceLabel, { color: T.textSub }]}>
            SOILENZ Device
          </Text>
        </View>

        {/* 📋 INSTRUCTION */}
        <View
          style={[
            s.instructionCard,
            {
              backgroundColor: theme.dark ? 'rgba(34,197,94,0.12)' : '#DCFCE7',
              borderColor: T.primary,
            },
          ]}
        >
          <Text style={s.instrIcon}>⬇️</Text>

          <View style={s.instrBody}>
            <Text style={[s.instrTitle, { color: T.primary }]}>
              Pour the Solution
            </Text>
            <Text style={[s.instrText, { color: T.textSub }]}>
              Pour the prepared solution (5g soil + 40ml extractant) into the
              SOILENZ device opening
            </Text>
          </View>
        </View>

        {/* ⏳ WAITING STATE */}
        <View
          style={[
            s.waitCard,
            {
              backgroundColor: theme.dark ? T.surface : '#FFFFFF',
              borderColor: T.cardBorder,
            },
            Shadow.sm,
          ]}
        >
          <Animated.View
            style={[
              s.pulseDot,
              {
                backgroundColor: T.yellow,
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />
          <Text style={[s.waitTitle, { color: T.text }]}>
            Waiting for sample
          </Text>
          <Text style={[s.waitSub, { color: T.textSub }]}>
            Pour sample into device
          </Text>
        </View>
      </ScrollView>

      {/* 🧪 BUTTON ROW — pinned below the scroll so Start is always reachable */}
      <View style={s.footer}>
        <View style={s.buttonRow}>
          {[
            { label: 'Calibrate', onPress: startCalibrate },
            { label: 'Version', onPress: openVersion },
            { label: 'Start Test', onPress: startSoilTest },
          ].map(b => (
            <View key={b.label} style={s.buttonWrapper}>
              <AppButton
                label={b.label}
                onPress={b.onPress}
                size="sm"
                color={T.primary}
                textColor={T.primary}
                outlined
                style={[
                  s.flexButton,
                  {
                    backgroundColor: T.primaryDim,
                    borderColor: T.primary,
                    opacity: 0.9,
                  },
                ]}
              />
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

/* ================= STYLES ================= */

const s = StyleSheet.create({
  container: { flex: 1 },

  wrapper: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },

  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
  },

  deviceBox: {
    width: 160,
    height: 160,
    borderRadius: 30,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },

  deviceEmoji: {
    fontSize: 70,
  },

  dropEmoji: {
    position: 'absolute',
    top: 6,
    fontSize: 28,
  },

  deviceLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },

  instructionCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    width: '100%',
  },

  instrIcon: {
    fontSize: 26,
  },

  instrBody: { flex: 1 },

  instrTitle: {
    fontSize: 15,
    fontWeight: '800',
  },

  instrText: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 17,
  },

  waitCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },

  pulseDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  waitTitle: {
    fontSize: 14,
    fontWeight: '700',
  },

  waitSub: {
    fontSize: 12,
    marginTop: 2,
  },

  // ✅ NEW: Button row styles
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 8,
  },

  buttonWrapper: {
    flex: 1,
  },

  flexButton: {
    width: '100%',
    paddingHorizontal: 6,
  },
});
