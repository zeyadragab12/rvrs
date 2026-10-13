import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { Text, View } from "react-native";
import { PressableScale } from "@/components/ui/pressable-scale";
import { useI18n } from "@/i18n";
import { useLastOrderItems } from "@/lib/account";
import { useCart } from "@/lib/cart";
import { useMenu } from "@/lib/menu";
import { colors, fonts, radius, shadow } from "@/theme/tokens";

/** One-tap reorder of the customer's last order. Hidden for guests, new customers and when nothing is orderable any more. */
export function OrderAgain() {
  const { t, pick } = useI18n();
  const last = useLastOrderItems();
  const menu = useMenu();
  const cart = useCart();

  const items = last.data?.order_items ?? [];
  const products = menu.data?.products ?? [];
  // Only items whose product is still on the menu and available can be reordered.
  const lines = items.flatMap((i) => {
    const p = products.find((x) => x.id === i.product_id && x.is_available);
    return p ? [{ item: i, product: p }] : [];
  });
  if (lines.length === 0) return null;

  const summary = lines.map((l) => `${l.item.quantity}× ${pick(l.product.name_en, l.product.name_ar)}`).join(" · ");

  const reorder = () => {
    for (const { item, product } of lines) {
      cart.add({
        productId: product.id,
        name_en: product.name_en,
        name_ar: product.name_ar,
        basePrice: product.base_price,
        options: item.options.map((o) => ({ id: o.id, group_en: o.group, group_ar: null, name_en: o.name, name_ar: null, price_delta: o.price_delta })),
        quantity: item.quantity,
        notes: item.notes ?? "",
      });
    }
    router.push("/cart");
  };

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${t.orderAgain}. ${summary}`}
      onPress={reorder}
      scaleTo={0.97}
      style={[{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: radius.lg, backgroundColor: colors.white }, shadow.card]}
    >
      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.orangeSoft, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name="refresh" size={24} color={colors.orange} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.black }}>{t.orderAgain}</Text>
        <Text numberOfLines={2} style={{ fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.gray }}>{summary}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.gray} />
    </PressableScale>
  );
}
