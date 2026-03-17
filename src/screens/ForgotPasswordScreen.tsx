import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius } from "../theme";
import { Button, Input } from "../components/ui";
import { config } from "../config";

type Step = "email" | "otp";

export default function ForgotPasswordScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    otp?: string;
    newPassword?: string;
  }>({});

  // ── Step 1: Request OTP ────────────────────────────────────────────────────
  const handleRequestOtp = async () => {
    const newErrors: typeof errors = {};
    if (!email.trim()) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email))
      newErrors.email = "Invalid email format";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    try {
      const res = await fetch(`${config.apiUrl}/forget`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setStep("otp");
      } else {
        Alert.alert("Error", data.message || "Something went wrong");
      }
    } catch {
      Alert.alert("Error", "Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify OTP + set new password ─────────────────────────────────
  const handleResetPassword = async () => {
    const newErrors: typeof errors = {};
    if (!otp.trim()) newErrors.otp = "OTP is required";
    else if (otp.length !== 6) newErrors.otp = "OTP must be 6 digits";
    if (!newPassword) newErrors.newPassword = "New password is required";
    else if (newPassword.length < 6)
      newErrors.newPassword = "Password must be at least 6 characters";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    try {
      const res = await fetch(`${config.apiUrl}/forget/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          otp: otp.trim(),
          newPassword,
        }),
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert("Success", "Password reset successfully!", [
          {
            text: "Go to Login",
            onPress: () =>
              (navigation as any).reset({
                index: 1,
                routes: [{ name: "Main" }, { name: "Login" }],
              }),
          },
        ]);
      } else {
        Alert.alert("Error", data.message || "Something went wrong");
      }
    } catch {
      Alert.alert("Error", "Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      {/* Close button */}
      <TouchableOpacity
        style={styles.closeBtn}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="close" size={24} color={colors.textPrimary} />
      </TouchableOpacity>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Brand */}
          <View style={styles.brand}>
            <Text style={styles.brandTitle}>Stock Labs</Text>
            <Text style={styles.brandSubtitle}>Paper Trading Platform</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>
                {step === "email" ? "Forgot Password?" : "Enter OTP"}
              </Text>
              <Text style={styles.cardDescription}>
                {step === "email"
                  ? "We'll send a 6-digit OTP to your email."
                  : `OTP sent to ${email}. Check your inbox.`}
              </Text>
            </View>

            <View style={styles.form}>
              {step === "email" ? (
                <>
                  <Input
                    label="Email"
                    placeholder="Enter your email"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    error={errors.email}
                  />
                  <Button
                    title="Send OTP"
                    onPress={handleRequestOtp}
                    loading={loading}
                    disabled={loading}
                    fullWidth
                    style={styles.actionBtn}
                  />
                </>
              ) : (
                <>
                  <Input
                    label="OTP"
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                    error={errors.otp}
                  />
                  <Input
                    label="New Password"
                    placeholder="Create a new password"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                    error={errors.newPassword}
                  />
                  <Button
                    title="Reset Password"
                    onPress={handleResetPassword}
                    loading={loading}
                    disabled={loading}
                    fullWidth
                    style={styles.actionBtn}
                  />
                  <TouchableOpacity
                    style={styles.resendLink}
                    onPress={() => {
                      setStep("email");
                      setOtp("");
                      setErrors({});
                    }}
                  >
                    <Text style={styles.resendText}>
                      Didn't receive OTP? Go back
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.footerText}>Remembered your password?</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("Login" as never)}
              >
                <Text style={styles.footerLink}>Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  closeBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.xl,
  },
  brand: { alignItems: "center", marginBottom: spacing.xxxl },
  brandTitle: {
    fontSize: 36,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: -1,
  },
  brandSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
  },
  cardHeader: { marginBottom: spacing.xl },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  cardDescription: { fontSize: 13, color: colors.textMuted },
  form: { marginBottom: spacing.lg },
  actionBtn: { marginTop: spacing.md },
  resendLink: { alignSelf: "center", marginTop: spacing.md },
  resendText: {
    fontSize: 12,
    color: colors.textMuted,
    textDecorationLine: "underline",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.xs,
  },
  footerText: { fontSize: 13, color: colors.textMuted },
  footerLink: { fontSize: 13, color: colors.indigo, fontWeight: "500" },
});
