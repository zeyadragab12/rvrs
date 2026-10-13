import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Text, View } from "react-native";
import { PressableScale } from "@/components/ui/pressable-scale";
import type { Product } from "@/lib/menu";
import { useI18n } from "@/i18n";
import { colors, fonts, radius, shadow } from "@/theme/tokens";

function Photo({ uri, label, fallback, style }: { uri?: string; label: string; fallback: string; style: object }) {
  return (
    <View style={[{ backgroundColor: colors.yellowSoft, overflow: "hidden", alignItems: "center", justifyContent: "center" }, style]}>
      {uri ? (
        <Image source={{ uri }} contentFit="cover" transition={250} style={{ width: "100%", height: "100%" }} accessibilityLabel={label} />
      ) : (
        <>
          <Ionicons name="fast-food" size={32} color={colors.orange} />
          <Text style={{ fontFamily: fonts.medium, fontSize: 11, color: colors.gray, marginTop: 4 }}>{fallback}</Text>
        </>
      )}
    </View>
  );
}

function AddBadge() {
  return (
    <View style={[{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.orange, alignItems: "center", justifyContent: "center" }, shadow.glow]}>
      <Ionicons name="add" size={22} color={colors.white} />
    </View>
  );
}

export function ProductCard({ product, compact = false }: { product: Product; compact?: boolean }) {
  const { t, pick, price } = useI18n();
  const name = pick(product.name_en, product.name_ar);
  const desc = pick(product.description_en, product.description_ar);
  const img = product.image_paths[0];
  const soldOut = !product.is_available;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${price(product.base_price)}${soldOut ? `, ${t.unavailable}` : ""}`}
      accessibilityState={{ disabled: soldOut }}
      disabled={soldOut}
      scaleTo={0.97}
      onPress={() => router.push({ pathname: "/product/[id]", params: { id: product.id } })}
      style={[
        {
          flex: compact ? 1 : undefined,
          flexDirection: compact ? "column" : "row",
          gap: 12,
          padding: 10,
          backgroundColor: colors.white,
          borderRadius: radius.lg,
          opacity: soldOut ? 0.6 : 1,
        },
        shadow.card,
      ]}
    >
      <Photo
        uri={img}
        label={name}
        fallback={t.photo}
        style={{ width: compact ? "100%" : 104, aspectRatio: compact ? 1.15 : 1, borderRadius: radius.md }}
      />
      <View style={{ flex: compact ? undefined : 1, gap: 4, minWidth: 0, paddingEnd: compact ? 0 : 4, paddingBottom: compact ? 2 : 0, justifyContent: compact ? undefined : "space-between" }}>
        <View style={{ gap: 2 }}>
          <Text numberOfLines={2} style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.black }}>{name}</Text>
          {!compact && !!desc && <Text numberOfLines={2} style={{ fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.gray }}>{desc}</Text>}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: soldOut ? colors.gray : colors.orange }}>{soldOut ? t.unavailable : price(product.base_price)}</Text>
          {!soldOut && <AddBadge />}
        </View>
      </View>
    </PressableScale>
  );
}
