import { useState } from "react";
import { Panel, UnderConstructionInline } from "./Panel";

const lookupTypes = [
  "Name / civilian",
  "License",
  "License plate",
  "Vehicle",
  "Weapon",
  "Warrant",
  "BOLO",
];

const mockResults = [
  { label: "Jane Miles", meta: "Valid license • No warrants • Civilian record placeholder" },
  { label: "81Q-JD2", meta: "Black Sultan RS • Insurance unknown • BOLO possible" },
  { label: "W-2026-008", meta: "Under Construction warrant detail preview" },
];

export function LookupPanel({ onPlaceholder }: { onPlaceholder: (label: string) => void }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState(lookupTypes[0]);

  return (
    <Panel title="Lookup" eyebrow="Records">
      <div className="space-y-3">
        <select
          value={type}
          onChange={(event) => setType(event.target.value)}
          className="h-10 w-full rounded-md border border-white/10 bg-neutral-950 px-2 text-sm text-white"
        >
          {lookupTypes.map((lookupType) => (
            <option key={lookupType}>{lookupType}</option>
          ))}
        </select>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="h-10 w-full rounded-md border border-white/10 bg-neutral-950 px-3 text-sm text-white placeholder:text-neutral-600"
          placeholder="Search name, plate, serial, warrant number..."
        />
        <button
          type="button"
          onClick={() => onPlaceholder(`${type} lookup`)}
          className="min-h-10 w-full rounded-md bg-sky-400 px-3 text-sm font-semibold text-neutral-950 hover:bg-sky-300"
        >
          Run Lookup
        </button>
        <UnderConstructionInline label="Database-backed lookup results" />
        <div className="space-y-2">
          {(query ? mockResults : mockResults.slice(0, 2)).map((result) => (
            <div key={result.label} className="rounded-md border border-white/10 bg-neutral-950 p-3">
              <p className="font-medium text-white">{result.label}</p>
              <p className="mt-1 text-xs leading-5 text-neutral-400">{result.meta}</p>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}
