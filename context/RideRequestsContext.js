import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { SERVER_URL } from '../config';

const RideRequestsContext = createContext();

export const RIDE_ICON = { name: 'car', type: 'font-awesome-5', color: '#4A90E2' };

export function RideRequestsProvider({ children }) {
  const [rideRequests, setRideRequests] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef(null);
  const lastRequestTime = useRef(0);
  const retryCount = useRef(0);
  const RATE_LIMIT_SECONDS = 10;
  const MAX_RETRY_COUNT = 2;

  useEffect(() => {
    const connectWebSocket = () => {
      if (retryCount.current < MAX_RETRY_COUNT) {
        console.log('Connecting to WebSocket server for ride requests...');
      }
      
      ws.current = new WebSocket(SERVER_URL);

      ws.current.onopen = () => {
        console.log('Connected to WebSocket server for ride requests');
        setIsConnected(true);
        retryCount.current = 0;
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received WebSocket message:', data);

          if (data.type === 'init') {
            console.log('Received initial ride requests:', data.data.rideRequests);
            setRideRequests(data.data.rideRequests || []);
          } else if (data.type === 'new_ride_request') {
            console.log('Received new ride request:', data.request);
            setRideRequests(prev => [...(prev || []), data.request]);
          } else if (data.type === 'ride_request_removed') {
            console.log('Received ride request removal:', data.requestId);
            setRideRequests(prev => prev.filter(request => request.id !== data.requestId));
          } else if (data.type === 'error') {
            console.log('Received error:', data.message);
            Alert.alert('Rate Limit', data.message);
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };

      ws.current.onclose = () => {
        setIsConnected(false);
        if (retryCount.current < MAX_RETRY_COUNT) {
          console.log('WebSocket connection closed. Attempting to reconnect...');
          retryCount.current += 1;
        }
        setTimeout(connectWebSocket, 5000);
      };

      ws.current.onerror = (error) => {
        setIsConnected(false);
        if (retryCount.current < MAX_RETRY_COUNT) {
          console.log('WebSocket error:', error);
        }
      };
    };

    connectWebSocket();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  const addRideRequest = (newRequest) => {
    if (!isConnected) {
      Alert.alert(
        'Server Unavailable',
        'Cannot submit ride request because the server is not running. Please try again later.'
      );
      return;
    }

    const now = Date.now();
    const timeSinceLastRequest = (now - lastRequestTime.current) / 1000;

    if (timeSinceLastRequest < RATE_LIMIT_SECONDS) {
      const waitTime = Math.ceil(RATE_LIMIT_SECONDS - timeSinceLastRequest);
      Alert.alert(
        'Rate Limit',
        `Please wait ${waitTime} seconds before submitting another request`
      );
      return;
    }

    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      const message = {
        type: 'ride_request',
        coordinate: newRequest.coordinate,
        description: newRequest.description,
        passengers: newRequest.passengers,
        label: newRequest.label
      };

      console.log('Sending new ride request to server:', message);
      ws.current.send(JSON.stringify(message));
      lastRequestTime.current = now;
    } else {
      Alert.alert(
        'Server Unavailable',
        'Cannot submit ride request because the server is not running. Please try again later.'
      );
    }
  };

  const removeRideRequest = (requestId) => {
    if (!isConnected) {
      Alert.alert(
        'Server Unavailable',
        'Cannot remove ride request because the server is not running. Please try again later.'
      );
      return;
    }

    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      const message = {
        type: 'remove_ride_request',
        requestId: requestId
      };

      console.log('Sending ride request removal to server:', message);
      ws.current.send(JSON.stringify(message));
    } else {
      Alert.alert(
        'Server Unavailable',
        'Cannot remove ride request because the server is not running. Please try again later.'
      );
    }
  };

  return (
    <RideRequestsContext.Provider value={{ rideRequests, addRideRequest, removeRideRequest, isConnected }}>
      {children}
    </RideRequestsContext.Provider>
  );
}

export function useRideRequests() {
  return useContext(RideRequestsContext);
} 