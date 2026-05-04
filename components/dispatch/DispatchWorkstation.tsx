"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  createBolo,
  createDispatchCall,
  loadDispatchData,
  searchCadRecords,
  updateDispatchCallStatus,
  updateDispatchUnitStatus,
  type CadLookupResult,
} from "@/app/_lib/cad-data";
import { getSupabaseBrowserClient } from "@/app/_lib/supabase-client";
import {
  incidentTypes,
  initialCallForm,
} from "./mockDispatchData";
import { toneConfig, type ToneConfig } from "./toneConfig";
import type {
  Bolo,
  BoloType,
  CallFormState,
  CallStatus,
  DispatchCall,
  DispatchLogEntry,
  DispatchModule,
  DispatchUnit,
  Priority,
  ServiceType,
} from "./types";

const modules: Array<{ id: DispatchModule; label: string }> = [
  { id: "command-center", label: "Command Center" },
  { id: "active-calls", label: "Active Calls" },
  { id: "call-creation", label: "Call Creation" },
  { id: "units", label: "Units" },
  { id: "fire-ems", label: "Fire/EMS" },
  { id: "tow", label: "Tow" },
  { id: "bolos", label: "BOLOs" },
  { id: "lookups", label: "Lookups" },
  { id: "tone-board", label: "Tone Board" },
  { id: "map", label: "Map Placeholder" },
  { id: "activity-log", label: "Activity Log" },
  { id: "settings", label: "Settings" },
];

const callStatuses: CallStatus[] = ["Pending", "Assigned", "Enroute", "On Scene", "Holding", "Closed"];
const priorities: Priority[] = ["Low", "Medium", "High", "Critical"];
const serviceTypes: ServiceType[] = ["Law Enforcement", "Fire", "EMS", "Tow", "Multi-agency"];
const boloTypes: BoloType[] = ["Person", "Vehicle", "Weapon", "Officer safety", "Missing person", "Stolen vehicle"];
const toneById = Object.fromEntries(toneConfig.map((tone) => [tone.id, tone])) as Record<ToneConfig["id"], ToneConfig>;
const dispatchSessionKey = "sentinel-dispatch-session";

type DispatchSession = {
  channel: string;
  dispatcherId: string;
  dispatcherName: string;
  shiftStartedAt: string;
};

