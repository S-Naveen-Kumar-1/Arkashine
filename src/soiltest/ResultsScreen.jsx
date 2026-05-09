// src/screens/test/SoilResultsScreen.js

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';

import { TopBar, AppButton } from '../components/common';
import useTheme from '../hooks/useTheme';
import { Spacing, Typography } from '../theme';
import { nutrients } from '../utils/constants';
import { cmdGetSoilResult } from '../redux/actions/bleActions';

export function SoilResultsScreen({ navigation }) {
  const theme = useTheme();
  const T = theme.colors;

  const dispatch = useDispatch();

  const soilData = useSelector(s => s.soilsaathi?.bleResultData);

  // // ✅ Loading state UI
  // if (false) {
  //   return (
  //     <SafeAreaView style={[s.bg, { backgroundColor: T.bg }]}>
  //       <StatusBar barStyle="light-content" backgroundColor={T.bg} />

  //       <TopBar
  //         title="Soil Results"
  //         onBack={() => navigation.goBack()}
  //         theme={theme}
  //       />

  //       <View style={s.center}>
  //         <Text style={{ color: T.textSub, marginBottom: 10 }}>
  //           Waiting for results...
  //         </Text>

  //         <Text style={{ color: T.muted, fontSize: 12, marginBottom: 20 }}>
  //           Make sure device is connected
  //         </Text>

  //         <AppButton
  //           label="Fetch Results"
  //           onPress={() => dispatch(cmdGetSoilResult())}
  //           color={T.primary}
  //           textColor="#fff"
  //           style={{ width: '60%' }}
  //         />
  //       </View>
  //     </SafeAreaView>
  //   );
  // }

  // ✅ map values
  const mapped = nutrients.map(n => ({
    ...n,
    value: soilData?.[n.key] ?? null,
  }));

  // ✅ better status logic
  const getStatus = (key, value) => {
    if (value == null) return { label: 'N/A', color: T.muted };

    if (key === 'ph') {
      if (value < 6) return { label: 'Acidic', color: '#EF4444' };
      if (value <= 7.5) return { label: 'Optimal', color: '#22C55E' };
      return { label: 'Alkaline', color: '#F59E0B' };
    }

    if (key === 'ec') {
      if (value < 0.5) return { label: 'Low', color: '#EF4444' };
      if (value <= 1.5) return { label: 'Normal', color: '#22C55E' };
      return { label: 'High', color: '#F59E0B' };
    }

    if (value < 20) return { label: 'Low', color: '#EF4444' };
    if (value < 50) return { label: 'Normal', color: '#22C55E' };
    return { label: 'High', color: '#F59E0B' };
  };

  // ✅ format values
  const formatValue = val => {
    if (val == null) return '--';
    const num = Number(val);
    return Number.isInteger(num) ? num : num.toFixed(2);
  };

  return (
    <SafeAreaView style={[s.bg, { backgroundColor: T.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />

      <TopBar
        title="Soil Results"
        onBack={() => navigation.goBack()}
        theme={theme}
      />

      {!soilData || (Object.keys(soilData).length === 0 && <></>)}
      <ScrollView contentContainerStyle={s.container}>
        <Text style={[Typography.h3, { color: T.text }]}>Test Summary</Text>

        <Text style={[s.sub, { color: T.textSub }]}>
          Here are your soil nutrient levels
        </Text>

        <View style={s.grid}>
          {mapped.map(item => {
            const status = getStatus(item.key, item.value);

            return (
              <View
                key={item.key}
                style={[
                  s.card,
                  {
                    backgroundColor: T.card,
                    borderColor: status.color,
                  },
                ]}
              >
                <Text style={[s.label, { color: T.textSub }]}>
                  {item.label}
                </Text>

                <Text style={[s.value, { color: T.text }]}>
                  {formatValue(item.value)}
                </Text>

                {!!item.unit && (
                  <Text style={[s.unit, { color: T.muted }]}>{item.unit}</Text>
                )}

                <View
                  style={[
                    s.badge,
                    {
                      backgroundColor: status.color + '22',
                      borderColor: status.color,
                    },
                  ]}
                >
                  <Text style={[s.badgeText, { color: status.color }]}>
                    {status.label}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
        {(!soilData || Object.keys(soilData).length === 0) && (
          <View style={s.center}>
            <AppButton
              label="Fetch Results"
              onPress={() => dispatch(cmdGetSoilResult())}
              color={T.primary}
              textColor="#fff"
              style={{ width: '60%' }}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default SoilResultsScreen;

const s = StyleSheet.create({
  bg: { flex: 1 },

  container: {
    padding: Spacing.lg,
  },

  sub: {
    fontSize: 14,
    marginBottom: 20,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  card: {
    width: '30%',
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 4,
    marginBottom: 14,
    alignItems: 'center',
  },

  label: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'center',
  },

  value: {
    fontSize: 20,
    fontWeight: '900',
  },

  unit: {
    fontSize: 11,
    marginTop: 2,
  },

  badge: {
    marginTop: 8,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },

  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
