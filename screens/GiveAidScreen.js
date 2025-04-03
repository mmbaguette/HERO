import React, { useEffect, useState, useRef, useMemo } from 'react';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Image, Linking, Alert, Animated } from 'react-native';
import * as Location from 'expo-location';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useObstacles, OBSTACLE_ICONS } from '../context/ObstaclesContext';
import { WebView } from 'react-native-webview';
import peopleData from '../assets/example_people.json';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { useVerification } from '../context/VerificationContext';
import { decode } from '@googlemaps/polyline-codec';
import { Icon } from '@rneui/themed';
import { useRideRequests, RIDE_ICON } from '../context/RideRequestsContext';
import { useFirstAidRequests, FIRST_AID_ICON } from '../context/FirstAidRequestsContext';
import { GOOGLE_MAPS_CONFIG } from '../config';

const THRESHOLD_METERS = 40; //max distance from obstacle to route line 
// Route colors for different types of routes
const ROUTE_COLORS = {
  RECOMMENDED: '#2196F3',    // Blue for recommended route
  ALTERNATIVE: '#FFC107',    // Yellow for alternative safe routes
  UNSAFE_ROUTE: '#FF4444',   // Red for routes near obstacles
};

function GiveAidScreen({ route }) {
  const { userLocation, userAddress, userName, userPassword } = route.params || {};
  const { checkNameVerification } = useVerification();
  const isVerified = checkNameVerification(userName);
  
  // Add debug log for params
  useEffect(() => {
    console.log('GiveAidScreen - Received params:', {
      userName,
      userPassword,
      userAddress,
      isVerified
    });
  }, [userName, userPassword, userAddress, isVerified]);

  const defaultLocation = {
    latitude: 43.0096,  // Default to London, ON
    longitude: -81.2737,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  };

  const [mapRegion, setMapRegion] = useState(userLocation || defaultLocation);
  const [currentLocation, setCurrentLocation] = useState(null);
  const bottomSheetRef = useRef(null);
  const snapPoints = useMemo(() => ['22%', '75%'], []);
  const { reportedObstacles = [] } = useObstacles();
  const { rideRequests = [] } = useRideRequests();
  const { firstAidRequests = [] } = useFirstAidRequests();
  const mapRef = useRef(null);
  const [selectedObstacle, setSelectedObstacle] = useState(null);
  const [isHelping, setIsHelping] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [routeSteps, setRouteSteps] = useState([]);
  const [showDirections, setShowDirections] = useState(false);
  const [routeDuration, setRouteDuration] = useState(null);
  const [routeDistance, setRouteDistance] = useState(null);
  const navigation = useNavigation();
  const [isLoadingDirections, setIsLoadingDirections] = useState(false);
  const [showRouteInfo, setShowRouteInfo] = useState(false);
  const [routeSummaries, setRouteSummaries] = useState({});
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [lastFetchedId, setLastFetchedId] = useState(null);
  const [isWeatherMapPressed, setIsWeatherMapPressed] = useState(false);
  const isFocused = useIsFocused();
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(null);

  const people = peopleData;

  useEffect(() => {
    const getCurrentLocation = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let location = await Location.getCurrentPositionAsync({});
        setCurrentLocation(location.coords);
        if (!userLocation) {
          setMapRegion({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
          });
        }
      } else {
        Alert.alert(
          'Location Permission Required',
          'Please enable location services to use all features of this app.',
          [{ text: 'OK' }]
        );
      }
    };
    getCurrentLocation();
  }, [userLocation]);

  useEffect(() => {
    if (routeDuration && routeDistance && selectedObstacle?.id !== lastFetchedId) {
      setLastFetchedId(selectedObstacle?.id);
      setShowRouteInfo(true);
      fadeAnim.setValue(0);  // Reset the animation
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        })
      ]).start(() => {
        setShowRouteInfo(false);
      });
    }
  }, [routeDuration, routeDistance, selectedObstacle]);

  useEffect(() => {
    if (isFocused) {
      setIsWeatherMapPressed(false);
    }
  }, [isFocused]);

  const handleMarkerPress = (item) => {
    setSelectedObstacle(item);
    const savedRoute = routeSummaries[item.id];
    
    if (savedRoute) {
      setRouteDuration(savedRoute.duration);
      setRouteDistance(savedRoute.distance);
      setRouteCoordinates(savedRoute.coordinates);
      setIsHelping(true);
    } else {
      setIsHelping(false);
      setRouteCoordinates([]);
      setRouteDuration(null);
      setRouteDistance(null);
    }
    
    setRouteSteps([]);
    
    // Adjust the region to show the marker above the bottom sheet
    mapRef.current?.animateToRegion({
      latitude: item.coordinate.latitude - 0.01, // Offset to show marker above bottom sheet
      longitude: item.coordinate.longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    }, 1000);

    // Ensure bottom sheet is at the right height
    bottomSheetRef.current?.snapToIndex(1);
  };

  const handlePersonPress = (person) => {
    const personObstacle = {
      id: person.id,
      coordinate: person.location,
      label: person.name,
      description: person.description
    };
    handleMarkerPress(personObstacle);
  };

  const handleObstaclePress = (obstacle) => {
    handleMarkerPress(obstacle);
  };

  const calculateDistance = (coord1, coord2) => {
    if (!coord1 || !coord2 || !coord1.latitude || !coord1.longitude || !coord2.latitude || !coord2.longitude) {
      return Infinity; // Return Infinity for invalid coordinates
    }

    const R = 6371; // Earth's radius in km
    const dLat = (coord2.latitude - coord1.latitude) * Math.PI / 180;
    const dLon = (coord2.longitude - coord1.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(coord1.latitude * Math.PI / 180) * Math.cos(coord2.latitude * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const sortedPeople = useMemo(() => {
    if (!currentLocation) return people;
    return [...people]
      .filter(person => {
        const distance = calculateDistance(currentLocation, person.location);
        return distance !== Infinity && distance <= 50; // Only include people within 50km with valid distances
      })
      .sort((a, b) => {
        const distA = calculateDistance(currentLocation, a.location);
        const distB = calculateDistance(currentLocation, b.location);
        return distA - distB;
      });
  }, [currentLocation, people]);

  const sortedObstacles = useMemo(() => {
    if (!currentLocation) return reportedObstacles;
    return [...reportedObstacles]
      .filter(obstacle => {
        const distance = calculateDistance(currentLocation, obstacle.coordinate);
        return distance !== Infinity && distance <= 50; // Only include obstacles within 50km with valid distances
      })
      .sort((a, b) => {
        const distA = calculateDistance(currentLocation, a.coordinate);
        const distB = calculateDistance(currentLocation, b.coordinate);
        return distA - distB;
      });
  }, [currentLocation, reportedObstacles]);

  const getDirections = async (startLoc, destinationLoc) => {
    setIsLoadingDirections(true);
    setLastFetchedId(null);
    try {
      const url = `https://routes.googleapis.com/directions/v2:computeRoutes?key=${GOOGLE_MAPS_CONFIG.API_KEY}`;
      
      const headers = {
        'Content-Type': 'application/json',
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.steps.navigationInstruction,routes.legs.steps.distanceMeters,routes.routeLabels'
      };

      const body = {
        origin: {
          location: {
            latLng: {
              latitude: startLoc.latitude,
              longitude: startLoc.longitude
            }
          }
        },
        destination: {
          location: {
            latLng: {
              latitude: destinationLoc.latitude,
              longitude: destinationLoc.longitude
            }
          }
        },
        travelMode: "DRIVE",
        computeAlternativeRoutes: true,
        routeModifiers: {
          avoidTolls: false,
          avoidHighways: false,
          avoidFerries: false
        },
        languageCode: "en-US",
        units: "METRIC"
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
      });

      const responseBody = await response.json();
      console.log('API Response:', responseBody);
      
      if (responseBody.routes && responseBody.routes.length > 0) {
        // Clear existing route coordinates
        setRouteCoordinates([]);
        
        // Process routes first
        const processedRoutes = responseBody.routes.map((route, index) => {
          const points = decode(route.polyline.encodedPolyline);
          const coordinates = points.map(([lat, lng]) => ({
            latitude: lat,
            longitude: lng
          }));

          const duration = Math.round(parseInt(route.duration.replace('s', '')) / 60);
          const distance = (route.distanceMeters / 1000).toFixed(1);
          const isObstacleFree = checkRouteForObstacles(coordinates, index + 1, { duration, distance });

          return {
            coordinates,
            duration,
            distance,
            isObstacleFree,
            routeNumber: index + 1
          };
        });

        // Separate safe and unsafe routes
        const safeRoutes = processedRoutes.filter(route => route.isObstacleFree);
        const unsafeRoutes = processedRoutes.filter(route => !route.isObstacleFree);

        // Sort safe routes by duration
        safeRoutes.sort((a, b) => a.duration - b.duration);

        // Combine routes back with proper colors
        const routesWithColors = [
          // Add safe routes first (recommended in blue, others in yellow)
          ...safeRoutes.map((route, index) => ({
            ...route,
            color: index === 0 ? ROUTE_COLORS.RECOMMENDED : ROUTE_COLORS.ALTERNATIVE
          })),
          // Add unsafe routes in red
          ...unsafeRoutes.map(route => ({
            ...route,
            color: ROUTE_COLORS.UNSAFE_ROUTE
          }))
        ];

        setRouteCoordinates(routesWithColors);
        // Automatically select the recommended route (index 0)
        setSelectedRouteIndex(0);

        // Use the best safe route's details for display, or first route if none are safe
        const bestRoute = safeRoutes.length > 0 ? safeRoutes[0] : routesWithColors[0];
        setRouteDuration(bestRoute.duration);
        setRouteDistance(bestRoute.distance);
        
        if (route.legs && route.legs[0] && route.legs[0].steps) {
          const formattedSteps = route.legs[0].steps.map(step => ({
            instructions: step.navigationInstruction?.instructions || '',
            distance: {
              text: `${(step.distanceMeters / 1000).toFixed(1)} km`
            }
          }));
          setRouteSteps(formattedSteps);
        }

        // Fit map to show all routes
        const allCoordinates = responseBody.routes.flatMap(route => {
          const points = decode(route.polyline.encodedPolyline);
          return points.map(([lat, lng]) => ({
            latitude: lat,
            longitude: lng
          }));
        });

        mapRef.current?.fitToCoordinates(allCoordinates, {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true
        });

        setIsHelping(true);
      } else {
        Alert.alert('Error', 'No route found between the locations.');
        setIsHelping(false);
      }
    } catch (error) {
      console.error('Direction Error:', error);
      Alert.alert('Error', 'Could not get directions at this time. Please try again later.');
      setIsHelping(false);
    } finally {
      setIsLoadingDirections(false);
    }
  };

  // Function to check if a route comes within 20m of any reported obstacle
  const checkRouteForObstacles = (routeCoordinates, routeNumber, route) => {
    // Helper function to calculate distance between point and line segment
    const pointToLineDistance = (point, lineStart, lineEnd) => {
      const lat2meters = 111319.9; // meters per degree of latitude
      const lon2meters = Math.cos(point.latitude * Math.PI / 180) * 111319.9; // meters per degree of longitude

      // Convert to meters
      const x = (point.longitude - lineStart.longitude) * lon2meters;
      const y = (point.latitude - lineStart.latitude) * lat2meters;
      const dx = (lineEnd.longitude - lineStart.longitude) * lon2meters;
      const dy = (lineEnd.latitude - lineStart.latitude) * lat2meters;

      if (dx === 0 && dy === 0) {
        // Line segment is actually a point
        return Math.sqrt(x * x + y * y);
      }

      // Calculate projection
      const t = (x * dx + y * dy) / (dx * dx + dy * dy);

      if (t < 0) {
        // Point is nearest to the start of the line segment
        return Math.sqrt(x * x + y * y);
      } else if (t > 1) {
        // Point is nearest to the end of the line segment
        const ex = (point.longitude - lineEnd.longitude) * lon2meters;
        const ey = (point.latitude - lineEnd.latitude) * lat2meters;
        return Math.sqrt(ex * ex + ey * ey);
      }

      // Nearest point lies on the line segment
      const projX = x - t * dx;
      const projY = y - t * dy;
      return Math.sqrt(projX * projX + projY * projY);
    };

    // Check each route segment
    for (let i = 0; i < routeCoordinates.length - 1; i++) {
      const start = routeCoordinates[i];
      const end = routeCoordinates[i + 1];
      
      for (const obstacle of reportedObstacles) {
        // Skip ride requests when checking for obstacles
        if (obstacle.type === 'ride_request') continue;

        // Calculate the distance from obstacle to route segment
        const distanceToPath = pointToLineDistance(obstacle.coordinate, start, end);

        // If the distance is less than threshold, route is unsafe
        if (distanceToPath < THRESHOLD_METERS) {
          console.log(`Route ${routeNumber} marked as unsafe due to obstacle: ${obstacle.label}, Duration: ${route.duration} min, Distance: ${route.distance} km`);
          // Debug logging
          console.log({
            obstacleType: obstacle.label,
            distanceToPath,
            threshold: THRESHOLD_METERS
          });
          return false; // Route is not obstacle-free
        }
      }
    }
    
    console.log(`Route marked as safe - no obstacles detected, Duration: ${route.duration} min, Distance: ${route.distance} km`);
    return true; // Route is obstacle-free
  };

  const handleStartHelp = () => {
    if (!isVerified) {
      Alert.alert(
        'Verification Required',
        'You need to be a verified helper to assist others. Would you like to get verified now?',
        [
          {
            text: 'Not Now',
            style: 'cancel'
          },
          {
            text: 'Verify Now',
            onPress: handleVerification
          }
        ]
      );
      return;
    }

    if (!currentLocation || !currentLocation.latitude || !currentLocation.longitude) {
      Alert.alert(
        'Location Required',
        'Please wait while we get your current location...'
      );
      return;
    }

    if (selectedObstacle && selectedObstacle.coordinate && selectedObstacle.coordinate.latitude && selectedObstacle.coordinate.longitude) {
      setIsHelping(true);
      getDirections(currentLocation, selectedObstacle.coordinate);
      bottomSheetRef.current?.snapToIndex(0);
    } else {
      Alert.alert(
        'Invalid Location',
        'Unable to get directions. Please try selecting the obstacle again.'
      );
    }
  };

  const handleVerification = () => {
    navigation.navigate('Verification', { 
      fromSignup: false,
      fullName: userName,
      returnScreen: 'GiveAid',
      returnParams: {
        userName,
        userAddress,
        userPassword,
        isVerifiedUser: true
      }
    });
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        {showRouteInfo && routeDuration && routeDistance && (
          <Animated.View style={[styles.routeInfoPopup, { opacity: fadeAnim }]}>
            <View style={styles.routeInfoContent}>
              <View style={styles.routeInfoItem}>
                <Text style={styles.routeInfoIcon}>🕒</Text>
                <Text style={styles.routeInfoValue}>{routeDuration} min</Text>
              </View>
              <View style={styles.routeInfoDivider} />
              <View style={styles.routeInfoItem}>
                <Text style={styles.routeInfoIcon}>📍</Text>
                <Text style={styles.routeInfoValue}>{routeDistance} km</Text>
              </View>
            </View>
          </Animated.View>
        )}

        {showDirections ? (
          <>
            <WebView
              style={styles.map}
              source={{ uri: getDirectionsUrl() }}
            />
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => {
                setShowDirections(false);
                setIsHelping(false);
              }}
            >
              <Text style={styles.backButtonText}>← Back to Map</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <MapView
              ref={mapRef}
              style={styles.map}
              region={currentLocation ? {
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                latitudeDelta: 0.1,
                longitudeDelta: 0.1,
              } : mapRegion}
              showsUserLocation={true}
            >
              {userLocation && userLocation.latitude && userLocation.longitude && (
                <Marker
                  coordinate={userLocation}
                  title="User's Address"
                  description={userAddress}
                >
                  <Image
                    source={require('../assets/images/houseIcon.png')}
                    style={{ width: 35, height: 35 }}
                    resizeMode="contain"
                  />
                </Marker>
              )}

              {currentLocation ? sortedPeople.map((person) => (
                <Marker
                  key={person.id}
                  coordinate={person.location}
                  title={person.name}
                  description={person.description}
                  pinColor={selectedObstacle?.id === person.id ? '#FF4444' : person.markerColor}
                  onPress={() => handlePersonPress(person)}
                />
              )) : null}

              {currentLocation ? sortedObstacles.map((obstacle) => {
                // Only render if it's not a ride request
                if (obstacle.type === 'ride_request') return null;
                
                const iconConfig = OBSTACLE_ICONS[obstacle.label] || OBSTACLE_ICONS['Flood'];
                return (
                  <Marker
                    key={obstacle.id}
                    coordinate={obstacle.coordinate}
                    title={obstacle.label}
                    description={obstacle.description}
                    pinColor={selectedObstacle?.id === obstacle.id ? '#FF4444' : obstacle.markerColor}
                    onPress={() => handleObstaclePress(obstacle)}
                  >
                    <Icon
                      reverse
                      size={12}
                      name={iconConfig.name}
                      type={iconConfig.type}
                      color={iconConfig.color}
                    />
                  </Marker>
                );
              }) : null}

              {rideRequests.map((request) => (
                <Marker
                  key={request.id}
                  coordinate={request.coordinate}
                  title="Ride Request"
                  description={request.description}
                  onPress={() => handleObstaclePress(request)}
                >
                  <Icon
                    reverse
                    size={12}
                    {...RIDE_ICON}
                  />
                </Marker>
              ))}

              {firstAidRequests.map((request) => (
                <Marker
                  key={request.id}
                  coordinate={request.coordinate}
                  title="First Aid Request"
                  description={request.description}
                  onPress={() => handleObstaclePress(request)}
                >
                  <Icon
                    reverse
                    size={12}
                    {...FIRST_AID_ICON}
                  />
                </Marker>
              ))}

              {isHelping && routeCoordinates.length > 0 && (
                <>
                  {/* First draw all unselected routes */}
                  {routeCoordinates
                    .filter((route, index) => index !== selectedRouteIndex)
                    .map((route, index) => {
                      const actualIndex = routeCoordinates.findIndex(r => r === route);
                      return (
                        <Polyline
                          key={`route-${actualIndex}`}
                          coordinates={route.coordinates}
                          strokeWidth={route.color === ROUTE_COLORS.RECOMMENDED ? 6 : 4}
                          strokeColor={`${route.color}4D`}
                          lineDashPattern={[1]}
                        />
                      );
                    })}

                  {/* Then draw the recommended route if it's not selected */}
                  {selectedRouteIndex !== 0 && routeCoordinates
                    .filter(route => route.color === ROUTE_COLORS.RECOMMENDED)
                    .map((route, index) => {
                      const actualIndex = routeCoordinates.findIndex(r => r === route);
                      return (
                        <Polyline
                          key={`recommended-${actualIndex}`}
                          coordinates={route.coordinates}
                          strokeWidth={6}
                          strokeColor={`${route.color}${selectedRouteIndex === null ? 'FF' : '4D'}`}
                          lineDashPattern={[1]}
                        />
                      );
                    })}

                  {/* Finally draw the selected route on top */}
                  {selectedRouteIndex !== null && (
                    <Polyline
                      key={`selected-${selectedRouteIndex}`}
                      coordinates={routeCoordinates[selectedRouteIndex].coordinates}
                      strokeWidth={routeCoordinates[selectedRouteIndex].color === ROUTE_COLORS.RECOMMENDED ? 6 : 4}
                      strokeColor={`${routeCoordinates[selectedRouteIndex].color}FF`}
                      lineDashPattern={[1]}
                    />
                  )}
                </>
              )}
            </MapView>

            <TouchableOpacity 
              style={[
                styles.weatherMapButton,
                isWeatherMapPressed && { backgroundColor: '#FF4444' }
              ]}
              onPress={() => {
                setIsWeatherMapPressed(true);
                navigation.navigate('WeatherMap');
              }}
            >
              <Image
                source={require('../assets/images/weathermapIcon.png')}
                style={styles.weatherMapIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>

            {isLoadingDirections && (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading Directions...</Text>
              </View>
            )}

            <BottomSheet
              ref={bottomSheetRef}
              index={isHelping ? 0 : 1}
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
                contentContainerStyle={{ 
                  padding: 20,
                  paddingBottom: Platform.OS === 'ios' ? 120 : 100,
                }}
              >
                <Text style={styles.title}>Give Aid</Text>
                {isHelping && routeDuration && routeDistance && (
                  <>
                    <View style={styles.routeSummaryCard}>
                      <Text style={styles.routeSummaryTitle}>
                        Reccomended Route for {selectedObstacle?.label}
                      </Text>
                      <View style={styles.routeSummaryContent}>
                        <View style={styles.routeSummaryItem}>
                          <Text style={styles.summaryIcon}>🕒</Text>
                          <Text style={styles.summaryLabel}>Duration:</Text>
                          <Text style={styles.summaryValue}>{routeDuration} min</Text>
                        </View>
                        <View style={styles.routeSummaryItem}>
                          <Text style={styles.summaryIcon}>📍</Text>
                          <Text style={styles.summaryLabel}>Distance:</Text>
                          <Text style={styles.summaryValue}>{routeDistance} km</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.routeSummaryContainer}>
                      <Text style={styles.routeSummaryHeader}>Available Routes:</Text>
                      {routeCoordinates.map((route, index) => (
                        <TouchableOpacity
                          key={index}
                          onPress={() => setSelectedRouteIndex(selectedRouteIndex === index ? null : index)}
                          style={[
                            styles.routeInfo,
                            { 
                              backgroundColor: route.isObstacleFree ? '#E3F2FD' : '#FFEBEE',
                              borderLeftColor: route.color,
                              borderLeftWidth: 4,
                              marginBottom: 8,
                              padding: 12,
                              borderRadius: 8,
                              opacity: selectedRouteIndex === null || selectedRouteIndex === index ? 1 : 0.5
                            }
                          ]}
                        >
                          <View style={styles.routeInfoHeader}>
                            <View style={styles.routeInfoTitleContainer}>
                              <Text style={[styles.routeInfoText, { fontWeight: 'bold', color: '#1E1E1E' }]}>
                                Route {index + 1}
                                {index === 0 ? ' (Recommended)' : ''}
                              </Text>
                              <Text style={styles.routeInfoDetails}>
                                {route.duration} min • {route.distance} km
                              </Text>
                            </View>
                            <View style={[
                              styles.routeStatusBadgeContainer,
                              { backgroundColor: route.isObstacleFree ? '#4CAF50' : '#F44336' }
                            ]}>
                              <Text style={styles.routeStatusBadgeText}>
                                {route.isObstacleFree ? '✓ Safe Route' : '⚠️ Near Obstacles'}
                              </Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}

                <Text style={styles.subtitle}>Here are the people who need aid:</Text>
                
                {!currentLocation && (
                  <Text style={[styles.subtitle, { color: '#FF4444' }]}>
                    Waiting for your location to show nearby reports...
                  </Text>
                )}

                {currentLocation && sortedPeople.length === 0 && (
                  <Text style={[styles.subtitle, { color: '#888' }]}>
                    No people needing aid within 50km of your location
                  </Text>
                )}
                
                {rideRequests.length > 0 && (
                  <>
                    <Text style={[styles.subtitle, { marginTop: 20 }]}>Ride Requests:</Text>
                    {currentLocation && rideRequests.length === 0 ? (
                      <Text style={[styles.subtitle, { color: '#888' }]}>
                        No ride requests within 50km of your location
                      </Text>
                    ) : (
                      rideRequests.map((request) => (
                        <TouchableOpacity
                          key={request.id}
                          style={[
                            styles.personContainer,
                            selectedObstacle?.id === request.id && { backgroundColor: '#F0F0F0' }
                          ]}
                          onPress={() => handleObstaclePress(request)}
                        >
                          <Text style={styles.personName}>Ride Request</Text>
                          <Text style={styles.personDescription}>{request.description}</Text>
                          <Text style={styles.locationText}>
                            Location: • {calculateDistance(currentLocation, request.coordinate).toFixed(1)}km away • {request.passengers} passengers
                          </Text>
                        </TouchableOpacity>
                      ))
                    )}
                  </>
                )}

                {firstAidRequests.length > 0 && (
                  <>
                    <Text style={[styles.subtitle, { marginTop: 20 }]}>First Aid Requests:</Text>
                    {currentLocation && firstAidRequests.length === 0 ? (
                      <Text style={[styles.subtitle, { color: '#888' }]}>
                        No first aid requests within 50km of your location
                      </Text>
                    ) : (
                      firstAidRequests.map((request) => (
                        <TouchableOpacity
                          key={request.id}
                          style={[
                            styles.personContainer,
                            selectedObstacle?.id === request.id && { backgroundColor: '#F0F0F0' }
                          ]}
                          onPress={() => handleObstaclePress(request)}
                        >
                          <Text style={styles.personName}>First Aid Request</Text>
                          <Text style={styles.personDescription}>{request.description}</Text>
                          <Text style={styles.locationText}>
                            Location: • {calculateDistance(currentLocation, request.coordinate).toFixed(1)}km away • {request.injuryType}
                          </Text>
                        </TouchableOpacity>
                      ))
                    )}
                  </>
                )}

                {reportedObstacles.length > 0 && (
                  <>
                    <Text style={[styles.subtitle, { marginTop: 20 }]}>Reported Obstacles:</Text>
                    {currentLocation && sortedObstacles.length === 0 ? (
                      <Text style={[styles.subtitle, { color: '#888' }]}>
                        No obstacles reported within 50km of your location
                      </Text>
                    ) : (
                      sortedObstacles.map((obstacle) => (
                        <TouchableOpacity
                          key={obstacle.id}
                          style={[
                            styles.personContainer, 
                            { 
                              borderLeftColor: obstacle.markerColor, 
                              borderLeftWidth: 4,
                              backgroundColor: selectedObstacle?.id === obstacle.id ? '#F0F0F0' : '#FFFFFF'
                            }
                          ]}
                          onPress={() => handleObstaclePress(obstacle)}
                        >
                          <View style={styles.obstacleHeader}>
                            <Text style={styles.personName}>{obstacle.label}</Text>
                            <View 
                              style={[
                                styles.colorIndicator, 
                                { backgroundColor: obstacle.markerColor }
                              ]} 
                            />
                          </View>
                          <Text style={styles.personDescription}>{obstacle.description}</Text>
                        </TouchableOpacity>
                      ))
                    )}
                  </>
                )}

                {sortedPeople.map((person) => (
                  <TouchableOpacity
                    key={person.id}
                    style={[
                      styles.personContainer,
                      selectedObstacle?.id === person.id && { backgroundColor: '#F0F0F0' }
                    ]}
                    onPress={() => handlePersonPress(person)}
                  >
                    <Text style={styles.personName}>{person.name}</Text>
                    <Text style={styles.personDescription}>{person.description}</Text>
                    <Text style={styles.locationText}>
                      Location: • {person.locationDescription} • {calculateDistance(currentLocation, person.location).toFixed(1)}km away
                    </Text>
                  </TouchableOpacity>
                ))}

                {isHelping && routeSteps.length > 0 ? (
                  <>
                    <View style={styles.directionsHeader}>
                      <Text style={styles.title}>Directions</Text>
                      {routeDuration && routeDistance ? (
                        <View style={styles.routeSummaryLarge}>
                          <View style={styles.summaryItem}>
                            <Text style={styles.summaryIcon}>🕒</Text>
                            <Text style={styles.summaryValue}>{routeDuration}</Text>
                            <Text style={styles.summaryUnit}>min</Text>
                          </View>
                          <View style={styles.summaryDivider} />
                          <View style={styles.summaryItem}>
                            <Text style={styles.summaryIcon}>📍</Text>
                            <Text style={styles.summaryValue}>{routeDistance}</Text>
                            <Text style={styles.summaryUnit}>km</Text>
                          </View>
                        </View>
                      ) : (
                        <Text style={styles.subtitle}>Loading route information...</Text>
                      )}
                    </View>
                    {routeSteps.map((step, index) => (
                      <View key={index} style={styles.directionStep}>
                        <Text style={styles.stepText}>
                          {step.instructions}
                        </Text>
                        <Text style={styles.distanceText}>
                          {step.distance.text}
                        </Text>
                      </View>
                    ))}
                  </>
                ) : (
                  <Text style={styles.subtitle}>Select an obstacle to get directions</Text>
                )}
              </BottomSheetScrollView>
            </BottomSheet>

            <View style={styles.fixedButtonContainer}>
              {isHelping ? (
                <TouchableOpacity 
                  style={[styles.button, styles.stopHelpingButton]}
                  onPress={() => {
                    setIsHelping(false);
                    setRouteCoordinates([]);
                    setRouteSteps([]);
                    bottomSheetRef.current?.snapToIndex(1);
                  }}
                >
                  <Text style={styles.buttonText}>Stop Helping</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={[
                    styles.button, 
                    selectedObstacle ? styles.helpButton : {},
                    !isVerified && selectedObstacle ? styles.disabledButton : {},
                    isLoadingDirections ? styles.disabledButton : {}
                  ]}
                  onPress={handleStartHelp}
                  disabled={!selectedObstacle || isLoadingDirections}
                >
                  <Text style={styles.buttonText}>
                    {!selectedObstacle 
                      ? 'Select an Report'
                      : isLoadingDirections
                        ? 'Loading...'
                      : isVerified 
                        ? 'Get Directions' 
                        : 'Verify to Help'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </View>
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
  infoContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 10,
  },
  subtitle: { 
    fontSize: 18, 
    color: '#666666', 
    marginTop: 10 
  },
  personContainer: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  personName: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  personDescription: {
    color: '#666666',
    fontSize: 14,
    marginTop: 4,
  },
  locationText: {
    color: '#007AFF',
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  fixedButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingVertical: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    zIndex: 1,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 20,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  helpButton: {
    backgroundColor: '#007AFF',
  },
  stopHelpingButton: {
    backgroundColor: '#FF3B30',
  },
  disabledButton: {
    backgroundColor: '#E0E0E0',
  },
  routeSummaryCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 15,
    marginTop: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  routeSummaryTitle: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  routeSummaryContent: {
    gap: 10,
  },
  routeSummaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryLabel: {
    color: '#666666',
    fontSize: 16,
    marginRight: 8,
  },
  summaryValue: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  routeInfoPopup: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 80,
    left: 20,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    zIndex: 1000,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  routeInfoContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  routeInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeInfoValue: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '600',
  },
  routeInfoDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 15,
  },
  weatherMapButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    backgroundColor: '#FFFFFF',
    padding: 2,
    borderRadius: 16,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
    zIndex: 1000,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  weatherMapIcon: {
    width: 64,
    height: 64,
  },
  routeSummaryContainer: {
    marginTop: 8,
    marginBottom: 16,
    padding: 15,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  routeSummaryHeader: {
    color: '#000000',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  loadingContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -75 }, { translateY: -25 }],
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 15,
    borderRadius: 10,
    width: 150,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  loadingText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  backButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  routeInfoIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  routeInfoDetails: {
    color: '#666666',
    fontSize: 14,
  },
  routeInfoText: {
    fontSize: 16,
    marginBottom: 4,
  },
  routeSummaryLarge: {
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 12,
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  summaryItem: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  summaryIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  summaryUnit: {
    color: '#666666',
    fontSize: 16,
  },
  summaryDivider: {
    width: 1,
    height: '80%',
    backgroundColor: '#E0E0E0',
  },
  directionStep: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  stepText: {
    color: '#000000',
    fontSize: 14,
  },
  distanceText: {
    color: '#007AFF',
    fontSize: 12,
    marginTop: 4,
  },
  directionsHeader: {
    marginBottom: 15,
  },
  routeInfo: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  routeInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  routeInfoTitleContainer: {
    flex: 1,
    marginRight: 8,
  },
  routeStatusBadgeContainer: {
    borderRadius: 4,
    padding: 4,
    minWidth: 100,
    alignItems: 'center',
  },
  routeStatusBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  obstacleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  colorIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginLeft: 10,
  },
  map: {
    width: '100%',
    height: '100%',
  },
});

export default GiveAidScreen;
