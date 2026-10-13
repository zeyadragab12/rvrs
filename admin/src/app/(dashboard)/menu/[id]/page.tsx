"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { btnPlain, btnPrimary, ErrorLine, Field, inputCls, Panel } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { BUCKET, pathFromPublicUrl, resizeImage } from "@/lib/images";
import { supabase } from "@/lib/supabase";

type Product = {
  id: string;
  category_id: string;
  name_en: string;
  name_ar: string | null;
  description_en: string | null;
  description_ar: string | null;
  base_price: number;
  allergens: string[] | null;
  sort_order: number;
  is_published: boolean;
  is_available: boolean;
  is_archived: boolean;
  is_demo: boolean;
  image_paths: string[];
};
type Opt = { id: string; group_id: string; name_en: string; name_ar: string | null; price_delta: number; is_available: boolean; sort_order: number };
type Group = { id: string; name_en: string; name_ar: string | null; is_required: boolean; min_select: number; max_select: number; sort_order: number; options: Opt[] };
type Cat = { id: string; name_en: string };
type Branch = { id: string; name_en: string };
type Setting = { branch_id: string; price_override: number | null; is_available: boolean };

const SELECT = "id,category_id,name_en,name_ar,description_en,description_ar,base_price,allergens,sort_order,is_published,is_available,is_archived,is_demo,image_paths";

export default function ProductEditor() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "new";
  const { profile } = useAuth();
  const isOwner = profile?.role === "owner";
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [c, b] = await Promise.all([supabase.from("categories").select("id,name_en").order("sort_order"), supabase.from("branches").select("id,name_en").order("name_en")]);
    setCats((c.data as Cat[]) ?? []);
    setBranches((b.data as Branch[]) ?? []);
    if (isNew) return;
    const [p, g, s] = await Promise.all([
      supabase.from("products").select(SELECT).eq("id", id).single(),
      supabase.from("option_groups").select("id,name_en,name_ar,is_required,min_select,max_select,sort_order,options(id,group_id,name_en,name_ar,price_delta,is_available,sort_order)").eq("product_id", id).order("sort_order"),
      supabase.from("branch_product_settings").select("branch_id,price_override,is_available").eq("product_id", id),
    ]);
    if (p.error) return setError(p.error.message);
    setProduct(p.data as Product);
    setGroups(((g.data ?? []) as unknown as Group[]).map((x) => ({ ...x, options: [...x.options].sort((a, b) => a.sort_order - b.sort_order) })));
    setSettings((s.data as Setting[]) ?? []);
  }, [id, isNew]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  if (isNew && profile && !isOwner) return <p className="text-muted">Only the owner can add products.</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-3xl">{isNew ? "New product" : product?.name_en ?? "Product"}</h1>
        <Link href="/menu" className="font-bold underline">Back to menu</Link>
      </div>
      <ErrorLine message={error} />
      {(isNew || product) && (
        <Details
          key={product?.id ?? "new"}
          initial={product}
          cats={cats}
          isOwner={isOwner}
          onError={setError}
          onSaved={async (newId) => {
            if (newId) router.replace(`/menu/${newId}`);
            else load();
          }}
        />
      )}
      {product && (
        <>
          <Photos product={product} isOwner={isOwner} onError={setError} onChanged={load} />
          <Options productId={product.id} groups={groups} isOwner={isOwner} onError={setError} onChanged={load} />
          <BranchSettings productId={product.id} basePrice={product.base_price} branches={branches} settings={settings} canEdit={isOwner || profile?.role === "branch_manager"} onError={setError} onChanged={load} />
        </>
      )}
    </div>
  );
}

