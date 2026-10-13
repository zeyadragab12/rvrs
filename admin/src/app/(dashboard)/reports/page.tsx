"use client";

import { useEffect, useState } from "react";
import { btnPlain, btnPrimary, ErrorLine, Field, inputCls } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { money, type OrderRow } from "@/lib/orders";
import { supabase } from "@/lib/supabase";

type Report = {
  orders: number; valid_orders: number; gross: number; delivery_fees: number; discounts: number; avg: number;
  delivery_orders: number; pickup_orders: number; rejected: number; cancelled: number;
  by_payment: { method: string; orders: number; gross: number }[];
  by_day: { day: string; orders: number; gross: number }[];
  products: { name: string; qty: number; gross: number }[];
};

const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
/** Cells that start with = + - @ can run as formulas in Excel, so they are prefixed with a quote. */
const cell = (v: unknown) => {
  const s = String(v ?? "");
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

export default function ReportsPage() {
  const { profile } = useAuth();
  const today = new Date();
  const [from, setFrom] = useState(iso(new Date(today.getTime() - 6 * 86400000)));
  const [to, setTo] = useState(iso(today));
  const [branch, setBranch] = useState("");
  const [branches, setBranches] = useState<{ id: string; name_en: string }[] | null>(null);
  const [rep, setRep] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("branches").select("id,name_en").order("name_en").then(({ data }) => setBranches(data ?? []));
  }, []);

  if (profile && !["owner", "branch_manager"].includes(profile.role)) return <p className="text-muted">Reports are for owners and branch managers.</p>;

  const range = () => ({ start: new Date(`${from}T00:00:00`).toISOString(), end: new Date(new Date(`${to}T00:00:00`).getTime() + 86400000).toISOString() });

  async function run() {
    setBusy(true);
    setError(null);
    const { start, end } = range();
    const { data, error } = await supabase.rpc("sales_report", { p_from: start, p_to: end, p_branch: branch || null });
    if (error) setError(error.message);
    else setRep(data as Report);
    setBusy(false);
  }

  async function exportCsv() {
    setError(null);
    const { start, end } = range();
    let q = supabase
      .from("orders")
      .select("order_number,created_at,status,method,customer_name,customer_phone,subtotal,discount,delivery_fee,total,payment_method,payment_status,branches(name_en),order_items(product_name,quantity)")
      .gte("created_at", start).lt("created_at", end).order("created_at");
    if (branch) q = q.eq("branch_id", branch);
    const { data, error } = await q.limit(5000);
    if (error) return setError(error.message);
    const rows = data as unknown as (OrderRow & { branches: { name_en: string } })[];
    const head = ["Order", "Created", "Branch", "Status", "Method", "Customer", "Phone", "Items", "Subtotal", "Discount", "Delivery fee", "Total", "Payment", "Payment status"];
    const lines = rows.map((o) => [o.order_number, o.created_at, o.branches?.name_en, o.status, o.method, o.customer_name, o.customer_phone, o.order_items.map((i) => `${i.quantity}x ${i.product_name}`).join("; "), o.subtotal, o.discount, o.delivery_fee, o.total, o.payment_method, o.payment_status].map(cell).join(","));
    const blob = new Blob(["﻿" + [head.map(cell).join(","), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `rvrs-orders-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const stat = (label: string, value: string | number, note: string) => (
    <div key={label} className="flex flex-col gap-1 rounded border-2 border-ink bg-paper p-4">
      <dt className="text-sm font-bold text-muted">{label}</dt>
      <dd className="font-display text-2xl">{value}</dd>
      <p className="text-xs text-muted">{note}</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-3xl">Reports</h1>
        <p className="text-muted">Days follow Cairo time.</p>
      </div>
      <div className="flex flex-wrap items-end gap-3 rounded border-2 border-ink bg-paper p-4">
        <Field label="From" htmlFor="rf"><input id="rf" type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="To (included)" htmlFor="rt"><input id="rt" type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        <Field label="Branch" htmlFor="rb">
          <select id="rb" className={inputCls} value={branch} onChange={(e) => setBranch(e.target.value)}>
            <option value="">All my branches</option>
            {branches?.map((b) => <option key={b.id} value={b.id}>{b.name_en}</option>)}
          </select>
        </Field>
        <button onClick={run} disabled={busy} className={btnPrimary}>{busy ? "Loading..." : "Run report"}</button>
        <button onClick={exportCsv} className={btnPlain}>Download orders (CSV)</button>
      </div>
      <p className="text-xs text-muted">The CSV includes customer names and phone numbers. Share it only with people allowed to see them.</p>
      <ErrorLine message={error} />

      {rep && (
        <>
          <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {stat("Orders", rep.orders, "All orders in the period, including rejected and cancelled.")}
            {stat("Gross order value", money(rep.gross), "Order totals excluding rejected and cancelled. Includes delivery fees, after discounts. Not profit.")}
            {stat("Net sales", money(rep.gross - rep.delivery_fees), "Gross order value minus delivery fees. Taxes and refunds are not tracked yet.")}
            {stat("Average order value", money(rep.avg), "Gross order value divided by valid orders.")}
            {stat("Discounts given", money(rep.discounts), "Promotion discounts on valid orders.")}
            {stat("Delivery vs pickup", `${rep.delivery_orders} / ${rep.pickup_orders}`, "Valid delivery orders, then valid pickup orders.")}
            {stat("Rejected / cancelled", `${rep.rejected} / ${rep.cancelled}`, "Orders that never completed, counted separately.")}
          </dl>
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="overflow-x-auto rounded border-2 border-ink bg-paper p-4">
              <h2 className="mb-2 font-bold">By day</h2>
              <table className="w-full text-left text-sm"><thead className="text-muted"><tr><th className="py-1">Day</th><th>Orders</th><th className="text-right">Gross</th></tr></thead>
                <tbody>{rep.by_day.map((d) => <tr key={d.day} className="border-t border-line"><td className="py-1">{d.day}</td><td>{d.orders}</td><td className="text-right font-bold">{money(d.gross)}</td></tr>)}</tbody></table>
            </section>
            <section className="overflow-x-auto rounded border-2 border-ink bg-paper p-4">
              <h2 className="mb-2 font-bold">Payment methods</h2>
              <table className="w-full text-left text-sm"><thead className="text-muted"><tr><th className="py-1">Method</th><th>Orders</th><th className="text-right">Gross</th></tr></thead>
                <tbody>{rep.by_payment.map((p) => <tr key={p.method} className="border-t border-line"><td className="py-1 capitalize">{p.method}</td><td>{p.orders}</td><td className="text-right font-bold">{money(p.gross)}</td></tr>)}</tbody></table>
            </section>
            <section className="overflow-x-auto rounded border-2 border-ink bg-paper p-4 lg:col-span-2">
              <h2 className="mb-2 font-bold">Product sales</h2>
              <table className="w-full text-left text-sm"><thead className="text-muted"><tr><th className="py-1">Product</th><th>Sold</th><th className="text-right">Sales</th></tr></thead>
                <tbody>{rep.products.map((p) => <tr key={p.name} className="border-t border-line"><td className="py-1">{p.name}</td><td>{p.qty}</td><td className="text-right font-bold">{money(p.gross)}</td></tr>)}</tbody></table>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
