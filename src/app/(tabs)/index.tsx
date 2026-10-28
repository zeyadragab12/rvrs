import Ionicons from "@expo/vector-icons/Ionicons";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BranchPill, BranchSheet, useBranchPicker } from "@/components/branch-picker";
import { CartButton } from "@/components/cart-button";
import { ClosedBanner } from "@/components/closed-banner";
import { LoyaltyButton } from "@/components/loyalty-popup";
import { ModeToggle } from "@/components/mode-toggle";
import { OfferCarousel } from "@/components/offer-carousel";
import { OrderAgain } from "@/components/order-again";
import { FeatureSlider } from "@/components/feature-slider";
import { ProductRail } from "@/components/product-rail";
import { ErrorState, ProductSkeletons } from "@/components/states";
import { Reveal } from "@/components/ui/reveal";
import { Wordmark } from "@/components/wordmark";
import { useI18n } from "@/i18n";
import { HOME_CATEGORIES, RECOMMENDED_PRODUCTS, useBranchStatus, useMenu } from "@/lib/menu";
import { colors, fonts, tabBarSpace } from "@/theme/tokens";

export default function Home() {
  const { t } = useI18n();
  const menu = useMenu();
  const { status } = useBranchStatus();
  const picker = useBranchPicker();
  const recommended = RECOMMENDED_PRODUCTS.flatMap((name) => {
    const p = menu.data?.products.find((x) => x.is_available && x.name_en.trim().toLowerCase() === name);
    return p ? [p] : [];
  });
  const sections = HOME_CATEGORIES.flatMap((name) => {
    const category = menu.data?.categories.find((c) => c.name_en.trim().toLowerCase() === name);
    const products = category ? menu.data!.products.filter((p) => p.category_id === category.id && p.is_available).slice(0, 8) : [];
    return category && products.length > 0 ? [{ category, products }] : [];
  });

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.cream }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: tabBarSpace + 16, gap: 24 }} showsVerticalScrollIndicator={false}>
        <Reveal index={0} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Wordmark />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <LoyaltyButton />
            <CartButton />
          </View>
        </Reveal>

        <Reveal index={1} style={{ gap: 12 }}>
          <BranchPill onPress={picker.show} many={picker.many} />
          <ModeToggle />
        </Reveal>

        <ClosedBanner status={status} hint />

        <Reveal index={2}>
          <OfferCarousel />
        </Reveal>

        <OrderAgain />

        {recommended.length > 0 && (
          <Reveal index={3} style={{ gap: 2 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="flame" size={22} color={colors.orange} />
              <Text accessibilityRole="header" style={{ fontFamily: fonts.bold, fontSize: 22, letterSpacing: -0.4, color: colors.black }}>
                {t.recommended}
              </Text>
            </View>
            <FeatureSlider products={recommended} />
          </Reveal>
        )}

        {menu.isPending && <ProductSkeletons count={2} />}
        {menu.isError && <ErrorState onRetry={() => menu.refetch()} />}
        {sections.map((s) => (
          <ProductRail key={s.category.id} category={s.category} products={s.products} />
        ))}

        <Reveal index={9} style={{ paddingVertical: 8 }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 30, lineHeight: 34, color: colors.orange, opacity: 0.9, textTransform: "uppercase" }}>
            {t.tagline1} {t.tagline2} {t.tagline3}
          </Text>
        </Reveal>
      </ScrollView>
      <BranchSheet visible={picker.open} onClose={picker.close} />
    </SafeAreaView>
  );
}
