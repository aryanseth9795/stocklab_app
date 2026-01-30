import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { colors, borderRadius, spacing, shadows } from "../theme";

const { width } = Dimensions.get("window");

// Toast types with their configurations
type ToastType = "success" | "error" | "warning" | "info" | "buy" | "sell";

interface ToastConfig {
  icon: keyof typeof Ionicons.glyphMap;
  backgroundColor: string;
  borderColor: string;
  iconColor: string;
}

const toastConfigs: Record<ToastType, ToastConfig> = {
  success: {
    icon: "checkmark-circle",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderColor: "rgba(16, 185, 129, 0.4)",
    iconColor: colors.emerald,
  },
  error: {
    icon: "close-circle",
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderColor: "rgba(239, 68, 68, 0.4)",
    iconColor: colors.rose,
  },
  warning: {
    icon: "warning",
    backgroundColor: "rgba(251, 191, 36, 0.15)",
    borderColor: "rgba(251, 191, 36, 0.4)",
    iconColor: colors.warning,
  },
  info: {
    icon: "information-circle",
    backgroundColor: "rgba(96, 165, 250, 0.15)",
    borderColor: "rgba(96, 165, 250, 0.4)",
    iconColor: colors.info,
  },
  buy: {
    icon: "trending-up",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderColor: "rgba(16, 185, 129, 0.4)",
    iconColor: colors.emerald,
  },
  sell: {
    icon: "trending-down",
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderColor: "rgba(239, 68, 68, 0.4)",
    iconColor: colors.rose,
  },
};

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface AlertOptions {
  title: string;
  message: string;
  type?: ToastType;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface OrderSuccessOptions {
  type: "buy" | "sell";
  title: string;
  subtitle: string;
  details?: string;
  onClose?: () => void;
}

interface ToastContextType {
  showToast: (
    type: ToastType,
    title: string,
    message?: string,
    duration?: number,
  ) => void;
  showAlert: (options: AlertOptions) => void;
  showOrderSuccess: (options: OrderSuccessOptions) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

// Individual Toast Item Component
function ToastItem({
  toast,
  onHide,
}: {
  toast: Toast;
  onHide: (id: string) => void;
}) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const config = toastConfigs[toast.type];

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        damping: 15,
        stiffness: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        damping: 12,
        stiffness: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto hide
    const timer = setTimeout(() => {
      hideToast();
    }, toast.duration || 3000);

    return () => clearTimeout(timer);
  }, []);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onHide(toast.id));
  };

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        {
          transform: [{ translateY }, { scale }],
          opacity,
        },
      ]}
    >
      <TouchableOpacity onPress={hideToast} activeOpacity={0.9}>
        <View
          style={[
            styles.toast,
            {
              backgroundColor: config.backgroundColor,
              borderColor: config.borderColor,
            },
          ]}
        >
          <View style={styles.iconContainer}>
            <Ionicons name={config.icon} size={28} color={config.iconColor} />
          </View>
          <View style={styles.toastContent}>
            <Text style={styles.toastTitle}>{toast.title}</Text>
            {toast.message && (
              <Text style={styles.toastMessage}>{toast.message}</Text>
            )}
          </View>
          <Ionicons
            name="close"
            size={18}
            color={colors.textMuted}
            style={styles.closeIcon}
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// Custom Alert Modal
function AlertModal({
  visible,
  options,
  onClose,
}: {
  visible: boolean;
  options: AlertOptions | null;
  onClose: () => void;
}) {
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          damping: 15,
          stiffness: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!options) return null;

  const config = toastConfigs[options.type || "info"];

  const handleConfirm = () => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 0.8,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
      options.onConfirm?.();
    });
  };

  const handleCancel = () => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 0.8,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
      options.onCancel?.();
    });
  };

  return (
    <Modal transparent visible={visible} animationType="none">
      <View style={styles.alertOverlay}>
        <Animated.View
          style={[
            styles.alertContainer,
            {
              transform: [{ scale }],
              opacity,
            },
          ]}
        >
          <LinearGradient
            colors={colors.gradients.card}
            style={styles.alertCard}
          >
            {/* Icon */}
            <View
              style={[
                styles.alertIconContainer,
                { backgroundColor: config.backgroundColor },
              ]}
            >
              <Ionicons name={config.icon} size={36} color={config.iconColor} />
            </View>

            {/* Content */}
            <Text style={styles.alertTitle}>{options.title}</Text>
            <Text style={styles.alertMessage}>{options.message}</Text>

            {/* Buttons */}
            <View style={styles.alertButtons}>
              {options.cancelText && (
                <TouchableOpacity
                  style={styles.alertButtonCancel}
                  onPress={handleCancel}
                >
                  <Text style={styles.alertButtonCancelText}>
                    {options.cancelText}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.alertButtonConfirm,
                  {
                    backgroundColor:
                      options.type === "error" || options.type === "sell"
                        ? colors.rose
                        : colors.emerald,
                  },
                ]}
                onPress={handleConfirm}
              >
                <Text style={styles.alertButtonConfirmText}>
                  {options.confirmText || "OK"}
                </Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

// Order Success Modal with animated icon
function OrderSuccessModal({
  visible,
  options,
  onClose,
}: {
  visible: boolean;
  options: OrderSuccessOptions | null;
  onClose: () => void;
}) {
  const scale = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0)).current;
  const iconRotate = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && options) {
      // Reset values
      scale.setValue(0);
      iconScale.setValue(0);
      iconRotate.setValue(0);
      checkScale.setValue(0);

      // Animate modal in
      Animated.sequence([
        Animated.spring(scale, {
          toValue: 1,
          damping: 12,
          stiffness: 150,
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.spring(iconScale, {
            toValue: 1,
            damping: 8,
            stiffness: 100,
            useNativeDriver: true,
          }),
          Animated.timing(iconRotate, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
        Animated.spring(checkScale, {
          toValue: 1,
          damping: 8,
          stiffness: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto close after delay
      const timer = setTimeout(() => {
        handleClose();
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [visible, options]);

  const handleClose = () => {
    Animated.timing(scale, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onClose();
      options?.onClose?.();
    });
  };

  if (!options) return null;

  const isBuy = options.type === "buy";
  const iconColor = isBuy ? colors.emerald : colors.rose;
  const bgColor = isBuy
    ? "rgba(16, 185, 129, 0.15)"
    : "rgba(239, 68, 68, 0.15)";

  const spin = iconRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Modal transparent visible={visible} animationType="none">
      <TouchableOpacity
        style={styles.orderOverlay}
        activeOpacity={1}
        onPress={handleClose}
      >
        <Animated.View
          style={[styles.orderContainer, { transform: [{ scale }] }]}
        >
          <LinearGradient
            colors={colors.gradients.card}
            style={styles.orderCard}
          >
            {/* Animated Icon Container */}
            <Animated.View
              style={[
                styles.orderIconOuter,
                {
                  backgroundColor: bgColor,
                  transform: [{ scale: iconScale }, { rotate: spin }],
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.orderIconInner,
                  { transform: [{ scale: checkScale }] },
                ]}
              >
                <Ionicons
                  name={isBuy ? "checkmark-circle" : "checkmark-circle"}
                  size={56}
                  color={iconColor}
                />
              </Animated.View>
            </Animated.View>

            {/* Title */}
            <Text style={[styles.orderTitle, { color: iconColor }]}>
              {options.title}
            </Text>

            {/* Subtitle */}
            <Text style={styles.orderSubtitle}>{options.subtitle}</Text>

            {/* Details */}
            {options.details && (
              <View style={styles.orderDetailsBox}>
                <Text style={styles.orderDetails}>{options.details}</Text>
              </View>
            )}

            {/* Tap to dismiss hint */}
            <Text style={styles.orderHint}>Tap anywhere to dismiss</Text>
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

// Provider Component
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [alertOptions, setAlertOptions] = useState<AlertOptions | null>(null);
  const [alertVisible, setAlertVisible] = useState(false);
  const [orderOptions, setOrderOptions] = useState<OrderSuccessOptions | null>(
    null,
  );
  const [orderVisible, setOrderVisible] = useState(false);

  const showToast = useCallback(
    (
      type: ToastType,
      title: string,
      message?: string,
      duration: number = 3000,
    ) => {
      const id = Math.random().toString(36).substr(2, 9);
      setToasts((prev) => [...prev, { id, type, title, message, duration }]);
    },
    [],
  );

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showAlert = useCallback((options: AlertOptions) => {
    setAlertOptions(options);
    setAlertVisible(true);
  }, []);

  const closeAlert = useCallback(() => {
    setAlertVisible(false);
    setAlertOptions(null);
  }, []);

  const showOrderSuccess = useCallback((options: OrderSuccessOptions) => {
    setOrderOptions(options);
    setOrderVisible(true);
  }, []);

  const closeOrderSuccess = useCallback(() => {
    setOrderVisible(false);
    setOrderOptions(null);
  }, []);

  return (
    <ToastContext.Provider
      value={{ showToast, showAlert, showOrderSuccess, hideToast }}
    >
      {children}

      {/* Toast Container */}
      <View style={styles.toastWrapper} pointerEvents="box-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onHide={hideToast} />
        ))}
      </View>

      {/* Alert Modal */}
      <AlertModal
        visible={alertVisible}
        options={alertOptions}
        onClose={closeAlert}
      />

      {/* Order Success Modal */}
      <OrderSuccessModal
        visible={orderVisible}
        options={orderOptions}
        onClose={closeOrderSuccess}
      />
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  // Toast styles
  toastWrapper: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 9999,
  },
  toastContainer: {
    width: width - 32,
    marginBottom: spacing.sm,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    ...shadows.md,
  },
  iconContainer: {
    marginRight: spacing.md,
  },
  toastContent: {
    flex: 1,
  },
  toastTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 2,
  },
  toastMessage: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  closeIcon: {
    marginLeft: spacing.sm,
  },

  // Alert Modal styles
  alertOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  alertContainer: {
    width: "100%",
    maxWidth: 360,
  },
  alertCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: "center",
    ...shadows.md,
  },
  alertIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  alertMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  alertButtons: {
    flexDirection: "row",
    gap: spacing.md,
    width: "100%",
  },
  alertButtonCancel: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  alertButtonCancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  alertButtonConfirm: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: "center",
  },
  alertButtonConfirmText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFF",
  },

  // Order Success Modal styles
  orderOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  orderContainer: {
    width: "100%",
    maxWidth: 340,
  },
  orderCard: {
    borderRadius: borderRadius.xxl,
    padding: spacing.xxl,
    alignItems: "center",
    ...shadows.md,
  },
  orderIconOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  orderIconInner: {
    alignItems: "center",
    justifyContent: "center",
  },
  orderTitle: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  orderSubtitle: {
    fontSize: 16,
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  orderDetailsBox: {
    backgroundColor: "rgba(0,0,0,0.2)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  orderDetails: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
  },
  orderHint: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: spacing.lg,
    textAlign: "center",
    opacity: 0.7,
  },
});
