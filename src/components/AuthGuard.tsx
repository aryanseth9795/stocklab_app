import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { colors, spacing, borderRadius } from "../theme";
import { Button } from "./ui";

interface AuthGuardProps {
  children: React.ReactNode;
  screenName?: string;
}

/**
 * Wraps protected content and shows login prompt if not authenticated
 */
export default function AuthGuard({
  children,
  screenName = "this section",
}: AuthGuardProps) {
  const { isAuthed } = useAuth();
  const navigation = useNavigation();

  if (!isAuthed) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="lock-closed" size={48} color={colors.textMuted} />
          </View>
          <Text style={styles.title}>Login Required</Text>
          <Text style={styles.subtitle}>
            Please login to access {screenName}
          </Text>
          <View style={styles.buttons}>
            <Button
              title="Login"
              variant="primary"
              fullWidth
              onPress={() => navigation.navigate("Login" as never)}
            />
            <Button
              title="Create Account"
              variant="ghost"
              fullWidth
              onPress={() => navigation.navigate("Signup" as never)}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  buttons: {
    width: "100%",
    gap: spacing.md,
  },
});
