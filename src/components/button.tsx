import { ActivityIndicator, Text } from "react-native";
import { PressableScale } from "@/components/ui/pressable-scale";
import { colors, fonts, radius, shadow, touch } from "@/theme/tokens";

type Props = {
  label: string;
  onPress: () => void;
  variant?: "black" | "orange" | "ghost" | "success";
  disabled?: boolean;
  loading?: boolean;
  /** Stretch to the full row. */
  block?: boolean;
};

export function Button({ label, onPress, variant = "black", disabled = false, loading = false, block = false }: Props) {
  const bg = variant === "black" ? colors.black : variant === "orange" ? colors.orange : variant === "success" ? colors.success : colors.white;
  const fg = variant === "ghost" ? colors.black : variant === "black" ? colors.cream : colors.white;
  const inactive = disabled || loading;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={inactive}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={[
        {
          minHeight: 54,
          minWidth: touch,
          paddingHorizontal: 24,
          flexDirection: "row",
          gap: 8,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: bg,
          borderRadius: radius.pill,
          opacity: disabled ? 0.4 : 1,
          alignSelf: block ? "stretch" : "flex-start",
        },
        variant === "orange" ? shadow.glow : variant === "ghost" ? shadow.card : shadow.lift,
      ]}
    >
      {loading && <ActivityIndicator size="small" color={fg} />}
      <Text style={{ color: fg, fontFamily: fonts.bold, fontSize: 16 }}>{label}</Text>
    </PressableScale>
  );
}
