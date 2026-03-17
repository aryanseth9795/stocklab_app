import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius } from "../theme";
import { useAuth } from "../context/AuthContext";
import { Card, Button, AuthGuard } from "../components";

export default function AccountScreen() {
  const navigation = useNavigation<any>();
  const { user, isAuthed, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          setLoggingOut(true);
          try {
            await logout();
          } catch (error) {
            console.error("Logout error:", error);
          } finally {
            setLoggingOut(false);
          }
        },
      },
    ]);
  };

  return (
    <AuthGuard screenName="your account">
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Account</Text>
            <Text style={styles.subtitle}>Manage your profile</Text>
          </View>

          {/* User Card */}
          <Card style={styles.userCard}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user?.name?.charAt(0)?.toUpperCase() || "U"}
                </Text>
              </View>
            </View>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            <View style={styles.joinedBadge}>
              <Ionicons
                name="calendar-outline"
                size={12}
                color={colors.textMuted}
              />
              <Text style={styles.joinedText}>
                Joined {joinedDate(user?.createdAt)}
              </Text>
            </View>
          </Card>

          {/* Stats */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="wallet-outline" size={24} color={colors.indigo} />
              <Text style={styles.statValue}>
                ₹{user?.balance?.toFixed(2) || "0.00"}
              </Text>
              <Text style={styles.statLabel}>Wallet Balance</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons
                name="trending-up-outline"
                size={24}
                color={colors.emerald}
              />
              <Text style={styles.statValue}>
                ₹{user?.totalInvested?.toFixed(2) || "0.00"}
              </Text>
              <Text style={styles.statLabel}>Total Invested</Text>
            </View>
          </View>

          {/* Menu Items */}
          <Card style={styles.menuCard}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate("EditProfile")}
            >
              <View style={styles.menuLeft}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={colors.textSecondary}
                />
                <Text style={styles.menuText}>Edit Profile</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate("Dashboard")}
            >
              <View style={styles.menuLeft}>
                <Ionicons
                  name="stats-chart-outline"
                  size={20}
                  color={colors.textSecondary}
                />
                <Text style={styles.menuText}>Dashboard</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuLeft}>
                <Ionicons
                  name="notifications-outline"
                  size={20}
                  color={colors.textSecondary}
                />
                <Text style={styles.menuText}>Notifications</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuLeft}>
                <Ionicons
                  name="shield-outline"
                  size={20}
                  color={colors.textSecondary}
                />
                <Text style={styles.menuText}>Security</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuLeft}>
                <Ionicons
                  name="help-circle-outline"
                  size={20}
                  color={colors.textSecondary}
                />
                <Text style={styles.menuText}>Help & Support</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </Card>

          {/* Logout */}
          <Card style={styles.logoutCard}>
            <Button
              title="Logout"
              variant="danger"
              onPress={handleLogout}
              loading={loggingOut}
              fullWidth
            />
          </Card>

          {/* Footer */}
          <Text style={styles.footer}>
            StockLabs v1.0.0 • Developed by Aryan Seth
          </Text>
        </ScrollView>
      </SafeAreaView>
    </AuthGuard>
  );
}

const joinedDate = (createdAt: string | undefined) =>
  createdAt ? new Date(createdAt).toLocaleDateString() : "N/A";

const styles = StyleSheet.create({
  container: {
    // flex: 1 causes gap between screen and tabs
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1, // Fill screen when content is minimal
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  userCard: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    marginBottom: spacing.lg,
  },
  avatarContainer: {
    marginBottom: spacing.md,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.indigo,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 28,
    fontWeight: "600",
    color: "#fff",
  },
  userName: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  userEmail: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  joinedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  joinedText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  statsGrid: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: "center",
    gap: spacing.sm,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  menuCard: {
    padding: 0,
    marginBottom: spacing.lg,
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  menuText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
  },
  logoutCard: {
    marginBottom: spacing.xl,
  },
  footer: {
    fontSize: 11,
    color: colors.textDisabled,
    textAlign: "center",
  },
  authRequired: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
  },
  authTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  authText: {
    fontSize: 14,
    color: colors.textMuted,
  },
});
