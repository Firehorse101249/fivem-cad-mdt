"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  loadCadLookupDetail,
  loadDispatchData,
  searchCadRecords,
  type CadLookupDetail,
  type CadLookupResult,
  type CadLookupScope,
} from "@/app/_lib/cad-data";
import { getSupabaseBrowserClient } from "@/app/_lib/supabase-client";
import type { Bolo, DispatchCall } from "@/components/dispatch/types";
import {
  Button,
  DataTable,
  EmptyState,
  Field,
  FormShell,
  MetricCard,
  Modal,
  Notice,
  Panel,
  SearchInput,
  SelectField,
  StatusBadge,
  TextareaField,
} from "@/components/cad-ui";

export type CadRecordsModule = "arrests" | "bolos" | "calls" | "citations" | "reports" | "vehicles" | "warrants";

type DraftRecord = {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  type: string;
};

const moduleCopy: Record<CadRecordsModule, { eyebrow: string; summary: string; title: string }> = {
  arrests: {
    eyebrow: "Custody workflow",
    summary: "Create professional arrest packets with charges, custody notes, evidence references, and supervisor review status.",
    title: "Arrest Records",
  },
  bolos: {
    eyebrow: "Officer safety",
    summary: "Review active BOLO-style records and draft original notices for people, vehicles, weapons, or safety alerts.",
    title: "BOLO Records",
  },
  calls: {
    eyebrow: "Dispatch operations",
    summary: "Track active calls, call age, assigned units, narratives, notes, and current disposition from the existing dispatch data path.",
    title: "Calls",
  },
  citations: {
    eyebrow: "Enforcement workflow",
    summary: "Prepare citation-style records with violation, fine, court, vehicle, and officer notes in a structured form.",
    title: "Citations",
  },
  reports: {
    eyebrow: "RMS drafting",
    summary: "Draft incident, supplemental, field interview, warning, citation, and arrest narratives with grouped report sections.",
    title: "Reports",
  },
  vehicles: {
    eyebrow: "DMV lookup",
    summary: "Search plate and vehicle records using the existing CAD lookup helper and open structured detail overlays.",
    title: "Vehicle Lookup",
  },
  warrants: {
    eyebrow: "Restricted records",
    summary: "Search warrant-style records and prepare draft warrant requests without changing the current database schema.",
    title: "Warrants",
  },
};

const reportTypes = ["Incident Report", "Supplement", "Field Interview", "Warning", "Citation", "Arrest Report"];
const warrantTypes = ["Arrest Warrant", "Search Warrant", "Bench Warrant", "Protective Order", "BOLO Conversion"];
const boloTypes = ["Person", "Vehicle", "Weapon", "Officer safety", "Missing person", "Stolen vehicle"];
const priorities = ["Low", "Medium", "High", "Critical"];
const reviewStatuses = ["Draft", "Pending Review", "Submitted", "Approved", "Restricted"];

function makeDraftId(prefix: string) {
  return `${prefix}-${Date.now().toString().slice(-6)}-${Math.round(Math.random() * 999)}`;
}

function callMatches(call: DispatchCall, query: string) {
  const haystack = [
    call.callNumber,
    call.type,
    call.location,
    call.postal,
    call.priority,
    call.serviceType,
    call.status,
    call.callerName,
    call.involvedPersons,
    call.involvedVehicles,
    call.narrative,
    call.assignedUnits.join(" "),
  ].join(" ");
  return haystack.toLowerCase().includes(query.toLowerCase());
}

function boloMatches(bolo: Bolo, query: string) {
  const haystack = [
    bolo.title,
    bolo.type,
    bolo.priority,
    bolo.status,
    bolo.associated,
    bolo.lastKnownLocation,
    bolo.description,
    bolo.createdBy,
  ].join(" ");
  return haystack.toLowerCase().includes(query.toLowerCase());
}

