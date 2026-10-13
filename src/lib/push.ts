import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "./supabase";

const TOKEN_KEY = "rvrs-push-token";

// Show order alerts even when the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

/**
 * Asks for permission and saves this phone's push token for the signed-in customer.
 * Returns the token, or null when push is not possible (simulator, permission denied, no EAS project yet).
 */
export async function registerForPush(): Promise<string | null> {
  if (!Device.isDevice) return null;

  if (Platform.OS === "android") {
    // The channel must exist before Android 13 shows the permission prompt.
    await Notifications.setNotificationChannelAsync("orders", { name: "Order updates", importance: Notifications.AndroidImportance.HIGH });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== "granted") return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    if (__DEV__) console.warn("Push is off: no EAS projectId. Run `npx eas-cli init` in this folder.");
    return null;
  }

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    const { error } = await supabase.rpc("register_device_token", { p_token: token, p_platform: Platform.OS === "ios" ? "ios" : "android" });
    if (error) throw error;
    await AsyncStorage.setItem(TOKEN_KEY, token);
    return token;
  } catch (e) {
    if (__DEV__) console.warn("Push registration failed", e);
    return null;
  }
}

/** Removes this phone from the customer's account so the next person to sign in here gets nothing meant for them. */
export async function unregisterPush() {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token) {
      await supabase.rpc("unregister_device_token", { p_token: token });
      await AsyncStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Signing out must still work offline.
  }
}

export async function signOutCleanly() {
  await unregisterPush();
  await supabase.auth.signOut();
}
