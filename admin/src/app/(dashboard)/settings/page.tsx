"use client";

import { useCallback, useEffect, useState } from "react";
import { btnPrimary, ErrorLine, Field, inputCls, Panel } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

const PAYMENT_KEYS = [
  { key: "payments.cash_on_delivery", label: "Cash on delivery", hint: "Customers can pay the driver in cash." },
  { key: "payments.cash_on_pickup", label: "Cash on pickup", hint: "Customers can pay at the counter when they collect." },
  { key: "payments.card_enabled", label: "Card payment", hint: "Only switch this on once a card payment provider is connected and tested." },
] as const;
const CAP_KEY = "loyalty.reward_cap";
const DEFAULT_CAP = "200";

type Values = { payments: Record<string, boolean>; cap: string };

export default function SettingsPage() {
  const { profile } = useAuth();
  const isOwner = profile?.role === "owner";
  const [values, setValues] = useState<Values | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("app_settings").select("key,value");
    if (error) return setError(error.message);
    const get = (k: string) => data?.find((r) => r.key === k)?.value;
    setError(null);
    setValues({
      payments: Object.fromEntries(PAYMENT_KEYS.map((p) => [p.key, get(p.key) === true])),
      cap: String(get(CAP_KEY) ?? DEFAULT_CAP),
    });
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function save(section: string, rows: { key: string; value: boolean | number }[]) {
    setError(null);
    const { error } = await supabase.from("app_settings").upsert(rows.map((r) => ({ ...r, updated_at: new Date().toISOString() })), { onConflict: "key" });
    if (error) return setError(error.message);
    setSaved(section);
    setTimeout(() => setSaved(null), 2000);
    load();
  }

  if (profile && !isOwner) return <p className="text-muted">Only the owner can change settings.</p>;

  const cap = Number(values?.cap);
  const capValid = values !== null && values.cap.trim() !== "" && Number.isFinite(cap) && cap >= 0;
  const noPayment = values !== null && !values.payments["payments.cash_on_delivery"] && !values.payments["payments.cash_on_pickup"] && !values.payments["payments.card_enabled"];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-3xl">Settings</h1>
        <p className="text-muted">Changes reach the app within about a minute.</p>
      </div>
      <ErrorLine message={error} />
      {!values && !error && <p className="text-muted">Loading...</p>}
      {values && (
        <>
          <Panel
            title="Payment methods"
            actions={
              <span className="flex items-center gap-3">
                {saved === "payments" && <span className="font-bold text-ok">Saved</span>}
                <button className={btnPrimary} disabled={noPayment} onClick={() => save("payments", PAYMENT_KEYS.map((p) => ({ key: p.key, value: values.payments[p.key] })))}>
                  Save payments
                </button>
              </span>
            }
          >
            {PAYMENT_KEYS.map((p) => (
              <label key={p.key} className="flex min-h-11 items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 size-6 accent-orange"
                  checked={values.payments[p.key]}
                  onChange={(e) => setValues({ ...values, payments: { ...values.payments, [p.key]: e.target.checked } })}
                />
                <span>
                  <span className="block font-bold">{p.label}</span>
                  <span className="block text-sm text-muted">{p.hint}</span>
                </span>
              </label>
            ))}
            {noPayment && <p role="alert" className="text-sm font-bold text-danger">Keep at least one payment method on, or customers cannot check out.</p>}
          </Panel>

          <Panel
            title="Loyalty (Smash Card)"
            actions={
              <span className="flex items-center gap-3">
                {saved === "loyalty" && <span className="font-bold text-ok">Saved</span>}
                <button className={btnPrimary} disabled={!capValid} onClick={() => save("loyalty", [{ key: CAP_KEY, value: cap }])}>
                  Save loyalty
                </button>
              </span>
            }
          >
            <Field label="Free order value limit (EGP)" htmlFor="cap" hint="After 10 completed orders the next one is free, up to this amount. The customer pays anything above it. Setting 0 gives no discount.">
              <input id="cap" inputMode="decimal" className={`${inputCls} max-w-48`} value={values.cap} onChange={(e) => setValues({ ...values, cap: e.target.value })} />
            </Field>
            {!capValid && <p role="alert" className="text-sm font-bold text-danger">Enter a number of 0 or more.</p>}
            <p className="text-sm text-muted">The number of stamps needed (10) is built into the app and database, so it is not editable here.</p>
          </Panel>
        </>
      )}
    </div>
  );
}