function value(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

export function CadRecordsWorkspace({ module }: { module: CadRecordsModule }) {
  const copy = moduleCopy[module];
  const [calls, setCalls] = useState<DispatchCall[]>([]);
  const [bolos, setBolos] = useState<Bolo[]>([]);
  const [drafts, setDrafts] = useState<DraftRecord[]>([]);
  const [query, setQuery] = useState("");
  const [selectedCallId, setSelectedCallId] = useState("");
  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupScope, setLookupScope] = useState<CadLookupScope>(module === "vehicles" ? "Plate" : "Name");
  const [lookupResults, setLookupResults] = useState<CadLookupResult[]>([]);
  const [selectedLookup, setSelectedLookup] = useState<CadLookupResult | null>(null);
  const [lookupDetail, setLookupDetail] = useState<CadLookupDetail | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [notice, setNotice] = useState("Loading CAD data...");
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    let active = true;
    queueMicrotask(async () => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        if (!active) return;
        setNotice("Supabase is not configured. Workflow forms remain available as UI-only drafts.");
        setIsLoading(false);
        return;
      }

      try {
        const data = await loadDispatchData(supabase);
        if (!active) return;
        setCalls(data.calls);
        setBolos(data.bolos);
        setSelectedCallId(data.calls[0]?.id ?? "");
        setNotice("Existing dispatch calls, units, and BOLO records loaded from Supabase.");
      } catch (error) {
        if (!active) return;
        setNotice(error instanceof Error ? error.message : "Could not load existing CAD data.");
      } finally {
        if (active) setIsLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const filteredCalls = useMemo(() => calls.filter((call) => callMatches(call, query)), [calls, query]);
  const selectedCall = calls.find((call) => call.id === selectedCallId) ?? filteredCalls[0] ?? null;
  const filteredBolos = useMemo(() => bolos.filter((bolo) => boloMatches(bolo, query)), [bolos, query]);
  const warrantBolos = filteredBolos.filter((bolo) => /warrant/i.test(`${bolo.type} ${bolo.title} ${bolo.description}`));
  const activeBolos = module === "warrants" ? warrantBolos : filteredBolos;

  function addDraft(next: Omit<DraftRecord, "id">) {
    setDrafts((current) => [{ id: makeDraftId(next.type.slice(0, 3).toLowerCase()), ...next }, ...current]);
    setNotice(`${next.type} saved as a local UI draft. No database write was performed.`);
  }

  async function runLookup(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const normalized = lookupQuery.trim();
    if (!normalized) {
      setNotice("Enter a lookup value before searching.");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setNotice("Supabase is not configured. Lookup cannot run yet.");
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchCadRecords(supabase, normalized, lookupScope);
      setLookupResults(results);
      setNotice(results.length ? `${results.length} lookup result${results.length === 1 ? "" : "s"} found.` : "No matching records found.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Lookup failed.");
    } finally {
      setIsSearching(false);
    }
  }

  async function openLookup(result: CadLookupResult) {
    setSelectedLookup(result);
    setLookupDetail(null);
    setModalOpen(true);

    if (!result.civilianId) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    try {
      const detail = await loadCadLookupDetail(supabase, result.civilianId);
      setLookupDetail(detail);
    } catch {
      setLookupDetail(null);
    }
  }

  function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    addDraft({
      primary: value(form, "title") || value(form, "caseNumber") || "Untitled report",
      secondary: [value(form, "reportType"), value(form, "location"), value(form, "subject")].filter(Boolean).join(" / "),
      status: value(form, "status") || "Draft",
      type: "Report",
    });
    event.currentTarget.reset();
  }

  function submitBoloLike(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    addDraft({
      primary: value(form, "title") || "Untitled safety notice",
      secondary: [value(form, "type"), value(form, "priority"), value(form, "location")].filter(Boolean).join(" / "),
      status: value(form, "status") || "Pending Review",
      type: module === "warrants" ? "Warrant Request" : "BOLO Draft",
    });
    event.currentTarget.reset();
  }

  function submitEnforcement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    addDraft({
      primary: value(form, "subject") || "Unnamed subject",
      secondary: [value(form, "charge"), value(form, "location"), value(form, "caseNumber")].filter(Boolean).join(" / "),
      status: value(form, "status") || "Draft",
      type: module === "arrests" ? "Arrest Packet" : "Citation",
    });
    event.currentTarget.reset();
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-white/10 bg-[#0f141a] p-5">
        <div className="grid gap-5 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-300">{copy.eyebrow}</p>
            <h1 className="mt-3 text-3xl font-semibold text-white">{copy.title}</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-neutral-400">{copy.summary}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <MetricCard label="Calls" value={isLoading ? "..." : String(calls.length)} />
            <MetricCard label="BOLOs" value={isLoading ? "..." : String(bolos.length)} />
            <MetricCard label="Drafts" value={String(drafts.length)} />
          </div>
        </div>
        <div className="mt-4">
          <Notice tone={notice.includes("No database") || notice.includes("not configured") ? "amber" : "blue"}>{notice}</Notice>
        </div>
      </section>

      {module === "calls" ? (
        <CallsView calls={filteredCalls} query={query} selectedCall={selectedCall} onQueryChange={setQuery} onSelectCall={setSelectedCallId} />
      ) : null}

      {module === "vehicles" ? (
        <VehicleView
          isSearching={isSearching}
          lookupQuery={lookupQuery}
          lookupResults={lookupResults}
          lookupScope={lookupScope}
          onLookupQueryChange={setLookupQuery}
          onLookupScopeChange={setLookupScope}
          onOpenLookup={openLookup}
          onRunLookup={runLookup}
        />
      ) : null}

      {module === "reports" ? <ReportsView drafts={drafts} onSubmit={submitReport} /> : null}

      {module === "warrants" || module === "bolos" ? (
        <BoloWarrantView
          bolos={activeBolos}
          drafts={drafts}
          isWarrant={module === "warrants"}
          onQueryChange={setQuery}
          onSubmit={submitBoloLike}
          query={query}
        />
      ) : null}

      {module === "arrests" || module === "citations" ? (
        <EnforcementView drafts={drafts} isArrest={module === "arrests"} onSubmit={submitEnforcement} />
      ) : null}

      <LookupDetailModal detail={lookupDetail} lookup={selectedLookup} onClose={() => setModalOpen(false)} open={modalOpen} />
    </div>
  );
}

