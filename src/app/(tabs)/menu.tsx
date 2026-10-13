import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, router } from "expo-router";
import { useState } from "react";
import { FlatList, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CartButton } from "@/components/cart-button";
import { ProductCard } from "@/components/product-card";
import { EmptyState, ErrorState, ProductSkeletons } from "@/components/states";
import { Chip } from "@/components/ui/chip";
import { Reveal } from "@/components/ui/reveal";
import { PressableScale } from "@/components/ui/pressable-scale";
import { useI18n } from "@/i18n";
import { useMenu } from "@/lib/menu";
import { colors, fonts, radius, shadow, tabBarSpace } from "@/theme/tokens";

export default function Menu() {
  const { t, pick } = useI18n();
  const { category } = useLocalSearchParams<{ category?: string }>();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const menu = useMenu();

  const q = query.trim().toLowerCase();
  const products = (menu.data?.products ?? []).filter((p) => {
    if (category && p.category_id !== category) return false;
    if (!q) return true;
    return [p.name_en, p.name_ar, p.description_en, p.description_ar].some((s) => s?.toLowerCase().includes(q));
  });

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.cream }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 16 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text accessibilityRole="header" style={{ fontFamily: fonts.bold, fontSize: 32, letterSpacing: -0.8, color: colors.black }}>
            {t.tabMenu}
          </Text>
          <CartButton />
        </View>
        <View
          style={[
            { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, minHeight: 54, backgroundColor: colors.white, borderRadius: radius.pill, borderWidth: 2, borderColor: focused ? colors.orange : "transparent" },
            shadow.card,
          ]}
        >
          <Ionicons name="search" size={20} color={focused ? colors.orange : colors.gray} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={t.searchMenu}
            placeholderTextColor={colors.gray}
            accessibilityLabel={t.searchMenu}
            returnKeyType="search"
            style={{ flex: 1, minHeight: 50, fontFamily: fonts.body, fontSize: 16, color: colors.black }}
          />
          {query.length > 0 && (
            <PressableScale accessibilityRole="button" accessibilityLabel={t.cancel} onPress={() => setQuery("")} scaleTo={0.85} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.cream, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="close" size={18} color={colors.black} />
            </PressableScale>
          )}
        </View>
      </View>

      {menu.data && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 10, paddingHorizontal: 20, paddingVertical: 16 }}>
          <Chip label={t.all} on={!category} onPress={() => router.setParams({ category: undefined })} />
          {menu.data.categories.map((c) => (
            <Chip key={c.id} label={pick(c.name_en, c.name_ar)} on={category === c.id} onPress={() => router.setParams({ category: c.id })} />
          ))}
        </ScrollView>
      )}

      {menu.isPending && (
        <View style={{ padding: 20 }}>
          <ProductSkeletons />
        </View>
      )}
      {menu.isError && <ErrorState onRetry={() => menu.refetch()} />}
      {menu.data && (
        <FlatList
          data={products}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: tabBarSpace + 16, gap: 12 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <Reveal index={index}>
              <ProductCard product={item} />
            </Reveal>
          )}
          ListEmptyComponent={<EmptyState icon={q ? "search-outline" : "fast-food-outline"} message={menu.data.products.length === 0 ? t.noMenu : t.noResults} />}
          ListFooterComponent={
            menu.data.products.some((p) => p.is_demo) ? (
              <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.gray, paddingTop: 8 }}>{t.demoNote}</Text>
            ) : null
          }
          keyboardShouldPersistTaps="handled"
          onRefresh={() => menu.refetch()}
          refreshing={menu.isRefetching}
        />
      )}
    </SafeAreaView>
  );
}
