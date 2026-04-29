import type { DispatchCall, DispatchUnit } from "./types";
import { StatusPill } from "./Panel";

export function StatusBar({
  calls,
  units,
}: {
  calls: DispatchCall[];
  units: DispatchUnit[];
}) {
  const activeCalls = calls.filter((call) => call.status !== "Closed").length;
  const emergencies = units.filter((unit) => unit.status === "Panic" || unit.status === "Signal 100").length;
  const available = units.filter((unit) => unit.status === "Available").length;

  return (
    <div className="rounded-lg border border-white/10 bg-neutral-900 px-4 py-3">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
            Dispatch Console
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-white">Live CAD Operations</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusPill tone="sky">Channel 1 Primary</StatusPill>
          <StatusPill tone="emerald">{available} Available Units</StatusPill>
          <StatusPill tone="amber">{activeCalls} Active Calls</StatusPill>
          <StatusPill tone={emergencies > 0 ? "rose" : "neutral"}>
            {emergencies} Emergency Flags
          </StatusPill>
          <StatusPill tone="neutral">FiveM Sync: Under Construction</StatusPill>
        </div>
      </div>
    </div>
  );
}
