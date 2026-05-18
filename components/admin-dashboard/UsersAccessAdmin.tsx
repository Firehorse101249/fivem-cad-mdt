"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { departmentCatalog, departmentLabel } from "@/src/lib/departments";

type User = {
  display_name: string | null;
  email: string | null;
  id: string;
  membership_status?: string | null;
  role: string;
  steam_hex?: string | null;
  steam_id64?: string | null;
};

type AccessItem = { certification_kind?: string | null; department_key?: string | null; id: string; name: string; role_kind?: string | null; rank_order?: number | null };
type Department = { category?: string | null; key: string; name: string; sort_order?: number | null };

export function UsersAccessAdmin() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [roles, setRoles] = useState<AccessItem[]>([]);
  const [certifications, setCertifications] = useState<AccessItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>(departmentCatalog.map((department) => ({
    category: department.category,
    key: department.key,
    name: department.name,
    sort_order: department.sortOrder,
  })));
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [certificationIds, setCertificationIds] = useState<string[]>([]);
  const [createDisplayName, setCreateDisplayName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState("officer");
  const [createBypass, setCreateBypass] = useState(true);
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
    if (Array.isArray(result.departments) && result.departments.length) {
      setDepartments(result.departments);
    }
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

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    const response = await fetch("/api/admin/users", {
      body: JSON.stringify({
        bypass_approved: createBypass,
        display_name: createDisplayName,
        email: createEmail,
        password: createPassword,
        role: createRole,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      setError(result.error ?? "Unable to create user.");
      return;
    }
    setCreateDisplayName("");
    setCreateEmail("");
    setCreatePassword("");
    setCreateRole("officer");
    setCreateBypass(true);
    setMessage(`Created ${result.user?.email ?? "user"}.`);
    await loadUsers();
  }

  async function bypassSelected() {
    if (!selectedId) return;
    setMessage("");
    setError("");
    const response = await fetch(`/api/admin/users/${selectedId}/bypass-access`, {
      body: JSON.stringify({ certification_ids: certificationIds, role_ids: roleIds }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      setError(result.error ?? "Unable to bypass membership.");
      return;
    }
    setMessage("Membership bypass approved and CAD access granted.");
    await loadUsers();
  }

  const selected = users.find((user) => user.id === selectedId);
  const departmentOptions = useMemo(() => normalizeDepartments(departments), [departments]);

  return (
    <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
      <section className="rounded-lg border border-white/10 bg-neutral-900 p-5">
        <h2 className="text-xl font-semibold text-white">Users</h2>
        <form className="mt-4 grid gap-3 rounded-md border border-white/10 bg-neutral-950 p-3" onSubmit={createUser}>
          <p className="text-sm font-semibold text-white">Create approved user</p>
          <input className="h-10 rounded-md border border-white/10 bg-neutral-900 px-3 text-sm text-white" onChange={(event) => setCreateDisplayName(event.target.value)} placeholder="Display name" value={createDisplayName} />
          <input className="h-10 rounded-md border border-white/10 bg-neutral-900 px-3 text-sm text-white" onChange={(event) => setCreateEmail(event.target.value)} placeholder="Email" type="email" value={createEmail} required />
          <input className="h-10 rounded-md border border-white/10 bg-neutral-900 px-3 text-sm text-white" onChange={(event) => setCreatePassword(event.target.value)} placeholder="Temporary password" type="password" value={createPassword} required />
          <select className="h-10 rounded-md border border-white/10 bg-neutral-900 px-3 text-sm text-white" onChange={(event) => setCreateRole(event.target.value)} value={createRole}>
            <option value="officer">officer</option>
            <option value="dispatch">dispatch</option>
            <option value="civilian">civilian</option>
            <option value="admin">admin</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-neutral-300">
            <input checked={createBypass} className="size-4 accent-sky-400" onChange={(event) => setCreateBypass(event.target.checked)} type="checkbox" />
            Bypass membership and grant CAD access
          </label>
          <button className="min-h-10 rounded-md bg-sky-400 px-4 text-sm font-semibold text-neutral-950 hover:bg-sky-300" type="submit">Create user</button>
        </form>
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
              <span className="mt-1 block text-xs text-neutral-500">{user.membership_status ?? "not_applied"}</span>
            </button>
          ))}
        </div>
      </section>
      <section className="rounded-lg border border-white/10 bg-neutral-900 p-5">
        {selected ? (
          <>
            <h2 className="text-2xl font-semibold text-white">{selected.display_name ?? selected.email}</h2>
            <p className="mt-2 text-sm text-neutral-400">Legacy role: {selected.role}</p>
            <p className="mt-1 text-sm text-neutral-400">Membership: {selected.membership_status ?? "not_applied"}</p>
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <AccessList departments={departmentOptions} items={roles} selected={roleIds} title="Roles" toggle={(id) => toggle(roleIds, id, setRoleIds)} />
              <AccessList departments={departmentOptions} items={certifications} selected={certificationIds} title="Certifications" toggle={(id) => toggle(certificationIds, id, setCertificationIds)} />
            </div>
            {message ? <p className="mt-4 rounded-md border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-100">{message}</p> : null}
            {error ? <p className="mt-4 rounded-md border border-rose-300/30 bg-rose-300/10 px-3 py-2 text-sm text-rose-100">{error}</p> : null}
            <div className="mt-5 flex flex-wrap gap-3">
              <button className="rounded-md bg-sky-400 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-sky-300" onClick={() => void save()} type="button">
                Save access
              </button>
              <button className="rounded-md border border-emerald-300/40 bg-emerald-300/10 px-4 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-300/20" onClick={() => void bypassSelected()} type="button">
                Bypass to CAD
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm text-neutral-400">Select a user.</p>
        )}
      </section>
    </div>
  );
}

type DepartmentView = { category: string; key: string; name: string; sortOrder: number };
type AccessGroup = { department: DepartmentView; items: AccessItem[] };

function normalizeDepartments(departments: Department[]): DepartmentView[] {
  const fromApi = departments.map((department) => {
    const fallback = departmentCatalog.find((item) => item.key === department.key);
    return {
      category: department.category ?? fallback?.category ?? "system",
      key: department.key,
      name: department.name,
      sortOrder: department.sort_order ?? fallback?.sortOrder ?? 999,
    };
  });
  const merged = [...fromApi];
  for (const department of departmentCatalog) {
    if (!merged.some((item) => item.key === department.key)) {
      merged.push({ category: department.category, key: department.key, name: department.name, sortOrder: department.sortOrder });
    }
  }
  return merged.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

function groupedItems(items: AccessItem[], departments: DepartmentView[]): AccessGroup[] {
  const systemDepartment = { category: "system", key: "__system", name: "System / Unassigned", sortOrder: -1 };
  return [systemDepartment, ...departments]
    .map((department) => ({
      department,
      items: items
        .filter((item) => (item.department_key ?? "__system") === department.key)
        .sort((a, b) => Number(a.rank_order ?? 999) - Number(b.rank_order ?? 999) || a.name.localeCompare(b.name)),
    }))
    .filter((group) => group.items.length > 0);
}

function AccessList({
  departments,
  items,
  selected,
  title,
  toggle,
}: {
  departments: DepartmentView[];
  items: AccessItem[];
  selected: string[];
  title: string;
  toggle: (id: string) => void;
}) {
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const groups = useMemo(() => groupedItems(items, departments), [departments, items]);
  return (
    <div className="rounded-md border border-white/10 bg-neutral-950 p-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-white">{title}</h3>
        <span className="font-mono text-xs text-neutral-500">{selected.length} selected</span>
      </div>
      <div className="mt-3 max-h-[580px] space-y-3 overflow-y-auto pr-1">
        {groups.map((group) => {
          const isClosed = closed[group.department.key] ?? false;
          return (
            <div className="rounded border border-white/10 bg-[#090b0f]" key={group.department.key}>
              <button className="flex w-full items-center justify-between gap-3 border-b border-white/10 px-3 py-2 text-left" onClick={() => setClosed((current) => ({ ...current, [group.department.key]: !isClosed }))} type="button">
                <span className="text-sm font-semibold text-white">{group.department.key === "__system" ? "System" : departmentLabel(group.department.key)} <span className="font-normal text-neutral-400">{group.department.name}</span></span>
                <span className="font-mono text-xs text-neutral-500">{isClosed ? "+" : "-"} {group.items.length}</span>
              </button>
              {!isClosed ? (
                <div className="space-y-2 p-2">
                  {group.items.map((item) => (
                    <label className="flex items-center gap-3 rounded border border-white/10 bg-neutral-950 p-2 text-sm text-neutral-200" key={item.id}>
                      <input checked={selected.includes(item.id)} className="size-4 accent-sky-400" onChange={() => toggle(item.id)} type="checkbox" />
                      <span>
                        <span className="block">{item.name}</span>
                        <span className="font-mono text-xs uppercase tracking-[0.12em] text-neutral-500">{[departmentLabel(item.department_key), item.role_kind ?? item.certification_kind].filter(Boolean).join(" / ")}</span>
                      </span>
                    </label>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
