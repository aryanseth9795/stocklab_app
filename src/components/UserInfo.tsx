import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { colors, borderRadius, spacing, typography, shadows } from "../theme";
import { Button } from "./ui";

interface UserInfoProps {
  name: string;
  walletAmount: number;
  portfolioAmount: number; // Current market value
  investedAmount?: number; // Original invested amount for P&L calculation
  isAuthed: boolean;
  onLoginPress?: () => void;
}

export default function UserInfo({
  name,
  walletAmount,
  portfolioAmount,
  investedAmount = 0,
  isAuthed,
  onLoginPress,
}: UserInfoProps) {
  if (!isAuthed) {
    return (
      <LinearGradient
        colors={colors.gradients.card}
        style={styles.guestCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons
          name="shield-checkmark-outline"
          size={32}
          color={colors.primary}
          style={{ marginBottom: spacing.sm }}
        />
        <Text style={styles.guestTitle}>Start Paper Trading</Text>
        <Text style={styles.guestText}>
          Join thousands of traders learning risk-free.
        </Text>
        <Button
          title="Login / Signup"
          variant="gradient"
          size="sm"
          fullWidth
          style={{ marginTop: spacing.md }}
          onPress={onLoginPress}
        />
      </LinearGradient>
    );
  }

  const totalValue = (walletAmount || 0) + (portfolioAmount || 0);

  // Calculate P&L
  const pnl = portfolioAmount - investedAmount;
  const pnlPercent = investedAmount > 0 ? (pnl / investedAmount) * 100 : 0;
  const isProfit = pnl >= 0;

  return (
    <LinearGradient
      colors={["#312E81", "#4338CA", "#1E1B4B"]} // Deep Indigo Gradient
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      {/* Background decoration */}
      <View style={styles.glow} />

      <View style={styles.headerRow}>
        <View>
          <Text style={styles.greetingLabel}>Welcome back,</Text>
          <Text style={styles.greetingName}>{name}</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.balanceContainer}>
        <Text style={styles.balanceLabel}>Total Net Worth</Text>
        <Text
          style={[
            styles.balanceValue,
            { color: isProfit ? colors.emerald : colors.rose },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </Text>
        {investedAmount > 0 && (
          <View
            style={[
              styles.pnlBadge,
              {
                backgroundColor: isProfit
                  ? colors.emeraldLight
                  : colors.roseLight,
              },
            ]}
          >
            <Ionicons
              name={isProfit ? "trending-up" : "trending-down"}
              size={14}
              color={isProfit ? colors.emerald : colors.rose}
            />
            <Text
              style={[
                styles.pnlText,
                { color: isProfit ? colors.emerald : colors.rose },
              ]}
            >
              {isProfit ? "+" : ""}
              {pnl.toFixed(2)} ({pnlPercent.toFixed(1)}%)
            </Text>
          </View>
        )}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Available Cash</Text>
          <Text style={styles.statValue}>
            ${walletAmount?.toLocaleString()}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Invested</Text>
          <Text style={styles.statValue}>
            ${portfolioAmount?.toLocaleString()}
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.glow("#4338CA"),
    overflow: "hidden",
  },
  guestCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255,255,255,0.1)",
  },

  // Header
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  greetingLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.7)",
  },
  greetingName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFF",
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 12,
  },

  // Balance
  balanceContainer: {
    marginBottom: spacing.md,
    alignItems: "center",
  },
  balanceLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 2,
    textAlign: "center",
  },
  balanceValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: -0.5,
    textAlign: "center",
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  divider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  statLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFF",
  },

  // P&L
  pnlBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    gap: 4,
    marginTop: spacing.sm,
  },
  pnlText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // Guest
  guestTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  guestText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
});
