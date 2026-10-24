// src/reports/HarvestLenzDetailScreen.jsx

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch, useSelector } from 'react-redux';

import useTheme from '../hooks/useTheme';
import { Spacing, Radius, Shadow, Typography } from '../theme';
import { TopBar } from '../components/common';
import { fetchHarvestLenzDetail } from '../redux/actions/harvestlenzActions';
import { BASE_URL } from '../ApiConfig';

const TABS = ['Quality & Count', 'Commercial Valuation', 'Storage & Shelf Life'];

// Fruit metadata definitions
const FRUIT_INFO = {
  banana: { name: 'Banana', icon: 'fruit-pineapple', temp: '13-15°C', humidity: '90-95%', market: 'Wholesale / Retail Mandi' },
  grapes: { name: 'Grapes', icon: 'fruit-grapes', temp: '0-1°C', humidity: '90-95%', market: 'Cold Chain Supermarkets & Export' },
  guava: { name: 'Guava', icon: 'fruit-citrus', temp: '8-10°C', humidity: '85-90%', market: 'Local Markets & Pulp Processing' },
  mango: { name: 'Mango', icon: 'fruit-cherries', temp: '12-14°C', humidity: '85-90%', market: 'Premium Export & Domestic Retail' },
  orange: { name: 'Orange', icon: 'fruit-citrus', temp: '5-7°C', humidity: '85-90%', market: 'Juice Concentrate & Fresh Retail' },
  pineapple: { name: 'Pineapple', icon: 'fruit-pineapple', temp: '10-13°C', humidity: '85-90%', market: 'Canning & Table Markets' },
  pomegranate: { name: 'Pomegranate', icon: 'fruit-cherries', temp: '5-7°C', humidity: '90-95%', market: 'Aril Export & Premium Retail' },
  strawberry: { name: 'Strawberry', icon: 'fruit-cherries', temp: '0-2°C', humidity: '90-95%', market: 'Air Freight Retail & Confectionery' },
};

