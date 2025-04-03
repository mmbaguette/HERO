import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform, KeyboardAvoidingView, Keyboard, Alert } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Picker } from '@react-native-picker/picker';
import { useObstacles } from '../context/ObstaclesContext';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Icon } from '@rneui/themed';
import * as Location from 'expo-location';
import { ADMIN_CREDENTIALS } from '../config';

const MARKER_COLORS = [
  '#FF5733', // Orange-red
  '#33FF57', // Lime green
  '#3357FF', // Blue
  '#FF33F5', // Pink
  '#33FFF5', // Cyan
  '#FFD700', // Gold
  '#9933FF', // Purple
  '#FF3366', // Rose
  '#66FF33', // Bright green
  '#FF8C33', // Orange
];

// Add obstacle type icons mapping (same as GiveAidScreen)
import { OBSTACLE_ICONS } from '../context/ObstaclesContext';

function ReportObstaclesScreen({ route }) {
  const [mapRegion, setMapRegion] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [selectedObstacle, setSelectedObstacle] = useState('Flood');
  const [markerLocation, setMarkerLocation] = useState(null);
  const [description, setDescription] = useState('');
  const { reportedObstacles = [], addObstacle, removeObstacle } = useObstacles() || {};
  const bottomSheetRef = useRef(null);
  const snapPoints = useMemo(() => ['22%', '75%'], []);

  const userName = route.params?.userName;
  const userPassword = route.params?.userPassword;
  const isAdmin = userName === ADMIN_CREDENTIALS.username && userPassword === ADMIN_CREDENTIALS.password;

  // Log admin status when screen opens
  useEffect(() => {
    console.log('ReportObstaclesScreen - Initial state:', {
      userName,
      userPassword,
      isAdmin,
      numObstacles: reportedObstacles?.length || 0
    });
  }, [userName, userPassword, isAdmin, reportedObstacles]);

  // Update obstacles array to match icon types
  const obstacles = [
    { label: 'Flood', value: 'Flood' },
    { label: 'Fallen Tree', value: 'Fallen Tree' },
    { label: 'Road Blocked', value: 'Road Blocked' },
    { label: 'Power Line Down', value: 'Power Line Down' },
    { label: 'Debris', value: 'Debris' },
    { label: 'Fire', value: 'Fire' },
  ];

  const getNextColor = () => {
    // Get the next available color or cycle back to the beginning
    const currentIndex = (reportedObstacles || []).length % MARKER_COLORS.length;
    return MARKER_COLORS[currentIndex];
  };

  const handleMapPress = (event) => {
    // Check if we're tapping on an existing marker
    const { coordinate } = event.nativeEvent;
    
    // Define a small threshold for tap accuracy (in degrees)
    const threshold = 0.0001;
    
    // Check if tap is near any existing marker
    const isNearExistingMarker = (reportedObstacles || []).some(obstacle => 
      Math.abs(obstacle.coordinate.latitude - coordinate.latitude) < threshold &&
      Math.abs(obstacle.coordinate.longitude - coordinate.longitude) < threshold
    );

    // Only set new marker location if we're not tapping near an existing marker
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

    const newObstacle = {
      id: Date.now().toString(),
      type: selectedObstacle,
      coordinate: markerLocation,
      label: selectedObstacle,
      description: description.trim(),
      markerColor: OBSTACLE_ICONS[selectedObstacle]?.color || OBSTACLE_ICONS['Flood'].color,
    };

    addObstacle(newObstacle);
    setMarkerLocation(null);
    setDescription('');
    alert('Obstacle reported successfully!');
  };

  const handleMarkerLongPress = (obstacle) => {
    console.log('Marker interaction detected:', {
      obstacle,
      isAdmin,
      userName,
      userPassword
    });
    
    if (!isAdmin) {
      console.log('Interaction ignored - user is not admin');
      return;
    }
    
    Alert.alert(
      'Remove Obstacle',
      'Are you sure you want to remove this obstacle?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => console.log('Removal cancelled')
        },
        {
          text: 'OK',
          onPress: () => {
            console.log('Removing obstacle:', obstacle.id);
            removeObstacle(obstacle.id);
          }
        }
      ]
    );
  };

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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 80}
      >
        <View style={styles.container}>
          <MapView
            style={styles.mapContainer}
            region={mapRegion}
            onPress={handleMapPress}
            showsUserLocation={true}
          >
            {markerLocation && (
              <Marker
                coordinate={markerLocation}
                title="New Obstacle"
                description={selectedObstacle}
              >
                <Icon
                  reverse
                  size={12}
                  {...(OBSTACLE_ICONS[selectedObstacle] || OBSTACLE_ICONS['Flood'])}
                />
              </Marker>
            )}

            {(reportedObstacles || []).map((obstacle) => (
              <Marker
                key={obstacle.id}
                coordinate={obstacle.coordinate}
                title={obstacle.label}
                description={obstacle.description}
                tracksViewChanges={false}
                onPress={(e) => {
                  // Prevent default press behavior
                  e.stopPropagation();
                }}
                onCalloutPress={(e) => {
                  // Show removal confirmation on callout press for admin
                  if (isAdmin) {
                    handleMarkerLongPress(obstacle);
                  }
                  e.stopPropagation();
                }}
              >
                <Icon
                  reverse
                  size={12}
                  {...(OBSTACLE_ICONS[obstacle.label] || OBSTACLE_ICONS['Flood'])}
                />
              </Marker>
            ))}
          </MapView>

          <BottomSheet
            ref={bottomSheetRef}
            index={1}
            snapPoints={snapPoints}
            backgroundStyle={styles.bottomSheet}
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
              <Text style={styles.title}>Report Obstructions</Text>
              <View style={styles.pickerContainer}>
                <Text style={styles.label}>Select Obstruction Type:</Text>
                <Picker
                  selectedValue={selectedObstacle}
                  onValueChange={setSelectedObstacle}
                  style={styles.picker}
                  dropdownIconColor="black"
                >
                  {obstacles.map((obstacle) => (
                    <Picker.Item 
                      key={obstacle.value} 
                      label={obstacle.label} 
                      value={obstacle.value}
                      color="black"
                    />
                  ))}
                </Picker>
              </View>

              <View style={styles.descriptionContainer}>
                <Text style={styles.label}>Description:</Text>
                <TextInput
                  style={styles.descriptionInput}
                  placeholder="Describe the obstacle..."
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

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.reportButton}
              onPress={handleReport}
            >
              <Text style={styles.reportButtonText}>Report Obstructions</Text>
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
  mapContainer: {
    flex: 1,
  },
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  pickerContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginBottom: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  picker: {
    backgroundColor: '#FFFFFF',
    color: '#000000',
  },
  descriptionContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginBottom: 15,
    padding: 15,
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
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  label: {
    color: '#000000',
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  reportButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  reportButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#E0E0E0',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 20,
  },
});

export default ReportObstaclesScreen; 