function Details({ initial, cats, isOwner, onError, onSaved }: { initial: Product | null; cats: Cat[]; isOwner: boolean; onError: (m: string | null) => void; onSaved: (newId?: string) => void }) {
  const [p, setP] = useState({
    category_id: initial?.category_id ?? "",
    name_en: initial?.name_en ?? "",
    name_ar: initial?.name_ar ?? "",
    description_en: initial?.description_en ?? "",
    description_ar: initial?.description_ar ?? "",
    base_price: String(initial?.base_price ?? ""),
    allergens: (initial?.allergens ?? []).join(", "),
    sort_order: String(initial?.sort_order ?? 0),
    is_published: initial?.is_published ?? false,
    is_available: initial?.is_available ?? true,
    is_archived: initial?.is_archived ?? false,
  });
  const [saved, setSaved] = useState(false);

  async function save() {
    onError(null);
    const price = Number(p.base_price);
    const category = p.category_id || cats[0]?.id;
    if (!p.name_en.trim()) return onError("Enter the product name.");
    if (!(p.base_price.trim() !== "" && price >= 0)) return onError("Enter a base price of 0 or more.");
    if (!category) return onError("Add a category first.");
    const row = {
      category_id: category,
      name_en: p.name_en.trim(),
      name_ar: p.name_ar.trim() || null,
      description_en: p.description_en.trim() || null,
      description_ar: p.description_ar.trim() || null,
      base_price: Math.round(price * 100) / 100,
      allergens: p.allergens.trim() ? p.allergens.split(",").map((s) => s.trim()).filter(Boolean) : null,
      sort_order: Number(p.sort_order) || 0,
      is_published: p.is_published,
      is_available: p.is_available,
      is_archived: p.is_archived,
    };
    if (initial) {
      const { error } = await supabase.from("products").update(row).eq("id", initial.id);
      if (error) return onError(error.message);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaved();
    } else {
      const { data, error } = await supabase.from("products").insert(row).select("id").single();
      if (error) return onError(error.message);
      onSaved(data.id);
    }
  }

  const set = <K extends keyof typeof p>(k: K, v: (typeof p)[K]) => setP({ ...p, [k]: v });

  return (
    <Panel
      title="Details"
      actions={isOwner && (
        <span className="flex items-center gap-3">
          {saved && <span className="font-bold text-ok">Saved</span>}
          <button onClick={save} className={btnPrimary}>{initial ? "Save details" : "Create product"}</button>
        </span>
      )}
    >
      <fieldset disabled={!isOwner} className="grid gap-3 md:grid-cols-2">
        <Field label="Name (English)" htmlFor="pn"><input id="pn" className={inputCls} value={p.name_en} onChange={(e) => set("name_en", e.target.value)} /></Field>
        <Field label="Name (Arabic)" htmlFor="pna"><input id="pna" dir="rtl" className={inputCls} value={p.name_ar} onChange={(e) => set("name_ar", e.target.value)} /></Field>
        <Field label="Description (English)" htmlFor="pd"><textarea id="pd" className={`${inputCls} min-h-20`} value={p.description_en} onChange={(e) => set("description_en", e.target.value)} /></Field>
        <Field label="Description (Arabic)" htmlFor="pda"><textarea id="pda" dir="rtl" className={`${inputCls} min-h-20`} value={p.description_ar} onChange={(e) => set("description_ar", e.target.value)} /></Field>
        <Field label="Category" htmlFor="pc">
          <select id="pc" className={inputCls} value={p.category_id || cats[0]?.id || ""} onChange={(e) => set("category_id", e.target.value)}>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name_en}</option>)}
          </select>
        </Field>
        <Field label="Base price (EGP)" htmlFor="pp"><input id="pp" inputMode="decimal" className={inputCls} value={p.base_price} onChange={(e) => set("base_price", e.target.value)} /></Field>
        <Field label="Allergens (comma separated)" htmlFor="pal" hint="Only enter allergens the restaurant has verified. Leave empty if unknown. Nothing is shown to customers when empty."><input id="pal" className={inputCls} value={p.allergens} onChange={(e) => set("allergens", e.target.value)} /></Field>
        <Field label="Sort order" htmlFor="ps"><input id="ps" inputMode="numeric" className={inputCls} value={p.sort_order} onChange={(e) => set("sort_order", e.target.value)} /></Field>
        <div className="flex flex-wrap gap-4 md:col-span-2">
          {([["is_published", "Published in the app"], ["is_available", "Available to order"], ["is_archived", "Archived"]] as const).map(([k, l]) => (
            <label key={k} className="flex min-h-11 items-center gap-2 font-bold">
              <input type="checkbox" className="size-6 accent-orange" checked={p[k]} onChange={(e) => set(k, e.target.checked)} />
              {l}
            </label>
          ))}
        </div>
      </fieldset>
      {!initial && <p className="text-sm text-muted">After creating the product you can add photos, options and branch settings.</p>}
    </Panel>
  );
}

