// src/reports/LeafLenzDetailScreen.jsx

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
import { fetchLeafLenzDetail } from '../redux/actions/leaflenzActions';
import { BASE_URL } from '../ApiConfig';

const TABS = ['Overview', 'Symptoms', 'Treatment'];

export default function LeafLenzDetailScreen({ navigation, route }) {
  const theme = useTheme();
  const T = theme.colors;
  const dispatch = useDispatch();

  const { readingId, deviceId, reading: passedReading, deviceName } =
    route.params || {};

  const { scanDetail, scanDetailLoading, scanDetailError } = useSelector(
    s => s.leaflenz,
  );

  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (deviceId && readingId) {
      dispatch(fetchLeafLenzDetail(deviceId, readingId)).catch(() => {});
    }
  }, [dispatch, deviceId, readingId]);

  const reading = scanDetail || passedReading || {};

  const isHealthy =
    reading?.disease_name?.toLowerCase().includes('healthy') ||
    reading?.tag?.toLowerCase().includes('healthy');

  const confidencePct = reading?.field1
    ? Math.round(Number(reading.field1) * 100)
    : reading?.confidence
    ? Math.round(Number(reading.confidence) * 100)
    : 85;

  // Format Image URL
  const imageUrl = useMemo(() => {
    if (!reading?.image_path) return null;
    if (
      reading.image_path.startsWith('http://') ||
      reading.image_path.startsWith('https://')
    ) {
      return reading.image_path;
    }
    const cleanBase = BASE_URL.replace(/\/+$/, '');
    const cleanPath = reading.image_path.replace(/^\/+/, '');
    return `${cleanBase}/${cleanPath}`;
  }, [reading?.image_path]);

  // Symptoms & Treatment extraction
  const diseaseInfo = useMemo(
    () => reading?.disease_info || {},
    [reading?.disease_info],
  );
  const description =
    diseaseInfo?.description ||
    'AI vision model analyzed leaf texture, coloration patterns, and chlorosis characteristics.';

  const symptomsList = useMemo(() => {
    if (Array.isArray(diseaseInfo?.symptoms)) return diseaseInfo.symptoms;
    if (typeof diseaseInfo?.symptoms === 'string') {
      return diseaseInfo.symptoms
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0);
    }
    return isHealthy
      ? ['Uniform leaf green pigmentation', 'No visible chlorosis or lesions', 'Healthy leaf cuticle and cellular structure']
      : ['Visible discoloration or leaf spots', 'Chlorosis or necrotic tissue around leaf margins', 'Potential wilting or fungal mycelium'];
  }, [diseaseInfo?.symptoms, isHealthy]);

  const treatmentList = useMemo(() => {
    const raw = diseaseInfo?.treatment_and_prevention || diseaseInfo?.treatment;
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      return raw
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0);
    }
    return isHealthy
      ? ['Continue standard balanced fertilization', 'Maintain regular drip or furrow irrigation schedule', 'Inspect foliage weekly for early pest detection']
      : [
          'Isolate heavily infected leaves and prune carefully to avoid spreading spores.',
          'Apply recommended biological or copper-based fungicide as per agricultural extension guidelines.',
          'Avoid overhead sprinkler watering to reduce canopy moisture.',
          'Sterilize pruning shears between plants with alcohol solution.',
        ];
  }, [diseaseInfo, isHealthy]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `LeafLENZ Diagnosis Report #${readingId}\nPlant: ${
          reading.plant_name || 'Crop'
        }\nDiagnosis: ${
          reading.disease_name || reading.tag || 'Unknown'
        }\nConfidence: ${confidencePct}%\nStatus: ${
          isHealthy ? 'Healthy ✅' : 'Disease Detected ⚠️'
        }`,
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
          title={`Scan #${readingId}`}
          subtitle="LeafLENZ Diagnosis"
          onBack={() => navigation.goBack()}
          theme={theme}
        />
        <View style={s.center}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={{ color: T.muted, marginTop: 12, fontSize: 13 }}>
            Loading diagnosis report…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.root, { backgroundColor: T.bg }]}>
      <StatusBar
        barStyle={T.statusBar ?? 'light-content'}
        backgroundColor={T.bg}
      />
      <TopBar
        title={`Scan #${readingId || reading?.id || 'Detail'}`}
        subtitle={deviceName || 'LeafLENZ'}
        onBack={() => navigation.goBack()}
        theme={theme}
      />

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── High-Res Image Banner ── */}
        <View
          style={[
            s.imageCard,
            { backgroundColor: T.card, borderColor: T.border },
          ]}
        >
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={s.leafImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[s.placeholderImage, { backgroundColor: T.cardAlt ?? T.card }]}>
              <Icon name="leaf" size={64} color="#10B98150" />
              <Text style={{ color: T.muted, marginTop: 8, fontSize: 12 }}>
                Scan photo preview
              </Text>
            </View>
          )}

          {/* Plant Badge Overlay */}
          <View style={s.imageOverlayBadges}>
            <View style={s.plantChip}>
              <Icon name="sprout" size={13} color="#fff" />
              <Text style={s.plantChipText}>
                {reading.plant_name || 'Crop Leaf'}
              </Text>
            </View>
            <View
              style={[
                s.statusChip,
                { backgroundColor: isHealthy ? '#10B981' : '#F59E0B' },
              ]}
            >
              <Text style={s.statusChipText}>
                {isHealthy ? 'Healthy' : 'Diseased'}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Diagnosis Card Hero ── */}
        <View
          style={[
            s.diagnosisHeroCard,
            {
              backgroundColor: T.card,
              borderColor: isHealthy ? '#10B98150' : '#F59E0B50',
            },
          ]}
        >
          <View style={s.diagnosisHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={[s.heroPlantSub, { color: T.muted }]}>
                {reading.plant_name || 'Plant'} Leaf Condition
              </Text>
              <Text style={[s.heroDiseaseTitle, { color: T.text }]}>
                {reading.disease_name || reading.tag || 'Diagnosed Condition'}
              </Text>
            </View>
            <View
              style={[
                s.confidenceCircle,
                {
                  borderColor: isHealthy ? '#10B981' : '#F59E0B',
                  backgroundColor: isHealthy ? '#10B98115' : '#F59E0B15',
                },
              ]}
            >
              <Text
                style={[
                  s.confidenceNumber,
                  { color: isHealthy ? '#10B981' : '#F59E0B' },
                ]}
              >
                {confidencePct}%
              </Text>
              <Text style={[s.confidenceSub, { color: T.muted }]}>
                Match
              </Text>
            </View>
          </View>

          {/* Confidence Progress Bar */}
          <View style={s.progressRow}>
            <View style={[s.barTrack, { backgroundColor: T.border }]}>
              <View
                style={[
                  s.barFill,
                  {
                    width: `${confidencePct}%`,
                    backgroundColor: isHealthy ? '#10B981' : '#F59E0B',
                  },
                ]}
              />
            </View>
            <Text style={[s.dateText, { color: T.muted }]}>{recordedDate}</Text>
          </View>
        </View>

        {/* ── 3 Tab Navigation ── */}
        <View
          style={[
            s.tabRow,
            { backgroundColor: T.card, borderColor: T.border },
          ]}
        >
          {TABS.map((tab, i) => {
            const isActive = activeTab === i;
            return (
              <TouchableOpacity
                key={tab}
                style={[
                  s.tabBtn,
                  isActive && {
                    borderBottomColor: '#10B981',
                    borderBottomWidth: 2.5,
                  },
                ]}
                onPress={() => setActiveTab(i)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    s.tabLabel,
                    {
                      color: isActive ? '#10B981' : T.muted,
                      fontWeight: isActive ? '800' : '600',
                    },
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Tab Content: Overview ── */}
        {activeTab === 0 && (
          <View
            style={[
              s.sectionCard,
              { backgroundColor: T.card, borderColor: T.border },
            ]}
          >
            <View style={s.sectionHeader}>
              <Icon name="information-outline" size={20} color="#10B981" />
              <Text style={[s.sectionTitle, { color: T.text }]}>
                Description & Biology
              </Text>
            </View>
            <Text style={[s.descText, { color: T.textSub }]}>{description}</Text>

            {/* Quick Metrics */}
            <View style={s.metricsGrid}>
              <View
                style={[
                  s.metricBox,
                  { backgroundColor: T.cardAlt ?? T.card, borderColor: T.border },
                ]}
              >
                <Icon name="shield-search" size={20} color="#10B981" />
                <Text style={[s.metricVal, { color: T.text }]}>
                  {confidencePct > 80 ? 'High' : 'Moderate'}
                </Text>
                <Text style={[s.metricLbl, { color: T.muted }]}>Accuracy</Text>
              </View>

              <View
                style={[
                  s.metricBox,
                  { backgroundColor: T.cardAlt ?? T.card, borderColor: T.border },
                ]}
              >
                <Icon
                  name={isHealthy ? 'heart-pulse' : 'alert-circle-outline'}
                  size={20}
                  color={isHealthy ? '#10B981' : '#EF4444'}
                />
                <Text
                  style={[
                    s.metricVal,
                    { color: isHealthy ? '#10B981' : '#EF4444' },
                  ]}
                >
                  {isHealthy ? 'Optimal' : 'Active'}
                </Text>
                <Text style={[s.metricLbl, { color: T.muted }]}>Severity</Text>
              </View>

              <View
                style={[
                  s.metricBox,
                  { backgroundColor: T.cardAlt ?? T.card, borderColor: T.border },
                ]}
              >
                <Icon name="molecule" size={20} color="#2563EB" />
                <Text style={[s.metricVal, { color: T.text }]}>ONNX v2</Text>
                <Text style={[s.metricLbl, { color: T.muted }]}>Engine</Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Tab Content: Symptoms ── */}
        {activeTab === 1 && (
          <View
            style={[
              s.sectionCard,
              { backgroundColor: T.card, borderColor: T.border },
            ]}
          >
            <View style={s.sectionHeader}>
              <Icon name="eye-outline" size={20} color="#10B981" />
              <Text style={[s.sectionTitle, { color: T.text }]}>
                Identified Symptoms
              </Text>
            </View>

            {symptomsList.map((item, idx) => (
              <View key={idx} style={s.bulletItem}>
                <View style={[s.bulletCircle, { backgroundColor: '#10B981' }]}>
                  <Text style={s.bulletNum}>{idx + 1}</Text>
                </View>
                <Text style={[s.bulletText, { color: T.text }]}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Tab Content: Treatment ── */}
        {activeTab === 2 && (
          <View
            style={[
              s.sectionCard,
              { backgroundColor: T.card, borderColor: T.border },
            ]}
          >
            <View style={s.sectionHeader}>
              <Icon name="medical-bag" size={20} color="#10B981" />
              <Text style={[s.sectionTitle, { color: T.text }]}>
                Treatment & Prevention Plan
              </Text>
            </View>

            {treatmentList.map((step, idx) => (
              <View key={idx} style={s.bulletItem}>
                <Icon
                  name="check-circle-outline"
                  size={18}
                  color="#10B981"
                  style={{ marginTop: 2 }}
                />
                <Text style={[s.bulletText, { color: T.text }]}>{step}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Farmer Card (if linked) ── */}
        {reading.farmer && (
          <View
            style={[
              s.farmerCard,
              { backgroundColor: T.card, borderColor: T.border },
            ]}
          >
            <View style={s.farmerHeader}>
              <Icon name="account-circle-outline" size={22} color="#10B981" />
              <Text style={[s.farmerTitle, { color: T.text }]}>
                Linked Farmer Profile
              </Text>
            </View>
            <View style={s.farmerGrid}>
              <View style={s.farmerCol}>
                <Text style={[s.fLbl, { color: T.muted }]}>Name</Text>
                <Text style={[s.fVal, { color: T.text }]}>
                  {reading.farmer.name || '--'}
                </Text>
              </View>
              <View style={s.farmerCol}>
                <Text style={[s.fLbl, { color: T.muted }]}>Village / District</Text>
                <Text style={[s.fVal, { color: T.text }]}>
                  {reading.farmer.village || reading.farmer.district || '--'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Bottom Action Buttons ── */}
        <View style={s.bottomActionsRow}>
          <TouchableOpacity
            style={[s.actionShareBtn, { backgroundColor: '#10B981' }]}
            onPress={handleShare}
            activeOpacity={0.85}
          >
            <Icon name="share-variant" size={18} color="#fff" />
            <Text style={s.actionShareText}>Share Report</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              s.actionScanAgainBtn,
              { backgroundColor: T.cardAlt ?? T.card, borderColor: T.border },
            ]}
            onPress={() =>
              navigation.navigate('LeafLenzScanScreen', { deviceId })
            }
            activeOpacity={0.7}
          >
            <Icon name="camera-plus" size={18} color={T.text} />
            <Text style={[s.actionScanAgainText, { color: T.text }]}>
              Scan Again
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  scroll: { padding: Spacing.lg, paddingBottom: 60 },

  imageCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderStyle: 'solid',
    overflow: 'hidden',
    height: 240,
    marginBottom: Spacing.md,
    position: 'relative',
    backgroundColor: '#00000008',
    ...Shadow.md,
  },
  leafImage: {
    width: '100%',
    height: 240,
    borderRadius: Radius.xl,
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageOverlayBadges: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  plantChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  plantChipText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  statusChipText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  diagnosisHeroCard: {
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  diagnosisHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  heroPlantSub: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  heroDiseaseTitle: { fontSize: 22, fontWeight: '900', flexWrap: 'wrap' },

  confidenceCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginLeft: 10,
  },
  confidenceNumber: { fontSize: 16, fontWeight: '900' },
  confidenceSub: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },

  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  barTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  dateText: { fontSize: 11, fontWeight: '600' },

  tabRow: {
    flexDirection: 'row',
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabLabel: { fontSize: 13 },

  sectionCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  descText: { fontSize: 14, lineHeight: 22, marginBottom: Spacing.lg },

  metricsGrid: { flexDirection: 'row', gap: Spacing.sm },
  metricBox: {
    flex: 1,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricVal: { fontSize: 15, fontWeight: '800', marginTop: 4, marginBottom: 2 },
  metricLbl: { fontSize: 10, fontWeight: '600' },

  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  bulletCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  bulletNum: { color: '#fff', fontSize: 11, fontWeight: '800' },
  bulletText: { fontSize: 14, lineHeight: 20, flex: 1 },

  farmerCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  farmerHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.sm },
  farmerTitle: { fontSize: 14, fontWeight: '800' },
  farmerGrid: { flexDirection: 'row', gap: Spacing.md },
  farmerCol: { flex: 1 },
  fLbl: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  fVal: { fontSize: 13, fontWeight: '700', marginTop: 2 },

  bottomActionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  actionShareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: Radius.md,
  },
  actionShareText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  actionScanAgainBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  actionScanAgainText: { fontSize: 14, fontWeight: '700' },
});
