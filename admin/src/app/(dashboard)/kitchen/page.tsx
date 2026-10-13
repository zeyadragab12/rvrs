"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { NewOrderBanner } from "@/components/order-panel";
import { useAuth, type Role } from "@/lib/auth";
import { actionsFor, changeStatus, timeOf, type Status } from "@/lib/orders";
import { supabase } from "@/lib/supabase";

type Ticket = {
  id: string;
  order_number: string;
  status: Status;
  method: "delivery" | "pickup";
  created_at: string;
  notes: string | null;
  items: { id: string; name: string; quantity: number; options: { name: string }[]; notes: string | null }[];
};

/** Kitchen staff cannot read orders directly. This function returns only what is needed to cook. */
function useKitchenQueue() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fresh, setFresh] = useState<string[]>([]);
  const known = useRef<Set<string> | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("kitchen_queue");
    if (error) setError(error.message);
    else {
      const rows = data as Ticket[];
      setError(null);
      setTickets(rows);
      if (known.current) {
        const added = rows.filter((r) => r.status === "confirmed" && !known.current!.has(r.id)).map((r) => r.order_number);
        if (added.length) setFresh(added);
      }
      known.current = new Set(rows.map((r) => r.id));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const poll = setInterval(load, 10_000);
    return () => clearInterval(poll);
  }, [load]);

  return { tickets, loading, error, reload: load, fresh, clearFresh: () => setFresh([]) };
}

export default function KitchenPage() {
  const { profile } = useAuth();
  const { tickets, loading, error, reload, fresh, clearFresh } = useKitchenQueue();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-3xl">Kitchen</h1>
      <NewOrderBanner numbers={fresh} onDismiss={clearFresh} />
      {error && (
        <p role="alert" className="font-bold text-danger">
          Could not load orders: {error}
        </p>
      )}
      {loading && <p className="text-muted">Loading orders...</p>}
      {!loading && tickets.length === 0 && !error && <p className="text-lg text-muted">Nothing to prepare right now.</p>}
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {tickets.map((t) => (
          <TicketCard key={t.id} t={t} role={profile?.role ?? "kitchen"} onDone={reload} />
        ))}
      </div>
    </div>
  );
}

function TicketCard({ t, role, onDone }: { t: Ticket; role: Role; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const action = actionsFor(t, role).find((a) => a.tone === "primary");

  async function go() {
    if (!action) return;
    setBusy(true);
    setError(null);
    try {
      await changeStatus(t.id, action.to);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className={`flex flex-col gap-3 rounded border-4 border-ink p-4 ${t.status === "preparing" ? "bg-sun" : "bg-paper"}`}>
      <header className="flex items-baseline justify-between">
        <h2 className="font-display text-3xl">{t.order_number}</h2>
        <span className="font-bold">
          {timeOf(t.created_at)} · {t.method === "delivery" ? "Delivery" : "Pickup"}
        </span>
      </header>
      <ul className="flex flex-col gap-2">
        {t.items.map((i) => (
          <li key={i.id} className="text-xl">
            <p className="font-bold">
              {i.quantity} × {i.name}
            </p>
            {i.options.length > 0 && <p className="text-lg">{i.options.map((x) => x.name).join(", ")}</p>}
            {i.notes && <p className="text-lg font-bold text-danger">Note: {i.notes}</p>}
          </li>
        ))}
      </ul>
      {t.notes && <p className="rounded bg-sun p-2 text-lg font-bold">Order note: {t.notes}</p>}
      {error && (
        <p role="alert" className="font-bold text-danger">
          {error}
        </p>
      )}
      {action && (
        <button onClick={go} disabled={busy} className="min-h-14 rounded border-2 border-ink bg-orange px-4 text-lg font-bold disabled:opacity-60">
          {action.label}
        </button>
      )}
    </article>
  );
}
