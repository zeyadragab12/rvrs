import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { inputStyle } from "@/components/form-field";
import { ErrorState, ProductSkeletons } from "@/components/states";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Reveal } from "@/components/ui/reveal";
import { Stepper } from "@/components/ui/stepper";
import { useI18n } from "@/i18n";
import { useCart, type CartLine } from "@/lib/cart";
import { useProduct, type OptionGroup, type ProductDetail } from "@/lib/menu";
import { colors, fonts, radius, shadow } from "@/theme/tokens";

type Selections = Record<string, string[]>;

const minNeeded = (g: OptionGroup) => Math.max(g.min_select, g.is_required ? 1 : 0);
const groupValid = (g: OptionGroup, sel: Selections) => {
  const n = sel[g.id]?.length ?? 0;
  return n >= minNeeded(g) && n <= g.max_select;
};

export default function ProductScreen() {
  const { id, edit } = useLocalSearchParams<{ id: string; edit?: string }>();
  const { t } = useI18n();
  const product = useProduct(id);
  const { lines } = useCart();
  const editing = edit ? lines.find((l) => l.key === edit) : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      {product.data ? (
        <Builder product={product.data} editing={editing} />
      ) : (
        <SafeAreaView style={{ flex: 1 }}>
          <CloseButton label={t.back} />
          {product.isPending && (
            <View style={{ padding: 16 }}>
              <ProductSkeletons count={3} />
            </View>
          )}
          {product.isError && <ErrorState onRetry={() => product.refetch()} />}
        </SafeAreaView>
      )}
    </View>
  );
}

function CloseButton({ label, floating = false }: { label: string; floating?: boolean }) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => router.back()}
      style={[
        { width: 44, height: 44, margin: 16, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: floating ? colors.white : "transparent" },
        floating ? shadow.lift : undefined,
      ]}
    >
      <Ionicons name="close" size={24} color={colors.black} />
    </PressableScale>
  );
}

