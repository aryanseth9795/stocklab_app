import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, typography } from "../theme";
import { useAuth } from "../context/AuthContext";
import { getProfitLoss } from "../api";
import { Card, AuthGuard } from "../components";
import { formatINR } from "../utils/formatINR";

type TimeFilter = 1 | 7 | 30 | 365;

export default function DashboardScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>(365);
  const [stats, setStats] = useState<{
    realizedPL: number;
    totalBuyAmount: number;
    totalSellAmount: number;
    totalBuyCount: number;
    totalSellCount: number;
    totalTrades: number;
    avgTradeSize: number;
    symbolBreakdown: Array<{
      symbol: string;
      realizedPL: number;
      totalBuy: number;
      totalSell: number;
    }>;
  } | null>(null);

  // Load P/L data
  const loadPLData = async (days: number) => {
    try {
      console.log("Loading P/L data for days:", days);
      const result = await getProfitLoss(days);
      console.log("P/L API result:", result);
      if (result.success && result.data) {
        setStats(result.data);
      } else {
        console.error("P/L API error:", result.message);
      }
    } catch (error) {
      console.error("Failed to load P/L:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPLData(timeFilter);
  }, [timeFilter]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadPLData(timeFilter);
  };

  const timeFilters: { key: TimeFilter; label: string }[] = [
    { key: 1, label: "Today" },
    { key: 7, label: "7 Days" },
    { key: 30, label: "30 Days" },
    { key: 365, label: "All Time" },
  ];

  return (
    <AuthGuard screenName="your dashboard">
      <SafeAreaView style={styles.container} edges={["top"]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <View style={styles.headerSpacer} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.indigo} />
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.indigo}
              />
            }
          >
            {/* Time Filter */}
            <View style={styles.filterRow}>
              {timeFilters.map((f) => (
                <TouchableOpacity
                  key={f.key}
                  style={[
                    styles.filterBtn,
                    timeFilter === f.key && styles.filterBtnActive,
                  ]}
                  onPress={() => setTimeFilter(f.key)}
                >
                  <Text
                    style={[
                      styles.filterText,
                      timeFilter === f.key && styles.filterTextActive,
                    ]}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Main P/L Card */}
            <Card style={styles.plCard}>
              <Text style={styles.plLabel}>Realized P/L</Text>
              <Text
                style={[
                  styles.plValue,
                  (stats?.realizedPL ?? 0) >= 0 ? styles.profit : styles.loss,
                ]}
              >
                {(stats?.realizedPL ?? 0) >= 0 ? "+" : ""}
                {formatINR(stats?.realizedPL ?? 0).compact}
              </Text>
              <Text style={styles.plExact}>
                {formatINR(stats?.realizedPL ?? 0).exact}
              </Text>
              <View style={styles.plDetails}>
                <View style={styles.plDetailItem}>
                  <Text style={styles.plDetailLabel}>Wallet</Text>
                  <Text style={styles.plDetailValue}>
                    {formatINR(user?.balance ?? 0).compact}
                  </Text>
                  <Text style={styles.plDetailExact}>
                    {formatINR(user?.balance ?? 0).exact}
                  </Text>
                </View>
                <View style={styles.plDetailItem}>
                  <Text style={styles.plDetailLabel}>Invested</Text>
                  <Text style={styles.plDetailValue}>
                    {formatINR(user?.totalInvested ?? 0).compact}
                  </Text>
                  <Text style={styles.plDetailExact}>
                    {formatINR(user?.totalInvested ?? 0).exact}
                  </Text>
                </View>
              </View>
            </Card>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Ionicons
                  name="swap-horizontal"
                  size={20}
                  color={colors.indigo}
                />
                <Text style={styles.statValue}>{stats?.totalTrades ?? 0}</Text>
                <Text style={styles.statLabel}>Total Trades</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="trending-up" size={20} color={colors.emerald} />
                <Text style={styles.statValue}>
                  {stats?.totalBuyCount ?? 0}
                </Text>
                <Text style={styles.statLabel}>Buys</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="trending-down" size={20} color={colors.rose} />
                <Text style={styles.statValue}>
                  {stats?.totalSellCount ?? 0}
                </Text>
                <Text style={styles.statLabel}>Sells</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="calculator" size={20} color={colors.warning} />
                <Text style={styles.statValue}>
                  {formatINR(stats?.avgTradeSize ?? 0).compact}
                </Text>
                <Text style={styles.statLabel}>Avg Trade</Text>
              </View>
            </View>

            {/* Volume Breakdown */}
            <Card style={styles.volumeCard}>
              <Text style={styles.sectionTitle}>Volume Breakdown</Text>
              <View style={styles.volumeRow}>
                <View style={styles.volumeItem}>
                  <View
                    style={[
                      styles.volumeDot,
                      { backgroundColor: colors.emerald },
                    ]}
                  />
                  <Text style={styles.volumeLabel}>Buy Volume</Text>
                  <Text style={styles.volumeValue}>
                    {formatINR(stats?.totalBuyAmount ?? 0).compact}
                  </Text>
                  <Text style={styles.volumeExact}>
                    {formatINR(stats?.totalBuyAmount ?? 0).exact}
                  </Text>
                </View>
                <View style={styles.volumeItem}>
                  <View
                    style={[styles.volumeDot, { backgroundColor: colors.rose }]}
                  />
                  <Text style={styles.volumeLabel}>Sell Volume</Text>
                  <Text style={styles.volumeValue}>
                    {formatINR(stats?.totalSellAmount ?? 0).compact}
                  </Text>
                  <Text style={styles.volumeExact}>
                    {formatINR(stats?.totalSellAmount ?? 0).exact}
                  </Text>
                </View>
              </View>
            </Card>

            {/* Symbol Breakdown - Top 5 */}
            {stats?.symbolBreakdown && stats.symbolBreakdown.length > 0 && (
              <Card style={styles.symbolCard}>
                <Text style={styles.sectionTitle}>Top Symbols</Text>
                {stats.symbolBreakdown
                  .sort(
                    (a, b) => Math.abs(b.realizedPL) - Math.abs(a.realizedPL),
                  )
                  .slice(0, 5)
                  .map((item) => (
                    <View key={item.symbol} style={styles.symbolItem}>
                      <Text style={styles.symbolName}>{item.symbol}</Text>
                      <Text
                        style={[
                          styles.symbolPL,
                          item.realizedPL >= 0 ? styles.profit : styles.loss,
                        ]}
                      >
                        {item.realizedPL >= 0 ? "+" : ""}
                        {formatINR(item.realizedPL).compact}
                      </Text>
                    </View>
                  ))}
              </Card>
            )}

            {!stats?.symbolBreakdown ||
              (stats.symbolBreakdown.length === 0 && (
                <Text style={styles.emptyText}>No trades in this period</Text>
              ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </AuthGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  headerSpacer: {
    width: 36,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.huge,
  },
  filterRow: {
    flexDirection: "row",
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  filterBtnActive: {
    backgroundColor: colors.indigo,
    borderColor: colors.indigo,
  },
  filterText: {
    fontSize: 11,
    fontWeight: "500",
    color: colors.textMuted,
  },
  filterTextActive: {
    color: "#fff",
  },
  plCard: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    marginBottom: spacing.lg,
  },
  plLabel: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  plValue: {
    fontSize: 36,
    fontWeight: "700",
    letterSpacing: -1,
  },
  plExact: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: 4,
  },
  profit: {
    color: colors.emerald,
  },
  loss: {
    color: colors.rose,
  },
  plDetails: {
    flexDirection: "row",
    gap: spacing.xl,
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  plDetailItem: {
    alignItems: "center",
  },
  plDetailLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 4,
  },
  plDetailValue: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  plDetailExact: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    width: "48%",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: "center",
    gap: spacing.xs,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  volumeCard: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  volumeRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  volumeItem: {
    alignItems: "center",
    gap: spacing.xs,
  },
  volumeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  volumeLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  volumeValue: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  volumeExact: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  symbolCard: {
    marginBottom: spacing.lg,
  },
  symbolItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  symbolName: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  symbolPL: {
    fontSize: 13,
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    paddingVertical: spacing.lg,
  },
});
