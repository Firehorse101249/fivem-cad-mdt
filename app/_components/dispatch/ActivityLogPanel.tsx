import type { ActivityLogEntry } from "./types";
import { Panel } from "./Panel";

export function ActivityLogPanel({ entries }: { entries: ActivityLogEntry[] }) {
  return (
    <Panel title="Notes / Activity Log" eyebrow="Chronology">
      <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
        {entries.map((entry) => (
          <div key={entry.id} className="rounded-md border border-white/10 bg-neutral-950 p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-xs text-sky-200">{entry.timestamp}</span>
              <span className="text-xs uppercase tracking-[0.14em] text-neutral-500">{entry.actor}</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-neutral-300">{entry.message}</p>
            {entry.related ? <p className="mt-1 text-xs text-neutral-500">Related: {entry.related}</p> : null}
          </div>
        ))}
      </div>
    </Panel>
  );
}
