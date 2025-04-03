import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Keyboard, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { Ionicons } from '@expo/vector-icons';
import { useVerification } from '../context/VerificationContext';

function SignupScreen({ navigation }) {
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [open, setOpen] = useState(false);
  const { updateVerificationStatus } = useVerification();
  const [items, setItems] = useState([
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' }
  ]);

  const validateFields = () => {
    if (!fullName.trim()) {
      Alert.alert('Error', 'Full name is required');
      return false;
    }
    if (!password.trim()) {
      Alert.alert('Error', 'Password is required');
      return false;
    }
    if (!age.trim()) {
      Alert.alert('Error', 'Age is required');
      return false;
    }
    if (!address.trim()) {
      Alert.alert('Error', 'Address is required');
      return false;
    }
    if (!email.trim()) {
      Alert.alert('Error', 'Email is required');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }
    return true;
  };

  const handleSignup = () => {
    if (!validateFields()) return;

    Alert.alert(
      'Signup successful!',
      'Would you like to get verified to become an aid provider (hero)?',
      [
        {
          text: 'Later',
          onPress: async () => {
            navigation.replace('Home', {
              userName: fullName,
              isVerifiedUser: false
            });
          },
          style: 'cancel',
        },
        {
          text: 'Verify Now',
          onPress: async () => {
            await updateVerificationStatus('pending');
            navigation.navigate('Verification', { 
              fromSignup: true, 
              fullName,
              userName: fullName,
              returnScreen: 'Home',
              returnParams: {
                userName: fullName,
                isVerifiedUser: true
              }
            });
          },
        },
      ],
      { cancelable: false }
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="Full Name *"
          placeholderTextColor="#888"
          value={fullName}
          onChangeText={setFullName}
        />
        <TextInput
          style={styles.input}
          placeholder="Password *"
          placeholderTextColor="#888"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          placeholder="Age *"
          placeholderTextColor="#888"
          value={age}
          onChangeText={setAge}
          keyboardType="numeric"
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
        />
        <Text style={styles.label}>Gender</Text>
        <DropDownPicker
          open={open}
          value={gender}
          items={items}
          setOpen={setOpen}
          setValue={setGender}
          setItems={setItems}
          style={styles.dropdown}
          dropDownContainerStyle={styles.dropdownContainer}
          textStyle={styles.dropdownText}
          placeholder="Select a gender"
          ArrowDownIconComponent={({ style }) => (
            <Ionicons name="chevron-down" size={24} color="#F5F5F5" style={style} />
          )}
          ArrowUpIconComponent={({ style }) => (
            <Ionicons name="chevron-up" size={24} color="#F5F5F5" style={style} />
          )}
          zIndex={1000}
          listMode="SCROLLVIEW"
        />
        <TextInput
          style={[styles.input, { marginTop: open ? 120 : 12 }]}
          placeholder="Email *"
          placeholderTextColor="#888"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Home Address *"
          placeholderTextColor="#888"
          value={address}
          onChangeText={setAddress}
        />
        <TouchableOpacity style={styles.button} onPress={handleSignup}>
          <Text style={styles.buttonText}>Sign Up</Text>
        </TouchableOpacity>
        <Text style={styles.requiredText}>* Required fields</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
  },
  formContainer: {
    width: '90%',
    alignSelf: 'center',
    paddingVertical: 20,
  },
  input: {
    width: '100%',
    backgroundColor: '#F5F5F5',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 12,
    color: '#000000',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 14,
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
  dropdown: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 12,
  },
  dropdownContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  dropdownText: {
    color: '#000000',
  },
  label: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  requiredText: {
    color: '#666666',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default SignupScreen; 