"use client";

import { useMemo } from "react";
import { money, startOfToday, useOrders, type OrderRow } from "@/lib/orders";

const VALID = (o: OrderRow) => o.status !== "rejected" && o.status !== "cancelled";

export default function Overview() {
  const since = useMemo(() => startOfToday(), []);
  const { orders, loading, error } = useOrders(since);

  const valid = orders.filter(VALID);
  const gross = valid.reduce((s, o) => s + Number(o.total), 0);
  const stats = [
    { label: "Orders today", value: orders.length, note: "All orders created since midnight, including rejected and cancelled." },
    { label: "Awaiting acceptance", value: orders.filter((o) => o.status === "pending").length, note: "New orders nobody has accepted yet.", hot: true },
    { label: "Being prepared", value: orders.filter((o) => o.status === "preparing").length, note: "Orders the kitchen has started." },
    { label: "Completed", value: orders.filter((o) => o.status === "completed").length, note: "Delivered or picked up." },
    { label: "Gross order value", value: money(gross), note: "Sum of order totals, excluding rejected and cancelled. Includes delivery fees and is not profit." },
    { label: "Average order value", value: valid.length ? money(gross / valid.length) : "0 EGP", note: "Gross order value divided by orders that were not rejected or cancelled." },
  ];

  const products = new Map<string, number>();
  valid.forEach((o) => o.order_items.forEach((i) => products.set(i.product_name, (products.get(i.product_name) ?? 0) + i.quantity)));
  const top = [...products.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const branches = new Map<string, { orders: number; gross: number }>();
  valid.forEach((o) => {
    const k = o.branches?.name_en ?? "Unknown";
    const cur = branches.get(k) ?? { orders: 0, gross: 0 };
    branches.set(k, { orders: cur.orders + 1, gross: cur.gross + Number(o.total) });
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl">Overview</h1>
        <p className="text-muted">Today, since midnight on this device.</p>
      </div>
      {error && (
        <p role="alert" className="font-bold text-danger">
          Could not load orders: {error}
        </p>
      )}
      {loading && <p className="text-muted">Loading...</p>}
      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className={`flex flex-col gap-1 rounded border-2 border-ink p-4 ${s.hot && Number(s.value) > 0 ? "bg-sun" : "bg-paper"}`}>
            <dt className="text-sm font-bold text-muted">{s.label}</dt>
            <dd className="font-display text-3xl">{s.value}</dd>
            <p className="text-xs text-muted">{s.note}</p>
          </div>
        ))}
      </dl>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded border-2 border-ink bg-paper p-4">
          <h2 className="mb-2 font-bold">Top products today</h2>
          {top.length === 0 ? (
            <p className="text-muted">No sales yet today.</p>
          ) : (
            <ol className="flex flex-col gap-1">
              {top.map(([name, qty]) => (
                <li key={name} className="flex justify-between">
                  <span>{name}</span>
                  <span className="font-bold">{qty} sold</span>
                </li>
              ))}
            </ol>
          )}
        </section>
        <section className="rounded border-2 border-ink bg-paper p-4">
          <h2 className="mb-2 font-bold">By branch</h2>
          {branches.size === 0 ? (
            <p className="text-muted">No orders yet today.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-muted">
                  <th className="py-1">Branch</th>
                  <th className="py-1">Orders</th>
                  <th className="py-1 text-right">Gross value</th>
                </tr>
              </thead>
              <tbody>
                {[...branches.entries()].map(([name, b]) => (
                  <tr key={name} className="border-t border-line">
                    <td className="py-1">{name}</td>
                    <td className="py-1">{b.orders}</td>
                    <td className="py-1 text-right font-bold">{money(b.gross)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
