import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { Text, useWindowDimensions, View } from "react-native";
import Animated, { Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, type SharedValue } from "react-native-reanimated";
import { PressableScale } from "@/components/ui/pressable-scale";
import { useI18n } from "@/i18n";
import { useLoyalty } from "@/lib/loyalty";
import { useMenu } from "@/lib/menu";
import { offers, type Offer } from "@/lib/offers";
import { colors, fonts, radius, shadow } from "@/theme/tokens";

const GAP = 12;
const SIDE = 20;

function OfferCard({ offer, width }: { offer: Offer; width: number }) {
  const { locale } = useI18n();
  const menu = useMenu();
  const { signedIn } = useLoyalty();
  const categoryId = offer.category ? menu.data?.categories.find((c) => c.name_en.trim().toLowerCase() === offer.category)?.id : undefined;
  const ar = locale === "ar";
  const tag = ar ? offer.tag_ar : offer.tag_en;
  const title = ar ? offer.title_ar : offer.title_en;
  const sub = ar ? offer.sub_ar : offer.sub_en;
  const cta = ar ? offer.cta_ar : offer.cta_en;
  const dark = offer.bg === colors.black;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${tag}. ${title.replace("\n", " ")}. ${cta}`}
      onPress={() => router.navigate(offer.guestRoute && !signedIn ? offer.guestRoute : categoryId ? { pathname: "/menu", params: { category: categoryId } } : "/menu")}
      scaleTo={0.97}
      style={[{ width, minHeight: 196, backgroundColor: offer.bg, borderRadius: radius.xl, padding: 22, justifyContent: "space-between", overflow: "hidden" }, dark ? shadow.lift : shadow.card]}
    >
      <View style={{ position: "absolute", top: -50, end: -40, width: 170, height: 170, borderRadius: 85, backgroundColor: "rgba(255,255,255,0.12)" }} />
      <Ionicons name={offer.icon} size={96} color={offer.fg} style={{ position: "absolute", end: 12, bottom: 8, opacity: 0.16, transform: [{ rotate: "-10deg" }] }} />
      <View style={{ alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: dark ? colors.orange : "rgba(23,19,15,0.14)" }}>
        <Text style={{ fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1, color: dark ? colors.white : offer.fg }}>{tag}</Text>
      </View>
      <View style={{ gap: 6, marginTop: 14 }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 26, lineHeight: 30, color: offer.fg }}>{title}</Text>
        <Text style={{ fontFamily: fonts.medium, fontSize: 14, lineHeight: 19, color: offer.fg, opacity: 0.85 }}>{sub}</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14 }}>
        <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: offer.fg }}>{cta}</Text>
        <Ionicons name="arrow-forward" size={16} color={offer.fg} />
      </View>
    </PressableScale>
  );
}

function Dot({ index, x, step }: { index: number; x: SharedValue<number>; step: number }) {
  const style = useAnimatedStyle(() => {
    const d = Math.abs(x.value / step - index);
    return {
      width: interpolate(d, [0, 1], [22, 8], Extrapolation.CLAMP),
      opacity: interpolate(d, [0, 1], [1, 0.3], Extrapolation.CLAMP),
    };
  });
  return <Animated.View style={[{ height: 8, borderRadius: 4, backgroundColor: colors.orange }, style]} />;
}

/** Snapping banner carousel with a stretching pagination dot. */
export function OfferCarousel() {
  const { width: screen } = useWindowDimensions();
  const cardW = screen - SIDE * 2 - 24;
  const step = cardW + GAP;
  const x = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    x.set(e.contentOffset.x);
  });

  return (
    <View style={{ gap: 14 }}>
      <Animated.FlatList
        horizontal
        data={offers}
        keyExtractor={(o) => o.id}
        showsHorizontalScrollIndicator={false}
        snapToInterval={step}
        decelerationRate="fast"
        disableIntervalMomentum
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={{ marginHorizontal: -SIDE }}
        contentContainerStyle={{ paddingHorizontal: SIDE, gap: GAP, paddingVertical: 10 }}
        renderItem={({ item }) => <OfferCard offer={item} width={cardW} />}
      />
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flexDirection: "row", justifyContent: "center", gap: 6 }}>
        {offers.map((o, i) => (
          <Dot key={o.id} index={i} x={x} step={step} />
        ))}
      </View>
    </View>
  );
}
