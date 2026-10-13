import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "./session";
import { supabase } from "./supabase";

export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: string;
  notification_prefs: { order_updates: boolean; promotions: boolean };
};
export type SavedAddress = {
  id: string;
  label: string | null;
  address_line: string;
  notes: string | null;
  lat: number | null;
  lng: number | null;
};
export type MyOrder = { id: string; order_number: string; status: string; total: number; created_at: string };

export function useProfile() {
  const { user } = useSession();
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,full_name,phone,role,notification_prefs")
        .eq("id", user!.id)
        .single();
      if (error) throw new Error(error.message);
      return data as Profile;
    },
  });
}

export function useUpdateProfile() {
  const { user } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Pick<Profile, "full_name" | "phone" | "notification_prefs">>) => {
      const { error } = await supabase.from("profiles").update(patch).eq("id", user!.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile", user?.id] }),
  });
}

export function useAddresses() {
  const { user } = useSession();
  return useQuery({
    queryKey: ["addresses", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("addresses")
        .select("id,label,address_line,notes,lat,lng")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data as SavedAddress[];
    },
  });
}

export function useAddAddress() {
  const { user } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: Omit<SavedAddress, "id">) => {
      const { error } = await supabase.from("addresses").insert({ ...a, user_id: user!.id });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["addresses", user?.id] }),
  });
}

export function useDeleteAddress() {
  const { user } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("addresses").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["addresses", user?.id] }),
  });
}

export function useMyOrders() {
  const { user } = useSession();
  return useQuery({
    queryKey: ["my-orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id,order_number,status,total,created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw new Error(error.message);
      return data as MyOrder[];
    },
  });
}

export type PastOrderItem = {
  product_id: string | null;
  product_name: string;
  quantity: number;
  notes: string | null;
  options: { id: string; group: string; name: string; price_delta: number }[];
};

/** Items of the customer's most recent order that was not cancelled or rejected. */
export function useLastOrderItems() {
  const { user } = useSession();
  return useQuery({
    queryKey: ["last-order", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id,order_number,order_items(product_id,product_name,quantity,notes,options)")
        .eq("user_id", user!.id)
        .not("status", "in", "(cancelled,rejected)")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data as { id: string; order_number: string; order_items: PastOrderItem[] } | null;
    },
  });
}

export function useRequestDeletion() {
  const { user } = useSession();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("deletion_requests").insert({ user_id: user!.id, email: user!.email });
      // A second pending request hits the unique index. Treat it as already requested.
      if (error && error.code !== "23505") throw new Error(error.message);
    },
  });
}
