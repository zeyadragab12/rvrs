import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { FlatList, Text, useWindowDimensions, View } from "react-native";
import { PressableScale } from "@/components/ui/pressable-scale";
import { useI18n } from "@/i18n";
import type { Product } from "@/lib/menu";
import { colors, fonts, radius, shadow } from "@/theme/tokens";

const GAP = 14;
const SIDE = 20;

function FeatureCard({ product, width, rank }: { product: Product; width: number; rank: number }) {
  const { t, pick, price } = useI18n();
  const name = pick(product.name_en, product.name_ar);
  const desc = pick(product.description_en, product.description_ar);
  const img = product.image_paths[0];
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${price(product.base_price)}`}
      scaleTo={0.97}
      onPress={() => router.push({ pathname: "/product/[id]", params: { id: product.id } })}
      style={[{ width, height: 250, borderRadius: radius.xl, overflow: "hidden", backgroundColor: colors.black }, shadow.lift]}
    >
      {img ? (
        <Image source={{ uri: img }} contentFit="cover" transition={250} style={{ position: "absolute", width: "100%", height: "100%" }} accessibilityLabel={name} />
      ) : (
        <View style={{ position: "absolute", width: "100%", height: "100%", backgroundColor: colors.orange, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="fast-food" size={90} color={colors.white} style={{ opacity: 0.25 }} />
        </View>
      )}
      <View style={{ position: "absolute", top: 14, start: 14, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: colors.yellow }}>
        <Text style={{ fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1, color: colors.black }}>{`#${rank} ${t.recommended}`.toUpperCase()}</Text>
      </View>
      <View style={{ position: "absolute", start: 0, end: 0, bottom: 0, padding: 16, gap: 4, backgroundColor: "rgba(23,19,15,0.72)", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text numberOfLines={1} style={{ fontFamily: fonts.display, fontSize: 20, color: colors.white }}>{name}</Text>
          {!!desc && <Text numberOfLines={1} style={{ fontFamily: fonts.body, fontSize: 13, color: colors.white, opacity: 0.8 }}>{desc}</Text>}
          <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.yellow, marginTop: 2 }}>{price(product.base_price)}</Text>
        </View>
        <View style={[{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.orange, alignItems: "center", justifyContent: "center" }, shadow.glow]}>
          <Ionicons name="add" size={26} color={colors.white} />
        </View>
      </View>
    </PressableScale>
  );
}

/** Large photo cards that snap one at a time. */
export function FeatureSlider({ products }: { products: Product[] }) {
  const { width: screen } = useWindowDimensions();
  const cardW = screen - SIDE * 2 - 36;
  return (
    <FlatList
      horizontal
      data={products}
      keyExtractor={(p) => p.id}
      showsHorizontalScrollIndicator={false}
      snapToInterval={cardW + GAP}
      decelerationRate="fast"
      disableIntervalMomentum
      style={{ marginHorizontal: -SIDE }}
      contentContainerStyle={{ paddingHorizontal: SIDE, gap: GAP, paddingVertical: 10 }}
      renderItem={({ item, index }) => <FeatureCard product={item} width={cardW} rank={index + 1} />}
    />
  );
}
