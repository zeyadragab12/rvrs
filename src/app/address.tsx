import { zodResolver } from "@hookform/resolvers/zod";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";
import { Button } from "@/components/button";
import { FormField } from "@/components/form-field";
import { ModalHeader } from "@/components/ui/modal-header";
import { PressableScale } from "@/components/ui/pressable-scale";
import { useI18n } from "@/i18n";
import { useAddAddress } from "@/lib/account";
import { colors, fonts, radius, shadow } from "@/theme/tokens";

export default function NewAddress() {
  const { t } = useI18n();
  const add = useAddAddress();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locError, setLocError] = useState<string | null>(null);

  const schema = z.object({
    label: z.string().trim().max(40),
    address_line: z.string().trim().min(3, t.errAddress).max(300),
    notes: z.string().max(300),
  });
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { label: "", address_line: "", notes: "" }, mode: "onTouched" });

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

  const save = form.handleSubmit(async (v) => {
    if (!coords) return setLocError(t.errLocation);
    await add.mutateAsync({ label: v.label || null, address_line: v.address_line, notes: v.notes || null, lat: coords.lat, lng: coords.lng });
    router.back();
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }}>
      <ModalHeader title={t.addAddress} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 8, gap: 20 }} keyboardShouldPersistTaps="handled">
        <FormField control={form.control} name="label" label={t.addressLabel} />
        <FormField control={form.control} name="address_line" label={t.address} multiline />
        <FormField control={form.control} name="notes" label={t.addressNotes} />
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
        {add.isError && <Text style={{ fontFamily: fonts.bold, color: colors.danger }}>{t.genericError}</Text>}
        <Button label={t.save} variant="orange" block loading={add.isPending} onPress={() => save()} />
      </ScrollView>
    </SafeAreaView>
  );
}
