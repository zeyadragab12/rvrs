import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

export type SavedOrder = { id: string; number: string; createdAt: string };

const LIST_KEY = "rvrs-orders-v1";
const tokenKey = (id: string) => `rvrs-order-token-${id.replace(/[^a-zA-Z0-9]/g, "")}`;

/** The list (not secret) lives in AsyncStorage. Each order's secret token lives in the OS keychain. */
export async function saveGuestOrder(order: SavedOrder, token: string | null) {
  const list = await listGuestOrders();
  await AsyncStorage.setItem(LIST_KEY, JSON.stringify([order, ...list.filter((o) => o.id !== order.id)].slice(0, 50)));
  if (token) await SecureStore.setItemAsync(tokenKey(order.id), token);
}

export async function listGuestOrders(): Promise<SavedOrder[]> {
  try {
    const raw = await AsyncStorage.getItem(LIST_KEY);
    return raw ? (JSON.parse(raw) as SavedOrder[]) : [];
  } catch {
    return [];
  }
}

export const getGuestToken = (id: string) => SecureStore.getItemAsync(tokenKey(id));
