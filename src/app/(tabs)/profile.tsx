import { zodResolver } from "@hookform/resolvers/zod";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { ScrollView, Switch, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";
import { AuthForm, type AuthNotice } from "@/components/auth-form";
import { Button } from "@/components/button";
import { FormField } from "@/components/form-field";
import { Card } from "@/components/ui/card";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Reveal } from "@/components/ui/reveal";
import { useI18n, type Strings } from "@/i18n";
import { useAddresses, useDeleteAddress, useProfile, useRequestDeletion, useUpdateProfile } from "@/lib/account";
import { useSession } from "@/lib/session";
import { signOutCleanly } from "@/lib/push";
import { colors, fonts, radius, shadow, tabBarSpace } from "@/theme/tokens";

const makeSchema = (t: Strings) =>
  z.object({
    name: z.string().trim().min(1, t.errName).max(100),
    phone: z.string().trim().regex(/^(\+?[0-9 ]{7,15})?$/, t.errPhone),
  });
type Values = z.infer<ReturnType<typeof makeSchema>>;

export default function Profile() {
  const { t } = useI18n();
  const { user, loading } = useSession();
  const [notice, setNotice] = useState<AuthNotice | null>(null);

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.cream }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: tabBarSpace + 16, gap: 24 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text accessibilityRole="header" style={{ fontFamily: fonts.bold, fontSize: 32, letterSpacing: -0.8, color: colors.black }}>
          {t.tabProfile}
        </Text>
        {!loading && (user ? <Account /> : <AuthForm notice={notice} onNotice={setNotice} />)}
      </ScrollView>
    </SafeAreaView>
  );
}