export default function HarvestLenzDetailScreen({ navigation, route }) {
  const theme = useTheme();
  const T = theme.colors;
  const dispatch = useDispatch();

  const { readingId, deviceId, reading: passedReading, deviceName } =
    route.params || {};

  const { scanDetail, scanDetailLoading, scanDetailError } = useSelector(
    s => s.harvestlenz || {},
  );

  const [activeTab, setActiveTab] = useState(0);
  const [showAnnotated, setShowAnnotated] = useState(true);

  useEffect(() => {
    if (deviceId && readingId) {
      dispatch(fetchHarvestLenzDetail(deviceId, readingId)).catch(() => {});
    }
  }, [dispatch, deviceId, readingId]);

  const reading = scanDetail || passedReading || {};

  // Extract fruit tag
  const fruitKey = (reading.tag || reading.fruit_type || 'mango').toLowerCase();
  const fruitMeta = FRUIT_INFO[fruitKey] || {
    name: reading.tag || 'Fruit',
    icon: 'fruit-cherries',
    temp: '10-12°C',
    humidity: '85-90%',
    market: 'Fresh Produce Mandi',
  };

  // Extract metrics from fields
  const qualityScore = reading.field1 != null ? Math.round(Number(reading.field1)) : 82;
  const goodCount = reading.field2 != null ? Number(reading.field2) : 14;
  const betterCount = reading.field3 != null ? Number(reading.field3) : 6;
  const rejectCount = reading.field4 != null ? Number(reading.field4) : 2;
  const totalCount = reading.field5 != null ? Number(reading.field5) : (goodCount + betterCount + rejectCount);
  const shelfLifeDays = reading.field6 != null ? Math.round(Number(reading.field6)) : 7;
  const totalPrice = reading.field7 != null ? Number(reading.field7).toFixed(0) : '1,840';
  const pricePerUnit = reading.field8 != null ? Number(reading.field8).toFixed(1) : '92.0';
  const isMismatch = reading.field9 ? Number(reading.field9) === 1 : false;
  const confidence = reading.field10 != null ? Math.round(Number(reading.field10) * 100) : 94;

  // Grade classification
  const gradeLabel = qualityScore >= 80 ? 'Grade A (Premium)' : qualityScore >= 60 ? 'Grade B (Standard)' : 'Grade C (Secondary)';
  const gradeColor = qualityScore >= 80 ? '#10B981' : qualityScore >= 60 ? '#F59E0B' : '#EF4444';

  // Format Image URLs
  const resolveUrl = path => {
    if (!path) return null;
    if (
      path.startsWith('http://') ||
      path.startsWith('https://') ||
      path.startsWith('data:') ||
      path.startsWith('file://') ||
      path.startsWith('content://')
    ) {
      return path;
    }
    const cleanBase = BASE_URL.replace(/\/+$/, '');
    const cleanPath = path.replace(/^\/+/, '');
    return `${cleanBase}/${cleanPath}`;
  };

  const originalImgUrl = resolveUrl(reading.image_path || reading.image);
  const annotatedImgUrl = resolveUrl(reading.annotated_image);
  const activeImageUrl = showAnnotated && annotatedImgUrl ? annotatedImgUrl : originalImgUrl;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `HarvestLENZ AI Grading Report #${readingId || ''}\nFruit: ${fruitMeta.name}\nQuality Score: ${qualityScore} / 100 (${gradeLabel})\nTotal Count: ${totalCount} pieces\nGood: ${goodCount} | Better: ${betterCount} | Reject: ${rejectCount}\nEst. Value: ₹${totalPrice}\nShelf-life: ~${shelfLifeDays} days`,
      });
    } catch (e) {
      console.warn('Share error:', e);
    }
  };

  const recordedDate = reading?.created_at
    ? new Date(reading.created_at).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Recently';

  if (scanDetailLoading && !reading?.id) {
    return (
      <SafeAreaView style={[s.root, { backgroundColor: T.bg }]}>
        <TopBar
          title={`Harvest #${readingId || ''}`}
          subtitle="HarvestLENZ AI Report"
          onBack={() => navigation.goBack()}
          theme={theme}
        />
        <View style={s.centerBox}>
          <ActivityIndicator size="large" color="#EA580C" />
          <Text style={[s.loadingText, { color: T.muted }]}>
            Retrieving HarvestLENZ Vision Report...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const goodPct = totalCount > 0 ? Math.round((goodCount / totalCount) * 100) : 0;
  const betterPct = totalCount > 0 ? Math.round((betterCount / totalCount) * 100) : 0;
  const rejectPct = totalCount > 0 ? Math.round((rejectCount / totalCount) * 100) : 0;

  return (
    <SafeAreaView style={[s.root, { backgroundColor: T.bg }]} edges={['top', 'bottom']}>
      <StatusBar
        barStyle={T.statusBar ?? 'light-content'}
        backgroundColor={T.bg}
      />
      <TopBar
        title={fruitMeta.name}
        subtitle={`HarvestLENZ Report #${readingId || 'Scan'}`}
        onBack={() => navigation.goBack()}
        theme={theme}
        rightAction={
          <TouchableOpacity onPress={handleShare} style={s.topBarActionBtn}>
            <Icon name="share-variant-outline" size={22} color={T.text} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Mismatch Alert Banner if any */}
        {isMismatch && (
          <View style={s.mismatchBanner}>
            <Icon name="alert-circle-outline" size={22} color="#EF4444" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={s.mismatchTitle}>Fruit Variety Mismatch Detected</Text>
              <Text style={s.mismatchText}>
                The AI visual detector found features inconsistent with {fruitMeta.name}. Please verify fruit classification.
              </Text>
            </View>
          </View>
        )}

        {/* ── Image Viewport ── */}
        <View style={[s.imageCard, { backgroundColor: '#0F172A', borderColor: T.border }]}>
          {activeImageUrl ? (
            <Image
              source={{ uri: activeImageUrl }}
              style={s.fruitImage}
              resizeMode="contain"
            />
          ) : (
            <View style={s.placeholderImage}>
              <Icon name="fruit-cherries" size={64} color="#EA580C50" />
              <Text style={{ color: '#94A3B8', marginTop: 8, fontSize: 13, fontWeight: '600' }}>
                No scan image available
              </Text>
            </View>
          )}

          {/* Toggle Annotated / Original Button */}
          {annotatedImgUrl && originalImgUrl && (
            <View style={s.toggleBtnWrap}>
              <TouchableOpacity
                style={[s.toggleBtn, !showAnnotated && s.toggleBtnActive]}
                onPress={() => setShowAnnotated(false)}
              >
                <Text style={[s.toggleBtnText, !showAnnotated && s.toggleBtnTextActive]}>
                  Original
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.toggleBtn, showAnnotated && s.toggleBtnActive]}
                onPress={() => setShowAnnotated(true)}
              >
                <Icon name="bounding-box" size={12} color={showAnnotated ? '#fff' : '#94A3B8'} style={{ marginRight: 4 }} />
                <Text style={[s.toggleBtnText, showAnnotated && s.toggleBtnTextActive]}>
                  AI Annotated
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Floating Tags */}
          <View style={s.imageOverlayBadges}>
            <View style={s.fruitChip}>
              <Icon name={fruitMeta.icon} size={14} color="#fff" />
              <Text style={s.fruitChipText}>{fruitMeta.name}</Text>
            </View>
            <View style={[s.statusChip, { backgroundColor: gradeColor }]}>
              <Text style={s.statusChipText}>{gradeLabel.split(' ')[0]}</Text>
            </View>
          </View>
        </View>

        {/* ── Hero Quality Card ── */}
        <View style={[s.heroCard, { backgroundColor: T.card, borderColor: gradeColor + '40' }]}>
          <View style={s.heroTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={[s.heroSub, { color: T.muted }]}>Overall Fruit Quality</Text>
              <Text style={[s.heroTitle, { color: T.text }]}>{gradeLabel}</Text>
              <Text style={[s.heroMeta, { color: T.muted }]}>
                {totalCount} pieces scanned · {recordedDate}
              </Text>
            </View>

            <View style={[s.scoreCircle, { borderColor: gradeColor, backgroundColor: gradeColor + '15' }]}>
              <Text style={[s.scoreNum, { color: gradeColor }]}>{qualityScore}</Text>
              <Text style={[s.scoreOutOf, { color: T.muted }]}>/100</Text>
            </View>
          </View>

          {/* Quick Metrics Strip */}
          <View style={[s.stripGrid, { borderColor: T.border }]}>
            <View style={s.stripCell}>
              <Text style={[s.stripLabel, { color: T.muted }]}>Est. Value</Text>
              <Text style={[s.stripVal, { color: '#10B981' }]}>₹{totalPrice}</Text>
            </View>
            <View style={[s.stripCell, s.cellBorder, { borderColor: T.border }]}>
              <Text style={[s.stripLabel, { color: T.muted }]}>Shelf Life</Text>
              <Text style={[s.stripVal, { color: '#EA580C' }]}>{shelfLifeDays} days</Text>
            </View>
            <View style={s.stripCell}>
              <Text style={[s.stripLabel, { color: T.muted }]}>AI Confidence</Text>
              <Text style={[s.stripVal, { color: '#3B82F6' }]}>{confidence}%</Text>
            </View>
          </View>
        </View>

        {/* ── Segmented Tabs ── */}
        <View style={[s.tabBar, { backgroundColor: T.card, borderColor: T.border }]}>
          {TABS.map((tab, idx) => {
            const active = activeTab === idx;
            return (
              <TouchableOpacity
                key={tab}
                style={[
                  s.tabItem,
                  active && [s.tabItemActive, { borderBottomColor: '#EA580C' }],
                ]}
                onPress={() => setActiveTab(idx)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    s.tabLabel,
                    { color: active ? '#EA580C' : T.muted, fontWeight: active ? '700' : '500' },
                  ]}
                  numberOfLines={1}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── TAB 0: Quality & Count Breakdown ── */}
        {activeTab === 0 && (
          <View style={s.tabContent}>
            {/* Count Distribution Cards */}
            <View style={s.gradeCountRow}>
              {/* Good */}
              <View style={[s.gradeCountCard, { backgroundColor: '#10B98115', borderColor: '#10B98140' }]}>
                <View style={s.gradeHeader}>
                  <Icon name="check-decagram" size={16} color="#10B981" />
                  <Text style={[s.gradeTitle, { color: '#10B981' }]}>Good</Text>
                </View>
                <Text style={[s.gradeCountNumber, { color: '#10B981' }]}>{goodCount}</Text>
                <Text style={[s.gradePct, { color: '#059669' }]}>{goodPct}% of batch</Text>
              </View>

              {/* Better */}
              <View style={[s.gradeCountCard, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B40' }]}>
                <View style={s.gradeHeader}>
                  <Icon name="star-half-full" size={16} color="#F59E0B" />
                  <Text style={[s.gradeTitle, { color: '#F59E0B' }]}>Better</Text>
                </View>
                <Text style={[s.gradeCountNumber, { color: '#F59E0B' }]}>{betterCount}</Text>
                <Text style={[s.gradePct, { color: '#D97706' }]}>{betterPct}% of batch</Text>
              </View>

              {/* Reject */}
              <View style={[s.gradeCountCard, { backgroundColor: '#EF444415', borderColor: '#EF444440' }]}>
                <View style={s.gradeHeader}>
                  <Icon name="close-circle-outline" size={16} color="#EF4444" />
                  <Text style={[s.gradeTitle, { color: '#EF4444' }]}>Reject</Text>
                </View>
                <Text style={[s.gradeCountNumber, { color: '#EF4444' }]}>{rejectCount}</Text>
                <Text style={[s.gradePct, { color: '#DC2626' }]}>{rejectPct}% of batch</Text>
              </View>
            </View>

            {/* Visual Proportion Bar */}
            <View style={[s.sectionCard, { backgroundColor: T.card, borderColor: T.border }]}>
              <Text style={[s.cardHeading, { color: T.text }]}>Batch Composition Bar</Text>
              <View style={s.barContainer}>
                {goodPct > 0 && <View style={[s.barSegment, { flex: goodPct, backgroundColor: '#10B981' }]} />}
                {betterPct > 0 && <View style={[s.barSegment, { flex: betterPct, backgroundColor: '#F59E0B' }]} />}
                {rejectPct > 0 && <View style={[s.barSegment, { flex: rejectPct, backgroundColor: '#EF4444' }]} />}
              </View>
              <View style={s.barLegendRow}>
                <View style={s.legendItem}>
                  <View style={[s.legendDot, { backgroundColor: '#10B981' }]} />
                  <Text style={[s.legendText, { color: T.muted }]}>Good ({goodPct}%)</Text>
                </View>
                <View style={s.legendItem}>
                  <View style={[s.legendDot, { backgroundColor: '#F59E0B' }]} />
                  <Text style={[s.legendText, { color: T.muted }]}>Better ({betterPct}%)</Text>
                </View>
                <View style={s.legendItem}>
                  <View style={[s.legendDot, { backgroundColor: '#EF4444' }]} />
                  <Text style={[s.legendText, { color: T.muted }]}>Reject ({rejectPct}%)</Text>
                </View>
              </View>
            </View>

            {/* Quality Standard Explanation */}
            <View style={[s.sectionCard, { backgroundColor: T.card, borderColor: T.border }]}>
              <Text style={[s.cardHeading, { color: T.text }]}>Classification Criteria</Text>
              <View style={s.criteriaRow}>
                <Icon name="check-circle" size={18} color="#10B981" style={{ marginTop: 2 }} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[s.criteriaTitle, { color: T.text }]}>Grade Good (Premium)</Text>
                  <Text style={[s.criteriaDesc, { color: T.muted }]}>
                    Uniform coloration, smooth skin, zero surface defects or bruising. Prime quality suited for direct export & premium chain stores.
                  </Text>
                </View>
              </View>
              <View style={[s.criteriaRow, { marginTop: 14 }]}>
                <Icon name="alert-circle" size={18} color="#F59E0B" style={{ marginTop: 2 }} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[s.criteriaTitle, { color: T.text }]}>Grade Better (Commercial)</Text>
                  <Text style={[s.criteriaDesc, { color: T.muted }]}>
                    Minor aesthetic blemishes or slight color variance that does not impact taste or pulp firmness. Ideal for domestic retail distribution.
                  </Text>
                </View>
              </View>
              <View style={[s.criteriaRow, { marginTop: 14 }]}>
                <Icon name="close-circle" size={18} color="#EF4444" style={{ marginTop: 2 }} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[s.criteriaTitle, { color: T.text }]}>Grade Reject (Processing)</Text>
                  <Text style={[s.criteriaDesc, { color: T.muted }]}>
                    Visible mechanical damages, over-ripeness, sunburn or fungal spots. Recommended for food processing or juice extraction.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ── TAB 1: Commercial Valuation ── */}
        {activeTab === 1 && (
          <View style={s.tabContent}>
            {/* Commercial Highlights */}
            <View style={[s.sectionCard, { backgroundColor: T.card, borderColor: T.border }]}>
              <Text style={[s.cardHeading, { color: T.text }]}>Commercial Valuation</Text>

              <View style={s.valuationGrid}>
                <View style={s.valBox}>
                  <Text style={[s.valBoxSub, { color: T.muted }]}>Estimated Total Value</Text>
                  <Text style={s.valBoxBig}>₹{totalPrice}</Text>
                  <Text style={[s.valBoxNote, { color: '#10B981' }]}>Based on current APMC rates</Text>
                </View>
                <View style={s.valBox}>
                  <Text style={[s.valBoxSub, { color: T.muted }]}>Avg Price / Unit</Text>
                  <Text style={[s.valBoxBig, { color: '#3B82F6' }]}>₹{pricePerUnit}</Text>
                  <Text style={[s.valBoxNote, { color: T.muted }]}>Calculated across all grades</Text>
                </View>
              </View>

              <View style={[s.divider, { backgroundColor: T.border }]} />

              <View style={s.marketRow}>
                <Icon name="storefront-outline" size={24} color="#EA580C" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[s.marketTitle, { color: T.text }]}>Recommended Market Channel</Text>
                  <Text style={[s.marketVal, { color: '#EA580C' }]}>{fruitMeta.market}</Text>
                </View>
              </View>
            </View>

            {/* Channel Profit Strategy */}
            <View style={[s.sectionCard, { backgroundColor: T.card, borderColor: T.border }]}>
              <Text style={[s.cardHeading, { color: T.text }]}>Profit Optimization Advice</Text>

              <View style={s.stratItem}>
                <View style={[s.stratBadge, { backgroundColor: '#10B98120' }]}>
                  <Icon name="export" size={16} color="#10B981" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[s.stratTitle, { color: T.text }]}>Sort Good Grade for Premium Outlets</Text>
                  <Text style={[s.stratDesc, { color: T.muted }]}>
                    Segregate the {goodCount} Grade A pieces to fetch a 20-35% price premium in Tier-1 city markets or modern supermarkets.
                  </Text>
                </View>
              </View>

              <View style={[s.stratItem, { marginTop: 14 }]}>
                <View style={[s.stratBadge, { backgroundColor: '#F59E0B20' }]}>
                  <Icon name="truck-fast-outline" size={16} color="#F59E0B" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[s.stratTitle, { color: T.text }]}>Direct Wholesale Dispatch</Text>
                  <Text style={[s.stratDesc, { color: T.muted }]}>
                    Send the {betterCount} Grade B items immediately to local Mandis within 48 hours to prevent quality degradation.
                  </Text>
                </View>
              </View>

              <View style={[s.stratItem, { marginTop: 14 }]}>
                <View style={[s.stratBadge, { backgroundColor: '#EF444420' }]}>
                  <Icon name="blender-outline" size={16} color="#EF4444" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[s.stratTitle, { color: T.text }]}>Pulp / Puree Processing Units</Text>
                  <Text style={[s.stratDesc, { color: T.muted }]}>
                    Divert {rejectCount} reject pieces to nearby fruit processing plants or livestock feed to avoid complete loss.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ── TAB 2: Storage & Shelf Life ── */}
        {activeTab === 2 && (
          <View style={s.tabContent}>
            {/* Shelf-Life Projection */}
            <View style={[s.sectionCard, { backgroundColor: T.card, borderColor: T.border }]}>
              <Text style={[s.cardHeading, { color: T.text }]}>Post-Harvest Shelf Life</Text>

              <View style={s.shelfHeroRow}>
                <View style={s.shelfDial}>
                  <Icon name="calendar-clock" size={32} color="#EA580C" />
                  <Text style={s.shelfDaysNum}>{shelfLifeDays}</Text>
                  <Text style={[s.shelfDaysLbl, { color: T.muted }]}>Days Left</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <Text style={[s.shelfStatus, { color: shelfLifeDays > 5 ? '#10B981' : '#F59E0B' }]}>
                    {shelfLifeDays > 5 ? 'High Shelf Stability' : 'Expedited Sale Needed'}
                  </Text>
                  <Text style={[s.shelfNote, { color: T.muted }]}>
                    Estimated under standard ambient conditions. Cool storage can extend this duration by up to 40%.
                  </Text>
                </View>
              </View>
            </View>

            {/* Storage Environment Guide */}
            <View style={[s.sectionCard, { backgroundColor: T.card, borderColor: T.border }]}>
              <Text style={[s.cardHeading, { color: T.text }]}>Optimal Storage Environment</Text>

              <View style={s.envGrid}>
                <View style={[s.envBox, { backgroundColor: T.cardAlt ?? T.card, borderColor: T.border }]}>
                  <Icon name="thermometer" size={24} color="#3B82F6" />
                  <Text style={[s.envLabel, { color: T.muted }]}>Temperature</Text>
                  <Text style={[s.envVal, { color: T.text }]}>{fruitMeta.temp}</Text>
                </View>

                <View style={[s.envBox, { backgroundColor: T.cardAlt ?? T.card, borderColor: T.border }]}>
                  <Icon name="water-percent" size={24} color="#06B6D4" />
                  <Text style={[s.envLabel, { color: T.muted }]}>Relative Humidity</Text>
                  <Text style={[s.envVal, { color: T.text }]}>{fruitMeta.humidity}</Text>
                </View>
              </View>

              <View style={[s.divider, { backgroundColor: T.border }]} />

              <View style={s.handlingItem}>
                <Icon name="fan" size={18} color="#EA580C" />
                <Text style={[s.handlingText, { color: T.textSub }]}>
                  Maintain active air circulation in warehouse crates to prevent ethylene accumulation.
                </Text>
              </View>

              <View style={[s.handlingItem, { marginTop: 10 }]}>
                <Icon name="package-variant-closed" size={18} color="#EA580C" />
                <Text style={[s.handlingText, { color: T.textSub }]}>
                  Do not stack more than 3 crates high to avoid pressure bruising on lower fruit layers.
                </Text>
              </View>

              <View style={[s.handlingItem, { marginTop: 10 }]}>
                <Icon name="shield-check-outline" size={18} color="#EA580C" />
                <Text style={[s.handlingText, { color: T.textSub }]}>
                  Inspect crates daily and remove any decaying fruit immediately to stop cross-contamination.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Actions Footer ── */}
        <View style={s.footerActions}>
          <TouchableOpacity
            style={[s.footerBtn, { backgroundColor: '#EA580C' }]}
            onPress={() => navigation.navigate('HarvestLenzScanScreen', { deviceId, deviceName })}
            activeOpacity={0.8}
          >
            <Icon name="camera-plus-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={s.footerBtnText}>Scan Another Batch</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.footerBtnAlt, { borderColor: T.border, backgroundColor: T.card }]}
            onPress={() => navigation.navigate('HarvestLenzFruitsScreen')}
            activeOpacity={0.8}
          >
            <Icon name="book-open-page-variant-outline" size={18} color={T.text} style={{ marginRight: 6 }} />
            <Text style={[s.footerBtnAltText, { color: T.text }]}>Fruit Library</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: '500',
  },
  topBarActionBtn: {
    padding: 6,
  },
  mismatchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: Spacing.md,
  },
  mismatchTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991B1B',
  },
  mismatchText: {
    fontSize: 12,
    color: '#B91C1C',
    marginTop: 2,
    lineHeight: 16,
  },

  // Image Card
  imageCard: {
    height: 240,
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fruitImage: {
    width: '100%',
    height: 240,
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleBtnWrap: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 20,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  toggleBtnActive: {
    backgroundColor: '#EA580C',
  },
  toggleBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  toggleBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  imageOverlayBadges: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fruitChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  fruitChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Hero Card
  heroCard: {
    marginTop: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    ...Shadow.sm,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroSub: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },
  heroMeta: {
    fontSize: 12,
    marginTop: 4,
  },
  scoreCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreNum: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 24,
  },
  scoreOutOf: {
    fontSize: 10,
    fontWeight: '600',
  },
  stripGrid: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  stripCell: {
    flex: 1,
    alignItems: 'center',
  },
  cellBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  stripLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  stripVal: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {},
  tabLabel: {
    fontSize: 12,
  },
  tabContent: {
    marginTop: Spacing.md,
  },

  // Grade Counts
  gradeCountRow: {
    flexDirection: 'row',
    gap: 8,
  },
  gradeCountCard: {
    flex: 1,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
  },
  gradeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gradeTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  gradeCountNumber: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4,
  },
  gradePct: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },

  // Section Card
  sectionCard: {
    marginTop: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    ...Shadow.sm,
  },
  cardHeading: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  barContainer: {
    height: 14,
    borderRadius: 7,
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: '#33415520',
  },
  barSegment: {
    height: '100%',
  },
  barLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '500',
  },

  criteriaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  criteriaTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  criteriaDesc: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },

  // Valuation
  valuationGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  valBox: {
    flex: 1,
    backgroundColor: '#EA580C10',
    borderRadius: Radius.md,
    padding: 12,
  },
  valBoxSub: {
    fontSize: 11,
    fontWeight: '600',
  },
  valBoxBig: {
    fontSize: 22,
    fontWeight: '800',
    color: '#EA580C',
    marginTop: 2,
  },
  valBoxNote: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  marketRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  marketTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  marketVal: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 1,
  },
  stratItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stratBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stratTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  stratDesc: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },

  // Shelf Life
  shelfHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shelfDial: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#EA580C15',
    borderWidth: 2,
    borderColor: '#EA580C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shelfDaysNum: {
    fontSize: 20,
    fontWeight: '800',
    color: '#EA580C',
    marginTop: 1,
  },
  shelfDaysLbl: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  shelfStatus: {
    fontSize: 16,
    fontWeight: '700',
  },
  shelfNote: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  envGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  envBox: {
    flex: 1,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
  },
  envLabel: {
    fontSize: 11,
    marginTop: 4,
  },
  envVal: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  handlingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  handlingText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },

  // Footer Actions
  footerActions: {
    marginTop: Spacing.xl,
    gap: 10,
  },
  footerBtn: {
    flexDirection: 'row',
    height: 50,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.sm,
  },
  footerBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  footerBtnAlt: {
    flexDirection: 'row',
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerBtnAltText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
