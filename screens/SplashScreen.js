import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Dimensions } from 'react-native';
import { CommonActions } from '@react-navigation/native';

const SplashScreen = ({ navigation }) => {
  const moveAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start the animation after a short delay
    setTimeout(() => {
      Animated.timing(moveAnimation, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      }).start(() => {
        // Use CommonActions.reset to immediately switch to Login screen
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          })
        );
      });
    }, 500);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.heroContainer,
          {
            transform: [
              {
                translateY: moveAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -Dimensions.get('window').height * 0.22],
                }),
              },
              {
                scale: moveAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 0.6],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.heroText}>HERO</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroContainer: {
    alignItems: 'center',
  },
  heroText: {
    fontSize: 120,
    color: '#007AFF',
    fontWeight: 'bold',
    textShadowColor: '#007AFF',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },
});

export default SplashScreen; 