"use client";

import { useState } from "react";
import type { Role } from "@/lib/auth";
import { STATUS_LABEL, actionsFor, changeStatus, money, timeOf, type Action, type OrderRow } from "@/lib/orders";

export function OrderPanel({ order, role, onClose, onChanged }: { order: OrderRow; role: Role; onClose: () => void; onChanged: () => void }) {
  const [reasonFor, setReasonFor] = useState<Action | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const actions = actionsFor(order, role);

  async function run(a: Action) {
    if (a.needsReason && !reasonFor) {
      setReasonFor(a);
      return;
    }
    if (a.needsReason && !reason.trim()) {
      setError("A reason is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await changeStatus(order.id, a.to, a.needsReason ? reason.trim() : undefined);
      setReasonFor(null);
      setReason("");
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update the order.");
    } finally {
      setBusy(false);
    }
  }

  const history = [...order.order_status_history].sort((a, b) => a.created_at.localeCompare(b.created_at));

  return (
    <aside aria-label={`Order ${order.order_number}`} className="flex flex-col gap-4 rounded border-2 border-ink bg-paper p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-2xl">{order.order_number}</h2>
          <p className="text-sm text-muted">
            {STATUS_LABEL[order.status]} · {timeOf(order.created_at)} · {order.branches?.name_en}
          </p>
        </div>
        <button onClick={onClose} aria-label="Close order" className="min-h-11 min-w-11 rounded border-2 border-ink font-bold">
          ×
        </button>
      </div>

      <section className="text-sm">
        {/* Kitchen staff only get what they need to prepare the order. */}
        {role !== "kitchen" && (
          <>
            <p className="font-bold">{order.customer_name}</p>
            <p>{order.customer_phone}</p>
            {order.method === "delivery" && order.address_snapshot && (
              <p className="mt-1">
                {order.address_snapshot.address_line}
                {order.address_snapshot.notes ? ` (${order.address_snapshot.notes})` : ""}
              </p>
            )}
          </>
        )}
        <p className="mt-1 font-bold uppercase tracking-wide">{order.method === "delivery" ? "Delivery" : "Pickup"}</p>
      </section>

      <ul className="flex flex-col gap-2 border-y-2 border-line py-3">
        {order.order_items.map((i) => (
          <li key={i.id} className="text-sm">
            <p className="font-bold">
              {i.quantity} × {i.product_name}
              {role !== "kitchen" && <span className="float-right font-normal">{money(i.line_total)}</span>}
            </p>
            {i.options.length > 0 && <p className="text-muted">{i.options.map((o) => o.name).join(", ")}</p>}
            {i.notes && <p className="font-bold text-danger">Note: {i.notes}</p>}
          </li>
        ))}
      </ul>

      {order.notes && <p className="rounded bg-sun/60 p-2 text-sm font-bold">Order note: {order.notes}</p>}

      {role !== "kitchen" && (
        <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
          <dt>Subtotal</dt>
          <dd>{money(order.subtotal)}</dd>
          {order.delivery_fee > 0 && (
            <>
              <dt>Delivery fee</dt>
              <dd>{money(order.delivery_fee)}</dd>
            </>
          )}
          {order.discount > 0 && (
            <>
              <dt>Discount</dt>
              <dd>-{money(order.discount)}</dd>
            </>
          )}
          <dt className="font-bold">Total</dt>
          <dd className="font-bold">{money(order.total)}</dd>
          <dt>Payment</dt>
          <dd>
            {order.payment_method === "cash" ? "Cash" : "Card"} · {order.payment_status === "paid" ? "Paid" : "Not paid yet"}
          </dd>
        </dl>
      )}

      {order.rejection_reason && <p className="text-sm font-bold text-danger">Reason: {order.rejection_reason}</p>}

      {actions.length > 0 && (
        <div className="flex flex-col gap-2">
          {reasonFor && (
            <label className="flex flex-col gap-1 text-sm font-bold" htmlFor="reason">
              Reason for {reasonFor.to === "rejected" ? "rejecting" : "cancelling"}
              <textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-20 rounded border-2 border-ink p-2 font-normal" autoFocus />
            </label>
          )}
          {error && (
            <p role="alert" className="text-sm font-bold text-danger">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {(reasonFor ? [reasonFor] : actions).map((a) => (
              <button
                key={a.to}
                disabled={busy}
                onClick={() => run(a)}
                className={`min-h-12 rounded border-2 border-ink px-4 font-bold disabled:opacity-60 ${a.tone === "primary" ? "bg-orange" : a.tone === "danger" ? "bg-paper text-danger" : "bg-paper"}`}
              >
                {reasonFor ? `Confirm ${a.label.toLowerCase()}` : a.label}
              </button>
            ))}
            {reasonFor && (
              <button onClick={() => { setReasonFor(null); setReason(""); setError(null); }} className="min-h-12 rounded border-2 border-ink bg-paper px-4 font-bold">
                Back
              </button>
            )}
          </div>
        </div>
      )}

      <details className="text-sm">
        <summary className="cursor-pointer font-bold">History</summary>
        <ol className="mt-2 flex flex-col gap-1">
          {history.map((h) => (
            <li key={h.id}>
              {timeOf(h.created_at)} · {STATUS_LABEL[h.to_status]}
              {h.reason ? ` (${h.reason})` : ""}
            </li>
          ))}
        </ol>
      </details>
    </aside>
  );
}

export function NewOrderBanner({ numbers, onDismiss }: { numbers: string[]; onDismiss: () => void }) {
  if (numbers.length === 0) return null;
  return (
    <div role="status" className="flex items-center justify-between gap-3 rounded border-2 border-ink bg-sun p-3 font-bold">
      <span>New order{numbers.length > 1 ? "s" : ""}: {numbers.join(", ")}</span>
      <button onClick={onDismiss} className="min-h-11 rounded border-2 border-ink bg-paper px-3">
        Dismiss
      </button>
    </div>
  );
}