function nowTime() {
  return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000)}`;
}

function priorityClass(priority: Priority) {
  if (priority === "Critical") return "bg-rose-400/15 text-rose-100 border-rose-300/30";
  if (priority === "High") return "bg-amber-300/10 text-amber-100 border-amber-300/30";
  if (priority === "Medium") return "bg-sky-300/10 text-sky-100 border-sky-300/30";
  return "bg-white/[0.06] text-neutral-200 border-white/15";
}

function statusClass(status: string) {
  if (["Panic", "Signal 100", "Critical"].includes(status)) return "bg-rose-400/15 text-rose-100 border-rose-300/30";
  if (["Available", "Complete", "Closed"].includes(status)) return "bg-emerald-300/10 text-emerald-100 border-emerald-300/30";
  if (["Enroute", "On Scene", "Assigned", "Transporting"].includes(status)) return "bg-sky-300/10 text-sky-100 border-sky-300/30";
  return "bg-white/[0.06] text-neutral-200 border-white/15";
}

export function DispatchWorkstation() {
  const [session, setSession] = useState<DispatchSession | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [activeModule, setActiveModule] = useState<DispatchModule>("command-center");
  const [calls, setCalls] = useState<DispatchCall[]>([]);
  const [units, setUnits] = useState<DispatchUnit[]>([]);
  const [bolos, setBolos] = useState<Bolo[]>([]);
  const [log, setLog] = useState<DispatchLogEntry[]>([
    { actor: "SYSTEM", id: "log-boot", message: "Dispatch workstation ready for Supabase sync.", timestamp: nowTime() },
  ]);
  const [selectedCallId, setSelectedCallId] = useState(calls[0]?.id ?? "");
  const [callForm, setCallForm] = useState<CallFormState>(initialCallForm);
  const [unitFilter, setUnitFilter] = useState("All");
  const [boloSearch, setBoloSearch] = useState("");
  const [boloFilter, setBoloFilter] = useState("All");
  const [playingTone, setPlayingTone] = useState("");
  const [toneError, setToneError] = useState("");
  const [volume, setVolume] = useState(0.85);
  const [signal100Active, setSignal100Active] = useState(false);
  const [userId, setUserId] = useState("");
  const [syncNotice, setSyncNotice] = useState("Loading Supabase CAD data...");
  const [lookupResults, setLookupResults] = useState<CadLookupResult[]>([]);
  const audioRefs = useRef<HTMLAudioElement[]>([]);
  const beepContextRef = useRef<AudioContext | null>(null);
  const previousEmergencyUnitIdsRef = useRef<Set<string>>(new Set());

  const selectedCall = calls.find((call) => call.id === selectedCallId) ?? null;

  useEffect(() => {
    queueMicrotask(() => {
      const stored = window.localStorage.getItem(dispatchSessionKey);
      if (stored) {
        try {
          setSession(JSON.parse(stored) as DispatchSession);
        } catch {
          window.localStorage.removeItem(dispatchSessionKey);
        }
      }
      setHydrated(true);
    });
  }, []);

  const refreshDispatchData = useCallback(async (nextSelectedCallId = "") => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setSyncNotice("Supabase is not configured. Dispatch data cannot sync yet.");
      return;
    }

    const data = await loadDispatchData(supabase);
    setCalls(data.calls);
    setUnits(data.units);
    setBolos(data.bolos);
    setSelectedCallId((current) => nextSelectedCallId || current || data.calls[0]?.id || "");
    setSyncNotice("Dispatch calls, units, and BOLOs are synced with Supabase.");
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      queueMicrotask(() => setSyncNotice("Supabase is not configured. Dispatch data cannot sync yet."));
      return;
    }

    let active = true;
    queueMicrotask(async () => {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      setUserId(data.user?.id ?? "");
      try {
        await refreshDispatchData();
      } catch (error) {
        setSyncNotice(error instanceof Error ? error.message : "Could not load Supabase dispatch data.");
      }
    });

    const channel = supabase
      .channel("dispatch-workstation-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "dispatch_calls" }, () => void refreshDispatchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "dispatch_units" }, () => void refreshDispatchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "bolos" }, () => void refreshDispatchData())
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [refreshDispatchData]);

  useEffect(() => {
    if (!signal100Active) return;

    const playIntervalBeep = () => {
      try {
        const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextCtor) return;
        const context = beepContextRef.current ?? new AudioContextCtor();
        beepContextRef.current = context;
        const oscillator = context.createOscillator();
        const gain = context.createGain();

        oscillator.type = "sine";
        oscillator.frequency.value = 880;
        gain.gain.value = 0.035 * volume;
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.16);
      } catch {
        setToneError("Signal 100 interval beep could not play in this browser.");
      }
    };

    playIntervalBeep();
    const intervalId = window.setInterval(playIntervalBeep, 8000);
    return () => window.clearInterval(intervalId);
  }, [signal100Active, volume]);

  const addLog = useCallback((message: string, related?: string, actor?: string) => {
    setLog((current) => [
      { actor: actor ?? session?.dispatcherId ?? "DISPATCH", id: makeId("log"), message, related, timestamp: nowTime() },
      ...current,
    ]);
  }, [session?.dispatcherId]);

  function startSession(nextSession: DispatchSession) {
    window.localStorage.setItem(dispatchSessionKey, JSON.stringify(nextSession));
    setSession(nextSession);
    addLog(`${nextSession.dispatcherId} signed into dispatch on ${nextSession.channel}.`, "Dispatch Login", nextSession.dispatcherId);
  }

  function endSession() {
    window.localStorage.removeItem(dispatchSessionKey);
    setSession(null);
    setActiveModule("command-center");
  }

  async function updateCallStatus(callId: string, status: CallStatus) {
    const supabase = getSupabaseBrowserClient();
    const call = calls.find((item) => item.id === callId);
    if (!supabase || !call) {
      setSyncNotice("Supabase is not available for call status updates.");
      return;
    }
    setCalls((current) =>
      current.map((item) =>
        item.id === callId
          ? {
              ...item,
              status,
              timeline: [`${nowTime()} status changed to ${status}`, ...item.timeline],
            }
          : item,
      ),
    );
    try {
      await updateDispatchCallStatus(supabase, call, status);
      addLog(`Call status changed to ${status}.`, call.callNumber);
    } catch (error) {
      setSyncNotice(error instanceof Error ? error.message : "Could not update call status.");
      await refreshDispatchData(callId);
    }
  }

  async function createCall(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setSyncNotice("Supabase is not configured. Cannot open the call.");
      return;
    }

    try {
      const newCall = await createDispatchCall(supabase, callForm, userId);
      setCalls((current) => [newCall, ...current]);
      setSelectedCallId(newCall.id);
      setCallForm(initialCallForm);
      setActiveModule("active-calls");
      addLog(`Call opened: ${newCall.type} at ${newCall.location}.`, newCall.callNumber);
    } catch (error) {
      setSyncNotice(error instanceof Error ? error.message : "Could not create dispatch call.");
    }
  }

  async function addBolo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setSyncNotice("Supabase is not configured. Cannot add BOLO.");
      return;
    }
    const formElement = event.currentTarget;
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "");

    try {
      const newBolo = await createBolo(supabase, form, userId);
      setBolos((current) => [newBolo, ...current]);
      addLog(`BOLO added: ${title}.`, title);
      formElement.reset();
    } catch (error) {
      setSyncNotice(error instanceof Error ? error.message : "Could not add BOLO.");
    }
  }

  async function changeUnitStatus(unitId: string, status: DispatchUnit["status"]) {
    const supabase = getSupabaseBrowserClient();
    const unit = units.find((item) => item.id === unitId);
    if (!supabase || !unit) {
      setSyncNotice("Supabase is not available for unit status updates.");
      return;
    }
    setUnits((current) =>
      current.map((item) => (item.id === unitId ? { ...item, status, lastUpdate: nowTime() } : item)),
    );
    try {
      await updateDispatchUnitStatus(supabase, unitId, status);
      addLog(`${unit.unit} status changed to ${status}.`, unit.assignedCall);
    } catch (error) {
      setSyncNotice(error instanceof Error ? error.message : "Could not update unit status.");
      await refreshDispatchData();
    }
  }

  async function runLookup(label: string, query: string) {
    addLog(`Lookup searched: ${label}.`, label);
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setSyncNotice("Supabase is not configured. Lookups are unavailable.");
      return;
    }
    try {
      setLookupResults(await searchCadRecords(supabase, query));
    } catch (error) {
      setSyncNotice(error instanceof Error ? error.message : "Could not run lookup.");
    }
  }

  const stopTones = useCallback(() => {
    audioRefs.current.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
    audioRefs.current = [];
    setPlayingTone("");
  }, []);

  function clearSignal100() {
    setSignal100Active(false);
    addLog("Signal 100 cleared from tone board.", "Signal 100", "SYSTEM");
  }

  const playAudio = useCallback(async (tone: ToneConfig) => {
    stopTones();
    setToneError("");
    const audio = new Audio(tone.path);
    audio.volume = Math.min(1, Math.max(0, tone.volume * volume));
    audioRefs.current = [audio];
    setPlayingTone(tone.label);
    audio.onerror = () => {
      setToneError(`${tone.label} audio file missing at ${tone.path}.`);
      setPlayingTone("");
    };

    try {
      await audio.play();
      await new Promise<void>((resolve) => {
        audio.onended = () => {
          setPlayingTone("");
          resolve();
        };
      });
    } catch {
      setToneError(`${tone.label} could not play. Browser blocked playback or file is missing.`);
      setPlayingTone("");
    }
  }, [stopTones, volume]);

  async function playTone(tone: ToneConfig) {
    if (tone.id === "signal-100") {
      setSignal100Active(true);
    }
    await playAudio(tone);
    addLog(`${tone.label} played.`, tone.label, "SYSTEM");
  }

  const triggerPanicSequence = useCallback(async (unitLabel: string) => {
    setSignal100Active(true);
    addLog(`Panic activated by ${unitLabel}. Signal 100 automatically started.`, unitLabel, "SYSTEM");
    await playAudio(toneById.panic);
    await playAudio(toneById["signal-100"]);
  }, [addLog, playAudio]);

  useEffect(() => {
    const emergencyUnits = units.filter((unit) => unit.status === "Panic" || unit.status === "Signal 100");
    const nextIds = new Set(emergencyUnits.map((unit) => unit.id));
    const newPanicUnits = emergencyUnits.filter((unit) => unit.status === "Panic" && !previousEmergencyUnitIdsRef.current.has(unit.id));

    previousEmergencyUnitIdsRef.current = nextIds;

    if (newPanicUnits.length) {
      void triggerPanicSequence(newPanicUnits.map((unit) => unit.unit).join(", "));
    }
  }, [triggerPanicSequence, units]);

  if (!hydrated) {
    return <div className="min-h-screen bg-neutral-950 p-6 text-neutral-300">Loading dispatch terminal...</div>;
  }

  if (!session) return <DispatchLogin onSubmit={startSession} />;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="grid min-h-screen lg:grid-cols-[240px_1fr]">
        <ModuleRail activeModule={activeModule} onModuleChange={setActiveModule} session={session} />
        <div className="min-w-0">
          <TerminalBar calls={calls} onEndSession={endSession} session={session} syncNotice={syncNotice} units={units} />
          <main className="h-[calc(100vh-76px)] overflow-y-auto p-4">
            {activeModule === "command-center" ? (
              <CommandCenter
                calls={calls}
                log={log}
                onCallSelect={(id) => {
                  setSelectedCallId(id);
                  setActiveModule("active-calls");
                }}
                onModuleChange={setActiveModule}
                units={units}
              />
            ) : null}
            {activeModule === "active-calls" ? (
              <ActiveCallsModule
                calls={calls}
                onCallSelect={setSelectedCallId}
                onStatusChange={updateCallStatus}
                selectedCall={selectedCall}
              />
            ) : null}
            {activeModule === "call-creation" ? (
              <CallCreationModule form={callForm} onChange={setCallForm} onSubmit={createCall} />
            ) : null}
            {activeModule === "units" ? (
              <UnitsModule filter={unitFilter} onFilterChange={setUnitFilter} onStatusChange={changeUnitStatus} units={units} />
            ) : null}
            {activeModule === "fire-ems" ? <FireEmsModule calls={calls} units={units} /> : null}
            {activeModule === "tow" ? <TowModule units={units} /> : null}
            {activeModule === "bolos" ? (
              <BoloModule
                bolos={bolos}
                filter={boloFilter}
                onAddBolo={addBolo}
                onFilterChange={setBoloFilter}
                onSearchChange={setBoloSearch}
                search={boloSearch}
              />
            ) : null}
            {activeModule === "lookups" ? <LookupModule onSearch={runLookup} results={lookupResults} /> : null}
            {activeModule === "tone-board" ? (
              <ToneBoardModule
                onClearSignal100={clearSignal100}
                onPlayTone={(tone) => void playTone(tone)}
                onStop={stopTones}
                playingTone={playingTone}
                signal100Active={signal100Active}
                toneError={toneError}
                volume={volume}
                onVolumeChange={setVolume}
              />
            ) : null}
            {activeModule === "map" ? <MapModule /> : null}
            {activeModule === "activity-log" ? <ActivityLogModule log={log} /> : null}
            {activeModule === "settings" ? <SettingsModule /> : null}
          </main>
        </div>
      </div>
    </div>
  );
}

function ModuleRail({
  activeModule,
  onModuleChange,
  session,
}: {
  activeModule: DispatchModule;
  onModuleChange: (module: DispatchModule) => void;
  session: DispatchSession;
}) {
  return (
    <aside className="border-b border-white/10 bg-neutral-950 lg:border-b-0 lg:border-r">
      <div className="border-b border-white/10 p-4">
        <Link href="/cad" className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">
          Sentinel CAD
        </Link>
        <p className="mt-2 text-lg font-semibold text-white">Dispatch Terminal</p>
        <p className="mt-1 font-mono text-xs text-neutral-500">{session.dispatcherId} / {session.channel}</p>
      </div>
      <nav className="flex gap-2 overflow-x-auto p-3 lg:block lg:space-y-1 lg:overflow-visible">
        {modules.map((module) => (
          <button
            key={module.id}
            type="button"
            onClick={() => onModuleChange(module.id)}
            className={`block w-full shrink-0 rounded-md px-3 py-2 text-left text-sm font-medium ${
              activeModule === module.id
                ? "bg-sky-400 text-neutral-950"
                : "text-neutral-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            {module.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}

function TerminalBar({
  calls,
  onEndSession,
  session,
  syncNotice,
  units,
}: {
  calls: DispatchCall[];
  onEndSession: () => void;
  session: DispatchSession;
  syncNotice: string;
  units: DispatchUnit[];
}) {
  const panicCount = units.filter((unit) => unit.status === "Panic" || unit.status === "Signal 100").length;
  return (
    <header className="border-b border-white/10 bg-neutral-900 px-4 py-3">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">Terminal Session</p>
          <h1 className="text-xl font-semibold text-white">{session.dispatcherName} - {session.dispatcherId}</h1>
          <p className="mt-1 font-mono text-xs text-neutral-500">{session.channel} / Shift {session.shiftStartedAt}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Pill>Primary Channel</Pill>
          <Pill>{calls.filter((call) => call.status !== "Closed").length} Active Calls</Pill>
          <Pill>{units.filter((unit) => unit.status === "Available").length} Available Units</Pill>
          <Pill critical={panicCount > 0}>{panicCount} Emergency Flags</Pill>
          <Pill>{syncNotice}</Pill>
          <button onClick={onEndSession} className="rounded-md border border-white/15 px-3 py-1 text-neutral-300 hover:bg-white/10">End Shift</button>
        </div>
      </div>
    </header>
  );
}

function DispatchLogin({ onSubmit }: { onSubmit: (session: DispatchSession) => void }) {
  const [dispatcherId, setDispatcherId] = useState("");
  const [dispatcherName, setDispatcherName] = useState("");
  const [channel, setChannel] = useState("Primary Dispatch");
  const [loggingIn, setLoggingIn] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dispatcherId.trim()) return;
    setLoggingIn(true);
    window.setTimeout(() => {
      onSubmit({
        channel,
        dispatcherId: dispatcherId.trim().toUpperCase(),
        dispatcherName: dispatcherName.trim() || "Dispatch Operator",
        shiftStartedAt: nowTime(),
      });
    }, 500);
  }

  return (
    <div className="min-h-screen bg-[#06080b] px-4 py-6 text-neutral-100">
      <div className="mx-auto flex min-h-[calc(100vh-48px)] max-w-6xl items-center">
        <div className="grid w-full gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="border border-white/10 bg-neutral-950 p-5 shadow-2xl shadow-black/40">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">Dispatch Workstation</p>
            <h1 className="mt-3 text-3xl font-semibold text-white">Sign Into Dispatch</h1>
            <p className="mt-3 text-sm leading-6 text-neutral-400">
              Start a dispatcher shift before opening the live CAD workstation. Calls, units, BOLOs, tones, and Signal 100 controls sync through Supabase after sign-in.
            </p>
            <div className="mt-6 grid gap-3 text-sm">
              <Info label="Console" value="CAD dispatch terminal" />
              <Info label="Network" value="Supabase CAD sync" />
              <Info label="Shift Control" value="Sign in initializes the dispatcher session" />
            </div>
          </section>

          <form onSubmit={submit} className="border border-white/10 bg-neutral-900 p-5 shadow-2xl shadow-black/40">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block md:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">Dispatcher ID</span>
                <input
                  value={dispatcherId}
                  onChange={(event) => setDispatcherId(event.target.value)}
                  required
                  className="mt-2 h-12 w-full border border-white/10 bg-neutral-950 px-3 font-mono text-lg text-white"
                  placeholder="DISP-01"
                />
              </label>
              <label className="block md:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">Dispatcher Name</span>
                <input
                  value={dispatcherName}
                  onChange={(event) => setDispatcherName(event.target.value)}
                  className="mt-2 h-11 w-full border border-white/10 bg-neutral-950 px-3 text-sm text-white"
                  placeholder="Last, First"
                />
              </label>
              <label className="block md:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">Channel Assignment</span>
                <select value={channel} onChange={(event) => setChannel(event.target.value)} className="mt-2 h-11 w-full border border-white/10 bg-neutral-950 px-3 text-sm text-white">
                  <option>Primary Dispatch</option>
                  <option>Law Enforcement</option>
                  <option>Fire/EMS</option>
                  <option>Tow / Services</option>
                  <option>Supervisor</option>
                </select>
              </label>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="submit" className="min-h-12 bg-sky-400 px-5 text-sm font-bold text-neutral-950 hover:bg-sky-300">
                {loggingIn ? "Signing into dispatch..." : "Open Dispatch"}
              </button>
            </div>
            <p className="mt-4 border border-dashed border-amber-300/25 bg-amber-300/[0.06] px-3 py-2 text-sm text-amber-100">
              FiveM dispatcher duty bridge -- Under Construction
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

function CommandCenter({
  calls,
  log,
  onCallSelect,
  onModuleChange,
  units,
}: {
  calls: DispatchCall[];
  log: DispatchLogEntry[];
  onCallSelect: (id: string) => void;
  onModuleChange: (module: DispatchModule) => void;
  units: DispatchUnit[];
}) {
  const alerts = [
    ...calls.filter((call) => call.priority === "Critical").map((call) => `${call.callNumber}: ${call.type}`),
    ...units.filter((unit) => unit.status === "Panic").map((unit) => `${unit.unit}: Panic`),
  ];
  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <Panel title="Compact Active Call Queue">
        <div className="space-y-2">
          {calls.slice(0, 8).map((call) => (
            <button
              key={call.id}
              type="button"
              onClick={() => onCallSelect(call.id)}
              className="grid w-full grid-cols-[0.8fr_0.6fr_1fr_0.8fr] gap-3 rounded-md border border-white/10 bg-neutral-950 px-3 py-2 text-left text-sm hover:bg-white/[0.06]"
            >
              <span className="font-mono text-white">{call.callNumber}</span>
              <span className={`rounded border px-2 py-0.5 text-xs ${priorityClass(call.priority)}`}>{call.priority}</span>
              <span className="truncate text-neutral-300">{call.type}</span>
              <span className="truncate text-neutral-400">{call.status}</span>
            </button>
          ))}
        </div>
      </Panel>
      <Panel title="Priority Alerts">
        <div className="space-y-2">
          {alerts.length ? alerts.map((alert) => (
            <div key={alert} className="rounded-md border border-rose-300/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-100">
              {alert}
            </div>
          )) : <UnderConstruction text="No active priority alerts." />}
        </div>
      </Panel>
      <Panel title="Unit Status Monitor">
        <CompactUnitTable units={units.slice(0, 10)} />
      </Panel>
      <Panel title="Recent Dispatch Log">
        <LogList log={log.slice(0, 6)} />
      </Panel>
      <Panel title="Quick Actions" className="xl:col-span-2">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <QuickAction label="Open Call Creation" onClick={() => onModuleChange("call-creation")} />
          <QuickAction label="Open Tone Board" onClick={() => onModuleChange("tone-board")} />
          <QuickAction label="View Map" onClick={() => onModuleChange("map")} />
          <QuickAction label="Run Lookup" onClick={() => onModuleChange("lookups")} />
        </div>
      </Panel>
    </div>
  );
}

