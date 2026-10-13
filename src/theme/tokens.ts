/** RVRS design tokens. Colours are proposed, not confirmed official brand values. */
export const colors = {
  orange: "#F15A24",
  orangeSoft: "#FDEBE2",
  black: "#17130F",
  cream: "#FBF7F1",
  yellow: "#FFD52A",
  yellowSoft: "#FFF4C7",
  white: "#FFFFFF",
  gray: "#6E675F",
  border: "#EBE3D8",
  danger: "#B3261E",
  dangerSoft: "#FBE9E7",
  success: "#1E7A46",
  successSoft: "#E3F3EA",
} as const;

export const fonts = {
  display: "ArchivoBlack_400Regular",
  body: "DMSans_400Regular",
  medium: "DMSans_500Medium",
  bold: "DMSans_700Bold",
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 10, md: 16, lg: 24, xl: 32, pill: 999 } as const;
/** Minimum touch target on both platforms. */
export const touch = 48;

/** Soft shadows tinted with a warm hue, never pure black. */
export const shadow = {
  card: { shadowColor: "#7A3A1A", shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  lift: { shadowColor: "#7A3A1A", shadowOpacity: 0.16, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
  glow: { shadowColor: "#F15A24", shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
} as const;

/** Height of the floating tab bar plus its gap. Tab screens pad their scroll content by this much. */
export const tabBarSpace = 108;
