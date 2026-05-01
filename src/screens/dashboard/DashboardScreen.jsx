import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  FlatList,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch, useSelector } from 'react-redux';
import useTheme from '../../hooks/useTheme';
import { Typography, Spacing, Radius, Shadow } from '../../theme';
import { PRODUCTS, mapProductsWithDevices } from '../../config/products';
import { getUserDevices } from '../../redux/actions';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - Spacing.lg * 2;
const CARD_MARGIN = Spacing.md;

export function DashboardScreen({ navigation }) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const T = theme.colors;
  const user = useSelector(s => s.auth.user);
  const token = useSelector(s => s.auth?.token);
  const [activeSlide, setActiveSlide] = useState(0);
  const scrollViewRef = useRef(null);
  const sliderRef = useRef(null);
  const devices = useSelector(s => s.userDevices?.devices);
  console.log('Devices from Redux:/', devices);
  useEffect(() => {
    const fetchDevices = async () => {
      if (token) {
        const res = await dispatch(getUserDevices(token));
        console.log(res.payload.data, 'device res');
      }
    };

    fetchDevices();
  }, [token]);
  const bannerSlides = [
    {
      id: 1,
      title: 'Smart Farming',
      subtitle: 'Better Tomorrow 🌿',
      description: 'Monitor • Analyze • Improve\nAll in one place',
      image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef',
    },
    {
      id: 2,
      title: 'Soil Analysis',
      subtitle: 'Better Yields 🌱',
      description: 'Real-time • Accurate • Actionable\nData at your fingertips',
      image: 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6',
    },
  ];

  // Get first 4 active products for Quick Access
  const updatedProducts = useMemo(() => {
    return mapProductsWithDevices(PRODUCTS, devices);
  }, [devices]);

  const quickAccessProducts = useMemo(() => {
    return updatedProducts.slice(0, 4);
  }, [updatedProducts]);
  const handleScroll = event => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const currentSlide = Math.round(
      contentOffsetX / (CARD_WIDTH + CARD_MARGIN * 2),
    );
    setActiveSlide(currentSlide);
  };

  const renderBannerSlide = ({ item }) => (
    <ImageBackground
      source={{ uri: item.image }}
      style={[s.bannerCard, { width: CARD_WIDTH }]}
      imageStyle={{ borderRadius: Radius.lg }}
    >
      <View style={s.bannerOverlay} />
      <View style={s.bannerContent}>
        <View>
          <Text style={[s.bannerTitle]}>{item.title}</Text>
          <Text style={[s.bannerSubtitle]}>{item.subtitle}</Text>
          <Text style={[s.bannerDescription]}>{item.description}</Text>
        </View>
        <View style={s.bannerDots}>
          {bannerSlides.map((_, idx) => (
            <View
              key={idx}
              style={[
                s.dot,
                {
                  backgroundColor:
                    idx === activeSlide
                      ? T.primary
                      : 'rgba(255, 255, 255, 0.4)',
                  width: idx === activeSlide ? 28 : 8,
                },
              ]}
            />
          ))}
        </View>
      </View>
    </ImageBackground>
  );
  const renderProductCard = ({ item }) => (
    <TouchableOpacity
      style={[
        s.productCard,
        {
          backgroundColor: T.card,
          borderColor: T.cardBorder,
          ...Shadow.md,
          opacity: item.locked ? 0.4 : 1,
        },
      ]}
      activeOpacity={0.8}
      onPress={() => {
        if (item.route && item.active) {
          navigation.navigate(item.route, { item });
        }
      }}
      disabled={!item.active}
    >
      {/* Top Row */}
      <View style={s.productTop}>
        <View
          style={[
            s.productIconContainer,
            { backgroundColor: `${item.color}20` },
          ]}
        >
          <MaterialCommunityIcons
            name={item.icon || 'cube-outline'}
            size={26}
            color={item.color}
          />
        </View>

        {item.locked ? (
          <MaterialCommunityIcons name="lock" size={18} color={T.textSub} />
        ) : (
          <MaterialCommunityIcons
            name="chevron-right"
            size={20}
            color={T.primary}
          />
        )}
      </View>

      {/* Text */}
      <View style={s.productTextWrap}>
        <Text style={[s.productTitle, { color: T.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        {/* 
      <Text
        style={[s.productSubtitle, { color: T.textSub }]}
        numberOfLines={2}
      >
        {item.description}
      </Text> */}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[s.bg, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.bg} />

      <ScrollView
        ref={scrollViewRef}
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
        scrollEventThrottle={16}
      >
        {/* Header */}
        <View style={[s.header, { paddingHorizontal: Spacing.lg }]}>
          <View style={s.headerLeft}>
            {/* <Image
              source={{
                uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
              }}
              style={s.avatar}
            /> */}
            <View style={s.avatar}>
              <MaterialCommunityIcons name="account" size={42} color={T.text} />
            </View>
            <View style={s.headerInfo}>
              <Text style={[s.greeting, { color: T.text }]}>
                Hello, {user?.full_name || user?.username || 'User'}{' '}
                <Text style={{ fontSize: 18 }}>🌿</Text>
              </Text>
              <Text style={[s.subtitle, { color: T.textSub }]}>
                Smart Farming Dashboard
              </Text>
            </View>
          </View>
          {/* <TouchableOpacity
            style={[
              s.notificationBell,
              { backgroundColor: T.primary, borderColor: T.primary },
            ]}
          >
            <MaterialCommunityIcons name="bell" size={20} color="#fff" />
            <View style={s.badge}>
              <Text style={s.badgeText}>3</Text>
            </View>
          </TouchableOpacity> */}
        </View>

        {/* Banner Carousel */}
        <View style={s.carouselContainer}>
          <FlatList
            ref={sliderRef}
            data={bannerSlides}
            renderItem={renderBannerSlide}
            keyExtractor={item => item.id.toString()}
            horizontal
            pagingEnabled
            scrollEventThrottle={16}
            onScroll={handleScroll}
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_WIDTH + CARD_MARGIN * 2}
            decelerationRate="fast"
            contentContainerStyle={{
              paddingHorizontal: Spacing.lg,
              gap: CARD_MARGIN,
            }}
          />
        </View>

        {/* Quick Access Section */}
        <View style={[s.section, { paddingHorizontal: Spacing.lg }]}>
          <View style={s.sectionHeader}>
            <Text style={[Typography.h3, { color: T.text }]}>Products</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('ProductsListingScreen')}
            >
              <View style={s.viewAllContainer}>
                <Text style={[s.viewAll, { color: T.primary }]}>View All</Text>
                <MaterialCommunityIcons
                  name="arrow-right"
                  size={18}
                  color={T.primary}
                  style={{ marginLeft: 4 }}
                />
              </View>
            </TouchableOpacity>
          </View>

          <View style={s.quickAccessGrid}>
            {quickAccessProducts.slice(0, 2).map(item => (
              <View key={item.id} style={{ flex: 1 }}>
                {renderProductCard({ item })}
              </View>
            ))}
          </View>
          <View style={s.quickAccessGrid}>
            {quickAccessProducts.slice(2, 4).map(item => (
              <View key={item.id} style={{ flex: 1 }}>
                {renderProductCard({ item })}
              </View>
            ))}
          </View>
        </View>

        {/* Live Overview Section */}
        <View style={[s.section, { paddingHorizontal: Spacing.lg }]}>
          <View
            style={[
              s.tipCard,
              {
                backgroundColor: T.card,
                borderColor: T.cardBorder,
                ...Shadow.md,
              },
            ]}
          >
            <View
              style={[
                s.tipIconContainer,
                { backgroundColor: `${T.primary}20` },
              ]}
            >
              <MaterialCommunityIcons
                name="hand-water"
                size={28}
                color={T.primary}
              />
            </View>
            <View style={s.tipContent}>
              <Text style={[s.tipTitle, { color: T.text }]}>Daily Tip</Text>
              <Text
                style={[s.tipDescription, { color: T.textSub }]}
                numberOfLines={2}
              >
                Water your crops in the early morning for better absorption.
              </Text>
            </View>
          </View>

          <View
            style={[
              s.weatherCard,
              {
                backgroundColor: T.card,
                borderColor: T.cardBorder,
                ...Shadow.md,
              },
            ]}
          >
            <View style={s.weatherLeft}>
              <MaterialCommunityIcons
                name="weather-partly-cloudy"
                size={44}
                color="#F97316"
              />
              <View style={s.weatherInfo}>
                <Text style={[s.weatherTemp, { color: T.text }]}>28°C</Text>
                <Text
                  style={[s.weatherCondition, { color: T.textSub }]}
                  numberOfLines={1}
                >
                  Partly Cloudy
                </Text>
              </View>
            </View>
            <View style={s.weatherRight}>
              <MaterialCommunityIcons
                name="map-marker"
                size={16}
                color={T.primary}
              />
              <Text
                style={[s.weatherLocation, { color: T.textSub }]}
                numberOfLines={1}
              >
                Delhi, India
              </Text>
            </View>
          </View>
        </View>

        {/* Spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bg: {
    flex: 1,
  },
  scroll: {
    flex: 1,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.md,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: Spacing.md,
  },
  headerInfo: {
    flex: 1,
  },
  greeting: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    lineHeight: 22,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  notificationBell: {
    width: 52,
    height: 52,
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
    ...Shadow.md,
  },
  badge: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    ...Shadow.md,
  },
  badgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },

  // Carousel Styles
  carouselContainer: {
    // marginHorizontal: -Spacing.lg,
    marginBottom: Spacing.xl,
  },
  bannerCard: {
    height: 210,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadow.lg,
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  bannerContent: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: 'space-between',
  },
  bannerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 38,
  },
  bannerSubtitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 6,
    lineHeight: 20,
  },
  bannerDescription: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 10,
    lineHeight: 18,
  },
  bannerDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },

  // Quick Access Styles (Now Products)
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  viewAllContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAll: {
    fontSize: 13,
    fontWeight: '600',
  },
  quickAccessGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  quickAccessCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 100,
  },
  quickAccessIconContainer: {
    width: 64,
    height: 64,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
    flexShrink: 0,
  },
  productEmoji: {
    fontSize: 32,
  },
  quickAccessTextContainer: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  quickAccessTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
    lineHeight: 18,
  },
  quickAccessSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  quickAccessArrow: {
    padding: 8,
    flexShrink: 0,
  },

  // Metrics Styles
  metricsContainer: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  metricCard: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
    alignItems: 'center',
    minWidth: 110,
  },
  metricIconBg: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
  },
  metricStatus: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Tip Card Styles
  tipCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    minHeight: 90,
  },
  tipIconContainer: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
    flexShrink: 0,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  tipDescription: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },

  // Weather Card Styles
  weatherCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 85,
  },
  weatherLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  weatherInfo: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  weatherTemp: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 2,
  },
  weatherCondition: {
    fontSize: 12,
    fontWeight: '500',
  },
  weatherRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: Spacing.md,
  },
  weatherLocation: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
    maxWidth: 80,
  },

  // Bottom Navigation Styles
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingBottom: 12,
    paddingTop: 12,
    height: 80,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 8,
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
  },
  productCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    minHeight: 130,
    justifyContent: 'space-between',
  },

  productTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  productIconContainer: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },

  productEmoji: {
    fontSize: 28,
  },

  productTextWrap: {
    marginTop: Spacing.md,
  },

  productTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },

  productSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
});
