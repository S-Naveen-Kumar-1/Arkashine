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
  RefreshControl,
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

// Daily Tips Database
const DAILY_TIPS = [
  {
    id: 1,
    title: 'Water Your Crops',
    description: 'Water your crops in the early morning for better absorption.',
    icon: 'water-percent',
    color: '#3B82F6',
  },
  {
    id: 2,
    title: 'Check Soil pH',
    description:
      'Monitor soil pH levels regularly for optimal nutrient availability.',
    icon: 'beaker-check-outline',
    color: '#8B5CF6',
  },
  {
    id: 3,
    title: 'Monitor Weather',
    description:
      'Check weather forecasts before planting to avoid crop damage.',
    icon: 'weather-cloudy',
    color: '#06B6D4',
  },
  {
    id: 4,
    title: 'Pest Control',
    description:
      'Use organic pest management techniques to protect your crops.',
    icon: 'bug-check-outline',
    color: '#10B981',
  },
  {
    id: 5,
    title: 'Crop Rotation',
    description: 'Practice crop rotation annually to maintain soil fertility.',
    icon: 'sprout',
    color: '#F59E0B',
  },
  {
    id: 6,
    title: 'Nutrient Balance',
    description:
      'Use balanced fertilizers with nitrogen, phosphorus, and potassium.',
    icon: 'leaf-circle',
    color: '#EC4899',
  },
  {
    id: 7,
    title: 'Weed Management',
    description: 'Remove weeds regularly to reduce crop competition.',
    icon: 'botanicals',
    color: '#14B8A6',
  },
  {
    id: 8,
    title: 'Irrigation Schedule',
    description:
      'Maintain consistent irrigation based on soil moisture levels.',
    icon: 'water-pump',
    color: '#6366F1',
  },
  {
    id: 9,
    title: 'Seasonal Planting',
    description:
      'Plant crops according to their seasonal requirements for better yields.',
    icon: 'calendar-check',
    color: '#F97316',
  },
  {
    id: 10,
    title: 'Mulching Benefits',
    description: 'Apply mulch to retain soil moisture and reduce weed growth.',
    icon: 'tree-outline',
    color: '#8B4513',
  },
];

// Function to get random tip
const getRandomTip = () => {
  const randomIndex = Math.floor(Math.random() * DAILY_TIPS.length);
  return DAILY_TIPS[randomIndex];
};

// Weather utility functions
const getWeatherIcon = code => {
  // WMO Weather interpretation codes
  if (code === 0) return 'weather-sunny';
  if (code === 1 || code === 2) return 'weather-partly-cloudy';
  if (code === 3) return 'weather-cloudy';
  if (code === 45 || code === 48) return 'weather-fog';
  if (code === 51 || code === 53 || code === 55) return 'weather-rainy';
  if (code === 61 || code === 63 || code === 65) return 'weather-rainy';
  if (code === 71 || code === 73 || code === 75) return 'weather-snowy';
  if (code === 80 || code === 81 || code === 82) return 'weather-rainy';
  if (code === 85 || code === 86) return 'weather-snowy';
  return 'weather-cloudy';
};

const getWeatherColor = code => {
  if (code === 0) return '#F97316'; // sunny - orange
  if (code <= 3) return '#3B82F6'; // cloudy - blue
  if (code >= 51 && code <= 82) return '#6366F1'; // rainy - indigo
  if (code >= 71 && code <= 86) return '#06B6D4'; // snow - cyan
  return '#8B5CF6'; // default - purple
};

