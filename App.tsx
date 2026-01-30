import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StyleSheet } from "react-native";
import { AuthProvider } from "./src/context/AuthContext";
import { SocketProvider } from "./src/context/SocketContext";
import { ToastProvider } from "./src/context/ToastContext";
import { RootNavigator } from "./src/navigation";
import cacheService from "./src/services/cacheService";

export default function App() {
  // Preload cache into memory on app start for instant data access
  useEffect(() => {
    cacheService.preloadCache();
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <AuthProvider>
          <SocketProvider>
            <ToastProvider>
              <RootNavigator />
            </ToastProvider>
          </SocketProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0E1A",
  },
});
