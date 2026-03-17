import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  interpolateColor,
} from "react-native-reanimated";
import EventSource from "react-native-sse";
import { colors, spacing, borderRadius, typography, shadows } from "../theme";
import { Commodity } from "../types";
import { config } from "../config";
import { AuthGuard } from "../components";

const COMMODITY_NAMES: Record<string, string> = {
  GOLD: "Gold",
  SILVER: "Silver",
  CRUDEOIL: "Crude Oil",
  COPPER: "Copper",
};

// Commodity metadata: icon (Ionicons), unit, lot size
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

const COMMODITY_FALLBACK = {
  icon: "cube",
  iconColor: "#888",
  unit: "unit",
  lotLabel: "1 unit",
};

function CommodityCard({
  commodity,
  index,
  onPress,
}: {
  commodity: Commodity;
  index: number;
  onPress: () => void;
}) {
  const isUp = commodity.change >= 0;
  const meta = COMMODITY_META[commodity.symbol] ?? COMMODITY_FALLBACK;
  const flash = useSharedValue(0);
  const prevPrice = useRef(commodity.price);

  useEffect(() => {
    if (prevPrice.current !== commodity.price) {
      prevPrice.current = commodity.price;
      flash.value = withSequence(
        withTiming(1, { duration: 100 }),
        withTiming(0, { duration: 400 }),
      );
    }
  }, [commodity.price, flash]);

  const flashStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      flash.value,
      [0, 1],
      [
        "transparent",
        isUp ? "rgba(52,211,153,0.15)" : "rgba(251,113,133,0.15)",
      ],
    ),
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 80)
        .duration(400)
        .springify()}
    >
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        <LinearGradient
          colors={colors.gradients.card}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              flashStyle,
              { borderRadius: borderRadius.lg },
            ]}
          />
          <View
            style={[
              styles.accentBar,
              { backgroundColor: isUp ? colors.emerald : colors.rose },
            ]}
          />

          <View style={styles.cardRow}>
            <View style={styles.cardLeft}>
              <View
                style={[
                  styles.cardIconBox,
                  { backgroundColor: meta.iconColor + "22" },
                ]}
              >
                <Ionicons
                  name={meta.icon as any}
                  size={20}
                  color={meta.iconColor}
                />
              </View>
              <View>
                <Text style={styles.cardSymbol}>{commodity.symbol}</Text>
                <Text style={styles.cardName}>{commodity.name}</Text>
                <Text style={styles.cardExpiry}>
                  Exp: {commodity.expDate} • {meta.lotLabel}
                </Text>
              </View>
            </View>

            <View style={styles.cardRight}>
              <Text style={styles.cardPrice}>
                ₹
                {commodity.price.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </Text>
              <View
                style={[
                  styles.changeBadge,
                  isUp ? styles.badgeUp : styles.badgeDown,
                ]}
              >
                <Text
                  style={[
                    styles.changeText,
                    { color: isUp ? colors.emerald : colors.rose },
                  ]}
                >
                  {isUp ? "▲" : "▼"} ₹{Math.abs(commodity.change).toFixed(2)} (
                  {Math.abs(commodity.changePercentage).toFixed(2)}%)
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function CommodityListScreen() {
  const navigation = useNavigation<any>();
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const parseCommodityData = useCallback((data: any): Commodity[] => {
    const list = data?.live?.list ?? [];
    return list.map((item: any) => ({
      symbol: item.symbol,
      name: COMMODITY_NAMES[item.symbol] ?? item.symbol,
      price: parseFloat(item.lastPrice) || 0,
      change: parseFloat(item.priceChange) || 0,
      changePercentage: parseFloat(item.priceChangePercentage) || 0,
      expDate: item.expDate ?? "",
      ts: data.fetchedAt ?? new Date().toISOString(),
    }));
  }, []);

  const connectSSE = useCallback(() => {
    if (!mountedRef.current) return;

    // Close any existing connection
    esRef.current?.close();
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    const sseUrl = config.commoditySSEUrl;
    console.log("[Commodity SSE] Connecting to:", sseUrl);

    const es: any = new EventSource(sseUrl);
    esRef.current = es;

    es.addEventListener("open", () => {
      if (!mountedRef.current) return;
      console.log("[Commodity SSE] Connected");
      setConnected(true);
      setLoading(false);
    });

    es.addEventListener("prices:update", (event: any) => {
      if (!mountedRef.current) return;
      try {
        const parsed = JSON.parse(event.data);
        setCommodities(parseCommodityData(parsed));
        setRefreshing(false);
      } catch {
        /* ignore parse errors */
      }
    });

    es.addEventListener("error", (err: any) => {
      console.warn("[Commodity SSE] Error:", err);
      if (!mountedRef.current) return;
      setConnected(false);
      setLoading(false);
      es.close();
      retryTimerRef.current = setTimeout(() => {
        if (mountedRef.current) connectSSE();
      }, 10_000);
    });
  }, [parseCommodityData]);

  useEffect(() => {
    mountedRef.current = true;
    connectSSE();
    return () => {
      mountedRef.current = false;
      esRef.current?.close();
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [connectSSE]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setLoading(true);
    connectSSE();
  }, [connectSSE]);

  return (
    <AuthGuard>
      <SafeAreaView style={styles.container} edges={["top"]}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Commodities</Text>
            <Text style={styles.headerSubtitle}>MCX Real-Time • ₹ INR</Text>
          </View>
          <View
            style={[
              styles.statusDot,
              connected ? styles.statusOnline : styles.statusOffline,
            ]}
          >
            <Text style={styles.statusText}>{connected ? "LIVE" : "—"}</Text>
          </View>
        </View>

        {loading && commodities.length === 0 ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={colors.indigo} />
            <Text style={styles.loaderText}>Connecting to MCX feed…</Text>
          </View>
        ) : (
          <FlatList
            data={commodities}
            keyExtractor={(item) => item.symbol}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.textMuted}
              />
            }
            renderItem={({ item, index }) => (
              <CommodityCard
                commodity={item}
                index={index}
                onPress={() =>
                  navigation.navigate("CommodityDetail", { commodity: item })
                }
              />
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  No commodity data available
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
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { ...typography.h2, color: colors.textPrimary },
  headerSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  statusDot: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  statusOnline: {
    backgroundColor: "rgba(52,211,153,0.1)",
    borderColor: "rgba(52,211,153,0.3)",
  },
  statusOffline: {
    backgroundColor: "rgba(100,100,100,0.1)",
    borderColor: colors.border,
  },
  statusText: { fontSize: 11, fontWeight: "700", color: colors.textPrimary },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
  },
  loaderText: { color: colors.textMuted, fontSize: 14 },
  list: { padding: spacing.md, gap: spacing.sm },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  accentBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    opacity: 0.6,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardLeft: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  cardIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  cardSymbol: { ...typography.h3, color: colors.textPrimary },
  cardName: { ...typography.caption, color: colors.textSecondary },
  cardExpiry: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  cardRight: { alignItems: "flex-end", gap: 4 },
  cardPrice: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  changeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  badgeUp: {
    backgroundColor: "rgba(52,211,153,0.1)",
    borderColor: "rgba(52,211,153,0.2)",
  },
  badgeDown: {
    backgroundColor: "rgba(251,113,133,0.1)",
    borderColor: "rgba(251,113,133,0.2)",
  },
  changeText: { fontSize: 11, fontWeight: "600" },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
  },
  emptyText: { color: colors.textMuted, fontSize: 14 },
});