function Photos({ product, isOwner, onError, onChanged }: { product: Product; isOwner: boolean; onError: (m: string | null) => void; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);

  async function save(paths: string[]) {
    const { error } = await supabase.from("products").update({ image_paths: paths }).eq("id", product.id);
    if (error) onError(error.message);
    onChanged();
  }

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    onError(null);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) throw new Error(`${file.name} is not an image.`);
        const blob = await resizeImage(file);
        const path = `${product.id}/${crypto.randomUUID()}.webp`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: "image/webp", cacheControl: "31536000" });
        if (error) throw new Error(error.message);
        urls.push(supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
      }
      await save([...product.image_paths, ...urls]);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(url: string) {
    const path = pathFromPublicUrl(url);
    if (path) await supabase.storage.from(BUCKET).remove([path]);
    await save(product.image_paths.filter((u) => u !== url));
  }

  const makeMain = (url: string) => save([url, ...product.image_paths.filter((u) => u !== url)]);

  return (
    <Panel title="Photos">
      <p className="text-sm text-muted">Use real photos of the RVRS menu. The first photo is the main one. Photos are resized before upload.</p>
      <div className="flex flex-wrap gap-3">
        {product.image_paths.length === 0 && <p className="text-muted">No photos yet. The app shows a grey placeholder.</p>}
        {product.image_paths.map((u, i) => (
          <figure key={u} className="flex w-40 flex-col gap-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt={`${product.name_en} photo ${i + 1}`} className="aspect-4/3 w-full rounded border-2 border-ink object-cover" />
            {isOwner && (
              <figcaption className="flex flex-wrap gap-2 text-sm">
                {i > 0 && <button onClick={() => makeMain(u)} className="font-bold underline">Make main</button>}
                <button onClick={() => remove(u)} className="font-bold text-danger underline">Remove</button>
              </figcaption>
            )}
            {i === 0 && <span className="text-xs font-bold">Main photo</span>}
          </figure>
        ))}
      </div>
      {isOwner && (
        <Field label={busy ? "Uploading..." : "Add photos (JPG, PNG or WebP)"} htmlFor="photo-upload">
          <input id="photo-upload" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy} onChange={(e) => { upload(e.target.files); e.target.value = ""; }} className="min-h-11" />
        </Field>
      )}
    </Panel>
  );
}

function Options({ productId, groups, isOwner, onError, onChanged }: { productId: string; groups: Group[]; isOwner: boolean; onError: (m: string | null) => void; onChanged: () => void }) {
  async function addGroup() {
    const { error } = await supabase.from("option_groups").insert({ product_id: productId, name_en: "New option group", sort_order: groups.length + 1, is_required: false, min_select: 0, max_select: 1 });
    if (error) onError(error.message);
    onChanged();
  }
  return (
    <Panel title="Options and extras" actions={isOwner && <button onClick={addGroup} className={btnPlain}>Add option group</button>}>
      <p className="text-sm text-muted">Each group is one step in the app, for example Patty, Size or Extras. Required groups must be answered before adding to the cart.</p>
      {groups.length === 0 && <p className="text-muted">No options. Customers only choose quantity and notes.</p>}
      {groups.map((g) => <GroupEditor key={g.id} g={g} isOwner={isOwner} onError={onError} onChanged={onChanged} />)}
    </Panel>
  );
}