const getWeatherConditionText = code => {
  if (code === 0) return 'Clear Sky';
  if (code === 1 || code === 2) return 'Partly Cloudy';
  if (code === 3) return 'Cloudy';
  if (code === 45 || code === 48) return 'Foggy';
  if (code >= 51 && code <= 65) return 'Rainy';
  if (code >= 71 && code <= 86) return 'Snowy';
  if (code >= 80 && code <= 82) return 'Showers';
  return 'Cloudy';
};

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

  // Refresh control state
  const [refreshing, setRefreshing] = useState(false);

  // Daily tip state
  const [dailyTip, setDailyTip] = useState(getRandomTip());

  // Weather state
  const [weather, setWeather] = useState({
    temp: '--',
    condition: 'Loading',
    city: 'Bengaluru',
    code: 0,
  });
  const [weatherLoading, setWeatherLoading] = useState(true);

  // Fetch devices
  const fetchDevices = async () => {
    if (token) {
      await dispatch(getUserDevices(token));
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [token]);

  // Fetch weather data
  const fetchWeatherData = async () => {
    try {
      setWeatherLoading(true);

      // Default fallback for testing (no actual geolocation needed for now)
      // You can replace this with actual geolocation API call
      const defaultWeather = {
        temp: 28,
        condition: 'Partly Cloudy',
        city: 'Bengaluru, India',
        code: 2,
      };

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Try to fetch actual weather data
      try {
        // Using Open-Meteo free API for Bengaluru coordinates
        const latitude = 12.9716;
        const longitude = 77.5946;

        // Get city name
        const geoResponse = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
        );
        const geoData = await geoResponse.json();
        const city =
          geoData.address?.city || geoData.address?.town || 'Bengaluru, India';

        // Get weather from Open-Meteo (free, no API key)
        const weatherResponse = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&temperature_unit=celsius`,
        );
        const weatherData = await weatherResponse.json();
        const current = weatherData.current;

        setWeather({
          temp: Math.round(current.temperature_2m),
          condition: getWeatherConditionText(current.weather_code),
          city,
          code: current.weather_code,
        });
      } catch (apiError) {
        console.log('Weather API error:', apiError);
        // Use default fallback
        setWeather(defaultWeather);
      }
    } finally {
      setWeatherLoading(false);
    }
  };

  // Initial weather fetch
  useEffect(() => {
    fetchWeatherData();
  }, []);

  // Handle pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Fetch both devices and weather in parallel
      await Promise.all([fetchDevices(), fetchWeatherData()]);

      // Update daily tip on refresh
      setDailyTip(getRandomTip());
    } catch (error) {
      console.log('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  };

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

  console.log(updatedProducts, 'updated products in dashboard');
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
          dispatch({
            type: 'SET_SELECTED_PRODUCT',
            payload: item,
          });
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
      </View>
    </TouchableOpacity>
  );

  const weatherIconName = getWeatherIcon(weather.code);
  const weatherColor = getWeatherColor(weather.code);

  return (
    <SafeAreaView style={[s.bg, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.bg} />

      <ScrollView
        ref={scrollViewRef}
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        bounces={true}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={T.primary}
            titleColor={T.text}
            colors={[T.primary]}
            progressBackgroundColor={T.card}
          />
        }
      >
        {/* Header */}
        <View style={[s.header, { paddingHorizontal: Spacing.lg }]}>
          <View style={s.headerLeft}>
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
          {/* Dynamic Daily Tip Card */}
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
                { backgroundColor: `${dailyTip.color}20` },
              ]}
            >
              <MaterialCommunityIcons
                name={dailyTip.icon}
                size={28}
                color={dailyTip.color}
              />
            </View>
            <View style={s.tipContent}>
              <Text style={[s.tipTitle, { color: T.text }]}>
                {dailyTip.title}
              </Text>
              <Text
                style={[s.tipDescription, { color: T.textSub }]}
                numberOfLines={2}
              >
                {dailyTip.description}
              </Text>
            </View>
          </View>

          {/* Dynamic Weather Card */}
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
                name={weatherIconName}
                size={44}
                color={weatherColor}
              />
              <View style={s.weatherInfo}>
                <Text style={[s.weatherTemp, { color: T.text }]}>
                  {weather.temp}°C
                </Text>
                <Text
                  style={[s.weatherCondition, { color: T.textSub }]}
                  numberOfLines={1}
                >
                  {weather.condition}
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
                {weather.city}
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
  refreshTipButton: {
    padding: Spacing.sm,
    marginLeft: Spacing.sm,
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
