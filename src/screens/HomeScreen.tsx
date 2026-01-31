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
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { colors, spacing, borderRadius } from "../theme";
import { Stock, Position, Tick, PortfolioBatch, PortfolioInfo } from "../types";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { StockCard, BuySellModal, UserInfo, Header } from "../components";
import cacheService from "../services/cacheService";

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { user, isAuthed } = useAuth();
  const { socket, isConnected } = useSocket();

  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isFromCache, setIsFromCache] = useState(false);

  // Portfolio state for dynamic net worth
  const [positions, setPositions] = useState<Position[]>([]);
  const [ticks, setTicks] = useState<Tick[]>([]);

  // Track if we've loaded from cache to avoid duplicate loading
  const cacheLoadedRef = useRef(false);

  // Load cached data on mount (instant loading)
  useEffect(() => {
    if (cacheLoadedRef.current) return;
    cacheLoadedRef.current = true;

    const loadCachedData = async () => {
      try {
        // Load cached stocks for instant display
        const cachedStocks = await cacheService.getLandingStocks();
        if (cachedStocks && cachedStocks.length > 0) {
          console.log(
            "[Home] Loaded",
            cachedStocks.length,
            "stocks from cache",
          );
          setStocks(cachedStocks);
          setIsFromCache(true);
          setLoading(false);
        }

        // Load cached portfolio info for authenticated users
        if (isAuthed) {
          const cachedPortfolio = await cacheService.getPortfolioInfo();
          if (cachedPortfolio?.positions) {
            console.log(
              "[Home] Loaded",
              cachedPortfolio.positions.length,
              "positions from cache",
            );
            setPositions(cachedPortfolio.positions);
          }
        }
      } catch (error) {
        console.error("[Home] Error loading cache:", error);
      }
    };

    loadCachedData();
  }, [isAuthed]);

  // Handle landing data updates (from socket)
  const handleLandingData = useCallback((data: Stock[]) => {
    if (Array.isArray(data)) {
      setStocks(data);
      setLoading(false);
      setRefreshing(false);
      setIsFromCache(false);
      // Save to cache (service handles once-per-session logic)
      cacheService.saveLandingStocks(data);
    }
  }, []);

  // Handle portfolio info
  const handlePortfolioInfo = useCallback((payload: PortfolioInfo) => {
    if (Array.isArray(payload?.positions)) {
      setPositions(payload.positions);
      // Save portfolio to cache (service handles once-per-session logic)
      cacheService.savePortfolioInfo(payload);
    }
  }, []);

  // Handle portfolio batch updates (live prices)
  const handlePortfolioBatch = useCallback((payload: PortfolioBatch | null) => {
    if (payload && Array.isArray(payload.ticks)) {
      setTicks(payload.ticks);
    }
  }, []);

  // Subscribe to landing data and portfolio
  useEffect(() => {
    if (!socket) return;

    socket.on("landing", handleLandingData);
    socket.emit("landing");

    // Subscribe to portfolio for authenticated users
    if (isAuthed) {
      socket.on("Portfolio_info", handlePortfolioInfo);
      socket.on("portfolio:batch", handlePortfolioBatch);
      socket.emit("portfolio");
    }

    return () => {
      socket.off("landing", handleLandingData);
      socket.emit("landing:stop");
      if (isAuthed) {
        socket.off("Portfolio_info", handlePortfolioInfo);
        socket.off("portfolio:batch", handlePortfolioBatch);
        socket.emit("portfolio:stop");
      }
    };
  }, [
    socket,
    isAuthed,
    handleLandingData,
    handlePortfolioInfo,
    handlePortfolioBatch,
  ]);

  // Calculate current portfolio value from live ticks
  const currentPortfolioValue = useMemo(() => {
    if (!positions.length) return 0;

    // Build tick map
    const tickMap = new Map<string, Tick>();
    for (const t of ticks) {
      const key = (t.stocksymbol || t.stockName || "").toUpperCase();
      if (key) tickMap.set(key, t);
    }

    // Calculate current value
    let totalValue = 0;
    for (const p of positions) {
      const symbol = (p.stockSymbol || p.stockName).toUpperCase();
      const tick = tickMap.get(symbol);
      const livePrice = tick?.stockPrice ?? p.stockPrice;
      totalValue += livePrice * p.stockQuantity;
    }
    return totalValue;
  }, [positions, ticks]);

  // Refresh handler
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    socket?.emit("landing");
    if (isAuthed) {
      socket?.emit("portfolio");
    }
  }, [socket, isAuthed]);

  // Navigate to stock detail screen
  const handleStockPress = (stock: Stock) => {
    navigation.navigate("StockDetail", { stock });
  };

  // Close modal and refresh
  const handleModalClose = () => {
    setModalVisible(false);
    setSelectedStock(null);
  };

  const handleOrderSuccess = () => {
    // Refresh user data after successful order
    socket?.emit("landing");
  };

  const renderHeader = () => (
    <View style={styles.listHeader}>
      {/* User Info */}
      <UserInfo
        name={user?.name || "Guest"}
        walletAmount={user?.balance || 0}
        portfolioAmount={currentPortfolioValue || user?.totalInvested || 0}
        investedAmount={user?.totalInvested || 0}
        isAuthed={isAuthed}
        onLoginPress={() => navigation.navigate("Login")}
      />
    </View>
  );

  const renderStock = useCallback(
    ({ item, index }: { item: Stock; index: number }) => (
      <StockCard
        stock={item}
        index={index}
        onPress={() => handleStockPress(item)}
      />
    ),
    [],
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      {loading ? (
        <ActivityIndicator size="large" color={colors.indigo} />
      ) : (
        <Text style={styles.emptyText}>No stocks available</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Static Header - Always visible */}
      <View style={styles.staticHeader}>
        <Header isConnected={isConnected} />
      </View>

      <FlatList
        data={stocks}
        keyExtractor={(item, index) => `${item.stocksymbol}-${index}`}
        renderItem={renderStock}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.indigo}
            colors={[colors.indigo]}
          />
        }
        numColumns={1}
      />

      <BuySellModal
        visible={modalVisible}
        onClose={handleModalClose}
        stock={selectedStock}
        onSuccess={handleOrderSuccess}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    // flex: 1 causes gap between screen and tabs
    backgroundColor: colors.background,
  },
  staticHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  listHeader: {
    marginBottom: spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
