import Ionicons from "@expo/vector-icons/Ionicons";
import { Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useI18n } from "@/i18n";
import type { OpenStatus } from "@/lib/hours";
import { colors, fonts, radius } from "@/theme/tokens";

export function closedMessage(t: ReturnType<typeof useI18n>["t"], s: OpenStatus) {
  if (!s.opensAt || !s.opensDay) return t.closedNow;
  return `${t.closedNow} ${s.today ? t.opensToday(s.opensAt) : t.opensOn(t.days[s.opensDay] ?? s.opensDay, s.opensAt)}`;
}

/** Shown when the branch is closed. Text and icon carry the meaning, not colour alone. */
export function ClosedBanner({ status, hint = false }: { status: OpenStatus; hint?: boolean }) {
  const { t } = useI18n();
  if (status.open) return null;
  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      accessibilityRole="alert"
      style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, backgroundColor: colors.yellowSoft, borderRadius: radius.md }}
    >
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.yellow, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name="time" size={22} color={colors.black} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.black }}>{closedMessage(t, status)}</Text>
        {hint && <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.gray }}>{t.closedOrderHint}</Text>}
      </View>
    </Animated.View>
  );
}
