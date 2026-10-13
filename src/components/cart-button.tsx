import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useEffect } from "react";
import { Text } from "react-native";
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import { PressableScale } from "@/components/ui/pressable-scale";
import { useI18n } from "@/i18n";
import { useCart } from "@/lib/cart";
import { colors, fonts, shadow } from "@/theme/tokens";

export function CartButton() {
  const { t } = useI18n();
  const { count } = useCart();
  const pop = useSharedValue(1);

  // A single small pulse when the count changes.
  useEffect(() => {
    if (count > 0) pop.set(withSequence(withTiming(1.12, { duration: 120 }), withTiming(1, { duration: 160 })));
  }, [count, pop]);
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={count > 0 ? `${t.cart}, ${t.itemsInCart(count)}` : t.cart}
      onPress={() => router.push("/cart")}
      style={[{ width: 48, height: 48, alignItems: "center", justifyContent: "center", borderRadius: 24, backgroundColor: colors.white }, shadow.card]}
    >
      <Ionicons name="bag-handle" size={22} color={colors.black} />
      {count > 0 && (
        <Animated.View
          entering={FadeIn.duration(150)}
          style={[{ position: "absolute", top: -4, end: -4, minWidth: 22, height: 22, paddingHorizontal: 5, borderRadius: 11, backgroundColor: colors.orange, alignItems: "center", justifyContent: "center" }, popStyle]}
        >
          <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: colors.white }}>{count}</Text>
        </Animated.View>
      )}
    </PressableScale>
  );
}