function ActiveCallsModule({
  calls,
  onCallSelect,
  onStatusChange,
  selectedCall,
}: {
  calls: DispatchCall[];
  onCallSelect: (id: string) => void;
  onStatusChange: (id: string, status: CallStatus) => void;
  selectedCall: DispatchCall | null;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
      <Panel title="Call Queue">
        <div className="overflow-hidden rounded-md border border-white/10">
          <TableHeader columns={["Call #", "Priority", "Type", "Location / Postal", "Status", "Assigned Units", "Age", "Actions"]} />
          {calls.map((call) => (
            <button
              key={call.id}
              type="button"
              onClick={() => onCallSelect(call.id)}
              className="grid w-full grid-cols-[0.8fr_0.7fr_1fr_1.2fr_0.8fr_1fr_0.5fr_0.7fr] gap-3 border-t border-white/10 px-3 py-2 text-left text-xs hover:bg-white/[0.06]"
            >
              <span className="font-mono text-white">{call.callNumber}</span>
              <span className={`rounded border px-2 py-0.5 ${priorityClass(call.priority)}`}>{call.priority}</span>
              <span className="truncate text-neutral-300">{call.type}</span>
              <span className="truncate text-neutral-400">{call.location} / {call.postal}</span>
              <span className={`rounded border px-2 py-0.5 ${statusClass(call.status)}`}>{call.status}</span>
              <span className="truncate text-neutral-300">{call.assignedUnits.join(", ") || "None"}</span>
              <span className="text-neutral-400">{call.age}</span>
              <span className="text-sky-300">Open</span>
            </button>
          ))}
        </div>
      </Panel>
      <CallDetailDrawer call={selectedCall} onStatusChange={onStatusChange} />
    </div>
  );
}

