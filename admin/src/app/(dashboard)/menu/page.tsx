"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { btnPlain, btnPrimary, ErrorLine, inputCls, Panel } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { money } from "@/lib/orders";
import { supabase } from "@/lib/supabase";

type Product = {
  id: string;
  name_en: string;
  base_price: number;
  is_available: boolean;
  is_published: boolean;
  is_archived: boolean;
  is_demo: boolean;
  image_paths: string[];
  categories: { name_en: string } | null;
};
type Category = { id: string; name_en: string; name_ar: string | null; sort_order: number; is_active: boolean };

export default function MenuPage() {
  const { profile } = useAuth();
  const isOwner = profile?.role === "owner";
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [p, c] = await Promise.all([
      supabase.from("products").select("id,name_en,base_price,is_available,is_published,is_archived,is_demo,image_paths,categories(name_en)").order("name_en"),
      supabase.from("categories").select("id,name_en,name_ar,sort_order,is_active").order("sort_order"),
    ]);
    if (p.error) setError(p.error.message);
    else {
      setError(null);
      setProducts(p.data as unknown as Product[]);
    }
    setCategories((c.data as Category[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function patch(id: string, change: Partial<Product>) {
    setError(null);
    const { error } = await supabase.from("products").update(change).eq("id", id);
    if (error) setError(error.message);
    await load();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-3xl">Menu</h1>
          <p className="text-muted">{isOwner ? "Mark items unavailable when they run out. Open a product to edit photos, options and branch settings." : "Open a product to set availability and price for your branch."}</p>
        </div>
        {isOwner && <Link href="/menu/new" className={`${btnPrimary} inline-flex items-center`}>New product</Link>}
      </div>
      <ErrorLine message={error} />
      {loading && <p className="text-muted">Loading...</p>}
      <div className="overflow-x-auto rounded border-2 border-ink bg-paper">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-ink text-cream">
            <tr>
              <th className="p-3">Product</th>
              <th className="p-3">Category</th>
              <th className="p-3">Base price</th>
              <th className="p-3">Available</th>
              <th className="p-3">Status</th>
              <th className="p-3"><span className="sr-only">Edit</span></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-line">
                <td className="p-3 font-bold">
                  {p.name_en}
                  {p.is_demo && <span className="ml-2 rounded bg-sun px-1 text-xs">demo</span>}
                  {p.image_paths.length === 0 && <span className="ml-2 rounded bg-line px-1 text-xs">no photo</span>}
                </td>
                <td className="p-3">{p.categories?.name_en}</td>
                <td className="p-3">{money(p.base_price)}</td>
                <td className="p-3">
                  <input type="checkbox" aria-label={`${p.name_en} available`} checked={p.is_available} disabled={!isOwner} onChange={(e) => patch(p.id, { is_available: e.target.checked })} className="size-6 accent-orange" />
                </td>
                <td className="p-3">{p.is_archived ? "Archived" : p.is_published ? "Published" : "Draft"}</td>
                <td className="p-3"><Link href={`/menu/${p.id}`} className="font-bold underline">Edit</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">Archived products disappear from the app but stay on past orders. Price changes do not affect orders already placed.</p>
      <Categories categories={categories} canEdit={isOwner} onChanged={load} />
    </div>
  );
}

function Categories({ categories, canEdit, onChanged }: { categories: Category[]; canEdit: boolean; onChanged: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  async function add() {
    if (!name.trim()) return;
    const { error } = await supabase.from("categories").insert({ name_en: name.trim(), sort_order: categories.length + 1 });
    if (error) return setError(error.message);
    setName("");
    onChanged();
  }
  return (
    <Panel title="Categories">
      <ErrorLine message={error} />
      <div className="flex flex-col gap-2">
        {categories.map((c) => <CategoryRow key={c.id} c={c} canEdit={canEdit} onSaved={onChanged} onError={setError} />)}
      </div>
      {canEdit && (
        <div className="flex flex-wrap gap-2">
          <input aria-label="New category name" placeholder="New category" value={name} onChange={(e) => setName(e.target.value)} className={`${inputCls} max-w-xs`} />
          <button onClick={add} className={btnPlain}>Add category</button>
        </div>
      )}
    </Panel>
  );
}

function CategoryRow({ c, canEdit, onSaved, onError }: { c: Category; canEdit: boolean; onSaved: () => void; onError: (m: string | null) => void }) {
  const [v, setV] = useState(c);
  const dirty = JSON.stringify(v) !== JSON.stringify(c);
  async function save() {
    onError(null);
    const { error } = await supabase.from("categories").update({ name_en: v.name_en, name_ar: v.name_ar || null, sort_order: Number(v.sort_order), is_active: v.is_active }).eq("id", c.id);
    if (error) return onError(error.message);
    onSaved();
  }
  return (
    <fieldset disabled={!canEdit} className="flex flex-wrap items-center gap-2">
      <input aria-label="Name (English)" className={`${inputCls} max-w-52`} value={v.name_en} onChange={(e) => setV({ ...v, name_en: e.target.value })} />
      <input aria-label="Name (Arabic)" dir="rtl" className={`${inputCls} max-w-52`} value={v.name_ar ?? ""} onChange={(e) => setV({ ...v, name_ar: e.target.value })} />
      <input aria-label="Sort order" inputMode="numeric" className={`${inputCls} w-20`} value={v.sort_order} onChange={(e) => setV({ ...v, sort_order: e.target.value as unknown as number })} />
      <label className="flex min-h-11 items-center gap-2 font-bold"><input type="checkbox" className="size-5 accent-orange" checked={v.is_active} onChange={(e) => setV({ ...v, is_active: e.target.checked })} />Shown</label>
      {canEdit && <button disabled={!dirty} onClick={save} className={btnPlain}>Save</button>}
    </fieldset>
  );
}
