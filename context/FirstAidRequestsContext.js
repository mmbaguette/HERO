import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { SERVER_URL } from '../config';

const FirstAidRequestsContext = createContext();

export const FIRST_AID_ICON = { name: 'medical-bag', type: 'material-community', color: '#E53935' };

export function FirstAidRequestsProvider({ children }) {
  const [firstAidRequests, setFirstAidRequests] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef(null);
  const lastRequestTime = useRef(0);
  const retryCount = useRef(0);
  const RATE_LIMIT_SECONDS = 10;
  const MAX_RETRY_COUNT = 2;

  useEffect(() => {
    const connectWebSocket = () => {
      if (retryCount.current < MAX_RETRY_COUNT) {
        console.log('Connecting to WebSocket server for first aid requests...');
      }
      
      ws.current = new WebSocket(SERVER_URL);

      ws.current.onopen = () => {
        console.log('Connected to WebSocket server for first aid requests');
        setIsConnected(true);
        retryCount.current = 0;
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received WebSocket message:', data);

          if (data.type === 'init') {
            console.log('Received initial first aid requests:', data.data.firstAidRequests);
            setFirstAidRequests(data.data.firstAidRequests || []);
          } else if (data.type === 'new_first_aid_request') {
            console.log('Received new first aid request:', data.request);
            setFirstAidRequests(prev => [...(prev || []), data.request]);
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

  const addFirstAidRequest = (newRequest) => {
    if (!isConnected) {
      console.log(
        'Server Unavailable',
        'Cannot submit first aid request because the server is not running. Please try again later.'
      );
      return;
    }

    const now = Date.now();
    const timeSinceLastRequest = (now - lastRequestTime.current) / 1000;

    if (timeSinceLastRequest < RATE_LIMIT_SECONDS) {
      const waitTime = Math.ceil(RATE_LIMIT_SECONDS - timeSinceLastRequest);
      console.log(
        'Rate Limit',
        `Please wait ${waitTime} seconds before submitting another request`
      );
      return;
    }

    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      // Generate a temporary ID for immediate feedback
      const tempId = Date.now().toString();
      const message = {
        type: 'first_aid_request',
        request: {
          id: tempId,
          coordinate: newRequest.coordinate,
          description: newRequest.description,
          injuryType: newRequest.injuryType,
          label: 'First Aid Request',
          type: 'first_aid_request',
          timestamp: now
        }
      };

      // Add to local state immediately for instant feedback
      setFirstAidRequests(prev => [...prev, message.request]);

      console.log('Sending new first aid request to server:', message);
      ws.current.send(JSON.stringify(message));
      lastRequestTime.current = now;
    } else {
      console.log(
        'Server Unavailable',
        'Cannot submit first aid request because the server is not running. Please try again later.'
      );
    }
  };

  return (
    <FirstAidRequestsContext.Provider value={{ firstAidRequests, addFirstAidRequest, isConnected }}>
      {children}
    </FirstAidRequestsContext.Provider>
  );
}

export function useFirstAidRequests() {
  return useContext(FirstAidRequestsContext);
} 