import type { Bolo, BoloType, Priority } from "./types";
import { Panel, StatusPill } from "./Panel";

const boloTypes: BoloType[] = ["Person", "Vehicle", "Weapon", "Officer safety", "Missing person", "Stolen vehicle"];
const priorities: Priority[] = ["Low", "Medium", "High", "Critical"];

export function BoloPanel({
  bolos,
  onAddBolo,
  onPlaceholder,
}: {
  bolos: Bolo[];
  onAddBolo: (bolo: Pick<Bolo, "description" | "lastKnownLocation" | "priority" | "title" | "type">) => void;
  onPlaceholder: (label: string, related?: string) => void;
}) {
  return (
    <Panel title="BOLO Board" eyebrow="Officer Safety">
      <AddBoloForm onAddBolo={onAddBolo} />
      <div className="mt-4 space-y-2">
        {bolos.map((bolo) => (
          <article key={bolo.id} className="rounded-md border border-white/10 bg-neutral-950 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold text-white">{bolo.title}</h3>
              <StatusPill tone={bolo.priority === "Critical" ? "rose" : bolo.priority === "High" ? "amber" : "sky"}>
                {bolo.priority}
              </StatusPill>
            </div>
            <p className="mt-2 text-sm leading-6 text-neutral-300">{bolo.description}</p>
            <div className="mt-3 grid gap-2 text-xs text-neutral-400 sm:grid-cols-2">
              <span>{bolo.type}</span>
              <span>{bolo.status}</span>
              <span>{bolo.lastKnownLocation}</span>
              <span>{bolo.associated}</span>
              <span>{bolo.createdBy}</span>
              <span>{bolo.createdAt}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onPlaceholder("View BOLO", bolo.title)}
                className="rounded-md border border-white/10 px-3 py-2 text-xs text-neutral-200 hover:bg-white/10"
              >
                View
              </button>
              <button
                type="button"
                onClick={() => onPlaceholder("Mark BOLO resolved", bolo.title)}
                className="rounded-md border border-white/10 px-3 py-2 text-xs text-neutral-200 hover:bg-white/10"
              >
                Mark Resolved
              </button>
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}

function AddBoloForm({
  onAddBolo,
}: {
  onAddBolo: (bolo: Pick<Bolo, "description" | "lastKnownLocation" | "priority" | "title" | "type">) => void;
}) {
  return (
    <form
      className="rounded-md border border-white/10 bg-white/[0.03] p-3"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        onAddBolo({
          description: String(form.get("description") ?? ""),
          lastKnownLocation: String(form.get("location") ?? ""),
          priority: String(form.get("priority") ?? "Medium") as Priority,
          title: String(form.get("title") ?? ""),
          type: String(form.get("type") ?? "Person") as BoloType,
        });
        event.currentTarget.reset();
      }}
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <input name="title" required className="h-9 rounded-md border border-white/10 bg-neutral-950 px-2 text-sm text-white" placeholder="BOLO title" />
        <select name="type" className="h-9 rounded-md border border-white/10 bg-neutral-950 px-2 text-sm text-white">
          {boloTypes.map((type) => (
            <option key={type}>{type}</option>
          ))}
        </select>
        <input name="location" required className="h-9 rounded-md border border-white/10 bg-neutral-950 px-2 text-sm text-white" placeholder="Last known location" />
        <select name="priority" className="h-9 rounded-md border border-white/10 bg-neutral-950 px-2 text-sm text-white">
          {priorities.map((priority) => (
            <option key={priority}>{priority}</option>
          ))}
        </select>
      </div>
      <textarea
        name="description"
        required
        className="mt-2 min-h-16 w-full rounded-md border border-white/10 bg-neutral-950 px-2 py-2 text-sm text-white"
        placeholder="Description, associated person/vehicle, officer safety notes"
      />
      <button type="submit" className="mt-2 min-h-9 rounded-md bg-sky-400 px-3 text-xs font-semibold text-neutral-950 hover:bg-sky-300">
        Add BOLO
      </button>
    </form>
  );
}