function CallDetailDrawer({
  call,
  onStatusChange,
}: {
  call: DispatchCall | null;
  onStatusChange: (id: string, status: CallStatus) => void;
}) {
  if (!call) return <Panel title="Call Detail"><UnderConstruction text="Select a call to open the detail drawer." /></Panel>;
  return (
    <Panel title={`${call.callNumber} Detail`}>
      <div className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Narrative</p>
          <p className="mt-2 text-sm leading-6 text-neutral-300">{call.narrative}</p>
        </div>
        <div className="grid gap-2 text-sm">
          <Info label="Caller" value={`${call.callerName} • ${call.callerNumber}`} />
          <Info label="Persons" value={call.involvedPersons || "None listed"} />
          <Info label="Vehicles" value={call.involvedVehicles || "None listed"} />
          <Info label="Suggested Units" value={call.suggestedUnits || "Awaiting dispatcher review"} />
        </div>
        <label className="block">
          <span className="text-xs font-medium text-neutral-400">Status Controls</span>
          <select
            value={call.status}
            onChange={(event) => onStatusChange(call.id, event.target.value as CallStatus)}
            className="mt-1 h-10 w-full rounded-md border border-white/10 bg-neutral-950 px-2 text-sm text-white"
          >
            {callStatuses.map((status) => <option key={status}>{status}</option>)}
          </select>
        </label>
        <Timeline title="Timeline" items={call.timeline} />
        <Timeline title="Notes" items={call.notes} />
        <UnderConstruction text="Unit assignment and note editing are Under Construction." />
      </div>
    </Panel>
  );
}

