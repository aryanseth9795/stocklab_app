import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import { colors, spacing, borderRadius } from "../theme";
import { RootStackParamList } from "../navigation/types";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { BuySellModal } from "../components";
import { Stock, Tick, PortfolioBatch } from "../types";

type StockDetailRouteProp = RouteProp<RootStackParamList, "StockDetail">;

// Map app symbols to TradingView symbols
const getTradingViewSymbol = (symbol: string): string => {
  const symbolUpper = symbol.toUpperCase();

  const symbolMap: Record<string, string> = {
    BTCUSDT: "BINANCE:BTCUSDT",
    ETHUSDT: "BINANCE:ETHUSDT",
    BNBUSDT: "BINANCE:BNBUSDT",
    XRPUSDT: "BINANCE:XRPUSDT",
    SOLUSDT: "BINANCE:SOLUSDT",
    DOGEUSDT: "BINANCE:DOGEUSDT",
    ADAUSDT: "BINANCE:ADAUSDT",
    TRXUSDT: "BINANCE:TRXUSDT",
    AVAXUSDT: "BINANCE:AVAXUSDT",
    LINKUSDT: "BINANCE:LINKUSDT",
    MATICUSDT: "BINANCE:MATICUSDT",
    DOTUSDT: "BINANCE:DOTUSDT",
    LTCUSDT: "BINANCE:LTCUSDT",
    ATOMUSDT: "BINANCE:ATOMUSDT",
    UNIUSDT: "BINANCE:UNIUSDT",
    GOLD: "TVC:GOLD",
    XAUUSD: "OANDA:XAUUSD",
    SILVER: "TVC:SILVER",
    XAGUSD: "OANDA:XAGUSD",
  };

  return symbolMap[symbolUpper] || `BINANCE:${symbolUpper}`;
};