function Builder({ product, editing }: { product: ProductDetail; editing?: CartLine }) {
  const { t, pick, price } = useI18n();
  const cart = useCart();
  const groups = product.option_groups;
  const scroll = useRef<ScrollView>(null);
  const groupY = useRef<Record<string, number>>({});

  const [sel, setSel] = useState<Selections>(() => {
    const init: Selections = {};
    for (const g of groups) {
      init[g.id] = editing ? g.options.filter((o) => editing.options.some((x) => x.id === o.id)).map((o) => o.id) : [];
    }
    return init;
  });
  const [quantity, setQuantity] = useState(editing?.quantity ?? 1);
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [notesFocused, setNotesFocused] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const firstInvalid = groups.find((g) => !groupValid(g, sel));
  const chosen = groups.flatMap((g) => g.options.filter((o) => sel[g.id]?.includes(o.id)).map((o) => ({ g, o })));
  const unit = product.base_price + chosen.reduce((s, { o }) => s + o.price_delta, 0);
  const name = pick(product.name_en, product.name_ar);
  const desc = pick(product.description_en, product.description_ar);
  const img = product.image_paths[0];
  const soldOut = !product.is_available;

  const toggle = (g: OptionGroup, optId: string) =>
    setSel((prev) => {
      const cur = prev[g.id] ?? [];
      if (g.max_select === 1) return { ...prev, [g.id]: cur.includes(optId) ? (g.is_required ? cur : []) : [optId] };
      if (cur.includes(optId)) return { ...prev, [g.id]: cur.filter((x) => x !== optId) };
      if (cur.length >= g.max_select) return prev;
      return { ...prev, [g.id]: [...cur, optId] };
    });

  const submit = () => {
    if (firstInvalid) {
      setShowErrors(true);
      scroll.current?.scrollTo({ y: Math.max(0, (groupY.current[firstInvalid.id] ?? 0) - 12), animated: true });
      return;
    }
    const line = {
      productId: product.id,
      name_en: product.name_en,
      name_ar: product.name_ar,
      basePrice: product.base_price,
      options: chosen.map(({ g, o }) => ({
        id: o.id,
        group_en: g.name_en,
        group_ar: g.name_ar,
        name_en: o.name_en,
        name_ar: o.name_ar,
        price_delta: o.price_delta,
      })),
      quantity,
      notes: notes.trim(),
    };
    if (editing) cart.replace(editing.key, line);
    else cart.add(line);
    router.back();
  };

  const rule = (g: OptionGroup) =>
    g.max_select === 1 && minNeeded(g) === 1 ? t.chooseOne : minNeeded(g) === 0 ? t.chooseUpTo(g.max_select) : t.chooseRange(minNeeded(g), g.max_select);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView ref={scroll} contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={{ width: "100%", aspectRatio: 1.1, backgroundColor: colors.yellowSoft, alignItems: "center", justifyContent: "center" }}>
          {img ? (
            <Image source={{ uri: img }} contentFit="cover" transition={300} style={{ width: "100%", height: "100%" }} accessibilityLabel={name} />
          ) : (
            <View style={{ alignItems: "center", gap: 8 }}>
              <Ionicons name="fast-food" size={72} color={colors.orange} />
              <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.gray }}>{t.photo}</Text>
            </View>
          )}
          <SafeAreaView edges={["top"]} style={{ position: "absolute", top: 0, start: 0 }}>
            <CloseButton label={t.back} floating />
          </SafeAreaView>
        </View>

        {/* The sheet overlaps the photo so the image reads as sitting behind the content. */}
        <View style={{ marginTop: -32, borderTopStartRadius: radius.xl, borderTopEndRadius: radius.xl, backgroundColor: colors.cream, padding: 20, gap: 24 }}>
          <Reveal style={{ gap: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <Text accessibilityRole="header" style={{ flex: 1, fontFamily: fonts.bold, fontSize: 28, lineHeight: 34, letterSpacing: -0.6, color: colors.black }}>
                {name}
              </Text>
              <View style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.orangeSoft }}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 18, color: colors.orange }}>{price(product.base_price)}</Text>
              </View>
            </View>
            {!!desc && <Text style={{ fontFamily: fonts.body, fontSize: 15, lineHeight: 23, color: colors.gray }}>{desc}</Text>}
            {soldOut && <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.danger }}>{t.unavailable}</Text>}
          </Reveal>

          {groups.map((group, gi) => {
            const invalid = showErrors && !groupValid(group, sel);
            const radio = group.max_select === 1;
            return (
              <Reveal
                key={group.id}
                index={gi + 1}
                onLayout={(e) => {
                  groupY.current[group.id] = e.nativeEvent.layout.y;
                }}
              >
                <View style={{ gap: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text accessibilityRole="header" style={{ fontFamily: fonts.bold, fontSize: 19, letterSpacing: -0.3, color: colors.black }}>
                        {pick(group.name_en, group.name_ar)}
                      </Text>
                      <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: invalid ? colors.orange : colors.gray }}>{rule(group)}</Text>
                    </View>
                    <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: group.is_required ? colors.black : colors.border }}>
                      <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: group.is_required ? colors.cream : colors.black }}>
                        {group.is_required ? t.required : t.optional}
                      </Text>
                    </View>
                  </View>
                  {group.options.map((o) => {
                    const on = sel[group.id]?.includes(o.id) ?? false;
                    const disabled = !o.is_available;
                    return (
                      <PressableScale
                        key={o.id}
                        accessibilityRole={radio ? "radio" : "checkbox"}
                        accessibilityState={{ checked: on, disabled }}
                        disabled={disabled}
                        onPress={() => toggle(group, o.id)}
                        scaleTo={0.98}
                        style={[
                          {
                            minHeight: 60,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 14,
                            paddingHorizontal: 16,
                            backgroundColor: on ? colors.orangeSoft : colors.white,
                            borderWidth: 2,
                            borderColor: on || invalid ? colors.orange : "transparent",
                            borderRadius: radius.md,
                            opacity: disabled ? 0.45 : 1,
                          },
                          shadow.card,
                        ]}
                      >
                        <View style={{ width: 26, height: 26, borderRadius: radio ? 13 : 8, borderWidth: 2, borderColor: on ? colors.orange : colors.border, backgroundColor: on ? colors.orange : colors.white, alignItems: "center", justifyContent: "center" }}>
                          {on && (
                            <Animated.View entering={FadeIn.duration(120)}>
                              <Ionicons name="checkmark" size={16} color={colors.white} />
                            </Animated.View>
                          )}
                        </View>
                        <Text style={{ flex: 1, fontFamily: fonts.bold, fontSize: 16, color: colors.black }}>{pick(o.name_en, o.name_ar)}</Text>
                        <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.gray }}>
                          {disabled ? t.unavailable : o.price_delta > 0 ? `+${price(o.price_delta)}` : ""}
                        </Text>
                      </PressableScale>
                    );
                  })}
                </View>
              </Reveal>
            );
          })}

          <View style={{ gap: 10 }}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 19, letterSpacing: -0.3, color: colors.black }}>{t.notes}</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              onFocus={() => setNotesFocused(true)}
              onBlur={() => setNotesFocused(false)}
              placeholder={t.notesPlaceholder}
              placeholderTextColor={colors.gray}
              accessibilityLabel={t.notes}
              maxLength={300}
              multiline
              style={{ ...inputStyle(notesFocused, false), minHeight: 96, textAlignVertical: "top" }}
            />
          </View>
          <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.gray }}>{t.priceNote}</Text>
        </View>
      </ScrollView>

      <SafeAreaView edges={["bottom"]} style={[{ backgroundColor: colors.white, borderTopStartRadius: radius.xl, borderTopEndRadius: radius.xl }, shadow.lift]}>
        {showErrors && !!firstInvalid && (
          <Animated.Text entering={FadeIn} style={{ paddingHorizontal: 20, paddingTop: 12, fontFamily: fonts.bold, fontSize: 13, color: colors.orange }}>
            {t.pickRequired}
          </Animated.Text>
        )}
        <Animated.View entering={FadeIn.duration(220)} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16 }}>
          <Stepper value={quantity} label={t.quantity} onChange={setQuantity} />
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={`${editing ? t.saveChanges : t.addToCart}, ${price(unit * quantity)}`}
            accessibilityState={{ disabled: soldOut }}
            disabled={soldOut}
            onPress={submit}
            style={[
              { flex: 1, minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 22, backgroundColor: colors.orange, borderRadius: radius.pill, opacity: soldOut ? 0.4 : 1 },
              shadow.glow,
            ]}
          >
            <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.white }}>{editing ? t.saveChanges : t.addToCart}</Text>
            <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.white }}>{price(unit * quantity)}</Text>
          </PressableScale>
        </Animated.View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
