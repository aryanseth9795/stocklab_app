import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Switch,
  Keyboard,
  Platform,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, borderRadius, spacing, typography, shadows } from "../theme";
import {
  Stock,
  TradeRequestBody,
  ShortSellRequest,
  ShortCoverRequest,
} from "../types";
import { Button, Input } from "./ui";
import { executeOrder, executeShortSell } from "../api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

// Action: buy | sell | short
type TradeAction = "buy" | "sell" | "short";
type InputMode = "amount" | "quantity";

interface BuySellModalProps {
  visible: boolean;
  onClose: () => void;
  stock: Stock | null;
  onSuccess?: () => void;
  defaultAction?: TradeAction;
  holdingQuantity?: number;
  // For commodity mode: prices are in ₹, use commodity API
  assetType?: "crypto" | "commodity";
  onCommodityOrder?: (payload: {
    symbol: string;
    quantity: number;
    rate: number;
    type: "buy" | "sell" | "short_sell";
  }) => Promise<{ success: boolean; message: string }>;
  // For covering a short position directly
  shortPositionId?: string;
  onShortCover?: (
    payload: ShortCoverRequest,
  ) => Promise<{ success: boolean; message: string; profitLoss?: number }>;
}

export default function BuySellModal({
  visible,
  onClose,
  stock,
  onSuccess,
  defaultAction = "buy",
  holdingQuantity = 0,
  assetType = "crypto",
  onCommodityOrder,
  shortPositionId,
  onShortCover,
}: BuySellModalProps) {
  const { user, refreshUser } = useAuth();
  const { showToast, showAlert, showOrderSuccess } = useToast();
  const [action, setAction] = useState<TradeAction>(defaultAction);
  const [mode, setMode] = useState<InputMode>("amount");
  const [amountStr, setAmountStr] = useState("");
  const [qtyStr, setQtyStr] = useState("");
  const [lockedPrice, setLockedPrice] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [isIntraday, setIsIntraday] = useState(false);

  const wasVisible = useRef(false);
  const keyboardOffset = useRef(new Animated.Value(0)).current;

  const isCommodity = assetType === "commodity";
  const currencySymbol = "₹";

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showListener = Keyboard.addListener(showEvent, (e) => {
      Animated.timing(keyboardOffset, {
        toValue: -e.endCoordinates.height * 0.5,
        duration: Platform.OS === "ios" ? 250 : 100,
        useNativeDriver: true,
      }).start();
    });
    const hideListener = Keyboard.addListener(hideEvent, () => {
      Animated.timing(keyboardOffset, {
        toValue: 0,
        duration: Platform.OS === "ios" ? 250 : 100,
        useNativeDriver: true,
      }).start();
    });
    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, [keyboardOffset]);

  useEffect(() => {
    if (visible && !wasVisible.current && stock) {
      setAction(defaultAction);
      setMode("amount");
      setAmountStr("");
      setQtyStr("");
      setIsIntraday(false);
      setLockedPrice(stock.stockPriceINR ?? stock.stockPrice);
      refreshUser();
      keyboardOffset.setValue(0);
    }
    wasVisible.current = visible;
  }, [visible, stock, refreshUser, defaultAction, keyboardOffset, isCommodity]);

  const price = lockedPrice || (stock?.stockPriceINR ?? stock?.stockPrice ?? 0);
  const walletBalance = user?.balance || 0;

  const amount = useMemo(() => {
    const a = parseFloat(amountStr);
    const q = parseFloat(qtyStr);
    if (!price) return 0;
    return mode === "amount"
      ? isFinite(a)
        ? a
        : 0
      : isFinite(q)
        ? q * price
        : 0;
  }, [amountStr, qtyStr, mode, price]);

  const qty = useMemo(() => {
    const a = parseFloat(amountStr);
    const q = parseFloat(qtyStr);
    if (!price) return 0;
    return mode === "amount"
      ? (isFinite(a) ? a : 0) / price
      : isFinite(q)
        ? q
        : 0;
  }, [amountStr, qtyStr, mode, price]);

  const isBuy = action === "buy";
  const isShort = action === "short";

  const insufficientFunds = (isBuy || isShort) && amount > walletBalance;
  const insufficientHoldings = action === "sell" && qty > holdingQuantity;
  const noHoldings = action === "sell" && holdingQuantity <= 0;

  const disableCta =
    !stock ||
    !user?.id ||
    price <= 0 ||
    amount <= 0 ||
    qty <= 0 ||
    insufficientFunds ||
    insufficientHoldings ||
    noHoldings ||
    submitting;

  const handleSellAll = () => {
    if (holdingQuantity > 0) {
      setMode("quantity");
      setQtyStr(holdingQuantity.toString());
      setAmountStr("");
    }
  };

  const handleSubmit = async () => {
    if (disableCta || !stock || !user) return;

    setSubmitting(true);
    try {
      let result: { success: boolean; message: string; profitLoss?: number };

      if (isShort) {
        // Short sell
        const payload: ShortSellRequest = {
          stockName: stock.stockName,
          stockSymbol: stock.stocksymbol,
          quantity: Number(qty.toFixed(6)),
          rate: Number(price.toFixed(4)),
          assetType,
        };
        if (isCommodity && onCommodityOrder) {
          result = await onCommodityOrder({
            symbol: stock.stocksymbol,
            quantity: Number(qty.toFixed(6)),
            rate: Number(price.toFixed(4)),
            type: "short_sell",
          });
        } else {
          result = await executeShortSell(payload);
        }
        if (result.success) {
          showOrderSuccess({
            type: "sell",
            title: "Short Opened!",
            subtitle: `Shorted ${qty.toFixed(4)} ${stock.stocksymbol}`,
            details: `Entry @ ${currencySymbol}${price.toFixed(2)} • Auto-cut at midnight`,
          });
          await refreshUser();
          onSuccess?.();
          onClose();
        } else {
          showAlert({
            title: "Order Failed",
            message: result.message,
            type: "error",
            confirmText: "OK",
          });
        }
      } else if (isCommodity && onCommodityOrder) {
        // Commodity buy/sell
        result = await onCommodityOrder({
          symbol: stock.stocksymbol,
          quantity: Number(qty.toFixed(6)),
          rate: Number(price.toFixed(4)),
          type: action as "buy" | "sell",
        });
        if (result.success) {
          showOrderSuccess({
            type: action as "buy" | "sell",
            title: isBuy ? "Order Placed!" : "Position Closed!",
            subtitle: `${isBuy ? "Bought" : "Sold"} ${qty.toFixed(4)} ${stock.stocksymbol}`,
            details: `Executed @ ${currencySymbol}${price.toFixed(2)}`,
          });
          await refreshUser();
          onSuccess?.();
          onClose();
        } else {
          showAlert({
            title: "Order Failed",
            message: result.message,
            type: "error",
            confirmText: "OK",
          });
        }
      } else {
        // Regular crypto buy/sell (with optional intraday mode)
        const orderMode = isIntraday ? "intraday" : "delivery";
        const payload: TradeRequestBody = {
          userId: user.id,
          stockName: stock.stockName,
          quantity: Number(qty.toFixed(6)),
          rate: Number(price.toFixed(4)),
          type: action as "buy" | "sell",
          orderMode,
        };
        result = await executeOrder(payload);
        if (result.success) {
          showOrderSuccess({
            type: action as "buy" | "sell",
            title: isBuy ? "Order Placed!" : "Position Closed!",
            subtitle: `${isBuy ? "Bought" : "Sold"} ${qty.toFixed(4)} ${stock.stocksymbol}`,
            details: `Executed @ ${currencySymbol}${price.toFixed(2)}${isIntraday ? " • Intraday" : ""}`,
          });
          await refreshUser();
          onSuccess?.();
          onClose();
        } else {
          showAlert({
            title: "Order Failed",
            message: result.message,
            type: "error",
            confirmText: "OK",
          });
        }
      }
    } catch (error: any) {
      showAlert({
        title: "Error",
        message: error.message || "Failed to execute order",
        type: "error",
        confirmText: "OK",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!stock) return null;

  const actionColor =
    action === "buy"
      ? colors.emerald
      : action === "sell"
        ? colors.rose
        : "#F59E0B";
  const actionLabel =
    action === "buy" ? "BUY" : action === "sell" ? "SELL" : "SHORT";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <Animated.View
          style={[
            styles.container,
            { transform: [{ translateY: keyboardOffset }] },
          ]}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>Place Order</Text>
                <Text style={styles.subtitle}>
                  {stock.stockName} ({stock.stocksymbol})
                  {isCommodity ? " • MCX" : ""}
                </Text>
              </View>
              <View style={styles.headerRight}>
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: `${actionColor}18`,
                      borderColor: `${actionColor}33`,
                    },
                  ]}
                >
                  <Text style={[styles.badgeText, { color: actionColor }]}>
                    {actionLabel}
                  </Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={24} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Price Info Card */}
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Current Price</Text>
                <Text style={styles.infoValue}>
                  {currencySymbol}
                  {price.toFixed(2)}
                </Text>
              </View>
              {(isBuy || isShort) && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Wallet Balance</Text>
                    <Text style={styles.infoValue}>
                      ₹{walletBalance.toFixed(2)}
                    </Text>
                  </View>
                </>
              )}
              {isShort && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: "#F59E0B" }]}>
                      ⚠️ Auto-cut at midnight IST
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* Action Tab Switcher */}
            <View style={styles.actionTabs}>
              {(["buy", "sell", "short"] as TradeAction[]).map((act) => {
                const col =
                  act === "buy"
                    ? colors.emerald
                    : act === "sell"
                      ? colors.rose
                      : "#F59E0B";
                return (
                  <TouchableOpacity
                    key={act}
                    style={[
                      styles.actionTab,
                      action === act && {
                        borderColor: col,
                        backgroundColor: `${col}18`,
                      },
                    ]}
                    onPress={() => setAction(act)}
                  >
                    <Text
                      style={[
                        styles.actionTabText,
                        action === act && { color: col, fontWeight: "700" },
                      ]}
                    >
                      {act === "buy"
                        ? "Buy"
                        : act === "sell"
                          ? "Sell"
                          : "Short"}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Intraday Toggle (crypto delivery only) */}
            {!isCommodity && action !== "short" && (
              <View style={styles.toggleCard}>
                <View style={styles.toggleLeft}>
                  <View
                    style={[
                      styles.dot,
                      isIntraday ? styles.dotIntraday : styles.dotDelivery,
                    ]}
                  />
                  <Text style={styles.toggleLabel}>
                    {isIntraday ? "Intraday" : "Delivery"}
                  </Text>
                </View>
                <View style={styles.toggleRight}>
                  <Text
                    style={[
                      styles.toggleOption,
                      !isIntraday && styles.toggleOptionActive,
                    ]}
                  >
                    Delivery
                  </Text>
                  <Switch
                    value={isIntraday}
                    onValueChange={setIsIntraday}
                    trackColor={{ false: colors.border, true: "#6366F1" }}
                    thumbColor="#fff"
                  />
                  <Text
                    style={[
                      styles.toggleOption,
                      isIntraday && styles.toggleOptionActive,
                    ]}
                  >
                    Intraday
                  </Text>
                </View>
              </View>
            )}

            {/* Mode Toggle */}
            <View style={styles.modeToggle}>
              <TouchableOpacity
                style={[
                  styles.modeBtn,
                  mode === "amount" && styles.modeBtnActive,
                ]}
                onPress={() => {
                  setMode("amount");
                  setQtyStr("");
                }}
              >
                <Text
                  style={[
                    styles.modeBtnText,
                    mode === "amount" && styles.modeBtnTextActive,
                  ]}
                >
                  Amount ({isCommodity ? "₹" : "₹"})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modeBtn,
                  mode === "quantity" && styles.modeBtnActive,
                ]}
                onPress={() => {
                  setMode("quantity");
                  setAmountStr("");
                }}
              >
                <Text
                  style={[
                    styles.modeBtnText,
                    mode === "quantity" && styles.modeBtnTextActive,
                  ]}
                >
                  Quantity
                </Text>
              </TouchableOpacity>
            </View>

            {/* Input */}
            <View style={styles.inputSection}>
              {mode === "amount" ? (
                <>
                  <Input
                    label={`Total Amount (${currencySymbol})`}
                    value={amountStr}
                    onChangeText={setAmountStr}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    containerStyle={{ marginBottom: spacing.xs }}
                  />
                  <Text style={styles.estimate}>
                    Est. Quantity:{" "}
                    <Text style={styles.estimateValue}>
                      {qty > 0 ? qty.toFixed(4) : "0.0000"}
                    </Text>
                  </Text>
                </>
              ) : (
                <>
                  <Input
                    label="Quantity (units)"
                    value={qtyStr}
                    onChangeText={setQtyStr}
                    placeholder="0.0000"
                    keyboardType="decimal-pad"
                    containerStyle={{ marginBottom: spacing.xs }}
                  />
                  <Text style={styles.estimate}>
                    Est. Total:{" "}
                    <Text style={styles.estimateValue}>
                      {currencySymbol}
                      {amount > 0 ? amount.toFixed(2) : "0.00"}
                    </Text>
                  </Text>
                </>
              )}
            </View>

            {/* Sell All Button */}
            {action === "sell" && holdingQuantity > 0 && (
              <TouchableOpacity
                style={styles.sellAllBtn}
                onPress={handleSellAll}
              >
                <Text style={styles.sellAllText}>
                  Sell All ({holdingQuantity.toFixed(4)} units)
                </Text>
              </TouchableOpacity>
            )}

            {/* Validation Feedback */}
            {(isBuy || isShort) && insufficientFunds && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={20} color={colors.error} />
                <Text style={styles.errorText}>
                  Insufficient balance in wallet
                </Text>
              </View>
            )}
            {action === "sell" && noHoldings && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={20} color={colors.error} />
                <Text style={styles.errorText}>You don't own this asset</Text>
              </View>
            )}
            {action === "sell" && !noHoldings && insufficientHoldings && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={20} color={colors.error} />
                <Text style={styles.errorText}>
                  Quantity exceeds holdings ({holdingQuantity.toFixed(4)}{" "}
                  available)
                </Text>
              </View>
            )}

            {/* Short Sell Info Banner */}
            {isShort && (
              <View style={styles.shortInfoBanner}>
                <Ionicons name="information-circle" size={20} color="#F59E0B" />
                <Text style={styles.shortInfoText}>
                  Profit when price falls. Position auto-closes at midnight if
                  not covered.
                </Text>
              </View>
            )}

            {/* Actions */}
            <View style={styles.actions}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={onClose}
                style={styles.cancelBtn}
              />
              <Button
                title={
                  submitting
                    ? "Submitting…"
                    : action === "buy"
                      ? `Buy ${stock.stocksymbol}`
                      : action === "sell"
                        ? `Sell ${stock.stocksymbol}`
                        : `Short ${stock.stocksymbol}`
                }
                variant={
                  action === "buy"
                    ? "success"
                    : action === "sell"
                      ? "danger"
                      : ("warning" as any)
                }
                onPress={handleSubmit}
                disabled={disableCta}
                loading={submitting}
                style={[
                  styles.submitBtn,
                  action === "short" && styles.shortBtn,
                ]}
                fullWidth={false}
              />
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
  },
  container: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    padding: spacing.xl,
    paddingBottom: spacing.huge,
    maxHeight: "92%",
    borderTopWidth: 1,
    borderTopColor: colors.borderHighlight,
    ...shadows.glow(colors.background),
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.lg,
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  title: { ...typography.h2, color: colors.textPrimary },
  subtitle: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  badgeText: { fontSize: 12, fontWeight: "700" },
  closeBtn: {
    padding: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  infoLabel: { ...typography.caption, color: colors.textSecondary },
  infoValue: { fontSize: 14, fontWeight: "600", color: colors.textPrimary },

  // Action Tabs (Buy / Sell / Short)
  actionTabs: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  actionTab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: "center",
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  actionTabText: { fontSize: 13, fontWeight: "500", color: colors.textMuted },

  // Intraday Toggle
  toggleCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  toggleLeft: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotDelivery: { backgroundColor: colors.emerald },
  dotIntraday: { backgroundColor: "#6366F1" },
  toggleLabel: { fontSize: 14, fontWeight: "500", color: colors.textPrimary },
  toggleRight: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  toggleOption: {
    fontSize: 12,
    color: colors.textMuted,
    width: 50,
    textAlign: "center",
  },
  toggleOptionActive: { color: colors.textPrimary, fontWeight: "600" },

  modeToggle: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 4,
    marginBottom: spacing.lg,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: "center",
    borderRadius: borderRadius.md,
  },
  modeBtnActive: { backgroundColor: colors.surfaceLight },
  modeBtnText: { fontSize: 13, color: colors.textMuted, fontWeight: "500" },
  modeBtnTextActive: { color: colors.textPrimary, fontWeight: "600" },

  inputSection: { marginBottom: spacing.lg },
  estimate: {
    ...typography.caption,
    textAlign: "right",
    marginTop: spacing.xs,
  },
  estimateValue: { color: colors.textPrimary, fontWeight: "600" },

  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  errorText: { color: colors.error, fontSize: 13, fontWeight: "500", flex: 1 },

  shortInfoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  shortInfoText: { color: "#F59E0B", fontSize: 12, flex: 1, lineHeight: 18 },

  actions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.sm,
    justifyContent: "space-around",
  },
  cancelBtn: { flex: 1, width: 150 },
  submitBtn: { flex: 1, width: 150 },
  shortBtn: { backgroundColor: "#F59E0B" },

  sellAllBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  sellAllText: { color: colors.error, fontSize: 14, fontWeight: "600" },
});
