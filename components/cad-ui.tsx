"use client";

import type { FormEventHandler, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export type StatusTone = "amber" | "blue" | "emerald" | "neutral" | "red" | "violet";

function toneForStatus(value: string): StatusTone {
  const status = value.toLowerCase();
  if (/(panic|critical|urgent|wanted|revoked|suspended|restricted|warrant|overdue)/.test(status)) return "red";
  if (/(pending|holding|review|draft|expired|warning)/.test(status)) return "amber";
  if (/(assigned|enroute|on scene|active|open|submitted)/.test(status)) return "blue";
  if (/(available|valid|complete|closed|cleared|approved|resolved)/.test(status)) return "emerald";
  if (/(admin|civilian|report|citation|arrest)/.test(status)) return "violet";
  return "neutral";
}

const toneClasses: Record<StatusTone, string> = {
  amber: "border-amber-300/35 bg-amber-300/10 text-amber-100",
  blue: "border-sky-300/35 bg-sky-300/10 text-sky-100",
  emerald: "border-emerald-300/35 bg-emerald-300/10 text-emerald-100",
  neutral: "border-white/15 bg-white/[0.06] text-neutral-200",
  red: "border-rose-300/45 bg-rose-400/15 text-rose-100",
  violet: "border-violet-300/35 bg-violet-300/10 text-violet-100",
};

export function StatusBadge({ children, tone }: { children: ReactNode; tone?: StatusTone }) {
  const label = typeof children === "string" ? children : "";
  return (
    <span className={cx("inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold", toneClasses[tone ?? toneForStatus(label)])}>
      {children}
    </span>
  );
}

export function Button({
  children,
  className = "",
  intent = "secondary",
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { intent?: "danger" | "primary" | "secondary" | "success" }) {
  const styles = {
    danger: "border-rose-300/35 bg-rose-500/20 text-rose-50 hover:bg-rose-500/30",
    primary: "border-sky-300/30 bg-sky-400 text-neutral-950 hover:bg-sky-300",
    secondary: "border-white/15 bg-white/[0.06] text-neutral-100 hover:bg-white/[0.1]",
    success: "border-emerald-300/30 bg-emerald-300 text-neutral-950 hover:bg-emerald-200",
  };

  return (
    <button
      type={type}
      className={cx(
        "inline-flex min-h-10 items-center justify-center rounded-md border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-55",
        styles[intent],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Panel({
  actions,
  children,
  className = "",
  eyebrow,
  title,
}: {
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  eyebrow?: string;
  title: string;
}) {
  return (
    <section className={cx("overflow-hidden rounded-lg border border-white/10 bg-[#101419] shadow-xl shadow-black/20", className)}>
      <div className="flex flex-col gap-3 border-b border-white/10 bg-[#151a21] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {eyebrow ? <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-300">{eyebrow}</p> : null}
          <h2 className="text-base font-semibold text-white">{title}</h2>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-neutral-950/80 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

export function EmptyState({ action, text, title = "No records displayed" }: { action?: ReactNode; text: string; title?: string }) {
  return (
    <div className="rounded-md border border-dashed border-white/15 bg-neutral-950/70 px-4 py-8 text-center">
      <p className="font-semibold text-white">{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-neutral-400">{text}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Notice({ children, tone = "amber" }: { children: ReactNode; tone?: StatusTone }) {
  return (
    <div className={cx("rounded-md border px-3 py-2 text-sm", toneClasses[tone])}>
      {children}
    </div>
  );
}

export function Field({
  label,
  required,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
        {label}
        {required ? <span className="text-rose-300"> *</span> : null}
      </span>
      <input
        required={required}
        className="mt-2 h-11 w-full rounded-md border border-white/10 bg-neutral-950 px-3 text-sm text-white placeholder:text-neutral-600 focus:border-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
        {...props}
      />
    </label>
  );
}

export function SelectField({
  children,
  label,
  required,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
        {label}
        {required ? <span className="text-rose-300"> *</span> : null}
      </span>
      <select
        required={required}
        className="mt-2 h-11 w-full rounded-md border border-white/10 bg-neutral-950 px-3 text-sm text-white focus:border-sky-300"
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

export function TextareaField({
  label,
  required,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
        {label}
        {required ? <span className="text-rose-300"> *</span> : null}
      </span>
      <textarea
        required={required}
        className="mt-2 min-h-28 w-full rounded-md border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:border-sky-300"
        {...props}
      />
    </label>
  );
}

export function SearchInput({ label = "Search", ...props }: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <input
        type="search"
        className="h-11 w-full rounded-md border border-white/10 bg-neutral-950 px-3 text-sm text-white placeholder:text-neutral-600 focus:border-sky-300"
        {...props}
      />
    </label>
  );
}

export function DataTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: Array<{ id: string; cells: ReactNode[]; onClick?: () => void }>;
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-white/10">
      <table className="min-w-full divide-y divide-white/10 text-sm">
        <thead className="bg-neutral-950">
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10 bg-[#0b0f14]">
          {rows.map((row) => (
            <tr key={row.id} onClick={row.onClick} className={cx(row.onClick && "cursor-pointer hover:bg-white/[0.04]")}>
              {row.cells.map((cell, index) => (
                <td key={`${row.id}-${index}`} className="max-w-[360px] px-3 py-3 text-neutral-300">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Modal({
  children,
  onClose,
  open,
  title,
}: {
  children: ReactNode;
  onClose: () => void;
  open: boolean;
  title: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
      <div className="max-h-[88vh] w-full max-w-4xl overflow-hidden rounded-lg border border-white/10 bg-[#101419] shadow-2xl shadow-black">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-[#151a21] px-4 py-3">
          <h2 className="font-semibold text-white">{title}</h2>
          <Button onClick={onClose}>Close</Button>
        </div>
        <div className="max-h-[calc(88vh-64px)] overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

export function FormShell({
  children,
  onSubmit,
}: {
  children: ReactNode;
  onSubmit: FormEventHandler<HTMLFormElement>;
}) {
  return (
    <form onSubmit={onSubmit} className="grid gap-4 lg:grid-cols-2">
      {children}
    </form>
  );
}
