"use client";

import { FormEvent, useEffect, useState } from "react";

export function SystemAdmin() {
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("System temporarily offline for development");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const response = await fetch("/api/admin/system-settings/maintenance");
    const result = await response.json();
    if (!response.ok || !result.success) {
      setError(result.error ?? "Unable to load maintenance setting.");
      return;
    }
    setEnabled(Boolean(result.maintenance?.enabled));
    setMessage(result.maintenance?.message ?? message);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/admin/system-settings/maintenance", {
      body: JSON.stringify({ enabled, message }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      setError(result.error ?? "Unable to save maintenance setting.");
      return;
    }
    setError("");
    setNotice("System setting saved.");
  }

  return (
    <section className="rounded-lg border border-white/10 bg-neutral-900 p-5">
      <h2 className="text-xl font-semibold text-white">System Settings</h2>
      <form className="mt-5 space-y-4" onSubmit={save}>
        <label className="flex items-center gap-3 rounded-md border border-white/10 bg-neutral-950 p-4 text-sm text-neutral-200">
          <input checked={enabled} className="size-5 accent-sky-400" onChange={(event) => setEnabled(event.target.checked)} type="checkbox" />
          Maintenance mode
        </label>
        <label className="block">
          <span className="text-sm font-medium text-neutral-300">Maintenance message</span>
          <input className="mt-2 h-11 w-full rounded-md border border-white/10 bg-neutral-950 px-3 text-white" onChange={(event) => setMessage(event.target.value)} value={message} />
        </label>
        {notice ? <p className="rounded-md border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-100">{notice}</p> : null}
        {error ? <p className="rounded-md border border-rose-300/30 bg-rose-300/10 px-3 py-2 text-sm text-rose-100">{error}</p> : null}
        <button className="rounded-md bg-sky-400 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-sky-300" type="submit">Save</button>
      </form>
    </section>
  );
}
