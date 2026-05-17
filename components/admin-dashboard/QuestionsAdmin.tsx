"use client";

import { FormEvent, useEffect, useState } from "react";

type Question = {
  active: boolean;
  field_type: "text" | "textarea" | "date";
  id: string;
  prompt: string;
  question_key: string;
  required: boolean;
  section: "application" | "interview";
  sort_order: number;
};

const blank: Question = {
  active: true,
  field_type: "textarea",
  id: "",
  prompt: "",
  question_key: "",
  required: true,
  section: "application",
  sort_order: 0,
};

export function QuestionsAdmin() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [draft, setDraft] = useState<Question>(blank);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const response = await fetch("/api/admin/membership/questions");
    const result = await response.json();
    if (!response.ok || !result.success) {
      setError(result.error ?? "Unable to load questions.");
      return;
    }
    setQuestions(result.questions ?? []);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const response = await fetch("/api/admin/membership/questions", {
      body: JSON.stringify(draft),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      setError(result.error ?? "Unable to save question.");
      return;
    }
    setDraft(blank);
    setMessage("Question saved.");
    await load();
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_0.85fr]">
      <section className="rounded-lg border border-white/10 bg-neutral-900 p-5">
        <h2 className="text-xl font-semibold text-white">Question Bank</h2>
        <div className="mt-4 overflow-hidden rounded-md border border-white/10">
          {questions.map((question) => (
            <button
              className="grid w-full gap-2 border-t border-white/10 bg-neutral-950 px-4 py-3 text-left first:border-t-0 hover:bg-white/[0.04] md:grid-cols-[0.7fr_1fr_0.4fr]"
              key={question.id}
              onClick={() => setDraft(question)}
              type="button"
            >
              <span className="text-sm font-medium text-sky-200">{question.section}</span>
              <span className="text-sm text-white">{question.prompt}</span>
              <span className="text-sm text-neutral-400">{question.active ? "active" : "inactive"}</span>
            </button>
          ))}
        </div>
      </section>
      <section className="rounded-lg border border-white/10 bg-neutral-900 p-5">
        <h2 className="text-xl font-semibold text-white">{draft.id ? "Edit Question" : "New Question"}</h2>
        <form className="mt-5 space-y-4" onSubmit={save}>
          <label className="block">
            <span className="text-sm font-medium text-neutral-300">Section</span>
            <select className="mt-2 h-11 w-full rounded-md border border-white/10 bg-neutral-950 px-3 text-white" onChange={(event) => setDraft({ ...draft, section: event.target.value as Question["section"] })} value={draft.section}>
              <option value="application">application</option>
              <option value="interview">interview</option>
            </select>
          </label>
          <Text label="Question key" onChange={(value) => setDraft({ ...draft, question_key: value })} value={draft.question_key} />
          <label className="block">
            <span className="text-sm font-medium text-neutral-300">Prompt</span>
            <textarea className="mt-2 w-full rounded-md border border-white/10 bg-neutral-950 px-3 py-3 text-white" onChange={(event) => setDraft({ ...draft, prompt: event.target.value })} rows={4} value={draft.prompt} />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-neutral-300">Field type</span>
            <select className="mt-2 h-11 w-full rounded-md border border-white/10 bg-neutral-950 px-3 text-white" onChange={(event) => setDraft({ ...draft, field_type: event.target.value as Question["field_type"] })} value={draft.field_type}>
              <option value="text">text</option>
              <option value="textarea">textarea</option>
              <option value="date">date</option>
            </select>
          </label>
          <Text label="Sort order" onChange={(value) => setDraft({ ...draft, sort_order: Number(value) || 0 })} value={String(draft.sort_order)} />
          <label className="flex items-center gap-3 text-sm text-neutral-200">
            <input checked={draft.required} className="size-5 accent-sky-400" onChange={(event) => setDraft({ ...draft, required: event.target.checked })} type="checkbox" />
            Required
          </label>
          <label className="flex items-center gap-3 text-sm text-neutral-200">
            <input checked={draft.active} className="size-5 accent-sky-400" onChange={(event) => setDraft({ ...draft, active: event.target.checked })} type="checkbox" />
            Active
          </label>
          {message ? <p className="rounded-md border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-100">{message}</p> : null}
          {error ? <p className="rounded-md border border-rose-300/30 bg-rose-300/10 px-3 py-2 text-sm text-rose-100">{error}</p> : null}
          <div className="flex gap-3">
            <button className="rounded-md bg-sky-400 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-sky-300" type="submit">Save</button>
            <button className="rounded-md border border-white/15 px-4 py-2 text-sm font-semibold text-neutral-200 hover:bg-white/10" onClick={() => setDraft(blank)} type="button">New</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function Text({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-neutral-300">{label}</span>
      <input className="mt-2 h-11 w-full rounded-md border border-white/10 bg-neutral-950 px-3 text-white" onChange={(event) => onChange(event.target.value)} value={value} />
    </label>
  );
}
