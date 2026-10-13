import { createContext, useContext, useState, type ReactNode } from "react";

type Mode = "delivery" | "pickup";
type Ctx = { mode: Mode; setMode: (m: Mode) => void };

const FulfillmentContext = createContext<Ctx | null>(null);

export function FulfillmentProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>("delivery");
  return <FulfillmentContext.Provider value={{ mode, setMode }}>{children}</FulfillmentContext.Provider>;
}

export function useFulfillment() {
  const ctx = useContext(FulfillmentContext);
  if (!ctx) throw new Error("useFulfillment must be used inside FulfillmentProvider");
  return ctx;
}
