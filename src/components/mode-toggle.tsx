import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState } from "react";
import { I18nManager, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { PressableScale } from "@/components/ui/pressable-scale";
import { useFulfillment } from "@/lib/fulfillment";
import { useI18n } from "@/i18n";
import { colors, fonts, radius, shadow } from "@/theme/tokens";

const PAD = 4;

/** Segmented control with a thumb that slides between Delivery and Pickup. */
export function ModeToggle() {
  const { mode, setMode } = useFulfillment();
  const { t } = useI18n();
  const [width, setWidth] = useState(0);
  const items = [
    { key: "delivery", label: t.delivery, icon: "bicycle" },
    { key: "pickup", label: t.pickup, icon: "storefront" },
  ] as const;
  const index = mode === "pickup" ? 1 : 0;
  const segment = (width - PAD * 2) / 2;
  const dir = I18nManager.isRTL ? -1 : 1;

  const thumb = useSharedValue(0);
  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: thumb.value }] }));
  useEffect(() => {
    if (width > 0) thumb.set(withTiming(index * segment * dir, { duration: 220, easing: Easing.out(Easing.cubic) }));
  }, [index, segment, dir, width, thumb]);

  return (
    <View
      accessibilityRole="tablist"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[{ flexDirection: "row", borderRadius: radius.pill, backgroundColor: colors.white, padding: PAD }, shadow.card]}
    >
      {width > 0 && (
        <Animated.View style={[{ position: "absolute", top: PAD, bottom: PAD, start: PAD, width: segment, borderRadius: radius.pill, backgroundColor: colors.black }, thumbStyle]} />
      )}
      {items.map((i) => {
        const on = mode === i.key;
        return (
          <PressableScale
            key={i.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => setMode(i.key)}
            scaleTo={0.97}
            style={{ flex: 1, minHeight: 48, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name={i.icon} size={18} color={on ? colors.cream : colors.gray} />
            <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: on ? colors.cream : colors.gray }}>{i.label}</Text>
          </PressableScale>
        );
      })}
    </View>
  );
}
