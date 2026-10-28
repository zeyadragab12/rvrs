import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { Linking, ScrollView, Text, View } from "react-native";
import Animated, { Easing, FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/button";
import { ErrorState, ProductSkeletons } from "@/components/states";
import { Card } from "@/components/ui/card";
import { Reveal } from "@/components/ui/reveal";
import { statusLabel, useI18n } from "@/i18n";
import { getGuestToken } from "@/lib/guest-orders";
import { getGuestOrder } from "@/lib/orders";
import { useBranchStatus } from "@/lib/menu";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { colors, fonts, radius, shadow } from "@/theme/tokens";

type OrderView = {
  id: string;
  order_number: string;
  status: string;
  method: "delivery" | "pickup";
  payment_method: string;
  payment_status: string;
  subtotal: number;
  discount: number;
  delivery_fee: number;
  total: number;
  items: { name: string; quantity: number; line_total: number; options: { name: string }[] }[];
  history: { status: string; at: string }[];
};

/** Expanding ring behind the active step so the live status reads as "in progress". */
function Pulse() {
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withRepeat(withTiming(1, { duration: 2400, easing: Easing.out(Easing.quad) }), -1, false));
  }, [p]);
  const style = useAnimatedStyle(() => ({ opacity: 0.3 * (1 - p.value), transform: [{ scale: 1 + p.value * 0.5 }] }));
  return <Animated.View pointerEvents="none" style={[{ position: "absolute", width: 32, height: 32, borderRadius: 16, backgroundColor: colors.orange }, style]} />;
}

