import { Panel } from "./Panel";

const plannedFeatures = [
  "Real-time unit locations",
  "Active call locations",
  "Panic button pings",
  "Fire/EMS/tow tracking",
  "FiveM server integration",
];

export function LiveMapPanel() {
  return (
    <Panel title="Live Map Integration" eyebrow="Under Construction" className="xl:col-span-2">
      <div className="relative min-h-[340px] overflow-hidden rounded-md border border-dashed border-sky-300/25 bg-neutral-950">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(56,189,248,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.08)_1px,transparent_1px)] bg-[size:32px_32px]" />
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-300">
            Live Map Integration — Under Construction
          </p>
          <h3 className="mt-3 text-2xl font-semibold text-white">Future FiveM Map Layer</h3>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {plannedFeatures.map((feature) => (
              <span key={feature} className="rounded-md border border-white/10 bg-neutral-900/80 px-3 py-2 text-sm text-neutral-300">
                {feature}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}
