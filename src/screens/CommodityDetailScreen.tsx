import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
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
import { Commodity } from "../types";
import { config } from "../config";
import { BuySellModal } from "../components";
import { executeCommodityOrder, getCommodityPortfolio } from "../api/commodity";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { RootStackParamList } from "../navigation/types";

type CommodityDetailRouteProp = RouteProp<
  RootStackParamList,
  "CommodityDetail"
>;

// Global symbols that work in TradingView embed widget (MCX symbols don't)
const TRADINGVIEW_SYMBOLS: Record<string, string> = {
  GOLD: "TVC:GOLD",
  SILVER: "TVC:SILVER",
  CRUDEOIL: "NYMEX:CL1!",
  COPPER: "COMEX:HG1!",
};

// Commodity metadata
const COMMODITY_META: Record<
  string,
  { icon: string; iconColor: string; unit: string; lotLabel: string }
> = {
  GOLD: {
    icon: "ellipse",
    iconColor: "#FFD700",
    unit: "gm",
    lotLabel: "10 gm",
  },
  SILVER: {
    icon: "ellipse",
    iconColor: "#C0C0C0",
    unit: "kg",
    lotLabel: "1 kg",
  },
  CRUDEOIL: {
    icon: "water",
    iconColor: "#4A90D9",
    unit: "barrel",
    lotLabel: "1 bbl",
  },
  COPPER: {
    icon: "hardware-chip",
    iconColor: "#B87333",
    unit: "kg",
    lotLabel: "1 kg",
  },
};

const COMMODITY_FALLBACK_META = {
  icon: "cube",
  iconColor: "#888",
  unit: "unit",
  lotLabel: "1 unit",
};

