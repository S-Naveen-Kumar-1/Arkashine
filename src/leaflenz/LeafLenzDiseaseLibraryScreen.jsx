// src/leaflenz/LeafLenzDiseaseLibraryScreen.jsx

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch, useSelector } from 'react-redux';

import useTheme from '../hooks/useTheme';
import { Spacing, Radius, Shadow, Typography } from '../theme';
import { TopBar } from '../components/common';
import { fetchLeafLenzDiseases } from '../redux/actions/leaflenzActions';

const FALLBACK_DISEASES = {
  'Tomato___Early_blight': {
    plant: 'Tomato',
    disease: 'Early Blight (Alternaria solani)',
    description:
      'Fungal disease affecting tomato foliage, stems, and fruit, characterized by concentric ring spots.',
    symptoms:
      'Dark brown to black spots with concentric rings ("target-board" pattern) starting on older lower leaves, leaf yellowing, and defoliation.',
    treatment_prevention:
      'Remove and destroy infected lower leaves. Apply copper-based or mancozeb fungicide early in the season. Ensure good air circulation and avoid overhead watering.',
  },
  'Tomato___Late_blight': {
    plant: 'Tomato',
    disease: 'Late Blight (Phytophthora infestans)',
    description:
      'Highly destructive water mold that causes rapid blighting of leaves, stems, and fruits in cool, wet weather.',
    symptoms:
      'Large, irregular water-soaked spots on leaves turning brown-black with white fuzzy fungal growth on the underside during humid periods.',
    treatment_prevention:
      'Apply systemic fungicides (e.g., cymoxanil, metalaxyl) preventively. Destroy infected plants immediately. Use resistant varieties.',
  },
  'Tomato___healthy': {
    plant: 'Tomato',
    disease: 'Healthy Leaf',
    description: 'Vigorous tomato leaf free of visible pathogenetic infection or mineral chlorosis.',
    symptoms: 'Uniform dark green pigmentation, intact margins, and healthy cellular structure.',
    treatment_prevention: 'Maintain standard fertilization, drip irrigation, and routine scouting for pests.',
  },
  'Potato___Early_blight': {
    plant: 'Potato',
    disease: 'Early Blight',
    description: 'Common fungal disease causing premature leaf senescence and yield reduction in potatoes.',
    symptoms: 'Small, dark brown spots with concentric rings that enlarge and coalesce on mature foliage.',
    treatment_prevention: 'Practice 3-year crop rotation. Apply chlorothalonil or azoxystrobin fungicides at canopy closure.',
  },
  'Potato___Late_blight': {
    plant: 'Potato',
    disease: 'Late Blight',
    description: 'Severe disease causing rapid foliage death and tuber rot.',
    symptoms: 'Water-soaked lesions turning dark brown with pale margins and white mold underneath leaves.',
    treatment_prevention: 'Plant certified disease-free seed tubers. Hill soil adequately and spray preventive fungicides.',
  },
  'Corn___Common_rust': {
    plant: 'Corn (Maize)',
    disease: 'Common Rust (Puccinia sorghi)',
    description: 'Fungal leaf rust forming powdery pustules across both leaf surfaces.',
    symptoms: 'Golden-brown to cinnamon-brown pustules (uredinia) scattered across upper and lower leaf blades.',
    treatment_prevention: 'Plant rust-resistant hybrids. Foliar strobilurin or triazole fungicides if pustules appear before silking.',
  },
  'Apple___Apple_scab': {
    plant: 'Apple',
    disease: 'Apple Scab (Venturia inaequalis)',
    description: 'Major fungal disease causing velvety olive-green to black lesions on leaves and fruit.',
    symptoms: 'Dull olive-green velvety spots on leaves, turning dark brown with puckered, distorted leaf tissue.',
    treatment_prevention: 'Rake and destroy fallen leaves in autumn. Apply sulfur or captan fungicides from green tip through petal fall.',
  },
  'Grape___Black_rot': {
    plant: 'Grape',
    disease: 'Black Rot (Guignardia bidwellii)',
    description: 'Fungal infection affecting all green parts of the grapevine, especially fruit clusters.',
    symptoms: 'Small reddish-brown circular spots with dark borders on leaves, leading to shriveled black mummified berries.',
    treatment_prevention: 'Prune vines for open canopy sunlight. Spray myclobutanil or copper sulfate at early shoot growth.',
  },
};

