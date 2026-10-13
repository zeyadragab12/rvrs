"use client";

import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "./supabase";

export type Role = "customer" | "owner" | "branch_manager" | "cashier" | "kitchen";
export type StaffProfile = { id: string; full_name: string | null; role: Role };

type Ctx = { session: Session | null; profile: StaffProfile | null; loading: boolean };
const AuthContext = createContext<Ctx>({ session: null, profile: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s) {
        setProfile(null);
        setLoading(false);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) return;
    supabase
      .from("profiles")
      .select("id,full_name,role")
      .eq("id", userId)
      .single()
      .then(({ data }) => {
        setProfile((data as StaffProfile) ?? null);
        setLoading(false);
      });
  }, [userId]);

  return <AuthContext.Provider value={{ session, profile, loading }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

export const ROLE_LABEL: Record<Role, string> = {
  customer: "Customer",
  owner: "Owner",
  branch_manager: "Branch manager",
  cashier: "Cashier",
  kitchen: "Kitchen",
};
export const isStaff = (r?: Role) => !!r && r !== "customer";
