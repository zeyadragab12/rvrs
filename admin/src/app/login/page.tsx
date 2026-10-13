"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const { session, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && session) router.replace("/");
  }, [loading, session, router]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setError(error.message);
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-6">
      <div>
        <p className="font-display text-5xl text-orange">RVRS</p>
        <h1 className="mt-2 text-xl font-bold">Staff sign in</h1>
        <p className="text-muted">For owners, managers, cashiers and kitchen staff.</p>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-4 rounded border-2 border-ink bg-paper p-5">
        <label className="flex flex-col gap-1 text-sm font-bold text-muted" htmlFor="email">
          Email
          <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="min-h-12 rounded border-2 border-ink px-3 text-base font-normal text-ink" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-bold text-muted" htmlFor="password">
          Password
          <input id="password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="min-h-12 rounded border-2 border-ink px-3 text-base font-normal text-ink" />
        </label>
        {error && (
          <p role="alert" className="text-sm font-bold text-danger">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className="min-h-12 rounded border-2 border-ink bg-orange px-4 font-bold text-ink disabled:opacity-60">
          {busy ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
