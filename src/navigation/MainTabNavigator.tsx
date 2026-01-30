import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MainTabParamList } from "./types";
import { colors } from "../theme";

// Screens
import HomeScreen from "../screens/HomeScreen";
import PortfolioScreen from "../screens/PortfolioScreen";
import HistoryScreen from "../screens/HistoryScreen";
import AccountScreen from "../screens/AccountScreen";

const Tab = createBottomTabNavigator<MainTabParamList>();

const getTabIcon = (routeName: string, focused: boolean) => {
  let iconName: keyof typeof Ionicons.glyphMap;

  switch (routeName) {
    case "Home":
      iconName = focused ? "home" : "home-outline";
      break;
    case "Portfolio":
      iconName = focused ? "briefcase" : "briefcase-outline";
      break;
    case "History":
      iconName = focused ? "bar-chart" : "bar-chart-outline";
      break;
    case "Account":
      iconName = focused ? "person" : "person-outline";
      break;
    default:
      iconName = "ellipse";
  }

  return iconName;
};

export default function MainTabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "rgba(10, 10, 10, 0.95)",
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 8),
          height: 60 + Math.max(insets.bottom, 8),
        },
        tabBarActiveTintColor: colors.textPrimary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          marginTop: 4,
        },
        tabBarIcon: ({ focused, color, size }) => {
          const iconName = getTabIcon(route.name, focused);
          return <Ionicons name={iconName} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Portfolio" component={PortfolioScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}
