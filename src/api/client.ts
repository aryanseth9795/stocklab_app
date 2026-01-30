import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import * as SecureStore from "expo-secure-store";
import { config } from "../config";

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: config.apiUrl,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (reqConfig: InternalAxiosRequestConfig) => {
    try {
      const accessToken = await SecureStore.getItemAsync(
        config.ACCESS_TOKEN_KEY,
      );
      if (accessToken && reqConfig.headers) {
        reqConfig.headers.Authorization = `Bearer ${accessToken}`;
      }
    } catch {
      // Ignore token retrieval errors
    }
    return reqConfig;
  },
  (error) => Promise.reject(error),
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await SecureStore.getItemAsync(
          config.REFRESH_TOKEN_KEY,
        );
        if (refreshToken) {
          const response = await axios.post(`${config.apiUrl}/refresh`, {
            refreshToken,
          });

          if (response.data.success) {
            const { accessToken, refreshToken: newRefreshToken } =
              response.data;
            await SecureStore.setItemAsync(
              config.ACCESS_TOKEN_KEY,
              accessToken,
            );
            await SecureStore.setItemAsync(
              config.REFRESH_TOKEN_KEY,
              newRefreshToken,
            );

            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return api(originalRequest);
          }
        }
      } catch {
        // Refresh failed, clear tokens
        await SecureStore.deleteItemAsync(config.ACCESS_TOKEN_KEY);
        await SecureStore.deleteItemAsync(config.REFRESH_TOKEN_KEY);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
