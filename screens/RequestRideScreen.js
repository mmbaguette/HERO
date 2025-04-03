import React, { useState, useRef, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform, KeyboardAvoidingView, Keyboard, Alert } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Picker } from '@react-native-picker/picker';
import { useObstacles } from '../context/ObstaclesContext';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Icon } from '@rneui/themed';
import { useRideRequests } from '../context/RideRequestsContext';
import * as Location from 'expo-location';
import { ADMIN_CREDENTIALS } from '../config';

const RIDE_ICON = { name: 'car', type: 'font-awesome-5', color: '#4A90E2' };

function RequestRideScreen({ route }) {
  const { rideRequests = [], removeRideRequest, addRideRequest } = useRideRequests();
  const [mapRegion, setMapRegion] = useState({
    latitude: 43.0096,  // Default to London, ON
    longitude: -81.2737,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [currentLocation, setCurrentLocation] = useState(null);
  
  const userName = route.params?.userName;
  const userPassword = route.params?.userPassword;
  const isAdmin = userName === ADMIN_CREDENTIALS.username && userPassword === ADMIN_CREDENTIALS.password;

  // Add debug log for admin status
  useEffect(() => {
    console.log('RequestRideScreen - Admin status:', {
      userName,
      userPassword,
      isAdmin
    });
  }, [userName, userPassword, isAdmin]);

  useEffect(() => {
    const getCurrentLocation = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let location = await Location.getCurrentPositionAsync({});
        const newRegion = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setCurrentLocation(location.coords);
        setMapRegion(newRegion);
      }
    };
    getCurrentLocation();
  }, []);

  // Remove the local WebSocket connection since we're using the context
  React.useEffect(() => {
    console.log('Current ride requests:', rideRequests);
  }, [rideRequests]);

  const userLocation = currentLocation || mapRegion;
  const [selectedPassengers, setSelectedPassengers] = useState('1');
  const [markerLocation, setMarkerLocation] = useState(null);
  const [description, setDescription] = useState('');
  const { reportedObstacles = [], addObstacle } = useObstacles() || {};
  const bottomSheetRef = useRef(null);
  const snapPoints = useMemo(() => ['22%', '75%'], []);

  const passengerOptions = [
    { label: '1 Passenger', value: '1' },
    { label: '2 Passengers', value: '2' },
    { label: '3 Passengers', value: '3' },
    { label: '4 Passengers', value: '4' },
    { label: '5 Passengers', value: '5' },
    { label: '6 Passengers', value: '6' },
    { label: '7 Passengers', value: '7' },
    { label: '8 Passengers', value: '8' }
  ];

  const handleMapPress = (event) => {
    const { coordinate } = event.nativeEvent;
    const threshold = 0.0001;
    
    // Check for nearby ride requests
    const isNearExistingRequest = rideRequests.some(request => 
      request.coordinate && 
      Math.abs(request.coordinate.latitude - coordinate.latitude) < threshold &&
      Math.abs(request.coordinate.longitude - coordinate.longitude) < threshold
    );
    
    // Check for nearby obstacles
    const isNearExistingObstacle = (reportedObstacles || []).some(obstacle => 
      obstacle.coordinate && 
      Math.abs(obstacle.coordinate.latitude - coordinate.latitude) < threshold &&
      Math.abs(obstacle.coordinate.longitude - coordinate.longitude) < threshold
    );

    if (!isNearExistingRequest && !isNearExistingObstacle) {
      setMarkerLocation(coordinate);
    }
  };

  const handleReport = () => {
    if (!markerLocation) {
      alert('Please select a location on the map');
      return;
    }

    if (!description.trim()) {
      alert('Please add a description');
      return;
    }

    const newRequest = {
      coordinate: markerLocation,
      description: description.trim(),
      passengers: selectedPassengers,
      label: 'Ride Request'
    };

    console.log('Submitting new ride request:', newRequest);
    addRideRequest(newRequest);
    setMarkerLocation(null);
    setDescription('');
    setSelectedPassengers('1');
  };

  const handleMarkerPress = (request) => {
    console.log('Marker press detected - Full request object:', request);

    if (!request || !request.id) {
      console.log('Invalid request object:', request);
      Alert.alert('Error', 'Could not identify the ride request.');
      return;
    }

    console.log('Admin check:', {
      isAdmin,
      userName,
      userPassword
    });

    if (!isAdmin) {
      console.log('Marker press ignored - user is not admin');
      return;
    }

    Alert.alert(
      'Remove Ride Request',
      'Are you sure you want to remove this ride request?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => console.log('Ride request removal cancelled')
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            console.log('Attempting to remove ride request:', request.id);
            removeRideRequest(request.id);
          }
        }
      ]
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 80}
      >
        <View style={styles.container}>
          <MapView
            style={styles.map}
            region={mapRegion}
            onPress={handleMapPress}
            showsUserLocation={true}
          >
            {markerLocation && (
              <Marker
                coordinate={markerLocation}
                title="New Ride Request"
                description={`${selectedPassengers} passengers`}
              >
                <Icon
                  reverse
                  size={12}
                  {...RIDE_ICON}
                />
              </Marker>
            )}

            {Array.isArray(rideRequests) && rideRequests.map((request) => {
              if (!request || !request.coordinate) return null;
              return (
                <Marker
                  key={request.id}
                  coordinate={request.coordinate}
                  title="Ride Request"
                  description={`${request.description} (${request.passengers} passengers)`}
                  onCalloutPress={() => handleMarkerPress(request)}
                >
                  <Icon
                    reverse
                    size={12}
                    {...RIDE_ICON}
                  />
                </Marker>
              );
            })}
          </MapView>

          <BottomSheet
            ref={bottomSheetRef}
            index={1}
            snapPoints={snapPoints}
            backgroundStyle={{
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
            }}
            handleIndicatorStyle={{
              backgroundColor: 'black',
              width: 60,
              height: 6,
              marginTop: 10,
            }}
            style={{ zIndex: 2 }}
            enablePanDownToClose={false}
          >
            <BottomSheetScrollView 
              contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.title}>Request Ride</Text>
              <View style={styles.pickerContainer}>
                <Text style={styles.label}>Number of Passengers:</Text>
                <Picker
                  selectedValue={selectedPassengers}
                  onValueChange={setSelectedPassengers}
                  style={styles.picker}
                  dropdownIconColor="#000000"
                >
                  {passengerOptions.map((option) => (
                    <Picker.Item 
                      key={option.value} 
                      label={option.label} 
                      value={option.value}
                      color="#000000"
                    />
                  ))}
                </Picker>
              </View>

              <View style={styles.descriptionContainer}>
                <Text style={styles.label}>Description:</Text>
                <TextInput
                  style={styles.descriptionInput}
                  placeholder="Describe your ride request..."
                  placeholderTextColor="#888"
                  value={description}
                  onChangeText={setDescription}
                  multiline={false}
                  blurOnSubmit={true}
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    Keyboard.dismiss();
                  }}
                  onFocus={() => {
                    bottomSheetRef.current?.snapToIndex(1);
                  }}
                />
              </View>
            </BottomSheetScrollView>
          </BottomSheet>

          <View style={styles.fixedButtonContainer}>
            <TouchableOpacity 
              style={styles.reportButton}
              onPress={handleReport}
            >
              <Text style={styles.reportButtonText}>Submit Ride Request</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  map: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 20,
  },
  pickerContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginBottom: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  descriptionContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginBottom: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  descriptionInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    color: '#000000',
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 100,
    maxHeight: 150,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  label: {
    color: '#000000',
    fontSize: 16,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  picker: {
    backgroundColor: '#FFFFFF',
    color: '#000000',
  },
  fixedButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingVertical: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    zIndex: 1,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  reportButton: {
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    width: '90%',
    alignSelf: 'center',
  },
  reportButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#E0E0E0',
  },
});

export default RequestRideScreen; 