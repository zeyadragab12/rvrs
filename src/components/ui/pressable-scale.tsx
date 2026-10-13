import * as Haptics from "expo-haptics";
import { Platform, Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, "style"> & {
  style?: StyleProp<ViewStyle>;
  /** Scale while pressed. Smaller values feel heavier. */
  scaleTo?: number;
  haptic?: boolean;
};

/** Pressable that dips slightly on touch and gives a light haptic tap. Drop-in for Pressable. */
export function PressableScale({ style, scaleTo = 0.97, haptic = true, onPressIn, onPressOut, onPress, disabled, ...rest }: Props) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        scale.set(withTiming(scaleTo, { duration: 90 }));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withTiming(1, { duration: 140 }));
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic && Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress?.(e);
      }}
      style={[style, anim]}
    />
  );
}
