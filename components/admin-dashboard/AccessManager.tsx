"use client";

import { FormEvent, useEffect, useState } from "react";

type Permission = { category: string; key: string; label: string };
type AccessItem = Record<string, unknown> & {
  access_certification_permissions?: Array<{ permission_key: string }>;
  access_role_permissions?: Array<{ permission_key: string }>;
  certification_kind?: string | null;
  department_key?: string | null;
  description?: string;
  id: string;
  is_founder?: boolean;
  key: string;
  name: string;
  priority?: number;
  rank_order?: number | null;
  role_kind?: string | null;
};

type Draft = {
  description: string;
  department_key: string;
  id: string;
  key: string;
  name: string;
  permission_keys: string[];
  priority: number;
  rank_order: number;
  role_kind: string;
  certification_kind: string;
};

const blankDraft: Draft = {
  description: "",
  department_key: "",
  id: "",
  key: "",
  name: "",
  permission_keys: [],
  priority: 0,
  rank_order: 0,
  role_kind: "general",
  certification_kind: "certification",
};

export function AccessManager({ mode }: { mode: "roles" | "certifications" }) {
  const [items, setItems] = useState<AccessItem[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const endpoint = mode === "roles" ? "/api/admin/access/roles" : "/api/admin/access/certifications";
  const title = mode === "roles" ? "Roles" : "Certifications";

  async function load() {
    const response = await fetch(endpoint);
    const result = await response.json();
    if (!response.ok || !result.success) {
      setError(result.error ?? `Unable to load ${mode}.`);
      return;
    }
    setItems(mode === "roles" ? result.roles ?? [] : result.certifications ?? []);
    setPermissions(result.permissions ?? []);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  function edit(item: AccessItem) {
    const itemPermissions =
      mode === "roles" ? item.access_role_permissions ?? [] : item.access_certification_permissions ?? [];
    setDraft({
      description: item.description ?? "",
      department_key: item.department_key ?? "",
      id: item.id,
      key: item.key,
      name: item.name,
      permission_keys: itemPermissions.map((permission) => permission.permission_key),
      priority: item.priority ?? 0,
      rank_order: item.rank_order ?? 0,
      role_kind: item.role_kind ?? "general",
      certification_kind: item.certification_kind ?? "certification",
    });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const response = await fetch(endpoint, {
      body: JSON.stringify(draft),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      setError(result.error ?? `Unable to save ${mode}.`);
      return;
    }
    setDraft(blankDraft);
    setMessage(`${title.slice(0, -1)} saved.`);
    await load();
  }

  function togglePermission(key: string) {
    setDraft((current) => ({
      ...current,
      permission_keys: current.permission_keys.includes(key)
        ? current.permission_keys.filter((item) => item !== key)
        : [...current.permission_keys, key],
    }));
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-lg border border-white/10 bg-neutral-900 p-5">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        <div className="mt-4 space-y-2">
          {items.map((item) => (
            <button className="block w-full rounded-md border border-white/10 bg-neutral-950 px-3 py-3 text-left hover:bg-white/[0.04]" key={item.id} onClick={() => edit(item)} type="button">
              <span className="font-medium text-white">{item.name}</span>
              <span className="mt-1 block text-sm text-neutral-400">{item.description ?? item.key}</span>
              <span className="mt-1 block text-xs text-neutral-500">{[item.department_key ?? "system", item.role_kind ?? item.certification_kind].filter(Boolean).join(" / ")}</span>
            </button>
          ))}
        </div>
      </section>
      <section className="rounded-lg border border-white/10 bg-neutral-900 p-5">
        <h2 className="text-xl font-semibold text-white">{draft.id ? `Edit ${title.slice(0, -1)}` : `New ${title.slice(0, -1)}`}</h2>
        <form className="mt-5 space-y-4" onSubmit={save}>
          <Text label="Name" onChange={(value) => setDraft({ ...draft, name: value })} value={draft.name} />
          <Text label="Key" onChange={(value) => setDraft({ ...draft, key: value })} value={draft.key} />
          <Text label="Department key" onChange={(value) => setDraft({ ...draft, department_key: value })} value={draft.department_key} />
          <Text label="Description" onChange={(value) => setDraft({ ...draft, description: value })} value={draft.description} />
          {mode === "roles" ? (
            <div className="grid gap-3 md:grid-cols-3">
              <Text label="Priority" onChange={(value) => setDraft({ ...draft, priority: Number(value) || 0 })} value={String(draft.priority)} />
              <Text label="Rank order" onChange={(value) => setDraft({ ...draft, rank_order: Number(value) || 0 })} value={String(draft.rank_order)} />
              <Select label="Role kind" onChange={(value) => setDraft({ ...draft, role_kind: value })} options={["general", "rank", "system"]} value={draft.role_kind} />
            </div>
          ) : (
            <Select label="Certification kind" onChange={(value) => setDraft({ ...draft, certification_kind: value })} options={["certification", "subdivision", "perk", "tier"]} value={draft.certification_kind} />
          )}
          <div>
            <p className="text-sm font-medium text-neutral-300">Permissions</p>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {permissions.map((permission) => (
                <label className="flex items-start gap-3 rounded-md border border-white/10 bg-neutral-950 p-3 text-sm text-neutral-200" key={permission.key}>
                  <input checked={draft.permission_keys.includes(permission.key)} className="mt-0.5 size-4 accent-sky-400" onChange={() => togglePermission(permission.key)} type="checkbox" />
                  <span>
                    <span className="block font-medium text-white">{permission.label}</span>
                    <span className="text-xs text-neutral-500">{permission.key}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
          {message ? <p className="rounded-md border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-100">{message}</p> : null}
          {error ? <p className="rounded-md border border-rose-300/30 bg-rose-300/10 px-3 py-2 text-sm text-rose-100">{error}</p> : null}
          <div className="flex gap-3">
            <button className="rounded-md bg-sky-400 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-sky-300" type="submit">Save</button>
            <button className="rounded-md border border-white/15 px-4 py-2 text-sm font-semibold text-neutral-200 hover:bg-white/10" onClick={() => setDraft(blankDraft)} type="button">New</button>
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

function Select({ label, onChange, options, value }: { label: string; onChange: (value: string) => void; options: string[]; value: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-neutral-300">{label}</span>
      <select className="mt-2 h-11 w-full rounded-md border border-white/10 bg-neutral-950 px-3 text-white" onChange={(event) => onChange(event.target.value)} value={value}>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}
