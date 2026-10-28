"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, type ReactNode } from "react";
import { ROLE_LABEL, isStaff, useAuth, type Role } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

const NAV: { href: string; label: string; roles?: Role[] }[] = [
  { href: "/", label: "Overview", roles: ["owner", "branch_manager", "cashier"] },
  { href: "/orders", label: "Orders", roles: ["owner", "branch_manager", "cashier"] },
  { href: "/kitchen", label: "Kitchen" },
  { href: "/menu", label: "Menu", roles: ["owner", "branch_manager", "cashier"] },
  { href: "/branches", label: "Branches", roles: ["owner", "branch_manager"] },
  { href: "/promotions", label: "Promotions", roles: ["owner"] },
  { href: "/reports", label: "Reports", roles: ["owner", "branch_manager"] },
  { href: "/staff", label: "Staff", roles: ["owner"] },
  { href: "/settings", label: "Settings", roles: ["owner"] },
  { href: "/audit", label: "Audit log", roles: ["owner"] },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Loading...</p>}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const { session, profile, loading } = useAuth();
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    if (!loading && !session) router.replace("/login");
  }, [loading, session, router]);

  // Kitchen staff land on the kitchen view, not the overview.
  useEffect(() => {
    if (profile?.role === "kitchen" && path !== "/kitchen") router.replace("/kitchen");
  }, [profile, path, router]);

  if (loading || !session) return <p className="p-6 text-muted">Loading...</p>;

  if (!isStaff(profile?.role)) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-6">
        <h1 className="font-display text-3xl">No access</h1>
        <p className="text-muted">This account is not set up as RVRS staff. Ask the owner to give you a role.</p>
        <button onClick={() => supabase.auth.signOut()} className="min-h-12 w-fit rounded border-2 border-ink bg-paper px-4 font-bold">
          Sign out
        </button>
      </main>
    );
  }

  const role = profile!.role;
  const links = NAV.filter((n) => !n.roles || n.roles.includes(role));

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="sticky top-0 z-10 flex flex-row items-center gap-2 overflow-x-auto bg-ink p-3 text-cream md:h-screen md:w-56 md:shrink-0 md:flex-col md:items-stretch md:gap-1 md:self-start md:overflow-y-auto md:p-4">
        <p className="font-display text-3xl text-orange md:mb-4">RVRS</p>
        <nav aria-label="Main" className="flex flex-1 flex-row gap-1 md:flex-col">
          {links.map((l) => {
            const on = l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link key={l.href} href={l.href} aria-current={on ? "page" : undefined} className={`min-h-11 rounded px-3 py-2 font-bold ${on ? "bg-orange text-ink" : "hover:bg-white/10"}`}>
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex flex-col gap-1 text-sm md:mt-auto">
          <span className="hidden text-cream/70 md:block">{profile?.full_name ?? session.user.email}</span>
          <span className="hidden text-cream/70 md:block">{ROLE_LABEL[role]}</span>
          <button onClick={() => supabase.auth.signOut()} className="min-h-11 rounded border border-cream/40 px-3 py-2 text-left font-bold hover:bg-white/10">
            Sign out
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}
