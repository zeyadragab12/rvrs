import type { ReactNode } from "react";
import type { LayoutChangeEvent, StyleProp, ViewStyle } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

/** Fades children in on mount. Calm by design: no slide, no spring and no stagger (index is accepted but ignored). */
export function Reveal({ children, style, onLayout }: { children: ReactNode; index?: number; style?: StyleProp<ViewStyle>; onLayout?: (e: LayoutChangeEvent) => void }) {
  return (
    <Animated.View entering={FadeIn.duration(250)} style={style} onLayout={onLayout}>
      {children}
    </Animated.View>
  );
}
