import Link from "next/link";
import { cadSections } from "../_data/cad";

export default function CadDashboardPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-white/10 bg-neutral-900 p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-300">
          CAD Dashboard
        </p>
        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <h1 className="text-4xl font-semibold text-white">Operations Overview</h1>
            <p className="mt-3 max-w-3xl leading-7 text-neutral-300">
              This is the main launch point for the FiveM CAD/MDT. Finished
              modules will open their workflows here; unfinished modules clearly
              route to Under Construction pages.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              ["0", "Active calls"],
              ["0", "Online units"],
              [String(cadSections.length), "Modules"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-md border border-white/10 bg-neutral-950 p-4">
                <div className="text-2xl font-semibold text-white">{value}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.16em] text-neutral-500">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cadSections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="group rounded-lg border border-white/10 bg-white/[0.04] p-5 transition hover:border-sky-300/40 hover:bg-white/[0.07]"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="grid size-11 place-items-center rounded-md bg-sky-400/10 text-sm font-bold text-sky-200">
                {section.title.slice(0, 2).toUpperCase()}
              </div>
              <span className="rounded-md border border-amber-300/25 px-2 py-1 text-xs font-medium text-amber-200">
                {section.status}
              </span>
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
