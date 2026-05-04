import { Panel } from "./Panel";

const tones = [
  { label: "Fire Station 5/6", tone: "standard" },
  { label: "EMS Dispatch", tone: "standard" },
  { label: "Police Panic", tone: "critical" },
  { label: "Signal 100", tone: "critical" },
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
                : "min-h-14 rounded-md border border-sky-300/25 bg-sky-300/10 px-3 text-sm font-semibold text-sky-100 hover:bg-sky-300/20"
            }
          >
            {tone.label}
          </button>
        ))}
      </div>
    </Panel>
  );
}
