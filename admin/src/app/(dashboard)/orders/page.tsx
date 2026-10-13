"use client";

import { useMemo, useState } from "react";
import { NewOrderBanner, OrderPanel } from "@/components/order-panel";
import { useAuth } from "@/lib/auth";
import { STATUS_LABEL, money, startOfToday, timeOf, useOrders, type OrderRow, type Status } from "@/lib/orders";

const COLUMNS: { title: string; statuses: Status[] }[] = [
  { title: "New", statuses: ["pending"] },
  { title: "Confirmed", statuses: ["confirmed"] },
  { title: "Preparing", statuses: ["preparing"] },
  { title: "Ready / on the way", statuses: ["ready_for_pickup", "out_for_delivery"] },
  { title: "Done today", statuses: ["completed", "rejected", "cancelled"] },
];

export default function OrdersPage() {
  const { profile } = useAuth();
  const since = useMemo(() => startOfToday(), []);
  const { orders, loading, error, reload, fresh, clearFresh } = useOrders(since);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const needle = q.trim().toLowerCase();
  const visible = needle
    ? orders.filter((o) => [o.order_number, o.customer_name, o.customer_phone].some((s) => s.toLowerCase().includes(needle)))
    : orders;
  const selected = orders.find((o) => o.id === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">Orders</h1>
        <label className="sr-only" htmlFor="search">
          Search orders
        </label>
        <input id="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search number, name or phone" className="min-h-11 w-full max-w-xs rounded border-2 border-ink bg-paper px-3" />
      </div>

      <NewOrderBanner numbers={fresh} onDismiss={clearFresh} />
      {error && (
        <p role="alert" className="rounded border-2 border-danger p-3 font-bold text-danger">
          Could not load orders: {error}{" "}
          <button className="underline" onClick={reload}>
            Try again
          </button>
        </p>
      )}
      {loading && <p className="text-muted">Loading orders...</p>}
      {!loading && orders.length === 0 && !error && <p className="text-muted">No orders yet today. New orders show up here by themselves.</p>}

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="flex gap-3 overflow-x-auto pb-2">
          {COLUMNS.map((col) => {
            const items = visible.filter((o) => col.statuses.includes(o.status));
            return (
              <section key={col.title} aria-label={col.title} className="flex w-64 shrink-0 flex-col gap-2">
                <h2 className="flex items-center justify-between rounded bg-ink px-3 py-2 text-sm font-bold text-cream">
                  {col.title}
                  <span className="rounded bg-orange px-2 text-ink">{items.length}</span>
                </h2>
                {items.map((o) => (
                  <Card key={o.id} o={o} active={o.id === selectedId} onClick={() => setSelectedId(o.id)} />
                ))}
              </section>
            );
          })}
        </div>
        {selected && profile && (
          <div className="xl:sticky xl:top-4 xl:self-start">
            <OrderPanel order={selected} role={profile.role} onClose={() => setSelectedId(null)} onChanged={reload} />
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ o, active, onClick }: { o: OrderRow; active: boolean; onClick: () => void }) {
  const count = o.order_items.reduce((n, i) => n + i.quantity, 0);
  return (
    <button onClick={onClick} aria-pressed={active} className={`flex flex-col gap-1 rounded border-2 border-ink p-3 text-left ${active ? "bg-sun" : "bg-paper hover:bg-white"}`}>
      <span className="flex items-center justify-between">
        <span className="font-bold">{o.order_number}</span>
        <span className="text-xs text-muted">{timeOf(o.created_at)}</span>
      </span>
      <span className="text-sm">{o.customer_name}</span>
      <span className="text-xs text-muted">
        {o.method === "delivery" ? "Delivery" : "Pickup"} · {count} item{count === 1 ? "" : "s"} · {money(o.total)}
      </span>
      <span className="text-xs font-bold">{STATUS_LABEL[o.status]} · {o.payment_method === "cash" ? "Cash" : "Card"} {o.payment_status === "paid" ? "(paid)" : ""}</span>
    </button>
  );
}