export default function CommodityDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<CommodityDetailRouteProp>();
  const { user, isAuthed } = useAuth();
  const { showOrderSuccess, showAlert, showToast } = useToast();

  const [commodity, setCommodity] = useState<Commodity>(route.params.commodity);
  const [holdings, setHoldings] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [defaultAction, setDefaultAction] = useState<"buy" | "sell" | "short">(
    "buy",
  );
  const [chartLoading, setChartLoading] = useState(true);
  const [interval, setInterval] = useState("15");

  const esRef = useRef<any>(null);
  const meta = COMMODITY_META[commodity.symbol] ?? COMMODITY_FALLBACK_META;
  const myHolding = holdings.find((h) => h.symbol === commodity.symbol);
  const isUp = commodity.change >= 0;

  const intervals = [
    { value: "1", label: "1m" },
    { value: "5", label: "5m" },
    { value: "15", label: "15m" },
    { value: "60", label: "1H" },
    { value: "240", label: "4H" },
    { value: "D", label: "1D" },
    { value: "W", label: "1W" },
  ];

  // ── SSE for live prices ──────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (!mounted) return;
      esRef.current?.close?.();

      const EventSource = require("react-native-sse").default;
      const es = new EventSource(config.commoditySSEUrl);
      esRef.current = es;

      es.addEventListener("prices:update", (event: any) => {
        if (!mounted) return;
        try {
          const parsed = JSON.parse(event.data);
          const list = parsed?.live?.list ?? [];
          const item = list.find((i: any) => i.symbol === commodity.symbol);
          if (item && mounted) {
            setCommodity((prev) => ({
              ...prev,
              price: parseFloat(item.lastPrice) || prev.price,
              change: parseFloat(item.priceChange) || prev.change,
              changePercentage:
                parseFloat(item.priceChangePercentage) || prev.changePercentage,
              expDate: item.expDate ?? prev.expDate,
            }));
          }
        } catch {
          /* ignore */
        }
      });

      es.addEventListener("error", () => {
        if (!mounted) return;
        es.close();
        retryTimer = setTimeout(connect, 10_000);
      });
    };

    connect();
    return () => {
      mounted = false;
      esRef.current?.close?.();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [commodity.symbol]);

  // ── Holdings ─────────────────────────────────────────────────────────────
  const loadHoldings = useCallback(async () => {
    if (!user) return;
    const result = await getCommodityPortfolio();
    if (result.success) setHoldings(result.holdings);
  }, [user]);

  useEffect(() => {
    loadHoldings();
  }, [loadHoldings]);

  // ── TradingView Chart (same layout as StockDetailScreen) ─────────────────
  // Global symbols + currency conversion to INR
  const tradingViewSymbol =
    TRADINGVIEW_SYMBOLS[commodity.symbol] ?? `TVC:${commodity.symbol}`;

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
          #chart-container { height: 100%; width: 100%; }
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
              "interval": "${interval}",
              "timezone": "Asia/Kolkata",
              "theme": "dark",
              "style": "1",
              "locale": "en",
              "toolbar_bg": "#050505",
              "enable_publishing": false,
              "hide_top_toolbar": true,
              "hide_side_toolbar": true,
              "hide_legend": false,
              "save_image": false,
              "hide_volume": true,
              "container_id": "tradingview_chart",
              "currency": "INR",
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
    [tradingViewSymbol, interval],
  );

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleOrderSuccess = async (payload: {
    symbol: string;
    quantity: number;
    rate: number;
    type: "buy" | "sell" | "short_sell";
  }) => {
    const result = await executeCommodityOrder(payload);
    if (result.success) await loadHoldings();
    return result;
  };

  const handleBuy = useCallback(() => {
    if (!isAuthed) {
      navigation.navigate("Login");
      return;
    }
    setDefaultAction("buy");
    setModalVisible(true);
  }, [isAuthed, navigation]);

  const handleSell = useCallback(() => {
    if (!isAuthed) {
      navigation.navigate("Login");
      return;
    }
    if (!myHolding || myHolding.quantity <= 0) {
      showToast("error", "No quantity available to sell");
      return;
    }
    setDefaultAction("sell");
    setModalVisible(true);
  }, [isAuthed, navigation, myHolding, showToast]);

  const handleShort = useCallback(() => {
    if (!isAuthed) {
      navigation.navigate("Login");
      return;
    }
    setDefaultAction("short");
    setModalVisible(true);
  }, [isAuthed, navigation]);

  // Convert commodity to Stock-like shape for BuySellModal
  const stockShape = {
    stockName: commodity.name,
    stocksymbol: commodity.symbol,
    stockPrice: commodity.price,
    stockPriceINR: commodity.price,
    stockChange: commodity.change,
    stockChangeINR: commodity.change,
    stockChangePercentage: commodity.changePercentage,
    ts: commodity.ts,
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Compact Header — matches StockDetailScreen */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.titleRow}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <View
                style={[
                  styles.headerIconBox,
                  { backgroundColor: meta.iconColor + "22" },
                ]}
              >
                <Ionicons
                  name={meta.icon as any}
                  size={14}
                  color={meta.iconColor}
                />
              </View>
              <Text style={styles.symbolText}>{commodity.symbol}</Text>
            </View>
            <Text style={styles.priceText}>
              ₹
              {commodity.price.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </Text>
          </View>
          <View style={styles.subtitleRow}>
            <Text style={styles.nameText}>
              {commodity.name} \u2022 MCX \u2022 {meta.lotLabel}
            </Text>
            <Text
              style={[
                styles.changeText,
                isUp ? styles.changeTextPositive : styles.changeTextNegative,
              ]}
            >
              {isUp ? "+" : ""}
              {commodity.changePercentage.toFixed(2)}%
            </Text>
          </View>
        </View>
      </View>

      {/* Full-Screen Chart with Interval Overlay */}
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

        {/* Overlay Interval Selector */}
        <View style={styles.intervalBar}>
          {intervals.map((item) => (
            <TouchableOpacity
              key={item.value}
              style={[
                styles.intervalBtn,
                interval === item.value && styles.intervalBtnActive,
              ]}
              onPress={() => {
                setChartLoading(true);
                setInterval(item.value);
              }}
            >
              <Text
                style={[
                  styles.intervalText,
                  interval === item.value && styles.intervalTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Bottom Action Buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.buyButton]}
          onPress={handleBuy}
        >
          <Ionicons name="trending-up" size={18} color="#fff" />
          <Text style={styles.actionButtonText}>Buy</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.sellButton]}
          onPress={handleSell}
        >
          <Ionicons name="trending-down" size={18} color="#fff" />
          <Text style={styles.actionButtonText}>Sell</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.shortButton]}
          onPress={handleShort}
        >
          <Ionicons name="arrow-down-circle" size={18} color="#fff" />
          <Text style={styles.actionButtonText}>Short</Text>
        </TouchableOpacity>
      </View>

      <BuySellModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        stock={stockShape as any}
        defaultAction={defaultAction}
        holdingQuantity={myHolding?.quantity ?? 0}
        assetType="commodity"
        onCommodityOrder={handleOrderSuccess}
        onSuccess={() => {
          setModalVisible(false);
          loadHoldings();
        }}
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
  headerIconBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
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
  intervalBar: {
    position: "absolute",
    top: 150,
    left: spacing.sm,
    zIndex: 100,
    backgroundColor: "rgba(5, 5, 5, 0.85)",
    borderRadius: borderRadius.md,
    padding: 4,
    gap: 2,
    borderWidth: 1,
    borderColor: colors.border,
    opacity: 0.7,
  },
  intervalBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: borderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  intervalBtnActive: {
    backgroundColor: colors.indigo,
  },
  intervalText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textMuted,
  },
  intervalTextActive: {
    color: "#fff",
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
    gap: spacing.sm,
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
    backgroundColor: colors.emerald,
  },
  sellButton: {
    backgroundColor: colors.rose,
  },
  shortButton: {
    backgroundColor: "#F59E0B",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
