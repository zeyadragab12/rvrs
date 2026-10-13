import Ionicons from "@expo/vector-icons/Ionicons";
import { Text, View } from "react-native";
import { Button } from "./button";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/i18n";
import { colors, fonts, radius, shadow } from "@/theme/tokens";

export function ProductSkeletons({ count = 4 }: { count?: number }) {
  return (
    <View style={{ gap: 12 }} accessibilityLabel="Loading" accessibilityRole="progressbar">
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[{ flexDirection: "row", gap: 12, padding: 10, backgroundColor: colors.white, borderRadius: radius.lg }, shadow.card]}>
          <Skeleton width={104} height={104} />
          <View style={{ flex: 1, gap: 10, paddingVertical: 6 }}>
            <Skeleton height={18} width="70%" r={8} />
            <Skeleton height={12} width="90%" r={6} />
            <Skeleton height={16} width="30%" r={8} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <View style={{ gap: 16, padding: 32, alignItems: "center" }}>
      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.dangerSoft, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name="cloud-offline" size={32} color={colors.danger} />
      </View>
      <Text style={{ fontFamily: fonts.bold, fontSize: 18, color: colors.black, textAlign: "center" }}>{t.loadError}</Text>
      <Button label={t.retry} onPress={onRetry} variant="orange" />
    </View>
  );
}

export function EmptyState({ message, icon = "fast-food-outline" }: { message: string; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={{ padding: 32, alignItems: "center", gap: 16 }}>
      <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: colors.orangeSoft, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon} size={40} color={colors.orange} />
      </View>
      <Text style={{ fontFamily: fonts.medium, fontSize: 16, lineHeight: 22, color: colors.gray, textAlign: "center" }}>{message}</Text>
    </View>
  );
}
