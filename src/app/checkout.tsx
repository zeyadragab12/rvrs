import { zodResolver } from "@hookform/resolvers/zod";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useQueryClient } from "@tanstack/react-query";
import { randomUUID } from "expo-crypto";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { KeyboardAvoidingView, Platform, ScrollView, Switch, Text, TextInput, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";
import { Button } from "@/components/button";
import { ClosedBanner } from "@/components/closed-banner";
import { FormField } from "@/components/form-field";
import { ModeToggle } from "@/components/mode-toggle";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { ModalHeader } from "@/components/ui/modal-header";
import { PressableScale } from "@/components/ui/pressable-scale";
import { useI18n, type Strings } from "@/i18n";
import { useAddresses, useProfile } from "@/lib/account";
import { unitPrice, useCart } from "@/lib/cart";
import { useFulfillment } from "@/lib/fulfillment";
import { useLoyalty } from "@/lib/loyalty";
import { saveGuestOrder } from "@/lib/guest-orders";
import { useBranchStatus } from "@/lib/menu";
import { createOrder } from "@/lib/orders";
import { usePaymentSettings } from "@/lib/settings";
import { colors, fonts, radius, shadow } from "@/theme/tokens";

const makeSchema = (t: Strings, delivery: boolean) =>
  z.object({
    name: z.string().trim().min(1, t.errName).max(100, t.errName),
    phone: z.string().trim().regex(/^\+?[0-9 ]{7,15}$/, t.errPhone),
    addressLine: delivery ? z.string().trim().min(3, t.errAddress).max(300) : z.string().max(300),
    addressNotes: z.string().max(300),
    promo: z.string().trim().max(40),
    notes: z.string().max(500),
  });
type Form = z.infer<ReturnType<typeof makeSchema>>;

export default function Checkout() {
  const { t, pick, price } = useI18n();
  const cart = useCart();
  const { mode } = useFulfillment();
  const { branch, status } = useBranchStatus();
  const settings = usePaymentSettings();
  const delivery = mode === "delivery";
  const qc = useQueryClient();
  const loyalty = useLoyalty();
  const [wantReward, setWantReward] = useState(true);
  // A ready reward is used automatically and can be switched off. The server re-checks it at order time.
  const rewardOn = loyalty.ready && wantReward;

  const [step, setStep] = useState(0);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const [payment, setPayment] = useState<"cash" | "card">("cash");
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  // One key per checkout attempt. Reused on retry so a double tap or a dropped connection can't create two orders.
  const [idempotencyKey] = useState(() => randomUUID());

  const form = useForm<Form>({
    resolver: zodResolver(makeSchema(t, delivery)),
    defaultValues: { name: "", phone: "", addressLine: "", addressNotes: "", promo: "", notes: "" },
    mode: "onTouched",
  });

  const profile = useProfile();
  const saved = useAddresses();
  const { setValue, getValues } = form;
  useEffect(() => {
    const p = profile.data;
    if (!p) return;
    if (!getValues("name") && p.full_name) setValue("name", p.full_name);
    if (!getValues("phone") && p.phone) setValue("phone", p.phone);
  }, [profile.data, setValue, getValues]);

  const applySavedAddress = (a: NonNullable<typeof saved.data>[number]) => {
    setValue("addressLine", a.address_line, { shouldValidate: true });
    setValue("addressNotes", a.notes ?? "");
    if (a.lat !== null && a.lng !== null) {
      setCoords({ lat: a.lat, lng: a.lng });
      setLocError(null);
    }
  };

  const cashAllowed = delivery ? settings.data?.cashDelivery : settings.data?.cashPickup;
  const methods: { key: "cash" | "card"; label: string }[] = [
    ...(cashAllowed ? [{ key: "cash" as const, label: delivery ? t.cashDelivery : t.cashPickup }] : []),
    ...(settings.data?.card ? [{ key: "card" as const, label: t.card }] : []),
  ];
  const activePayment = methods.some((m) => m.key === payment) ? payment : methods[0]?.key;

  const steps = [t.stepDetails, t.stepPayment, t.stepReview];

  const getLocation = async () => {
    setLocError(null);
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) return setLocError(t.locationDenied);
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch {
      setLocError(t.locationDenied);
    }
  };

  const next = async () => {
    if (step === 0) {
      const ok = await form.trigger(delivery ? ["name", "phone", "addressLine"] : ["name", "phone"]);
      if (delivery && !coords) setLocError(t.errLocation);
      if (!ok || (delivery && !coords)) return;
    }
    setStep(step + 1);
  };

  const place = form.handleSubmit(async (v) => {
    if (!branch || !activePayment || submitting) return;
    setSubmitting(true);
    setServerError(null);
    try {
      const res = await createOrder({
        branchId: branch.id,
        method: mode,
        items: cart.lines.map((l) => ({ product_id: l.productId, quantity: l.quantity, option_ids: l.options.map((o) => o.id), notes: l.notes || undefined })),
        customerName: v.name,
        customerPhone: v.phone,
        paymentMethod: activePayment,
        idempotencyKey,
        address: delivery && coords ? { address_line: v.addressLine, lat: coords.lat, lng: coords.lng, notes: v.addressNotes || undefined } : undefined,
        promoCode: rewardOn ? undefined : v.promo || undefined,
        useReward: rewardOn,
        notes: v.notes || undefined,
      });
      await saveGuestOrder({ id: res.order_id, number: res.order_number, createdAt: new Date().toISOString() }, res.guest_token);
      cart.clear();
      qc.invalidateQueries({ queryKey: ["loyalty"] });
      qc.invalidateQueries({ queryKey: ["my-orders"] });
      router.replace({ pathname: "/order/[id]", params: { id: res.order_id } });
    } catch (e) {
      setServerError(e instanceof Error ? e.message : t.loadError);
      setSubmitting(false);
    }
  });

  if (cart.lines.length === 0 && !submitting) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream, padding: 20, gap: 16 }}>
        <Text style={{ fontFamily: fonts.bold, fontSize: 18, color: colors.black }}>{t.cartEmpty}</Text>
        <Button label={t.browseMenu} variant="orange" block onPress={() => router.dismissTo("/menu")} />
      </SafeAreaView>
    );
  }

  const field = (name: keyof Form, label: string, props: React.ComponentProps<typeof TextInput> = {}) => (
    <FormField control={form.control} name={name} label={label} {...props} />
  );

  const v = form.getValues();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }}>
      <ModalHeader title={t.checkout} />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 4, gap: 20 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={{ gap: 6 }}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.gray }}>{t.stepOf(step + 1, 3)} · <Text style={{ color: colors.black }}>{steps[step]}</Text></Text>
            <View accessibilityRole="progressbar" style={{ flexDirection: "row", gap: 6 }}>
              {steps.map((s, i) => (
                <View key={s} style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: i <= step ? colors.orange : colors.border }} />
              ))}
            </View>
          </View>

          {step === 0 && (
            <Animated.View key="s0" entering={FadeIn.duration(220)} style={{ gap: 16 }}>
              <ModeToggle />
              {field("name", t.name, { autoComplete: "name", textContentType: "name" })}
              {field("phone", t.phone, { keyboardType: "phone-pad", autoComplete: "tel", textContentType: "telephoneNumber" })}
              {delivery ? (
                <>
                  {!!saved.data?.length && (
                    <View style={{ gap: 8 }}>
                      <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.gray }}>{t.pickAddress}</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 8 }}>
                        {saved.data.map((a) => (
                          <Chip key={a.id} label={a.label || a.address_line.slice(0, 20)} onPress={() => applySavedAddress(a)} />
                        ))}
                      </ScrollView>
                    </View>
                  )}
                  {field("addressLine", t.address, { autoComplete: "street-address", multiline: true })}
                  {field("addressNotes", t.addressNotes)}
                  <View style={{ gap: 6 }}>
                    <PressableScale
                      accessibilityRole="button"
                      onPress={getLocation}
                      style={[{ minHeight: 56, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, backgroundColor: coords ? colors.successSoft : colors.white, borderRadius: radius.md }, shadow.card]}
                    >
                      <Ionicons name={coords ? "checkmark-circle" : "locate"} size={24} color={coords ? colors.success : colors.orange} />
                      <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.black }}>{coords ? t.locationSet : t.useLocation}</Text>
                    </PressableScale>
                    {locError && <Text accessibilityLiveRegion="polite" style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.danger }}>{locError}</Text>}
                  </View>
                </>
              ) : (
                branch && (
                  <Text style={{ fontFamily: fonts.medium, fontSize: 15, color: colors.black }}>
                    {t.pickupFrom}: {pick(branch.name_en, branch.name_ar)}
                  </Text>
                )
              )}
            </Animated.View>
          )}

          {step === 1 && (
            <Animated.View key="s1" entering={FadeIn.duration(220)} style={{ gap: 16 }}>
              {loyalty.ready && (
                <View style={[{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: radius.lg, backgroundColor: rewardOn ? colors.yellowSoft : colors.white, borderWidth: 2, borderColor: rewardOn ? colors.yellow : "transparent" }, shadow.card]}>
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.yellow, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="gift" size={26} color={colors.black} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.black }}>{t.rewardTitle}</Text>
                    <Text style={{ fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.gray }}>{t.rewardSub(price(loyalty.cap))}</Text>
                  </View>
                  <Switch value={wantReward} onValueChange={setWantReward} accessibilityLabel={t.rewardTitle} trackColor={{ true: colors.orange, false: colors.border }} thumbColor={colors.white} />
                </View>
              )}
              <View style={{ gap: 10 }} accessibilityRole="radiogroup">
                {methods.map((m) => {
                  const on = activePayment === m.key;
                  return (
                    <PressableScale
                      key={m.key}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                      onPress={() => setPayment(m.key)}
                      scaleTo={0.98}
                      style={[{ minHeight: 64, flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, backgroundColor: on ? colors.orangeSoft : colors.white, borderWidth: 2, borderColor: on ? colors.orange : "transparent", borderRadius: radius.md }, shadow.card]}
                    >
                      <Ionicons name={m.key === "card" ? "card" : "cash"} size={24} color={on ? colors.orange : colors.gray} />
                      <Text style={{ flex: 1, fontFamily: fonts.bold, fontSize: 16, color: colors.black }}>{m.label}</Text>
                      <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: on ? colors.orange : colors.border, backgroundColor: on ? colors.orange : colors.white, alignItems: "center", justifyContent: "center" }}>
                        {on && <Ionicons name="checkmark" size={14} color={colors.white} />}
                      </View>
                    </PressableScale>
                  );
                })}
                {settings.data && methods.length === 0 && <Text style={{ fontFamily: fonts.medium, fontSize: 15, color: colors.danger }}>{t.loadError}</Text>}
              </View>
              {rewardOn ? (
                <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.gray }}>{t.rewardNoPromo}</Text>
              ) : (
                <>
                  {field("promo", t.promo, { autoCapitalize: "characters", autoCorrect: false })}
                  <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.gray, marginTop: -10 }}>{t.promoNote}</Text>
                </>
              )}
              {field("notes", t.orderNotes, { multiline: true, maxLength: 500 })}
            </Animated.View>
          )}

          {step === 2 && (
            <Animated.View key="s2" entering={FadeIn.duration(220)} style={{ gap: 16 }}>
              <ClosedBanner status={status} />
              <Card style={{ gap: 12 }}>
                {cart.lines.map((l) => (
                  <View key={l.key} style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                    <Text style={{ flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.black }}>
                      {l.quantity} × {pick(l.name_en, l.name_ar)}
                      {l.options.length > 0 ? ` (${l.options.map((o) => pick(o.name_en, o.name_ar)).join(", ")})` : ""}
                    </Text>
                    <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.black }}>{price(unitPrice(l) * l.quantity)}</Text>
                  </View>
                ))}
                <Row label={t.subtotal} value={price(cart.subtotal)} />
                {delivery && <Row label={t.deliveryFee} value={t.setByServer} />}
                {rewardOn ? <Row label={t.rewardApplied} value={`-${price(Math.min(cart.subtotal, loyalty.cap))}`} /> : !!v.promo && <Row label={t.discount} value={t.setByServer} />}
              </Card>
              <View style={{ gap: 4 }}>
                <Text style={{ fontFamily: fonts.body, fontSize: 15, color: colors.black }}>{v.name} · {v.phone}</Text>
                <Text style={{ fontFamily: fonts.body, fontSize: 15, color: colors.black }}>
                  {delivery ? `${t.deliverTo}: ${v.addressLine}` : `${t.pickupFrom}: ${branch ? pick(branch.name_en, branch.name_ar) : ""}`}
                </Text>
                <Text style={{ fontFamily: fonts.body, fontSize: 15, color: colors.black }}>{methods.find((m) => m.key === activePayment)?.label}</Text>
              </View>
              <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.gray }}>{t.priceNote}</Text>
              {serverError && (
                <Text accessibilityLiveRegion="assertive" style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.danger }}>{serverError}</Text>
              )}
            </Animated.View>
          )}
        </ScrollView>

        <View style={[{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 12, padding: 20, backgroundColor: colors.white, borderTopStartRadius: radius.xl, borderTopEndRadius: radius.xl }, shadow.lift]}>
          {step > 0 && <Button label={t.back} variant="ghost" onPress={() => setStep(step - 1)} />}
          {step < 2 ? (
            <Button label={t.next} variant="orange" onPress={next} />
          ) : (
            <Button label={submitting ? t.placing : t.placeOrder} variant="orange" loading={submitting} disabled={!status.open} onPress={() => !submitting && activePayment && place()} />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
      <Text style={{ fontFamily: fonts.medium, fontSize: 15, color: colors.gray }}>{label}</Text>
      <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.black }}>{value}</Text>
    </View>
  );
}
