"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type ApiState = { error: string; loading: boolean; success: string };
type Row = Record<string, string | null>;
type Question = { id: string; prompt: string };
type Answer = { answer: string; application_id?: string; interview_id?: string; question_id: string };

export function InterviewsAdmin() {
  const [interviews, setInterviews] = useState<Row[]>([]);
  const [applications, setApplications] = useState<Row[]>([]);
  const [profiles, setProfiles] = useState<Row[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [applicationQuestions, setApplicationQuestions] = useState<Question[]>([]);
  const [interviewAnswers, setInterviewAnswers] = useState<Answer[]>([]);
  const [applicationAnswers, setApplicationAnswers] = useState<Answer[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [state, setState] = useState<ApiState>({ error: "", loading: true, success: "" });

  async function load() {
    setState({ error: "", loading: true, success: "" });
    try {
      const response = await fetch("/api/admin/membership/interviews");
      const result = await response.json();

      if (!response.ok || !result.success) {
        setState({ error: result.error ?? "Unable to load interviews.", loading: false, success: "" });
        return;
      }

      setInterviews(result.interviews ?? []);
      setApplications(result.applications ?? []);
      setProfiles(result.profiles ?? []);
      setQuestions(result.questions ?? []);
      setApplicationQuestions(result.applicationQuestions ?? []);
      setInterviewAnswers(result.interviewAnswers ?? []);
      setApplicationAnswers(result.applicationAnswers ?? []);
      const nextSelected = selectedId || result.interviews?.[0]?.id || "";
      setSelectedId(nextSelected);
      setAnswers(
        Object.fromEntries(
          (result.interviewAnswers ?? [])
            .filter((answer: Answer) => answer.interview_id === nextSelected)
            .map((answer: Answer) => [answer.question_id, answer.answer]),
        ),
      );
      setState({ error: "", loading: false, success: "" });
    } catch {
      setState({ error: "Unable to reach interviews API.", loading: false, success: "" });
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = interviews.find((interview) => interview.id === selectedId) ?? null;
  const application = applications.find((item) => item.id === selected?.application_id) ?? null;
  const profile = profiles.find((item) => item.id === application?.user_id) ?? null;
  const applicationAnswerMap = useMemo(() => {
    return new Map(
      applicationAnswers
        .filter((answer) => answer.application_id === application?.id)
        .map((answer) => [answer.question_id, answer.answer]),
    );
  }, [application?.id, applicationAnswers]);

  function selectInterview(id: string) {
    setSelectedId(id);
    setAnswers(
      Object.fromEntries(
        interviewAnswers
          .filter((answer) => answer.interview_id === id)
          .map((answer) => [answer.question_id, answer.answer]),
      ),
    );
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setState({ error: "", loading: true, success: "" });
    try {
      const response = await fetch(`/api/admin/membership/interviews/${selected.id}/save`, {
        body: JSON.stringify({ answers }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        setState({ error: result.error ?? "Unable to save interview.", loading: false, success: "" });
        return;
      }
      setState({ error: "", loading: false, success: "Interview saved." });
      await load();
    } catch {
      setState({ error: "Unable to reach save API.", loading: false, success: "" });
    }
  }

  async function decide(decision: "accept" | "deny") {
    if (!selected) return;
    setState({ error: "", loading: true, success: "" });
    try {
      const response = await fetch(`/api/admin/membership/interviews/${selected.id}/decision`, {
        body: JSON.stringify({ decision, reason }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        setState({ error: result.error ?? "Unable to save decision.", loading: false, success: "" });
        return;
      }
      setReason("");
      setState({ error: "", loading: false, success: `Interview ${decision === "accept" ? "accepted" : "denied"}.` });
      await load();
    } catch {
      setState({ error: "Unable to reach decision API.", loading: false, success: "" });
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
      <section className="rounded-lg border border-white/10 bg-neutral-900 p-5">
        <h2 className="text-xl font-semibold text-white">Interviews</h2>
        <div className="mt-4 space-y-2">
          {interviews.map((interview) => {
            const app = applications.find((item) => item.id === interview.application_id);
            const person = profiles.find((item) => item.id === app?.user_id);
            return (
              <button
                className={`block w-full rounded-md border px-3 py-3 text-left ${
                  selectedId === interview.id ? "border-sky-300/50 bg-sky-300/10" : "border-white/10 bg-neutral-950"
                }`}
                key={interview.id}
                onClick={() => selectInterview(String(interview.id))}
                type="button"
              >
                <span className="block font-medium text-white">{person?.display_name ?? app?.email ?? interview.id}</span>
                <span className="mt-1 block text-sm text-neutral-400">{interview.status}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-white/10 bg-neutral-900 p-5">
        {selected ? (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-white">{profile?.display_name ?? application?.email}</h2>
                <p className="mt-2 text-sm text-neutral-400">{profile?.email ?? application?.email}</p>
              </div>
              <span className="rounded-md border border-white/10 px-3 py-2 text-sm text-neutral-300">{selected.status}</span>
            </div>
            <div className="mt-5 rounded-md border border-white/10 bg-neutral-950 p-4">
              <h3 className="font-semibold text-white">Application Context</h3>
              <div className="mt-3 space-y-3">
                {applicationQuestions.map((question) => (
                  <article key={question.id}>
                    <p className="text-sm font-medium text-neutral-200">{question.prompt}</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-neutral-400">
                      {applicationAnswerMap.get(question.id) || "No answer recorded."}
                    </p>
                  </article>
                ))}
              </div>
            </div>
            <form className="mt-5 space-y-4" onSubmit={save}>
              {questions.map((question) => (
                <label className="block" key={question.id}>
                  <span className="text-sm font-medium text-neutral-300">{question.prompt}</span>
                  <textarea
                    className="mt-2 w-full rounded-md border border-white/10 bg-neutral-950 px-3 py-3 text-white"
                    onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))}
                    rows={4}
                    value={answers[question.id] ?? ""}
                  />
                </label>
              ))}
              <label className="block">
                <span className="text-sm font-medium text-neutral-300">Decision / denial reason</span>
                <textarea
                  className="mt-2 w-full rounded-md border border-white/10 bg-neutral-950 px-3 py-3 text-white"
                  onChange={(event) => setReason(event.target.value)}
                  rows={3}
                  value={reason}
                />
              </label>
              <Feedback state={state} />
              <div className="flex flex-wrap gap-3">
                <button className="rounded-md border border-white/15 px-4 py-2 text-sm font-semibold text-neutral-200 hover:bg-white/10" type="submit">
                  Save answers
                </button>
                <button className="rounded-md bg-emerald-300 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-emerald-200" onClick={() => void decide("accept")} type="button">
                  Accept interview
                </button>
                <button className="rounded-md bg-rose-300 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-rose-200" onClick={() => void decide("deny")} type="button">
                  Deny interview
                </button>
              </div>
            </form>
          </>
        ) : (
          <p className="text-sm text-neutral-400">Select an interview.</p>
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
