"use client";

import { useCallback, useEffect, useState } from "react";
import { btnPlain, btnPrimary, ErrorLine, Field, inputCls, Panel } from "@/components/ui";
import { useAuth } from "@/lib/auth";
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

export default function PromotionsPage() {
  const { profile } = useAuth();
  const [promos, setPromos] = useState<Promo[]>([]);
  const [branches, setBranches] = useState<Opt[]>([]);
  const [categories, setCategories] = useState<Opt[]>([]);
  const [products, setProducts] = useState<Opt[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
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
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function save() {
    if (!draft) return;
    setError(null);
    const value = Number(draft.discount_value);
    if (!draft.code.trim()) return setError("Enter a code.");
    if (!(value > 0) || (draft.discount_type === "percentage" && value > 100)) return setError("Enter a discount above 0 (percentages up to 100).");
    const row = {
      code: draft.code.trim().toUpperCase(),
      discount_type: draft.discount_type,
      discount_value: value,
      min_order: Number(draft.min_order || 0),
      usage_limit: draft.usage_limit ? Number(draft.usage_limit) : null,
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
          <p className="text-muted">Codes are checked by the server when an order is placed. Expired, used-up or ineligible codes are refused.</p>
        </div>
        {canEdit && !draft && <button onClick={() => setDraft(blank)} className={btnPrimary}>New promotion</button>}
      </div>
      <ErrorLine message={error} />
      {!canEdit && <p className="text-muted">View only. Ask the owner to change promotions.</p>}

      {draft && (
        <Panel title={draft.id ? `Edit ${draft.code}` : "New promotion"}>
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Code" htmlFor="pc"><input id="pc" className={`${inputCls} uppercase`} value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} /></Field>
            <Field label="Type" htmlFor="pt">
              <select id="pt" className={inputCls} value={draft.discount_type} onChange={(e) => setDraft({ ...draft, discount_type: e.target.value as Draft["discount_type"] })}>
                <option value="percentage">Percentage off</option>
                <option value="fixed">Fixed amount off (EGP)</option>
              </select>
            </Field>
            <Field label={draft.discount_type === "percentage" ? "Percent" : "Amount (EGP)"} htmlFor="pv"><input id="pv" inputMode="decimal" className={inputCls} value={draft.discount_value} onChange={(e) => setDraft({ ...draft, discount_value: e.target.value })} /></Field>
            <Field label="Minimum order (EGP)" htmlFor="pm"><input id="pm" inputMode="decimal" className={inputCls} value={draft.min_order} onChange={(e) => setDraft({ ...draft, min_order: e.target.value })} /></Field>
            <Field label="Usage limit" htmlFor="pl" hint="Leave empty for no limit."><input id="pl" inputMode="numeric" className={inputCls} value={draft.usage_limit} onChange={(e) => setDraft({ ...draft, usage_limit: e.target.value })} /></Field>
            <label className="flex min-h-11 items-center gap-2 self-end font-bold"><input type="checkbox" className="size-6 accent-orange" checked={draft.is_active} onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })} />Active</label>
            <Field label="Starts" htmlFor="ps"><input id="ps" type="datetime-local" className={inputCls} value={draft.starts_at} onChange={(e) => setDraft({ ...draft, starts_at: e.target.value })} /></Field>
            <Field label="Ends" htmlFor="pe"><input id="pe" type="datetime-local" className={inputCls} value={draft.ends_at} onChange={(e) => setDraft({ ...draft, ends_at: e.target.value })} /></Field>
          </div>
          <Checks title="Only these branches (none ticked means all)" items={branches} picked={draft.branch_ids} onToggle={(id) => setDraft({ ...draft, branch_ids: toggle(draft.branch_ids, id) })} />
          <Checks title="Only these categories (none ticked means all)" items={categories} picked={draft.category_ids} onToggle={(id) => setDraft({ ...draft, category_ids: toggle(draft.category_ids, id) })} />
          <Checks title="Only these products (none ticked means all)" items={products} picked={draft.product_ids} onToggle={(id) => setDraft({ ...draft, product_ids: toggle(draft.product_ids, id) })} />
          <div className="flex gap-2">
            <button onClick={save} className={btnPrimary}>Save promotion</button>
            <button onClick={() => { setDraft(null); setError(null); }} className={btnPlain}>Cancel</button>
          </div>
        </Panel>
      )}

      <div className="overflow-x-auto rounded border-2 border-ink bg-paper">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-ink text-cream"><tr><th className="p-3">Code</th><th className="p-3">Discount</th><th className="p-3">Minimum</th><th className="p-3">Used</th><th className="p-3">Valid</th><th className="p-3">Status</th><th className="p-3"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>
            {promos.length === 0 && <tr><td colSpan={7} className="p-3 text-muted">No promotions yet.</td></tr>}
            {promos.map((p) => (
              <tr key={p.id} className="border-t border-line">
                <td className="p-3 font-bold">{p.code}</td>
                <td className="p-3">{p.discount_type === "percentage" ? `${p.discount_value}%` : `${p.discount_value} EGP`}</td>
                <td className="p-3">{p.min_order} EGP</td>
                <td className="p-3">{p.used_count}{p.usage_limit ? ` / ${p.usage_limit}` : ""}</td>
                <td className="p-3">{p.starts_at ? new Date(p.starts_at).toLocaleDateString() : "now"} to {p.ends_at ? new Date(p.ends_at).toLocaleDateString() : "no end"}</td>
                <td className="p-3 font-bold">{p.is_active ? "Active" : "Off"}</td>
                <td className="p-3">{canEdit && <button className="font-bold underline" onClick={() => setDraft(edit(p))}>Edit</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Checks({ title, items, picked, onToggle }: { title: string; items: Opt[]; picked: string[]; onToggle: (id: string) => void }) {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="text-sm font-bold text-muted">{title}</legend>
      <div className="flex flex-wrap gap-x-4">
        {items.map((i) => (
          <label key={i.id} className="flex min-h-10 items-center gap-2">
            <input type="checkbox" className="size-5 accent-orange" checked={picked.includes(i.id)} onChange={() => onToggle(i.id)} />
            {i.name_en}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
