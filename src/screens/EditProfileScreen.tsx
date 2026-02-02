import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, typography } from "../theme";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { updateProfile } from "../api";
import { Button, Input, Card } from "../components";

export default function EditProfileScreen() {
  const navigation = useNavigation();
  const { user, refreshUser } = useAuth();
  const { showToast, showAlert } = useToast();

  const [name, setName] = useState(user?.name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  const handleSave = async () => {
    // Validate name
    if (!name.trim()) {
      showAlert({
        title: "Validation Error",
        message: "Name cannot be empty",
        type: "error",
        confirmText: "OK",
      });
      return;
    }

    // Validate password if changing
    if (newPassword || currentPassword) {
      if (!currentPassword) {
        showAlert({
          title: "Validation Error",
          message: "Please enter your current password",
          type: "error",
          confirmText: "OK",
        });
        return;
      }

      if (newPassword.length < 6) {
        showAlert({
          title: "Validation Error",
          message: "New password must be at least 6 characters",
          type: "error",
          confirmText: "OK",
        });
        return;
      }

      if (newPassword !== confirmPassword) {
        showAlert({
          title: "Validation Error",
          message: "New passwords do not match",
          type: "error",
          confirmText: "OK",
        });
        return;
      }
    }

    setLoading(true);
    try {
      const payload: {
        name?: string;
        currentPassword?: string;
        newPassword?: string;
      } = {};

      // Only include name if changed
      if (name.trim() !== user?.name) {
        payload.name = name.trim();
      }

      // Include password fields if changing password
      if (newPassword && currentPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      if (Object.keys(payload).length === 0) {
        showToast("info", "No Changes", "No changes to save");
        setLoading(false);
        return;
      }

      const result = await updateProfile(payload);

      if (result.success) {
        showToast("success", "Profile Updated", result.message);
        await refreshUser();
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        navigation.goBack();
      } else {
        showAlert({
          title: "Update Failed",
          message: result.message,
          type: "error",
          confirmText: "OK",
        });
      }
    } catch (error: any) {
      showAlert({
        title: "Error",
        message: error.message || "Failed to update profile",
        type: "error",
        confirmText: "OK",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Info Card */}
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Basic Information</Text>

            <Input
              label="Full Name"
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              autoCapitalize="words"
              containerStyle={styles.inputContainer}
            />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user?.email || "—"}</Text>
            </View>
          </Card>

          {/* Password Change Card */}
          <Card style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Change Password</Text>
              <TouchableOpacity
                onPress={() => setShowPasswords(!showPasswords)}
              >
                <Ionicons
                  name={showPasswords ? "eye-off" : "eye"}
                  size={20}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.sectionSubtitle}>
              Leave empty to keep current password
            </Text>

            <Input
              label="Current Password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="••••••••"
              secureTextEntry={!showPasswords}
              containerStyle={styles.inputContainer}
            />

            <Input
              label="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="••••••••"
              secureTextEntry={!showPasswords}
              containerStyle={styles.inputContainer}
            />

            <Input
              label="Confirm New Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="••••••••"
              secureTextEntry={!showPasswords}
              containerStyle={styles.inputContainer}
            />
          </Card>

          {/* Save Button */}
          <Button
            title="Save Changes"
            variant="primary"
            fullWidth
            onPress={handleSave}
            loading={loading}
            disabled={loading}
            style={styles.saveButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
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
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  headerSpacer: {
    width: 40,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.huge,
  },
  card: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.md,
  },
  infoLabel: {
    ...typography.body,
    color: colors.textMuted,
  },
  infoValue: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "500",
  },
  saveButton: {
    marginTop: spacing.md,
  },
});
