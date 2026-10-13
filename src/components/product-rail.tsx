import { router } from "expo-router";
import { FlatList, Text, View } from "react-native";
import { ProductCard } from "@/components/product-card";
import { PressableScale } from "@/components/ui/pressable-scale";
import { useI18n } from "@/i18n";
import type { Category, Product } from "@/lib/menu";
import { colors, fonts } from "@/theme/tokens";

const SIDE = 20;

/** A category as a titled, horizontally scrolling row of product cards. */
export function ProductRail({ category, products }: { category: Category; products: Product[] }) {
  const { t, pick } = useI18n();
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text accessibilityRole="header" style={{ fontFamily: fonts.bold, fontSize: 22, letterSpacing: -0.4, color: colors.black }}>
          {pick(category.name_en, category.name_ar)}
        </Text>
        <PressableScale
          accessibilityRole="button"
          onPress={() => router.push({ pathname: "/menu", params: { category: category.id } })}
          style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 4 }}
        >
          <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.orange }}>{t.seeAll}</Text>
        </PressableScale>
      </View>
      <FlatList
        horizontal
        data={products}
        keyExtractor={(p) => p.id}
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -SIDE }}
        contentContainerStyle={{ paddingHorizontal: SIDE, gap: 12, paddingVertical: 10 }}
        renderItem={({ item }) => (
          <View style={{ width: 164 }}>
            <ProductCard product={item} compact />
          </View>
        )}
      />
    </View>
  );
}
