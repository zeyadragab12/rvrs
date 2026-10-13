"use client";

import { useCallback, useEffect, useState } from "react";
import { btnPlain, btnPrimary, ErrorLine, Field, inputCls, Panel } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { money } from "@/lib/orders";
import { supabase } from "@/lib/supabase";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
type Hours = Partial<Record<(typeof DAYS)[number], { open: string; close: string }>>;
type Branch = {
  id: string;
  name_en: string;
  name_ar: string | null;
  address: string | null;
  phone: string | null;
  opening_hours: Hours;
  delivery_enabled: boolean;
  pickup_enabled: boolean;
  is_active: boolean;
  is_demo: boolean;
};
type Closure = { id: string; starts_at: string; ends_at: string; reason: string | null };
type Zone = { id: string; name: string; delivery_fee: number; min_order: number; is_active: boolean; geojson: unknown };

export default function BranchesPage() {
  const { profile } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const isOwner = profile?.role === "owner";

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("branches").select("id,name_en,name_ar,address,phone,opening_hours,delivery_enabled,pickup_enabled,is_active,is_demo").order("name_en");
    if (error) setError(error.message);
    else setBranches(data as Branch[]);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function addBranch() {
    if (!newName.trim()) return;
    const { error } = await supabase.from("branches").insert({ name_en: newName.trim(), is_active: false });
    if (error) setError(error.message);
    else {
      setNewName("");
      load();
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-3xl">Branches</h1>
        <p className="text-muted">Only enter details the restaurant has confirmed. New branches start switched off.</p>
      </div>
      <ErrorLine message={error} />
      {branches.map((b) => (
        <BranchCard key={b.id} branch={b} isOwner={isOwner} canClose={isOwner || profile?.role === "branch_manager"} onSaved={load} />
      ))}
      {isOwner && (
        <Panel title="Add a branch">
          <div className="flex flex-wrap gap-2">
            <input aria-label="New branch name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Branch name" className={`${inputCls} max-w-xs`} />
            <button onClick={addBranch} className={btnPrimary}>
              Add branch
            </button>
          </div>
        </Panel>
      )}
    </div>
  );
}

function BranchCard({ branch, isOwner, canClose, onSaved }: { branch: Branch; isOwner: boolean; canClose: boolean; onSaved: () => void }) {
  const [b, setB] = useState(branch);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const id = branch.id;

  async function save() {
    setError(null);
    const { error } = await supabase
      .from("branches")
      .update({ name_en: b.name_en, name_ar: b.name_ar || null, address: b.address || null, phone: b.phone || null, opening_hours: b.opening_hours, delivery_enabled: b.delivery_enabled, pickup_enabled: b.pickup_enabled, is_active: b.is_active })
      .eq("id", id);
    if (error) return setError(error.message);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onSaved();
  }

  const setDay = (d: (typeof DAYS)[number], v: { open: string; close: string } | null) => {
    const next = { ...b.opening_hours };
    if (v) next[d] = v;
    else delete next[d];
    setB({ ...b, opening_hours: next });
  };

  return (
    <Panel
      title={`${branch.name_en}${branch.is_demo ? " (demo)" : ""}`}
      actions={isOwner && (
        <span className="flex items-center gap-3">
          {saved && <span className="font-bold text-ok">Saved</span>}
          <button onClick={save} className={btnPrimary}>
            Save branch
          </button>
        </span>
      )}
    >
      <ErrorLine message={error} />
      <fieldset disabled={!isOwner} className="grid gap-3 md:grid-cols-2">
        <Field label="Name (English)" htmlFor={`n-${id}`}>
          <input id={`n-${id}`} className={inputCls} value={b.name_en} onChange={(e) => setB({ ...b, name_en: e.target.value })} />
        </Field>
        <Field label="Name (Arabic)" htmlFor={`a-${id}`}>
          <input id={`a-${id}`} dir="rtl" className={inputCls} value={b.name_ar ?? ""} onChange={(e) => setB({ ...b, name_ar: e.target.value })} />
        </Field>
        <Field label="Verified address" htmlFor={`ad-${id}`}>
          <input id={`ad-${id}`} className={inputCls} value={b.address ?? ""} onChange={(e) => setB({ ...b, address: e.target.value })} />
        </Field>
        <Field label="Phone" htmlFor={`p-${id}`}>
          <input id={`p-${id}`} className={inputCls} value={b.phone ?? ""} onChange={(e) => setB({ ...b, phone: e.target.value })} />
        </Field>
        <div className="flex flex-wrap gap-4 md:col-span-2">
          {([["is_active", "Branch is open for orders"], ["delivery_enabled", "Delivery"], ["pickup_enabled", "Pickup"]] as const).map(([k, l]) => (
            <label key={k} className="flex min-h-11 items-center gap-2 font-bold">
              <input type="checkbox" className="size-6 accent-orange" checked={b[k]} onChange={(e) => setB({ ...b, [k]: e.target.checked })} />
              {l}
            </label>
          ))}
        </div>
        <div className="md:col-span-2">
          <p className="mb-1 text-sm font-bold text-muted">Opening hours (leave closed days unticked)</p>
          <div className="grid gap-1">
            {DAYS.map((d) => {
              const v = b.opening_hours[d];
              return (
                <div key={d} className="flex flex-wrap items-center gap-2">
                  <label className="flex min-h-11 w-20 items-center gap-2 font-bold uppercase">
                    <input type="checkbox" className="size-5 accent-orange" checked={!!v} onChange={(e) => setDay(d, e.target.checked ? { open: "10:00", close: "23:00" } : null)} />
                    {d}
                  </label>
                  {v ? (
                    <>
                      <input aria-label={`${d} opens`} type="time" className={`${inputCls} w-32`} value={v.open} onChange={(e) => setDay(d, { ...v, open: e.target.value })} />
                      <span>to</span>
                      <input aria-label={`${d} closes`} type="time" className={`${inputCls} w-32`} value={v.close} onChange={(e) => setDay(d, { ...v, close: e.target.value })} />
                    </>
                  ) : (
                    <span className="text-muted">Closed</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </fieldset>
      <Closures branchId={id} canEdit={canClose} />
      <Zones branchId={id} isOwner={isOwner} />
    </Panel>
  );
}

function Closures({ branchId, canEdit }: { branchId: string; canEdit: boolean }) {
  const [rows, setRows] = useState<Closure[]>([]);
  const [s, setS] = useState("");
  const [e, setE] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("branch_closures").select("id,starts_at,ends_at,reason").eq("branch_id", branchId).order("starts_at", { ascending: false }).limit(20);
    setRows((data as Closure[]) ?? []);
  }, [branchId]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function add() {
    setError(null);
    if (!s || !e || new Date(e) <= new Date(s)) return setError("Choose a start and an end after it.");
    const { error } = await supabase.from("branch_closures").insert({ branch_id: branchId, starts_at: new Date(s).toISOString(), ends_at: new Date(e).toISOString(), reason: reason || null });
    if (error) return setError(error.message);
    setS(""); setE(""); setReason("");
    load();
  }
  async function remove(id: string) {
    await supabase.from("branch_closures").delete().eq("id", id);
    load();
  }

  return (
    <div className="flex flex-col gap-2 border-t-2 border-line pt-3">
      <h3 className="font-bold">Special closures</h3>
      {rows.length === 0 && <p className="text-sm text-muted">None scheduled.</p>}
      {rows.map((c) => (
        <p key={c.id} className="flex flex-wrap items-center gap-2 text-sm">
          {new Date(c.starts_at).toLocaleString()} to {new Date(c.ends_at).toLocaleString()} {c.reason && `· ${c.reason}`}
          {canEdit && <button onClick={() => remove(c.id)} className="font-bold text-danger underline">Remove</button>}
        </p>
      ))}
      {canEdit && (
        <div className="flex flex-wrap items-end gap-2">
          <Field label="From" htmlFor={`cs-${branchId}`}><input id={`cs-${branchId}`} type="datetime-local" className={inputCls} value={s} onChange={(x) => setS(x.target.value)} /></Field>
          <Field label="Until" htmlFor={`ce-${branchId}`}><input id={`ce-${branchId}`} type="datetime-local" className={inputCls} value={e} onChange={(x) => setE(x.target.value)} /></Field>
          <Field label="Reason" htmlFor={`cr-${branchId}`}><input id={`cr-${branchId}`} className={inputCls} value={reason} onChange={(x) => setReason(x.target.value)} /></Field>
          <button onClick={add} className={btnPlain}>Add closure</button>
        </div>
      )}
      <ErrorLine message={error} />
    </div>
  );
}

function Zones({ branchId, isOwner }: { branchId: string; isOwner: boolean }) {
  const [zones, setZones] = useState<Zone[]>([]);
  const [editing, setEditing] = useState<Partial<Zone> & { geoText: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("zones_for_branch", { p_branch: branchId });
    if (error) setError(error.message);
    else setZones((data as Zone[]) ?? []);
  }, [branchId]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function save() {
    if (!editing) return;
    setError(null);
    let geo: unknown;
    try {
      geo = JSON.parse(editing.geoText);
    } catch {
      return setError("The polygon is not valid JSON.");
    }
    const { error } = await supabase.rpc("save_zone", {
      p_id: editing.id ?? null,
      p_branch: branchId,
      p_name: editing.name ?? "",
      p_geojson: geo,
      p_fee: Number(editing.delivery_fee ?? 0),
      p_min: Number(editing.min_order ?? 0),
      p_active: editing.is_active ?? true,
    });
    if (error) return setError(error.message);
    setEditing(null);
    load();
  }

  return (
    <div className="flex flex-col gap-2 border-t-2 border-line pt-3">
      <h3 className="font-bold">Delivery zones</h3>
      {zones.length === 0 && <p className="text-sm text-muted">No zones. This branch cannot deliver until one is added.</p>}
      {zones.map((z) => (
        <p key={z.id} className="flex flex-wrap items-center gap-2 text-sm">
          <b>{z.name}</b> · fee {money(z.delivery_fee)} · minimum {money(z.min_order)} · {z.is_active ? "active" : "off"}
          {isOwner && <button className="font-bold underline" onClick={() => setEditing({ ...z, geoText: JSON.stringify(z.geojson) })}>Edit</button>}
        </p>
      ))}
      {isOwner && !editing && <button onClick={() => setEditing({ name: "", delivery_fee: 0, min_order: 0, is_active: true, geoText: "" })} className={`${btnPlain} w-fit`}>Add zone</button>}
      {editing && (
        <div className="grid gap-3 rounded border-2 border-line p-3 md:grid-cols-3">
          <Field label="Zone name" htmlFor={`zn-${branchId}`}><input id={`zn-${branchId}`} className={inputCls} value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
          <Field label="Delivery fee (EGP)" htmlFor={`zf-${branchId}`}><input id={`zf-${branchId}`} inputMode="decimal" className={inputCls} value={editing.delivery_fee ?? 0} onChange={(e) => setEditing({ ...editing, delivery_fee: e.target.value as unknown as number })} /></Field>
          <Field label="Minimum order (EGP)" htmlFor={`zm-${branchId}`}><input id={`zm-${branchId}`} inputMode="decimal" className={inputCls} value={editing.min_order ?? 0} onChange={(e) => setEditing({ ...editing, min_order: e.target.value as unknown as number })} /></Field>
          <div className="md:col-span-3">
            <Field label="Zone shape (GeoJSON Polygon)" htmlFor={`zg-${branchId}`} hint='Draw the area at geojson.io, then paste only the geometry, for example {"type":"Polygon","coordinates":[[[lng,lat],...]]}. Longitude comes first.'>
              <textarea id={`zg-${branchId}`} className={`${inputCls} min-h-28 font-mono text-sm`} value={editing.geoText} onChange={(e) => setEditing({ ...editing, geoText: e.target.value })} />
            </Field>
          </div>
          <label className="flex min-h-11 items-center gap-2 font-bold">
            <input type="checkbox" className="size-6 accent-orange" checked={editing.is_active ?? true} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />
            Zone is active
          </label>
          <div className="flex gap-2 md:col-span-2">
            <button onClick={save} className={btnPrimary}>Save zone</button>
            <button onClick={() => { setEditing(null); setError(null); }} className={btnPlain}>Cancel</button>
          </div>
        </div>
      )}
      <ErrorLine message={error} />
    </div>
  );
}
