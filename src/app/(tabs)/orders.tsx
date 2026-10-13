import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { EmptyState } from "@/components/states";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Reveal } from "@/components/ui/reveal";
import { statusLabel, useI18n } from "@/i18n";
import { useMyOrders } from "@/lib/account";
import { listGuestOrders } from "@/lib/guest-orders";
import { colors, fonts, radius, shadow, tabBarSpace } from "@/theme/tokens";

type Row = { id: string; number: string; createdAt: string; status?: string; total?: number };

const DONE = ["completed"];
const BAD = ["rejected", "cancelled"];

function StatusPill({ status, label }: { status: string; label: string }) {
  const done = DONE.includes(status);
  const bad = BAD.includes(status);
  const bg = done ? colors.successSoft : bad ? colors.dangerSoft : colors.orangeSoft;
  const fg = done ? colors.success : bad ? colors.danger : colors.orange;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: bg }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: fg }} />
      <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: fg }}>{label}</Text>
    </View>
  );
}

export default function Orders() {
  const { t, price } = useI18n();
  const [local, setLocal] = useState<Row[] | null>(null);
  const mine = useMyOrders();

  useFocusEffect(
    useCallback(() => {
      listGuestOrders().then((l) => setLocal(l.map((o) => ({ id: o.id, number: o.number, createdAt: o.createdAt }))));
      mine.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const account: Row[] = (mine.data ?? []).map((o) => ({ id: o.id, number: o.order_number, createdAt: o.created_at, status: o.status, total: o.total }));
  const ids = new Set(account.map((o) => o.id));
  const rows = [...account, ...(local ?? []).filter((o) => !ids.has(o.id))].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.cream }}>
      <View style={{ paddingHorizontal: 20, paddingVertical: 8 }}>
        <Text accessibilityRole="header" style={{ fontFamily: fonts.bold, fontSize: 32, letterSpacing: -0.8, color: colors.black }}>
          {t.tabOrders}
        </Text>
      </View>
      <FlatList
        data={rows}
        keyExtractor={(o) => o.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingTop: 12, paddingBottom: tabBarSpace + 16, gap: 12 }}
        ListEmptyComponent={local ? <EmptyState icon="receipt-outline" message={t.noOrders} /> : null}
        renderItem={({ item, index }) => (
          <Reveal index={index}>
            <PressableScale
              accessibilityRole="button"
              onPress={() => router.push({ pathname: "/order/[id]", params: { id: item.id } })}
              scaleTo={0.97}
              style={[{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16, backgroundColor: colors.white, borderRadius: radius.lg }, shadow.card]}
            >
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.orangeSoft, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="receipt" size={22} color={colors.orange} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.black }}>{item.number}</Text>
                <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.gray }}>{new Date(item.createdAt).toLocaleString()}</Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 6 }}>
                {item.status && <StatusPill status={item.status} label={statusLabel(t, item.status)} />}
                {item.total !== undefined && <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.black }}>{price(item.total)}</Text>}
              </View>
            </PressableScale>
          </Reveal>
        )}
      />
    </SafeAreaView>
  );
}