export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, price } = useI18n();

  const { user } = useSession();
  const { branch } = useBranchStatus();
  const phone = branch?.phone?.replace(/[^+\d]/g, "");

  const q = useQuery({
    queryKey: ["order", id, user?.id],
    queryFn: async (): Promise<OrderView> => {
      const token = await getGuestToken(id);
      if (token) {
        const data = (await getGuestOrder(id, token)) as OrderView | null;
        if (!data) throw new Error("not found");
        return data;
      }
      // Signed-in customers read their own order directly. Row-level security limits this to their orders.
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id,order_number,status,method,payment_method,payment_status,subtotal,discount,delivery_fee,total,order_items(product_name,quantity,line_total,options),order_status_history(to_status,created_at)",
        )
        .eq("id", id)
        .single();
      if (error) throw new Error(error.message);
      const row = data as unknown as Omit<OrderView, "items" | "history"> & {
        order_items: { product_name: string; quantity: number; line_total: number; options: { name: string }[] }[];
        order_status_history: { to_status: string; created_at: string }[];
      };
      return {
        ...row,
        items: row.order_items.map((i) => ({ name: i.product_name, quantity: i.quantity, line_total: i.line_total, options: i.options })),
        history: [...row.order_status_history].sort((a, b) => a.created_at.localeCompare(b.created_at)).map((h) => ({ status: h.to_status, at: h.created_at })),
      };
    },
    refetchInterval: 10_000,
  });

  // Instant updates for signed-in customers. Guests keep the 10 second refresh above.
  const { refetch } = q;
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`order-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${id}` }, () => refetch())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, user, refetch]);

  const o = q.data;
  const flow = o ? ["pending", "confirmed", "preparing", o.method === "pickup" ? "ready_for_pickup" : "out_for_delivery", "completed"] : [];
  const ended = o && (o.status === "rejected" || o.status === "cancelled");
  const reached = (s: string) => o?.history.find((h) => h.status === s);
  const currentIdx = o ? flow.indexOf(o.status) : -1;
  const finished = o?.status === "completed";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }} showsVerticalScrollIndicator={false}>
        {q.isPending && <ProductSkeletons count={3} />}
        {q.isError && <ErrorState onRetry={() => q.refetch()} />}
        {o && (
          <>
            <Reveal index={0}>
              <View style={[{ alignItems: "center", gap: 12, padding: 28, borderRadius: radius.xl, backgroundColor: ended ? colors.dangerSoft : colors.black, overflow: "hidden" }, shadow.lift]}>
                <Animated.View
                  entering={FadeIn.duration(300)}
                  style={{ width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", backgroundColor: ended ? colors.danger : finished ? colors.success : colors.orange }}
                >
                  <Ionicons name={ended ? "close" : "checkmark"} size={40} color={colors.white} />
                </Animated.View>
                <Text accessibilityRole="header" style={{ fontFamily: fonts.bold, fontSize: 26, letterSpacing: -0.5, color: ended ? colors.black : colors.cream, textAlign: "center" }}>
                  {t.orderPlaced}
                </Text>
                <View style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: ended ? colors.white : "rgba(255,255,255,0.12)" }}>
                  <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: ended ? colors.black : colors.cream }}>
                    {t.orderNumber}: {o.order_number}
                  </Text>
                </View>
                {ended && (
                  <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.danger, textAlign: "center" }}>
                    {o.status === "rejected" ? t.rejectedMsg : t.cancelledMsg}
                  </Text>
                )}
              </View>
            </Reveal>

            {!ended && (
              <Reveal index={1}>
                <Card padding={20}>
                  <View accessibilityRole="list">
                    {flow.map((s, i) => {
                      const done = i <= currentIdx;
                      const active = i === currentIdx && !finished;
                      const at = reached(s)?.at;
                      return (
                        <View key={s} accessible accessibilityLabel={statusLabel(t, s)} style={{ flexDirection: "row", gap: 16, alignItems: "flex-start" }}>
                          <View style={{ alignItems: "center" }}>
                            <View style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center" }}>
                              {active && <Pulse />}
                              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: done ? colors.orange : colors.cream, alignItems: "center", justifyContent: "center" }}>
                                {done ? <Ionicons name="checkmark" size={18} color={colors.white} /> : <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border }} />}
                              </View>
                            </View>
                            {i < flow.length - 1 && <View style={{ width: 3, height: 32, borderRadius: 2, backgroundColor: i < currentIdx ? colors.orange : colors.border }} />}
                          </View>
                          <View style={{ flex: 1, paddingTop: 5 }}>
                            <Text style={{ fontFamily: active ? fonts.bold : fonts.medium, fontSize: active ? 17 : 16, color: done ? colors.black : colors.gray }}>{statusLabel(t, s)}</Text>
                            {at && <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.gray }}>{new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </Card>
              </Reveal>
            )}

            <Reveal index={2}>
              <Card style={{ gap: 12 }}>
                {o.items.map((it, i) => (
                  <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                    <Text style={{ flex: 1, fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.black }}>
                      <Text style={{ fontFamily: fonts.bold, color: colors.orange }}>{it.quantity}× </Text>
                      {it.name}
                      {it.options.length > 0 ? ` (${it.options.map((x) => x.name).join(", ")})` : ""}
                    </Text>
                    <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.black }}>{price(it.line_total)}</Text>
                  </View>
                ))}
                <View style={{ height: 1, backgroundColor: colors.border }} />
                <Line label={t.subtotal} value={price(o.subtotal)} />
                {o.delivery_fee > 0 && <Line label={t.deliveryFee} value={price(o.delivery_fee)} />}
                {o.discount > 0 && <Line label={t.discount} value={`-${price(o.discount)}`} />}
                <Line label={t.total} value={price(o.total)} strong />
                <Line label={t.paymentStatus} value={o.payment_status === "paid" ? t.paid : t.unpaid} />
              </Card>
            </Reveal>

            <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.gray }}>{t.saveOrderNote}</Text>
            {!!phone && (
              <Reveal index={3}>
                <Card style={{ gap: 12 }}>
                  <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.gray }}>{t.supportHint}</Text>
                  <Button label={t.support} variant="ghost" block onPress={() => Linking.openURL(`tel:${phone}`)} />
                </Card>
              </Reveal>
            )}
            <Button label={t.backToMenu} variant="orange" block onPress={() => router.dismissTo("/menu")} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
      <Text style={{ fontFamily: strong ? fonts.bold : fonts.medium, fontSize: strong ? 18 : 15, color: strong ? colors.black : colors.gray }}>{label}</Text>
      <Text style={{ fontFamily: fonts.bold, fontSize: strong ? 22 : 15, letterSpacing: strong ? -0.4 : 0, color: colors.black }}>{value}</Text>
    </View>
  );
}
