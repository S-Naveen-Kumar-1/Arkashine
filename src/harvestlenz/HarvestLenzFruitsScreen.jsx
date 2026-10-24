// src/harvestlenz/HarvestLenzFruitsScreen.jsx

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  FlatList,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch, useSelector } from 'react-redux';

import useTheme from '../hooks/useTheme';
import { Spacing, Radius, Shadow } from '../theme';
import { TopBar } from '../components/common';
import { fetchHarvestLenzFruits } from '../redux/actions/harvestlenzActions';

const FRUIT_CATALOG = [
  {
    key: 'mango',
    name: 'Mango',
    scientific: 'Mangifera indica',
    icon: 'fruit-cherries',
    color: '#F59E0B',
    priceRange: '₹80 - ₹180 / kg',
    shelfLife: '7 - 14 days',
    storageTemp: '12 - 14°C',
    humidity: '85 - 90%',
    market: 'Premium Export, Domestic Retail',
    description:
      'Evaluates skin blush, lenticel spotting, sap burn, and anthracnose defects. Distinguishes ripening stages from mature green to table-ready.',
  },
  {
    key: 'banana',
    name: 'Banana',
    scientific: 'Musa acuminata',
    icon: 'fruit-pineapple',
    color: '#EAB308',
    priceRange: '₹30 - ₹60 / dozen',
    shelfLife: '5 - 10 days',
    storageTemp: '13 - 15°C',
    humidity: '90 - 95%',
    market: 'Local Wholesale & Retail Mandi',
    description:
      'Grades based on peel color index (scale 1-7), crown rot, finger tip rot, and transit abrasion marks.',
  },
  {
    key: 'grapes',
    name: 'Grapes',
    scientific: 'Vitis vinifera',
    icon: 'fruit-grapes',
    color: '#8B5CF6',
    priceRange: '₹70 - ₹160 / kg',
    shelfLife: '14 - 30 days',
    storageTemp: '0 - 1°C',
    humidity: '90 - 95%',
    market: 'Cold Chain Supermarkets & Export',
    description:
      'Analyzes bunch density, berry diameter, brix coloration, shot berries, and powdery mildew signs.',
  },
  {
    key: 'pomegranate',
    name: 'Pomegranate',
    scientific: 'Punica granatum',
    icon: 'fruit-cherries',
    color: '#EF4444',
    priceRange: '₹120 - ₹240 / kg',
    shelfLife: '30 - 60 days',
    storageTemp: '5 - 7°C',
    humidity: '90 - 95%',
    market: 'Aril Export & Premium Retail',
    description:
      'Detects bacterial blight spots, internal rot, peel sunburn, calyx cleanliness, and husk cracking.',
  },
  {
    key: 'orange',
    name: 'Orange',
    scientific: 'Citrus sinensis',
    icon: 'fruit-citrus',
    color: '#EA580C',
    priceRange: '₹40 - ₹90 / kg',
    shelfLife: '14 - 28 days',
    storageTemp: '5 - 7°C',
    humidity: '85 - 90%',
    market: 'Juice Concentrate & Fresh Retail',
    description:
      'Evaluates rind puffiness, citrus canker, greening indices, scale insect marks, and juice yield estimation.',
  },
  {
    key: 'guava',
    name: 'Guava',
    scientific: 'Psidium guajava',
    icon: 'fruit-citrus',
    color: '#10B981',
    priceRange: '₹40 - ₹80 / kg',
    shelfLife: '4 - 7 days',
    storageTemp: '8 - 10°C',
    humidity: '85 - 90%',
    market: 'Local Markets & Pulp Processing',
    description:
      'Assesses skin glossiness, fruit fly oviposition punctures, anthracnose specks, and firmness maturity.',
  },
  {
    key: 'pineapple',
    name: 'Pineapple',
    scientific: 'Ananas comosus',
    icon: 'fruit-pineapple',
    color: '#D97706',
    priceRange: '₹50 - ₹110 / piece',
    shelfLife: '10 - 18 days',
    storageTemp: '10 - 13°C',
    humidity: '85 - 90%',
    market: 'Canning, Fresh Cut & Table Markets',
    description:
      'Checks eyes flatten index, shell coloration progression from base, crown compactness, and black rot.',
  },
  {
    key: 'strawberry',
    name: 'Strawberry',
    scientific: 'Fragaria × ananassa',
    icon: 'fruit-cherries',
    color: '#F43F5E',
    priceRange: '₹200 - ₹450 / kg',
    shelfLife: '3 - 7 days',
    storageTemp: '0 - 2°C',
    humidity: '90 - 95%',
    market: 'Air Freight Retail & Confectionery',
    description:
      'Detects grey mold (Botrytis), seed prominence, achene development, calyx freshness, and bruising severity.',
  },
];

