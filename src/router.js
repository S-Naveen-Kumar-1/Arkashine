import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './auth/LoginScreen';
import RegisterScreen from './auth/RegisterScreen';
const Stack = createNativeStackNavigator();
import IntroScreen from './soiltest/IntroScreen';
import PourScreen from './soiltest/PourScreen';
import { TimerScreen } from './soiltest/TimerScreen';
import { SensorScreen } from './soiltest/SensorScreen';
import ResultsScreen from './soiltest/ResultsScreen';
import { RecommendationsScreen } from './main/RecommendationsScreen';
import FarmerDetailsScreen from './main/FarmerDetailsScreen';
import { SplashScreen } from './screens/SplashScreen';
import { DashboardScreen } from './screens/dashboard/DashboardScreen';
import ProfileScreen from './screens/profile/ProfileScreen';
import { ProductsListingScreen } from './screens/Products/ProductListing';
import AppTabS from './components/AppTabs';
import CalibrationGateScreen from './phtest/CalibrationGateScreen';
import CalibrationMenuScreen from './phtest/CalibrationMenuScreen';
import PHCalibrationScreen from './phtest/PHCalibrationScreen';
import ECCalibrationScreen from './phtest/ECCalibrationScreen';
import CalibrationSummaryScreen from './phtest/CalibrationSummaryScreen';
import MixerScreen from './phtest/MixerScreen';
import Phecresultscreen from './phtest/Phecresultscreen';
import BLEScanScreen from './screens/ble/DeviceScanScreen';
import ReportsScreen from './reports/ReportsScreen';
import DeviceReadingsScreen from './reports/DeviceReadingsScreen';
import ReadingDetailScreen from './reports/ReadingDetailScreen';
import SoilPartnerTabs from './components/SoilPartnerTabs';
import AddFarmerScreen from './soilpartner/AddFarmerScreen';
import FarmersListScreen from './soilpartner/FarmersListScreen';
import FarmerDetailScreen from './soilpartner/FarmerDetailScreen';
import PaymentHistoryScreen from './soilpartner/ PaymentHistoryScreen';
import { MapScreen } from './SoilMaps/SoilMap';
export const AppStack = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="SplashScreen" component={SplashScreen}>
        <Stack.Screen
          name="SplashScreen"
          component={SplashScreen}
          options={{
            headerShown: false,
            // gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="LoginScreen"
          component={LoginScreen}
          options={{
            headerShown: false,
            // gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="RegisterScreen"
          component={RegisterScreen}
          options={{
            headerShown: false,
            // gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="SoilTestIntroScreen"
          component={IntroScreen}
          options={{
            headerShown: false,
            // gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="PourScreen"
          component={PourScreen}
          options={{
            headerShown: false,
            // gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="TimerScreen"
          component={TimerScreen}
          options={{
            headerShown: false,
            // gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="SensorScreen"
          component={SensorScreen}
          options={{
            headerShown: false,
            // gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="SoilResultsScreen"
          component={ResultsScreen}
          options={{
            headerShown: false,
            // gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="RecommendationsScreen"
          component={RecommendationsScreen}
          options={{
            headerShown: false,
            // gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="FarmerDetailsScreen"
          component={FarmerDetailsScreen}
          options={{
            headerShown: false,
            // gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="DashboardScreen"
          component={DashboardScreen}
          options={{
            headerShown: false,
            // gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="ProfileScreen"
          component={ProfileScreen}
          options={{
            headerShown: false,
            // gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="ProductsListingScreen"
          component={ProductsListingScreen}
          options={{
            headerShown: false,
            // gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="AppTabs"
          component={AppTabS}
          options={{
            headerShown: false,
            // gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="CalibrationGateScreen"
          component={CalibrationGateScreen}
          options={{
            headerShown: false,
            // gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="CalibrationMenuScreen"
          component={CalibrationMenuScreen}
          options={{
            headerShown: false,
            // gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="PHCalibrationScreen"
          component={PHCalibrationScreen}
          options={{
            headerShown: false,
            // gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="ECCalibrationScreen"
          component={ECCalibrationScreen}
          options={{
            headerShown: false,
            // gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="CalibrationSummaryScreen"
          component={CalibrationSummaryScreen}
          options={{
            headerShown: false,
            // gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="MixerScreen"
          component={MixerScreen}
          options={{
            headerShown: false,
            // gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="PHECResultScreen"
          component={Phecresultscreen}
          options={{
            headerShown: false,
            // gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="BLEScanScreen"
          component={BLEScanScreen}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="ReportsScreen"
          component={ReportsScreen}
          options={{
            headerShown: false,
            // gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="DeviceReadingsScreen"
          component={DeviceReadingsScreen}
          options={{
            headerShown: false,
            // gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="ReadingDetailScreen"
          component={ReadingDetailScreen}
          options={{
            headerShown: false,
            // gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="SoilPartnerTabs"
          component={SoilPartnerTabs}
          options={{
            headerShown: false,
            // gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="FarmersListScreen"
          component={FarmersListScreen}
          options={{
            headerShown: false,
            // gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="AddFarmerScreen"
          component={AddFarmerScreen}
          options={{
            headerShown: false,
            // gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="FarmerDetailScreen"
          component={FarmerDetailScreen}
          options={{
            headerShown: false,
            // gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="PaymentHistoryScreen"
          component={PaymentHistoryScreen}
          options={{
            headerShown: false,
            // gestureEnabled: false,
          }}
        />
           <Stack.Screen
          name="SoilMaps"
          component={MapScreen}
          options={{
            headerShown: false,
            // gestureEnabled: false,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
