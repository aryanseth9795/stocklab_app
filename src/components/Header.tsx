import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius } from "../theme";

interface HeaderProps {
  isConnected?: boolean;
}

export default function Header({ isConnected = false }: HeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.brandRow}>
        {/* Logo */}
        <LinearGradient
          colors={["#6366F1", "#8B5CF6", "#A855F7"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.logoContainer}
        >
          <Ionicons name="trending-up" size={16} color="#FFF" />
        </LinearGradient>

        {/* Brand Name */}
        <View style={styles.brandTextContainer}>
          <Text style={styles.brandName}>
            Stock<Text style={styles.brandHighlight}>Labs</Text>
          </Text>
          <Text style={styles.tagline}>Paper Trading</Text>
        </View>

        {/* Connection Status */}
        <View style={styles.statusPill}>
          <View
            style={[
              styles.statusDot,
              isConnected ? styles.dotOnline : styles.dotOffline,
            ]}
          />
          <Text style={styles.statusText}>{isConnected ? "Live" : "..."}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
    paddingBottom: spacing.md,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  brandTextContainer: {
    flex: 1,
  },
  brandName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  brandHighlight: {
    color: "#818CF8",
  },
  tagline: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: "500",
    marginTop: -1,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(99, 102, 241, 0.2)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotOnline: {
    backgroundColor: colors.emerald,
  },
  dotOffline: {
    backgroundColor: colors.warning,
  },
  statusText: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: "500",
  },
});
