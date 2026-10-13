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
  if (error) throw new Error(error.message);
  return data as CreateOrderResult;
}

export async function getGuestOrder(orderId: string, token: string) {
  const { data, error } = await supabase.rpc("get_guest_order", { p_order_id: orderId, p_token: token });
  if (error) throw new Error(error.message);
  return data;
}
