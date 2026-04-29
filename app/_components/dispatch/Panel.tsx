export function Panel({
  actions,
  children,
  className = "",
  eyebrow,
  title,
}: {
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  eyebrow?: string;
  title: string;
}) {
  return (
    <section className={`rounded-lg border border-white/10 bg-neutral-900 ${className}`}>
      <div className="flex items-start justify-between gap-4 border-b border-white/10 px-4 py-3">
        <div>
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="mt-1 text-base font-semibold text-white">{title}</h2>
        </div>
        {actions}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function StatusPill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "amber" | "emerald" | "neutral" | "rose" | "sky";
}) {
  const tones = {
    amber: "border-amber-300/30 bg-amber-300/10 text-amber-100",
    emerald: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
    neutral: "border-white/15 bg-white/[0.06] text-neutral-200",
    rose: "border-rose-300/30 bg-rose-300/10 text-rose-100",
    sky: "border-sky-300/30 bg-sky-300/10 text-sky-100",
  };

  return (
    <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function UnderConstructionInline({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-dashed border-amber-300/25 bg-amber-300/[0.06] px-3 py-2 text-xs text-amber-100">
      {label} — Under Construction
    </div>
  );
}
