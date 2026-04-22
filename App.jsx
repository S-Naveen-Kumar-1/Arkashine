import React from 'react';
import { LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Contexts
import { BLEProvider } from './src/contexts/BLEContext';
import { SafeAreaProvider } from './src/contexts/SafeAreaContext';

// Screens
import { SplashScreen } from './src/screens/SplashScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { ScanScreen } from './src/screens/ScanScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { DebugScreen } from './src/screens/DebugScreen';
import { CommunicationTesterScreen } from './src/screens/CommunicationTesterScreen';
import { CalibrationScreen } from './src/screens/CalibrationScreen';

LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

const Stack = createStackNavigator();

export default function App() {
  return (
    <BLEProvider>
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{ headerShown: false }}
            initialRouteName="Splash"
          >
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Scan" component={ScanScreen} />
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="Debug" component={DebugScreen} />
            <Stack.Screen
              name="CommunicationTester"
              component={CommunicationTesterScreen}
            />
            <Stack.Screen name="Calibration" component={CalibrationScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </BLEProvider>
  );
}
