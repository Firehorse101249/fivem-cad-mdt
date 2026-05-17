"use client";

import { FormEvent, useEffect, useState } from "react";

type Log = {
  actor_email: string | null;
  created_at: string;
  entity_type: string;
  event_type: string;
  id: string;
  severity: string;
  summary: string;
};

export function AuditAdmin() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const params = new URLSearchParams({ limit: "200" });
    if (search) params.set("search", search);
    const response = await fetch(`/api/admin/audit-logs?${params.toString()}`);
    const result = await response.json();
    if (!response.ok || !result.success) {
      setError(result.error ?? "Unable to load audit logs.");
      return;
    }
    setLogs(result.auditLogs ?? []);
    setError("");
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void load();
  }

  return (
    <section className="rounded-lg border border-white/10 bg-neutral-900 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Audit Logs</h2>
          <p className="mt-2 text-sm text-neutral-400">Membership, access, user, and system activity.</p>
        </div>
        <form className="flex gap-3" onSubmit={submit}>
          <input className="h-11 rounded-md border border-white/10 bg-neutral-950 px-3 text-white" onChange={(event) => setSearch(event.target.value)} placeholder="Search" value={search} />
          <button className="rounded-md bg-sky-400 px-4 py-2 text-sm font-semibold text-neutral-950" type="submit">Search</button>
        </form>
      </div>
      {error ? <p className="mt-4 rounded-md border border-rose-300/30 bg-rose-300/10 px-3 py-2 text-sm text-rose-100">{error}</p> : null}
      <div className="mt-5 overflow-hidden rounded-md border border-white/10">
        {logs.map((log) => (
          <article className="grid gap-3 border-t border-white/10 bg-neutral-950 px-4 py-3 first:border-t-0 lg:grid-cols-[0.8fr_0.7fr_1.3fr_0.8fr]" key={log.id}>
            <span className="text-xs text-neutral-400">{new Date(log.created_at).toLocaleString()}</span>
            <span className="text-sm text-sky-200">{log.event_type}</span>
            <span className="text-sm text-neutral-200">{log.summary}</span>
            <span className="text-sm text-neutral-400">{log.actor_email ?? "System"}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
