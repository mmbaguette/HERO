import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const HomeScreen = ({ navigation, route }) => {
  const { userLocation, userAddress, userName, userPassword, isVerifiedUser } = route.params || {};

  const handleVerification = () => {
    navigation.navigate('Verification', { 
      fromSignup: false, 
      fullName: userName,
      returnScreen: 'Home',
      returnParams: {
        userName,
        userAddress,
        userPassword,
        isVerifiedUser: true
      }
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.welcomeTitle}>Welcome, {userName || 'User'}!</Text>
      
      {!isVerifiedUser && (
        <TouchableOpacity 
          style={styles.verificationBanner}
          onPress={handleVerification}
        >
          <Ionicons name="warning" size={24} color="#FF9500" />
          <Text style={styles.verificationText}>Unverified User - Tap to Verify</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity 
        style={styles.requestButton} 
        onPress={() => {
          console.log('Navigating to AssistanceHub with:', {
            userName,
            userPassword,
            userLocation,
            userAddress,
            isVerifiedUser
          });
          navigation.navigate('AssistanceHub', { 
            userLocation, 
            userAddress, 
            userName,
            userPassword,
            isVerifiedUser 
          });
        }}
      >
        <Ionicons name="help-circle-outline" size={24} color="#FFFFFF" />
        <Text style={styles.buttonText}>Request Aid</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.giveButton} 
        onPress={() => navigation.navigate('GiveAid', { 
          userLocation, 
          userAddress,
          userName,
          userPassword,
          isVerifiedUser 
        })}
      >
        <Ionicons name="heart-outline" size={24} color="#FFFFFF" />
        <Text style={styles.buttonText}>Give Aid</Text>
      </TouchableOpacity>

      <View style={styles.locationContainer}>
        <Ionicons name="location-outline" size={24} color="#666666" />
        <Text style={styles.locationText}>{userAddress || 'Canada'}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
    paddingTop: 60,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 24,
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
  requestButton: {
    backgroundColor: '#4A90E2',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  giveButton: {
    backgroundColor: '#34C759',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
    marginTop: 'auto',
    marginBottom: 40, // Added margin at bottom
    gap: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  locationText: {
    fontSize: 18,
    color: '#666666',
  },
});

export default HomeScreen;