function CallCreationModule({
  form,
  onChange,
  onSubmit,
}: {
  form: CallFormState;
  onChange: (form: CallFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const types = incidentTypes[form.serviceType];
  return (
    <Panel title="Call-Taking Form">
      <form onSubmit={onSubmit} className="grid gap-4 xl:grid-cols-2">
        <Field label="Call source" value={form.callSource} onChange={(value) => onChange({ ...form, callSource: value })} />
        <Field label="Caller name" value={form.callerName} onChange={(value) => onChange({ ...form, callerName: value })} />
        <Field label="Caller number" value={form.callerNumber} onChange={(value) => onChange({ ...form, callerNumber: value })} />
        <Field label="Location" value={form.location} onChange={(value) => onChange({ ...form, location: value })} required />
        <Field label="Postal" value={form.postal} onChange={(value) => onChange({ ...form, postal: value })} required />
        <Select label="Service type" value={form.serviceType} options={serviceTypes} onChange={(value) => onChange({ ...form, serviceType: value as ServiceType, type: "" })} />
        <Select label="Call type" value={form.type} options={types} onChange={(value) => onChange({ ...form, type: value })} required />
        <Select label="Priority" value={form.priority} options={priorities} onChange={(value) => onChange({ ...form, priority: value as Priority })} />
        <Field label="Involved persons" value={form.involvedPersons} onChange={(value) => onChange({ ...form, involvedPersons: value })} />
        <Field label="Involved vehicles" value={form.involvedVehicles} onChange={(value) => onChange({ ...form, involvedVehicles: value })} />
        <Field label="Suggested units" value={form.suggestedUnits} onChange={(value) => onChange({ ...form, suggestedUnits: value })} />
        <label className="block xl:col-span-2">
          <span className="text-xs font-medium text-neutral-400">Narrative</span>
          <textarea
            value={form.narrative}
            onChange={(event) => onChange({ ...form, narrative: event.target.value })}
            required
            className="mt-1 min-h-32 w-full rounded-md border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-white"
          />
        </label>
        <div className="xl:col-span-2">
          <UnderConstruction text="Supabase dispatch_calls insertion is awaiting RLS-backed integration." />
          <button className="mt-3 min-h-11 rounded-md bg-sky-400 px-4 text-sm font-semibold text-neutral-950 hover:bg-sky-300">
            Open Call
          </button>
        </div>
      </form>
    </Panel>
  );
}

function UnitsModule({
  filter,
  onFilterChange,
  onStatusChange,
  units,
}: {
  filter: string;
  onFilterChange: (filter: string) => void;
  onStatusChange: (id: string, status: DispatchUnit["status"]) => void;
  units: DispatchUnit[];
}) {
  const filters = ["All", "Law Enforcement", "Fire", "EMS", "Tow", "Available", "Emergency"];
  const filtered = units.filter((unit) => {
    if (filter === "All") return true;
    if (filter === "Emergency") return unit.status === "Panic" || unit.status === "Signal 100";
    if (filter === "Available") return unit.status === "Available";
    return unit.type === filter;
  });
  return (
    <Panel title="Unit Status Monitor">
      <div className="mb-3 flex flex-wrap gap-2">
        {filters.map((item) => (
          <button key={item} onClick={() => onFilterChange(item)} className={`rounded-md border px-3 py-1 text-xs ${filter === item ? "border-sky-300/40 bg-sky-300/10 text-sky-100" : "border-white/10 text-neutral-400"}`}>
            {item}
          </button>
        ))}
      </div>
      <UnitTable units={filtered} onStatusChange={onStatusChange} />
    </Panel>
  );
}

function UnitTable({
  onStatusChange,
  units,
}: {
  onStatusChange?: (id: string, status: DispatchUnit["status"]) => void;
  units: DispatchUnit[];
}) {
  return (
    <div className="overflow-hidden rounded-md border border-white/10">
      <TableHeader columns={["Unit", "Agency", "Type", "Status", "Location", "Assigned Call", "Last Update", "Actions"]} />
      {units.map((unit) => (
        <div key={unit.id} className="grid grid-cols-[0.7fr_0.8fr_1fr_0.9fr_0.9fr_0.9fr_0.7fr_1fr] gap-3 border-t border-white/10 px-3 py-2 text-xs">
          <span className="font-mono text-white">{unit.unit}</span>
          <span className="text-neutral-300">{unit.agency}</span>
          <span className="text-neutral-400">{unit.type}</span>
          <span className={`rounded border px-2 py-0.5 ${statusClass(unit.status)}`}>{unit.status}</span>
          <span className="text-neutral-400">{unit.location}</span>
          <span className="text-neutral-300">{unit.assignedCall}</span>
          <span className="text-neutral-400">{unit.lastUpdate}</span>
          {onStatusChange ? (
            <div className="flex flex-col gap-1">
              {(unit.status === "Panic" || unit.status === "Signal 100") ? (
                <button
                  type="button"
                  onClick={() => onStatusChange(unit.id, "Available")}
                  className="rounded border border-emerald-300/30 bg-emerald-300/10 px-2 py-1 text-emerald-100 hover:bg-emerald-300/20"
                >
                  Clear Panic
                </button>
              ) : null}
              <select value={unit.status} onChange={(event) => onStatusChange(unit.id, event.target.value as DispatchUnit["status"])} className="rounded border border-white/10 bg-neutral-950 px-2 text-neutral-200">
                {["Available", "Busy", "Enroute", "On Scene", "Transporting", "At Hospital", "Requested", "Towing", "Complete", "Out of Service", "Panic", "Signal 100"].map((status) => <option key={status}>{status}</option>)}
              </select>
            </div>
          ) : <span className="text-neutral-500">Monitor</span>}
        </div>
      ))}
    </div>
  );
}

function FireEmsModule({ calls, units }: { calls: DispatchCall[]; units: DispatchUnit[] }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Panel title="Fire Operations">
        <CompactUnitTable units={units.filter((unit) => unit.type === "Fire")} />
        <Capability title="Fire Units" items={["Engine", "Ladder", "Rescue", "Battalion", "Brush", "Tender", "Fire command"]} />
        <Capability title="Fire Incident Types" items={incidentTypes.Fire} />
      </Panel>
      <Panel title="EMS Operations">
        <CompactUnitTable units={units.filter((unit) => unit.type === "EMS")} />
        <Capability title="EMS Units" items={["Medic", "Ambulance", "Supervisor", "Rescue", "Air medical placeholder"]} />
        <Capability title="EMS Incident Types" items={incidentTypes.EMS} />
      </Panel>
      <Panel title="Fire/EMS Active Calls" className="xl:col-span-2">
        {calls.filter((call) => call.serviceType === "Fire" || call.serviceType === "EMS").map((call) => (
          <div key={call.id} className="mb-2 rounded-md border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-neutral-300">
            {call.callNumber} • {call.type} • {call.location} • {call.status}
          </div>
        ))}
      </Panel>
    </div>
  );
}

function TowModule({ units }: { units: DispatchUnit[] }) {
  return (
    <Panel title="Tow Management">
      <CompactUnitTable units={units.filter((unit) => unit.type === "Tow")} />
      <Capability title="Tow Resources" items={["Standard tow", "Flatbed", "Heavy wrecker", "Impound", "Roadside assistance"]} />
      <Capability title="Tow Statuses" items={["Available", "Requested", "Enroute", "On Scene", "Towing", "Complete"]} />
      <UnderConstruction text="Tow request assignment and impound workflow are Awaiting Supabase/FiveM integration." />
    </Panel>
  );
}

function BoloModule({
  bolos,
  filter,
  onAddBolo,
  onFilterChange,
  onSearchChange,
  search,
}: {
  bolos: Bolo[];
  filter: string;
  onAddBolo: (event: FormEvent<HTMLFormElement>) => void;
  onFilterChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  search: string;
}) {
  const filtered = bolos.filter((bolo) => {
    const matchesFilter = filter === "All" || bolo.type === filter;
    const haystack = `${bolo.title} ${bolo.description} ${bolo.associated}`.toLowerCase();
    return matchesFilter && haystack.includes(search.toLowerCase());
  });
  return (
    <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
      <Panel title="Add BOLO">
        <form onSubmit={onAddBolo} className="space-y-3">
          <Field label="BOLO title" name="title" required />
          <Select label="Type" name="type" options={boloTypes} />
          <Select label="Priority" name="priority" options={priorities} />
          <Field label="Last known location" name="location" required />
          <Field label="Associated vehicle/person" name="associated" />
          <label className="block">
            <span className="text-xs font-medium text-neutral-400">Description</span>
            <textarea name="description" required className="mt-1 min-h-24 w-full rounded-md border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-white" />
          </label>
          <button className="min-h-10 rounded-md bg-sky-400 px-4 text-sm font-semibold text-neutral-950">Add BOLO</button>
        </form>
      </Panel>
      <Panel title="BOLO List">
        <div className="mb-3 grid gap-2 sm:grid-cols-2">
          <input value={search} onChange={(event) => onSearchChange(event.target.value)} className="h-10 rounded-md border border-white/10 bg-neutral-950 px-3 text-sm text-white" placeholder="Search BOLOs" />
          <select value={filter} onChange={(event) => onFilterChange(event.target.value)} className="h-10 rounded-md border border-white/10 bg-neutral-950 px-3 text-sm text-white">
            <option>All</option>
            {boloTypes.map((type) => <option key={type}>{type}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          {filtered.map((bolo) => (
            <div key={bolo.id} className="rounded-md border border-white/10 bg-neutral-950 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-white">{bolo.title}</h3>
                <span className={`rounded border px-2 py-1 text-xs ${priorityClass(bolo.priority)}`}>{bolo.priority}</span>
              </div>
              <p className="mt-2 text-sm text-neutral-300">{bolo.description}</p>
              <p className="mt-2 text-xs text-neutral-500">{bolo.type} • {bolo.lastKnownLocation} • {bolo.status}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function LookupModule({ onSearch, results }: { onSearch: (label: string, query: string) => void; results: CadLookupResult[] }) {
  const tabs = ["Name lookup", "License lookup", "Plate lookup", "Vehicle lookup", "Weapon lookup", "Warrant lookup", "BOLO lookup"];
  const [tab, setTab] = useState(tabs[0]);
  const [query, setQuery] = useState("");
  return (
    <Panel title="Lookup Terminal">
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button key={item} onClick={() => setTab(item)} className={`rounded-md border px-3 py-2 text-xs ${tab === item ? "border-sky-300/40 bg-sky-300/10 text-sky-100" : "border-white/10 text-neutral-400"}`}>{item}</button>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <input value={query} onChange={(event) => setQuery(event.target.value)} className="h-11 rounded-md border border-white/10 bg-neutral-950 px-3 text-white" placeholder={`Search ${tab.toLowerCase()}`} />
        <button onClick={() => onSearch(`${tab}: ${query || "empty query"}`, query)} className="h-11 rounded-md bg-sky-400 px-4 text-sm font-semibold text-neutral-950">Search</button>
      </div>
      <div className="mt-4 space-y-2">
        {results.length ? (
          results.map((result) => (
            <div key={`${result.source}-${result.id}`} className="rounded-md border border-white/10 bg-neutral-950 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-white">{result.label}</p>
                <span className="rounded border border-sky-300/30 bg-sky-300/10 px-2 py-1 text-xs text-sky-100">{result.source}</span>
              </div>
              <p className="mt-2 text-sm text-neutral-400">{result.meta || "No additional details"}</p>
            </div>
          ))
        ) : (
          <UnderConstruction text={`${tab} - No Supabase results for this query yet.`} />
        )}
      </div>
    </Panel>
  );
}

function ToneBoardModule({
  onClearSignal100,
  onPlayTone,
  onStop,
  onVolumeChange,
  playingTone,
  signal100Active,
  toneError,
  volume,
}: {
  onClearSignal100: () => void;
  onPlayTone: (tone: ToneConfig) => void;
  onStop: () => void;
  onVolumeChange: (value: number) => void;
  playingTone: string;
  signal100Active: boolean;
  toneError: string;
  volume: number;
}) {
  return (
    <Panel title="Tone Board">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-neutral-400">Station tones, EMS tone, panic alert, and Signal 100 audio.</p>
          {playingTone ? <p className="mt-1 text-sm font-semibold text-sky-200">Playing: {playingTone}</p> : null}
          {signal100Active ? <p className="mt-1 text-sm font-semibold text-rose-100">Signal 100 in effect. Low interval beep active.</p> : null}
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs text-neutral-400">Master</label>
          <input type="range" min="0" max="1" step="0.05" value={volume} onChange={(event) => onVolumeChange(Number(event.target.value))} />
          <button onClick={onStop} className="rounded-md border border-white/15 px-3 py-2 text-xs text-neutral-200 hover:bg-white/10">Stop Current</button>
          <button onClick={onClearSignal100} className="rounded-md border border-rose-300/35 bg-rose-400/10 px-3 py-2 text-xs text-rose-100 hover:bg-rose-400/20">Clear Signal 100</button>
        </div>
      </div>
      {toneError ? <div className="mb-4 rounded-md border border-rose-300/30 bg-rose-300/10 px-3 py-2 text-sm text-rose-100">{toneError}</div> : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {toneConfig.map((tone) => (
          <button
            key={tone.label}
            onClick={() => onPlayTone(tone)}
            className={`min-h-20 rounded-md border px-4 text-sm font-bold ${
              tone.critical
                ? "border-rose-300/40 bg-rose-400/15 text-rose-100"
                : tone.warning
                  ? "border-amber-300/35 bg-amber-300/10 text-amber-100"
                  : "border-sky-300/25 bg-sky-300/10 text-sky-100"
            } ${playingTone === tone.label ? "ring-2 ring-white/50" : ""}`}
          >
            <span className="block">{tone.label}</span>
            <span className="mt-1 block text-xs font-medium opacity-70">{Math.round(tone.volume * volume * 100)}% output</span>
          </button>
        ))}
      </div>
    </Panel>
  );
}

function MapModule() {
  return (
    <Panel title="FiveM Live Map Integration — Under Construction">
      <div className="relative min-h-[620px] overflow-hidden rounded-md border border-dashed border-sky-300/25 bg-neutral-950">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(56,189,248,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.08)_1px,transparent_1px)] bg-[size:32px_32px]" />
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
          <h2 className="text-3xl font-semibold text-white">FiveM Live Map Integration — Under Construction</h2>
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            {["Real-time unit GPS", "Active call markers", "Panic pings", "Fire/EMS/tow tracking", "Server integration"].map((item) => (
              <span key={item} className="rounded-md border border-white/10 bg-neutral-900/80 px-3 py-2 text-sm text-neutral-300">{item}</span>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}

function ActivityLogModule({ log }: { log: DispatchLogEntry[] }) {
  return <Panel title="Dispatch Log / Timeline"><LogList log={log} /></Panel>;
}

function SettingsModule() {
  return (
    <Panel title="Dispatch Settings">
      <UnderConstruction text="Channel configuration, agencies, unit templates, tone routing, and FiveM sync settings are Under Construction." />
    </Panel>
  );
}

function Panel({ children, className = "", title }: { children: React.ReactNode; className?: string; title: string }) {
  return (
    <section className={`rounded-lg border border-white/10 bg-neutral-900 ${className}`}>
      <div className="border-b border-white/10 px-4 py-3">
        <h2 className="text-base font-semibold text-white">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function CompactUnitTable({ units }: { units: DispatchUnit[] }) {
  return <UnitTable units={units} />;
}

function LogList({ log }: { log: DispatchLogEntry[] }) {
  return (
    <div className="space-y-2">
      {log.map((entry) => (
        <div key={entry.id} className="rounded-md border border-white/10 bg-neutral-950 p-3">
          <div className="flex justify-between gap-3 text-xs">
            <span className="font-mono text-sky-200">{entry.timestamp}</span>
            <span className="uppercase tracking-[0.14em] text-neutral-500">{entry.actor}</span>
          </div>
          <p className="mt-2 text-sm text-neutral-300">{entry.message}</p>
        </div>
      ))}
    </div>
  );
}

function Capability({ items, title }: { items: string[]; title: string }) {
  return (
    <div className="mt-4 rounded-md border border-white/10 bg-neutral-950 p-3">
      <p className="mb-2 text-xs uppercase tracking-[0.16em] text-neutral-500">{title}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => <span key={item} className="rounded border border-white/10 px-2 py-1 text-xs text-neutral-300">{item}</span>)}
      </div>
    </div>
  );
}

function UnderConstruction({ text }: { text: string }) {
  return <div className="rounded-md border border-dashed border-amber-300/25 bg-amber-300/[0.06] px-3 py-2 text-sm text-amber-100">{text}</div>;
}

function QuickAction({ label, onClick }: { label: string; onClick: () => void }) {
  return <button onClick={onClick} className="min-h-12 rounded-md border border-sky-300/25 bg-sky-300/10 px-3 text-sm font-semibold text-sky-100 hover:bg-sky-300/20">{label}</button>;
}

function Pill({ children, critical = false }: { children: React.ReactNode; critical?: boolean }) {
  return <span className={`rounded-md border px-2 py-1 ${critical ? "border-rose-300/30 bg-rose-300/10 text-rose-100" : "border-white/15 bg-white/[0.06] text-neutral-200"}`}>{children}</span>;
}

function TableHeader({ columns }: { columns: string[] }) {
  return (
    <div
      className="grid gap-3 bg-neutral-950 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-neutral-500"
      style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
    >
      {columns.map((column) => <span key={column}>{column}</span>)}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border border-white/10 bg-neutral-950 p-3"><p className="text-xs text-neutral-500">{label}</p><p className="mt-1 text-neutral-200">{value}</p></div>;
}

function Timeline({ items, title }: { items: string[]; title: string }) {
  return <div><p className="mb-2 text-xs uppercase tracking-[0.18em] text-neutral-500">{title}</p><div className="space-y-1">{items.map((item) => <p key={item} className="rounded border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-neutral-300">{item}</p>)}</div></div>;
}

function Field({
  label,
  name,
  onChange,
  required,
  value,
}: {
  label: string;
  name?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  value?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-neutral-400">{label}</span>
      <input name={name} value={value} onChange={(event) => onChange?.(event.target.value)} required={required} className="mt-1 h-10 w-full rounded-md border border-white/10 bg-neutral-950 px-3 text-sm text-white" />
    </label>
  );
}

function Select({
  label,
  name,
  onChange,
  options,
  required,
  value,
}: {
  label: string;
  name?: string;
  onChange?: (value: string) => void;
  options: readonly string[];
  required?: boolean;
  value?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-neutral-400">{label}</span>
      <select name={name} value={value} onChange={(event) => onChange?.(event.target.value)} required={required} className="mt-1 h-10 w-full rounded-md border border-white/10 bg-neutral-950 px-3 text-sm text-white">
        {!value ? <option value="">Select</option> : null}
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}
