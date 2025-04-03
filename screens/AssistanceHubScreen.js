import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useVerification } from '../context/VerificationContext';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

const AssistanceHubScreen = () => {
  const navigation = useNavigation();
  const { verificationStatus, checkVerificationStatus, checkNameVerification } = useVerification();
  const [userLocation, setUserLocation] = useState(null);
  const route = useRoute();
  const userName = route.params?.userName;
  const userAddress = route.params?.userAddress;
  const userPassword = route.params?.userPassword;
  const isVerified = checkNameVerification(userName);

  useEffect(() => {
    console.log('AssistanceHubScreen - Received params:', {
      userName,
      userAddress,
      userPassword,
      isVerified
    });
    
    const checkStatus = async () => {
      await checkVerificationStatus();
    };
    checkStatus();
    getUserLocation();
  }, []);

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please enable location services to use this feature.');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({});
      const locationObj = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      
      // Update state and return the location object
      setUserLocation(locationObj);
      return locationObj;
    } catch (error) {
      console.error('Error getting location:', error);
      return null;
    }
  };

  const handleVerificationPress = () => {
    navigation.navigate('Verification', { 
      fromSignup: false, 
      fullName: userName,
      returnScreen: 'AssistanceHub',
      returnParams: {
        userName,
        userAddress,
        isVerifiedUser: true
      }
    });
  };

  const handleGiveAid = async () => {
    let currentLocation = userLocation;
    
    if (!currentLocation) {
      Alert.alert(
        'Getting Location',
        'Please wait while we get your location...'
      );
      currentLocation = await getUserLocation();
      if (!currentLocation) {
        Alert.alert(
          'Location Required',
          'Unable to get your location. Please ensure location services are enabled.'
        );
        return;
      }
    }

    // Only navigate if we have valid location data
    if (currentLocation && currentLocation.latitude && currentLocation.longitude) {
      navigation.navigate('GiveAid', {
        userLocation: currentLocation,
        userAddress,
        userName,
        isVerifiedUser: isVerified
      });
    } else {
      Alert.alert(
        'Location Error',
        'Unable to get a valid location. Please try again.'
      );
    }
  };

  const handleReportObstacles = async () => {
    if (!userLocation) {
      try {
        await getUserLocation();
      } catch (error) {
        console.error('Error getting location:', error);
      }
    }
    navigation.navigate('ReportObstacles', { 
      userLocation,
      userName,
      userPassword
    });
  };

  return (
    <ScrollView style={styles.scrollView}>
      <View style={styles.container}>
        <Text style={styles.title}>Assistance Hub</Text>
        
        {!isVerified && (
          <TouchableOpacity 
            style={styles.verificationBanner}
            onPress={handleVerificationPress}
          >
            <Ionicons name="warning" size={24} color="#FF9500" />
            <Text style={styles.verificationText}>Unverified User - Tap to Verify</Text>
          </TouchableOpacity>
        )}

        {isVerified && (
          <View style={styles.verifiedContainer}>
            <Text style={styles.verifiedTitle}>✓ Verified Helper</Text>
            <Text style={styles.verifiedDescription}>
              Thank you for verifying your identity. You can now access locations and help others in need.
            </Text>
          </View>
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.communityButton]}
            onPress={() => {
              console.log('Navigating to CommunityBoard with:', {
                userName,
                userPassword
              });
              navigation.navigate('CommunityBoard', {
                userName: userName,
                userPassword: userPassword
              });
            }}
          >
            <Ionicons name="people-outline" size={24} color="#000000" />
            <Text style={styles.buttonText}>Community Board</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.rideButton]}
            onPress={() => {
              console.log('Navigating to RequestRide with:', {
                userName,
                userPassword
              });
              navigation.navigate('RequestRide', {
                userName: userName,
                userPassword: userPassword
              });
            }}
          >
            <Ionicons name="car-outline" size={24} color="#000000" />
            <Text style={styles.buttonText}>Request Ride</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.firstAidButton]}
            onPress={() => navigation.navigate('RequestFirstAid')}
          >
            <Ionicons name="medkit-outline" size={24} color="#000000" />
            <Text style={styles.buttonText}>Request First Aid</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.reportButton]}
            onPress={handleReportObstacles}
          >
            <Ionicons name="warning-outline" size={24} color="#000000" />
            <Text style={styles.buttonText}>Report Obstructions</Text>
          </TouchableOpacity>
        </View>

      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  buttonContainer: {
    marginTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
    marginVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    gap: 12,
  },
  buttonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  verificationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  verificationText: {
    fontSize: 18,
    color: '#000000',
    flex: 1,
  },
  verifiedContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  verifiedTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 12,
  },
  verifiedDescription: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 24,
  },
  disabledButton: {
    backgroundColor: '#E0E0E0',
    opacity: 0.7,
  },
  communityButton: {
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  rideButton: {
    borderLeftWidth: 4,
    borderLeftColor: '#34C759',
  },
  firstAidButton: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  reportButton: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
});

export default AssistanceHubScreen;
