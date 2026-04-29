import type { AgencyType, DispatchUnit } from "./types";
import { fireUnitTypes, emsUnitTypes, towUnitTypes } from "./mockData";
import { Panel, StatusPill } from "./Panel";

type UnitFilter = "All" | "Available" | "Busy" | "EMS" | "Emergency" | "Fire" | "Law" | "Tow";

const filters: UnitFilter[] = ["All", "Law", "Fire", "EMS", "Tow", "Available", "Busy", "Emergency"];

function unitMatchesFilter(unit: DispatchUnit, filter: UnitFilter) {
  if (filter === "All") return true;
  if (filter === "Law") return unit.type === "Law Enforcement";
  if (filter === "Emergency") return unit.status === "Panic" || unit.status === "Signal 100";
  if (filter === "Available") return unit.status === "Available";
  if (filter === "Busy") return unit.status !== "Available" && unit.status !== "Out of Service";
  return unit.type === filter;
}

function statusTone(status: DispatchUnit["status"]) {
  if (status === "Panic" || status === "Signal 100") return "rose";
  if (status === "Available" || status === "Complete") return "emerald";
  if (status === "Enroute" || status === "On Scene" || status === "Transporting") return "sky";
  if (status === "Out of Service") return "neutral";
  return "amber";
}

export function UnitStatusPanel({
  filter,
  onFilterChange,
  units,
}: {
  filter: UnitFilter;
  onFilterChange: (filter: UnitFilter) => void;
  units: DispatchUnit[];
}) {
  const filteredUnits = units.filter((unit) => unitMatchesFilter(unit, filter));

  return (
    <Panel
      title="Unit Status"
      eyebrow="Resource Tracking"
      actions={<StatusPill tone="neutral">{filteredUnits.length} shown</StatusPill>}
    >
      <div className="mb-3 flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onFilterChange(item)}
            className={`rounded-md border px-2 py-1 text-xs font-medium ${
              filter === item
                ? "border-sky-300/40 bg-sky-300/10 text-sky-100"
                : "border-white/10 text-neutral-400 hover:bg-white/10 hover:text-neutral-200"
            }`}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
        {filteredUnits.map((unit) => (
          <article key={unit.id} className="rounded-md border border-white/10 bg-neutral-950 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-mono text-sm font-semibold text-white">{unit.callsign}</h3>
                <p className="mt-1 text-sm text-neutral-300">{unit.memberName}</p>
              </div>
              <StatusPill tone={statusTone(unit.status)}>{unit.status}</StatusPill>
            </div>
            <div className="mt-3 grid gap-2 text-xs text-neutral-400 sm:grid-cols-2">
              <span>{unit.agency} • {unit.type}</span>
              <span>{unit.specialty}</span>
              <span>{unit.currentCall}</span>
              <span>{unit.location}</span>
              <span>Updated {unit.lastUpdate}</span>
            </div>
          </article>
        ))}
      </div>
      <div className="mt-4 grid gap-3 text-xs text-neutral-400 sm:grid-cols-3">
        <CapabilityList title="Fire" items={fireUnitTypes} />
        <CapabilityList title="EMS" items={emsUnitTypes} />
        <CapabilityList title="Tow" items={towUnitTypes} />
      </div>
    </Panel>
  );
}

function CapabilityList({ items, title }: { items: string[]; title: AgencyType | string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">{title}</p>
      <div className="flex flex-wrap gap-1">
        {items.map((item) => (
          <span key={item} className="rounded border border-white/10 px-1.5 py-0.5">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export type { UnitFilter };
