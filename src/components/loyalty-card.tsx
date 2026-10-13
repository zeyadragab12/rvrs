import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect } from "react";
import { Text, View } from "react-native";
import Animated, { Easing, FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { Skeleton } from "@/components/ui/skeleton";
import { PressableScale } from "@/components/ui/pressable-scale";
import { useI18n } from "@/i18n";
import { useLoyalty } from "@/lib/loyalty";
import { STAMPS_NEEDED } from "@/lib/loyalty-rules";
import { colors, fonts, radius, shadow } from "@/theme/tokens";

const SLOT = 48;

/** Soft ring that breathes around the newest stamp or the reward. */
function Breathe({ size, color }: { size: number; color: string }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withRepeat(withTiming(1, { duration: 2600, easing: Easing.out(Easing.quad) }), -1, false));
  }, [p]);
  const style = useAnimatedStyle(() => ({ opacity: 0.3 * (1 - p.value), transform: [{ scale: 1 + p.value * 0.3 }] }));
  return <Animated.View pointerEvents="none" style={[{ position: "absolute", width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]} />;
}

function Slot({ index, filled, pending, newest }: { index: number; filled: boolean; pending: boolean; newest: boolean }) {
  return (
    <View style={{ width: SLOT, height: SLOT, alignItems: "center", justifyContent: "center" }}>
      {filled ? (
        <>
          {newest && <Breathe size={SLOT} color={colors.orange} />}
          <Animated.View
            entering={FadeIn.duration(300)}
            style={{ width: SLOT, height: SLOT, borderRadius: SLOT / 2, backgroundColor: colors.orange, alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name="fast-food" size={24} color={colors.white} />
          </Animated.View>
        </>
      ) : pending ? (
        // An order is on its way: the stamp is reserved but not earned until the order is completed.
        <View style={{ width: SLOT, height: SLOT, borderRadius: SLOT / 2, borderWidth: 2, borderStyle: "dashed", borderColor: colors.orange, backgroundColor: "rgba(241,90,36,0.16)", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="time-outline" size={22} color={colors.orange} />
        </View>
      ) : (
        <View style={{ width: SLOT, height: SLOT, borderRadius: SLOT / 2, borderWidth: 2, borderStyle: "dashed", borderColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: "rgba(255,255,255,0.3)" }}>{index + 1}</Text>
        </View>
      )}
    </View>
  );
}

/** Stamp card: ten slots, and the eleventh order is free. Stamps come from completed orders. */
export function LoyaltyCard() {
  const { t } = useI18n();
  const { signedIn, loading, stamps, unlocked, rewardPending, remaining, pending, refetch } = useLoyalty();
  const ready = unlocked && !rewardPending;

  // Stamps change when staff complete an order, so refresh each time the customer comes back to this screen.
  useFocusEffect(
    useCallback(() => {
      if (signedIn) refetch();
    }, [signedIn, refetch]),
  );

  const label = !signedIn ? t.loyaltyGuest : rewardPending ? t.loyaltyInUse : ready ? t.loyaltyReady : pending > 0 ? t.loyaltyPending(pending) : t.loyaltyMore(remaining);

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${t.loyaltyTitle}. ${signedIn ? t.loyaltyCount(stamps) + ". " : ""}${label}`}
      onPress={() => router.push(signedIn ? "/menu" : "/profile")}
      scaleTo={0.98}
      style={[{ backgroundColor: colors.black, borderRadius: radius.xl, padding: 20, gap: 18, overflow: "hidden" }, shadow.lift]}
    >
      <View style={{ position: "absolute", top: -70, end: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(241,90,36,0.18)" }} />

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.orange, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="ribbon" size={20} color={colors.white} />
          </View>
          <Text style={{ fontFamily: fonts.bold, fontSize: 18, letterSpacing: -0.3, color: colors.cream }}>{t.loyaltyTitle}</Text>
        </View>
        {signedIn && (
          <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: "rgba(255,255,255,0.12)" }}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.cream }}>{t.loyaltyCount(stamps)}</Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={{ gap: 12 }}>
          <Skeleton height={SLOT} r={SLOT / 2} style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />
          <Skeleton height={SLOT} r={SLOT / 2} style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {[0, 1].map((row) => (
            <View key={row} style={{ flexDirection: "row", justifyContent: "space-between" }}>
              {Array.from({ length: STAMPS_NEEDED / 2 }, (_, c) => {
                const i = row * (STAMPS_NEEDED / 2) + c;
                return <Slot key={i} index={i} filled={i < stamps} pending={i >= stamps && i < stamps + pending} newest={i === stamps - 1 && !unlocked} />;
              })}
            </View>
          ))}

          {/* The eleventh slot is the reward. It lights up once the ten stamps are collected. */}
          <View style={{ minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: radius.pill, backgroundColor: unlocked ? colors.yellow : "rgba(255,255,255,0.08)", borderWidth: unlocked ? 0 : 2, borderStyle: "dashed", borderColor: "rgba(255,255,255,0.22)" }}>
            {ready && <Breathe size={56} color={colors.yellow} />}
            {unlocked ? (
              <Ionicons name="gift" size={24} color={colors.black} />
            ) : (
              <Ionicons name="gift-outline" size={22} color="rgba(255,255,255,0.4)" />
            )}
            <Text style={{ fontFamily: fonts.display, fontSize: 18, letterSpacing: 1, color: unlocked ? colors.black : "rgba(255,255,255,0.4)" }}>
              {t.loyaltyFree}
            </Text>
          </View>
        </View>
      )}

      <Animated.Text entering={FadeIn.duration(300)} style={{ fontFamily: fonts.bold, fontSize: 14, lineHeight: 20, color: ready ? colors.yellow : "rgba(251,247,241,0.75)" }}>
        {label}
      </Animated.Text>
    </PressableScale>
  );
}
