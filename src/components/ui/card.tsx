import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { colors, radius, shadow } from "@/theme/tokens";

/** Soft white surface with a warm shadow. */
export function Card({ children, style, padding = 16 }: { children: ReactNode; style?: StyleProp<ViewStyle>; padding?: number }) {
  return <View style={[{ backgroundColor: colors.white, borderRadius: radius.lg, padding, ...shadow.card }, style]}>{children}</View>;
}
