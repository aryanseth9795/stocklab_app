import React, { memo, useEffect } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  interpolateColor,
  FadeInDown,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { colors, borderRadius, spacing, shadows, typography } from "../theme";
import { Stock } from "../types";

interface StockCardProps {
  stock: Stock;
  onPress?: () => void;
  index?: number;
}

function StockCard({ stock, onPress, index = 0 }: StockCardProps) {
  const isUp = stock.stockChange >= 0;
  const scale = useSharedValue(1);
  const flash = useSharedValue(0);
  const prevPrice = React.useRef(stock.stockPrice);

  // Price change flash animation
  useEffect(() => {
    if (prevPrice.current !== stock.stockPrice) {
      prevPrice.current = stock.stockPrice;
      flash.value = withSequence(
        withTiming(1, { duration: 100 }),
        withTiming(0, { duration: 300 }),
      );
    }
  }, [stock.stockPrice, flash]);

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const flashStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      flash.value,
      [0, 1],
      [isUp ? colors.emerald : colors.rose, isUp ? "#ffffff" : "#ffffff"],
    ),
    textShadowColor: interpolateColor(
      flash.value,
      [0, 1],
      ["transparent", isUp ? "rgba(52,211,153,0.8)" : "rgba(251,113,133,0.8)"],
    ),
    textShadowRadius: flash.value * 6,
    textShadowOffset: { width: 0, height: 0 },
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  // Staggered entrance animation
  const enteringAnimation = FadeInDown.delay(Math.min(index * 50, 300))
    .duration(400)
    .springify();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      {/* Outer view for layout animation */}
      <Animated.View entering={enteringAnimation}>
        {/* Inner view for transform animation */}
        <Animated.View style={[styles.container, scaleStyle]}>
          <LinearGradient
            colors={colors.gradients.card}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            {/* Top Glow/Border Accent */}
            <View
              style={[
                styles.accentBorder,
                { backgroundColor: isUp ? colors.emerald : colors.rose },
              ]}
            />

            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.symbol}>{stock.stocksymbol}</Text>
                <Text style={styles.name}>{stock.stockName}</Text>
              </View>

              <View
                style={[styles.badge, isUp ? styles.badgeUp : styles.badgeDown]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    { color: isUp ? colors.emerald : colors.rose },
                  ]}
                >
                  {isUp ? "▲" : "▼"}{" "}
                  {Math.abs(stock.stockChangePercentage).toFixed(2)}%
                </Text>
              </View>
            </View>

            {/* Price & Change */}
            <View style={styles.priceRow}>
              <View>
                <Text style={styles.price}>
                  ₹{stock.stockPriceINR.toFixed(2)}
                </Text>
                <Text style={styles.label}>Current Price</Text>
              </View>

              <View style={styles.changeContainer}>
                <Animated.Text style={[styles.changeValue, flashStyle]}>
                  {isUp ? "+" : ""}
                  {stock.stockChangeINR.toFixed(2)}
                </Animated.Text>
                <Text style={styles.label}>Change (₹)</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

export default memo(StockCard, (prevProps, nextProps) => {
  return (
    prevProps.stock.stocksymbol === nextProps.stock.stocksymbol &&
    prevProps.stock.stockPrice === nextProps.stock.stockPrice &&
    prevProps.stock.stockChange === nextProps.stock.stockChange &&
    prevProps.index === nextProps.index
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  accentBorder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    opacity: 0.5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
  },
  symbol: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  name: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  badgeUp: {
    backgroundColor: "rgba(52, 211, 153, 0.1)",
    borderColor: "rgba(52, 211, 153, 0.2)",
  },
  badgeDown: {
    backgroundColor: "rgba(251, 113, 133, 0.1)",
    borderColor: "rgba(251, 113, 133, 0.2)",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  price: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  label: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "500",
  },
  changeContainer: {
    alignItems: "flex-end",
  },
  changeValue: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
});
