import { Text } from "react-native";
import { colors, fonts, radius, shadow } from "@/theme/tokens";
import { PressableScale } from "./pressable-scale";

export function Chip({ label, on, onPress }: { label: string; on?: boolean; onPress: () => void }) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected: !!on }}
      onPress={onPress}
      scaleTo={0.94}
      style={[
        { minHeight: 44, paddingHorizontal: 18, justifyContent: "center", borderRadius: radius.pill, backgroundColor: on ? colors.black : colors.white },
        on ? shadow.lift : shadow.card,
      ]}
    >
      <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: on ? colors.cream : colors.black }}>{label}</Text>
    </PressableScale>
  );
}
