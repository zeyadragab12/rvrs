"use client";

import { useEffect, useState } from "react";
import { ErrorLine } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type Entry = { id: string; action: string; entity: string; details: unknown; created_at: string; profiles: { full_name: string | null } | null };

export default function AuditPage() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<Entry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const owner = profile?.role === "owner";

  useEffect(() => {
    if (!owner) return;
    supabase
      .from("audit_logs")
      .select("id,action,entity,details,created_at,profiles(full_name)")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setRows(data as unknown as Entry[]);
      });
  }, [owner]);

  if (profile && !owner) return <p className="text-muted">Only the owner can read the audit log.</p>;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-3xl">Audit log</h1>
        <p className="text-muted">The latest 200 sensitive actions: order status changes, price and availability changes, zones and role changes.</p>
      </div>
      <ErrorLine message={error} />
      <div className="overflow-x-auto rounded border-2 border-ink bg-paper">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-ink text-cream"><tr><th className="p-3">When</th><th className="p-3">Who</th><th className="p-3">Action</th><th className="p-3">Details</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={4} className="p-3 text-muted">Nothing recorded yet.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-line align-top">
                <td className="p-3 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                <td className="p-3">{r.profiles?.full_name ?? "System"}</td>
                <td className="p-3 font-bold">{r.action.replace(/_/g, " ")}</td>
                <td className="p-3 font-mono text-xs break-all">{JSON.stringify(r.details)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