export default function StockDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<StockDetailRouteProp>();
  const { stock: initialStock } = route.params;
  const { isAuthed } = useAuth();
  const { socket } = useSocket();

  const [modalVisible, setModalVisible] = useState(false);
  const [chartLoading, setChartLoading] = useState(true);
  const [liveStock, setLiveStock] = useState<Stock>(initialStock);

  const tradingViewSymbol = useMemo(
    () => getTradingViewSymbol(initialStock.stocksymbol),
    [initialStock.stocksymbol],
  );

  // Subscribe to live updates from landing event
  useEffect(() => {
    if (!socket) return;

    const handleLandingUpdate = (stocks: Stock[]) => {
      if (!Array.isArray(stocks)) return;

      const updated = stocks.find(
        (s) =>
          s.stocksymbol.toUpperCase() ===
          initialStock.stocksymbol.toUpperCase(),
      );

      if (updated) {
        setLiveStock(updated);
      }
    };

    const handlePortfolioBatch = (payload: PortfolioBatch | null) => {
      if (!payload?.ticks || !Array.isArray(payload.ticks)) return;

      const tick = payload.ticks.find(
        (t: Tick) =>
          (t.stocksymbol || t.stockName || "").toUpperCase() ===
          initialStock.stocksymbol.toUpperCase(),
      );

      if (tick) {
        setLiveStock((prev) => ({
          ...prev,
          stockPrice: tick.stockPrice,
          stockPriceINR: tick.stockPriceINR ?? prev.stockPriceINR,
          stockChange: tick.stockChange ?? prev.stockChange,
          stockChangeINR: tick.stockChangeINR ?? prev.stockChangeINR,
          stockChangePercentage:
            tick.stockChangePercentage ?? prev.stockChangePercentage,
          ts: tick.ts ?? prev.ts,
        }));
      }
    };

    // Subscribe to both landing and portfolio batch for comprehensive updates
    socket.on("landing", handleLandingUpdate);
    socket.on("portfolio:batch", handlePortfolioBatch);

    // Request initial data
    socket.emit("landing");
    socket.emit("portfolio");

    return () => {
      socket.off("landing", handleLandingUpdate);
      socket.off("portfolio:batch", handlePortfolioBatch);
    };
  }, [socket, initialStock.stocksymbol]);

  // TradingView widget HTML
  const chartHtml = useMemo(
    () => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { 
            height: 100%; 
            width: 100%;
            background: #050505;
            overflow: hidden;
          }
          #chart-container {
            height: 100%;
            width: 100%;
          }
        </style>
      </head>
      <body>
        <div id="chart-container">
          <div class="tradingview-widget-container" style="height:100%;width:100%">
            <div id="tradingview_chart" style="height:100%;width:100%"></div>
          </div>
          <script type="text/javascript" src="https://s3.tradingview.com/tv.js"></script>
          <script type="text/javascript">
            new TradingView.widget({
              "autosize": true,
              "symbol": "${tradingViewSymbol}",
              "interval": "15",
              "timezone": "Asia/Kolkata",
              "theme": "dark",
              "style": "1",
              "locale": "en",
              "toolbar_bg": "#050505",
              "enable_publishing": false,
              "hide_top_toolbar": true,
              "hide_legend": false,
              "save_image": false,
              "hide_volume": true,
              "container_id": "tradingview_chart",
              "backgroundColor": "#050505",
              "gridColor": "rgba(255, 255, 255, 0.03)",
              "overrides": {
                "paneProperties.background": "#050505",
                "paneProperties.backgroundType": "solid",
                "scalesProperties.backgroundColor": "#050505",
                "mainSeriesProperties.candleStyle.upColor": "#10B981",
                "mainSeriesProperties.candleStyle.downColor": "#EF4444",
                "mainSeriesProperties.candleStyle.borderUpColor": "#10B981",
                "mainSeriesProperties.candleStyle.borderDownColor": "#EF4444",
                "mainSeriesProperties.candleStyle.wickUpColor": "#10B981",
                "mainSeriesProperties.candleStyle.wickDownColor": "#EF4444"
              }
            });
          </script>
        </div>
      </body>
    </html>
  `,
    [tradingViewSymbol],
  );

  const isPositive = (liveStock.stockChangePercentage ?? 0) >= 0;

  const handleBuySell = useCallback(() => {
    if (!isAuthed) {
      navigation.navigate("Login" as never);
      return;
    }
    setModalVisible(true);
  }, [isAuthed, navigation]);

  const handleModalClose = () => {
    setModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Compact Header with Live Price */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.titleRow}>
            <Text style={styles.symbolText}>{liveStock.stocksymbol}</Text>
            <Text style={styles.priceText}>
              ${liveStock.stockPrice.toFixed(2)}
            </Text>
          </View>
          <View style={styles.subtitleRow}>
            <Text style={styles.nameText}>{liveStock.stockName}</Text>
            <Text
              style={[
                styles.changeText,
                isPositive
                  ? styles.changeTextPositive
                  : styles.changeTextNegative,
              ]}
            >
              {isPositive ? "+" : ""}
              {(liveStock.stockChangePercentage ?? 0).toFixed(2)}%
            </Text>
          </View>
        </View>
      </View>

      {/* Chart - Takes full remaining space */}
      <View style={styles.chartContainer}>
        {chartLoading && (
          <View style={styles.chartLoading}>
            <ActivityIndicator size="large" color={colors.indigo} />
            <Text style={styles.loadingText}>Loading chart...</Text>
          </View>
        )}
        <WebView
          source={{ html: chartHtml }}
          style={styles.webview}
          scrollEnabled={false}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          onLoadEnd={() => setChartLoading(false)}
          originWhitelist={["*"]}
          mixedContentMode="always"
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.buyButton]}
          onPress={handleBuySell}
        >
          <Ionicons name="trending-up" size={18} color="#fff" />
          <Text style={styles.actionButtonText}>Buy</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.sellButton]}
          onPress={handleBuySell}
        >
          <Ionicons name="trending-down" size={18} color="#fff" />
          <Text style={styles.actionButtonText}>Sell</Text>
        </TouchableOpacity>
      </View>

      {/* Buy/Sell Modal */}
      <BuySellModal
        visible={modalVisible}
        onClose={handleModalClose}
        stock={liveStock}
        onSuccess={handleModalClose}
      />
    </SafeAreaView>
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
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
  headerCenter: {
    flex: 1,
    marginLeft: spacing.md,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  subtitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  symbolText: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  priceText: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  nameText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  changeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  changeTextPositive: {
    color: colors.emerald,
  },
  changeTextNegative: {
    color: colors.rose,
  },
  chartContainer: {
    flex: 1,
    backgroundColor: colors.background,
    position: "relative",
  },
  chartLoading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
    zIndex: 10,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.md,
  },
  webview: {
    flex: 1,
    backgroundColor: colors.background,
  },
  actionContainer: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  buyButton: {
    backgroundColor: colors.success,
  },
  sellButton: {
    backgroundColor: colors.error,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
