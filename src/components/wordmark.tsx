import { Text } from "react-native";
import { colors, fonts } from "@/theme/tokens";

/** Text placeholder. Replace with the official logo asset once supplied. */
export function Wordmark({ size = 28, color = colors.orange }: { size?: number; color?: string }) {
  return (
    <Text accessibilityRole="header" accessibilityLabel="RVRS" style={{ fontFamily: fonts.display, fontSize: size, color, letterSpacing: -0.5 }}>
      RVRS
    </Text>
  );
}
