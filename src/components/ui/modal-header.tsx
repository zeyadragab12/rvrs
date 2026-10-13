import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { useI18n } from "@/i18n";
import { colors, fonts, shadow } from "@/theme/tokens";
import { PressableScale } from "./pressable-scale";

/** Title row for modal screens with a round close button. */
export function ModalHeader({ title, right }: { title: string; right?: ReactNode }) {
  const { t } = useI18n();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12 }}>
      <Text accessibilityRole="header" style={{ flex: 1, fontFamily: fonts.bold, fontSize: 28, letterSpacing: -0.5, color: colors.black }}>
        {title}
      </Text>
      {right}
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={t.back}
        onPress={() => router.back()}
        style={[{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: colors.white, marginStart: 8 }, shadow.card]}
      >
        <Ionicons name="close" size={22} color={colors.black} />
      </PressableScale>
    </View>
  );
}
