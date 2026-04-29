"use client";

import { useMemo, useState } from "react";
import { ActiveCallsPanel } from "./ActiveCallsPanel";
import { ActivityLogPanel } from "./ActivityLogPanel";
import { BoloPanel } from "./BoloPanel";
import { CallCreationPanel } from "./CallCreationPanel";
import { LiveMapPanel } from "./LiveMapPanel";
import { LookupPanel } from "./LookupPanel";
import {
  initialCallForm,
  sampleBolos,
  sampleCalls,
  sampleLog,
  sampleUnits,
} from "./mockData";
import { StatusBar } from "./StatusBar";
import { ToneBoardPanel } from "./ToneBoardPanel";
import { UnitStatusPanel, type UnitFilter } from "./UnitStatusPanel";
import type { ActivityLogEntry, Bolo, CallStatus, DispatchCall, NewCallForm } from "./types";

function currentTime() {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export function DispatchConsole() {
  const [calls, setCalls] = useState<DispatchCall[]>(sampleCalls);
  const [units] = useState(sampleUnits);
  const [bolos, setBolos] = useState<Bolo[]>(sampleBolos);
  const [logEntries, setLogEntries] = useState<ActivityLogEntry[]>(sampleLog);
  const [callForm, setCallForm] = useState<NewCallForm>(initialCallForm);
  const [unitFilter, setUnitFilter] = useState<UnitFilter>("All");

  const sortedCalls = useMemo(
    () => [...calls].sort((a, b) => (a.status === "Closed" ? 1 : b.status === "Closed" ? -1 : 0)),
    [calls],
  );

  function addLog(message: string, related?: string, actor = "DISP-01") {
    setLogEntries((current) => [
      {
        actor,
        id: newId("log"),
        message,
        related,
        timestamp: currentTime(),
      },
      ...current,
    ]);
  }

  function handlePlaceholder(label: string, related?: string) {
    addLog(`${label} is Under Construction.`, related, "SYSTEM");
  }

  function handleStatusChange(callId: string, status: CallStatus) {
    setCalls((current) =>
      current.map((call) => (call.id === callId ? { ...call, status } : call)),
    );
    const call = calls.find((item) => item.id === callId);
    addLog(`Call status changed to ${status}.`, call?.callNumber, "DISP-01");
  }

  function handleCreateCall() {
    if (!callForm.type || !callForm.location || !callForm.description) {
      addLog("Call creation missing required type, location, or description.", undefined, "SYSTEM");
      return;
    }

    const callNumber = `C-2026-${String(calls.length + 145).padStart(4, "0")}`;
    const newCall: DispatchCall = {
      ...callForm,
      assignedUnits: [],
      callNumber,
      id: newId("call"),
      notesCount: 1,
      openedAt: currentTime(),
      status: "Pending",
    };

    setCalls((current) => [newCall, ...current]);
    setCallForm(initialCallForm);
    addLog(`Call created: ${newCall.type} at ${newCall.location}.`, callNumber);
  }

  function handleAddBolo(bolo: Pick<Bolo, "description" | "lastKnownLocation" | "priority" | "title" | "type">) {
    const newBolo: Bolo = {
      ...bolo,
      associated: "Pending detail entry",
      createdAt: currentTime(),
      createdBy: "DISP-01",
      id: newId("bolo"),
      status: "Active",
    };

    setBolos((current) => [newBolo, ...current]);
    addLog(`BOLO added: ${newBolo.title}.`, newBolo.title);
  }

  function handleTone(tone: string) {
    addLog(`${tone} activated. Audio playback is Under Construction.`, tone, "SYSTEM");
  }

  return (
    <div className="space-y-4">
      <StatusBar calls={calls} units={units} />
      <div className="grid gap-4 2xl:grid-cols-[1.2fr_0.8fr_0.9fr]">
        <ActiveCallsPanel
          calls={sortedCalls}
          onPlaceholder={handlePlaceholder}
          onStatusChange={handleStatusChange}
        />
        <UnitStatusPanel filter={unitFilter} onFilterChange={setUnitFilter} units={units} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr_0.8fr]">
        <CallCreationPanel
          form={callForm}
          onChange={(patch) => setCallForm((current) => ({ ...current, ...patch }))}
          onSubmit={handleCreateCall}
        />
        <BoloPanel bolos={bolos} onAddBolo={handleAddBolo} onPlaceholder={handlePlaceholder} />
        <LookupPanel onPlaceholder={handlePlaceholder} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <ToneBoardPanel onTone={handleTone} />
        <ActivityLogPanel entries={logEntries} />
      </div>
      <LiveMapPanel />
    </div>
  );
}
