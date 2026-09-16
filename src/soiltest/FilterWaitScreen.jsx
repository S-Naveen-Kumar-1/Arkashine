// FilterWaitScreen.jsx
//
// Inserted between PourScreen and SensorScreen. Two phases, purely local
// timing (no BLE commands involved):
//   Phase A (0-5min): "Filtering in progress — please wait."
//   Phase B (after 5min): "Remove the filter paper with the soil and
//     discard it" + a 60s settle countdown, then a Continue button (disabled
//     until the settle countdown finishes or is skipped), which is what
//     actually fires the soil-test start sequence (moved here from
//     PourScreen).

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch } from 'react-redux';
import { Radius, Spacing } from '../theme';
import { AppButton, ProgressRing, TopBar } from '../components/common';
import useTheme from '../hooks/useTheme';
import {
  cmdStartSoilSensor,
  cmdStopSoilTest,
} from '../redux/actions/bleActions';

const FILTER_WAIT_SECONDS = 5 * 60;
const SETTLE_WAIT_SECONDS = 60;

export default function FilterWaitScreen({ navigation }) {
  const theme = useTheme();
  const T = theme.colors;
  const dispatch = useDispatch();

  const [secondsLeft, setSecondsLeft] = useState(FILTER_WAIT_SECONDS);
  const [ready, setReady] = useState(false);
  const timerRef = useRef(null);

  const [settleSecondsLeft, setSettleSecondsLeft] = useState(
    SETTLE_WAIT_SECONDS,
  );
  const [settleReady, setSettleReady] = useState(false);
  const settleTimerRef = useRef(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          setReady(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Settle countdown starts once phase B (remove filter paper) begins.
  useEffect(() => {
    if (!ready) return;

    settleTimerRef.current = setInterval(() => {
      setSettleSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(settleTimerRef.current);
          settleTimerRef.current = null;
          setSettleReady(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (settleTimerRef.current) {
        clearInterval(settleTimerRef.current);
        settleTimerRef.current = null;
      }
    };
  }, [ready]);

  const handleContinue = async () => {
    if (starting) return;
    setStarting(true);
    try {
      await dispatch({ type: 'TEST_RESET' });
      await dispatch(cmdStopSoilTest());
      await dispatch(cmdStartSoilSensor());
      navigation.replace('SensorScreen');
    } catch (e) {
      setStarting(false);
    }
  };

  const handleSkipWait = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setSecondsLeft(0);
    setReady(true);
  };

  const handleSkipSettle = () => {
    if (settleTimerRef.current) {
      clearInterval(settleTimerRef.current);
      settleTimerRef.current = null;
    }
    setSettleSecondsLeft(0);
    setSettleReady(true);
  };

  const progress = FILTER_WAIT_SECONDS - secondsLeft;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  const settleMinutes = Math.floor(settleSecondsLeft / 60);
  const settleSeconds = settleSecondsLeft % 60;

  return (
    <SafeAreaView style={[s.container, { backgroundColor: T.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />

      <TopBar
        title="Filtering"
        onBack={() => navigation.goBack()}
        theme={theme}
      />

      <View style={s.body}>
        {!ready ? (
          <>
            <View style={s.ringWrap}>
              <ProgressRing
                size={160}
                progress={progress}
                total={FILTER_WAIT_SECONDS}
                color={T.primary}
                bg={T.border}
                strokeWidth={10}
              >
                <View style={{ alignItems: 'center' }}>
                  <Text style={[s.timerNum, { color: T.primary }]}>
                    {String(minutes).padStart(2, '0')}:
                    {String(seconds).padStart(2, '0')}
                  </Text>
                </View>
              </ProgressRing>
            </View>

            <Icon
              name="filter-outline"
              size={40}
              color={T.primary}
              style={{ marginTop: Spacing.lg }}
            />
            <Text style={[s.title, { color: T.text }]}>
              Filtering in progress
            </Text>
            <Text style={[s.subtitle, { color: T.textSub }]}>
              Please wait while the solution filters through. This takes
              about 5 minutes.
            </Text>

            <TouchableOpacity onPress={handleSkipWait} style={s.skipWrap}>
              <Text style={[s.skipText, { color: T.muted }]}>
                Skip wait & continue
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View
              style={[
                s.instrCard,
                { backgroundColor: T.card, borderColor: T.border },
              ]}
            >
              <Icon
                name="delete-alert-outline"
                size={40}
                color={T.orange}
                style={{ marginBottom: Spacing.sm }}
              />
              <Text style={[s.title, { color: T.text }]}>
                Remove the filter paper
              </Text>
              <Text style={[s.subtitle, { color: T.textSub }]}>
                Remove the filter paper with the soil from the device and
                discard it, then continue to the soil test.
              </Text>

              {!settleReady ? (
                <>
                  <Text style={[s.subtitle, s.settleNote, { color: T.text }]}>
                    Wait for the liquid to settle before continuing.
                  </Text>
                  <Text style={[s.settleTimerNum, { color: T.orange }]}>
                    {String(settleMinutes).padStart(2, '0')}:
                    {String(settleSeconds).padStart(2, '0')}
                  </Text>
                  <TouchableOpacity
                    onPress={handleSkipSettle}
                    style={s.skipWrap}
                  >
                    <Text style={[s.skipText, { color: T.muted }]}>
                      Skip wait & continue
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={[s.subtitle, s.settleNote, { color: '#10B981' }]}>
                  Liquid settled ✅ — ready to continue.
                </Text>
              )}
            </View>

            <AppButton
              label="Continue to Soil Test"
              onPress={handleContinue}
              color={T.primary}
              textColor="#fff"
              disabled={!settleReady || starting}
              loading={starting}
              style={{ marginTop: Spacing.lg, width: '100%' }}
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  ringWrap: { marginBottom: Spacing.md },
  timerNum: { fontSize: 32, fontWeight: '900', fontFamily: 'Courier' },
  title: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: Spacing.xs,
    lineHeight: 20,
    paddingHorizontal: Spacing.md,
  },
  instrCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    width: '100%',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  settleNote: { fontWeight: '800', marginTop: Spacing.sm },
  settleTimerNum: {
    fontSize: 28,
    fontWeight: '900',
    fontFamily: 'Courier',
    marginTop: Spacing.xs,
  },
  skipWrap: { marginTop: Spacing.lg, padding: Spacing.sm },
  skipText: { fontSize: 13, textDecorationLine: 'underline' },
});