function GroupEditor({ g, isOwner, onError, onChanged }: { g: Group; isOwner: boolean; onError: (m: string | null) => void; onChanged: () => void }) {
  const [v, setV] = useState({ name_en: g.name_en, name_ar: g.name_ar ?? "", is_required: g.is_required, min_select: String(g.min_select), max_select: String(g.max_select), sort_order: String(g.sort_order) });

  async function save() {
    onError(null);
    const min = Number(v.min_select), max = Number(v.max_select);
    if (!v.name_en.trim()) return onError("Enter a group name.");
    if (!(Number.isInteger(min) && Number.isInteger(max) && min >= 0 && max >= 1 && max >= min)) return onError("Minimum must be 0 or more, and maximum at least 1 and not below the minimum.");
    if (v.is_required && min < 1) return onError("A required group needs a minimum of at least 1.");
    const { error } = await supabase.from("option_groups").update({ name_en: v.name_en.trim(), name_ar: v.name_ar.trim() || null, is_required: v.is_required, min_select: min, max_select: max, sort_order: Number(v.sort_order) || 0 }).eq("id", g.id);
    if (error) onError(error.message);
    onChanged();
  }
  async function del() {
    const { error } = await supabase.from("option_groups").delete().eq("id", g.id);
    if (error) onError(error.message);
    onChanged();
  }
  async function addOption() {
    const { error } = await supabase.from("options").insert({ group_id: g.id, name_en: "New option", price_delta: 0, sort_order: g.options.length + 1 });
    if (error) onError(error.message);
    onChanged();
  }

  return (
    <div className="flex flex-col gap-3 rounded border-2 border-line p-3">
      <fieldset disabled={!isOwner} className="grid gap-3 md:grid-cols-3">
        <Field label="Group name (English)" htmlFor={`gn-${g.id}`}><input id={`gn-${g.id}`} className={inputCls} value={v.name_en} onChange={(e) => setV({ ...v, name_en: e.target.value })} /></Field>
        <Field label="Group name (Arabic)" htmlFor={`ga-${g.id}`}><input id={`ga-${g.id}`} dir="rtl" className={inputCls} value={v.name_ar} onChange={(e) => setV({ ...v, name_ar: e.target.value })} /></Field>
        <Field label="Order" htmlFor={`go-${g.id}`}><input id={`go-${g.id}`} inputMode="numeric" className={inputCls} value={v.sort_order} onChange={(e) => setV({ ...v, sort_order: e.target.value })} /></Field>
        <label className="flex min-h-11 items-center gap-2 font-bold"><input type="checkbox" className="size-6 accent-orange" checked={v.is_required} onChange={(e) => setV({ ...v, is_required: e.target.checked, min_select: e.target.checked && Number(v.min_select) < 1 ? "1" : v.min_select })} />Required</label>
        <Field label="Choose at least" htmlFor={`gmin-${g.id}`}><input id={`gmin-${g.id}`} inputMode="numeric" className={inputCls} value={v.min_select} onChange={(e) => setV({ ...v, min_select: e.target.value })} /></Field>
        <Field label="Choose at most" htmlFor={`gmax-${g.id}`}><input id={`gmax-${g.id}`} inputMode="numeric" className={inputCls} value={v.max_select} onChange={(e) => setV({ ...v, max_select: e.target.value })} /></Field>
      </fieldset>
      <div className="flex flex-col gap-2">
        {g.options.map((o) => <OptionRow key={o.id} o={o} isOwner={isOwner} onError={onError} onChanged={onChanged} />)}
      </div>
      {isOwner && (
        <div className="flex flex-wrap gap-2">
          <button onClick={save} className={btnPrimary}>Save group</button>
          <button onClick={addOption} className={btnPlain}>Add option</button>
          <button onClick={del} className={`${btnPlain} text-danger`}>Delete group</button>
        </div>
      )}
    </div>
  );
}

