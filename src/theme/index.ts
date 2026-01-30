// Theme colors - Modern Premium Dark Aesthetic
export const colors = {
  // Base
  background: "#050505", // Deeper black
  surface: "#121212", // Slightly lighter for cards
  surfaceLight: "#1E1E1E", // Lighter surface for interaction

  // Borders
  border: "rgba(255, 255, 255, 0.08)",
  borderHover: "rgba(255, 255, 255, 0.15)",
  borderHighlight: "rgba(255, 255, 255, 0.25)",

  // Text
  textPrimary: "#FFFFFF",
  textSecondary: "#A1A1AA", // Zinc-400
  textMuted: "#71717A", // Zinc-500
  textDisabled: "#52525B", // Zinc-600

  // Brand / Accents
  primary: "#6366F1", // Indigo-500
  secondary: "#EC4899", // Pink-500
  accent: "#8B5CF6", // Violet-500

  // Functional Colors
  success: "#10B981", // Emerald-500
  error: "#EF4444", // Red-500
  warning: "#F59E0B", // Amber-500
  info: "#3B82F6", // Blue-500

  // Gradients
  gradients: {
    primary: ["#4F46E5", "#7C3AED"] as const, // Indigo to Violet
    success: ["#059669", "#10B981"] as const, // Emerald Dark to Light
    danger: ["#DC2626", "#EF4444"] as const, // Red Dark to Light
    surface: ["rgba(255,255,255,0.05)", "rgba(255,255,255,0.02)"] as const, // Glassy
    card: ["#18181B", "#09090B"] as const, // Zinc-900 to Zinc-950
  },

  // Chart / Trading
  emerald: "#34D399",
  emeraldGlow: "rgba(52, 211, 153, 0.25)",
  rose: "#FB7185",
  roseGlow: "rgba(251, 113, 133, 0.25)",

  // Legacy Compatibility (Aliases)
  indigo: "#6366F1",
  cyan: "#67e8f9",
  emeraldLight: "rgba(52, 211, 153, 0.10)",
  emeraldBorder: "rgba(52, 211, 153, 0.30)",
  roseLight: "rgba(251, 113, 133, 0.10)",
  roseBorder: "rgba(251, 113, 133, 0.30)",
  surfaceHover: "#1E1E1E", // Alias for surfaceLight
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24, // More rounded for modern feel
  xxl: 32,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 5,
  }),
};

export const typography = {
  h1: {
    fontSize: 28,
    fontWeight: "700" as const,
    letterSpacing: -0.5,
    color: colors.textPrimary,
  },
  h2: {
    fontSize: 22,
    fontWeight: "600" as const,
    letterSpacing: -0.5,
    color: colors.textPrimary,
  },
  h3: {
    fontSize: 18,
    fontWeight: "600" as const,
    letterSpacing: -0.3,
    color: colors.textPrimary,
  },
  body: {
    fontSize: 15,
    fontWeight: "400" as const,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  label: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: colors.textMuted,
  },
  caption: {
    fontSize: 12,
    fontWeight: "400" as const,
    color: colors.textMuted,
  },
};
