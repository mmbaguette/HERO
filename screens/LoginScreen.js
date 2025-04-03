import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import * as Location from 'expo-location';
import { useVerification } from '../context/VerificationContext';

function LoginScreen({ navigation }) {
  const [address, setAddress] = useState('');
  const [locationPermission, setLocationPermission] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const { checkNameVerification } = useVerification();

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
    })();
  }, []);

  const handleLogin = async () => {
    if (!address || !fullName) {
      alert('Please enter your full name and address.');
      return;
    }

    try {
      console.log('Login attempt:', { 
        username: fullName, 
        password: password,
        address: address 
      });
      
      let geoLocation = await Location.geocodeAsync(address);
      if (geoLocation.length > 0) {
        const { latitude, longitude } = geoLocation[0];
        const isVerifiedUser = checkNameVerification(fullName);
        console.log('Login verification check:', { fullName, isVerifiedUser });
        
        navigation.navigate('Home', {
          userLocation: { latitude, longitude },
          userAddress: address,
          userName: fullName,
          userPassword: password,
          isVerifiedUser
        });
      } else {
        alert('Address not found. Try again.');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      alert('Error finding address.');
    }
  };

  const handleSignup = () => {
    navigation.navigate('Signup');
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentContainer}>
          <Text style={styles.logo}>HERO</Text>
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            placeholderTextColor="#888"
            value={fullName}
            onChangeText={setFullName}
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#888"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#888"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TextInput
            style={styles.input}
            placeholder="Address"
            placeholderTextColor="#888"
            value={address}
            onChangeText={setAddress}
          />
          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.buttonText}>Login</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.signupContainer} onPress={handleSignup}>
            <Text style={styles.signupText}>
              Don't have an account? <Text style={styles.signupLink}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  contentContainer: { 
    width: '90%',
    alignItems: 'center',
    alignSelf: 'center',
  },
  logo: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 40,
    textShadowColor: 'rgba(0, 122, 255, 0.3)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },
  input: {
    width: '100%',
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 12,
    color: '#000000',
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: '#4A90E2',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  signupContainer: {
    marginTop: 20,
  },
  signupText: {
    fontSize: 16,
    color: '#000000',
  },
  signupLink: {
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;
