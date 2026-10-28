import { router } from "expo-router";
import { Text } from "react-native";
import { PressableScale } from "@/components/ui/pressable-scale";
import { colors, fonts } from "@/theme/tokens";

/** Text placeholder. Replace with the official logo asset once supplied. Tapping it goes to the home screen. */
export function Wordmark({ size = 28, color = colors.orange }: { size?: number; color?: string }) {
  return (
    <PressableScale
      accessibilityRole="link"
      accessibilityLabel="RVRS"
      haptic={false}
      scaleTo={0.94}
      hitSlop={8}
      onPress={() => router.navigate("/")}
    >
      <Text style={{ fontFamily: fonts.display, fontSize: size, color, letterSpacing: -0.5 }}>RVRS</Text>
    </PressableScale>
  );
}
