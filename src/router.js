import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './auth/LoginScreen';
import RegisterScreen from './auth/RegisterScreen';
const Stack = createNativeStackNavigator();
import IntroScreen from './test/IntroScreen';
import PourScreen from './test/PourScreen';
import { TimerScreen } from './test/TimerScreen';
import { SensorScreen } from './test/SensorScreen';
import ResultsScreen from './test/ResultsScreen';
import { RecommendationsScreen } from './main/RecommendationsScreen';
import FarmerDetailsScreen from './main/FarmerDetailsScreen';
import { SplashScreen } from './screens/SplashScreen';

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
          name="IntroScreen"
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
          name="ResultsScreen"
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
      </Stack.Navigator>
    </NavigationContainer>
  );
};
