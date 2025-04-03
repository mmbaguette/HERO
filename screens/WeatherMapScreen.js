import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator, Dimensions, Platform, Keyboard } from 'react-native';
import MapView, { Marker, Polygon } from 'react-native-maps';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import LottieView from 'lottie-react-native';
import { Image } from 'react-native';

const ANIMATION_SIZE = 200;

// Hardcoded risk areas for Western University campus
const RISK_AREAS = {
  medwayLot: [
    { latitude: 43.00885855137204, longitude: -81.26442123259737 },
    { latitude: 43.008097378490916, longitude: -81.26728525634888 },
    { latitude: 43.00921165191838, longitude: -81.26698078357842 },
    { latitude: 43.00984011433733, longitude: -81.26460254239156 },
  ],
  tennisCourts: [
    { latitude: 43.00599930670255, longitude: -81.27039649934402 },
    { latitude: 43.00776738727463, longitude: -81.2700530105458 },
    { latitude: 43.00756794828118, longitude: -81.26833360709007 },
    { latitude: 43.005842277757345, longitude: -81.2692686068791 },
  ],
  chemistryLot: [
    { latitude: 43.01166969100803, longitude: -81.27190591390341 },
    { latitude: 43.012752508895964, longitude: -81.27401102152365 },
    { latitude: 43.013409617894794, longitude: -81.27267516027509 },
    { latitude: 43.01243466493531, longitude: -81.27131103004265 },
  ],
};

function WeatherMapScreen() {
  const navigation = useNavigation();
  const [location, setLocation] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [elevation, setElevation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rainfallValue, setRainfallValue] = useState('0');
  const [inputError, setInputError] = useState('');
  const [animation, setAnimation] = useState(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let location = await Location.getCurrentPositionAsync({});
        setLocation(location);
        handleLocationSelect({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    })();
  }, []);

  const handleLocationSelect = async (coords) => {
    setSelectedLocation(coords);
    try {
      const response = await fetch(
        `https://api.open-elevation.com/api/v1/lookup?locations=${coords.latitude.toFixed(5)},${coords.longitude.toFixed(5)}`
      );
      const data = await response.json();
      if (data.results && data.results[0]) {
        setElevation(data.results[0].elevation);
      }
    } catch (error) {
      console.error('Error fetching elevation:', error);
      setElevation(null);
    }
  };

  const updateAnimation = (rainfallValue) => {
    const value = parseFloat(rainfallValue);
    let animationFile;

    if (value === 0) {
      animationFile = require('../assets/animations/sunny.json');
    } else if (value >= 1 && value <= 29) {
      animationFile = require('../assets/animations/light-rain.json');
    } else if (value >= 30 && value <= 49) {
      animationFile = require('../assets/animations/moderate-rain.json');
    } else if (value >= 50) {
      animationFile = require('../assets/animations/heavy-rain.json');
    } else {
      animationFile = require('../assets/animations/sunny.json');
    }

    setAnimation(animationFile);
  };

  const handleRainfallSubmit = () => {
    
    if (!rainfallValue.trim()) {
      return;
    }

    const value = parseFloat(rainfallValue);
    if (isNaN(value)) {
      setInputError('Please enter a valid number');
      return;
    }

    setInputError('');
    updateAnimation(value);
    Keyboard.dismiss();
  };

  const getRiskAreaColor = () => {
    const value = parseFloat(rainfallValue);
    if (value >= 50) return 'rgba(255, 0, 0, 0.3)';
    if (value >= 30) return 'rgba(255, 255, 0, 0.3)';
    return 'transparent';
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 43.00905,
          longitude: -81.27371,
          latitudeDelta: 0.0122,
          longitudeDelta: 0.0121,
        }}
        onPress={(e) => handleLocationSelect(e.nativeEvent.coordinate)}
        showsUserLocation={true}
      >
        {selectedLocation && (
          <Marker
            coordinate={selectedLocation}
            title={`${selectedLocation.latitude.toFixed(5)}, ${selectedLocation.longitude.toFixed(5)}`}
          />
        )}
        {parseFloat(rainfallValue) >= 30 && Object.values(RISK_AREAS).map((area, index) => (
          <Polygon
            key={index}
            coordinates={area}
            fillColor={getRiskAreaColor()}
            strokeColor={parseFloat(rainfallValue) >= 50 ? '#FF0000' : '#FFFF00'}
            strokeWidth={2}
          />
        ))}
      </MapView>

      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Image
          source={require('../assets/images/weathermapIcon.png')}
          style={styles.weatherMapIcon}
          resizeMode="contain"
        />
      </TouchableOpacity>

      <View style={styles.inputsContainer}>
        <View style={styles.inputWrapper}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <TextInput
              style={[styles.input, {flex: 1}]}
              value={rainfallValue}
              onChangeText={(text) => {
                // Strip out non-numeric characters before setting value
                const numericValue = text.replace(/[^0-9.]/g, '');
                setRainfallValue(numericValue);
              }}
              keyboardType="numeric"
              //placeholder="Enter rainfall"
              placeholderTextColor="#666"
              onSubmitEditing={handleRainfallSubmit}
              returnKeyType="done"
              onEndEditing={handleRainfallSubmit}
            />
            <Text style={{marginLeft: 8, color: '#666'}}>mm/day</Text>
          </View>
          {inputError ? <Text style={styles.errorText}>{inputError}</Text> : null}
        </View>
      </View>

      <View style={styles.overlay}>
        {animation && (
          <View style={styles.weatherContainer}>
            <LottieView
              source={animation}
              autoPlay
              loop
              speed={1.8}
              style={styles.animation}
            />
          </View>
        )}
      </View>

      {elevation !== null && (
        <View style={styles.elevationContainer}>
          <Text style={styles.elevationText}>
            Elevation: {elevation.toFixed(1)} meters
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 20,
    paddingTop: 130,
  },
  weatherContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    padding: 20,
    paddingBottom: 50,
    borderRadius: 10,
    marginBottom: 10,
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: Platform.OS === 'ios' ? 120 : 100,
    right: 20,
  },
  animation: {
    width: 150,
    height: 120,
  },
  elevationContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  elevationText: {
    fontSize: 16,
    color: '#000',
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    backgroundColor: '#1E1E1E',
    padding: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  weatherMapIcon: {
    width: 55,
    height: 55,
  },
  inputsContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 12,
    width: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  inputWrapper: {
    //marginBottom: 5,
  },
  inputLabel: {
    color: '#000000',
    fontSize: 14,
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#FFFFFF',
    color: '#000000',
    fontSize: 16,
    paddingRight: 10,
  },
  errorText: {
    color: '#FF0000',
    fontSize: 12,
    marginTop: 5,
    paddingTop: 50
  },
});

export default WeatherMapScreen; 