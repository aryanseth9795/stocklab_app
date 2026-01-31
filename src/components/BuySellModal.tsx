import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, borderRadius, spacing, typography, shadows } from "../theme";
import { Stock, TradeRequestBody } from "../types";
import { Button, Input } from "./ui";
import { executeOrder } from "../api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

interface BuySellModalProps {
  visible: boolean;
  onClose: () => void;
  stock: Stock | null;
  onSuccess?: () => void;
}

type Mode = "amount" | "quantity";

export default function BuySellModal({
  visible,
  onClose,
  stock,
  onSuccess,
}: BuySellModalProps) {
  const { user, refreshUser } = useAuth();
  const { showToast, showAlert, showOrderSuccess } = useToast();
  const [isBuy, setIsBuy] = useState(true);
  const [mode, setMode] = useState<Mode>("amount");
  const [amountStr, setAmountStr] = useState("");
  const [qtyStr, setQtyStr] = useState("");
  const [lockedPrice, setLockedPrice] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (visible && stock) {
      setIsBuy(true);
      setMode("amount");
      setAmountStr("");
      setQtyStr("");
      setLockedPrice(stock.stockPrice);
      // Refresh user data to ensure wallet balance is current
      refreshUser();
    }
  }, [visible, stock, refreshUser]);

  const price = lockedPrice || stock?.stockPrice || 0;
  const walletUSD = user?.balance || 0;

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

  const insufficientFunds = isBuy && amount > walletUSD;
  const disableCta =
    !stock ||
    !user?.id ||
    price <= 0 ||
    amount <= 0 ||
    qty <= 0 ||
    insufficientFunds ||
    submitting;

  const handleSubmit = async () => {
    if (disableCta || !stock || !user) return;

    const payload: TradeRequestBody = {
      userId: user.id,
      stockName: stock.stockName,
      quantity: Number(qty.toFixed(6)),
      rate: Number(price.toFixed(4)),
      type: isBuy ? "buy" : "sell",
    };

    setSubmitting(true);
    try {
      const result = await executeOrder(payload);
      if (result.success) {
        // Show animated success modal
        showOrderSuccess({
          type: isBuy ? "buy" : "sell",
          title: isBuy ? "Order Placed!" : "Position Closed!",
          subtitle: `${isBuy ? "Bought" : "Sold"} ${qty.toFixed(4)} ${stock.stocksymbol}`,
          details: `Executed @ $${price.toFixed(2)}`,
        });
        // Refresh user data to update wallet balance
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.container}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>Place Order</Text>
                <Text style={styles.subtitle}>
                  {stock.stockName} ({stock.stocksymbol})
                </Text>
              </View>
              <View style={styles.headerRight}>
                <View
                  style={[
                    styles.badge,
                    isBuy ? styles.badgeBuy : styles.badgeSell,
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      isBuy ? styles.badgeTextBuy : styles.badgeTextSell,
                    ]}
                  >
                    {isBuy ? "BUY" : "SELL"}
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
                <Text style={styles.infoValue}>${price.toFixed(2)}</Text>
              </View>
              {isBuy && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Wallet Balance</Text>
                    <Text style={styles.infoValue}>
                      ${walletUSD.toFixed(2)}
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* Buy/Sell Toggle */}
            <View style={styles.toggleCard}>
              <View style={styles.toggleLeft}>
                <View
                  style={[styles.dot, isBuy ? styles.dotBuy : styles.dotSell]}
                />
                <Text style={styles.toggleLabel}>
                  {isBuy ? "Buying Action" : "Selling Action"}
                </Text>
              </View>
              <View style={styles.toggleRight}>
                <Text
                  style={[
                    styles.toggleOption,
                    !isBuy && styles.toggleOptionActive,
                  ]}
                >
                  Sell
                </Text>
                <Switch
                  value={isBuy}
                  onValueChange={setIsBuy}
                  trackColor={{ false: colors.rose, true: colors.emerald }}
                  thumbColor="#fff"
                />
                <Text
                  style={[
                    styles.toggleOption,
                    isBuy && styles.toggleOptionActive,
                  ]}
                >
                  Buy
                </Text>
              </View>
            </View>

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
                  Amount (USD)
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
                    label="Total Amount (USD)"
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
                    label="Quantity (shares)"
                    value={qtyStr}
                    onChangeText={setQtyStr}
                    placeholder="0.0000"
                    keyboardType="decimal-pad"
                    containerStyle={{ marginBottom: spacing.xs }}
                  />
                  <Text style={styles.estimate}>
                    Est. Total:{" "}
                    <Text style={styles.estimateValue}>
                      ${amount > 0 ? amount.toFixed(2) : "0.00"}
                    </Text>
                  </Text>
                </>
              )}
            </View>

            {/* Validation Feedback */}
            {isBuy && insufficientFunds && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={20} color={colors.error} />
                <Text style={styles.errorText}>
                  Insufficient funds in wallet
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
                    : isBuy
                      ? `Buy ${stock.stocksymbol}`
                      : `Sell ${stock.stocksymbol}`
                }
                variant={isBuy ? "success" : "danger"}
                onPress={handleSubmit}
                disabled={disableCta}
                loading={submitting}
                style={styles.submitBtn}
                fullWidth={false}
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
  },
  container: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    padding: spacing.xl,
    paddingBottom: spacing.huge, // Safe area padding
    maxHeight: "90%",
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
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  badgeBuy: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderColor: "rgba(16, 185, 129, 0.2)",
  },
  badgeSell: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderColor: "rgba(239, 68, 68, 0.2)",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  badgeTextBuy: {
    color: colors.success,
  },
  badgeTextSell: {
    color: colors.error,
  },
  closeBtn: {
    padding: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
  },

  // Info Card
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
  infoLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },

  // Toggle
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
  toggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotBuy: { backgroundColor: colors.success },
  dotSell: { backgroundColor: colors.error },

  toggleLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  toggleRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  toggleOption: {
    fontSize: 12,
    color: colors.textMuted,
    width: 30,
    textAlign: "center",
  },
  toggleOptionActive: {
    color: colors.textPrimary,
    fontWeight: "600",
  },

  // Mode Toggle
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
  modeBtnActive: {
    backgroundColor: colors.surfaceLight,
  },
  modeBtnText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: "500",
  },
  modeBtnTextActive: {
    color: colors.textPrimary,
    fontWeight: "600",
  },

  inputSection: {
    marginBottom: spacing.lg,
  },
  estimate: {
    ...typography.caption,
    textAlign: "right",
    marginTop: spacing.xs,
  },
  estimateValue: {
    color: colors.textPrimary,
    fontWeight: "600",
  },

  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
    fontWeight: "500",
  },

  actions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  cancelBtn: {
    flex: 1,
  },
  submitBtn: {
    flex: 2,
  },
});
