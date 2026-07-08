import React, { useEffect, useRef } from 'react';
import {
  StatusBar,
  Animated,
  View,
  Text,
  StyleSheet,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch } from 'react-redux';
import { C } from '../utils/colors';
import { SafeAreaView } from 'react-native-safe-area-context';

export function SplashScreen({ navigation }) {
  const dispatch = useDispatch();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    startAnimation();
    checkLogin();
  }, []);

  const startAnimation = () => {
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
  };
  const checkLogin = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      const userData = await AsyncStorage.getItem('user');

      const parsedUser = userData ? JSON.parse(userData) : null;
      console.log(parsedUser.user, 'check parsedUser.userparsedUser.user');

      setTimeout(async () => {
        if (token) {
          await dispatch({
            type: 'RESTORE_LOGIN',
            payload: {
              token,
              refreshToken,
              user: parsedUser.user,
            },
          });
          if (parsedUser.user.user_type === 'soil_partner') {
            navigation.replace('SoilPartnerTabs');
          } else {
            navigation.replace('AppTabs');
          }
          
        } else {
          navigation.replace('LoginScreen');
        }
      }, 1500);
    } catch (e) {
      console.log(e);
      navigation.replace('LoginScreen');
    }
  };
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

  splashLogoText: {
    fontSize: 52,
    fontWeight: '900',
    color: C.accent,
  },

  splashTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: C.white,
    letterSpacing: 6,
  },

  splashSub: {
    fontSize: 14,
    color: C.muted,
    marginTop: 6,
    letterSpacing: 2,
  },

  splashDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.accent,
    marginTop: 30,
  },
});