function Account() {
  const { t } = useI18n();
  const { user } = useSession();
  const profile = useProfile();
  const update = useUpdateProfile();
  const addresses = useAddresses();
  const del = useDeleteAddress();
  const deletion = useRequestDeletion();
  const [flash, setFlash] = useState<"profile" | "prefs" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const form = useForm<Values>({ resolver: zodResolver(makeSchema(t)), defaultValues: { name: "", phone: "" }, mode: "onTouched" });
  useEffect(() => {
    if (profile.data) form.reset({ name: profile.data.full_name ?? "", phone: profile.data.phone ?? "" });
  }, [profile.data, form]);

  const [flashTick, setFlashTick] = useState(0);
  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(null), 2500);
    return () => clearTimeout(id);
  }, [flash, flashTick]);
  const showFlash = (kind: "profile" | "prefs") => {
    setFlash(kind);
    setFlashTick((n) => n + 1);
  };

  const save = form.handleSubmit(async (v) => {
    await update.mutateAsync({ full_name: v.name, phone: v.phone || null });
    showFlash("profile");
  });

  const prefs = profile.data?.notification_prefs;
  const setPref = (key: "order_updates" | "promotions", value: boolean) =>
    prefs && update.mutate({ notification_prefs: { ...prefs, [key]: value } }, { onSuccess: () => showFlash("prefs") });

  return (
    <View style={{ gap: 24 }}>
      <Reveal index={0}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View style={[{ width: 60, height: 60, borderRadius: 30, backgroundColor: colors.orange, alignItems: "center", justifyContent: "center" }, shadow.glow]}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 24, color: colors.white }}>{(profile.data?.full_name || user?.email || "?").trim().charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            {!!profile.data?.full_name && <Text style={{ fontFamily: fonts.bold, fontSize: 18, color: colors.black }}>{profile.data.full_name}</Text>}
            <Text numberOfLines={1} style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.gray }}>{user?.email}</Text>
          </View>
        </View>
      </Reveal>

      <Card style={{ gap: 14 }}>
        <FormField control={form.control} name="name" label={t.name} autoComplete="name" branded success={flash === "profile"} />
        <FormField control={form.control} name="phone" label={t.phone} keyboardType="phone-pad" autoComplete="tel" branded success={flash === "profile"} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Button label={flash === "profile" ? t.saved : t.save} variant={flash === "profile" ? "success" : "black"} loading={update.isPending && flash === null} onPress={() => save()} />
          {update.isError && <Text style={{ fontFamily: fonts.bold, color: colors.danger }}>{t.genericError}</Text>}
        </View>
        {flash === "profile" && <SuccessBanner text={t.profileSaved} />}
      </Card>

      <View style={{ gap: 10 }}>
        <Text accessibilityRole="header" style={{ fontFamily: fonts.bold, fontSize: 20, letterSpacing: -0.3, color: colors.black }}>{t.savedAddresses}</Text>
        {addresses.data?.length === 0 && <Text style={{ fontFamily: fonts.body, fontSize: 15, color: colors.gray }}>{t.noAddresses}</Text>}
        {addresses.data?.map((a) => (
          <View key={a.id} style={[{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, backgroundColor: colors.white, borderRadius: radius.md }, shadow.card]}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.orangeSoft, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="location" size={20} color={colors.orange} />
            </View>
            <View style={{ flex: 1 }}>
              {!!a.label && <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.black }}>{a.label}</Text>}
              <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.black }}>{a.address_line}</Text>
            </View>
            <PressableScale accessibilityRole="button" accessibilityLabel={t.deleteAddress} onPress={() => del.mutate(a.id)} scaleTo={0.85} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.dangerSoft, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </PressableScale>
          </View>
        ))}
        <Button label={t.addAddress} variant="ghost" block onPress={() => router.push("/address")} />
      </View>

      <View style={{ gap: 10 }}>
        <Text accessibilityRole="header" style={{ fontFamily: fonts.bold, fontSize: 20, letterSpacing: -0.3, color: colors.black }}>{t.notifications}</Text>
        {flash === "prefs" && <SuccessBanner text={t.prefsSaved} />}
        <Card style={{ paddingVertical: 4 }}>
          <ToggleRow label={t.notifOrders} value={prefs?.order_updates ?? true} onChange={(v) => setPref("order_updates", v)} />
          <ToggleRow label={t.notifPromos} value={prefs?.promotions ?? false} onChange={(v) => setPref("promotions", v)} />
        </Card>
      </View>

      <View style={{ gap: 12 }}>
        <Button label={t.signOut} variant="ghost" block onPress={() => signOutCleanly()} />
        {!confirmDelete ? (
          <PressableScale accessibilityRole="button" haptic={false} onPress={() => setConfirmDelete(true)} style={{ minHeight: 48, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.danger }}>{t.deleteAccount}</Text>
          </PressableScale>
        ) : deletion.isSuccess ? (
          <Text accessibilityLiveRegion="polite" style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.success }}>{t.deleteSent}</Text>
        ) : (
          <View style={{ gap: 12, padding: 16, backgroundColor: colors.dangerSoft, borderRadius: radius.md }}>
            <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.black }}>{t.deleteAccountInfo}</Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Button label={t.deleteConfirm} onPress={() => deletion.mutate()} />
              <Button label={t.cancel} variant="ghost" onPress={() => setConfirmDelete(false)} />
            </View>
            {deletion.isError && <Text style={{ fontFamily: fonts.bold, color: colors.danger }}>{t.genericError}</Text>}
          </View>
        )}
      </View>
    </View>
  );
}

function SuccessBanner({ text }: { text: string }) {
  return (
    <Animated.View
      entering={FadeIn}
      exiting={FadeOut}
      accessibilityLiveRegion="polite"
      style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: radius.md, backgroundColor: colors.successSoft, borderWidth: 1.5, borderColor: colors.success }}
    >
      <Ionicons name="checkmark-circle" size={20} color={colors.success} />
      <Text style={{ flex: 1, fontFamily: fonts.bold, fontSize: 14, color: colors.success }}>{text}</Text>
    </Animated.View>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={{ minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <Text style={{ flex: 1, fontFamily: fonts.medium, fontSize: 16, color: colors.black }}>{label}</Text>
      <Switch value={value} onValueChange={onChange} accessibilityLabel={label} trackColor={{ true: colors.orange, false: colors.border }} thumbColor={colors.white} />
    </View>
  );
}
