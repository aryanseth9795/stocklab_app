import React from "react";
import { Text, StyleSheet, ActivityIndicator, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { colors, borderRadius, spacing, shadows } from "../../theme";

interface ButtonProps {
  title: string;
  variant?:
    | "primary"
    | "secondary"
    | "ghost"
    | "success"
    | "danger"
    | "gradient";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  fullWidth?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  style?: any;
}

export default function Button({
  title,
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  disabled,
  style,
  onPress,
  ...props
}: ButtonProps) {
  const scale = useSharedValue(1);
  const isGradient = variant === "gradient" || variant === "primary";

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  const containerStyles = [
    styles.base,
    styles[`size_${size}`],
    fullWidth && styles.fullWidth,
    disabled && styles.disabled,
    !isGradient && styles[variant],
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`text_${variant}`],
    styles[`textSize_${size}`],
    disabled && styles.textDisabled,
  ];

  const renderContent = () => (
    <>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === "ghost" || variant === "secondary"
              ? colors.textPrimary
              : "#FFF"
          }
        />
      ) : (
        <Text style={textStyles}>{title}</Text>
      )}
    </>
  );

  if (isGradient) {
    return (
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={[fullWidth && styles.fullWidth, style]}
        {...props}
      >
        <Animated.View style={scaleStyle}>
          <LinearGradient
            colors={colors.gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.base,
              styles[`size_${size}`],
              styles.gradientBase,
              disabled && styles.disabled,
            ]}
          >
            {renderContent()}
          </LinearGradient>
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      {...props}
    >
      <Animated.View style={[containerStyles, scaleStyle]}>
        {renderContent()}
      </Animated.View>
    </Pressable>
  );
}

const styles: any = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: borderRadius.md,
    flexDirection: "row",
  },
  gradientBase: {
    width: "100%",
    ...shadows.glow(colors.primary),
  },
  fullWidth: {
    width: "100%",
  },
  disabled: {
    opacity: 0.5,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  success: {
    backgroundColor: colors.success,
  },
  danger: {
    backgroundColor: colors.error,
  },
  size_sm: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    height: 32,
  },
  size_md: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    height: 48,
  },
  size_lg: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    height: 56,
  },
  text: {
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  text_primary: { color: "#FFF" },
  text_gradient: { color: "#FFF" },
  text_secondary: { color: colors.textPrimary },
  text_ghost: { color: colors.primary },
  text_success: { color: "#FFF" },
  text_danger: { color: "#FFF" },
  textDisabled: {
    color: colors.textDisabled,
  },
  textSize_sm: { fontSize: 13 },
  textSize_md: { fontSize: 16 },
  textSize_lg: { fontSize: 18 },
});