function OptionRow({ o, isOwner, onError, onChanged }: { o: Opt; isOwner: boolean; onError: (m: string | null) => void; onChanged: () => void }) {
  const [v, setV] = useState({ name_en: o.name_en, name_ar: o.name_ar ?? "", price_delta: String(o.price_delta), is_available: o.is_available });
  async function save() {
    onError(null);
    const price = Number(v.price_delta);
    if (!v.name_en.trim() || !Number.isFinite(price)) return onError("Enter an option name and a price change (0 for none).");
    const { error } = await supabase.from("options").update({ name_en: v.name_en.trim(), name_ar: v.name_ar.trim() || null, price_delta: Math.round(price * 100) / 100, is_available: v.is_available }).eq("id", o.id);
    if (error) onError(error.message);
    onChanged();
  }
  async function del() {
    const { error } = await supabase.from("options").delete().eq("id", o.id);
    if (error) onError(error.message);
    onChanged();
  }
  return (
    <fieldset disabled={!isOwner} className="flex flex-wrap items-center gap-2">
      <input aria-label="Option name (English)" className={`${inputCls} max-w-48`} value={v.name_en} onChange={(e) => setV({ ...v, name_en: e.target.value })} />
      <input aria-label="Option name (Arabic)" dir="rtl" className={`${inputCls} max-w-48`} value={v.name_ar} onChange={(e) => setV({ ...v, name_ar: e.target.value })} />
      <input aria-label="Price change in EGP" inputMode="decimal" className={`${inputCls} w-24`} value={v.price_delta} onChange={(e) => setV({ ...v, price_delta: e.target.value })} />
      <label className="flex min-h-11 items-center gap-2"><input type="checkbox" className="size-5 accent-orange" checked={v.is_available} onChange={(e) => setV({ ...v, is_available: e.target.checked })} />Available</label>
      {isOwner && (
        <>
          <button onClick={save} className={btnPlain}>Save</button>
          <button onClick={del} className="font-bold text-danger underline">Delete</button>
        </>
      )}
    </fieldset>
  );
}

function BranchSettings({ productId, basePrice, branches, settings, canEdit, onError, onChanged }: { productId: string; basePrice: number; branches: Branch[]; settings: Setting[]; canEdit: boolean; onError: (m: string | null) => void; onChanged: () => void }) {
  return (
    <Panel title="Branch availability and price">
      <p className="text-sm text-muted">Turn the product off at a branch that has run out, or set a different price there. Leave the price empty to use the base price ({basePrice} EGP).</p>
      {branches.map((b) => <BranchRow key={b.id} canEdit={canEdit} productId={productId} branch={b} setting={settings.find((s) => s.branch_id === b.id)} onError={onError} onChanged={onChanged} />)}
    </Panel>
  );
}

function BranchRow({ productId, branch, setting, canEdit, onError, onChanged }: { canEdit: boolean; productId: string; branch: Branch; setting?: Setting; onError: (m: string | null) => void; onChanged: () => void }) {
  const [avail, setAvail] = useState(setting?.is_available ?? true);
  const [price, setPrice] = useState(setting?.price_override?.toString() ?? "");
  async function save() {
    onError(null);
    const n = price.trim() === "" ? null : Number(price);
    if (n !== null && !(n >= 0)) return onError("Enter a price of 0 or more, or leave it empty.");
    const { error } = await supabase.from("branch_product_settings").upsert({ branch_id: branch.id, product_id: productId, is_available: avail, price_override: n }, { onConflict: "branch_id,product_id" });
    if (error) onError(error.message);
    onChanged();
  }
  return (
    <fieldset disabled={!canEdit} className="flex flex-wrap items-center gap-3">
      <span className="w-48 font-bold">{branch.name_en}</span>
      <label className="flex min-h-11 items-center gap-2"><input type="checkbox" className="size-5 accent-orange" checked={avail} onChange={(e) => setAvail(e.target.checked)} />Available here</label>
      <input aria-label={`${branch.name_en} price override`} placeholder="Base price" inputMode="decimal" className={`${inputCls} w-32`} value={price} onChange={(e) => setPrice(e.target.value)} />
      {canEdit && <button onClick={save} className={btnPlain}>Save</button>}
    </fieldset>
  );
}
