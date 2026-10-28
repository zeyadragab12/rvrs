import { supabase } from "./supabase";

export type CartLine = {
  product_id: string;
  quantity: number;
  option_ids?: string[];
  notes?: string;
};

export type CreateOrderInput = {
  branchId: string;
  method: "delivery" | "pickup";
  items: CartLine[];
  customerName: string;
  customerPhone: string;
  paymentMethod: "cash" | "card";
  /** Generate once per checkout attempt and reuse on retry so a double tap cannot create two orders. */
  idempotencyKey: string;
  address?: { address_line: string; lat: number; lng: number; notes?: string };
  promoCode?: string;
  /** Spend a ready Smash Card reward. The server checks the card and sets the discount; it cannot be combined with a promo code. */
  useReward?: boolean;
  notes?: string;
};

export type CreateOrderResult = {
  order_id: string;
  order_number: string;
  total: number;
  status: string;
  /** Only returned for guest orders on first creation. Store it securely: it is the only way to view the order later. */
  guest_token: string | null;
  duplicate: boolean;
};

/** Prices, options, zone, fee and promo are all recalculated on the server. Client totals are never sent. */
export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const { data, error } = await supabase.rpc("create_order", {
    p_branch_id: input.branchId,
    p_method: input.method,
    p_items: input.items,
    p_customer_name: input.customerName,
    p_customer_phone: input.customerPhone,
    p_payment_method: input.paymentMethod,
    p_idempotency_key: input.idempotencyKey,
    p_address: input.address ?? null,
    p_promo_code: input.promoCode ?? null,
    p_notes: input.notes ?? null,
    // Only sent when used, so ordinary checkouts keep working even before the reward migration is applied.
    ...(input.useReward ? { p_use_reward: true } : {}),
  });
  // The database sends a reason code as the error hint when a promo code is refused, so the app can explain it in the customer's language.
  if (error) throw Object.assign(new Error(error.message), { hint: error.hint });
  return data as CreateOrderResult;
}

export type DeliveryQuote = { ok: boolean; reason?: "outside_area" | "delivery_unavailable"; fee?: number; min_order?: number; zone?: string };

/** The delivery fee the server will charge for this branch and location. Read-only; the order recalculates it. */
export async function getDeliveryQuote(branchId: string, lat: number, lng: number): Promise<DeliveryQuote> {
  const { data, error } = await supabase.rpc("delivery_quote", { p_branch_id: branchId, p_lat: lat, p_lng: lng });
  if (error) throw new Error(error.message);
  return data as DeliveryQuote;
}

export type PromoReason = "empty" | "not_found" | "not_started" | "expired" | "wrong_branch" | "used_up" | "min_order" | "not_applicable";
export type PromoCheck = { ok: boolean; reason?: PromoReason; message?: string; date?: string; min_order?: number; discount?: number };

/** Asks the server whether a code works for this cart and branch. Nothing is used up; the real check still runs when the order is placed. */
export async function checkPromo(code: string, branchId: string, items: CartLine[]): Promise<PromoCheck> {
  const { data, error } = await supabase.rpc("check_promo", { p_code: code, p_branch_id: branchId, p_items: items });
  if (error) throw new Error(error.message);
  return data as PromoCheck;
}

export async function getGuestOrder(orderId: string, token: string) {
  const { data, error } = await supabase.rpc("get_guest_order", { p_order_id: orderId, p_token: token });
  if (error) throw new Error(error.message);
  return data;
}
