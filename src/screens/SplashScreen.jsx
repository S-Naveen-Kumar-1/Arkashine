import React, { useEffect, useRef } from 'react';
import {
  SafeAreaView,
  StatusBar,
  Animated,
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { C } from '../utils/colors';

export function SplashScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    const t = setTimeout(() => navigation.replace('LoginScreen'), 2200);
    return () => clearTimeout(t);
  }, []);

  return (
    <SafeAreaView style={styles.splash}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
          alignItems: 'center',
        }}
      >
        <View style={styles.splashLogo}>
          <Text style={styles.splashLogoText}>A</Text>
        </View>
        <Text style={styles.splashTitle}>ARKASHINE</Text>
        <Text style={styles.splashSub}>Soil Intelligence System</Text>
        <View style={styles.splashDot} />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogo: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: C.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: C.accent,
  },
  splashLogoText: { fontSize: 52, fontWeight: '900', color: C.accent },
  splashTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: C.white,
    letterSpacing: 6,
  },
  splashSub: { fontSize: 14, color: C.muted, marginTop: 6, letterSpacing: 2 },
  splashDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.accent,
    marginTop: 30,
  },
});