function CallsView({
  calls,
  onQueryChange,
  onSelectCall,
  query,
  selectedCall,
}: {
  calls: DispatchCall[];
  onQueryChange: (value: string) => void;
  onSelectCall: (id: string) => void;
  query: string;
  selectedCall: DispatchCall | null;
}) {
  return (
    <div className="grid gap-5 2xl:grid-cols-[1.15fr_0.85fr]">
      <Panel
        title="Active Call Queue"
        eyebrow="Live dispatch records"
        actions={<SearchInput label="Search calls" onChange={(event) => onQueryChange(event.target.value)} placeholder="Search call number, location, status, unit..." value={query} />}
      >
        {calls.length ? (
          <div className="space-y-3">
            {calls.map((call) => (
              <button
                key={call.id}
                type="button"
                onClick={() => onSelectCall(call.id)}
                className="block w-full rounded-md border border-white/10 bg-neutral-950 p-4 text-left transition hover:border-sky-300/40 hover:bg-white/[0.04]"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-mono text-sm font-bold text-sky-200">{call.callNumber}</p>
                      <StatusBadge>{call.priority}</StatusBadge>
                      <StatusBadge>{call.status}</StatusBadge>
                    </div>
                    <h2 className="mt-2 text-lg font-semibold text-white">{call.type || "Untyped call"}</h2>
                    <p className="mt-1 text-sm text-neutral-400">{call.location || "No location"}{call.postal ? ` / Postal ${call.postal}` : ""}</p>
                  </div>
                  <div className="grid gap-2 text-xs sm:grid-cols-3 lg:min-w-80">
                    <MetricCard label="Age" value={call.age || "0m"} />
                    <MetricCard label="Units" value={String(call.assignedUnits.length)} />
                    <MetricCard label="Opened" value={call.openedAt || "--:--"} />
                  </div>
                </div>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-neutral-300">{call.narrative || "No narrative entered."}</p>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState title="No calls found" text="No active calls match this search. Existing dispatch data will appear here when Supabase returns active records." />
        )}
      </Panel>

      <Panel title="Call Detail" eyebrow="Expandable record">
        {selectedCall ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricCard label="Call" value={selectedCall.callNumber} />
              <MetricCard label="Service" value={selectedCall.serviceType} />
              <MetricCard label="Caller" value={selectedCall.callerName || "Unknown"} />
              <MetricCard label="Callback" value={selectedCall.callerNumber || "Unknown"} />
            </div>
            <RecordBlock title="Narrative" text={selectedCall.narrative || "No narrative recorded."} />
            <RecordBlock title="Assigned Units" text={selectedCall.assignedUnits.join(", ") || "No assigned units."} />
            <TimelineList title="Timeline / Notes" items={[...selectedCall.timeline, ...selectedCall.notes]} />
          </div>
        ) : (
          <EmptyState text="Select a call to view timeline, notes, and assigned unit detail." />
        )}
      </Panel>
    </div>
  );
}

function VehicleView({
  isSearching,
  lookupQuery,
  lookupResults,
  lookupScope,
  onLookupQueryChange,
  onLookupScopeChange,
  onOpenLookup,
  onRunLookup,
}: {
  isSearching: boolean;
  lookupQuery: string;
  lookupResults: CadLookupResult[];
  lookupScope: CadLookupScope;
  onLookupQueryChange: (value: string) => void;
  onLookupScopeChange: (value: CadLookupScope) => void;
  onOpenLookup: (result: CadLookupResult) => void;
  onRunLookup: (event?: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
      <Panel title="Vehicle Lookup" eyebrow="Plate and VIN search">
        <form onSubmit={onRunLookup} className="space-y-4">
          <SelectField label="Search scope" value={lookupScope} onChange={(event) => onLookupScopeChange(event.target.value as CadLookupScope)}>
            <option value="Plate">Plate</option>
            <option value="Vehicle">Vehicle</option>
            <option value="Name">Owner name</option>
          </SelectField>
          <Field label="Lookup value" value={lookupQuery} onChange={(event) => onLookupQueryChange(event.target.value.toUpperCase())} placeholder="Plate, VIN, make, model, owner..." required />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" intent="primary" disabled={isSearching}>{isSearching ? "Searching..." : "Run Lookup"}</Button>
            <Button onClick={() => onLookupQueryChange("")}>Clear</Button>
          </div>
        </form>
      </Panel>
      <Panel title="Lookup Results" eyebrow="Structured records">
        {lookupResults.length ? (
          <DataTable
            columns={["Record", "Source", "Summary"]}
            rows={lookupResults.map((result) => ({
              id: `${result.source}-${result.id}`,
              onClick: () => onOpenLookup(result),
              cells: [
                <span key="label" className="font-semibold text-white">{result.label}</span>,
                <StatusBadge key="source">{result.source}</StatusBadge>,
                <span key="meta">{result.meta || "No additional record metadata."}</span>,
              ],
            }))}
          />
        ) : (
          <EmptyState title="No lookup results" text="Run a plate, VIN, vehicle, or owner search to show matching Supabase lookup records." />
        )}
      </Panel>
    </div>
  );
}

function ReportsView({ drafts, onSubmit }: { drafts: DraftRecord[]; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
      <Panel title="Report Builder" eyebrow="Grouped RMS form">
        <FormShell onSubmit={onSubmit}>
          <SelectField label="Report type" name="reportType" required>
            {reportTypes.map((type) => <option key={type}>{type}</option>)}
          </SelectField>
          <SelectField label="Status" name="status">
            {reviewStatuses.map((status) => <option key={status}>{status}</option>)}
          </SelectField>
          <Field label="Case / call number" name="caseNumber" placeholder="C-2026-000000 or RMS draft" />
          <Field label="Primary subject" name="subject" placeholder="Last, First / DOB" required />
          <Field label="Location" name="location" placeholder="Street, postal, district" required />
          <Field label="Title" name="title" placeholder="Short report title" required />
          <TextareaField label="Narrative" name="narrative" placeholder="Facts, sequence of events, probable cause, actions taken..." required />
          <TextareaField label="Linked people / vehicles / evidence" name="links" placeholder="Subjects, witnesses, vehicles, property, weapons, attachments..." />
          <div className="flex flex-wrap gap-2 lg:col-span-2">
            <Button type="submit" intent="primary">Save Draft</Button>
            <Button type="submit" intent="success">Submit for Review</Button>
          </div>
        </FormShell>
      </Panel>
      <DraftPanel drafts={drafts} title="Recent Report Drafts" />
    </div>
  );
}

function BoloWarrantView({
  bolos,
  drafts,
  isWarrant,
  onQueryChange,
  onSubmit,
  query,
}: {
  bolos: Bolo[];
  drafts: DraftRecord[];
  isWarrant: boolean;
  onQueryChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  query: string;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <Panel title={isWarrant ? "Draft Warrant Request" : "Draft BOLO"} eyebrow="UI draft only">
        <FormShell onSubmit={onSubmit}>
          <SelectField label="Type" name="type" required>
            {(isWarrant ? warrantTypes : boloTypes).map((type) => <option key={type}>{type}</option>)}
          </SelectField>
          <SelectField label="Priority" name="priority" required>
            {priorities.map((priority) => <option key={priority}>{priority}</option>)}
          </SelectField>
          <SelectField label="Status" name="status">
            {reviewStatuses.map((status) => <option key={status}>{status}</option>)}
          </SelectField>
          <Field label="Subject / associated record" name="associated" placeholder="Person, plate, weapon, case number" required />
          <Field label="Title" name="title" placeholder={isWarrant ? "Probable cause summary" : "Officer safety alert"} required />
          <Field label="Last known location" name="location" placeholder="Area, postal, address" />
          <TextareaField label="Narrative / basis" name="description" placeholder="Describe facts, cautions, authorizing details, and officer safety notes." required />
          <TextareaField label="Conditions / instructions" name="instructions" placeholder="Service conditions, extradition, caution flags, expiration, notifying agency." />
          <div className="flex flex-wrap gap-2 lg:col-span-2">
            <Button type="submit" intent="primary">{isWarrant ? "Save Warrant Draft" : "Save BOLO Draft"}</Button>
            <Button type="submit">Save as Restricted</Button>
          </div>
        </FormShell>
      </Panel>
      <div className="space-y-5">
        <Panel
          title={isWarrant ? "Existing Warrant-Style Hits" : "Existing BOLO Records"}
          eyebrow="Supabase records"
          actions={<SearchInput label="Search records" onChange={(event) => onQueryChange(event.target.value)} placeholder="Search title, subject, location..." value={query} />}
        >
          {bolos.length ? (
            <div className="grid gap-3">
              {bolos.map((bolo) => (
                <article key={bolo.id} className="rounded-md border border-white/10 bg-neutral-950 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-white">{bolo.title}</h3>
                      <p className="mt-1 text-sm text-neutral-400">{bolo.associated || "No associated subject"} / {bolo.lastKnownLocation || "No location"}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge>{bolo.priority}</StatusBadge>
                      <StatusBadge>{bolo.status}</StatusBadge>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-neutral-300">{bolo.description || "No narrative entered."}</p>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState text={isWarrant ? "No warrant-style BOLO records matched this search." : "No BOLO records matched this search."} />
          )}
        </Panel>
        <DraftPanel drafts={drafts} title="Local Drafts" />
      </div>
    </div>
  );
}

function EnforcementView({
  drafts,
  isArrest,
  onSubmit,
}: {
  drafts: DraftRecord[];
  isArrest: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
      <Panel title={isArrest ? "Arrest Packet" : "Citation Form"} eyebrow="Professional form layout">
        <FormShell onSubmit={onSubmit}>
          <Field label="Case / call number" name="caseNumber" placeholder="C-2026-000000" />
          <Field label="Subject" name="subject" placeholder="Last, First / DOB" required />
          <Field label={isArrest ? "Primary charge" : "Violation"} name="charge" placeholder={isArrest ? "Charge / statute" : "Violation / statute"} required />
          <SelectField label="Status" name="status">
            {(isArrest ? ["Draft", "Pending Review", "Submitted", "Approved", "Restricted"] : ["Draft", "Issued", "Void", "Pending Review"]).map((status) => <option key={status}>{status}</option>)}
          </SelectField>
          <Field label="Location" name="location" placeholder="Stop, scene, or arrest location" required />
          <Field label="Vehicle / property" name="vehicle" placeholder="Plate, VIN, evidence, property tag" />
          {isArrest ? <Field label="Custody location" name="custody" placeholder="Jail, hospital, released, transferred" /> : <Field label="Fine / court" name="fine" placeholder="$250 / court date pending" />}
          <Field label="Officer" name="officer" placeholder="Callsign / name" required />
          <TextareaField label="Probable cause / notes" name="narrative" placeholder="Document facts, observations, statements, warnings, and actions taken." required />
          <TextareaField label={isArrest ? "Evidence / booking notes" : "Remarks / correction requirements"} name="remarks" placeholder="Attachments, evidence, supervisor notes, correction instructions." />
          <div className="flex flex-wrap gap-2 lg:col-span-2">
            <Button type="submit" intent="primary">Save Draft</Button>
            <Button type="submit" intent={isArrest ? "danger" : "success"}>{isArrest ? "Submit Arrest" : "Issue Citation"}</Button>
          </div>
        </FormShell>
      </Panel>
      <DraftPanel drafts={drafts} title={isArrest ? "Recent Arrest Drafts" : "Recent Citation Drafts"} />
    </div>
  );
}

function DraftPanel({ drafts, title }: { drafts: DraftRecord[]; title: string }) {
  return (
    <Panel title={title} eyebrow="Local workflow state">
      <Notice>These drafts are UI-only in this phase and are not persisted to Supabase.</Notice>
      <div className="mt-4 space-y-2">
        {drafts.length ? (
          drafts.map((draft) => (
            <article key={draft.id} className="rounded-md border border-white/10 bg-neutral-950 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-white">{draft.primary}</p>
                  <p className="mt-1 text-sm text-neutral-400">{draft.secondary || "No secondary detail"}</p>
                </div>
                <StatusBadge>{draft.status}</StatusBadge>
              </div>
              <p className="mt-2 font-mono text-xs text-neutral-600">{draft.type} / {draft.id}</p>
            </article>
          ))
        ) : (
          <EmptyState text="No local drafts have been created in this browser session." />
        )}
      </div>
    </Panel>
  );
}

function LookupDetailModal({
  detail,
  lookup,
  onClose,
  open,
}: {
  detail: CadLookupDetail | null;
  lookup: CadLookupResult | null;
  onClose: () => void;
  open: boolean;
}) {
  const civilian = detail?.civilian;
  const name = civilian ? `${civilian.first_name} ${civilian.last_name}`.trim() || "Unnamed civilian" : lookup?.label ?? "Lookup detail";

  return (
    <Modal open={open} onClose={onClose} title={name}>
      {lookup ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard label="Source" value={lookup.source} />
            <MetricCard label="Record ID" value={lookup.id} />
            <MetricCard label="Status" value={detail?.isWanted ? "Wanted hit" : "Review"} />
          </div>
          <RecordBlock title="Lookup Summary" text={lookup.meta || "No lookup metadata returned."} />
          {detail && civilian ? (
            <>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <MetricCard label="DOB" value={civilian.date_of_birth || "Unknown"} />
                <MetricCard label="Address" value={civilian.address || "Unknown"} />
                <MetricCard label="Phone" value={civilian.phone || "Unknown"} />
                <MetricCard label="Occupation" value={civilian.occupation || "Unknown"} />
                <MetricCard label="Vehicles" value={String(civilian.vehicles.length)} />
                <MetricCard label="Records" value={String(civilian.records.length)} />
              </div>
              <TimelineList title="Flags" items={detail.flags.length ? detail.flags : ["No active profile flags."]} />
              <TimelineList title="Active BOLO / Warrant Hits" items={detail.activeBolos.length ? detail.activeBolos.map((bolo) => `${bolo.label} / ${bolo.meta}`) : ["No active hits."]} />
            </>
          ) : (
            <Notice>This result is not tied to a civilian profile detail record, or detail could not be loaded.</Notice>
          )}
        </div>
      ) : (
        <EmptyState text="No lookup result selected." />
      )}
    </Modal>
  );
}

function RecordBlock({ text, title }: { text: string; title: string }) {
  return (
    <section className="rounded-md border border-white/10 bg-neutral-950 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">{title}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-neutral-300">{text}</p>
    </section>
  );
}

function TimelineList({ items, title }: { items: string[]; title: string }) {
  return (
    <section>
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">{title}</p>
      <div className="space-y-2">
        {items.length ? (
          items.map((item, index) => (
            <p key={`${item}-${index}`} className="rounded-md border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-neutral-300">
              {item}
            </p>
          ))
        ) : (
          <p className="rounded-md border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-neutral-500">No entries.</p>
        )}
      </div>
    </section>
  );
}
