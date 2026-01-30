import React, { ReactNode } from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { colors, borderRadius, spacing } from "../../theme";

interface CardProps {
  children: ReactNode;
  style?: ViewStyle;
  variant?: "default" | "elevated";
}

export default function Card({
  children,
  style,
  variant = "default",
}: CardProps) {
  return (
    <View
      style={[styles.card, variant === "elevated" && styles.elevated, style]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  elevated: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
