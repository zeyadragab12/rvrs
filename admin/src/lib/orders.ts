"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Role } from "./auth";
import { supabase } from "./supabase";

export type Status = "pending" | "confirmed" | "preparing" | "ready_for_pickup" | "out_for_delivery" | "completed" | "rejected" | "cancelled";

export type OrderRow = {
  id: string;
  order_number: string;
  status: Status;
  method: "delivery" | "pickup";
  customer_name: string;
  customer_phone: string;
  address_snapshot: { address_line?: string; notes?: string; zone?: string } | null;
  subtotal: number;
  discount: number;
  delivery_fee: number;
  total: number;
  payment_method: "cash" | "card";
  payment_status: string;
  notes: string | null;
  rejection_reason: string | null;
  created_at: string;
  branch_id: string;
  branches: { name_en: string } | null;
  order_items: { id: string; product_id: string | null; product_name: string; quantity: number; options: { name: string; group: string }[]; notes: string | null; line_total: number }[];
  order_status_history: { id: string; from_status: Status | null; to_status: Status; reason: string | null; created_at: string }[];
};

export const STATUS_LABEL: Record<Status, string> = {
  pending: "New",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready_for_pickup: "Ready for pickup",
  out_for_delivery: "Out for delivery",
  completed: "Completed",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export type Action = { to: Status; label: string; needsReason?: boolean; tone?: "primary" | "danger" | "plain" };

/** Mirrors the database rules. The database is the authority and rejects anything not allowed. */
export function actionsFor(o: Pick<OrderRow, "status" | "method">, role: Role): Action[] {
  const ready: Status = o.method === "pickup" ? "ready_for_pickup" : "out_for_delivery";
  const readyLabel = o.method === "pickup" ? "Mark ready for pickup" : "Send out for delivery";
  const all: Action[] = (() => {
    switch (o.status) {
      case "pending":
        return [{ to: "confirmed", label: "Accept", tone: "primary" }, { to: "rejected", label: "Reject", needsReason: true, tone: "danger" }];
      case "confirmed":
        return [{ to: "preparing", label: "Start preparing", tone: "primary" }, { to: "cancelled", label: "Cancel", needsReason: true, tone: "danger" }];
      case "preparing":
        return [{ to: ready, label: readyLabel, tone: "primary" }, { to: "cancelled", label: "Cancel", needsReason: true, tone: "danger" }];
      case "ready_for_pickup":
      case "out_for_delivery":
        return [{ to: "completed", label: "Complete order", tone: "primary" }, { to: "cancelled", label: "Cancel", needsReason: true, tone: "danger" }];
      default:
        return [];
    }
  })();
  if (role === "kitchen") return all.filter((a) => (o.status === "confirmed" || o.status === "preparing") && a.tone === "primary");
  return all;
}

export async function changeStatus(orderId: string, to: Status, reason?: string) {
  const { error } = await supabase.rpc("update_order_status", { p_order_id: orderId, p_to: to, p_reason: reason ?? null });
  if (error) throw new Error(error.message);
}

const SELECT =
  "id,order_number,status,method,customer_name,customer_phone,address_snapshot,subtotal,discount,delivery_fee,total,payment_method,payment_status,notes,rejection_reason,created_at,branch_id,branches(name_en),order_items(id,product_id,product_name,quantity,options,notes,line_total),order_status_history(id,from_status,to_status,reason,created_at)";

/** Loads recent orders and refreshes whenever any order changes, so new orders appear without reloading. */
export function useOrders(sinceIso: string) {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fresh, setFresh] = useState<string[]>([]);
  const known = useRef<Set<string> | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("orders")
      .select(SELECT)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) {
      setError(error.message);
    } else {
      const rows = data as unknown as OrderRow[];
      setError(null);
      setOrders(rows);
      if (known.current) {
        const added = rows.filter((r) => !known.current!.has(r.id)).map((r) => r.order_number);
        if (added.length) setFresh(added);
      }
      known.current = new Set(rows.map((r) => r.id));
    }
    setLoading(false);
  }, [sinceIso]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const channel = supabase
      .channel("admin-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        clearTimeout(timer);
        timer = setTimeout(load, 300);
      })
      .subscribe();
    const poll = setInterval(load, 30_000); // safety net if the live connection drops
    return () => {
      clearTimeout(timer);
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [load]);

  return { orders, loading, error, reload: load, fresh, clearFresh: () => setFresh([]) };
}

export const money = (n: number) => `${Number(n).toLocaleString("en-EG", { maximumFractionDigits: 2 })} EGP`;
export const timeOf = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
export const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};
