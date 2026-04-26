// src/screens/main/RecommendationsScreen.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  SectionList,
} from 'react-native';
import { useSelector } from 'react-redux';
import { DayCard, TopBar, AppButton } from '../components/common';
import { Spacing, Typography, Radius } from '../theme';
import useTheme, { getRecommendations,getNutrientStatus } from '../hooks/useTheme';

export function RecommendationsScreen({ navigation }) {
  const theme = useTheme();
  const T = theme.colors;
  const results = useSelector(s => s.test.results);
  const farmer = useSelector(s => s.farmer);
  const recs = getRecommendations(results, farmer.crop);

  const typeGroups = recs.reduce((acc, r) => {
    const key = r.type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  const sections = Object.entries(typeGroups).map(([type, data]) => ({
    title: type.charAt(0).toUpperCase() + type.slice(1),
    data,
  }));

  const typeColor = {
    fertilizer: T.primary,
    water: T.blue,
    check: T.yellow,
    spray: '#A78BFA',
    amendment: T.orange,
  };

  return (
    <SafeAreaView style={[s.bg, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.bg} />
      <TopBar
        title="Recommendations"
        onBack={() => navigation.goBack()}
        rightIcon="🖨️"
        onRight={() => navigation.navigate('Report')}
        theme={theme}
      />

      {/* Summary row */}
      <View
        style={[
          s.summaryRow,
          { backgroundColor: T.card, borderBottomColor: T.divider },
        ]}
      >
        {results &&
          [
            { label: 'pH', val: results.ph?.toFixed(1), key: 'ph' },
            { label: 'N', val: results.N, key: 'N' },
            { label: 'P', val: results.P, key: 'P' },
            { label: 'K', val: results.K, key: 'K' },
          ].map(item => {
            const st = getNutrientStatus(item.key, item.val);
            return (
              <View key={item.key} style={s.summaryItem}>
                <Text style={[s.summaryLabel, { color: T.muted }]}>
                  {item.label}
                </Text>
                <Text style={[s.summaryVal, { color: st.color }]}>
                  {item.val ?? '--'}
                </Text>
                <Text style={[s.summaryStatus, { color: st.color }]}>
                  {st.label}
                </Text>
              </View>
            );
          })}
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item, i) => `${item.day}-${i}`}
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 40 }}
        renderSectionHeader={({ section }) => (
          <View
            style={[
              s.sectionHead,
              {
                backgroundColor: typeColor[section.title.toLowerCase()] + '18',
              },
            ]}
          >
            <Text
              style={[
                s.sectionHeadText,
                { color: typeColor[section.title.toLowerCase()] || T.primary },
              ]}
            >
              {section.title} Schedule
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <DayCard key={item.day} {...item} theme={theme} />
        )}
        ListHeaderComponent={
          <View
            style={[
              s.cropBanner,
              { backgroundColor: T.primaryDim, borderColor: T.primary },
            ]}
          >
            <Text style={s.cropIcon}>🌾</Text>
            <View>
              <Text style={[s.cropLabel, { color: T.primary }]}>
                Crop: {farmer.crop || 'Not specified'}
              </Text>
              <Text style={[s.cropSub, { color: T.textSub }]}>
                Season-wise fertilizer & irrigation schedule
              </Text>
            </View>
          </View>
        }
        ListFooterComponent={
          <AppButton
            label="Download Full Report"
            onPress={() => navigation.navigate('Report')}
            color={T.blue}
            textColor="#fff"
            icon="🖨️"
            style={{ marginTop: 8 }}
          />
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 12,
    borderBottomWidth: 1,
  },
  summaryItem: { alignItems: 'center' },
  summaryLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  summaryVal: { fontSize: 18, fontWeight: '900', marginTop: 2 },
  summaryStatus: { fontSize: 11, fontWeight: '700', marginTop: 1 },
  cropBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
    gap: 12,
  },
  cropIcon: { fontSize: 32 },
  cropLabel: { fontSize: 15, fontWeight: '800' },
  cropSub: { fontSize: 13, marginTop: 2 },
  sectionHead: { borderRadius: 8, padding: 8, marginBottom: 8, marginTop: 4 },
  sectionHeadText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});

