import Link from "next/link";
import { cadSections } from "../_data/cad";
import { MetricCard, Panel, StatusBadge } from "@/components/cad-ui";

export default function CadDashboardPage() {
  const readyCount = cadSections.filter((section) => section.status === "Ready").length;
  const workflowCount = cadSections.filter((section) => section.status === "Workflow Preview").length;
  const plannedCount = cadSections.filter((section) => section.status === "Under Construction").length;

  return (
    <div className="space-y-5">
      <Panel title="Operations Overview" eyebrow="CAD Dashboard">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <h1 className="text-4xl font-semibold text-white">Operations Overview</h1>
            <p className="mt-3 max-w-3xl leading-7 text-neutral-300">
              Launch live CAD modules, review record workflows, and open
              professional UI-first drafting surfaces for modules that are not
              persisted to Supabase yet.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
            <MetricCard label="Live" value={String(readyCount)} />
            <MetricCard label="Preview" value={String(workflowCount)} />
            <MetricCard label="Planned" value={String(plannedCount)} />
            <MetricCard label="Modules" value={String(cadSections.length)} />
          </div>
        </div>
      </Panel>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cadSections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="group rounded-lg border border-white/10 bg-[#101419] p-5 shadow-xl shadow-black/10 transition hover:border-sky-300/40 hover:bg-white/[0.06]"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="grid size-11 place-items-center rounded-md bg-sky-400/10 text-sm font-bold text-sky-200">
                {section.title.slice(0, 2).toUpperCase()}
              </div>
              <StatusBadge>{section.status}</StatusBadge>
            </div>
            <h2 className="mt-5 text-xl font-semibold text-white">{section.title}</h2>
            <p className="mt-3 text-sm leading-6 text-neutral-400">{section.description}</p>
            <p className="mt-5 text-sm font-medium text-sky-300 group-hover:text-sky-200">
              Open section
            </p>
          </Link>
        ))}
      </section>
    </div>
  );
}
