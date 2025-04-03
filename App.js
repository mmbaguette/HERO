import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SplashScreen from './screens/SplashScreen';
import LoginScreen from './screens/LoginScreen';  // Adjust if necessary
import HomeScreen from './screens/HomeScreen';    // Adjust if necessary
import AssistanceHubScreen from './screens/AssistanceHubScreen';  // Adjust if necessary
import GiveAidScreen from './screens/GiveAidScreen';  // Adjust if necessary
import CommunityBoardScreen from './screens/CommunityBoardScreen';  // Adjust if necessary
import ReportObstaclesScreen from './screens/ReportObstaclesScreen';
import SignupScreen from './screens/SignupScreen';
import VerificationScreen from './screens/VerificationScreen';
import RequestRideScreen from './screens/RequestRideScreen';
import RequestFirstAidScreen from './screens/RequestFirstAidScreen';
import WeatherMapScreen from './screens/WeatherMapScreen';
import { ObstaclesProvider } from './context/ObstaclesContext';
import { VerificationProvider } from './context/VerificationContext';
import { RideRequestsProvider } from './context/RideRequestsContext';
import { FirstAidRequestsProvider } from './context/FirstAidRequestsContext';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <VerificationProvider>
        <ObstaclesProvider>
          <RideRequestsProvider>
            <FirstAidRequestsProvider>
              <Stack.Navigator 
                initialRouteName="Splash"
                screenOptions={{
                  headerStyle: {
                    backgroundColor: '#FFFFFF',
                  },
                  headerTintColor: '#007AFF',
                  headerTitleStyle: {
                    fontWeight: 'bold',
                    color: '#000000'
                  },
                  headerBackTitle: 'Back',
                  headerBackTitleVisible: true,
                  gestureEnabled: true,
                  animation: 'slide_from_right'
                }}
              >
                <Stack.Screen 
                  name="Splash"
                  component={SplashScreen}
                  options={{ 
                    headerShown: false,
                    animation: 'none'
                  }}
                />
                <Stack.Screen 
                  name="Login" 
                  component={LoginScreen} 
                  options={{ 
                    headerShown: false,
                    animation: 'none'
                  }}
                />
                <Stack.Screen 
                  name="Home" 
                  component={HomeScreen}
                  options={{ 
                    title: 'Home',
                    headerLeft: null,
                    gestureEnabled: false
                  }}
                />
                <Stack.Screen 
                  name="GiveAid" 
                  component={GiveAidScreen}
                  options={{ title: 'Give Aid' }}
                />
                <Stack.Screen 
                  name="AssistanceHub" 
                  component={AssistanceHubScreen}
                  options={{ title: 'Assistance Hub' }}
                />
                <Stack.Screen 
                  name="ReportObstacles" 
                  component={ReportObstaclesScreen}
                  options={{ title: 'Report Obstacles' }}
                />
                <Stack.Screen 
                  name="CommunityBoard" 
                  component={CommunityBoardScreen} 
                  options={{ title: 'Community Board' }}
                />
                <Stack.Screen 
                  name="RequestRide" 
                  component={RequestRideScreen} 
                  options={{ title: 'Request Ride' }}
                />
                <Stack.Screen 
                  name="RequestFirstAid" 
                  component={RequestFirstAidScreen} 
                  options={{ title: 'Request First Aid' }}
                />
                <Stack.Screen 
                  name="Signup" 
                  component={SignupScreen} 
                  options={{ title: 'Sign Up' }}
                />
                <Stack.Screen 
                  name="Verification" 
                  component={VerificationScreen}
                  options={{
                    title: 'Identity Verification',
                    headerStyle: {
                      backgroundColor: '#FFFFFF',
                    },
                    headerTintColor: '#007AFF',
                    headerTitleStyle: {
                      fontWeight: 'bold',
                      color: '#000000'
                    }
                  }}
                />
                <Stack.Screen 
                  name="WeatherMap" 
                  component={WeatherMapScreen}
                  options={{
                    headerShown: false
                  }}
                />
              </Stack.Navigator>
            </FirstAidRequestsProvider>
          </RideRequestsProvider>
        </ObstaclesProvider>
      </VerificationProvider>
    </NavigationContainer>
  );
}

