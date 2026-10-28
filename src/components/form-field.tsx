import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import { Text, TextInput, View, type TextInputProps } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { PressableScale } from "@/components/ui/pressable-scale";
import { useI18n } from "@/i18n";
import { colors, fonts, radius } from "@/theme/tokens";

type Props<T extends FieldValues> = TextInputProps & {
  control: Control<T>;
  name: Path<T>;
  label: string;
  /** Always draw a brand-orange border, not only on focus. */
  branded?: boolean;
  /** Green border and check mark, shown briefly after the value was saved. */
  success?: boolean;
};

/** Soft input style shared by form fields. Focus draws an orange ring and errors a red one. */
export function inputStyle(focused: boolean, error: boolean, branded = false, success = false) {
  return {
    minHeight: 54,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.black,
    backgroundColor: error ? colors.dangerSoft : success ? colors.successSoft : focused && branded ? colors.orangeSoft : colors.white,
    borderWidth: 2,
    borderColor: error ? colors.danger : success ? colors.success : focused || branded ? colors.orange : "transparent",
    borderRadius: radius.md,
  } as const;
}

export function FormField<T extends FieldValues>({ control, name, label, branded, success, ...props }: Props<T>) {
  const { t } = useI18n();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const isPassword = !!props.secureTextEntry;
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <View style={{ gap: 8 }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.gray }}>{label}</Text>
          <View>
            <TextInput
              value={field.value ?? ""}
              onChangeText={field.onChange}
              onFocus={() => setFocused(true)}
              onBlur={() => {
                setFocused(false);
                field.onBlur();
              }}
              accessibilityLabel={label}
              placeholderTextColor={colors.gray}
              style={[inputStyle(focused, !!fieldState.error, branded, success && !fieldState.error), (isPassword || success) && { paddingEnd: 52 }]}
              {...props}
              secureTextEntry={isPassword && !revealed}
            />
            {isPassword ? (
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={revealed ? t.hidePassword : t.showPassword}
                haptic={false}
                scaleTo={0.85}
                onPress={() => setRevealed((v) => !v)}
                style={{ position: "absolute", end: 4, top: 0, bottom: 0, width: 48, alignItems: "center", justifyContent: "center" }}
              >
                <Ionicons name={revealed ? "eye-off-outline" : "eye-outline"} size={22} color={colors.gray} />
              </PressableScale>
            ) : (
              success &&
              !fieldState.error && (
                <Animated.View entering={FadeIn} pointerEvents="none" style={{ position: "absolute", end: 16, top: 0, bottom: 0, justifyContent: "center" }}>
                  <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                </Animated.View>
              )
            )}
          </View>
          {fieldState.error && (
            <Animated.Text entering={FadeIn} accessibilityLiveRegion="polite" style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.danger }}>
              {fieldState.error.message}
            </Animated.Text>
          )}
        </View>
      )}
    />
  );
}
