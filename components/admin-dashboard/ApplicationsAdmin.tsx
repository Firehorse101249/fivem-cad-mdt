"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type ApiState = { error: string; loading: boolean; success: string };
type Application = Record<string, string | null>;
type Profile = Record<string, string | null>;
type Question = { id: string; prompt: string };
type Answer = { answer: string; application_id: string; question_id: string };

export function ApplicationsAdmin() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [reason, setReason] = useState("");
  const [state, setState] = useState<ApiState>({ error: "", loading: true, success: "" });

  async function load() {
    setState({ error: "", loading: true, success: "" });
    try {
      const response = await fetch("/api/admin/membership/applications");
      const result = await response.json();

      if (!response.ok || !result.success) {
        setState({ error: result.error ?? "Unable to load applications.", loading: false, success: "" });
        return;
      }

      setApplications(result.applications ?? []);
      setProfiles(result.profiles ?? []);
      setQuestions(result.questions ?? []);
      setAnswers(result.answers ?? []);
      setSelectedId((current) => current || result.applications?.[0]?.id || "");
      setState({ error: "", loading: false, success: "" });
    } catch {
      setState({ error: "Unable to reach application API.", loading: false, success: "" });
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const selected = applications.find((application) => application.id === selectedId) ?? null;
  const profile = profiles.find((item) => item.id === selected?.user_id) ?? null;
  const answerMap = useMemo(() => {
    return new Map(
      answers
        .filter((answer) => answer.application_id === selectedId)
        .map((answer) => [answer.question_id, answer.answer]),
    );
  }, [answers, selectedId]);

  async function review(decision: "approve" | "deny", event?: FormEvent) {
    event?.preventDefault();

    if (!selected) return;

    setState({ error: "", loading: true, success: "" });
    try {
      const response = await fetch(`/api/admin/membership/applications/${selected.id}/review`, {
        body: JSON.stringify({ decision, reason }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        setState({ error: result.error ?? "Unable to review application.", loading: false, success: "" });
        return;
      }

      setReason("");
      setState({ error: "", loading: false, success: `Application ${decision === "approve" ? "approved" : "denied"}.` });
      await load();
    } catch {
      setState({ error: "Unable to reach review API.", loading: false, success: "" });
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
      <section className="rounded-lg border border-white/10 bg-neutral-900 p-5">
        <h2 className="text-xl font-semibold text-white">Applications</h2>
        <div className="mt-4 max-h-[720px] space-y-2 overflow-y-auto">
          {applications.map((application) => {
            const rowProfile = profiles.find((item) => item.id === application.user_id);
            return (
              <button
                className={`block w-full rounded-md border px-3 py-3 text-left ${
                  selectedId === application.id
                    ? "border-sky-300/50 bg-sky-300/10"
                    : "border-white/10 bg-neutral-950 hover:bg-white/[0.04]"
                }`}
                key={application.id}
                onClick={() => setSelectedId(String(application.id))}
                type="button"
              >
                <span className="block font-medium text-white">{rowProfile?.display_name ?? application.email}</span>
                <span className="mt-1 block text-sm text-neutral-400">{application.status}</span>
              </button>
            );
          })}
          {!applications.length && !state.loading ? <p className="text-sm text-neutral-400">No applications found.</p> : null}
        </div>
      </section>

      <section className="rounded-lg border border-white/10 bg-neutral-900 p-5">
        {selected ? (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-white">{profile?.display_name ?? selected.email}</h2>
                <p className="mt-2 text-sm text-neutral-400">{profile?.email ?? selected.email}</p>
                <p className="mt-1 text-sm text-neutral-400">
                  Steam {profile?.steam_id64 ?? "missing"} / Discord {profile?.discord_username ?? profile?.discord_id ?? "missing"}
                </p>
              </div>
              <span className="rounded-md border border-white/10 px-3 py-2 text-sm text-neutral-300">{selected.status}</span>
            </div>
            <div className="mt-5 space-y-3">
              {questions.map((question) => (
                <article className="rounded-md border border-white/10 bg-neutral-950 p-4" key={question.id}>
                  <h3 className="font-medium text-white">{question.prompt}</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-neutral-300">
                    {answerMap.get(question.id) || "No answer recorded."}
                  </p>
                </article>
              ))}
            </div>
            <form className="mt-5 space-y-3" onSubmit={(event) => void review("deny", event)}>
              <label className="block">
                <span className="text-sm font-medium text-neutral-300">Denial reason</span>
                <textarea
                  className="mt-2 w-full rounded-md border border-white/10 bg-neutral-950 px-3 py-3 text-white"
                  onChange={(event) => setReason(event.target.value)}
                  rows={3}
                  value={reason}
                />
              </label>
              <Feedback state={state} />
              <div className="flex flex-wrap gap-3">
                <button
                  className="rounded-md bg-emerald-300 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-emerald-200 disabled:opacity-60"
                  disabled={state.loading}
                  onClick={() => void review("approve")}
                  type="button"
                >
                  Approve for interview
                </button>
                <button
                  className="rounded-md bg-rose-300 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-rose-200 disabled:opacity-60"
                  disabled={state.loading}
                  type="submit"
                >
                  Deny application
                </button>
              </div>
            </form>
          </>
        ) : (
          <p className="text-sm text-neutral-400">Select an application.</p>
        )}
      </section>
    </div>
  );
}

function Feedback({ state }: { state: ApiState }) {
  return (
    <div className="space-y-2">
      {state.success ? <p className="rounded-md border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-100">{state.success}</p> : null}
      {state.error ? <p className="rounded-md border border-rose-300/30 bg-rose-300/10 px-3 py-2 text-sm text-rose-100">{state.error}</p> : null}
    </div>
  );
}
