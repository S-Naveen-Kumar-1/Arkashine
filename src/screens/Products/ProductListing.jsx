import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Dimensions,
  TextInput,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import useTheme from '../../hooks/useTheme';
import { Typography, Spacing, Radius, Shadow } from '../../theme';
import { PRODUCTS, CATEGORIES } from '../../config/products';
import LinearGradient from 'react-native-linear-gradient';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - Spacing.lg * 2 - Spacing.md) / 2;

// ---------------------------------------------------------------------------
// Subscription logger — persists subscriptions in-memory and logs to console
// ---------------------------------------------------------------------------
const subscriptionStore = new Set();

function logSubscription(product) {
  const alreadySubscribed = subscriptionStore.has(product.id);
  if (!alreadySubscribed) {
    subscriptionStore.add(product.id);
  }
  const record = {
    event: alreadySubscribed
      ? 'subscription_already_exists'
      : 'subscription_created',
    productId: product.id,
    productName: product.name,
    productCategory: product.category,
    timestamp: new Date().toISOString(),
    allSubscriptions: Array.from(subscriptionStore),
  };
  console.log(
    '[ProductsListing] Subscription event:',
    JSON.stringify(record, null, 2),
  );
  return { alreadySubscribed, record };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function ProductsListingScreen({ navigation }) {
  const theme = useTheme();
  const T = theme.colors;

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingProductId, setLoadingProductId] = useState(null);
  // Track which products the user has subscribed to (for UI feedback)
  const [subscribedIds, setSubscribedIds] = useState(new Set());

  // -------------------------------------------------------------------------
  // Derived data
  // -------------------------------------------------------------------------
  const filteredProducts = useMemo(() => {
    let filtered = PRODUCTS;
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.tag.toLowerCase().includes(q),
      );
    }
    return filtered;
  }, [selectedCategory, searchQuery]);

  const activeProducts = useMemo(
    () => filteredProducts.filter(p => p.active).length,
    [filteredProducts],
  );

  const featuredProducts = useMemo(
    () => filteredProducts.filter(p => p.isMain).length,
    [filteredProducts],
  );

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------
  const handleStartTest = useCallback(
    productId => {
      const product = PRODUCTS.find(p => p.id === productId);
      if (!product) return;
      setLoadingProductId(productId);
      setTimeout(() => {
        setLoadingProductId(null);
        if (product.route) {
          navigation.navigate(product.route);
        }
      }, 800);
    },
    [navigation],
  );

  const handleSubscribe = useCallback(product => {
    const { alreadySubscribed } = logSubscription(product);

    if (alreadySubscribed) {
      Alert.alert(
        'Already Subscribed',
        `You're already on the waitlist for ${product.name}. We'll notify you when it launches!`,
        [{ text: 'Got it', style: 'default' }],
      );
      return;
    }

    // Mark subscribed in local UI state
    setSubscribedIds(prev => {
      const next = new Set(prev);
      next.add(product.id);
      return next;
    });

    Alert.alert(
      "You're on the list! 🎉",
      `We'll notify you when ${product.name} launches.\n\nWant early access? Share with your team to move up the queue.`,
      [
        { text: 'Maybe Later', style: 'cancel' },
        {
          text: 'Share',
          style: 'default',
          onPress: () =>
            console.log('[ProductsListing] Share tapped for', product.name),
        },
      ],
    );
  }, []);

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------
  const renderStatCard = (label, value, icon, accentColor) => (
    <LinearGradient
      colors={[`${accentColor}20`, `${accentColor}08`]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[s.statCard, { borderColor: `${accentColor}35` }]}
    >
      <View style={[s.statIconBg, { backgroundColor: `${accentColor}18` }]}>
        <MaterialCommunityIcons name={icon} size={18} color={accentColor} />
      </View>
      <Text style={[s.statValue, { color: T.text }]}>{value}</Text>
      <Text style={[s.statLabel, { color: T.textSub }]}>{label}</Text>
    </LinearGradient>
  );

  const renderProductCard = ({ item }) => {
    const isLocked = !item.active;
    const isLoading = loadingProductId === item.id;
    const isSubscribed = subscribedIds.has(item.id);

    const cardBg = isLocked
      ? ['#181818', '#101010']
      : [`${item.color}14`, `${item.color}05`];

    const cardBorder = isLocked ? '#252525' : `${item.color}38`;

    return (
      <TouchableOpacity
        activeOpacity={isLocked ? 1 : 0.88}
        disabled={isLoading}
        onPress={() => !isLocked && handleStartTest(item.id)}
        style={s.cardWrapper}
      >
        <LinearGradient
          colors={cardBg}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[s.productCard, { borderColor: cardBorder }]}
        >
          {/* ── LOCK OVERLAY ─────────────────────────────────────────── */}
          {isLocked && (
            <View style={[s.lockOverlay, { backgroundColor: T.overlay }]}>
              <View style={s.lockIconCircle}>
                <MaterialCommunityIcons
                  name="lock-outline"
                  size={28}
                  color="#fff"
                />
              </View>
              <Text style={s.comingSoonText}>Subscribe to unlock</Text>
            </View>
          )}

          {/* ── ICON + BADGES ─────────────────────────────────────────── */}
          <View style={s.topSection}>
            <View
              style={[
                s.iconContainer,
                {
                  backgroundColor: `${item.color}1a`,
                  borderColor: `${item.color}45`,
                },
              ]}
            >
              <MaterialCommunityIcons
                name={item.icon || 'cube-outline'}
                size={28}
                color={item.color}
              />
            </View>

            <View style={s.badgeRow}>
              {item.isMain && (
                <View
                  style={[s.featuredBadge, { backgroundColor: item.color }]}
                >
                  <MaterialCommunityIcons name="crown" size={10} color="#fff" />
                  <Text style={s.featuredBadgeText}>Featured</Text>
                </View>
              )}
              <View style={[s.categoryTag, { borderColor: `${item.color}80` }]}>
                <Text style={[s.categoryTagText, { color: item.color }]}>
                  {item.category}
                </Text>
              </View>
            </View>
          </View>

          {/* ── TITLE + DESCRIPTION ───────────────────────────────────── */}
          <View style={s.middleSection}>
            <Text style={[s.productTitle, { color: T.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text
              style={[s.productDesc, { color: T.textSub }]}
              numberOfLines={3}
            >
              {item.description}
            </Text>
          </View>

          {/* ── TAG ───────────────────────────────────────────────────── */}
          <View
            style={[
              s.tagBadge,
              {
                backgroundColor: `${item.color}18`,
                borderColor: `${item.color}40`,
              },
            ]}
          >
            <Text style={[s.tagBadgeText, { color: item.color }]}>
              {item.tag}
            </Text>
          </View>

          {/* ── MINI STATS (active only) ───────────────────────────────── */}
          {item.active && (
            <View style={[s.miniStats, { borderTopColor: `${item.color}20` }]}>
              <View style={s.miniStatItem}>
                <MaterialCommunityIcons
                  name="flask-outline"
                  size={12}
                  color={item.color}
                />
                <Text style={[s.miniStatNum, { color: T.text }]}>
                  {item.stats.tests}
                </Text>
                <Text style={[s.miniStatLbl, { color: T.textSub }]}>Tests</Text>
              </View>
              <View
                style={[
                  s.miniStatDivider,
                  { backgroundColor: `${item.color}25` },
                ]}
              />
              <View style={s.miniStatItem}>
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={12}
                  color={item.color}
                />
                <Text style={[s.miniStatLast, { color: T.textSub }]}>
                  {item.stats.lastUsed}
                </Text>
              </View>
            </View>
          )}

          {/* ── CTA BUTTON ────────────────────────────────────────────── */}
          <View style={s.ctaSection}>
            {isLocked ? (
              <TouchableOpacity
                style={[
                  s.subscribeBtn,
                  {
                    borderColor: isSubscribed ? item.color : `${item.color}60`,
                    backgroundColor: isSubscribed
                      ? `${item.color}18`
                      : 'transparent',
                  },
                ]}
                onPress={() => handleSubscribe(item)}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons
                  name={isSubscribed ? 'check-circle-outline' : 'bell-outline'}
                  size={14}
                  color={isSubscribed ? item.color : `${item.color}cc`}
                />
                <Text
                  style={[
                    s.subscribeBtnText,
                    { color: isSubscribed ? item.color : `${item.color}cc` },
                  ]}
                >
                  {isSubscribed ? 'Subscribed' : 'Subscribe'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[s.startTestBtn, { backgroundColor: item.color }]}
                onPress={() => handleStartTest(item.id)}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name="play-circle-outline"
                      size={15}
                      color="#fff"
                    />
                    <Text style={s.startTestBtnText}>Start Test</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderCategoryButton = ({ item }) => (
    <TouchableOpacity
      style={[
        s.categoryBtn,
        {
          backgroundColor: selectedCategory === item ? T.primary : T.card,
          borderColor: selectedCategory === item ? T.primary : T.cardBorder,
        },
      ]}
      onPress={() => setSelectedCategory(item)}
      activeOpacity={0.7}
    >
      <Text
        style={[
          s.categoryBtnText,
          {
            color: selectedCategory === item ? '#fff' : T.textSub,
            fontWeight: selectedCategory === item ? '700' : '600',
          },
        ]}
        numberOfLines={1}
      >
        {item}
      </Text>
    </TouchableOpacity>
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <SafeAreaView style={[s.root, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.bg} />

      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
        scrollEventThrottle={16}
      >
        {/* ── HEADER ───────────────────────────────────────────────── */}
        <View style={[s.header, { paddingHorizontal: Spacing.lg }]}>
          <TouchableOpacity
            style={[
              s.backBtn,
              { backgroundColor: T.card, borderColor: T.cardBorder },
            ]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={22}
              color={T.text}
            />
          </TouchableOpacity>

          <View style={s.headerContent}>
            <Text style={[Typography.h2, { color: T.text }]}>Products</Text>
            <Text style={[s.headerSubtitle, { color: T.textSub }]}>
              Explore all features
            </Text>
          </View>

          <View style={[s.countBadge, { backgroundColor: T.primary }]}>
            <Text style={s.countBadgeText}>{filteredProducts.length}</Text>
          </View>
        </View>

        {/* ── SEARCH ───────────────────────────────────────────────── */}
        <View
          style={{ paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg }}
        >
          <View
            style={[
              s.searchBar,
              {
                backgroundColor: T.inputBg ?? T.card,
                borderColor: T.cardBorder,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="magnify"
              size={20}
              color={T.textSub}
              style={{ marginRight: 10 }}
            />
            <TextInput
              style={[s.searchInput, { color: T.text }]}
              placeholder="Search products..."
              placeholderTextColor={T.textSub}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons
                  name="close-circle"
                  size={17}
                  color={T.textSub}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── CATEGORY FILTER ──────────────────────────────────────── */}
        <View style={{ marginBottom: Spacing.lg }}>
          <FlatList
            data={CATEGORIES}
            renderItem={renderCategoryButton}
            keyExtractor={item => item}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: Spacing.lg,
              gap: Spacing.sm,
            }}
          />
        </View>

        {/* ── STATS ROW ────────────────────────────────────────────── */}
        <View style={[s.statsRow, { paddingHorizontal: Spacing.lg }]}>
          {renderStatCard('Active', activeProducts, 'flask-outline', '#22C55E')}
          {renderStatCard('Featured', featuredProducts, 'crown', '#F59E0B')}
          {renderStatCard(
            'Total',
            filteredProducts.length,
            'package-variant',
            '#8B5CF6',
          )}
        </View>

        {/* ── PRODUCTS GRID ────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: Spacing.lg }}>
          {filteredProducts.length > 0 ? (
            <FlatList
              data={filteredProducts}
              renderItem={renderProductCard}
              keyExtractor={item => item.id.toString()}
              numColumns={2}
              scrollEnabled={false}
              columnWrapperStyle={{ gap: Spacing.md }}
              ItemSeparatorComponent={() => (
                <View style={{ height: Spacing.md }} />
              )}
            />
          ) : (
            <View style={s.emptyState}>
              <MaterialCommunityIcons
                name="package-variant-closed"
                size={60}
                color={T.textSub}
                style={{ opacity: 0.25, marginBottom: Spacing.lg }}
              />
              <Text style={[s.emptyTitle, { color: T.text }]}>
                No Products Found
              </Text>
              <Text style={[s.emptySubtitle, { color: T.textSub }]}>
                Try adjusting your search or filters
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },

  // HEADER
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginVertical: Spacing.lg,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    flexShrink: 0,
  },
  headerContent: { flex: 1 },
  headerSubtitle: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  countBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    ...Shadow.sm,
  },
  countBadgeText: { color: '#fff', fontSize: 13, fontWeight: '800' },

  // SEARCH
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    paddingVertical: 0,
  },

  // CATEGORY
  categoryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  categoryBtnText: { fontSize: 13, maxWidth: 100 },

  // STATS
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 96,
  },
  statIconBg: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statValue: { fontSize: 20, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 11, fontWeight: '600' },

  // CARD
  cardWrapper: {
    flex: 1,
    // Fixed height: icon(56) + badges(~54) + title+desc(~90) + tag(28) +
    //               miniStats(36) + cta(44) + padding(16*2) + gaps(~36) ≈ 380
    height: 320,
  },
  productCard: {
    flex: 1,
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.xs,
    overflow: 'hidden',
    // paddingVertical:10
    justifyContent: 'space-between',
  },

  // LOCK OVERLAY
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.68)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    borderRadius: Radius.xl,

    pointerEvents: 'none', // ✅ THIS is the real fix
  },
  lockIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  comingSoonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // CARD SECTIONS
  topSection: { marginBottom: Spacing.sm },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    borderWidth: 1.5,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  featuredBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  categoryTag: {
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  categoryTagText: { fontSize: 10, fontWeight: '700' },

  middleSection: { marginBottom: Spacing.sm },
  productTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 5,
    lineHeight: 19,
  },
  productDesc: { fontSize: 11, lineHeight: 15 },

  tagBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: Radius.sm,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  tagBadgeText: { fontSize: 10, fontWeight: '700' },

  // MINI STATS
  miniStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 8,
    borderTopWidth: 1,
    marginBottom: Spacing.sm,
  },
  miniStatItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniStatNum: { fontSize: 12, fontWeight: '700' },
  miniStatLbl: { fontSize: 10, fontWeight: '500' },
  miniStatLast: { fontSize: 11, fontWeight: '600' },
  miniStatDivider: { width: 1, height: 14 },

  // CTA
  ctaSection: {
    marginTop: 10,
    paddingBottom: 10,
    zIndex: 5,
    elevation: 5, // Android
  },
  startTestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    alignSelf: 'center', // ✅ key line (prevents full width)
    paddingHorizontal: 14, // ⬅️ controls width
    paddingVertical: 8,

    borderRadius: Radius.md,
    gap: 4,
  },

  subscribeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    alignSelf: 'center', // ✅ key line
    paddingHorizontal: 14,
    paddingVertical: 8,

    borderRadius: Radius.md,
    borderWidth: 1.2,
    gap: 4,
  },
  startTestBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  subscribeBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // EMPTY STATE
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl * 3,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginBottom: Spacing.sm },
  emptySubtitle: {
    fontSize: 13,
    fontWeight: '500',
    maxWidth: 200,
    textAlign: 'center',
    lineHeight: 18,
  },
});
