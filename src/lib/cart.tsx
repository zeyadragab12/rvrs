import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type CartOption = {
  id: string;
  group_en: string;
  group_ar: string | null;
  name_en: string;
  name_ar: string | null;
  price_delta: number;
};

export type CartLine = {
  key: string;
  productId: string;
  name_en: string;
  name_ar: string | null;
  basePrice: number;
  options: CartOption[];
  quantity: number;
  notes: string;
};

type Ctx = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  add: (line: Omit<CartLine, "key">) => void;
  replace: (key: string, line: Omit<CartLine, "key">) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};

const STORAGE_KEY = "rvrs-cart-v1";
const CartContext = createContext<Ctx | null>(null);

export const unitPrice = (l: Pick<CartLine, "basePrice" | "options">) =>
  l.basePrice + l.options.reduce((sum, o) => sum + o.price_delta, 0);

const newKey = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/**
 * Display-only cart. The server recalculates every price, option, fee and discount when the order is placed,
 * so nothing here is ever trusted for money.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setLines(JSON.parse(raw) as CartLine[]);
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (ready) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(lines)).catch(() => {});
  }, [lines, ready]);

  const value: Ctx = {
    lines,
    count: lines.reduce((n, l) => n + l.quantity, 0),
    subtotal: lines.reduce((sum, l) => sum + unitPrice(l) * l.quantity, 0),
    add: (line) => setLines((prev) => [...prev, { ...line, key: newKey() }]),
    replace: (key, line) => setLines((prev) => prev.map((l) => (l.key === key ? { ...line, key } : l))),
    setQuantity: (key, quantity) =>
      setLines((prev) => prev.map((l) => (l.key === key ? { ...l, quantity: Math.min(50, Math.max(1, quantity)) } : l))),
    remove: (key) => setLines((prev) => prev.filter((l) => l.key !== key)),
    clear: () => setLines([]),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
