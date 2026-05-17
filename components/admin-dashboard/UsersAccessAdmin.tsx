"use client";

import { useEffect, useState } from "react";

type User = {
  display_name: string | null;
  email: string | null;
  id: string;
  role: string;
  steam_hex?: string | null;
  steam_id64?: string | null;
};

type AccessItem = { id: string; name: string };

export function UsersAccessAdmin() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [roles, setRoles] = useState<AccessItem[]>([]);
  const [certifications, setCertifications] = useState<AccessItem[]>([]);
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [certificationIds, setCertificationIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadUsers() {
    const response = await fetch("/api/admin/users");
    const result = await response.json();
    if (!response.ok || !result.success) {
      setError(result.error ?? "Unable to load users.");
      return;
    }
    setUsers(result.users ?? []);
    const next = selectedId || result.users?.[0]?.id || "";
    setSelectedId(next);
    if (next) await loadAccess(next);
  }

  async function loadAccess(userId: string) {
    const response = await fetch(`/api/admin/access/users/${userId}`);
    const result = await response.json();
    if (!response.ok || !result.success) {
      setError(result.error ?? "Unable to load access.");
      return;
    }
    setRoles(result.roles ?? []);
    setCertifications(result.certifications ?? []);
    setRoleIds((result.roleAssignments ?? []).map((row: { role_id: string }) => row.role_id));
    setCertificationIds((result.certificationAssignments ?? []).map((row: { certification_id: string }) => row.certification_id));
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadUsers();
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectUser(userId: string) {
    setSelectedId(userId);
    void loadAccess(userId);
  }

  function toggle(list: string[], value: string, setter: (next: string[]) => void) {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  async function save() {
    setMessage("");
    setError("");
    const response = await fetch(`/api/admin/access/users/${selectedId}`, {
      body: JSON.stringify({ certification_ids: certificationIds, role_ids: roleIds }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      setError(result.error ?? "Unable to save access.");
      return;
    }
    setMessage("User access updated.");
  }

  const selected = users.find((user) => user.id === selectedId);

  return (
    <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
      <section className="rounded-lg border border-white/10 bg-neutral-900 p-5">
        <h2 className="text-xl font-semibold text-white">Users</h2>
        <div className="mt-4 max-h-[720px] space-y-2 overflow-y-auto">
          {users.map((user) => (
            <button
              className={`block w-full rounded-md border px-3 py-3 text-left ${
                selectedId === user.id ? "border-sky-300/50 bg-sky-300/10" : "border-white/10 bg-neutral-950"
              }`}
              key={user.id}
              onClick={() => selectUser(user.id)}
              type="button"
            >
              <span className="block font-medium text-white">{user.display_name ?? user.email ?? user.id}</span>
              <span className="mt-1 block text-sm text-neutral-400">{user.email}</span>
            </button>
          ))}
        </div>
      </section>
      <section className="rounded-lg border border-white/10 bg-neutral-900 p-5">
        {selected ? (
          <>
            <h2 className="text-2xl font-semibold text-white">{selected.display_name ?? selected.email}</h2>
            <p className="mt-2 text-sm text-neutral-400">Legacy role: {selected.role}</p>
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <AccessList items={roles} selected={roleIds} title="Roles" toggle={(id) => toggle(roleIds, id, setRoleIds)} />
              <AccessList items={certifications} selected={certificationIds} title="Certifications" toggle={(id) => toggle(certificationIds, id, setCertificationIds)} />
            </div>
            {message ? <p className="mt-4 rounded-md border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-100">{message}</p> : null}
            {error ? <p className="mt-4 rounded-md border border-rose-300/30 bg-rose-300/10 px-3 py-2 text-sm text-rose-100">{error}</p> : null}
            <button className="mt-5 rounded-md bg-sky-400 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-sky-300" onClick={() => void save()} type="button">
              Save access
            </button>
          </>
        ) : (
          <p className="text-sm text-neutral-400">Select a user.</p>
        )}
      </section>
    </div>
  );
}

function AccessList({
  items,
  selected,
  title,
  toggle,
}: {
  items: AccessItem[];
  selected: string[];
  title: string;
  toggle: (id: string) => void;
}) {
  return (
    <div>
      <h3 className="font-semibold text-white">{title}</h3>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <label className="flex items-center gap-3 rounded-md border border-white/10 bg-neutral-950 p-3 text-sm text-neutral-200" key={item.id}>
            <input checked={selected.includes(item.id)} className="size-4 accent-sky-400" onChange={() => toggle(item.id)} type="checkbox" />
            {item.name}
          </label>
        ))}
      </div>
    </div>
  );
}
