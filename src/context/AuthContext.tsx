import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import * as SecureStore from "expo-secure-store";
import axios from "axios";
import { config } from "../config";
import { User, AuthTokens, MeResponse } from "../types";
import cacheService from "../services/cacheService";

interface AuthContextType {
  user: User | null;
  isAuthed: boolean;
  isLoading: boolean;
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; message: string }>;
  signup: (
    name: string,
    email: string,
    password: string,
  ) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<boolean>;
  refreshUser: () => Promise<boolean>;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create axios instance for auth requests
const authApi = axios.create({
  baseURL: config.apiUrl,
  timeout: 10000,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get access token from SecureStore
  const getAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(config.ACCESS_TOKEN_KEY);
    } catch {
      return null;
    }
  }, []);

  // Get refresh token from SecureStore
  const getRefreshToken = useCallback(async (): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(config.REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  }, []);

  // Save tokens to SecureStore
  const saveTokens = useCallback(
    async (accessToken: string, refreshToken: string): Promise<void> => {
      await SecureStore.setItemAsync(config.ACCESS_TOKEN_KEY, accessToken);
      await SecureStore.setItemAsync(config.REFRESH_TOKEN_KEY, refreshToken);
    },
    [],
  );

  // Clear tokens from SecureStore
  const clearTokens = useCallback(async (): Promise<void> => {
    await SecureStore.deleteItemAsync(config.ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(config.REFRESH_TOKEN_KEY);
  }, []);

  // Refresh access token using refresh token
  const refreshAuth = useCallback(async (): Promise<boolean> => {
    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) {
        return false;
      }

      const response = await authApi.post("/refresh", {
        refreshToken,
      });

      if (response.data.success) {
        await saveTokens(response.data.accessToken, response.data.refreshToken);
        return true;
      }
      return false;
    } catch {
      await clearTokens();
      setUser(null);
      return false;
    }
  }, [getRefreshToken, saveTokens, clearTokens]);

  // Fetch user profile
  const fetchUser = useCallback(async (): Promise<boolean> => {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        return false;
      }

      const response = await authApi.get<MeResponse>("/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.data.success && response.data.user) {
        setUser(response.data.user);
        return true;
      }
      return false;
    } catch (error: any) {
      // If 401, try to refresh token
      if (error.response?.status === 401) {
        const refreshed = await refreshAuth();
        if (refreshed) {
          // Retry fetching user
          return fetchUser();
        }
      }
      setUser(null);
      return false;
    }
  }, [getAccessToken, refreshAuth]);

  // Login function
  const login = useCallback(
    async (
      email: string,
      password: string,
    ): Promise<{ success: boolean; message: string }> => {
      try {
        const response = await authApi.post("/login", { email, password });

        if (response.data.success) {
          const { accessToken, refreshToken } = response.data;
          await saveTokens(accessToken, refreshToken);
          await fetchUser();
          return { success: true, message: "Login successful" };
        }
        return {
          success: false,
          message: response.data.message || "Login failed",
        };
      } catch (error: any) {
        const message =
          error.response?.data?.message || "Login failed. Please try again.";
        return { success: false, message };
      }
    },
    [saveTokens, fetchUser],
  );

  // Signup function
  const signup = useCallback(
    async (
      name: string,
      email: string,
      password: string,
    ): Promise<{ success: boolean; message: string }> => {
      try {
        const response = await authApi.post("/signup", {
          name,
          email,
          password,
        });

        if (response.data.success) {
          const { accessToken, refreshToken } = response.data;
          await saveTokens(accessToken, refreshToken);
          await fetchUser();
          return { success: true, message: "Account created successfully" };
        }
        return {
          success: false,
          message: response.data.message || "Signup failed",
        };
      } catch (error: any) {
        const message =
          error.response?.data?.message || "Signup failed. Please try again.";
        return { success: false, message };
      }
    },
    [saveTokens, fetchUser],
  );

  // Logout function
  const logout = useCallback(async (): Promise<void> => {
    try {
      const accessToken = await getAccessToken();
      if (accessToken) {
        await authApi.get("/logout", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
      }
    } catch {
      // Ignore logout API errors
    } finally {
      await clearTokens();
      // Clear user-specific cache (portfolio, user profile)
      await cacheService.clearUserCache();
      setUser(null);
    }
  }, [getAccessToken, clearTokens]);

  // Initialize auth state on mount (only once)
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      setIsLoading(true);
      try {
        const accessToken = await SecureStore.getItemAsync(
          config.ACCESS_TOKEN_KEY,
        );
        console.log("[Auth] Token present:", !!accessToken);

        if (accessToken && mounted) {
          // First, try to load cached user for INSTANT display
          const cachedUser = await cacheService.getUserProfile();
          if (cachedUser && mounted) {
            console.log("[Auth] Loaded cached user:", cachedUser.name);
            setUser(cachedUser);
            setIsLoading(false); // Show app immediately with cached data
          }

          // Then fetch fresh user data in background
          console.log("[Auth] Fetching fresh user profile...");
          try {
            const response = await authApi.get<MeResponse>("/me", {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            });

            if (response.data.success && response.data.user && mounted) {
              console.log(
                "[Auth] User fetched successfully:",
                response.data.user.name,
              );
              setUser(response.data.user);
              // Save to cache for next app launch
              cacheService.saveUserProfile(response.data.user);
            }
          } catch (error: any) {
            console.log("[Auth] Fetch user error:", error.message);
            // If 401, try to refresh token
            if (error.response?.status === 401) {
              const refreshToken = await SecureStore.getItemAsync(
                config.REFRESH_TOKEN_KEY,
              );
              if (refreshToken) {
                try {
                  const refreshResponse = await authApi.post("/refresh", {
                    refreshToken,
                  });
                  if (refreshResponse.data.success && mounted) {
                    await SecureStore.setItemAsync(
                      config.ACCESS_TOKEN_KEY,
                      refreshResponse.data.accessToken,
                    );
                    await SecureStore.setItemAsync(
                      config.REFRESH_TOKEN_KEY,
                      refreshResponse.data.refreshToken,
                    );
                    // Retry fetching user with new token
                    const retryResponse = await authApi.get<MeResponse>("/me", {
                      headers: {
                        Authorization: `Bearer ${refreshResponse.data.accessToken}`,
                      },
                    });
                    if (
                      retryResponse.data.success &&
                      retryResponse.data.user &&
                      mounted
                    ) {
                      setUser(retryResponse.data.user);
                      // Save to cache
                      cacheService.saveUserProfile(retryResponse.data.user);
                    }
                  }
                } catch {
                  // Refresh failed, clear tokens and cache
                  await SecureStore.deleteItemAsync(config.ACCESS_TOKEN_KEY);
                  await SecureStore.deleteItemAsync(config.REFRESH_TOKEN_KEY);
                  await cacheService.clearUserCache();
                  if (mounted) setUser(null);
                }
              }
            }
          }
        } else {
          console.log("[Auth] No token found, user is guest");
        }
      } catch (error) {
        console.log("[Auth] Init error:", error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      mounted = false;
    };
  }, []); // Empty dependency array - only run once on mount

  const value = {
    user,
    isAuthed: !!user,
    isLoading,
    login,
    signup,
    logout,
    refreshAuth,
    refreshUser: fetchUser,
    getAccessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within <AuthProvider>");
  }
  return ctx;
}
