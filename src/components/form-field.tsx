import { useState } from "react";
import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import { Text, TextInput, View, type TextInputProps } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { colors, fonts, radius } from "@/theme/tokens";

type Props<T extends FieldValues> = TextInputProps & { control: Control<T>; name: Path<T>; label: string };

/** Soft input style shared by form fields. Focus draws an orange ring and errors a red one. */
export function inputStyle(focused: boolean, error: boolean) {
  return {
    minHeight: 54,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.black,
    backgroundColor: error ? colors.dangerSoft : colors.white,
    borderWidth: 2,
    borderColor: error ? colors.danger : focused ? colors.orange : "transparent",
    borderRadius: radius.md,
  } as const;
}

export function FormField<T extends FieldValues>({ control, name, label, ...props }: Props<T>) {
  const [focused, setFocused] = useState(false);
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <View style={{ gap: 8 }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.gray }}>{label}</Text>
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
            style={inputStyle(focused, !!fieldState.error)}
            {...props}
          />
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
