"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { btnPlain, btnPrimary, ErrorLine, Field, inputCls, Panel } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { money } from "@/lib/orders";
import { supabase } from "@/lib/supabase";

type Promo = {
  id: string;
  code: string;
  discount_type: "fixed" | "percentage";
  discount_value: number;
  min_order: number;
  usage_limit: number | null;
  used_count: number;
  starts_at: string | null;
  ends_at: string | null;
  branch_ids: string[] | null;
  product_ids: string[] | null;
  category_ids: string[] | null;
  is_active: boolean;
};
type Opt = { id: string; name_en: string };
type Draft = {
  id?: string;
  code: string;
  discount_type: "fixed" | "percentage";
  discount_value: string;
  min_order: string;
  usage_limit: string;
  starts_at: string;
  ends_at: string;
  branch_ids: string[];
  category_ids: string[];
  product_ids: string[];
  is_active: boolean;
};

const blank: Draft = { code: "", discount_type: "percentage", discount_value: "10", min_order: "0", usage_limit: "", starts_at: "", ends_at: "", branch_ids: [], category_ids: [], product_ids: [], is_active: true };
const toLocal = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date(iso).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");
const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

/** What a customer would hit first. Mirrors the order the server checks a code in. */
type State = "live" | "scheduled" | "expired" | "used_up" | "off";
function stateOf(p: Promo, now: number): State {
  if (!p.is_active) return "off";
  if (p.starts_at && new Date(p.starts_at).getTime() > now) return "scheduled";
  if (p.ends_at && new Date(p.ends_at).getTime() < now) return "expired";
  if (p.usage_limit !== null && p.used_count >= p.usage_limit) return "used_up";
  return "live";
}
const STATE_LABEL: Record<State, string> = { live: "Live", scheduled: "Scheduled", expired: "Expired", used_up: "Used up", off: "Switched off" };
const STATE_STYLE: Record<State, string> = {
  live: "bg-ok text-white",
  scheduled: "bg-sun text-ink",
  expired: "bg-line text-ink",
  used_up: "bg-line text-ink",
  off: "bg-line text-ink",
};
const FILTERS: { key: "all" | State; label: string }[] = [
  { key: "all", label: "All" },
  { key: "live", label: "Live" },
  { key: "scheduled", label: "Scheduled" },
  { key: "expired", label: "Expired" },
  { key: "used_up", label: "Used up" },
  { key: "off", label: "Off" },
];

function scopeText(ids: string[] | null, all: Opt[], noun: string) {
  if (!ids || ids.length === 0) return null;
  const names = ids.map((id) => all.find((o) => o.id === id)?.name_en).filter(Boolean) as string[];
  if (names.length <= 2) return names.join(", ");
  return `${names.slice(0, 2).join(", ")} +${names.length - 2} more ${noun}`;
}

