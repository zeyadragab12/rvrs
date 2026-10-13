"use client";

import { useCallback, useEffect, useState } from "react";
import { btnPlain, btnPrimary, ErrorLine, Field, inputCls, Panel } from "@/components/ui";
import { ROLE_LABEL, useAuth, type Role } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type Staff = { id: string; email: string; full_name: string | null; role: Role; is_active: boolean; branch_ids: string[] };
type Branch = { id: string; name_en: string };
const ROLES: Role[] = ["owner", "branch_manager", "cashier", "kitchen"];

export default function StaffPage() {
  const { profile } = useAuth();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("cashier");
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [s, b] = await Promise.all([supabase.rpc("list_staff"), supabase.from("branches").select("id,name_en").order("name_en")]);
    if (s.error) setError(s.error.message);
    setStaff((s.data as Staff[]) ?? []);
    setBranches((b.data as Branch[]) ?? []);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (profile?.role === "owner") load();
  }, [load, profile]);

  if (profile && profile.role !== "owner") return <p className="text-muted">Only the owner can manage staff.</p>;

  async function apply(targetEmail: string, targetRole: Role, branchIds: string[]) {
    setError(null);
    setDone(null);
    const { error } = await supabase.rpc("set_staff_role", { p_email: targetEmail, p_role: targetRole, p_branch_ids: branchIds });
    if (error) return setError(error.message);
    setDone(`Updated ${targetEmail}.`);
    setEmail("");
    setPicked([]);
    load();
  }

  const needsBranch = role !== "owner";
  const branchName = (id: string) => branches.find((b) => b.id === id)?.name_en ?? "Unknown";

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-3xl">Staff</h1>
        <p className="text-muted">Staff must first create an account in the customer app. Then enter their email here to give them a role. Role changes are recorded in the audit log.</p>
      </div>
      <ErrorLine message={error} />
      {done && <p role="status" className="font-bold text-ok">{done}</p>}

      <Panel title="Give someone a role">
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Account email" htmlFor="se"><input id="se" type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label="Role" htmlFor="sr">
            <select id="sr" className={inputCls} value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
          </Field>
          {needsBranch && (
            <fieldset>
              <legend className="text-sm font-bold text-muted">Branches</legend>
              {branches.map((b) => (
                <label key={b.id} className="flex min-h-10 items-center gap-2">
                  <input type="checkbox" className="size-5 accent-orange" checked={picked.includes(b.id)} onChange={() => setPicked(picked.includes(b.id) ? picked.filter((x) => x !== b.id) : [...picked, b.id])} />
                  {b.name_en}
                </label>
              ))}
            </fieldset>
          )}
        </div>
        <button disabled={!email.trim()} onClick={() => apply(email, role, needsBranch ? picked : [])} className={`${btnPrimary} w-fit`}>Save role</button>
      </Panel>

      <div className="overflow-x-auto rounded border-2 border-ink bg-paper">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-ink text-cream"><tr><th className="p-3">Person</th><th className="p-3">Role</th><th className="p-3">Branches</th><th className="p-3"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id} className="border-t border-line">
                <td className="p-3"><b>{s.full_name ?? s.email}</b><br /><span className="text-muted">{s.email}</span></td>
                <td className="p-3">{ROLE_LABEL[s.role]}</td>
                <td className="p-3">{s.role === "owner" ? "All" : s.branch_ids.map(branchName).join(", ")}</td>
                <td className="p-3">
                  {s.id !== profile?.id && <button className={`${btnPlain} text-danger`} onClick={() => apply(s.email, "customer", [])}>Remove access</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
