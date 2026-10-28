import { zodResolver } from "@hookform/resolvers/zod";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Platform, ScrollView, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";
import { Button } from "@/components/button";
import { FormField } from "@/components/form-field";
import { LocationPicker, type LatLng } from "@/components/location-picker";
import { ModalHeader } from "@/components/ui/modal-header";
import { PressableScale } from "@/components/ui/pressable-scale";
import { useI18n } from "@/i18n";
import { formatAddressNotes, useAddAddress } from "@/lib/account";
import { reverseGeocode } from "@/lib/reverse-geocode";
import { colors, fonts, radius, shadow } from "@/theme/tokens";

export default function NewAddress() {
  const { t } = useI18n();
  const add = useAddAddress();
  const [coords, setCoords] = useState<LatLng | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [done, setDone] = useState(false);
  const [scrollOn, setScrollOn] = useState(true);
  const lookup = useRef(0);

  const schema = z.object({
    label: z.string().trim().min(1, t.errRequired).max(40),
    address_line: z.string().trim().min(3, t.errAddress).max(300),
    building: z.string().trim().min(1, t.errRequired).max(60),
    floor: z.string().trim().min(1, t.errRequired).max(20),
    landmark: z.string().trim().min(1, t.errRequired).max(120),
  });
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { label: "", address_line: "", building: "", floor: "", landmark: "" }, mode: "onTouched" });

  /** Move the pin and fill the address field from it. Latest lookup wins if the pin moves again meanwhile. */
  const place = async (c: LatLng) => {
    setCoords(c);
    setLocError(null);
    const id = ++lookup.current;
    const text = await reverseGeocode(c.lat, c.lng);
    if (id === lookup.current && text) form.setValue("address_line", text, { shouldValidate: true, shouldDirty: true });
  };

  const getLocation = async () => {
    setLocError(null);
    setLocating(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) return setLocError(t.locationDenied);
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await place({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch {
      setLocError(t.locationDenied);
    } finally {
      setLocating(false);
    }
  };

  const save = form.handleSubmit(async (v) => {
    if (!coords) return setLocError(t.errLocation);
    const notes = formatAddressNotes(v);
    await add.mutateAsync({ label: v.label, address_line: v.address_line, notes, lat: coords.lat, lng: coords.lng });
    setDone(true);
    setTimeout(() => router.back(), 900);
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }}>
      <ModalHeader title={t.addAddress} />
      <ScrollView scrollEnabled={scrollOn} contentContainerStyle={{ padding: 20, paddingTop: 8, gap: 20 }} keyboardShouldPersistTaps="handled">
        <FormField control={form.control} name="label" label={t.addressLabel} />
        <FormField control={form.control} name="address_line" label={t.address} multiline />
        <FormField control={form.control} name="building" label={t.addressBuilding} />
        <FormField control={form.control} name="floor" label={t.addressFloor} />
        <FormField control={form.control} name="landmark" label={t.addressLandmark} />
        <View style={{ gap: 10 }}>
          <PressableScale
            accessibilityRole="button"
            disabled={locating}
            onPress={getLocation}
            style={[{ minHeight: 56, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, backgroundColor: coords ? colors.successSoft : colors.white, borderRadius: radius.md }, shadow.card]}
          >
            <Ionicons name={coords ? "checkmark-circle" : "locate"} size={24} color={coords ? colors.success : colors.orange} />
            <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.black }}>{locating ? t.findingLocation : coords ? t.locationSet : t.useLocation}</Text>
          </PressableScale>
          <View onTouchStart={() => setScrollOn(false)} onTouchEnd={() => setScrollOn(true)} onTouchCancel={() => setScrollOn(true)}>
            <LocationPicker value={coords} onChange={place} />
          </View>
          {Platform.OS !== "web" && <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.gray }}>{t.mapHint}</Text>}
          {locError && <Text accessibilityLiveRegion="polite" style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.danger }}>{locError}</Text>}
        </View>
        {add.isError && <Text style={{ fontFamily: fonts.bold, color: colors.danger }}>{t.genericError}</Text>}
        {done && (
          <Animated.View entering={FadeIn} style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: radius.md, backgroundColor: colors.successSoft, borderWidth: 1.5, borderColor: colors.success }}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text accessibilityLiveRegion="polite" style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.success }}>{t.addressSaved}</Text>
          </Animated.View>
        )}
        <Button label={done ? t.saved : t.save} variant={done ? "success" : "orange"} block loading={add.isPending} disabled={done} onPress={() => save()} />
      </ScrollView>
    </SafeAreaView>
  );
}
