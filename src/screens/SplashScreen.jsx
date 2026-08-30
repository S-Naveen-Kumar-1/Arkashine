import React, { useEffect, useRef, useCallback } from 'react';
import {
  StatusBar,
  Animated,
  View,
  Text,
  Image,
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

  const startAnimation = useCallback(() => {
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
  }, [fadeAnim, scaleAnim]);

  const checkLogin = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      const userData = await AsyncStorage.getItem('user');

      const parsedUser = userData ? JSON.parse(userData) : null;

      setTimeout(async () => {
        if (token) {
          await dispatch({
            type: 'RESTORE_LOGIN',
            payload: {
              token,
              refreshToken,
              user: parsedUser?.user,
            },
          });
          if (parsedUser?.user?.user_type === 'soil_partner') {
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
  }, [dispatch, navigation]);

  useEffect(() => {
    startAnimation();
    checkLogin();
  }, [startAnimation, checkLogin]);
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
        <Image
          source={require('../assets/images/app_logo.png')}
          style={styles.splashLogoImg}
          resizeMode="contain"
        />

        <View style={styles.splashDot} />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  splashLogoImg: {
    width: 220,
    height: 220,
    marginBottom: 10,
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
