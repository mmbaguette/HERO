import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  TouchableWithoutFeedback, 
  TouchableLongPress, 
  FlatList, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  Alert,
  Keyboard
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useObstacles } from '../context/ObstaclesContext';
import { useVerification } from '../context/VerificationContext';
import styles from '../styles/communityBoardStyles';
import { SERVER_URL, ADMIN_CREDENTIALS } from '../config';

const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit'
  });
};

const CommunityBoardScreen = () => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessageTime, setLastMessageTime] = useState(0);
  const flatListRef = useRef(null);
  const route = useRoute();
  const navigation = useNavigation();
  const userName = route.params?.userName;
  const userPassword = route.params?.userPassword;
  const isAdmin = userName === ADMIN_CREDENTIALS.username && userPassword === ADMIN_CREDENTIALS.password;
  const ws = useRef(null);
  const RATE_LIMIT_SECONDS = 10;
  const { checkNameVerification } = useVerification();
  const isVerified = userName ? checkNameVerification(userName) : false;

  // Add debugging logs
  useEffect(() => {
    console.log('Route params:', route.params);
    console.log('Username from params:', userName);
    console.log('User verification status:', isVerified);
  }, [route.params, userName, isVerified]);

  // Add debugging logs for admin status
  useEffect(() => {
    console.log('CommunityBoard - Admin status:', {
      userName,
      userPassword,
      isAdmin
    });
  }, [userName, userPassword, isAdmin]);

  useEffect(() => {
    if (!userName) {
      console.log('No username found in params');
      return;
    }

    console.log('Attempting to connect to WebSocket with username:', userName);
    ws.current = new WebSocket(SERVER_URL);

    ws.current.onopen = () => {
      console.log('Successfully connected to chat server');
      setIsConnected(true);
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Received:', data);

      if (data.type === 'init') {
        setMessages(data.data.chatMessages);
        flatListRef.current?.scrollToEnd();
      } else if (data.type === 'new_chat_message') {
        setMessages(prev => [...prev, data.message]);
        flatListRef.current?.scrollToEnd();
      } else if (data.type === 'message_removed') {
        console.log('Message removed:', data.messageId);
        setMessages(prev => prev.filter(msg => msg.id !== data.messageId));
      } else if (data.type === 'error') {
        console.log('Error:', data.message);
        Alert.alert('Error', data.message);
      }
    };

    ws.current.onclose = (event) => {
      console.log('WebSocket Disconnected');
      setIsConnected(false);
    };

    ws.current.onerror = (error) => {
      console.log('Failed to connect to server:', SERVER_URL);
      setIsConnected(false);
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [userName]);

  const handleSend = () => {
    if (!userName) {
      console.log('Error: Please log in or sign up to send messages');
      return;
    }

    if (!isVerified) {
      Alert.alert(
        'Verification Required',
        'You need to be a verified user to send messages. Would you like to get verified now?',
        [
          {
            text: 'Not Now',
            style: 'cancel'
          },
          {
            text: 'Verify Now',
            onPress: () => navigation.navigate('Verification', { 
              fromSignup: false,
              fullName: userName,
              returnScreen: 'CommunityBoard',
              returnParams: { userName }
            })
          }
        ]
      );
      return;
    }

    if (!message.trim()) return;

    const now = Date.now();
    const timeSinceLastMessage = (now - lastMessageTime) / 1000;

    if (timeSinceLastMessage < RATE_LIMIT_SECONDS) {
      const waitTime = Math.ceil(RATE_LIMIT_SECONDS - timeSinceLastMessage);
      Alert.alert(
        'Rate Limit',
        `Please wait ${waitTime} seconds before sending another message.`,
        [{ text: 'OK' }]
      );
      return;
    }

    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      const chatMessage = {
        type: 'chat_message',
        username: userName,
        message: message.trim()
      };

      ws.current.send(JSON.stringify(chatMessage));
      setMessage('');
      setLastMessageTime(now);
    } else {
      console.log('Cannot send message. Server is not connected.');
    }
  };

  const handleMessageLongPress = (message) => {
    console.log('Message long press detected:', {
      message,
      isAdmin,
      userName,
      userPassword
    });

    if (!isAdmin) {
      console.log('Long press ignored - user is not admin');
      return;
    }

    Alert.alert(
      'Remove Message',
      'Are you sure you want to remove this message?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => console.log('Message removal cancelled')
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            console.log('Removing message:', message.id);
            if (ws.current && ws.current.readyState === WebSocket.OPEN) {
              ws.current.send(JSON.stringify({
                type: 'remove_message',
                messageId: message.id
              }));
            } else {
              Alert.alert('Error', 'Cannot remove message. Server is not connected.');
            }
          }
        }
      ]
    );
  };

  const renderMessage = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.messageContainer,
        item.username === userName ? styles.ownMessage : styles.otherMessage
      ]}
      onLongPress={() => handleMessageLongPress(item)}
      delayLongPress={500}
    >
      <View style={styles.messageHeader}>
        <Text style={styles.username}>{item.username}</Text>
        <Text style={styles.timestamp}>{formatTime(item.timestamp)}</Text>
      </View>
      <Text style={styles.messageText}>{item.message}</Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Community Chat</Text>
        <Text style={styles.description}>Inform your neighbourhood about the local situation.</Text>
        {!isConnected && (
          <View style={styles.offlineIndicator}>
            <ActivityIndicator size="small" color="#FF4444" />
            <Text style={styles.offlineText}>Connecting to server...</Text>
          </View>
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        onLayout={() => flatListRef.current?.scrollToEnd()}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={Keyboard.dismiss}
      />

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.inputContainer}>
          <TextInput
            style={[
              styles.input,
              !isVerified && styles.disabledInput
            ]}
            value={message}
            onChangeText={setMessage}
            placeholder={isVerified ? "Type a message..." : "Verify your account to send messages"}
            placeholderTextColor="#888"
            multiline={true}
            maxLength={500}
            editable={isVerified}
          />
          <TouchableOpacity 
            style={[
              styles.sendButton,
              (!message.trim() || !isConnected || !isVerified) && styles.disabledButton
            ]} 
            onPress={handleSend}
            disabled={!message.trim() || !isConnected || !isVerified}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

export default CommunityBoardScreen;
