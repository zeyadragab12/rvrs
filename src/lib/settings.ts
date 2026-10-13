import { useQuery } from "@tanstack/react-query";
import { supabase } from "./supabase";

export type PaymentSettings = { cashDelivery: boolean; cashPickup: boolean; card: boolean };

async function fetchPaymentSettings(): Promise<PaymentSettings> {
  const { data, error } = await supabase.from("app_settings").select("key,value").like("key", "payments.%");
  if (error) throw new Error(error.message);
  const get = (k: string) => data?.find((r) => r.key === k)?.value === true;
  return { cashDelivery: get("payments.cash_on_delivery"), cashPickup: get("payments.cash_on_pickup"), card: get("payments.card_enabled") };
}

/** Payment options come from the restaurant's settings, never from constants in the app. */
export const usePaymentSettings = () => useQuery({ queryKey: ["payment-settings"], queryFn: fetchPaymentSettings, staleTime: 60_000 });
