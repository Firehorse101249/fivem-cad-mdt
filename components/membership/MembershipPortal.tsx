"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { LogoutButton } from "@/app/_components/LogoutButton";
import { getSupabaseBrowserClient } from "@/app/_lib/supabase-client";

type Question = {
  field_type: "text" | "textarea" | "date";
  id: string;
  prompt: string;
  required: boolean;
};

type StatusResponse = {
  application?: {
    denial_reason?: string | null;
    id: string;
    status: string;
    submitted_at?: string | null;
  };
  applicationAnswers?: Array<{ answer: string; question_id: string }>;
  applicationQuestions?: Question[];
  cooldown?: { expires_at?: string; reason?: string } | null;
  error?: string;
  hasCadAccess?: boolean;
  notifications?: Array<{ body: string; created_at: string; id: string; subject: string }>;
  profile?: {
    discord_id: string | null;
    discord_username: string | null;
    email: string | null;
    steam_id64: string | null;
  };
  success: boolean;
};

type ActionState = {
  error: string;
  loading: boolean;
  success: string;
};

const blankState = { error: "", loading: false, success: "" };

export function MembershipPortal() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [state, setState] = useState<ActionState>({ error: "", loading: true, success: "" });
  const [discordState, setDiscordState] = useState<ActionState>(blankState);

  const canEdit = !status?.application || status.application.status === "draft";
  const questions = useMemo(() => status?.applicationQuestions ?? [], [status]);

  async function loadStatus() {
    setState((current) => ({ ...current, loading: true }));

    try {
      const response = await fetch("/api/membership/status");
      const result = (await response.json()) as StatusResponse;

      if (!response.ok || !result.success) {
        setState({ error: result.error ?? "Unable to load membership status.", loading: false, success: "" });
        return;
      }

      setStatus(result);
      setAnswers(
        Object.fromEntries((result.applicationAnswers ?? []).map((answer) => [answer.question_id, answer.answer ?? ""])),
      );
      setState({ error: "", loading: false, success: "" });
    } catch {
      setState({ error: "Unable to reach the membership API.", loading: false, success: "" });
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadStatus();

      if (new URLSearchParams(window.location.search).get("discord") === "linked") {
        void syncDiscord();
      }
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ error: "", loading: true, success: "" });

    try {
      const response = await fetch("/api/membership/application", {
        body: JSON.stringify({ answers }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = (await response.json()) as StatusResponse;

      if (!response.ok || !result.success) {
        setState({ error: result.error ?? "Unable to save application.", loading: false, success: "" });
        return;
      }

      setState({ error: "", loading: false, success: "Application draft saved." });
      await loadStatus();
    } catch {
      setState({ error: "Unable to reach the application API.", loading: false, success: "" });
    }
  }

  async function submitApplication() {
    setState({ error: "", loading: true, success: "" });

    try {
      const saveResponse = await fetch("/api/membership/application", {
        body: JSON.stringify({ answers }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const saveResult = (await saveResponse.json()) as StatusResponse;

      if (!saveResponse.ok || !saveResult.success) {
        setState({ error: saveResult.error ?? "Unable to save before submitting.", loading: false, success: "" });
        return;
      }

      const response = await fetch("/api/membership/application/submit", { method: "POST" });
      const result = (await response.json()) as StatusResponse;

      if (!response.ok || !result.success) {
        setState({ error: result.error ?? "Unable to submit application.", loading: false, success: "" });
        return;
      }

      setState({ error: "", loading: false, success: "Application submitted for staff review." });
      await loadStatus();
    } catch {
      setState({ error: "Unable to reach the submit API.", loading: false, success: "" });
    }
  }

  async function linkDiscord() {
    setDiscordState({ error: "", loading: true, success: "" });
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setDiscordState({ error: "Supabase browser auth is not configured.", loading: false, success: "" });
      return;
    }

    const authClient = supabase.auth as typeof supabase.auth & {
      linkIdentity?: (input: { options?: { redirectTo?: string }; provider: "discord" }) => Promise<{ error: Error | null }>;
    };

    if (!authClient.linkIdentity) {
      setDiscordState({ error: "This Supabase client does not expose identity linking.", loading: false, success: "" });
      return;
    }

    const { error } = await authClient.linkIdentity({
      options: { redirectTo: `${window.location.origin}/membership?discord=linked` },
      provider: "discord",
    });

    if (error) {
      setDiscordState({ error: error.message, loading: false, success: "" });
    }
  }

  async function syncDiscord() {
    setDiscordState({ error: "", loading: true, success: "" });
    const supabase = getSupabaseBrowserClient();
    const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } };

    try {
      const response = await fetch("/api/auth/discord/sync", {
        headers: data.session?.access_token
          ? { Authorization: `Bearer ${data.session.access_token}` }
          : undefined,
        method: "POST",
      });
      const result = (await response.json()) as StatusResponse;

      if (!response.ok || !result.success) {
        setDiscordState({ error: result.error ?? "Unable to sync Discord.", loading: false, success: "" });
        return;
      }

      setDiscordState({ error: "", loading: false, success: "Discord identity synced." });
      await loadStatus();
    } catch {
      setDiscordState({ error: "Unable to reach Discord sync API.", loading: false, success: "" });
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="border-b border-white/10 bg-neutral-900">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/" className="text-sm font-medium text-sky-300 hover:text-sky-200">
              Sentinel CAD/MDT
            </Link>
            <h1 className="mt-2 text-3xl font-semibold text-white">Membership Application</h1>
          </div>
          <div className="flex gap-3">
            {status?.hasCadAccess ? (
              <Link href="/cad" className="rounded-md bg-sky-400 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-sky-300">
                Open CAD
              </Link>
            ) : null}
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[0.75fr_1.25fr]">
        <aside className="space-y-4">
          <StatusCard status={status} loading={state.loading} />
          <IdentityCard
            discordState={discordState}
            onDiscordLink={() => void linkDiscord()}
            onDiscordSync={() => void syncDiscord()}
            profile={status?.profile}
          />
          {status?.notifications?.length ? (
            <section className="rounded-lg border border-white/10 bg-neutral-900 p-5">
              <h2 className="text-lg font-semibold text-white">Messages</h2>
              <div className="mt-4 space-y-3">
                {status.notifications.map((message) => (
                  <article key={message.id} className="rounded-md border border-white/10 bg-neutral-950 p-3">
                    <p className="font-medium text-white">{message.subject}</p>
                    <p className="mt-2 text-sm leading-6 text-neutral-300">{message.body}</p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </aside>

        <section className="rounded-lg border border-white/10 bg-neutral-900 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Application</h2>
              <p className="mt-2 text-sm leading-6 text-neutral-400">
                Complete every required answer, then submit for staff review.
              </p>
            </div>
            <span className="rounded-md border border-white/10 px-3 py-2 text-sm text-neutral-300">
              {status?.application?.status ?? "loading"}
            </span>
          </div>

          <form onSubmit={saveApplication} className="mt-5 space-y-4">
            {questions.map((question) => (
              <QuestionField
                disabled={!canEdit}
                key={question.id}
                onChange={(value) => setAnswers((current) => ({ ...current, [question.id]: value }))}
                question={question}
                value={answers[question.id] ?? ""}
              />
            ))}

            <ActionFeedback state={state} />

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={!canEdit || state.loading}
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-white/15 px-4 py-2 text-sm font-semibold text-neutral-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Save draft
              </button>
              <button
                type="button"
                onClick={() => void submitApplication()}
                disabled={!canEdit || state.loading}
                className="inline-flex min-h-11 items-center justify-center rounded-md bg-sky-400 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Submit application
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

function StatusCard({ loading, status }: { loading: boolean; status: StatusResponse | null }) {
  const applicationStatus = status?.application?.status ?? (loading ? "loading" : "not_applied");
  const cooldownDate = status?.cooldown?.expires_at
    ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(status.cooldown.expires_at))
    : "";

  return (
    <section className="rounded-lg border border-white/10 bg-neutral-900 p-5">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-300">Status</p>
      <h2 className="mt-3 text-2xl font-semibold text-white">{applicationStatus.replace(/_/g, " ")}</h2>
      {status?.application?.denial_reason ? (
        <p className="mt-3 rounded-md border border-rose-300/25 bg-rose-300/10 p-3 text-sm text-rose-100">
          {status.application.denial_reason}
        </p>
      ) : null}
      {cooldownDate ? (
        <p className="mt-3 rounded-md border border-amber-300/25 bg-amber-300/10 p-3 text-sm text-amber-100">
          Reapply after {cooldownDate}. {status?.cooldown?.reason ?? ""}
        </p>
      ) : null}
    </section>
  );
}

function IdentityCard({
  discordState,
  onDiscordLink,
  onDiscordSync,
  profile,
}: {
  discordState: ActionState;
  onDiscordLink: () => void;
  onDiscordSync: () => void;
  profile: StatusResponse["profile"];
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-neutral-900 p-5">
      <h2 className="text-lg font-semibold text-white">Identity Links</h2>
      <div className="mt-4 space-y-3 text-sm">
        <IdentityRow label="Email" value={profile?.email ?? "Missing"} />
        <IdentityRow label="Steam" value={profile?.steam_id64 ?? "Not connected"} />
        <IdentityRow label="Discord" value={profile?.discord_username ?? profile?.discord_id ?? "Not connected"} />
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <a
          href="/api/auth/steam/start"
          className="inline-flex min-h-10 items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-neutral-200"
        >
          Connect Steam
        </a>
        <button
          type="button"
          onClick={onDiscordLink}
          disabled={discordState.loading}
          className="inline-flex min-h-10 items-center justify-center rounded-md bg-indigo-400 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-300 disabled:opacity-60"
        >
          Connect Discord
        </button>
        <button
          type="button"
          onClick={onDiscordSync}
          disabled={discordState.loading}
          className="inline-flex min-h-10 items-center justify-center rounded-md border border-white/15 px-4 py-2 text-sm font-semibold text-neutral-200 hover:bg-white/10 disabled:opacity-60"
        >
          Sync Discord
        </button>
      </div>
      <ActionFeedback state={discordState} />
    </section>
  );
}

function IdentityRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-neutral-950 px-3 py-2">
      <span className="text-neutral-400">{label}</span>
      <span className="break-all text-right font-medium text-white">{value}</span>
    </div>
  );
}

function QuestionField({
  disabled,
  onChange,
  question,
  value,
}: {
  disabled: boolean;
  onChange: (value: string) => void;
  question: Question;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-neutral-300">
        {question.prompt}
        {question.required ? <span className="text-rose-200"> *</span> : null}
      </span>
      {question.field_type === "textarea" ? (
        <textarea
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          required={question.required}
          rows={5}
          value={value}
          className="mt-2 w-full rounded-md border border-white/10 bg-neutral-950 px-3 py-3 text-white placeholder:text-neutral-600 focus:border-sky-300 disabled:opacity-70"
        />
      ) : (
        <input
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          required={question.required}
          type={question.field_type}
          value={value}
          className="mt-2 h-11 w-full rounded-md border border-white/10 bg-neutral-950 px-3 text-white placeholder:text-neutral-600 focus:border-sky-300 disabled:opacity-70"
        />
      )}
    </label>
  );
}

function ActionFeedback({ state }: { state: ActionState }) {
  return (
    <div className="space-y-3">
      {state.success ? (
        <div className="rounded-md border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-100">
          {state.success}
        </div>
      ) : null}
      {state.error ? (
        <div className="rounded-md border border-rose-300/30 bg-rose-300/10 px-3 py-2 text-sm text-rose-100">
          {state.error}
        </div>
      ) : null}
    </div>
  );
}
