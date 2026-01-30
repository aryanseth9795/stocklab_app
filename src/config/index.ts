// API Configuration
// Change this to your production URL when deploying
const DEV_URL = "http://localhost:5000"; // Local development
const PROD_URL = "https://stocklabs-server.onrender.com";

// Set to true for production
const IS_PRODUCTION = true;

export const config = {
  serverUrl: IS_PRODUCTION ? PROD_URL : DEV_URL,
  apiUrl: `${IS_PRODUCTION ? PROD_URL : DEV_URL}/api/v1`,

  // Token keys for SecureStore
  ACCESS_TOKEN_KEY: "stocklabs_access_token",
  REFRESH_TOKEN_KEY: "stocklabs_refresh_token",

  // Token expiry (in ms)
  ACCESS_TOKEN_EXPIRY: 15 * 60 * 1000, // 15 minutes
  REFRESH_TOKEN_EXPIRY: 7 * 24 * 60 * 60 * 1000, // 7 days
};
