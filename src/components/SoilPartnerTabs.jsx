import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { ProductsListingScreen } from '../screens/Products/ProductListing';
import ProfileScreen from '../screens/profile/ProfileScreen';
import useTheme from '../hooks/useTheme';
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import ReportsScreen from '../reports/ReportsScreen';
import SoilPartnerDashboardScreen from '../soilpartner/SoilPartnerDashboardScreen';
const Tab = createBottomTabNavigator();

export default function SoilPartnerTabs() {
  const theme = useTheme();
  const T = theme.colors;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,

        tabBarStyle: {
          backgroundColor: T.card,
          borderTopColor: T.cardBorder,
          height: 70,
          paddingBottom: 10,
          paddingTop: 6,
        },

        tabBarActiveTintColor: T.primary,
        tabBarInactiveTintColor: T.textSub,

        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },

        tabBarIcon: ({ color, size, focused }) => {
          let iconName;

          switch (route.name) {
            case 'Home':
              iconName = 'home';
              break;
            case 'Products':
              iconName = 'cube-outline';
              break;
            case 'reports':
              iconName = 'file-chart-outline';
              break;

            case 'Profile':
              iconName = 'account';
              break;
            default:
              iconName = 'circle';
          }

          return (
            <MaterialCommunityIcons
              name={iconName}
              size={size || 24}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={SoilPartnerDashboardScreen} />
      <Tab.Screen name="Products" component={ProductsListingScreen} />
      {/* Add Profile screen here */}
      <Tab.Screen name="reports" component={ReportsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
