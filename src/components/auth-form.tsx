import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Text, View } from "react-native";
import { z } from "zod";
import { Button } from "./button";
import { FormField } from "./form-field";
import { PressableScale } from "./ui/pressable-scale";
import { useI18n, type Strings } from "@/i18n";
import { supabase } from "@/lib/supabase";
import { colors, fonts } from "@/theme/tokens";

const makeSchema = (t: Strings, signUp: boolean) =>
  z.object({
    name: signUp ? z.string().trim().min(1, t.errName).max(100) : z.string(),
    email: z.string().trim().email(t.errEmail),
    password: z.string().min(8, t.errPassword).max(72),
  });
type Values = z.infer<ReturnType<typeof makeSchema>>;

export function AuthForm() {
  const { t } = useI18n();
  const [signUp, setSignUp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const form = useForm<Values>({
    resolver: zodResolver(makeSchema(t, signUp)),
    defaultValues: { name: "", email: "", password: "" },
    mode: "onTouched",
  });

  const submit = form.handleSubmit(async (v) => {
    setBusy(true);
    setMessage(null);
    try {
      if (signUp) {
        const { data, error } = await supabase.auth.signUp({ email: v.email, password: v.password, options: { data: { full_name: v.name } } });
        if (error) throw error;
        if (!data.session) setMessage({ text: t.checkEmail, error: false });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: v.email, password: v.password });
        if (error) throw error;
      }
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : t.genericError, error: true });
    } finally {
      setBusy(false);
    }
  });

  return (
    <View style={{ gap: 16 }}>
      <Text style={{ fontFamily: fonts.body, fontSize: 16, lineHeight: 23, color: colors.gray }}>{t.authSubtitle}</Text>
      {signUp && <FormField control={form.control} name="name" label={t.name} autoComplete="name" textContentType="name" />}
      <FormField control={form.control} name="email" label={t.email} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" />
      <FormField control={form.control} name="password" label={t.password} secureTextEntry autoCapitalize="none" autoComplete={signUp ? "new-password" : "current-password"} textContentType={signUp ? "newPassword" : "password"} />
      {message && (
        <Text accessibilityLiveRegion="polite" style={{ fontFamily: fonts.bold, fontSize: 14, color: message.error ? colors.danger : colors.success }}>
          {message.text}
        </Text>
      )}
      <Button label={signUp ? t.signUp : t.signIn} variant="orange" block loading={busy} onPress={() => !busy && submit()} />
      <PressableScale
        accessibilityRole="button"
        haptic={false}
        scaleTo={0.98}
        onPress={() => {
          setSignUp(!signUp);
          setMessage(null);
          form.clearErrors();
        }}
        style={{ minHeight: 48, alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.orange }}>
          {signUp ? t.haveAccount : t.noAccount}
        </Text>
      </PressableScale>
    </View>
  );
}