export default function HarvestLenzFruitsScreen({ navigation, route }) {
  const theme = useTheme();
  const T = theme.colors;
  const dispatch = useDispatch();

  const { deviceId, deviceName } = route.params || {};
  const [search, setSearch] = useState('');
  const serverFruits = useSelector(s => s.harvestlenz?.fruits);

  useEffect(() => {
    dispatch(fetchHarvestLenzFruits()).catch(() => {});
  }, [dispatch]);

  // The server's /harvestlenz/fruits/ list is what the grading actually uses
  // (shelf life, market and price per grade), so its values win over the
  // local copy; the local catalog only adds icon, colour, description and
  // storage climate. Falls back to the local catalog while offline.
  const catalog = useMemo(() => {
    if (!Array.isArray(serverFruits) || serverFruits.length === 0) {
      return FRUIT_CATALOG;
    }
    return serverFruits.map(f => {
      const local = FRUIT_CATALOG.find(c => c.key === f.key) || {
        icon: 'fruit-cherries',
        color: '#EA580C',
        storageTemp: '—',
        humidity: '—',
        description: '',
      };
      const shelf = f.shelf_life_days || {};
      const shelfDays = [shelf.Better, shelf.Good].filter(v => v != null);
      const good = f.market?.Good;
      return {
        ...local,
        key: f.key,
        name: f.name || local.name,
        scientific: f.scientific || local.scientific || '',
        priceRange: good?.price_range || local.priceRange,
        shelfLife: shelfDays.length
          ? `${[...new Set(shelfDays)].join(' - ')} days`
          : local.shelfLife,
        market: good?.market || local.market,
      };
    });
  }, [serverFruits]);

  const filteredFruits = catalog.filter(
    f =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.scientific.toLowerCase().includes(search.toLowerCase()),
  );

  const renderFruitCard = ({ item }) => (
    <View style={[s.card, { backgroundColor: T.card, borderColor: T.border }]}>
      <View style={s.cardHeader}>
        <View style={[s.iconBox, { backgroundColor: item.color + '20', borderColor: item.color + '50' }]}>
          <Icon name={item.icon} size={28} color={item.color} />
        </View>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={s.titleRow}>
            <Text style={[s.fruitName, { color: T.text }]}>{item.name}</Text>
            <View style={[s.badge, { backgroundColor: item.color + '20' }]}>
              <Text style={[s.badgeText, { color: item.color }]}>AI Ready</Text>
            </View>
          </View>
          <Text style={[s.scientific, { color: T.muted }]}>{item.scientific}</Text>
        </View>
      </View>

      <Text style={[s.descText, { color: T.textSub }]}>{item.description}</Text>

      {/* Metrics Row */}
      <View style={[s.statsRow, { borderColor: T.border }]}>
        <View style={s.statCol}>
          <Text style={[s.statLabel, { color: T.muted }]}>Mandi Rate</Text>
          <Text style={[s.statVal, { color: T.text }]}>{item.priceRange}</Text>
        </View>
        <View style={[s.statCol, s.statBorder, { borderColor: T.border }]}>
          <Text style={[s.statLabel, { color: T.muted }]}>Shelf Life</Text>
          <Text style={[s.statVal, { color: '#EA580C' }]}>{item.shelfLife}</Text>
        </View>
        <View style={s.statCol}>
          <Text style={[s.statLabel, { color: T.muted }]}>Opt. Temp</Text>
          <Text style={[s.statVal, { color: '#3B82F6' }]}>{item.storageTemp}</Text>
        </View>
      </View>

      {/* Card Action */}
      <TouchableOpacity
        style={[s.scanFruitBtn, { backgroundColor: item.color }]}
        onPress={() =>
          navigation.navigate('HarvestLenzScanScreen', {
            deviceId,
            deviceName,
            preselectedFruit: item.key,
          })
        }
        activeOpacity={0.8}
      >
        <Icon name="camera-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
        <Text style={s.scanFruitBtnText}>Grade {item.name}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[s.root, { backgroundColor: T.bg }]} edges={['top', 'bottom']}>
      <StatusBar
        barStyle={T.statusBar ?? 'light-content'}
        backgroundColor={T.bg}
      />
      <TopBar
        title="HarvestLENZ Catalog"
        subtitle={`${catalog.length} Supported Fruit Vision Models`}
        onBack={() => navigation.goBack()}
        theme={theme}
      />

      {/* Search Bar */}
      <View style={[s.searchContainer, { backgroundColor: T.card, borderColor: T.border }]}>
        <Icon name="magnify" size={20} color={T.muted} style={{ marginRight: 8 }} />
        <TextInput
          style={[s.searchInput, { color: T.text }]}
          placeholder="Search fruits or scientific names..."
          placeholderTextColor={T.muted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Icon name="close-circle" size={18} color={T.muted} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredFruits}
        keyExtractor={item => item.key}
        renderItem={renderFruitCard}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={<View style={{ height: 30 }} />}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    paddingHorizontal: 12,
    height: 46,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  listContent: {
    padding: Spacing.md,
    paddingTop: 4,
    gap: Spacing.md,
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    ...Shadow.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fruitName: {
    fontSize: 18,
    fontWeight: '800',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  scientific: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 2,
  },
  descText: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 10,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  statVal: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  scanFruitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: Radius.md,
    marginTop: 14,
  },
  scanFruitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
