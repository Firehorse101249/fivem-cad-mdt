"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createCivilianRmsRecord,
  dispatchBolosToMdt,
  dispatchCallsToMdt,
  dispatchUnitsToRoster,
  loadCadLookupDetail,
  loadDispatchData,
  removeDispatchUnitByCallsign,
  searchCadRecords,
  updateDispatchCallUnits,
  updateDispatchUnitStatus,
  upsertOfficerUnit,
  type CadLookupDetail,
  type CadLookupResult,
  type CadLookupScope,
  type RmsRecordType,
} from "@/app/_lib/cad-data";
import { getSupabaseBrowserClient } from "@/app/_lib/supabase-client";
import { toneConfig, type ToneConfig } from "@/components/dispatch/toneConfig";
import {
  agencyOptions,
  agencyUnitTypes,
  lookupTabs,
  officerModules,
  penalCode,
  policies,
  quickStatusButtons,
  statusOptions,
} from "./mockOfficerData";
import type { ActivityLogEntry, Agency, Bolo, LookupTab, MdtCall, MdtSession, OfficerModule, PenalCodeEntry, UnitRosterEntry, UnitStatus } from "./types";

const sessionKey = "sentinel-officer-mdt-session";
const toneById = Object.fromEntries(toneConfig.map((tone) => [tone.id, tone])) as Record<ToneConfig["id"], ToneConfig>;

type RmsAction = "Arrest Report" | "Citation" | "Field Interview" | "Fix-it Ticket" | "Incident Report" | "Warning";

type RmsSeed = {
  action: RmsAction;
  subject?: CadLookupDetail;
};

type RmsDraft = {
  action: RmsAction;
  callNumber: string;
  charges: PenalCodeEntry[];
  location: string;
  narrative: string;
  primarySubject: CadLookupDetail | null;
  reportNumber: string;
  status: "Draft" | "Submitted";
  suspects: string[];
  vehicles: string[];
  weapons: string[];
  witnesses: string[];
};

