import type { ReactNode } from "react";

export const inputCls = "min-h-11 w-full rounded border-2 border-ink bg-paper px-3 text-base text-ink";
export const btnCls = "min-h-11 rounded border-2 border-ink px-4 font-bold disabled:opacity-50";
export const btnPrimary = `${btnCls} bg-orange text-ink`;
export const btnPlain = `${btnCls} bg-paper text-ink`;

export function Field({ label, htmlFor, children, hint }: { label: string; htmlFor: string; children: ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-sm font-bold text-muted">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function ErrorLine({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm font-bold text-danger">
      {message}
    </p>
  );
}

export function Panel({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded border-2 border-ink bg-paper p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}
