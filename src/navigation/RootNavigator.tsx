import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme";
import MainTabNavigator from "./MainTabNavigator";
import LoginScreen from "../screens/LoginScreen";
import SignupScreen from "../screens/SignupScreen";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";
import StockDetailScreen from "../screens/StockDetailScreen";
import CommodityDetailScreen from "../screens/CommodityDetailScreen";
import EditProfileScreen from "../screens/EditProfileScreen";
import DashboardScreen from "../screens/DashboardScreen";

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.indigo} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={MainTabNavigator} />
        <Stack.Screen
          name="StockDetail"
          component={StockDetailScreen}
          options={{ presentation: "card", animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="CommodityDetail"
          component={CommodityDetailScreen}
          options={{ presentation: "card", animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="EditProfile"
          component={EditProfileScreen}
          options={{ presentation: "card", animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{ presentation: "card", animation: "slide_from_right" }}
        />
        <Stack.Group screenOptions={{ presentation: "modal" }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen
            name="ForgotPassword"
            component={ForgotPasswordScreen}
          />
        </Stack.Group>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
});
