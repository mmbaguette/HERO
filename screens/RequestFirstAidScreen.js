import React, { useState, useRef, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform, KeyboardAvoidingView, Keyboard } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Picker } from '@react-native-picker/picker';
import { useObstacles } from '../context/ObstaclesContext';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Icon } from '@rneui/themed';
import { SERVER_URL } from '../config';
import { useFirstAidRequests, FIRST_AID_ICON } from '../context/FirstAidRequestsContext';
import * as Location from 'expo-location';

function RequestFirstAidScreen({ route }) {
  const { firstAidRequests = [], addFirstAidRequest } = useFirstAidRequests();
  const [mapRegion, setMapRegion] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);

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
      } else {
        // Fall back to London, ON if permission denied
        const defaultLocation = {
          latitude: 43.0096,
          longitude: -81.2737,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setMapRegion(defaultLocation);
      }
    };
    getCurrentLocation();
  }, []);

  const userLocation = route.params?.userLocation || mapRegion;
  const [selectedInjuryType, setSelectedInjuryType] = useState('Minor Injury');
  const [markerLocation, setMarkerLocation] = useState(null);
  const [description, setDescription] = useState('');
  const { reportedObstacles = [], addObstacle } = useObstacles() || {};
  const bottomSheetRef = useRef(null);
  const snapPoints = useMemo(() => ['22%', '75%'], []);

  const injuryTypes = [
    { label: 'Minor Injury', value: 'Minor Injury' },
    { label: 'Major Injury', value: 'Major Injury' },
    { label: 'Medical Emergency', value: 'Medical Emergency' },
    { label: 'Cardiac Emergency', value: 'Cardiac Emergency' },
    { label: 'Breathing Difficulty', value: 'Breathing Difficulty' },
    { label: 'Trauma', value: 'Trauma' },
    { label: 'Burns', value: 'Burns' },
    { label: 'Other', value: 'Other' }
  ];

  const handleMapPress = (event) => {
    const { coordinate } = event.nativeEvent;
    const threshold = 0.0001;
    
    const isNearExistingMarker = (reportedObstacles || []).some(obstacle => 
      Math.abs(obstacle.coordinate.latitude - coordinate.latitude) < threshold &&
      Math.abs(obstacle.coordinate.longitude - coordinate.longitude) < threshold
    );

    if (!isNearExistingMarker) {
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

    if (!selectedInjuryType) {
      alert('Please select an injury type');
      return;
    }

    const newRequest = {
      coordinate: markerLocation,
      description: description.trim(),
      injuryType: selectedInjuryType,
      label: 'First Aid Request'
    };

    console.log('Submitting first aid request:', newRequest);
    addFirstAidRequest(newRequest);
    
    setMarkerLocation(null);
    setDescription('');
    setSelectedInjuryType('Minor Injury');
    alert('First aid request submitted successfully!');
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
                title="First Aid Request"
                description={`${selectedInjuryType}`}
              >
                <Icon
                  reverse
                  size={12}
                  {...FIRST_AID_ICON}
                />
              </Marker>
            )}

            {firstAidRequests.map((request) => (
              <Marker
                key={request.id}
                coordinate={request.coordinate}
                title="First Aid Request"
                description={request.description}
              >
                <Icon
                  reverse
                  size={12}
                  {...FIRST_AID_ICON}
                />
              </Marker>
            ))}
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
              <Text style={styles.title}>Request First Aid</Text>
              <View style={styles.pickerContainer}>
                <Text style={styles.label}>Type of Injury:</Text>
                <Picker
                  selectedValue={selectedInjuryType}
                  onValueChange={setSelectedInjuryType}
                  style={styles.picker}
                  dropdownIconColor="black"
                >
                  {injuryTypes.map((option) => (
                    <Picker.Item 
                      key={option.value} 
                      label={option.label} 
                      value={option.value}
                      color="black"
                    />
                  ))}
                </Picker>
              </View>

              <View style={styles.descriptionContainer}>
                <Text style={styles.label}>Description:</Text>
                <TextInput
                  style={styles.descriptionInput}
                  placeholder="Describe your medical emergency..."
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
              <Text style={styles.reportButtonText}>Submit First Aid Request</Text>
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
    backgroundColor: '#FFFFFF' 
  },
  map: { 
    width: '100%', 
    height: '100%'
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
    backgroundColor: '#E53935',
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
});

export default RequestFirstAidScreen; 