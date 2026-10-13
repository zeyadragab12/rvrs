import Ionicons from "@expo/vector-icons/Ionicons";
import { Text, View } from "react-native";
import { colors, fonts, radius } from "@/theme/tokens";
import { PressableScale } from "./pressable-scale";

type Props = { value: number; onChange: (n: number) => void; min?: number; max?: number; label: string; onRemove?: () => void; removeLabel?: string };

/** Pill shaped quantity control. At the minimum, the minus button calls onRemove when provided. */
export function Stepper({ value, onChange, min = 1, max = 50, label, onRemove, removeLabel }: Props) {
  const atMin = value <= min;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.cream, borderRadius: radius.pill, padding: 4 }}>
      <Btn icon={atMin && onRemove ? "trash-outline" : "remove"} label={atMin && onRemove ? (removeLabel ?? "-") : "-"} disabled={atMin && !onRemove} onPress={() => (atMin ? onRemove?.() : onChange(value - 1))} />
      <Text accessibilityLabel={`${label} ${value}`} style={{ fontFamily: fonts.bold, fontSize: 17, minWidth: 32, textAlign: "center", color: colors.black }}>
        {value}
      </Text>
      <Btn icon="add" label="+" disabled={value >= max} onPress={() => onChange(value + 1)} />
    </View>
  );
}

function Btn({ icon, label, disabled, onPress }: { icon: "add" | "remove" | "trash-outline"; label: string; disabled?: boolean; onPress: () => void }) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      scaleTo={0.85}
      style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: colors.white, opacity: disabled ? 0.35 : 1 }}
    >
      <Ionicons name={icon} size={20} color={icon === "trash-outline" ? colors.danger : colors.black} />
    </PressableScale>
  );
}
