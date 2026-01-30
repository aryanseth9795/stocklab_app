import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius } from "../theme";
import { Order, Transaction } from "../types";
import { getTradeHistory, getTransactions } from "../api";
import { useAuth } from "../context/AuthContext";
import { Card, AuthGuard } from "../components";
import cacheService from "../services/cacheService";

type Tab = "trade" | "transaction";

export default function HistoryScreen() {
  const { isAuthed } = useAuth();
  const [tab, setTab] = useState<Tab>("trade");
  const [trades, setTrades] = useState<Order[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Track if cache has been loaded
  const cacheLoadedRef = useRef(false);

  // Load cached data on mount for instant display
  useEffect(() => {
    if (cacheLoadedRef.current || !isAuthed) return;
    cacheLoadedRef.current = true;

    const loadCachedData = async () => {
      try {
        // Load both caches for instant tab switching
        const [cachedTrades, cachedTransactions] = await Promise.all([
          cacheService.getTradeHistory(),
          cacheService.getTransactions(),
        ]);

        if (cachedTrades && cachedTrades.length > 0) {
          console.log(
            "[History] Loaded",
            cachedTrades.length,
            "trades from cache",
          );
          setTrades(cachedTrades);
        }
        if (cachedTransactions && cachedTransactions.length > 0) {
          console.log(
            "[History] Loaded",
            cachedTransactions.length,
            "transactions from cache",
          );
          setTransactions(cachedTransactions);
        }

        // If we have cached data, stop loading immediately
        if (
          (tab === "trade" && cachedTrades) ||
          (tab === "transaction" && cachedTransactions)
        ) {
          setLoading(false);
        }
      } catch (error) {
        console.error("[History] Error loading cache:", error);
      }
    };

    loadCachedData();
  }, [isAuthed, tab]);

  const fetchData = useCallback(async () => {
    if (!isAuthed) return;

    // Only show loading if we have no data
    if (
      (tab === "trade" && trades.length === 0) ||
      (tab === "transaction" && transactions.length === 0)
    ) {
      setLoading(true);
    }

    try {
      if (tab === "trade") {
        const result = await getTradeHistory();
        if (result.success) {
          setTrades(result.orders);
          // Save to cache (service handles once-per-session logic)
          cacheService.saveTradeHistory(result.orders);
        }
      } else {
        const result = await getTransactions();
        if (result.success) {
          setTransactions(result.transactions);
          // Save to cache (service handles once-per-session logic)
          cacheService.saveTransactions(result.transactions);
        }
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab, isAuthed, trades.length, transactions.length]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const renderTradeItem = ({ item }: { item: Order }) => {
    const isBuy = item.type === "buy";
    return (
      <Card style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <View style={styles.itemLeft}>
            <View
              style={[
                styles.typeBadge,
                isBuy ? styles.typeBuy : styles.typeSell,
              ]}
            >
              <Text
                style={[
                  styles.typeText,
                  isBuy ? styles.typeTextBuy : styles.typeTextSell,
                ]}
              >
                {item.type.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.symbol}>{item.stockSymbol}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              item.status === "completed"
                ? styles.statusSuccess
                : styles.statusPending,
            ]}
          >
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
        <View style={styles.itemBody}>
          <View style={styles.itemRow}>
            <Text style={styles.label}>Quantity</Text>
            <Text style={styles.value}>{item.stockQuantity.toFixed(4)}</Text>
          </View>
          <View style={styles.itemRow}>
            <Text style={styles.label}>Price</Text>
            <Text style={styles.value}>${item.stockPrice.toFixed(2)}</Text>
          </View>
          <View style={styles.itemRow}>
            <Text style={styles.label}>Total</Text>
            <Text style={styles.valueTotal}>${item.stockTotal.toFixed(2)}</Text>
          </View>
        </View>
        <Text style={styles.timestamp}>
          {new Date(item.createdAt).toLocaleString()}
        </Text>
      </Card>
    );
  };

  const renderTransactionItem = ({ item }: { item: Transaction }) => {
    const isDebit = item.type === "Debit";
    return (
      <Card style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <View style={styles.itemLeft}>
            <Ionicons
              name={isDebit ? "arrow-up-circle" : "arrow-down-circle"}
              size={24}
              color={isDebit ? colors.rose : colors.emerald}
            />
            <Text style={styles.txType}>{item.type}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              item.status === "completed"
                ? styles.statusSuccess
                : styles.statusPending,
            ]}
          >
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
        <View style={styles.itemBody}>
          <View style={styles.itemRow}>
            <Text style={styles.label}>Opening Balance</Text>
            <Text style={styles.value}>${item.openingBalance.toFixed(2)}</Text>
          </View>
          <View style={styles.itemRow}>
            <Text style={styles.label}>Used</Text>
            <Text style={[styles.value, isDebit ? styles.loss : styles.gain]}>
              {isDebit ? "-" : "+"}${item.usedBalance.toFixed(2)}
            </Text>
          </View>
          <View style={styles.itemRow}>
            <Text style={styles.label}>Closing Balance</Text>
            <Text style={styles.valueTotal}>
              ${item.closingBalance.toFixed(2)}
            </Text>
          </View>
        </View>
        <Text style={styles.timestamp}>
          {new Date(item.createdAt).toLocaleString()}
        </Text>
      </Card>
    );
  };

  const data = tab === "trade" ? trades : transactions;

  return (
    <AuthGuard screenName="your history">
      <SafeAreaView style={styles.container}>
        {/* Centered Toggle Slider */}
        <View style={styles.header}>
          <View style={styles.toggle}>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                tab === "trade" && styles.toggleBtnActive,
              ]}
              onPress={() => setTab("trade")}
            >
              <Text
                style={[
                  styles.toggleText,
                  tab === "trade" && styles.toggleTextActive,
                ]}
              >
                Trades
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                tab === "transaction" && styles.toggleBtnActive,
              ]}
              onPress={() => setTab("transaction")}
            >
              <Text
                style={[
                  styles.toggleText,
                  tab === "transaction" && styles.toggleTextActive,
                ]}
              >
                Transactions
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.indigo} />
          </View>
        ) : (
          <FlatList
            data={data as any}
            keyExtractor={(item: any) => item.id}
            renderItem={
              tab === "trade"
                ? (renderTradeItem as any)
                : (renderTransactionItem as any)
            }
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.indigo}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {tab === "trade"
                    ? "No trades found."
                    : "No transactions found."}
                </Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </AuthGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    // flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  toggle: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
  },
  toggleBtnActive: {
    backgroundColor: colors.indigo,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textMuted,
  },
  toggleTextActive: {
    color: "#ffffff",
    fontWeight: "600",
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    paddingVertical: spacing.xxxl,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  itemCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  typeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  typeBuy: {
    backgroundColor: colors.emeraldLight,
  },
  typeSell: {
    backgroundColor: colors.roseLight,
  },
  typeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  typeTextBuy: {
    color: colors.emerald,
  },
  typeTextSell: {
    color: colors.rose,
  },
  symbol: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  txType: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  statusSuccess: {
    backgroundColor: colors.emeraldLight,
  },
  statusPending: {
    backgroundColor: "rgba(245, 158, 11, 0.1)",
  },
  statusText: {
    fontSize: 10,
    color: colors.textMuted,
    textTransform: "capitalize",
  },
  itemBody: {
    gap: spacing.xs,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  label: {
    fontSize: 12,
    color: colors.textMuted,
  },
  value: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  valueTotal: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  gain: {
    color: colors.emerald,
  },
  loss: {
    color: colors.rose,
  },
  timestamp: {
    fontSize: 10,
    color: colors.textDisabled,
    marginTop: spacing.md,
  },
  authRequired: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
  },
  authTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  authText: {
    fontSize: 14,
    color: colors.textMuted,
  },
});
