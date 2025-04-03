const express = require('express');
const app = express();
const http = require('http');
const WebSocket = require('ws');
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Store connected clients
const clients = new Set();

// Store reported obstacles, ride requests and chat messages (in-memory for now)
let obstacles = [];
let rideRequests = [];
let firstAidRequests = [];
let chatMessages = [];

// Store last message time for each client
const clientLastMessageTime = new Map();
const RATE_LIMIT_SECONDS = 10;

wss.on('connection', function connection(ws) {
  console.log('New client connected');
  clients.add(ws);
  clientLastMessageTime.set(ws, {
    chat: 0,
    obstacle: 0,
    ride: 0,
    firstAid: 0
  });

  // Send existing data to new client
  ws.send(JSON.stringify({
    type: 'init',
    data: {
      obstacles: obstacles,
      rideRequests: rideRequests,
      firstAidRequests: firstAidRequests,
      chatMessages: chatMessages
    }
  }));

  ws.on('message', function incoming(message) {
    try {
      const data = JSON.parse(message);
      console.log('Received:', data);
      const now = Date.now();

      if (data.type === 'chat_message') {
        const lastMessageTime = clientLastMessageTime.get(ws).chat;
        const timeSinceLastMessage = (now - lastMessageTime) / 1000;

        if (timeSinceLastMessage < RATE_LIMIT_SECONDS) {
          console.log(`Chat rate limit exceeded. Must wait ${RATE_LIMIT_SECONDS - Math.floor(timeSinceLastMessage)} more seconds`);
          ws.send(JSON.stringify({
            type: 'error',
            message: `Please wait ${RATE_LIMIT_SECONDS - Math.floor(timeSinceLastMessage)} seconds before sending another message`
          }));
          return;
        }

        const chatMessage = {
          id: Date.now().toString(),
          username: data.username || 'Anonymous',
          message: data.message,
          timestamp: now
        };

        chatMessages.push(chatMessage);
        // Keep only last 100 messages
        if (chatMessages.length > 100) {
          chatMessages = chatMessages.slice(-100);
        }

        clientLastMessageTime.get(ws).chat = now;
        console.log('New chat message:', chatMessage);

        // Broadcast to all connected clients
        const broadcastMessage = JSON.stringify({
          type: 'new_chat_message',
          message: chatMessage
        });

        clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(broadcastMessage);
          }
        });
      } 
      else if (data.type === 'report_obstacle') {
        const lastObstacleTime = clientLastMessageTime.get(ws).obstacle;
        const timeSinceLastObstacle = (now - lastObstacleTime) / 1000;

        if (timeSinceLastObstacle < RATE_LIMIT_SECONDS) {
          console.log(`Obstacle rate limit exceeded. Must wait ${RATE_LIMIT_SECONDS - Math.floor(timeSinceLastObstacle)} more seconds`);
          ws.send(JSON.stringify({
            type: 'error',
            message: `Please wait ${RATE_LIMIT_SECONDS - Math.floor(timeSinceLastObstacle)} seconds before reporting another obstacle`
          }));
          return;
        }

        const obstacle = {
          id: Date.now().toString(),
          type: data.obstacleType,
          coordinate: data.coordinate,
          label: data.obstacleType,
          description: data.description,
          markerColor: data.markerColor
        };

        obstacles.push(obstacle);
        clientLastMessageTime.get(ws).obstacle = now;
        console.log('New obstacle reported:', obstacle);

        // Broadcast to all connected clients
        const broadcastMessage = JSON.stringify({
          type: 'new_obstacle',
          obstacle: obstacle
        });

        clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(broadcastMessage);
          }
        });
      }
      else if (data.type === 'remove_obstacle') {
        const obstacleId = data.obstacleId;
        const obstacleIndex = obstacles.findIndex(o => o.id === obstacleId);
        
        if (obstacleIndex !== -1) {
          obstacles.splice(obstacleIndex, 1);
          console.log('Obstacle removed:', obstacleId);

          // Broadcast removal to all connected clients
          const broadcastMessage = JSON.stringify({
            type: 'obstacle_removed',
            obstacleId: obstacleId
          });

          clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(broadcastMessage);
            }
          });
        }
      }
      else if (data.type === 'remove_message') {
        const messageId = data.messageId;
        const messageIndex = chatMessages.findIndex(m => m.id === messageId);
        
        if (messageIndex !== -1) {
          chatMessages.splice(messageIndex, 1);
          console.log('Message removed:', messageId);

          // Broadcast removal to all connected clients
          const broadcastMessage = JSON.stringify({
            type: 'message_removed',
            messageId: messageId
          });

          clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(broadcastMessage);
            }
          });
        }
      }
      else if (data.type === 'remove_ride_request') {
        const requestId = data.requestId;
        const requestIndex = rideRequests.findIndex(r => r.id === requestId);
        
        if (requestIndex !== -1) {
          rideRequests.splice(requestIndex, 1);
          console.log('Ride request removed:', requestId);

          // Broadcast removal to all connected clients
          const broadcastMessage = JSON.stringify({
            type: 'ride_request_removed',
            requestId: requestId
          });

          clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(broadcastMessage);
            }
          });
        }
      }
      else if (data.type === 'ride_request') {
        const lastRideTime = clientLastMessageTime.get(ws).ride;
        const timeSinceLastRide = (now - lastRideTime) / 1000;

        if (timeSinceLastRide < RATE_LIMIT_SECONDS) {
          console.log(`Ride request rate limit exceeded. Must wait ${RATE_LIMIT_SECONDS - Math.floor(timeSinceLastRide)} more seconds`);
          ws.send(JSON.stringify({
            type: 'error',
            message: `Please wait ${RATE_LIMIT_SECONDS - Math.floor(timeSinceLastRide)} seconds before submitting another ride request`
          }));
          return;
        }

        const rideRequest = {
          id: Date.now().toString(),
          type: 'ride_request',
          coordinate: data.coordinate,
          label: 'Ride Request',
          description: data.description,
          passengers: data.passengers
        };

        rideRequests.push(rideRequest);
        clientLastMessageTime.get(ws).ride = now;
        console.log('New ride request:', rideRequest);

        clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'new_ride_request',
              request: rideRequest
            }));
          }
        });
      }
      else if (data.type === 'first_aid_request') {
        const lastFirstAidTime = clientLastMessageTime.get(ws).firstAid;
        const timeSinceLastFirstAid = (now - lastFirstAidTime) / 1000;

        if (timeSinceLastFirstAid < RATE_LIMIT_SECONDS) {
          console.log(`First aid request rate limit exceeded. Must wait ${RATE_LIMIT_SECONDS - Math.floor(timeSinceLastFirstAid)} more seconds`);
          ws.send(JSON.stringify({
            type: 'error',
            message: `Please wait ${RATE_LIMIT_SECONDS - Math.floor(timeSinceLastFirstAid)} seconds before submitting another first aid request`
          }));
          return;
        }

        const firstAidRequest = {
          id: Date.now().toString(),
          type: 'first_aid_request',
          coordinate: data.request.coordinate,
          label: 'First Aid Request',
          description: data.request.description,
          injuryType: data.request.injuryType
        };

        firstAidRequests.push(firstAidRequest);
        clientLastMessageTime.get(ws).firstAid = now;
        console.log('New first aid request:', firstAidRequest);

        clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'new_first_aid_request',
              request: firstAidRequest
            }));
          }
        });
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    clients.delete(ws);
    clientLastMessageTime.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
    clientLastMessageTime.delete(ws);
  });
});

app.get('/', (req, res) => {
  res.send('WebSocket server is running');
});

const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0'; // Listen on all network interfaces

server.listen(PORT, HOST, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`);
  console.log('WebSocket server is ready for connections');
}); 