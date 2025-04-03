// Rename this file to config.js and fill in your values
export const SERVER_IP = 'YOUR_SERVER_IP'; // e.g. '192.168.1.100'
export const SERVER_URL = `ws://${SERVER_IP}:8080`; // For local development
// export const SERVER_URL = 'wss://your-production-server.com'; // For production

export const GOOGLE_MAPS_CONFIG = {
  API_KEY: 'YOUR_GOOGLE_MAPS_API_KEY',
};

// Admin credentials - Change these in production!
export const ADMIN_CREDENTIALS = {
  username: 'YOUR_ADMIN_USERNAME',
  password: 'YOUR_ADMIN_PASSWORD'
};

export const STRIPE_CONFIG = {
  TEST_SECRET_KEY: 'YOUR_STRIPE_TEST_SECRET_KEY',
}; 