export default function PromotionsPage() {
  const { profile } = useAuth();
  const [promos, setPromos] = useState<Promo[]>([]);
  const [branches, setBranches] = useState<Opt[]>([]);
  const [categories, setCategories] = useState<Opt[]>([]);
  const [products, setProducts] = useState<Opt[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | State>("all");
  const [search, setSearch] = useState("");
  const [now] = useState(() => Date.now());
  const canEdit = profile?.role === "owner";

  const load = useCallback(async () => {
    const [p, b, c, pr] = await Promise.all([
      supabase.from("promotions").select("*").order("code"),
      supabase.from("branches").select("id,name_en").order("name_en"),
      supabase.from("categories").select("id,name_en").order("name_en"),
      supabase.from("products").select("id,name_en").order("name_en"),
    ]);
    if (p.error) setError(p.error.message);
    setPromos((p.data as Promo[]) ?? []);
    setBranches((b.data as Opt[]) ?? []);
    setCategories((c.data as Opt[]) ?? []);
    setProducts((pr.data as Opt[]) ?? []);
    setLoading(false);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: promos.length };
    promos.forEach((p) => {
      const s = stateOf(p, now);
      c[s] = (c[s] ?? 0) + 1;
    });
    return c;
  }, [promos, now]);

  const shown = useMemo(
    () =>
      promos
        .filter((p) => (filter === "all" ? true : stateOf(p, now) === filter))
        .filter((p) => p.code.toLowerCase().includes(search.trim().toLowerCase())),
    [promos, filter, search, now],
  );

  async function save() {
    if (!draft) return;
    setError(null);
    const code = draft.code.trim().toUpperCase();
    const value = Number(draft.discount_value);
    const min = Number(draft.min_order || 0);
    const limit = draft.usage_limit.trim() === "" ? null : Number(draft.usage_limit);
    if (!code) return setError("Enter a code.");
    if (!/^[A-Z0-9_-]{3,30}$/.test(code)) return setError("The code must be 3 to 30 characters: letters, numbers, - or _ only, with no spaces. Customers type it by hand.");
    if (!(value > 0) || (draft.discount_type === "percentage" && value > 100)) return setError("Enter a discount above 0 (percentages up to 100).");
    if (!Number.isFinite(min) || min < 0) return setError("The minimum order must be 0 or more.");
    if (limit !== null && (!Number.isInteger(limit) || limit < 1)) return setError("The usage limit must be a whole number of 1 or more, or empty for no limit.");
    if (draft.starts_at && draft.ends_at && new Date(draft.ends_at) <= new Date(draft.starts_at)) return setError("The end date must be after the start date.");
    const row = {
      code,
      discount_type: draft.discount_type,
      discount_value: value,
      min_order: min,
      usage_limit: limit,
      starts_at: draft.starts_at ? new Date(draft.starts_at).toISOString() : null,
      ends_at: draft.ends_at ? new Date(draft.ends_at).toISOString() : null,
      branch_ids: draft.branch_ids.length ? draft.branch_ids : null,
      category_ids: draft.category_ids.length ? draft.category_ids : null,
      product_ids: draft.product_ids.length ? draft.product_ids : null,
      is_active: draft.is_active,
    };
    const { error } = draft.id ? await supabase.from("promotions").update(row).eq("id", draft.id) : await supabase.from("promotions").insert(row);
    if (error) return setError(error.message.includes("duplicate") ? "That code already exists." : error.message);
    setDraft(null);
    load();
  }

  async function setActive(p: Promo, active: boolean) {
    setError(null);
    const { error } = await supabase.from("promotions").update({ is_active: active }).eq("id", p.id);
    if (error) setError(error.message);
    load();
  }

  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const edit = (p: Promo): Draft => ({
    id: p.id, code: p.code, discount_type: p.discount_type, discount_value: String(p.discount_value), min_order: String(p.min_order),
    usage_limit: p.usage_limit?.toString() ?? "", starts_at: toLocal(p.starts_at), ends_at: toLocal(p.ends_at),
    branch_ids: p.branch_ids ?? [], category_ids: p.category_ids ?? [], product_ids: p.product_ids ?? [], is_active: p.is_active,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-3xl">Promotions</h1>
          <p className="text-muted">When a code is refused, the customer is told why: not valid, not started, expired, wrong branch, used up, order too small, or not for these items.</p>
        </div>
        {canEdit && !draft && <button onClick={() => { setError(null); setDraft(blank); }} className={btnPrimary}>New promotion</button>}
      </div>
      <ErrorLine message={error} />
      {!canEdit && <p className="text-muted">View only. Ask the owner to change promotions.</p>}

      {draft && (
        <PromoForm
          draft={draft}
          setDraft={setDraft}
          branches={branches}
          categories={categories}
          products={products}
          toggle={toggle}
          onSave={save}
          onCancel={() => { setDraft(null); setError(null); }}
          usedCount={promos.find((p) => p.id === draft.id)?.used_count ?? 0}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Filter promotions" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              role="tab"
              aria-selected={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={`min-h-10 rounded border-2 border-ink px-3 text-sm font-bold ${filter === f.key ? "bg-ink text-cream" : "bg-paper text-ink"}`}
            >
              {f.label} <span className="opacity-70">{counts[f.key] ?? 0}</span>
            </button>
          ))}
        </div>
        <input aria-label="Search codes" placeholder="Search codes" value={search} onChange={(e) => setSearch(e.target.value)} className={`${inputCls} max-w-56`} />
      </div>

      <div className="overflow-x-auto rounded border-2 border-ink bg-paper">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-ink text-cream">
            <tr>
              <th className="p-3">Code</th>
              <th className="p-3">Offer</th>
              <th className="p-3">Applies to</th>
              <th className="p-3">Used</th>
              <th className="p-3">Dates</th>
              <th className="p-3">Status</th>
              <th className="p-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="p-3 text-muted">Loading...</td></tr>}
            {!loading && shown.length === 0 && (
              <tr><td colSpan={7} className="p-3 text-muted">{promos.length === 0 ? "No promotions yet." : "No promotions match this filter."}</td></tr>
            )}
            {shown.map((p) => {
              const s = stateOf(p, now);
              const where = [scopeText(p.branch_ids, branches, "branches"), scopeText(p.category_ids, categories, "categories"), scopeText(p.product_ids, products, "products")].filter(Boolean);
              const pct = p.usage_limit ? Math.min(100, Math.round((p.used_count / p.usage_limit) * 100)) : 0;
              return (
                <tr key={p.id} className="border-t border-line align-top">
                  <td className="p-3 font-mono font-bold">{p.code}</td>
                  <td className="p-3">
                    <p className="font-bold">{p.discount_type === "percentage" ? `${p.discount_value}% off` : `${money(p.discount_value)} off`}</p>
                    <p className="text-muted">{Number(p.min_order) > 0 ? `Orders of ${money(p.min_order)}+` : "No minimum"}</p>
                  </td>
                  <td className="p-3">{where.length ? where.map((w) => <p key={w}>{w}</p>) : <span className="text-muted">Everything, all branches</span>}</td>
                  <td className="p-3">
                    <p>{p.used_count}{p.usage_limit ? ` of ${p.usage_limit}` : " (no limit)"}</p>
                    {p.usage_limit ? <div className="mt-1 h-2 w-24 rounded bg-line" aria-hidden><div className="h-2 rounded bg-orange" style={{ width: `${pct}%` }} /></div> : null}
                  </td>
                  <td className="p-3 text-muted">
                    {p.starts_at ? `From ${day(p.starts_at)}` : "From now"}
                    <br />
                    {p.ends_at ? `Until ${day(p.ends_at)}` : "No end date"}
                  </td>
                  <td className="p-3"><span className={`inline-block rounded px-2 py-1 text-xs font-bold ${STATE_STYLE[s]}`}>{STATE_LABEL[s]}</span></td>
                  <td className="p-3">
                    {canEdit && (
                      <span className="flex flex-wrap gap-3">
                        <button className="font-bold underline" onClick={() => { setError(null); setDraft(edit(p)); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</button>
                        <button className="font-bold underline" onClick={() => setActive(p, !p.is_active)}>{p.is_active ? "Switch off" : "Switch on"}</button>
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PromoForm({
  draft, setDraft, branches, categories, products, toggle, onSave, onCancel, usedCount,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  branches: Opt[];
  categories: Opt[];
  products: Opt[];
  toggle: (list: string[], id: string) => string[];
  onSave: () => void;
  onCancel: () => void;
  usedCount: number;
}) {
  const value = Number(draft.discount_value);
  const min = Number(draft.min_order || 0);
  const summary = [
    `${draft.code.trim().toUpperCase() || "This code"} gives`,
    value > 0 ? (draft.discount_type === "percentage" ? `${value}% off` : `${money(value)} off`) : "a discount",
    min > 0 ? `on orders of ${money(min)} or more` : "with no minimum order",
    draft.branch_ids.length ? `at ${draft.branch_ids.length} selected branch${draft.branch_ids.length > 1 ? "es" : ""}` : "at every branch",
    draft.category_ids.length || draft.product_ids.length ? "for the selected items only" : "on everything",
    draft.starts_at ? `from ${day(draft.starts_at)}` : "starting now",
    draft.ends_at ? `until ${day(draft.ends_at)}` : "with no end date",
    draft.usage_limit.trim() ? `(limited to ${draft.usage_limit} uses)` : "",
  ].filter(Boolean).join(" ") + ".";
  const limitBelowUsed = draft.id && draft.usage_limit.trim() !== "" && Number(draft.usage_limit) <= usedCount;
  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });

  return (
    <Panel
      title={draft.id ? `Edit ${draft.code}` : "New promotion"}
      actions={
        <span className="flex gap-2">
          <button onClick={onSave} className={btnPrimary}>Save promotion</button>
          <button onClick={onCancel} className={btnPlain}>Cancel</button>
        </span>
      }
    >
      <p className="rounded bg-cream p-3 text-sm" aria-live="polite">{summary}</p>

      <Section title="1. The offer">
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Code" htmlFor="pc" hint="Letters, numbers, - or _. Customers type this, so keep it short.">
            <input id="pc" className={`${inputCls} uppercase`} value={draft.code} onChange={(e) => set({ code: e.target.value })} />
          </Field>
          <Field label="Type" htmlFor="pt">
            <select id="pt" className={inputCls} value={draft.discount_type} onChange={(e) => set({ discount_type: e.target.value as Draft["discount_type"] })}>
              <option value="percentage">Percentage off</option>
              <option value="fixed">Fixed amount off (EGP)</option>
            </select>
          </Field>
          <Field label={draft.discount_type === "percentage" ? "Percent" : "Amount (EGP)"} htmlFor="pv">
            <input id="pv" inputMode="decimal" className={inputCls} value={draft.discount_value} onChange={(e) => set({ discount_value: e.target.value })} />
          </Field>
        </div>
      </Section>

      <Section title="2. Limits">
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Minimum order (EGP)" htmlFor="pm" hint="Counted on the items, before delivery. 0 means no minimum.">
            <input id="pm" inputMode="decimal" className={inputCls} value={draft.min_order} onChange={(e) => set({ min_order: e.target.value })} />
          </Field>
          <Field label="Usage limit" htmlFor="pl" hint={draft.id ? `Used ${usedCount} time${usedCount === 1 ? "" : "s"} so far. Leave empty for no limit.` : "Total uses across all customers. Leave empty for no limit."}>
            <input id="pl" inputMode="numeric" className={inputCls} value={draft.usage_limit} onChange={(e) => set({ usage_limit: e.target.value })} />
          </Field>
          <label className="flex min-h-11 items-center gap-2 self-end font-bold">
            <input type="checkbox" className="size-6 accent-orange" checked={draft.is_active} onChange={(e) => set({ is_active: e.target.checked })} />
            Active (customers can use it)
          </label>
        </div>
        {limitBelowUsed && <p role="alert" className="text-sm font-bold text-danger">This limit is already reached, so customers will be told the code is used up.</p>}
      </Section>

      <Section title="3. Schedule" note="Optional. Times use this device's clock.">
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Starts" htmlFor="ps"><input id="ps" type="datetime-local" className={inputCls} value={draft.starts_at} onChange={(e) => set({ starts_at: e.target.value })} /></Field>
          <Field label="Ends" htmlFor="pe"><input id="pe" type="datetime-local" className={inputCls} value={draft.ends_at} onChange={(e) => set({ ends_at: e.target.value })} /></Field>
        </div>
      </Section>

      <Section title="4. Where it applies" note="Leave a list empty to allow all. Categories and products together mean either one qualifies.">
        <Checks title="Branches" items={branches} picked={draft.branch_ids} onToggle={(id) => set({ branch_ids: toggle(draft.branch_ids, id) })} />
        <Checks title="Categories" items={categories} picked={draft.category_ids} onToggle={(id) => set({ category_ids: toggle(draft.category_ids, id) })} />
        <Checks title="Products" items={products} picked={draft.product_ids} onToggle={(id) => set({ product_ids: toggle(draft.product_ids, id) })} />
      </Section>
    </Panel>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2 border-t-2 border-line pt-3">
      <div>
        <h3 className="font-bold">{title}</h3>
        {note && <p className="text-sm text-muted">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function Checks({ title, items, picked, onToggle }: { title: string; items: Opt[]; picked: string[]; onToggle: (id: string) => void }) {
  return (
    <details className="rounded border-2 border-line p-2" open={picked.length > 0 && items.length <= 12}>
      <summary className="min-h-10 cursor-pointer font-bold">
        {title} <span className="font-normal text-muted">{picked.length ? `${picked.length} selected` : "all"}</span>
      </summary>
      <div className="mt-1 flex flex-wrap gap-x-4">
        {items.map((i) => (
          <label key={i.id} className="flex min-h-10 items-center gap-2">
            <input type="checkbox" className="size-5 accent-orange" checked={picked.includes(i.id)} onChange={() => onToggle(i.id)} />
            {i.name_en}
          </label>
        ))}
      </div>
    </details>
  );
}
