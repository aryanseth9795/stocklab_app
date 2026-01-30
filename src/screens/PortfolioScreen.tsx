import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius } from "../theme";
import { Position, Tick, PortfolioBatch, PortfolioInfo, Stock } from "../types";
import { useSocket } from "../context/SocketContext";
import { BuySellModal, Card, AuthGuard } from "../components";
import cacheService from "../services/cacheService";

// Formatters
const fmtUSD = (n: number) =>
  `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtPct = (n: number) =>
  `${n >= 0 ? "+" : ""}${(Number.isFinite(n) ? n : 0).toFixed(2)}%`;

interface HoldingView {
  key: string;
  symbol: string;
  name: string;
  qty: number;
  avgBuy: number;
  invested: number;
  current: number;
  value: number;
  dayPct?: number;
  pnl: number;
  pnlPct: number;
}

export default function PortfolioScreen() {
  const { socket, isConnected } = useSocket();

  const [user, setUser] = useState<any>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [ticks, setTicks] = useState<Tick[]>([]);
  const [lastBatchTs, setLastBatchTs] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);

  // Track if we've loaded from cache
  const cacheLoadedRef = useRef(false);

  // Load cached portfolio on mount (instant loading)

  // Load cached portfolio on mount (instant loading)
  useEffect(() => {
    if (cacheLoadedRef.current) return;
    cacheLoadedRef.current = true;

    const loadCachedData = async () => {
      try {
        const cachedPortfolio = await cacheService.getPortfolioInfo();
        if (cachedPortfolio) {
          console.log("[Portfolio] Loaded from cache");
          if (cachedPortfolio.userdata) setUser(cachedPortfolio.userdata);
          if (cachedPortfolio.positions)
            setPositions(cachedPortfolio.positions);
          setLoading(false);
        }
      } catch (error) {
        console.error("[Portfolio] Error loading cache:", error);
      }
    };

    loadCachedData();
  }, []);

  // Handle portfolio info (from socket)
  const handlePortfolioInfo = useCallback((payload: PortfolioInfo) => {
    if (payload?.userdata) setUser(payload.userdata);
    if (Array.isArray(payload?.positions)) setPositions(payload.positions);
    setLoading(false);
    // Save to cache (service handles once-per-session logic)
    cacheService.savePortfolioInfo(payload);
  }, []);

  // Handle portfolio batch updates (live ticks - NOT cached)
  const handlePortfolioBatch = useCallback((payload: PortfolioBatch | null) => {
    if (!payload) {
      setTicks([]);
      setLastBatchTs("");
      return;
    }
    setTicks(Array.isArray(payload.ticks) ? payload.ticks : []);
    setLastBatchTs(payload.ts || "");
    setRefreshing(false);
  }, []);

  // Subscribe to portfolio data
  useEffect(() => {
    if (!socket) return;

    socket.on("Portfolio_info", handlePortfolioInfo);
    socket.on("portfolio:batch", handlePortfolioBatch);
    socket.emit("portfolio");

    return () => {
      socket.off("Portfolio_info", handlePortfolioInfo);
      socket.off("portfolio:batch", handlePortfolioBatch);
      socket.emit("portfolio:stop");
    };
  }, [socket, handlePortfolioInfo, handlePortfolioBatch]);

  // Refresh handler
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    socket?.emit("portfolio");
  }, [socket]);

  // Build tick map
  const bySymbol = useMemo(() => {
    const m = new Map<string, Tick>();
    for (const t of ticks) {
      const k = (t.stocksymbol || t.stockName || "").toUpperCase();
      if (k) m.set(k, t);
    }
    return m;
  }, [ticks]);

  // Derive holdings and totals
  const { rows, totals } = useMemo(() => {
    const out: HoldingView[] = [];
    let investedSum = 0;
    let currentSum = 0;

    for (const p of positions) {
      const symbolU = (p.stockSymbol || p.stockName).toUpperCase();
      const tick = bySymbol.get(symbolU);

      const avgBuy = p.stockQuantity ? p.stockTotal / p.stockQuantity : 0;
      const livePrice = tick?.stockPrice ?? p.stockPrice;
      const value = livePrice * p.stockQuantity;

      investedSum += p.stockTotal;
      currentSum += value;

      out.push({
        key: p.id,
        symbol: symbolU,
        name: symbolU,
        qty: p.stockQuantity,
        avgBuy,
        invested: p.stockTotal,
        current: livePrice,
        value,
        dayPct: tick?.stockChangePercentage,
        pnl: value - p.stockTotal,
        pnlPct: p.stockTotal
          ? ((value - p.stockTotal) / p.stockTotal) * 100
          : 0,
      });
    }

    return {
      rows: out,
      totals: {
        invested: investedSum,
        current: currentSum,
        pnl: currentSum - investedSum,
        pnlPct: investedSum
          ? ((currentSum - investedSum) / investedSum) * 100
          : 0,
      },
    };
  }, [positions, bySymbol]);

  const handleRowPress = (row: HoldingView) => {
    const tick = bySymbol.get(row.symbol);
    const stock: Stock = {
      stockName: row.name.toLowerCase(),
      stocksymbol: row.symbol,
      stockPrice: row.current,
      stockPriceINR: tick?.stockPriceINR ?? row.current * 86,
      stockChange: tick?.stockChange ?? 0,
      stockChangeINR: tick?.stockChangeINR ?? 0,
      stockChangePercentage: tick?.stockChangePercentage ?? 0,
      ts: tick?.ts ?? new Date().toLocaleTimeString(),
    };
    setSelectedStock(stock);
    setModalVisible(true);
  };

  const lastTsLabel = useMemo(() => {
    if (!lastBatchTs) return "";
    try {
      const d = new Date(lastBatchTs);
      return isNaN(d.getTime()) ? lastBatchTs : d.toLocaleTimeString();
    } catch {
      return lastBatchTs;
    }
  }, [lastBatchTs]);

  return (
    <AuthGuard screenName="your portfolio">
      {loading ? (
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.indigo} />
            <Text style={styles.loadingText}>Loading portfolio...</Text>
          </View>
        </SafeAreaView>
      ) : (
        <SafeAreaView style={styles.container}>
          <ScrollView
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
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>
                  {user?.name ? `Hi, ${user.name}` : "Portfolio"}
                </Text>
                <Text style={styles.subtitle}>Live P&L tracking</Text>
              </View>
              <View style={styles.tickBadge}>
                <Ionicons
                  name="time-outline"
                  size={14}
                  color={colors.textMuted}
                />
                <Text style={styles.tickText}>
                  {lastTsLabel ? lastTsLabel : "Waiting..."}
                </Text>
              </View>
            </View>

            {/* KPI Cards */}
            <View style={styles.kpiGrid}>
              <View style={styles.kpiCard}>
                <View style={styles.kpiHeader}>
                  <Text style={styles.kpiLabel}>Wallet Balance</Text>
                  <Ionicons
                    name="wallet-outline"
                    size={16}
                    color={colors.textMuted}
                  />
                </View>
                <Text style={styles.kpiValue}>
                  {fmtUSD(user?.balance ?? 0)}
                </Text>
                <Text style={styles.kpiSubtext}>Available funds</Text>
              </View>

              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Invested</Text>
                <Text style={styles.kpiValue}>{fmtUSD(totals.invested)}</Text>
                <Text style={styles.kpiSubtext}>Total principal</Text>
              </View>

              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Current Value</Text>
                <Text style={styles.kpiValue}>{fmtUSD(totals.current)}</Text>
                <Text style={styles.kpiSubtext}>Mark-to-market</Text>
              </View>

              <View style={styles.kpiCard}>
                <View style={styles.kpiHeader}>
                  <Text style={styles.kpiLabel}>Unrealized P&L</Text>
                  <Ionicons
                    name={totals.pnl >= 0 ? "trending-up" : "trending-down"}
                    size={16}
                    color={totals.pnl >= 0 ? colors.emerald : colors.rose}
                  />
                </View>
                <Text
                  style={[
                    styles.kpiValue,
                    totals.pnl >= 0 ? styles.gain : styles.loss,
                  ]}
                >
                  {fmtUSD(totals.pnl)}
                </Text>
                <Text
                  style={[
                    styles.kpiPct,
                    totals.pnl >= 0 ? styles.gain : styles.loss,
                  ]}
                >
                  {fmtPct(totals.pnlPct)}
                </Text>
              </View>
            </View>

            {/* Holdings */}
            <Card style={styles.holdingsCard}>
              <Text style={styles.holdingsTitle}>Holdings</Text>
              {rows.length === 0 ? (
                <Text style={styles.emptyText}>
                  No holdings yet. Start trading!
                </Text>
              ) : (
                rows.map((row) => {
                  const up = row.pnl >= 0;
                  const dayUp = (row.dayPct ?? 0) >= 0;
                  return (
                    <TouchableOpacity
                      key={row.key}
                      style={styles.holdingRow}
                      onPress={() => handleRowPress(row)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.holdingLeft}>
                        <View style={styles.holdingDot} />
                        <View>
                          <Text style={styles.holdingSymbol}>{row.symbol}</Text>
                          <Text style={styles.holdingQty}>
                            {row.qty.toFixed(4)} units
                          </Text>
                        </View>
                      </View>
                      <View style={styles.holdingRight}>
                        <View style={styles.holdingMeta}>
                          <Text style={styles.holdingValue}>
                            {fmtUSD(row.value)}
                          </Text>
                          <Text
                            style={[
                              styles.holdingChange,
                              dayUp ? styles.gain : styles.loss,
                            ]}
                          >
                            {fmtPct(row.dayPct ?? 0)}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.holdingPnl,
                            up ? styles.gain : styles.loss,
                          ]}
                        >
                          {fmtUSD(row.pnl)} ({fmtPct(row.pnlPct)})
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </Card>
          </ScrollView>

          <BuySellModal
            visible={modalVisible}
            onClose={() => setModalVisible(false)}
            stock={selectedStock}
            onSuccess={handleRefresh}
          />
        </SafeAreaView>
      )}
    </AuthGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  tickBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tickText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  kpiCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
  },
  kpiHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  kpiLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  kpiSubtext: {
    fontSize: 10,
    color: colors.textDisabled,
    marginTop: spacing.sm,
  },
  kpiPct: {
    fontSize: 12,
    marginTop: spacing.xs,
  },
  gain: {
    color: colors.emerald,
  },
  loss: {
    color: colors.rose,
  },
  holdingsCard: {
    padding: spacing.md,
  },
  holdingsTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    paddingVertical: spacing.xl,
  },
  holdingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  holdingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  holdingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textDisabled,
  },
  holdingSymbol: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  holdingQty: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  holdingRight: {
    alignItems: "flex-end",
  },
  holdingMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  holdingValue: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  holdingChange: {
    fontSize: 11,
  },
  holdingPnl: {
    fontSize: 11,
    marginTop: 2,
  },
});
