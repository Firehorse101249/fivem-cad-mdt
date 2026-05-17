"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Assignment = {
  department_key: string | null;
  id: string;
  status: string;
  template_id: string;
  trainee_user_id: string;
};

type ChecklistItem = {
  category: string;
  description: string | null;
  id: string;
  task: string;
  template_id: string;
};

type Progress = {
  assignment_id: string;
  item_id: string;
  notes: string | null;
  status: string;
};

type Note = {
  assignment_id: string;
  body: string;
  created_at: string;
  id: string;
  note_type: string;
  rating: number | null;
};

type Profile = {
  display_name: string | null;
  email: string | null;
  id: string;
};

export function FtoMdt() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [trainees, setTrainees] = useState<Profile[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [noteType, setNoteType] = useState("daily_observation");
  const [rating, setRating] = useState("4");
  const [notice, setNotice] = useState("Loading FTO assignments...");

  async function load() {
    const response = await fetch("/api/fto");
    const result = await response.json();
    if (!response.ok || !result.success) {
      setNotice(result.error ?? "Unable to load FTO assignments.");
      return;
    }
    setAssignments(result.assignments ?? []);
    setItems(result.items ?? []);
    setProgress(result.progress ?? []);
    setNotes(result.notes ?? []);
    setTrainees(result.trainees ?? []);
    setSelectedId((current) => current || result.assignments?.[0]?.id || "");
    setNotice("FTO program synced.");
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const selected = assignments.find((assignment) => assignment.id === selectedId) ?? null;
  const trainee = trainees.find((profile) => profile.id === selected?.trainee_user_id) ?? null;
  const selectedItems = items.filter((item) => item.template_id === selected?.template_id);
  const progressMap = useMemo(
    () => new Map(progress.filter((row) => row.assignment_id === selectedId).map((row) => [row.item_id, row])),
    [progress, selectedId],
  );
  const selectedNotes = notes.filter((note) => note.assignment_id === selectedId);
  const completed = selectedItems.filter((item) => progressMap.get(item.id)?.status === "complete").length;

  async function updateProgress(itemId: string, status: string) {
    if (!selected) return;
    const response = await fetch("/api/fto", {
      body: JSON.stringify({ assignment_id: selected.id, item_id: itemId, status }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      setNotice(result.error ?? "Unable to update progress.");
      return;
    }
    await load();
  }

  async function addNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !noteBody.trim()) return;
    const response = await fetch("/api/fto", {
      body: JSON.stringify({
        assignment_id: selected.id,
        body: noteBody,
        note_type: noteType,
        rating: Number(rating) || null,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      setNotice(result.error ?? "Unable to save note.");
      return;
    }
    setNoteBody("");
    await load();
  }

  return (
    <div className="min-h-screen bg-[#07090c] text-neutral-100">
      <header className="border-b border-white/10 bg-neutral-950 px-4 py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link href="/cad" className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">Sentinel CAD</Link>
            <h1 className="mt-1 text-2xl font-semibold text-white">FTO MDT</h1>
            <p className="mt-1 text-sm text-neutral-500">{notice}</p>
          </div>
          <div className="rounded-md border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-neutral-300">
            {selectedItems.length ? `${completed}/${selectedItems.length} checklist complete` : "No checklist selected"}
          </div>
        </div>
      </header>

      <main className="grid gap-4 p-4 xl:grid-cols-[320px_1fr_380px]">
        <section className="rounded-lg border border-white/10 bg-neutral-900 p-4">
          <h2 className="font-semibold text-white">Trainees</h2>
          <div className="mt-3 space-y-2">
            {assignments.map((assignment) => {
              const person = trainees.find((profile) => profile.id === assignment.trainee_user_id);
              return (
                <button
                  className={`block w-full rounded-md border px-3 py-3 text-left ${selectedId === assignment.id ? "border-sky-300/50 bg-sky-300/10" : "border-white/10 bg-neutral-950"}`}
                  key={assignment.id}
                  onClick={() => setSelectedId(assignment.id)}
                  type="button"
                >
                  <span className="block font-medium text-white">{person?.display_name ?? person?.email ?? assignment.trainee_user_id}</span>
                  <span className="mt-1 block text-xs text-neutral-500">{assignment.status} / {assignment.department_key ?? "department"}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-lg border border-white/10 bg-neutral-900 p-4">
          <div className="flex flex-col gap-2 border-b border-white/10 pb-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Training profile</p>
              <h2 className="mt-1 text-2xl font-semibold text-white">{trainee?.display_name ?? trainee?.email ?? "Select a trainee"}</h2>
            </div>
            <Link className="rounded-md bg-sky-400 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-sky-300" href="/cad/officer">
              Open normal MDT
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {selectedItems.map((item) => {
              const row = progressMap.get(item.id);
              const status = row?.status ?? "not_started";
              return (
                <article className="rounded-md border border-white/10 bg-neutral-950 p-3" key={item.id}>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-sky-300">{item.category}</p>
                      <h3 className="mt-1 font-semibold text-white">{item.task}</h3>
                      <p className="mt-2 text-sm leading-6 text-neutral-400">{item.description}</p>
                    </div>
                    <select
                      className="h-10 rounded-md border border-white/10 bg-neutral-900 px-3 text-sm text-white"
                      onChange={(event) => void updateProgress(item.id, event.target.value)}
                      value={status}
                    >
                      <option value="not_started">Not started</option>
                      <option value="observed">Observed</option>
                      <option value="needs_remediation">Needs remediation</option>
                      <option value="complete">Complete</option>
                    </select>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <aside className="rounded-lg border border-white/10 bg-neutral-900 p-4">
          <h2 className="font-semibold text-white">FTO Notes</h2>
          <form className="mt-3 space-y-3" onSubmit={addNote}>
            <div className="grid gap-2 sm:grid-cols-2">
              <select className="h-10 rounded-md border border-white/10 bg-neutral-950 px-3 text-sm text-white" onChange={(event) => setNoteType(event.target.value)} value={noteType}>
                <option value="daily_observation">Daily observation</option>
                <option value="note">Note</option>
                <option value="remediation">Remediation</option>
                <option value="weekly_summary">Weekly summary</option>
              </select>
              <input className="h-10 rounded-md border border-white/10 bg-neutral-950 px-3 text-sm text-white" max="7" min="1" onChange={(event) => setRating(event.target.value)} type="number" value={rating} />
            </div>
            <textarea className="min-h-32 w-full rounded-md border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-white" onChange={(event) => setNoteBody(event.target.value)} placeholder="Document observed behavior, coaching, remediation, or daily summary." value={noteBody} />
            <button className="min-h-10 rounded-md bg-sky-400 px-4 text-sm font-semibold text-neutral-950 hover:bg-sky-300" type="submit">Save note</button>
          </form>
          <div className="mt-5 max-h-[520px] space-y-2 overflow-y-auto">
            {selectedNotes.map((note) => (
              <article className="rounded-md border border-white/10 bg-neutral-950 p-3" key={note.id}>
                <div className="flex justify-between gap-2 text-xs text-neutral-500">
                  <span>{note.note_type.replace(/_/g, " ")}</span>
                  <span>{note.rating ? `Rating ${note.rating}/7` : new Date(note.created_at).toLocaleDateString()}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-neutral-300">{note.body}</p>
              </article>
            ))}
          </div>
        </aside>
      </main>
    </div>
  );
}
