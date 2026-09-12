import React, { useEffect, useRef, useCallback } from 'react';
import {
  StatusBar,
  Animated,
  View,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch } from 'react-redux';
import LinearGradient from 'react-native-linear-gradient';
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
    <LinearGradient
      colors={[C.bg, C.surface]}
      style={styles.splash}
    >
      <SafeAreaView style={styles.splash}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />

        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
            alignItems: 'center',
          }}
        >
          <View style={styles.logoCard}>
            <Image
              source={require('../assets/images/app_logo.png')}
              style={styles.splashLogoImg}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.splashTitle}>SOIL LENZ</Text>
          <Text style={styles.splashSub}>SMART SOIL DIAGNOSTICS</Text>

          <ActivityIndicator
            color={C.accent}
            style={styles.loader}
          />
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoCard: {
    width: 180,
    height: 180,
    borderRadius: 40,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },

  splashLogoImg: {
    width: 130,
    height: 130,
  },

  splashTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: C.white,
    letterSpacing: 5,
  },

  splashSub: {
    fontSize: 12,
    color: C.muted,
    marginTop: 6,
    letterSpacing: 2,
  },

  loader: {
    marginTop: 36,
  },
});