export default function LeafLenzDiseaseLibraryScreen({ navigation }) {
  const theme = useTheme();
  const T = theme.colors;
  const dispatch = useDispatch();

  const { diseases, diseasesLoading } = useSelector(s => s.leaflenz);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlant, setSelectedPlant] = useState('All');
  const [expandedKey, setExpandedKey] = useState(null);

  useEffect(() => {
    dispatch(fetchLeafLenzDiseases()).catch(() => {});
  }, [dispatch]);

  const rawData = diseases && Object.keys(diseases).length > 0 ? diseases : FALLBACK_DISEASES;

  const diseaseList = useMemo(() => {
    const list = [];
    for (const [key, val] of Object.entries(rawData)) {
      const parts = key.split('___');
      const plant = val.plant || parts[0]?.replace(/_/g, ' ') || 'Crop';
      const disease = val.disease || parts[1]?.replace(/_/g, ' ') || key;
      list.push({
        id: key,
        plant,
        disease,
        description: val.description || 'Information available in diagnosis report.',
        symptoms: val.symptoms || 'Visual inspection required.',
        treatment: val.treatment_prevention || val.treatment || 'Consult agricultural extension.',
      });
    }
    return list;
  }, [rawData]);

  const plantFilters = useMemo(() => {
    const set = new Set(['All']);
    diseaseList.forEach(d => {
      if (d.plant) set.add(d.plant);
    });
    return Array.from(set);
  }, [diseaseList]);

  const filteredList = useMemo(() => {
    return diseaseList.filter(item => {
      const matchesPlant = selectedPlant === 'All' || item.plant.toLowerCase() === selectedPlant.toLowerCase();
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.plant.toLowerCase().includes(q) ||
        item.disease.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q);
      return matchesPlant && matchesSearch;
    });
  }, [diseaseList, selectedPlant, searchQuery]);

  return (
    <SafeAreaView style={[s.root, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={T.statusBar ?? 'light-content'} backgroundColor={T.bg} />
      <TopBar
        title="Disease Library"
        subtitle="Encyclopedia & Remedies"
        onBack={() => navigation.goBack()}
        theme={theme}
      />

      <View style={s.container}>
        {/* Search Box */}
        <View
          style={[
            s.searchBox,
            { backgroundColor: T.card, borderColor: T.border },
          ]}
        >
          <Icon name="magnify" size={20} color={T.muted} />
          <TextInput
            style={[s.searchInput, { color: T.text }]}
            placeholder="Search plant, disease, or symptom..."
            placeholderTextColor={T.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={18} color={T.muted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Horizontal Plant Filters */}
        <FlatList
          horizontal
          data={plantFilters}
          keyExtractor={item => item}
          showsHorizontalScrollIndicator={false}
          style={s.filterScroll}
          contentContainerStyle={s.filterContent}
          renderItem={({ item }) => {
            const isSelected = selectedPlant === item;
            return (
              <TouchableOpacity
                style={[
                  s.filterChip,
                  {
                    backgroundColor: isSelected ? '#10B981' : T.card,
                    borderColor: isSelected ? '#10B981' : T.border,
                  },
                ]}
                onPress={() => setSelectedPlant(item)}
              >
                <Text
                  style={[
                    s.filterChipText,
                    { color: isSelected ? '#fff' : T.text, fontWeight: isSelected ? '800' : '600' },
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />

        {/* Diseases List */}
        {diseasesLoading && filteredList.length === 0 ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={{ color: T.muted, marginTop: 12, fontSize: 13 }}>
              Loading disease encyclopedia…
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredList}
            keyExtractor={item => item.id}
            contentContainerStyle={s.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isExpanded = expandedKey === item.id;
              const isHealthy = item.disease.toLowerCase().includes('healthy');
              return (
                <TouchableOpacity
                  style={[
                    s.card,
                    {
                      backgroundColor: T.card,
                      borderColor: isExpanded ? '#10B981' : T.border,
                    },
                  ]}
                  onPress={() => setExpandedKey(isExpanded ? null : item.id)}
                  activeOpacity={0.85}
                >
                  <View style={s.cardHeader}>
                    <View
                      style={[
                        s.iconWrap,
                        {
                          backgroundColor: isHealthy ? '#10B98115' : '#F59E0B15',
                          borderColor: isHealthy ? '#10B98140' : '#F59E0B40',
                        },
                      ]}
                    >
                      <Icon
                        name={isHealthy ? 'check-circle' : 'leaf'}
                        size={22}
                        color={isHealthy ? '#10B981' : '#F59E0B'}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.plantTag, { color: T.muted }]}>
                        {item.plant}
                      </Text>
                      <Text style={[s.diseaseTitle, { color: T.text }]}>
                        {item.disease}
                      </Text>
                    </View>
                    <Icon
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={T.muted}
                    />
                  </View>

                  {/* Summary */}
                  <Text
                    style={[s.descSnippet, { color: T.textSub }]}
                    numberOfLines={isExpanded ? undefined : 2}
                  >
                    {item.description}
                  </Text>

                  {/* Expanded Symptoms & Treatment */}
                  {isExpanded && (
                    <View style={s.expandedBody}>
                      <View style={s.detailSection}>
                        <View style={s.sectionTitleRow}>
                          <Icon name="eye-outline" size={16} color="#10B981" />
                          <Text style={[s.subHeading, { color: T.text }]}>
                            Symptoms
                          </Text>
                        </View>
                        <Text style={[s.subText, { color: T.textSub }]}>
                          {item.symptoms}
                        </Text>
                      </View>

                      <View style={[s.detailSection, { marginTop: 10 }]}>
                        <View style={s.sectionTitleRow}>
                          <Icon name="medical-bag" size={16} color="#10B981" />
                          <Text style={[s.subHeading, { color: T.text }]}>
                            Treatment & Prevention
                          </Text>
                        </View>
                        <Text style={[s.subText, { color: T.textSub }]}>
                          {item.treatment}
                        </Text>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  container: { flex: 1, paddingHorizontal: Spacing.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    height: 48,
    gap: 8,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  searchInput: { flex: 1, fontSize: 14 },

  filterScroll: { maxHeight: 42, marginBottom: Spacing.md },
  filterContent: { gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipText: { fontSize: 12 },

  listContent: { paddingBottom: 60 },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plantTag: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  diseaseTitle: { fontSize: 15, fontWeight: '800' },
  descSnippet: { fontSize: 13, lineHeight: 18, marginTop: 8 },

  expandedBody: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  detailSection: {},
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  subHeading: { fontSize: 13, fontWeight: '800' },
  subText: { fontSize: 12, lineHeight: 18 },
});
