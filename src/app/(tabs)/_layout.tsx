import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import * as Haptics from "expo-haptics";
import { Platform, type ColorValue } from "react-native";
import { useI18n } from "@/i18n";
import { colors, fonts, shadow } from "@/theme/tokens";

type IconName = keyof typeof Ionicons.glyphMap;

/** Filled icon when the tab is active, outline when not. */
const icon = (active: IconName, inactive: IconName) => {
  const render = ({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) => (
    <Ionicons name={focused ? active : inactive} size={size} color={color} />
  );
  return render;
};

export default function TabLayout() {
  const { t } = useI18n();
  return (
    <Tabs
      screenListeners={{
        tabPress: () => {
          if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
        },
      }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.orange,
        tabBarInactiveTintColor: "#A8A097",
        tabBarShowLabel: false,
        tabBarStyle: {
          position: "absolute",
          start: 20,
          end: 20,
          bottom: 20,
          height: 64,
          paddingTop: 0,
          paddingBottom: 0,
          borderTopWidth: 0,
          borderRadius: 32,
          backgroundColor: colors.black,
          ...shadow.lift,
        },
        tabBarItemStyle: { height: 64, justifyContent: "center" },
        tabBarLabelStyle: { fontFamily: fonts.bold, fontSize: 11 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t.tabHome, tabBarIcon: icon("home", "home-outline"), tabBarAccessibilityLabel: t.tabHome }} />
      <Tabs.Screen name="menu" options={{ title: t.tabMenu, tabBarIcon: icon("fast-food", "fast-food-outline"), tabBarAccessibilityLabel: t.tabMenu }} />
      <Tabs.Screen name="orders" options={{ title: t.tabOrders, tabBarIcon: icon("receipt", "receipt-outline"), tabBarAccessibilityLabel: t.tabOrders }} />
      <Tabs.Screen name="profile" options={{ title: t.tabProfile, tabBarIcon: icon("person", "person-outline"), tabBarAccessibilityLabel: t.tabProfile }} />
    </Tabs>
  );
}
