import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { SERVER_URL } from '../config';

const ObstaclesContext = createContext();

// Define obstacle types and icons here for use across the app
export const OBSTACLE_ICONS = {
  'Fallen Tree': { name: 'tree', type: 'font-awesome-5', color: '#2E7D32' },      // Dark green, tree icon
  'Power Line Down': { name: 'bolt', type: 'font-awesome-5', color: '#FFC107' },  // Amber, lightning bolt
  'Flood': { name: 'water', type: 'font-awesome-5', color: '#1976D2' },          // Blue, water icon
  'Road Blocked': { name: 'road', type: 'font-awesome-5', color: '#E64A19' },     // Deep orange, road icon
  'Debris': { name: 'cubes', type: 'font-awesome-5', color: '#5D4037' }, // Brown, debris icon
  'Fire': { name: 'fire', type: 'font-awesome-5', color: '#D32F2F' },            // Red, fire icon
};

export const OBSTACLE_TYPES = Object.entries(OBSTACLE_ICONS).map(([type, config]) => ({
  type,
  color: config.color,
  icon: config.name
}));

export function ObstaclesProvider({ children }) {
  const [reportedObstacles, setReportedObstacles] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef(null);
  const retryCount = useRef(0);
  const lastReportTime = useRef(0);
  const MAX_RETRY_COUNT = 5;
  const RATE_LIMIT_SECONDS = 10;

  useEffect(() => {
    const connectWebSocket = () => {
      console.log('Connecting to WebSocket server...');
      
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        console.log('WebSocket already connected');
        return;
      }

      try {
        ws.current = new WebSocket(SERVER_URL);

        ws.current.onopen = () => {
          console.log('WebSocket connected successfully');
          setIsConnected(true);
          retryCount.current = 0;
        };

        ws.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('Received WebSocket message:', data);

            if (data.type === 'init') {
              console.log('Received initial obstacles:', data.data.obstacles);
              setReportedObstacles(data.data.obstacles || []);
            } else if (data.type === 'new_obstacle') {
              console.log('Received new obstacle:', data.obstacle);
              setReportedObstacles(prev => {
                const exists = prev.some(obs => obs.id === data.obstacle.id);
                if (exists) return prev;
                return [...prev, data.obstacle];
              });
            } else if (data.type === 'error') {
              console.log('Received error:', data.message);
              Alert.alert('Rate Limit', data.message);
            } else if (data.type === 'obstacle_removed') {
              console.log('Received obstacle_removed message:', data.obstacleId);
              setReportedObstacles(prev => prev.filter(obs => obs.id !== data.obstacleId));
            }
          } catch (error) {
            console.error('Error processing WebSocket message:', error);
          }
        };

        ws.current.onclose = () => {
          console.log('WebSocket connection closed');
          setIsConnected(false);
          if (retryCount.current < MAX_RETRY_COUNT) {
            console.log('Attempting to reconnect...');
            retryCount.current += 1;
            setTimeout(connectWebSocket, 5000);
          }
        };

        ws.current.onerror = (error) => {
          console.log('WebSocket error:', error);
          setIsConnected(false);
        };
      } catch (error) {
        console.error('Error creating WebSocket:', error);
        setIsConnected(false);
      }
    };

    connectWebSocket();

    // Cleanup function
    return () => {
      console.log('Cleaning up WebSocket connection');
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []); // Empty dependency array to run only once

  const addObstacle = (obstacle) => {
    console.log('Attempting to add obstacle:', {
      isConnected,
      wsExists: !!ws.current,
      readyState: ws.current?.readyState
    });

    if (!isConnected || !ws.current || ws.current.readyState !== WebSocket.OPEN) {
      Alert.alert('Server Unavailable', 'Cannot report obstacle because the server is not running');
      return;
    }

    const now = Date.now();
    const timeSinceLastReport = (now - lastReportTime.current) / 1000;

    if (timeSinceLastReport < RATE_LIMIT_SECONDS) {
      const waitTime = Math.ceil(RATE_LIMIT_SECONDS - timeSinceLastReport);
      Alert.alert('Rate Limit', `Please wait ${waitTime} seconds before reporting another obstacle`);
      return;
    }

    const message = {
      type: 'report_obstacle',
      obstacleType: obstacle.type,
      coordinate: obstacle.coordinate,
      description: obstacle.description,
      markerColor: obstacle.markerColor
    };

    console.log('Sending new obstacle to server:', message);
    ws.current.send(JSON.stringify(message));
    lastReportTime.current = now;
  };

  const removeObstacle = (obstacleId) => {
    console.log('Attempting to remove obstacle:', {
      obstacleId,
      isConnected,
      wsExists: !!ws.current,
      readyState: ws.current?.readyState
    });

    if (!isConnected || !ws.current || ws.current.readyState !== WebSocket.OPEN) {
      Alert.alert('Server Unavailable', 'Cannot remove obstacle because the server is not running');
      return;
    }

    const message = {
      type: 'remove_obstacle',
      obstacleId: obstacleId
    };

    console.log('Sending remove obstacle message:', message);
    ws.current.send(JSON.stringify(message));
  };

  return (
    <ObstaclesContext.Provider value={{ reportedObstacles, addObstacle, removeObstacle, isConnected }}>
      {children}
    </ObstaclesContext.Provider>
  );
}

export function useObstacles() {
  return useContext(ObstaclesContext);
} 