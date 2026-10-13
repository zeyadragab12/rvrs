import { useQuery } from "@tanstack/react-query";
import { useBranchSelection } from "./branch-selection";
import { openStatus, type Hours } from "./hours";
import { supabase } from "./supabase";

export type Category = { id: string; name_en: string; name_ar: string | null; sort_order: number };
export type Product = {
  id: string;
  category_id: string;
  name_en: string;
  name_ar: string | null;
  description_en: string | null;
  description_ar: string | null;
  image_paths: string[];
  base_price: number;
  is_available: boolean;
  is_demo: boolean;
};
export type Branch = {
  id: string;
  name_en: string;
  name_ar: string | null;
  address: string | null;
  phone: string | null;
  lat: number | null;
  lng: number | null;
  delivery_enabled: boolean;
  pickup_enabled: boolean;
  is_demo: boolean;
  opening_hours: Hours | null;
};

async function fetchMenu() {
  const [cats, prods] = await Promise.all([
    supabase.from("categories").select("id,name_en,name_ar,sort_order").order("sort_order"),
    supabase
      .from("products")
      .select("id,category_id,name_en,name_ar,description_en,description_ar,image_paths,base_price,is_available,is_demo")
      .order("sort_order"),
  ]);
  if (cats.error) throw new Error(cats.error.message);
  if (prods.error) throw new Error(prods.error.message);
  return organizeMenu(cats.data as Category[], prods.data as Product[]);
}

/** Display order for the categories we want to control; anything else keeps its DB sort_order after these. */
const CATEGORY_RANK: Record<string, number> = {
  burgers: 1,
  chicken: 2,
  sides: 3,
  salads: 4,
  dessert: 5,
  "rvrs summer specials": 6,
  "rvrs coffee": 7,
  dips: 1000,
  "extra food": 1001,
};

/** Categories shown as sections on the home screen, in this order (lowercase names). */
export const HOME_CATEGORIES = ["burgers", "rvrs coffee", "rvrs summer specials"];

/** Signature items for the home "Recommended" slider, in display order (lowercase product names). */
export const RECOMMENDED_PRODUCTS = ["truffle burger", "cloud matcha", "og burger", "salted caramel frappe", "brisk", "rvrs bites"];

function organizeMenu(categories: Category[], products: Product[]) {
  // Once real menu items exist, drop the demo seed products and any category that only held demo items.
  const hasReal = products.some((p) => !p.is_demo);
  const visibleProducts = hasReal ? products.filter((p) => !p.is_demo) : products;
  const used = new Set(visibleProducts.map((p) => p.category_id));
  const rank = (c: Category) => CATEGORY_RANK[c.name_en.trim().toLowerCase()] ?? 100 + c.sort_order;
  const visibleCategories = categories.filter((c) => used.has(c.id)).sort((a, b) => rank(a) - rank(b));
  const order = new Map(visibleCategories.map((c, i) => [c.id, i]));
  // Array.prototype.sort is stable, so products keep their own sort_order within a category.
  const sorted = [...visibleProducts].sort((a, b) => (order.get(a.category_id) ?? 0) - (order.get(b.category_id) ?? 0));
  return { categories: visibleCategories, products: sorted };
}

async function fetchBranches() {
  const { data, error } = await supabase.rpc("list_branches");
  if (error) throw new Error(error.message);
  return data as Branch[];
}

export type ProductOption = {
  id: string;
  name_en: string;
  name_ar: string | null;
  price_delta: number;
  is_available: boolean;
  sort_order: number;
};
export type OptionGroup = {
  id: string;
  name_en: string;
  name_ar: string | null;
  is_required: boolean;
  min_select: number;
  max_select: number;
  sort_order: number;
  options: ProductOption[];
};
export type ProductDetail = Product & { option_groups: OptionGroup[] };

async function fetchProduct(id: string): Promise<ProductDetail> {
  const { data, error } = await supabase
    .from("products")
    .select(
      "id,category_id,name_en,name_ar,description_en,description_ar,image_paths,base_price,is_available,is_demo,option_groups(id,name_en,name_ar,is_required,min_select,max_select,sort_order,options(id,name_en,name_ar,price_delta,is_available,sort_order))",
    )
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  const detail = data as unknown as ProductDetail;
  detail.option_groups = [...detail.option_groups]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((g) => ({ ...g, options: [...g.options].sort((a, b) => a.sort_order - b.sort_order) }));
  return detail;
}

export const useProduct = (id: string) => useQuery({ queryKey: ["product", id], queryFn: () => fetchProduct(id) });

export const useMenu =() => useQuery({ queryKey: ["menu"], queryFn: fetchMenu, staleTime: 60_000 });
export const useBranches = () => useQuery({ queryKey: ["branches"], queryFn: fetchBranches, staleTime: 5 * 60_000 });

/** The branch the customer picked, falling back to the first one until they choose. Also whether it is open right now. */
export function useBranchStatus() {
  const q = useBranches();
  const { selectedId } = useBranchSelection();
  const branch = q.data?.find((b) => b.id === selectedId) ?? q.data?.[0];
  return { ...q, branch, status: openStatus(branch?.opening_hours) };
}
