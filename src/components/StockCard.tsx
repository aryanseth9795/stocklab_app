import React, { memo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, borderRadius, spacing, shadows, typography } from "../theme";
import { Stock } from "../types";

interface StockCardProps {
  stock: Stock;
  onPress?: () => void;
}

function StockCard({ stock, onPress }: StockCardProps) {
  const isUp = stock.stockChange >= 0;
  const gradientColors = isUp
    ? colors.gradients.success
    : colors.gradients.danger;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={styles.container}
    >
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
            <Text style={styles.price}>${stock.stockPrice.toFixed(2)}</Text>
            <Text style={styles.label}>Current Price</Text>
          </View>

          <View style={styles.changeContainer}>
            <Text
              style={[
                styles.changeValue,
                { color: isUp ? colors.emerald : colors.rose },
              ]}
            >
              {isUp ? "+" : ""}
              {stock.stockChange.toFixed(2)}
            </Text>
            <Text style={styles.label}>Change (USD)</Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// Memoize to prevent re-renders when stock data hasn't changed
export default memo(StockCard, (prevProps, nextProps) => {
  return (
    prevProps.stock.stocksymbol === nextProps.stock.stocksymbol &&
    prevProps.stock.stockPrice === nextProps.stock.stockPrice &&
    prevProps.stock.stockChange === nextProps.stock.stockChange
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