function nowTime() {
  return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000)}`;
}

function unlockBrowserAudio() {
  try {
    const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    const context = new AudioContextCtor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    gain.gain.value = 0;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.01);
    void context.resume();
  } catch {
    // Browser audio unlock is best-effort; visible sync notices handle failures later.
  }
}

function statusClass(status: string) {
  if (status === "Panic" || status === "Signal 100") return "border-rose-300/50 bg-rose-400/20 text-rose-100";
  if (status === "Available") return "border-emerald-300/35 bg-emerald-400/10 text-emerald-100";
  if (["Enroute", "On Scene", "Transporting", "Staging", "At Hospital"].includes(status)) {
    return "border-sky-300/35 bg-sky-400/10 text-sky-100";
  }
  if (["Busy", "Traffic Stop", "Rehab", "Requested", "Towing"].includes(status)) return "border-amber-300/35 bg-amber-300/10 text-amber-100";
  if (status === "Complete") return "border-emerald-300/35 bg-emerald-400/10 text-emerald-100";
  return "border-white/15 bg-white/[0.06] text-neutral-200";
}

function priorityClass(priority: string) {
  if (priority === "Critical") return "border-rose-300/50 bg-rose-400/20 text-rose-100";
  if (priority === "High") return "border-orange-300/40 bg-orange-300/10 text-orange-100";
  if (priority === "Medium") return "border-sky-300/30 bg-sky-300/10 text-sky-100";
  return "border-white/15 bg-white/[0.06] text-neutral-300";
}

function isSupervisor(session: MdtSession) {
  return session.unitType === "Supervisor" || session.unitType === "Battalion";
}

function chargeTotals(charges: PenalCodeEntry[]) {
  return charges.reduce(
    (totals, charge) => ({
      fine: totals.fine + Number(charge.fine.replace(/[^0-9.]/g, "") || 0),
      months: totals.months + Number(charge.jailTime.replace(/[^0-9.]/g, "") || 0),
    }),
    { fine: 0, months: 0 },
  );
}

function rmsRecordType(action: RmsAction): RmsRecordType {
  if (action === "Arrest Report") return "Arrest history";
  if (action === "Citation" || action === "Fix-it Ticket") return "Citation history";
  if (action === "Warning") return "Warning history";
  return "Notes/history";
}

export function OfficerMdt() {
  const [session, setSession] = useState<MdtSession | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [module, setModule] = useState<OfficerModule>("home");
  const [status, setStatus] = useState<UnitStatus>("Available");
  const [calls, setCalls] = useState<MdtCall[]>([]);
  const [selectedCallId, setSelectedCallId] = useState("");
  const [bolos, setBolos] = useState<Bolo[]>([]);
  const [roster, setRoster] = useState<UnitRosterEntry[]>([]);
  const [lookupResults, setLookupResults] = useState<CadLookupResult[]>([]);
  const [lookupDetail, setLookupDetail] = useState<CadLookupDetail | null>(null);
  const [lookupNotice, setLookupNotice] = useState("Search a person, plate, license, BOLO, warrant, or weapon.");
  const [rmsSeed, setRmsSeed] = useState<RmsSeed>({ action: "Incident Report" });
  const [rmsNotice, setRmsNotice] = useState("RMS drafts save to the selected civilian profile history.");
  const [unitRowId, setUnitRowId] = useState("");
  const [userId, setUserId] = useState("");
  const [syncNotice, setSyncNotice] = useState("Loading Supabase CAD data...");
  const [panicArmed, setPanicArmed] = useState(false);
  const [panicActive, setPanicActive] = useState(false);
  const [signal100Active, setSignal100Active] = useState(false);
  const [signal100BeepActive, setSignal100BeepActive] = useState(false);
  const [log, setLog] = useState<ActivityLogEntry[]>([
    { id: "log-1", message: "MDT interface ready. Awaiting Supabase/FiveM integration.", module: "System", timestamp: nowTime() },
  ]);
  const audioClientIdRef = useRef(makeId("mdt-audio"));
  const audioChannelRef = useRef<RealtimeChannel | null>(null);
  const audioRefs = useRef<HTMLAudioElement[]>([]);
  const beepContextRef = useRef<AudioContext | null>(null);

  function addLog(message: string, logModule = "MDT") {
    setLog((current) => [{ id: makeId("log"), message, module: logModule, timestamp: nowTime() }, ...current]);
  }

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    async function refresh() {
      if (!supabase) {
        setSyncNotice("Supabase is not configured. MDT is running without live CAD data.");
        return;
      }
      const data = await loadDispatchData(supabase);
      const nextCalls = dispatchCallsToMdt(data.calls);
      setCalls(nextCalls);
      setBolos(dispatchBolosToMdt(data.bolos));
      setRoster(dispatchUnitsToRoster(data.units));
      setSelectedCallId((current) => current || nextCalls[0]?.id || "");
      setSyncNotice("Active calls, BOLOs, and unit roster are synced with Supabase.");
    }

    queueMicrotask(() => {
      const stored = window.localStorage.getItem(sessionKey);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as MdtSession;
          setSession(parsed);
          setStatus("Available");
        } catch {
          window.localStorage.removeItem(sessionKey);
        }
      }
      queueMicrotask(async () => {
        if (supabase) {
          const { data } = await supabase.auth.getUser();
          setUserId(data.user?.id ?? "");
        }
        try {
          await refresh();
        } catch (error) {
          setSyncNotice(error instanceof Error ? error.message : "Could not load Supabase MDT data.");
        } finally {
          setHydrated(true);
        }
      });
    });

    if (!supabase) return;
    const channel = supabase
      .channel("officer-mdt-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "dispatch_calls" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "dispatch_units" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "bolos" }, () => void refresh())
      .subscribe();
    const intervalId = window.setInterval(() => void refresh(), 2500);

    return () => {
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
    };
  }, []);

  const selectedCall = calls.find((call) => call.id === selectedCallId) ?? calls[0] ?? null;

  useEffect(() => {
    if (!session) return;
    const currentUnit = roster.find((unit) => (unitRowId && unit.id === unitRowId) || unit.callsign === session.callsign);
    if (!currentUnit) return;
    if (!unitRowId || unitRowId !== currentUnit.id) {
      queueMicrotask(() => setUnitRowId(currentUnit.id));
    }
    if (currentUnit.status === "Panic") {
      queueMicrotask(() => {
        setPanicActive(true);
        setSignal100Active(true);
        setStatus("Panic");
      });
      return;
    }
    if (panicActive) {
      queueMicrotask(() => {
        setPanicActive(false);
        setPanicArmed(false);
        setStatus(currentUnit.status);
        setLog((current) => [{ id: makeId("log"), message: "Dispatcher cleared this unit's panic status.", module: "Panic", timestamp: nowTime() }, ...current]);
      });
      return;
    }
    if (currentUnit.status !== status) {
      queueMicrotask(() => {
        setStatus(currentUnit.status);
        setLog((current) => [
          { id: makeId("log"), message: `Dispatcher changed this unit's status to ${currentUnit.status}.`, module: "Status", timestamp: nowTime() },
          ...current,
        ]);
      });
    }
    if (currentUnit.callsign !== session.callsign) {
      queueMicrotask(() => {
        const nextSession = { ...session, callsign: currentUnit.callsign };
        setSession(nextSession);
        window.localStorage.setItem(sessionKey, JSON.stringify(nextSession));
      });
    }
  }, [panicActive, roster, session, status, unitRowId]);

  useEffect(() => {
    const hasSignal100 = roster.some((unit) => unit.status === "Panic" || unit.status === "Signal 100");
    if (!hasSignal100) return;
    queueMicrotask(() => setSignal100Active(true));
  }, [roster]);

  async function startSession(nextSession: MdtSession) {
    window.localStorage.setItem(sessionKey, JSON.stringify(nextSession));
    setSession(nextSession);
    setStatus("Available");
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      try {
        const id = await upsertOfficerUnit(supabase, nextSession, "Available", userId);
        setUnitRowId(id);
        setSyncNotice("Unit is on duty and synced to dispatch_units.");
      } catch (error) {
        setSyncNotice(error instanceof Error ? error.message : "Could not sync unit duty status.");
      }
    }
    addLog(`${nextSession.callsign} logged into MDT as ${nextSession.agency} ${nextSession.unitType}.`, "Login");
  }

  async function endSession() {
    const endingSession = session;
    window.localStorage.removeItem(sessionKey);
    setSession(null);
    setPanicActive(false);
    setPanicArmed(false);
    setModule("home");
    if (endingSession) {
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        try {
          await removeDispatchUnitByCallsign(supabase, endingSession.callsign);
        } catch (error) {
          setSyncNotice(error instanceof Error ? error.message : "Could not remove unit from dispatch roster.");
        }
      }
    }
  }

  async function changeStatus(nextStatus: UnitStatus, options: { playPanicTone?: boolean } = {}) {
    setStatus(nextStatus);
    const supabase = getSupabaseBrowserClient();
    if (supabase && session) {
      try {
        const id = unitRowId || await upsertOfficerUnit(supabase, session, nextStatus, userId);
        setUnitRowId(id);
        await updateDispatchUnitStatus(supabase, id, nextStatus);
      } catch (error) {
        setSyncNotice(error instanceof Error ? error.message : "Could not sync unit status.");
      }
    }
    if (nextStatus === "Panic") {
      setPanicActive(true);
      setModule("panic");
      if (options.playPanicTone !== false) {
        void triggerPanicSequence(session?.callsign ?? "Field unit");
      }
      addLog("Panic status activated and synced to dispatch_units.", "Panic");
      return;
    }
    addLog(`Status changed to ${nextStatus}.`, "Status");
  }

  async function attachToCall(call: MdtCall) {
    if (!session) return;
    const nextUnits = call.units.includes(session.callsign) ? call.units : [...call.units, session.callsign];
    setCalls((current) =>
      current.map((item) =>
        item.id === call.id && !item.units.includes(session.callsign)
          ? { ...item, status: "Assigned", units: [...item.units, session.callsign], notes: [`${nowTime()} ${session.callsign} attached`, ...item.notes] }
          : item,
      ),
    );
    setSelectedCallId(call.id);
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      try {
        await updateDispatchCallUnits(supabase, call, nextUnits);
      } catch (error) {
        setSyncNotice(error instanceof Error ? error.message : "Could not sync call attachment.");
      }
    }
    addLog(`Attached to ${call.callNumber}.`, "Active Calls");
  }

  async function detachFromCall(call: MdtCall) {
    if (!session) return;
    const nextUnits = call.units.filter((unit) => unit !== session.callsign);
    setCalls((current) =>
      current.map((item) =>
        item.id === call.id
          ? { ...item, units: item.units.filter((unit) => unit !== session.callsign), notes: [`${nowTime()} ${session.callsign} detached`, ...item.notes] }
          : item,
      ),
    );
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      try {
        await updateDispatchCallUnits(supabase, call, nextUnits);
      } catch (error) {
        setSyncNotice(error instanceof Error ? error.message : "Could not sync call detachment.");
      }
    }
    addLog(`Detached from ${call.callNumber}.`, "Active Calls");
  }

  const stopAudio = useCallback(() => {
    audioRefs.current.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
    audioRefs.current = [];
  }, []);

  const playEmergencyAudio = useCallback(async (tone: ToneConfig) => {
    stopAudio();
    const audio = new Audio(tone.path);
    audio.volume = Math.min(1, Math.max(0, tone.volume * 0.9));
    audioRefs.current = [audio];
    try {
      await new Promise<void>((resolve, reject) => {
        audio.onended = () => resolve();
        audio.onerror = () => reject(new Error(`${tone.label} audio could not play.`));
        void audio.play().catch(reject);
      });
    } catch {
      setSyncNotice(`${tone.label} audio could not play in this browser.`);
    }
  }, [stopAudio]);

  const broadcastAudioEvent = useCallback(async (event: "panic" | "signal-100" | "tone", payload: Record<string, unknown>) => {
    const channel = audioChannelRef.current;
    if (!channel) return;
    await channel.send({
      event,
      payload: { ...payload, source: audioClientIdRef.current },
      type: "broadcast",
    });
  }, []);

  const startSignal100Sequence = useCallback(async (broadcast = true) => {
    setSignal100Active(true);
    setSignal100BeepActive(false);
    if (broadcast) {
      void broadcastAudioEvent("signal-100", { active: true });
    }
    await playEmergencyAudio(toneById["signal-100"]);
    setSignal100BeepActive(true);
  }, [broadcastAudioEvent, playEmergencyAudio]);

  const triggerPanicSequence = useCallback(async (unitLabel: string, broadcast = true) => {
    setSignal100Active(true);
    setSignal100BeepActive(false);
    if (broadcast) {
      void broadcastAudioEvent("panic", { unitLabel });
    }
    await playEmergencyAudio(toneById.panic);
    await playEmergencyAudio(toneById["signal-100"]);
    setSignal100BeepActive(true);
  }, [broadcastAudioEvent, playEmergencyAudio]);

  async function activatePanic() {
    setPanicActive(true);
    setPanicArmed(false);
    void triggerPanicSequence(session?.callsign ?? "Field unit");
    await changeStatus("Panic", { playPanicTone: false });
    addLog("Emergency panic activated and synced to dispatch.", "Panic");
  }

  useEffect(() => {
    if (!signal100BeepActive) return;

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
        gain.gain.value = 0.03;
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.16);
      } catch {
        setSyncNotice("Signal 100 interval beep could not play in this browser.");
      }
    };

    let intervalId = 0;
    const timeoutId = window.setTimeout(() => {
      playIntervalBeep();
      intervalId = window.setInterval(playIntervalBeep, 5000);
    }, 5000);
    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [signal100BeepActive]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const channel = supabase
      .channel("cad-audio-events")
      .on("broadcast", { event: "tone" }, ({ payload }) => {
        const event = payload as { source?: string; toneId?: ToneConfig["id"] };
        if (event.source === audioClientIdRef.current || !event.toneId) return;
        const tone = toneById[event.toneId];
        if (!tone) return;
        if (tone.id === "signal-100") {
          void startSignal100Sequence(false);
        } else {
          void playEmergencyAudio(tone);
        }
      })
      .on("broadcast", { event: "panic" }, ({ payload }) => {
        const event = payload as { source?: string; unitLabel?: string };
        if (event.source === audioClientIdRef.current) return;
        void triggerPanicSequence(event.unitLabel || "Field unit", false);
      })
      .on("broadcast", { event: "signal-100" }, ({ payload }) => {
        const event = payload as { active?: boolean; source?: string };
        if (event.source === audioClientIdRef.current) return;
        if (event.active) {
          void startSignal100Sequence(false);
        } else {
          setSignal100Active(false);
          setSignal100BeepActive(false);
        }
      })
      .subscribe();
    audioChannelRef.current = channel;

    return () => {
      audioChannelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [playEmergencyAudio, startSignal100Sequence, triggerPanicSequence]);

  async function runLookup(scope: CadLookupScope, label: string, query: string) {
    addLog(`Lookup submitted: ${label}.`, "Lookups");
    const normalized = query.trim();
    if (!normalized) {
      setLookupResults([]);
      setLookupNotice("Enter a lookup query before searching.");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setSyncNotice("Supabase is not configured. Lookups are unavailable.");
      setLookupNotice("Supabase is not configured. Lookups are unavailable.");
      return;
    }
    try {
      const results = await searchCadRecords(supabase, normalized, scope);
      setLookupResults(results);
      setLookupNotice(results.length ? `${results.length} matching record${results.length === 1 ? "" : "s"} found.` : "No matching Supabase records found.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not run lookup.";
      setLookupNotice(message);
      setSyncNotice(message);
    }
  }

  async function openLookupResult(result: CadLookupResult) {
    if (!result.civilianId) {
      setLookupNotice(`${result.source} result is not tied to a civilian profile yet.`);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setLookupNotice("Supabase is not configured. Profile detail is unavailable.");
      return;
    }

    try {
      const detail = await loadCadLookupDetail(supabase, result.civilianId);
      setLookupDetail(detail);
      setLookupNotice(`Opened ${detail.civilian.first_name} ${detail.civilian.last_name}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not open profile detail.";
      setLookupNotice(message);
      setSyncNotice(message);
    }
  }

  function startRmsFromLookup(action: RmsAction, subject = lookupDetail) {
    setRmsSeed({ action, subject: subject ?? undefined });
    setRmsNotice(subject ? `${action} started for ${subject.civilian.first_name} ${subject.civilian.last_name}.` : `${action} started.`);
    setModule("reports");
  }

  async function saveRmsDraft(draft: RmsDraft) {
    if (!draft.primarySubject) {
      setRmsNotice("Select a primary subject before saving to a profile.");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setRmsNotice("Supabase is not configured. RMS records cannot be saved.");
      return;
    }

    const totals = chargeTotals(draft.charges);
    const recordType = rmsRecordType(draft.action);
    const subject = draft.primarySubject.civilian;
    const title = `${draft.action} ${draft.reportNumber}`;
    const description = [
      `Subject: ${subject.first_name} ${subject.last_name}`,
      draft.location ? `Location: ${draft.location}` : "",
      draft.callNumber ? `Call: ${draft.callNumber}` : "",
      draft.charges.length ? `Charges: ${draft.charges.map((charge) => `${charge.section} ${charge.charge}`).join("; ")}` : "",
      totals.fine ? `Fine total: $${totals.fine.toLocaleString("en-US")}` : "",
      totals.months ? `Custody total: ${totals.months} months` : "",
      draft.narrative,
    ].filter(Boolean).join("\n");

    try {
      await createCivilianRmsRecord(supabase, {
        civilianId: subject.id,
        createdBy: userId,
        description,
        metadata: {
          action: draft.action,
          callNumber: draft.callNumber,
          charges: draft.charges,
          fineTotal: totals.fine,
          jailMonthsTotal: totals.months,
          location: draft.location,
          reportNumber: draft.reportNumber,
          suspects: draft.suspects,
          vehicles: draft.vehicles,
          weapons: draft.weapons,
          witnesses: draft.witnesses,
        },
        recordType,
        title,
      });
      const updatedDetail = await loadCadLookupDetail(supabase, subject.id);
      setLookupDetail(updatedDetail);
      setRmsNotice(`${title} saved to ${subject.first_name} ${subject.last_name}'s profile.`);
      addLog(`${title} saved to civilian profile.`, "Reports");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save RMS record.";
      setRmsNotice(message);
      setSyncNotice(message);
    }
  }

  const effectiveRmsSeed = useMemo<RmsSeed>(() => {
    if (module === "citations") return { action: "Citation", subject: lookupDetail ?? undefined };
    if (module === "arrests") return { action: "Arrest Report", subject: lookupDetail ?? undefined };
    return rmsSeed;
  }, [lookupDetail, module, rmsSeed]);

  if (!hydrated) {
    return <div className="min-h-screen bg-neutral-950 p-6 text-neutral-300">Loading MDT terminal...</div>;
  }

  if (!session) return <MdtLogin onSubmit={startSession} />;

  const visibleModules = officerModules.filter((item) => item.agencies.includes(session.agency));
  const assignedCall = calls.find((call) => call.units.includes(session.callsign)) ?? null;

  return (
    <div className={`min-h-screen bg-[#07090c] text-neutral-100 ${panicActive || signal100Active ? "ring-4 ring-inset ring-rose-500/70" : ""}`}>
      {signal100Active ? <Signal100Banner /> : null}
      <div className="grid min-h-screen xl:grid-cols-[64px_1fr]">
        <aside className="group/sidebar relative z-30 border-b border-white/10 bg-neutral-950 transition-all duration-200 xl:w-16 xl:overflow-hidden xl:border-b-0 xl:border-r xl:hover:w-64 xl:focus-within:w-64">
          <div className="border-b border-white/10 p-3 xl:w-64">
            <div className="flex min-h-10 items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-md bg-sky-400/10 text-sm font-bold text-sky-200 ring-1 ring-sky-400/30">MD</span>
              <div className="transition-opacity xl:opacity-0 xl:group-hover/sidebar:opacity-100 xl:group-focus-within/sidebar:opacity-100">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">Sentinel CAD</p>
                <h1 className="mt-1 text-lg font-semibold text-white">MDT</h1>
              </div>
            </div>
            <p className="mt-2 font-mono text-xs text-neutral-500 transition-opacity xl:opacity-0 xl:group-hover/sidebar:opacity-100 xl:group-focus-within/sidebar:opacity-100">{session.callsign} / {session.agency}</p>
          </div>
          <nav className="flex gap-2 overflow-x-auto p-3 xl:block xl:w-64 xl:space-y-1 xl:overflow-visible">
            {visibleModules.map((item) => (
              <button
                key={item.id}
                type="button"
                title={item.label}
                onClick={() => setModule(item.id)}
                className={`flex min-h-10 w-full shrink-0 items-center gap-3 rounded-md px-2 text-left text-sm font-medium ${
                  module === item.id
                    ? item.id === "panic"
                      ? "bg-rose-500 text-white"
                      : "bg-sky-400 text-neutral-950"
                    : item.id === "panic"
                      ? "border border-rose-300/35 bg-rose-400/10 text-rose-100 hover:bg-rose-400/20"
                      : "text-neutral-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded bg-white/[0.06] text-xs font-bold">{item.label.slice(0, 2).toUpperCase()}</span>
                <span className="transition-opacity xl:opacity-0 xl:group-hover/sidebar:opacity-100 xl:group-focus-within/sidebar:opacity-100">{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <div className="min-w-0">
          <TopStatusBar onEndSession={endSession} panicActive={panicActive} session={session} status={status} syncNotice={syncNotice} />
          <main className="h-[calc(100vh-88px)] overflow-y-auto p-4">
            {module === "home" ? (
              <HomeDashboard
                assignedCall={assignedCall}
                onModuleChange={setModule}
                onStatusChange={changeStatus}
                panicActive={panicActive}
                bolos={bolos}
                calls={calls}
                session={session}
                status={status}
              />
            ) : null}
            {module === "active-calls" ? (
              <ActiveCalls calls={calls} onAttach={attachToCall} onDetach={detachFromCall} onSelect={setSelectedCallId} selectedCall={selectedCall} session={session} />
            ) : null}
            {module === "my-status" ? <MyStatus agency={session.agency} onStatusChange={changeStatus} status={status} /> : null}
            {module === "lookups" ? (
              <Lookups
                detail={lookupDetail}
                notice={lookupNotice}
                onSearch={runLookup}
                onSelectResult={openLookupResult}
                onStartRms={startRmsFromLookup}
                results={lookupResults}
              />
            ) : null}
            {module === "reports" ? (
              <RmsWriter
                activeCall={selectedCall}
                key={`${effectiveRmsSeed.action}-${effectiveRmsSeed.subject?.civilian.id ?? "none"}-${selectedCall?.id ?? "no-call"}`}
                notice={rmsNotice}
                onSave={saveRmsDraft}
                seed={effectiveRmsSeed}
                selectedLookup={lookupDetail}
              />
            ) : null}
            {module === "citations" ? (
              <RmsWriter activeCall={selectedCall} key={`${effectiveRmsSeed.action}-${effectiveRmsSeed.subject?.civilian.id ?? "none"}-${selectedCall?.id ?? "no-call"}`} notice={rmsNotice} onSave={saveRmsDraft} seed={effectiveRmsSeed} selectedLookup={lookupDetail} />
            ) : null}
            {module === "arrests" ? (
              <RmsWriter activeCall={selectedCall} key={`${effectiveRmsSeed.action}-${effectiveRmsSeed.subject?.civilian.id ?? "none"}-${selectedCall?.id ?? "no-call"}`} notice={rmsNotice} onSave={saveRmsDraft} seed={effectiveRmsSeed} selectedLookup={lookupDetail} />
            ) : null}
            {module === "warrants" ? <Warrants bolos={bolos} /> : null}
            {module === "bolos" ? <Bolos bolos={bolos} /> : null}
            {module === "penal-code" ? <PenalCode /> : null}
            {module === "department-policies" ? <Policies /> : null}
            {module === "supervisor-panel" ? <SupervisorPanel allowed={isSupervisor(session)} calls={calls} panicActive={panicActive} roster={roster} /> : null}
            {module === "panic" ? (
              <PanicPanel active={panicActive} armed={panicArmed} onArm={() => setPanicArmed(true)} onCancel={() => setPanicArmed(false)} onConfirm={activatePanic} />
            ) : null}
            {module === "settings" ? <Settings /> : null}
            <section className="mt-4">
              <Panel title="Activity Log">
                <LogList log={log} />
              </Panel>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

function MdtLogin({ onSubmit }: { onSubmit: (session: MdtSession) => void | Promise<void> }) {
  const [agency, setAgency] = useState<Agency>("Law Enforcement");
  const [callsign, setCallsign] = useState("");
  const [officerName, setOfficerName] = useState("");
  const [unitType, setUnitType] = useState(agencyUnitTypes["Law Enforcement"][0]);
  const [loggingIn, setLoggingIn] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!callsign.trim()) return;
    unlockBrowserAudio();
    setLoggingIn(true);
    window.setTimeout(() => {
      void onSubmit({
        agency,
        callsign: callsign.trim().toUpperCase(),
        officerName: officerName.trim() || "Field Unit",
        shiftStartedAt: nowTime(),
        unitType,
      });
    }, 650);
  }

  function setNextAgency(nextAgency: Agency) {
    setAgency(nextAgency);
    setUnitType(agencyUnitTypes[nextAgency][0]);
  }

  return (
    <div className="min-h-screen bg-[#06080b] px-4 py-6 text-neutral-100">
      <div className="mx-auto flex min-h-[calc(100vh-48px)] max-w-6xl items-center">
        <div className="grid w-full gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="border border-white/10 bg-neutral-950 p-5 shadow-2xl shadow-black/40">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">Mobile Data Terminal</p>
            <h1 className="mt-3 text-3xl font-semibold text-white">Log Into MDT</h1>
            <p className="mt-3 text-sm leading-6 text-neutral-400">
              Unit setup opens a Supabase-backed duty row for dispatch visibility. FiveM duty bridge integration is still pending.
            </p>
            <div className="mt-6 grid gap-3 text-sm">
              <Info label="Terminal" value="In-car MDT workstation" />
              <Info label="Network" value="Supabase CAD sync" />
              <Info label="Shift Control" value="Go On Duty syncs the unit roster" />
            </div>
          </section>

          <form onSubmit={submit} className="border border-white/10 bg-neutral-900 p-5 shadow-2xl shadow-black/40">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block md:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">Callsign / Unit Number</span>
                <input
                  value={callsign}
                  onChange={(event) => setCallsign(event.target.value)}
                  required
                  className="mt-2 h-12 w-full border border-white/10 bg-neutral-950 px-3 font-mono text-lg text-white"
                  placeholder="2L-14"
                />
              </label>
              <label className="block md:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">Officer Name</span>
                <input
                  value={officerName}
                  onChange={(event) => setOfficerName(event.target.value)}
                  className="mt-2 h-11 w-full border border-white/10 bg-neutral-950 px-3 text-sm text-white"
                  placeholder="Last, First"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">Agency</span>
                <select value={agency} onChange={(event) => setNextAgency(event.target.value as Agency)} className="mt-2 h-11 w-full border border-white/10 bg-neutral-950 px-3 text-sm text-white">
                  {agencyOptions.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">Sub-unit Type</span>
                <select value={unitType} onChange={(event) => setUnitType(event.target.value as typeof unitType)} className="mt-2 h-11 w-full border border-white/10 bg-neutral-950 px-3 text-sm text-white">
                  {agencyUnitTypes[agency].map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="submit" className="min-h-12 bg-sky-400 px-5 text-sm font-bold text-neutral-950 hover:bg-sky-300">
                {loggingIn ? "Logging into MDT..." : "Go On Duty"}
              </button>
              <button type="button" className="min-h-12 border border-white/15 px-5 text-sm font-semibold text-neutral-200 hover:bg-white/10">
                Shift Start
              </button>
            </div>
            <p className="mt-4 border border-dashed border-amber-300/25 bg-amber-300/[0.06] px-3 py-2 text-sm text-amber-100">
              FiveM duty bridge -- Under Construction
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

function TopStatusBar({
  onEndSession,
  panicActive,
  session,
  status,
  syncNotice,
}: {
  onEndSession: () => void;
  panicActive: boolean;
  session: MdtSession;
  status: UnitStatus;
  syncNotice: string;
}) {
  return (
    <header className="border-b border-white/10 bg-neutral-900 px-4 py-3">
      <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-neutral-500">Terminal Session / {session.shiftStartedAt}</p>
          <h2 className="text-xl font-semibold text-white">{session.callsign} - {session.officerName}</h2>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Pill>{session.agency}</Pill>
          <Pill>{session.unitType}</Pill>
          <Pill className={statusClass(status)}>{status}</Pill>
          <Pill className={panicActive ? "border-rose-300/50 bg-rose-400/20 text-rose-100" : ""}>{panicActive ? "PANIC ACTIVE" : "Panic clear"}</Pill>
          <Pill>{syncNotice}</Pill>
          <button onClick={onEndSession} className="rounded-md border border-white/15 px-3 py-1 text-neutral-300 hover:bg-white/10">End Shift</button>
        </div>
      </div>
    </header>
  );
}

function Signal100Banner() {
  return (
    <div className="border-b border-rose-300/40 bg-rose-600 px-4 py-2 text-center text-sm font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-rose-950/40">
      Signal 100 In Effect
    </div>
  );
}

function HomeDashboard({
  assignedCall,
  bolos,
  calls,
  onModuleChange,
  onStatusChange,
  panicActive,
  session,
  status,
}: {
  assignedCall: MdtCall | null;
  bolos: Bolo[];
  calls: MdtCall[];
  onModuleChange: (module: OfficerModule) => void;
  onStatusChange: (status: UnitStatus) => void | Promise<void>;
  panicActive: boolean;
  session: MdtSession;
  status: UnitStatus;
}) {
  const alerts = [
    ...calls.filter((call) => call.priority === "Critical" && (call.serviceType === session.agency || call.serviceType === "Multi-agency")),
    ...(panicActive ? [{ callNumber: "PANIC", incidentType: "Unit emergency", address: "Current GPS pending FiveM sync" } as MdtCall] : []),
  ];

  return (
    <div className="grid gap-4 2xl:grid-cols-[1.1fr_0.9fr]">
      <Panel title="Unit Dashboard">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Info label="Callsign" value={session.callsign} />
          <Info label="Agency / Type" value={`${session.agency} / ${session.unitType}`} />
          <Info label="Current Status" value={status} />
          <Info label="Assigned Call" value={assignedCall?.callNumber ?? "No active assignment"} />
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {quickStatusButtons.map((item) => (
            <button key={item} onClick={() => onStatusChange(item)} className={`min-h-12 rounded-md border px-3 text-sm font-semibold ${item === "Panic" ? "border-rose-300/40 bg-rose-400/15 text-rose-100" : "border-sky-300/25 bg-sky-300/10 text-sky-100 hover:bg-sky-300/20"}`}>
              {item}
            </button>
          ))}
        </div>
      </Panel>
      <Panel title="Priority Alerts">
        <div className="space-y-2">
          {alerts.length ? alerts.map((alert) => (
            <button key={alert.callNumber} onClick={() => onModuleChange("active-calls")} className="block w-full rounded-md border border-rose-300/35 bg-rose-400/10 px-3 py-2 text-left text-sm text-rose-100">
              <span className="font-mono">{alert.callNumber}</span> - {alert.incidentType} / {alert.address}
            </button>
          )) : <Notice text="No priority alerts." />}
        </div>
      </Panel>
      <Panel title="Recent BOLOs">
        <BoloList bolos={bolos} compact />
      </Panel>
      <Panel title="Assigned Call Detail">
        {assignedCall ? <CallDetail call={assignedCall} /> : <Notice text="No assigned call. Open Active Calls to attach to a call." />}
      </Panel>
    </div>
  );
}

function ActiveCalls({
  calls,
  onAttach,
  onDetach,
  onSelect,
  selectedCall,
  session,
}: {
  calls: MdtCall[];
  onAttach: (call: MdtCall) => void;
  onDetach: (call: MdtCall) => void;
  onSelect: (id: string) => void;
  selectedCall: MdtCall | null;
  session: MdtSession;
}) {
  const filtered = calls.filter((call) => call.serviceType === session.agency || call.serviceType === "Multi-agency");
  return (
    <div className="grid gap-4 2xl:grid-cols-[1fr_390px]">
      <Panel title="Officer Call Queue">
        <div className="space-y-2">
          {filtered.map((call) => (
            <button key={call.id} onClick={() => onSelect(call.id)} className="grid w-full gap-2 rounded-md border border-white/10 bg-neutral-950 px-3 py-3 text-left text-sm hover:bg-white/[0.06] lg:grid-cols-[0.8fr_0.7fr_1fr_1.3fr_0.7fr]">
              <span className="font-mono text-white">{call.callNumber}</span>
              <span className={`rounded border px-2 py-1 text-xs ${priorityClass(call.priority)}`}>{call.priority}</span>
              <span className="text-neutral-300">{call.incidentType}</span>
              <span className="truncate text-neutral-400">{call.address}</span>
              <span className={`rounded border px-2 py-1 text-xs ${statusClass(call.status)}`}>{call.status}</span>
            </button>
          ))}
        </div>
      </Panel>
      <Panel title="Call Detail">
        {selectedCall ? (
          <div className="space-y-4">
            <CallDetail call={selectedCall} />
            <div className="grid gap-2 sm:grid-cols-2">
              <button onClick={() => onAttach(selectedCall)} className="min-h-11 rounded-md bg-sky-400 px-3 text-sm font-bold text-neutral-950">Attach</button>
              <button onClick={() => onDetach(selectedCall)} className="min-h-11 rounded-md border border-white/15 px-3 text-sm font-semibold text-neutral-200 hover:bg-white/10">Detach</button>
            </div>
            <Notice text="Add notes and live dispatcher updates are Awaiting Supabase/FiveM integration." />
          </div>
        ) : <Notice text="Select a call to view details." />}
      </Panel>
    </div>
  );
}

function MyStatus({ agency, onStatusChange, status }: { agency: Agency; onStatusChange: (status: UnitStatus) => void; status: UnitStatus }) {
  return (
    <Panel title="My Status">
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <Info label="Current Status" value={status} />
        <Info label="GPS / AVL" value="Awaiting Supabase/FiveM integration" />
        <Info label="Duty Timer" value="Local session only" />
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {statusOptions[agency].map((item) => (
          <button key={item} onClick={() => onStatusChange(item)} className={`min-h-12 rounded-md border px-3 text-sm font-semibold ${status === item ? statusClass(item) : "border-white/10 bg-neutral-950 text-neutral-300 hover:bg-white/10"}`}>
            {item}
          </button>
        ))}
      </div>
    </Panel>
  );
}

function Lookups({
  detail,
  notice,
  onSearch,
  onSelectResult,
  onStartRms,
  results,
}: {
  detail: CadLookupDetail | null;
  notice: string;
  onSearch: (scope: CadLookupScope, label: string, query: string) => void;
  onSelectResult: (result: CadLookupResult) => void;
  onStartRms: (action: RmsAction, subject?: CadLookupDetail | null) => void;
  results: CadLookupResult[];
}) {
  const [tab, setTab] = useState<LookupTab>("Name");
  const [query, setQuery] = useState("");
  const scope = tab as CadLookupScope;
  const submit = () => onSearch(scope, `${tab}: ${query || "empty query"}`, query);

  return (
    <div className="grid gap-4 2xl:grid-cols-[0.8fr_1.2fr]">
      <Panel title="Lookup Tools">
        <div className="mb-4 flex flex-wrap gap-2">
          {lookupTabs.map((item) => (
            <button key={item} onClick={() => setTab(item)} className={`min-h-10 rounded-md border px-3 text-sm ${tab === item ? "border-sky-300/40 bg-sky-300/10 text-sky-100" : "border-white/10 text-neutral-400 hover:bg-white/10"}`}>
              {item}
            </button>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submit();
            }}
            className="h-11 rounded-md border border-white/10 bg-neutral-950 px-3 text-white"
            placeholder={`${tab} lookup`}
          />
          <button onClick={submit} className="h-11 rounded-md bg-sky-400 px-5 text-sm font-bold text-neutral-950">Search</button>
        </div>
        <p className="mt-3 text-sm text-neutral-400">{notice}</p>
        <div className="mt-4 grid gap-2">
          {results.length ? (
            results.map((result) => (
              <button key={`${result.source}-${result.id}`} type="button" onClick={() => onSelectResult(result)} className="rounded-md border border-white/10 bg-neutral-950 p-3 text-left hover:border-sky-300/40 hover:bg-white/[0.04]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-white">{result.label}</p>
                  <span className="rounded border border-sky-300/30 bg-sky-300/10 px-2 py-1 text-xs text-sky-100">{result.source}</span>
                </div>
                <p className="mt-2 text-sm text-neutral-400">{result.meta || "No additional details"}</p>
              </button>
            ))
          ) : (
            <Notice text="No lookup results displayed." />
          )}
        </div>
      </Panel>
      <LookupDetailPanel detail={detail} onStartRms={onStartRms} />
    </div>
  );
}

function LookupDetailPanel({ detail, onStartRms }: { detail: CadLookupDetail | null; onStartRms: (action: RmsAction, subject?: CadLookupDetail | null) => void }) {
  if (!detail) {
    return (
      <Panel title="Record Detail">
        <Notice text="Select a lookup result tied to a civilian profile to view full RMS detail." />
      </Panel>
    );
  }

  const civilian = detail.civilian;
  const name = `${civilian.first_name} ${civilian.last_name}`.trim() || "Unnamed civilian";

  return (
    <Panel title="Record Detail">
      <div className="grid gap-4 xl:grid-cols-[180px_1fr]">
        <div className="overflow-hidden rounded-md border border-white/10 bg-neutral-950">
          {civilian.profile_image_url || civilian.images.profile_photo_url ? (
            <div
              aria-label={`${name} ID photo`}
              className="aspect-[3/4] w-full bg-cover bg-center"
              role="img"
              style={{ backgroundImage: `url(${civilian.profile_image_url || civilian.images.profile_photo_url})` }}
            />
          ) : (
            <div className="grid aspect-[3/4] place-items-center text-4xl font-semibold text-neutral-600">{name.slice(0, 2).toUpperCase()}</div>
          )}
          <div className={`border-t px-3 py-2 text-center text-sm font-bold ${detail.isWanted ? "border-rose-300/40 bg-rose-400/15 text-rose-100" : "border-emerald-300/30 bg-emerald-300/10 text-emerald-100"}`}>
            {detail.isWanted ? "WANTED / HIT" : "NO ACTIVE WARRANT HIT"}
          </div>
        </div>
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            <Info label="Name" value={name} />
            <Info label="DOB" value={civilian.date_of_birth || "Unknown"} />
            <Info label="Address" value={civilian.address || "Unknown"} />
            <Info label="Height / Weight" value={`${civilian.height || "Unknown"} / ${civilian.weight || "Unknown"}`} />
            <Info label="Phone" value={civilian.phone || "Unknown"} />
            <Info label="Occupation" value={civilian.occupation || "Unknown"} />
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            {(["Warning", "Fix-it Ticket", "Citation", "Arrest Report", "Incident Report"] as RmsAction[]).map((action) => (
              <button key={action} type="button" onClick={() => onStartRms(action, detail)} className="min-h-10 rounded-md border border-sky-300/30 bg-sky-300/10 px-2 text-sm font-semibold text-sky-100 hover:bg-sky-300/20">
                {action}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <RecordList title="Licenses" items={civilian.licenses.map((license) => `${license.license_type}: ${license.status}${license.expires_at ? ` / expires ${license.expires_at}` : ""}`)} />
        <RecordList title="Vehicles" items={civilian.vehicles.map((vehicle) => `${vehicle.plate || "No plate"} / ${vehicle.color} ${vehicle.make} ${vehicle.model} / registration ${vehicle.registration_status || "Unknown"} / insurance ${vehicle.insurance_status || "Unknown"}`)} />
        <RecordList title="Flags" items={detail.flags.length ? detail.flags : ["No profile flags."]} />
        <RecordList title="Active BOLO / Warrant Hits" items={detail.activeBolos.length ? detail.activeBolos.map((bolo) => `${bolo.label} / ${bolo.meta}`) : ["No active BOLO hits."]} />
        <RecordList title="Profile History" items={civilian.records.length ? civilian.records.slice(0, 8).map((record) => `${record.record_type}: ${record.title} / ${record.description}`) : ["No profile history records."]} />
      </div>
    </Panel>
  );
}

function RecordList({ items, title }: { items: string[]; title: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-neutral-950 p-3">
      <p className="mb-2 text-xs uppercase tracking-[0.16em] text-neutral-500">{title}</p>
      <div className="space-y-1">
        {items.map((item) => (
          <p key={item} className="rounded border border-white/10 bg-neutral-900 px-2 py-1 text-sm text-neutral-300">{item}</p>
        ))}
      </div>
    </div>
  );
}

function RmsWriter({
  activeCall,
  notice,
  onSave,
  seed,
  selectedLookup,
}: {
  activeCall: MdtCall | null;
  notice: string;
  onSave: (draft: RmsDraft) => void;
  seed: RmsSeed;
  selectedLookup: CadLookupDetail | null;
}) {
  const [draft, setDraft] = useState<RmsDraft>(() => makeRmsDraft(seed, activeCall));
  const [chargeQuery, setChargeQuery] = useState("");
  const [witnessInput, setWitnessInput] = useState("");
  const [suspectInput, setSuspectInput] = useState("");
  const [vehicleInput, setVehicleInput] = useState("");
  const [weaponInput, setWeaponInput] = useState("");
  const totals = chargeTotals(draft.charges);
  const filteredCharges = useMemo(() => {
    const value = chargeQuery.toLowerCase();
    return penalCode.filter((item) => `${item.section} ${item.charge} ${item.classification}`.toLowerCase().includes(value));
  }, [chargeQuery]);

  function patch(patchValue: Partial<RmsDraft>) {
    setDraft((current) => ({ ...current, ...patchValue }));
  }

  function addListValue(key: "suspects" | "vehicles" | "weapons" | "witnesses", value: string, clear: (value: string) => void) {
    const nextValue = value.trim();
    if (!nextValue) return;
    setDraft((current) => ({ ...current, [key]: [...current[key], nextValue] }));
    clear("");
  }

  const selectedName = selectedLookup ? `${selectedLookup.civilian.first_name} ${selectedLookup.civilian.last_name}`.trim() : "";
  const subject = draft.primarySubject?.civilian;

  return (
    <div className="rounded-md bg-neutral-800/60 p-3 text-neutral-950">
      <div className="mx-auto max-w-[1040px] bg-[#fbfaf1] p-4 shadow-2xl ring-1 ring-black/20 md:p-6 print:shadow-none">
        <div className="grid gap-3 border-2 border-neutral-950 p-3 md:grid-cols-[1fr_260px]">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-700">Sentinel State Department of Public Safety</p>
            <h2 className="mt-1 text-2xl font-black uppercase tracking-[0.08em] text-neutral-950">{draft.action}</h2>
            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-neutral-700">RMS / Court Record Worksheet</p>
          </div>
          <div className="grid grid-cols-2 border border-neutral-950 text-xs">
            <PaperBox label="Report No." value={draft.reportNumber} />
            <PaperBox label="Status" value={draft.status} />
            <PaperBox label="Call No." value={draft.callNumber || "N/A"} />
            <PaperBox label="Date" value={new Date().toLocaleDateString("en-US")} />
          </div>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <PaperSelect label="Form Type" value={draft.action} options={["Incident Report", "Field Interview", "Warning", "Fix-it Ticket", "Citation", "Arrest Report"]} onChange={(value) => patch({ action: value as RmsAction })} />
          <PaperInput label="Report Number" value={draft.reportNumber} onChange={(value) => patch({ reportNumber: value })} />
          <PaperInput label="Related Call" value={draft.callNumber} onChange={(value) => patch({ callNumber: value })} />
          <PaperSelect label="Report Status" value={draft.status} options={["Draft", "Submitted"]} onChange={(value) => patch({ status: value as RmsDraft["status"] })} />
        </div>

        <PaperSection title="Subject / Defendant Information">
          <div className="grid gap-px bg-neutral-950 md:grid-cols-4">
            <PaperBox label="Full Name" value={subject ? `${subject.first_name} ${subject.last_name}` : "No subject selected"} />
            <PaperBox label="Date of Birth" value={subject?.date_of_birth || "Auto fill"} />
            <PaperBox label="Sex / Gender" value={subject?.gender || "Auto fill"} />
            <PaperBox label="Phone" value={subject?.phone || "Auto fill"} />
            <PaperBox label="Height" value={subject?.height || "Auto fill"} />
            <PaperBox label="Weight" value={subject?.weight || "Auto fill"} />
            <PaperBox label="Occupation" value={subject?.occupation || "Auto fill"} />
            <PaperBox label="Civilian ID" value={subject?.id || "Auto fill"} />
            <PaperBox className="md:col-span-4" label="Residence Address" value={subject?.address || "Auto fill from lookup"} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedLookup ? (
              <>
                <button type="button" onClick={() => patch({ primarySubject: selectedLookup })} className="min-h-9 border border-neutral-950 bg-neutral-950 px-3 text-xs font-black uppercase tracking-[0.14em] text-white">Use selected as subject</button>
                <button type="button" onClick={() => patch({ witnesses: [...draft.witnesses, selectedName] })} className="min-h-9 border border-neutral-950 px-3 text-xs font-bold uppercase">Add selected witness</button>
                <button type="button" onClick={() => patch({ suspects: [...draft.suspects, selectedName] })} className="min-h-9 border border-neutral-950 px-3 text-xs font-bold uppercase">Add selected suspect</button>
              </>
            ) : null}
          </div>
        </PaperSection>

        <PaperSection title="Incident / Violation Details">
          <div className="grid gap-3 md:grid-cols-2">
            <PaperInput label="Location of Occurrence" value={draft.location} onChange={(value) => patch({ location: value })} />
            <PaperInput label="Unit / Officer" value="Auto-filled from MDT session" readOnly />
          </div>
          <label className="mt-3 block">
            <span className="block border border-b-0 border-neutral-950 bg-neutral-200 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em]">Narrative / Probable Cause / Disposition</span>
            <textarea value={draft.narrative} onChange={(event) => patch({ narrative: event.target.value })} className="min-h-56 w-full resize-y border border-neutral-950 bg-[#fffdf5] px-3 py-2 font-mono text-sm leading-6 text-neutral-950 outline-none" />
          </label>
        </PaperSection>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <PaperSection title="Parties / Property">
            <PaperListEditor title="Witnesses" value={witnessInput} items={draft.witnesses} onValueChange={setWitnessInput} onAdd={() => addListValue("witnesses", witnessInput, setWitnessInput)} />
            <PaperListEditor title="Additional Suspects" value={suspectInput} items={draft.suspects} onValueChange={setSuspectInput} onAdd={() => addListValue("suspects", suspectInput, setSuspectInput)} />
            <PaperListEditor title="Vehicles" value={vehicleInput} items={draft.vehicles} onValueChange={setVehicleInput} onAdd={() => addListValue("vehicles", vehicleInput, setVehicleInput)} />
            <PaperListEditor title="Weapons / Evidence" value={weaponInput} items={draft.weapons} onValueChange={setWeaponInput} onAdd={() => addListValue("weapons", weaponInput, setWeaponInput)} />
          </PaperSection>

          <PaperSection title="Charges / Penalty Calculation">
            <input value={chargeQuery} onChange={(event) => setChargeQuery(event.target.value)} className="mb-3 h-9 w-full border border-neutral-950 bg-[#fffdf5] px-2 text-sm outline-none" placeholder="Search penal code entries" />
            <div className="max-h-52 overflow-y-auto border border-neutral-950">
              {filteredCharges.map((charge) => (
                <button key={charge.section} type="button" onClick={() => patch({ charges: [...draft.charges, charge] })} className="grid w-full gap-px border-b border-neutral-950 bg-neutral-950 text-left text-xs last:border-b-0 md:grid-cols-[0.6fr_1.5fr_0.7fr_0.7fr]">
                  <span className="bg-[#fffdf5] px-2 py-1 font-mono font-bold">{charge.section}</span>
                  <span className="bg-[#fffdf5] px-2 py-1">{charge.charge}</span>
                  <span className="bg-[#fffdf5] px-2 py-1">{charge.fine}</span>
                  <span className="bg-[#fffdf5] px-2 py-1">{charge.jailTime}</span>
                </button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-px bg-neutral-950">
              <PaperBox label="Fine Total" value={`$${totals.fine.toLocaleString("en-US")}`} />
              <PaperBox label="Custody Total" value={`${totals.months} months`} />
            </div>
            <div className="mt-3 space-y-1">
              {draft.charges.map((charge, index) => (
                <button key={`${charge.section}-${index}`} type="button" onClick={() => patch({ charges: draft.charges.filter((_, itemIndex) => itemIndex !== index) })} className="block w-full border border-neutral-950 bg-[#fffdf5] px-2 py-1 text-left text-xs">
                  {charge.section} / {charge.charge} / {charge.fine} / {charge.jailTime}
                </button>
              ))}
            </div>
          </PaperSection>
        </div>

        <div className="mt-3 grid gap-3 border-2 border-neutral-950 p-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <PaperInput label="Officer Signature" value="" readOnly />
          <PaperInput label="Supervisor / Court Clerk" value="" readOnly />
          <button type="button" onClick={() => onSave(draft)} className="min-h-11 border-2 border-neutral-950 bg-neutral-950 px-5 text-sm font-black uppercase tracking-[0.16em] text-white">Save to Profile</button>
        </div>
        <p className="mt-3 text-xs text-neutral-700">{notice}</p>
      </div>
    </div>
  );
}

function makeRmsDraft(seed: RmsSeed, activeCall: MdtCall | null): RmsDraft {
  const stamp = Date.now().toString().slice(-6);
  return {
    action: seed.action,
    callNumber: activeCall?.callNumber ?? "",
    charges: [],
    location: activeCall?.address ?? "",
    narrative: activeCall ? `Related call ${activeCall.callNumber}: ${activeCall.incidentType}\n\n` : "",
    primarySubject: seed.subject ?? null,
    reportNumber: `RMS-${new Date().getFullYear()}-${stamp}`,
    status: "Draft",
    suspects: [],
    vehicles: seed.subject?.civilian.vehicles.map((vehicle) => `${vehicle.plate} ${vehicle.make} ${vehicle.model}`.trim()).filter(Boolean) ?? [],
    weapons: [],
    witnesses: [],
  };
}

function PaperSection({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section className="mt-3 border-2 border-neutral-950">
      <h3 className="border-b-2 border-neutral-950 bg-neutral-950 px-2 py-1 text-xs font-black uppercase tracking-[0.18em] text-white">{title}</h3>
      <div className="p-3">{children}</div>
    </section>
  );
}

function PaperBox({ className = "", label, value }: { className?: string; label: string; value: string }) {
  return (
    <div className={`min-h-14 bg-[#fffdf5] px-2 py-1 ${className}`}>
      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-neutral-600">{label}</p>
      <p className="mt-1 break-words font-mono text-sm text-neutral-950">{value || "N/A"}</p>
    </div>
  );
}

function PaperInput({ label, onChange, readOnly = false, value }: { label: string; onChange?: (value: string) => void; readOnly?: boolean; value: string }) {
  return (
    <label className="block">
      <span className="block border border-b-0 border-neutral-950 bg-neutral-200 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em]">{label}</span>
      <input value={value} readOnly={readOnly} onChange={(event) => onChange?.(event.target.value)} className="h-10 w-full border border-neutral-950 bg-[#fffdf5] px-2 font-mono text-sm text-neutral-950 outline-none read-only:text-neutral-600" />
    </label>
  );
}

function PaperSelect({ label, onChange, options, value }: { label: string; onChange: (value: string) => void; options: string[]; value: string }) {
  return (
    <label className="block">
      <span className="block border border-b-0 border-neutral-950 bg-neutral-200 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em]">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full border border-neutral-950 bg-[#fffdf5] px-2 font-mono text-sm text-neutral-950 outline-none">
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}

function PaperListEditor({ items, onAdd, onValueChange, title, value }: { items: string[]; onAdd: () => void; onValueChange: (value: string) => void; title: string; value: string }) {
  return (
    <div className="mb-4 last:mb-0">
      <p className="mb-1 text-[10px] font-black uppercase tracking-[0.14em] text-neutral-700">{title}</p>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <input value={value} onChange={(event) => onValueChange(event.target.value)} className="h-9 border border-neutral-950 bg-[#fffdf5] px-2 text-sm outline-none" />
        <button type="button" onClick={onAdd} className="h-9 border border-neutral-950 px-3 text-xs font-black uppercase">Add</button>
      </div>
      <div className="mt-2 space-y-1">
        {items.length ? items.map((item) => <p key={item} className="border border-neutral-950 bg-[#fffdf5] px-2 py-1 text-xs">{item}</p>) : <p className="text-xs text-neutral-600">None listed.</p>}
      </div>
    </div>
  );
}

function Warrants({ bolos }: { bolos: Bolo[] }) {
  return (
    <Panel title="Warrants">
      <BoloList bolos={bolos} type="Warrant" />
      <Notice text="Warrant hit confirmation and court record sync are pending; BOLO-style hits now read from Supabase." />
    </Panel>
  );
}

function Bolos({ bolos }: { bolos: Bolo[] }) {
  return (
    <Panel title="BOLOs">
      <BoloList bolos={bolos} />
    </Panel>
  );
}

function PenalCode() {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const value = query.toLowerCase();
    return penalCode.filter((item) => `${item.section} ${item.charge} ${item.classification}`.toLowerCase().includes(value));
  }, [query]);
  return (
    <Panel title="Penal Code">
      <input value={query} onChange={(event) => setQuery(event.target.value)} className="mb-4 h-11 w-full rounded-md border border-white/10 bg-neutral-950 px-3 text-sm text-white" placeholder="Search charges, classifications, fines, jail time" />
      <div className="space-y-2">
        {filtered.map((item) => (
          <div key={item.section} className="grid gap-2 rounded-md border border-white/10 bg-neutral-950 p-3 text-sm lg:grid-cols-[0.7fr_1.4fr_0.8fr_0.7fr_0.7fr]">
            <span className="font-mono text-sky-200">{item.section}</span>
            <span className="text-white">{item.charge}</span>
            <span className="text-neutral-300">{item.classification}</span>
            <span className="text-neutral-400">{item.fine}</span>
            <span className="text-neutral-400">{item.jailTime}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function Policies() {
  const [query, setQuery] = useState("");
  const filtered = policies.filter((item) => `${item.category} ${item.title} ${item.summary}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <Panel title="Department Policies">
      <input value={query} onChange={(event) => setQuery(event.target.value)} className="mb-4 h-11 w-full rounded-md border border-white/10 bg-neutral-950 px-3 text-sm text-white" placeholder="Search patrol, use of force, pursuits, fire procedures, EMS protocols" />
      <div className="grid gap-3 lg:grid-cols-2">
        {filtered.map((item) => (
          <article key={item.id} className="rounded-md border border-white/10 bg-neutral-950 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-sky-300">{item.category}</p>
            <h3 className="mt-2 font-semibold text-white">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-neutral-400">{item.summary}</p>
          </article>
        ))}
      </div>
    </Panel>
  );
}

function SupervisorPanel({ allowed, calls, panicActive, roster }: { allowed: boolean; calls: MdtCall[]; panicActive: boolean; roster: UnitRosterEntry[] }) {
  if (!allowed) {
    return <Panel title="Supervisor Panel"><Notice text="Supervisor Access Required" /></Panel>;
  }
  return (
    <div className="grid gap-4 2xl:grid-cols-2">
      <Panel title="Unit List">
        <div className="space-y-2">
          {roster.map((unit) => (
            <div key={unit.callsign} className="grid gap-2 rounded-md border border-white/10 bg-neutral-950 p-3 text-sm lg:grid-cols-[0.6fr_0.9fr_0.8fr_0.9fr_1fr]">
              <span className="font-mono text-white">{unit.callsign}</span>
              <span>{unit.agency}</span>
              <span>{unit.unitType}</span>
              <span className={`rounded border px-2 py-1 text-xs ${statusClass(unit.status)}`}>{unit.status}</span>
              <span className="text-neutral-400">{unit.assignedCall}</span>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Supervisor Overview">
        <div className="grid gap-3 sm:grid-cols-2">
          <Info label="Active Calls" value={String(calls.length)} />
          <Info label="Panic Alerts" value={panicActive ? "1 active" : "0 active"} />
          <Info label="Report Review" value="Under Construction" />
          <Info label="Call Reassignment" value="Under Construction" />
        </div>
      </Panel>
    </div>
  );
}

function PanicPanel({
  active,
  armed,
  onArm,
  onCancel,
  onConfirm,
}: {
  active: boolean;
  armed: boolean;
  onArm: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Panel title="Panic / Emergency">
      <div className="rounded-md border border-rose-300/40 bg-rose-400/10 p-4">
        <h2 className="text-xl font-semibold text-rose-100">{active ? "Panic Activated" : "Emergency Activation"}</h2>
        <p className="mt-2 text-sm text-rose-100/80">FiveM panic sync -- Under Construction</p>
        {!active && !armed ? (
          <button onClick={onArm} className="mt-5 min-h-14 rounded-md bg-rose-500 px-6 text-sm font-black uppercase tracking-[0.16em] text-white hover:bg-rose-400">Activate Panic</button>
        ) : null}
        {!active && armed ? (
          <div className="mt-5 flex flex-wrap gap-3">
            <button onClick={onConfirm} className="min-h-14 rounded-md bg-rose-500 px-6 text-sm font-black uppercase tracking-[0.16em] text-white hover:bg-rose-400">Confirm Emergency</button>
            <button onClick={onCancel} className="min-h-14 rounded-md border border-white/20 px-6 text-sm font-semibold text-white hover:bg-white/10">Cancel</button>
          </div>
        ) : null}
      </div>
    </Panel>
  );
}

function Settings() {
  return (
    <Panel title="MDT Settings">
      <Notice text="Theme, keybinds, radio channels, agency permissions, and FiveM sync settings are Under Construction." />
    </Panel>
  );
}

function BoloList({ bolos, compact = false, type }: { bolos: Bolo[]; compact?: boolean; type?: LookupTab }) {
  const items = type ? bolos.filter((bolo) => bolo.type === type) : bolos;
  return (
    <div className={compact ? "space-y-2" : "grid gap-3 lg:grid-cols-2"}>
      {items.length ? items.map((bolo) => (
        <article key={bolo.id} className="rounded-md border border-white/10 bg-neutral-950 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-white">{bolo.title}</h3>
            <span className={`rounded border px-2 py-1 text-xs ${priorityClass(bolo.priority)}`}>{bolo.priority}</span>
          </div>
          <p className="mt-2 text-sm text-neutral-300">{bolo.description}</p>
          <p className="mt-2 text-xs text-neutral-500">{bolo.type} / {bolo.location} / {bolo.associated}</p>
        </article>
      )) : <Notice text="No active Supabase BOLO records." />}
    </div>
  );
}

function CallDetail({ call }: { call: MdtCall }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-2 text-sm">
        <Info label="Call Number" value={call.callNumber} />
        <Info label="Incident" value={call.incidentType} />
        <Info label="Location" value={call.address} />
        <Info label="Assigned Units" value={call.units.join(", ") || "None"} />
      </div>
      <p className="text-sm leading-6 text-neutral-300">{call.details}</p>
      <div className="space-y-1">
        {call.notes.map((note) => <p key={note} className="rounded border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-neutral-400">{note}</p>)}
      </div>
    </div>
  );
}

function Panel({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section className="rounded-lg border border-white/10 bg-neutral-900">
      <div className="border-b border-white/10 px-4 py-3">
        <h2 className="text-base font-semibold text-white">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-neutral-950 p-3">
      <p className="text-xs uppercase tracking-[0.14em] text-neutral-500">{label}</p>
      <p className="mt-1 break-words text-sm text-neutral-200">{value}</p>
    </div>
  );
}

function Notice({ text }: { text: string }) {
  return <div className="mt-3 rounded-md border border-dashed border-amber-300/25 bg-amber-300/[0.06] px-3 py-2 text-sm text-amber-100">{text}</div>;
}

function Pill({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`rounded-md border border-white/15 bg-white/[0.06] px-2 py-1 text-neutral-200 ${className}`}>{children}</span>;
}

function LogList({ log }: { log: ActivityLogEntry[] }) {
  return (
    <div className="grid gap-2 lg:grid-cols-2">
      {log.slice(0, 8).map((entry) => (
        <div key={entry.id} className="rounded-md border border-white/10 bg-neutral-950 p-3">
          <div className="flex justify-between gap-3 text-xs">
            <span className="font-mono text-sky-200">{entry.timestamp}</span>
            <span className="uppercase tracking-[0.14em] text-neutral-500">{entry.module}</span>
          </div>
          <p className="mt-2 text-sm text-neutral-300">{entry.message}</p>
        </div>
      ))}
    </div>
  );
}
