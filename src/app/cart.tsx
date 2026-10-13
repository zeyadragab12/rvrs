import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Text, View } from "react-native";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/button";
import { ClosedBanner } from "@/components/closed-banner";
import { EmptyState } from "@/components/states";
import { ModalHeader } from "@/components/ui/modal-header";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Stepper } from "@/components/ui/stepper";
import { useI18n } from "@/i18n";
import { unitPrice, useCart, type CartLine } from "@/lib/cart";
import { useFulfillment } from "@/lib/fulfillment";
import { useBranchStatus, useMenu } from "@/lib/menu";
import { colors, fonts, radius, shadow } from "@/theme/tokens";

const PHOTO = 92;

export default function CartScreen() {
  const { t, pick, price } = useI18n();
  const cart = useCart();
  const { mode } = useFulfillment();
  const { branch, status } = useBranchStatus();
  const delivery = mode === "delivery";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }}>
      <ModalHeader title={t.cart} />

      {cart.lines.length === 0 ? (
        <View style={{ gap: 8, paddingHorizontal: 20 }}>
          <EmptyState icon="bag-handle-outline" message={t.cartEmpty} />
          <Button label={t.browseMenu} variant="orange" block onPress={() => router.dismissTo("/menu")} />
        </View>
      ) : (
        <>
          <Animated.FlatList
            data={cart.lines}
            keyExtractor={(l) => l.key}
            contentContainerStyle={{ padding: 20, paddingTop: 4, gap: 12 }}
            itemLayoutAnimation={LinearTransition.duration(200)}
            ListHeaderComponent={
              branch ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingBottom: 8 }}>
                  <Ionicons name={delivery ? "bicycle" : "storefront"} size={18} color={colors.orange} />
                  <Text numberOfLines={1} style={{ flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.gray }}>
                    {delivery ? t.delivery : t.pickup} · {pick(branch.name_en, branch.name_ar)}
                  </Text>
                  <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.black }}>{t.itemsInCart(cart.count)}</Text>
                </View>
              ) : null
            }
            renderItem={({ item }) => (
              <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
                <Line line={item} />
              </Animated.View>
            )}
          />
          <View style={[{ gap: 12, padding: 20, backgroundColor: colors.white, borderTopStartRadius: radius.xl, borderTopEndRadius: radius.xl }, shadow.lift]}>
            <View style={{ gap: 8 }}>
              <SummaryRow label={t.subtotal} value={price(cart.subtotal)} />
              {delivery && <SummaryRow label={t.deliveryFee} value={t.setByServer} />}
            </View>
            <View style={{ height: 1, backgroundColor: colors.border }} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 17, color: colors.black }}>{t.total}</Text>
              <Text style={{ fontFamily: fonts.bold, fontSize: 26, letterSpacing: -0.5, color: colors.black }}>{price(cart.subtotal)}</Text>
            </View>
            <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.gray }}>{t.priceNote}</Text>
            <ClosedBanner status={status} />
            <Button label={t.checkout} variant="orange" block disabled={!status.open} onPress={() => router.push("/checkout")} />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
      <Text style={{ fontFamily: fonts.medium, fontSize: 15, color: colors.gray }}>{label}</Text>
      <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.black }}>{value}</Text>
    </View>
  );
}

function Line({ line }: { line: CartLine }) {
  const { t, pick, price } = useI18n();
  const cart = useCart();
  // The cart stores no photo, so look it up from the menu. That also gives photos to carts saved before this existed.
  const menu = useMenu();
  const photo = menu.data?.products.find((p) => p.id === line.productId)?.image_paths[0];
  const name = pick(line.name_en, line.name_ar);
  const each = unitPrice(line);

  return (
    <View style={[{ flexDirection: "row", gap: 14, padding: 12, backgroundColor: colors.white, borderRadius: radius.lg }, shadow.card]}>
      <View style={{ width: PHOTO, height: PHOTO, borderRadius: radius.md, backgroundColor: colors.yellowSoft, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
        {photo ? (
          <Image source={{ uri: photo }} contentFit="cover" transition={250} style={{ width: "100%", height: "100%" }} accessibilityLabel={name} />
        ) : (
          <Ionicons name="fast-food" size={34} color={colors.orange} />
        )}
      </View>

      <View style={{ flex: 1, gap: 8, minWidth: 0 }}>
        <View style={{ gap: 2 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
            <Text numberOfLines={2} style={{ flex: 1, fontFamily: fonts.bold, fontSize: 16, lineHeight: 21, color: colors.black }}>{name}</Text>
            <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.orange }}>{price(each * line.quantity)}</Text>
          </View>
          {line.options.length > 0 && (
            <Text numberOfLines={2} style={{ fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.gray }}>
              {line.options.map((o) => pick(o.name_en, o.name_ar)).join(", ")}
            </Text>
          )}
          {!!line.notes && (
            <Text numberOfLines={1} style={{ fontFamily: fonts.body, fontSize: 12, fontStyle: "italic", color: colors.gray }}>{line.notes}</Text>
          )}
          {line.quantity > 1 && <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.gray }}>{price(each)} × {line.quantity}</Text>}
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Stepper
            value={line.quantity}
            label={t.quantity}
            removeLabel={t.remove}
            onChange={(n) => cart.setQuantity(line.key, n)}
            onRemove={() => cart.remove(line.key)}
          />
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={t.edit}
            onPress={() => router.push({ pathname: "/product/[id]", params: { id: line.productId, edit: line.key } })}
            style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: colors.cream }}
          >
            <Ionicons name="create-outline" size={20} color={colors.black} />
          </PressableScale>
        </View>
      </View>
    </View>
  );
}
