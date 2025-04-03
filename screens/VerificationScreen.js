import React, { useState, useLayoutEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useVerification } from '../context/VerificationContext';

const VerificationScreen = ({ route, navigation }) => {
  const [loading, setLoading] = useState(false);
  const [verificationUrl, setVerificationUrl] = useState(null);
  const [isVerificationComplete, setIsVerificationComplete] = useState(false);
  const { updateVerificationStatus } = useVerification();
  const fromSignup = route.params?.fromSignup;
  const fullName = route.params?.fullName;

  useLayoutEffect(() => {
    if (verificationUrl) {
      navigation.setOptions({
        headerRight: () => (
          <TouchableOpacity onPress={handleClose}>
            <Text style={styles.headerButton}>Close</Text>
          </TouchableOpacity>
        ),
      });
    } else {
      navigation.setOptions({
        headerRight: null,
      });
    }
  }, [verificationUrl, navigation]);

  const initiateVerification = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('https://api.stripe.com/v1/identity/verification_sessions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer sk_test_51R2hlMEDQaSlUQWGaBjch5oXfzOWLuV7dATv4cs25fjg6n2UD33alf135LHkOkybjSEKcOTFfX791NFBfATpNi4300mfR3Qjnr',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'type=document&options[document][require_matching_selfie]=true',
      });

      const data = await response.json();
      
      if (data.url) {
        setVerificationUrl(data.url);
      } else {
        console.error('Stripe response:', data);
        Alert.alert('Error', 'Failed to get verification URL');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to initiate verification');
      console.error('Verification error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!isVerificationComplete) {
      Alert.alert(
        'Exit Verification',
        'Are you sure you want to exit? You will need to complete verification to help others.',
        [
          {
            text: 'Continue Verification',
            style: 'cancel',
          },
          {
            text: 'Exit',
            style: 'destructive',
            onPress: () => {
              setVerificationUrl(null);
              if (fromSignup) {
                navigation.replace('Home');
              } else {
                navigation.goBack();
              }
            },
          },
        ]
      );
    } else {
      setVerificationUrl(null);
      if (fromSignup) {
        navigation.replace('Home');
      } else {
        navigation.goBack();
      }
    }
  };

  const handleNavigationStateChange = async (navState) => {
    if (navState.url === 'https://verify.stripe.com/success') {
      setIsVerificationComplete(true);
      await updateVerificationStatus('verified', fullName);
      Alert.alert('Success', 'Verification completed successfully!', [
        {
          text: 'OK',
          onPress: () => {
            setVerificationUrl(null);
            handleVerificationSuccess();
          },
        },
      ]);
    }
  };

  const handleVerificationSuccess = () => {
    const returnParams = route.params?.returnParams || {};
    const returnScreen = route.params?.returnScreen || 'Home';
    const userPassword = returnParams.userPassword;

    console.log('Verification success - Navigating with params:', {
      ...returnParams,
      isVerifiedUser: true
    });

    // First navigate to Home with updated status
    navigation.navigate('Home', {
      userName: fullName,
      userAddress: returnParams.userAddress,
      userPassword: userPassword,
      isVerifiedUser: true
    });

    // Then navigate to the return screen
    navigation.navigate(returnScreen, {
      ...returnParams,
      isVerifiedUser: true
    });
  };

  if (verificationUrl) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.webViewContainer}>
          <WebView 
            source={{ uri: verificationUrl }}
            style={styles.webView}
            onNavigationStateChange={handleNavigationStateChange}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>ID Verification</Text>
        <View style={styles.section}>
          <Text style={styles.description}>
            To become a verified helper, we need to verify your identity. This helps ensure the safety and trust of our community.
          </Text>
          <View style={styles.bulletPointsContainer}>
            <Text style={styles.bulletPoints}>
              • You'll need a valid government-issued ID{'\n\n'}
              • We'll ask for a selfie to match with your ID{'\n\n'}
              • The process takes about 5 minutes{'\n\n'}
              • Your information is securely encrypted
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={initiateVerification}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Loading...' : 'Start Verification'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 24,
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  description: {
    fontSize: 18,
    color: '#000000',
    marginBottom: 24,
    lineHeight: 26,
  },
  bulletPointsContainer: {
    paddingHorizontal: 8,
  },
  bulletPoints: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  scrollContent: {
    flexGrow: 1,
  },
  infoText: {
    color: '#666666',
    fontSize: 14,
    marginBottom: 15,
    lineHeight: 20,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: 5,
  },
  successText: {
    color: '#34C759',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginBottom: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  uploadText: {
    color: '#666666',
    fontSize: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginVertical: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  webViewContainer: {
    flex: 1,
  },
  webView: {
    flex: 1,
  },
  headerButton: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 10,
  },
});

export default VerificationScreen; 