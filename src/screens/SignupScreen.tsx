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
import { useAuth } from "../context/AuthContext";

export default function SignupScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { signup } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
  }>({});

  const validate = () => {
    const newErrors: { name?: string; email?: string; password?: string } = {};

    if (!name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Invalid email format";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const result = await signup(name.trim(), email.trim(), password);
      if (!result.success) {
        Alert.alert("Signup Failed", result.message);
      } else {
        // Success - go back to previous screen
        navigation.goBack();
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    navigation.goBack();
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      {/* Close button */}
      <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
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
          {/* Logo/Brand */}
          <View style={styles.brand}>
            <Text style={styles.brandTitle}>Stock Labs</Text>
            <Text style={styles.brandSubtitle}>Paper Trading Platform</Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Create your account</Text>
              <Text style={styles.cardDescription}>
                Start paper trading in minutes
              </Text>
            </View>

            <View style={styles.form}>
              <Input
                label="Full Name"
                placeholder="Enter your name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoComplete="name"
                error={errors.name}
              />

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

              <Input
                label="Password"
                placeholder="Create a password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password-new"
                error={errors.password}
              />

              <Button
                title="Create Account"
                onPress={handleSignup}
                loading={loading}
                disabled={loading}
                fullWidth
                style={styles.signupBtn}
              />
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.footerText}>Already have an account?</Text>
              <TouchableOpacity
                onPress={() => {
                  navigation.goBack();
                  setTimeout(() => navigation.navigate("Login" as never), 100);
                }}
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
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
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
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.xl,
  },
  brand: {
    alignItems: "center",
    marginBottom: spacing.xxxl,
  },
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
  cardHeader: {
    marginBottom: spacing.xl,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  cardDescription: {
    fontSize: 13,
    color: colors.textMuted,
  },
  form: {
    marginBottom: spacing.lg,
  },
  signupBtn: {
    marginTop: spacing.md,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.xs,
  },
  footerText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  footerLink: {
    fontSize: 13,
    color: colors.indigo,
    fontWeight: "500",
  },
});
