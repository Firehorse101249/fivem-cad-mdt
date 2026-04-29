import { Panel } from "./Panel";

const tones = [
  { label: "Fire tone", tone: "standard" },
  { label: "EMS tone", tone: "standard" },
  { label: "All-call tone", tone: "standard" },
  { label: "Signal 100", tone: "critical" },
  { label: "Panic alert", tone: "critical" },
  { label: "Officer needs assistance", tone: "critical" },
  { label: "Evacuation tone", tone: "warning" },
  { label: "Severe weather tone", tone: "warning" },
  { label: "Tow request tone", tone: "standard" },
] as const;

export function ToneBoardPanel({ onTone }: { onTone: (tone: string) => void }) {
  return (
    <Panel title="Tone Board" eyebrow="Alerting">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {tones.map((tone) => (
          <button
            key={tone.label}
            type="button"
            onClick={() => onTone(tone.label)}
            className={
              tone.tone === "critical"
                ? "min-h-14 rounded-md border border-rose-300/40 bg-rose-400/15 px-3 text-sm font-bold text-rose-100 hover:bg-rose-400/25"
                : tone.tone === "warning"
                  ? "min-h-14 rounded-md border border-amber-300/35 bg-amber-300/10 px-3 text-sm font-semibold text-amber-100 hover:bg-amber-300/20"
                  : "min-h-14 rounded-md border border-sky-300/25 bg-sky-300/10 px-3 text-sm font-semibold text-sky-100 hover:bg-sky-300/20"
            }
          >
            {tone.label}
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs leading-5 text-neutral-500">
        TODO: connect tone buttons to future audio assets and FiveM server events.
      </p>
    </Panel>
  );
}
