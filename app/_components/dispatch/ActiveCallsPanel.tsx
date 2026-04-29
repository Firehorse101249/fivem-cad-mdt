import type { CallStatus, DispatchCall } from "./types";
import { Panel, StatusPill } from "./Panel";

const statusOrder: CallStatus[] = ["Pending", "Assigned", "Enroute", "On Scene", "Holding", "Closed"];

function priorityTone(priority: DispatchCall["priority"]) {
  if (priority === "Critical") return "rose";
  if (priority === "High") return "amber";
  if (priority === "Medium") return "sky";
  return "neutral";
}

export function ActiveCallsPanel({
  calls,
  onPlaceholder,
  onStatusChange,
}: {
  calls: DispatchCall[];
  onPlaceholder: (label: string, related?: string) => void;
  onStatusChange: (callId: string, status: CallStatus) => void;
}) {
  return (
    <Panel title="Active Calls" eyebrow="Incident Queue" className="xl:col-span-2">
      <div className="space-y-3">
        {calls.map((call) => (
          <article key={call.id} className="rounded-md border border-white/10 bg-neutral-950 p-3">
            <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-start 2xl:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-white">{call.callNumber}</span>
                  <StatusPill tone={priorityTone(call.priority)}>{call.priority}</StatusPill>
                  <StatusPill tone="neutral">{call.status}</StatusPill>
                  <StatusPill tone="sky">{call.serviceType}</StatusPill>
                </div>
                <h3 className="mt-3 text-base font-semibold text-white">{call.type}</h3>
                <p className="mt-1 text-sm text-neutral-400">
                  {call.location} • Postal {call.postal} • Opened {call.openedAt}
                </p>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-neutral-300">{call.description}</p>
              </div>
              <div className="shrink-0 text-left 2xl:text-right">
                <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">Assigned</p>
                <p className="mt-1 text-sm font-medium text-neutral-200">
                  {call.assignedUnits.length ? call.assignedUnits.join(", ") : "Unassigned"}
                </p>
                <p className="mt-2 text-xs text-neutral-500">{call.notesCount} notes</p>
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-2 border-t border-white/10 pt-3 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={() => onPlaceholder("Assign unit", call.callNumber)}
                className="rounded-md border border-white/10 px-3 py-2 text-xs font-medium text-neutral-200 hover:bg-white/10"
              >
                Assign Unit
              </button>
              <button
                type="button"
                onClick={() => onPlaceholder("Add call note", call.callNumber)}
                className="rounded-md border border-white/10 px-3 py-2 text-xs font-medium text-neutral-200 hover:bg-white/10"
              >
                Add Note
              </button>
              <select
                value={call.status}
                onChange={(event) => onStatusChange(call.id, event.target.value as CallStatus)}
                className="rounded-md border border-white/10 bg-neutral-900 px-3 py-2 text-xs font-medium text-neutral-200"
              >
                {statusOrder.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => onStatusChange(call.id, "Closed")}
                className="rounded-md border border-rose-300/25 px-3 py-2 text-xs font-medium text-rose-100 hover:bg-rose-300/10"
              >
                Close Call
              </button>
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}
