"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { LogoutButton } from "../_components/LogoutButton";

const roles = ["admin", "dispatch", "officer", "civilian"] as const;

type Role = (typeof roles)[number];

type UserProfile = {
  created_at: string | null;
  display_name: string | null;
  email: string | null;
  id: string;
  last_login_at: string | null;
  role: Role;
  steam_hex: string | null;
};

type UserDetails = {
  history: Record<string, unknown[]>;
  profile: UserProfile;
};

type ApiResponse = {
  error?: string;
  history?: Record<string, unknown[]>;
  message?: string;
  profile?: UserProfile;
  success: boolean;
  user?: {
    email?: string;
    role?: string;
  };
  users?: UserProfile[];
};

type ActionState = {
  error: string;
  loading: boolean;
  success: string;
};

const blankAction: ActionState = { error: "", loading: false, success: "" };

const futureTools = [
  "Audit log viewer",
  "Department roster manager",
  "Penal code editor",
  "Server integration settings",
];

const historyLabels: Record<string, string> = {
  arrests: "Arrests",
  bolos: "BOLOs",
  citations: "Citations",
  civilians: "Civilian Records",
  dispatch_calls: "Dispatch Calls",
  reports: "Reports",
  vehicles: "Vehicles",
  warrants: "Warrants",
};

export default function AdminPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [details, setDetails] = useState<UserDetails | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all");
  const [listState, setListState] = useState<ActionState>({ error: "", loading: true, success: "" });
  const [createState, setCreateState] = useState<ActionState>(blankAction);
  const [detailState, setDetailState] = useState<ActionState>(blankAction);
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createDisplayName, setCreateDisplayName] = useState("");
  const [createSteamHex, setCreateSteamHex] = useState("");
  const [createRole, setCreateRole] = useState<Role>("officer");
  const [detailRole, setDetailRole] = useState<Role>("civilian");

  async function loadUsers(query = "") {
    setListState({ error: "", loading: true, success: "" });

    try {
      const url = query ? `/api/admin/users?search=${encodeURIComponent(query)}` : "/api/admin/users";
      const response = await fetch(url);
      const result = (await response.json()) as ApiResponse;

      if (!response.ok || !result.success) {
        setListState({ error: result.error ?? "Unable to load users.", loading: false, success: "" });
        return;
      }

      setUsers(result.users ?? []);
      setListState({ error: "", loading: false, success: "" });
    } catch {
      setListState({ error: "Unable to reach the user list API route.", loading: false, success: "" });
    }
  }

  async function loadUserDetails(userId: string) {
    setSelectedUserId(userId);
    setDetailState({ error: "", loading: true, success: "" });

    try {
      const response = await fetch(`/api/admin/users/${userId}`);
      const result = (await response.json()) as ApiResponse;

      if (!response.ok || !result.success || !result.profile) {
        setDetailState({ error: result.error ?? "Unable to load user details.", loading: false, success: "" });
        return;
      }

      setDetails({
        history: result.history ?? {},
        profile: result.profile,
      });
      setDetailRole(result.profile.role);
      setDetailState({ error: "", loading: false, success: "" });
    } catch {
      setDetailState({ error: "Unable to reach the user detail API route.", loading: false, success: "" });
    }
  }

  useEffect(() => {
    let isActive = true;

    async function loadInitialUsers() {
      try {
        const response = await fetch("/api/admin/users");
        const result = (await response.json()) as ApiResponse;

        if (!isActive) {
          return;
        }

        if (!response.ok || !result.success) {
          setListState({ error: result.error ?? "Unable to load users.", loading: false, success: "" });
          return;
        }

        setUsers(result.users ?? []);
        setListState({ error: "", loading: false, success: "" });
      } catch {
        if (isActive) {
          setListState({ error: "Unable to reach the user list API route.", loading: false, success: "" });
        }
      }
    }

    void loadInitialUsers();

    return () => {
      isActive = false;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => roleFilter === "all" || user.role === roleFilter);
  }, [roleFilter, users]);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadUsers(search);
  }

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateState({ error: "", loading: true, success: "" });

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: createDisplayName,
          email: createEmail,
          password: createPassword,
          role: createRole,
          steam_hex: createSteamHex,
        }),
      });
      const result = (await response.json()) as ApiResponse;

      if (!response.ok || !result.success) {
        setCreateState({ error: result.error ?? "Unable to create user.", loading: false, success: "" });
        return;
      }

      setCreateState({
        error: "",
        loading: false,
        success: `Created ${result.user?.email ?? createEmail}.`,
      });
      setCreateDisplayName("");
      setCreateEmail("");
      setCreatePassword("");
      setCreateSteamHex("");
      setCreateRole("officer");
      await loadUsers(search);
    } catch {
      setCreateState({ error: "Unable to reach the create user API route.", loading: false, success: "" });
    }
  }

  async function handleChangeRole() {
    if (!details) {
      return;
    }

    setDetailState({ error: "", loading: true, success: "" });

    try {
      const response = await fetch(`/api/admin/users/${details.profile.id}/permissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: detailRole }),
      });
      const result = (await response.json()) as ApiResponse;

      if (!response.ok || !result.success) {
        setDetailState({ error: result.error ?? "Unable to update role.", loading: false, success: "" });
        return;
      }

      setDetailState({ error: "", loading: false, success: "Role updated." });
      await loadUsers(search);
      await loadUserDetails(details.profile.id);
    } catch {
      setDetailState({ error: "Unable to reach the permissions API route.", loading: false, success: "" });
    }
  }

  async function handlePasswordReset() {
    if (!details) {
      return;
    }

    setDetailState({ error: "", loading: true, success: "" });

    try {
      const response = await fetch(`/api/admin/users/${details.profile.id}/reset-password`, {
        method: "POST",
      });
      const result = (await response.json()) as ApiResponse;

      if (!response.ok || !result.success) {
        setDetailState({ error: result.error ?? "Unable to send reset email.", loading: false, success: "" });
        return;
      }

      setDetailState({
        error: "",
        loading: false,
        success: result.message ?? "Password reset email sent.",
      });
    } catch {
      setDetailState({ error: "Unable to reach the password reset API route.", loading: false, success: "" });
    }
  }

  async function handleDeleteUser() {
    if (!details) {
      return;
    }

    const confirmed = window.confirm(`Delete ${details.profile.email ?? details.profile.id}?`);

    if (!confirmed) {
      return;
    }

    setDetailState({ error: "", loading: true, success: "" });

    try {
      const response = await fetch(`/api/admin/users/${details.profile.id}/delete`, {
        method: "DELETE",
      });
      const result = (await response.json()) as ApiResponse;

      if (!response.ok || !result.success) {
        setDetailState({ error: result.error ?? "Unable to delete user.", loading: false, success: "" });
        return;
      }

      setDetails(null);
      setSelectedUserId("");
      setDetailState({ error: "", loading: false, success: "User deleted." });
      await loadUsers(search);
    } catch {
      setDetailState({ error: "Unable to reach the delete user API route.", loading: false, success: "" });
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="border-b border-white/10 bg-neutral-900/80">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/" className="text-sm font-medium text-sky-300 hover:text-sky-200">
              Sentinel CAD/MDT
            </Link>
            <h1 className="mt-2 text-3xl font-semibold text-white">Admin Console</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/cad"
              className="inline-flex min-h-10 items-center justify-center rounded-md bg-sky-400 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-sky-300"
            >
              Open CAD
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <section className="rounded-lg border border-amber-300/20 bg-amber-300/[0.06] p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-200">
            Protected User Management
          </p>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-neutral-300">
            Admin routes verify the current Supabase session and require{" "}
            <span className="font-semibold text-white">public.profiles.role = admin</span>{" "}
            before touching the server-only service-role client.
          </p>
        </section>

        <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <CreateUserCard
            createDisplayName={createDisplayName}
            createEmail={createEmail}
            createPassword={createPassword}
            createRole={createRole}
            createState={createState}
            createSteamHex={createSteamHex}
            onDisplayNameChange={setCreateDisplayName}
            onEmailChange={setCreateEmail}
            onPasswordChange={setCreatePassword}
            onRoleChange={setCreateRole}
            onSteamHexChange={setCreateSteamHex}
            onSubmit={handleCreateUser}
          />

          <section className="rounded-lg border border-white/10 bg-neutral-900 p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">User Management</h2>
                <p className="mt-2 text-sm text-neutral-400">
                  Search, filter, and open users for CAD history and admin actions.
                </p>
              </div>
              <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="h-11 rounded-md border border-white/10 bg-neutral-950 px-3 text-sm text-white placeholder:text-neutral-600 focus:border-sky-300"
                  placeholder="Search users"
                />
                <select
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value as "all" | Role)}
                  className="h-11 rounded-md border border-white/10 bg-neutral-950 px-3 text-sm text-white focus:border-sky-300"
                >
                  <option value="all">All roles</option>
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="h-11 rounded-md bg-sky-400 px-4 text-sm font-semibold text-neutral-950 hover:bg-sky-300"
                >
                  Search
                </button>
              </form>
            </div>

            <ActionFeedback state={listState} />

            <div className="mt-5 overflow-hidden rounded-md border border-white/10">
              <div className="grid grid-cols-[1fr_1fr_0.6fr] bg-neutral-950 px-4 py-3 text-xs uppercase tracking-[0.16em] text-neutral-500 md:grid-cols-[1fr_1fr_0.5fr_1fr_0.8fr]">
                <span>Name</span>
                <span>Email</span>
                <span>Role</span>
                <span className="hidden md:block">Steam Hex</span>
                <span className="hidden md:block">Created</span>
              </div>
              <div className="max-h-[460px] overflow-y-auto">
                {filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => void loadUserDetails(user.id)}
                    className={`grid w-full grid-cols-[1fr_1fr_0.6fr] gap-3 border-t border-white/10 px-4 py-3 text-left text-sm hover:bg-white/[0.06] md:grid-cols-[1fr_1fr_0.5fr_1fr_0.8fr] ${
                      selectedUserId === user.id ? "bg-sky-400/10" : ""
                    }`}
                  >
                    <span className="truncate font-medium text-white">{user.display_name ?? "Unnamed"}</span>
                    <span className="truncate text-neutral-300">{user.email ?? "No email"}</span>
                    <span className="text-sky-200">{user.role}</span>
                    <span className="hidden truncate text-neutral-400 md:block">{user.steam_hex ?? "Not set"}</span>
                    <span className="hidden text-neutral-400 md:block">{formatDate(user.created_at)}</span>
                  </button>
                ))}
                {!filteredUsers.length && !listState.loading ? (
                  <div className="border-t border-white/10 px-4 py-6 text-sm text-neutral-400">
                    No users found.
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        </section>

        <UserDetailPanel
          detailRole={detailRole}
          details={details}
          detailState={detailState}
          onChangeRole={handleChangeRole}
          onDelete={handleDeleteUser}
          onPasswordReset={handlePasswordReset}
          onRoleChange={setDetailRole}
        />

        <section className="rounded-lg border border-white/10 bg-neutral-900 p-5">
          <h2 className="text-xl font-semibold text-white">Future Admin Tools</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {futureTools.map((tool) => (
              <div key={tool} className="rounded-md border border-dashed border-white/15 p-4">
                <div className="mb-4 size-2 rounded-full bg-sky-300" />
                <p className="text-sm font-medium text-neutral-300">{tool}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-neutral-600">
                  Under Construction
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function CreateUserCard({
  createDisplayName,
  createEmail,
  createPassword,
  createRole,
  createState,
  createSteamHex,
  onDisplayNameChange,
  onEmailChange,
  onPasswordChange,
  onRoleChange,
  onSteamHexChange,
  onSubmit,
}: {
  createDisplayName: string;
  createEmail: string;
  createPassword: string;
  createRole: Role;
  createState: ActionState;
  createSteamHex: string;
  onDisplayNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onRoleChange: (value: Role) => void;
  onSteamHexChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-neutral-900 p-5">
      <h2 className="text-xl font-semibold text-white">Create User</h2>
      <p className="mt-2 text-sm leading-6 text-neutral-400">
        Admin-created users can be assigned staff roles immediately.
      </p>
      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <TextInput label="Display name" value={createDisplayName} onChange={onDisplayNameChange} placeholder="Jane Officer" />
        <TextInput label="Email address" type="email" value={createEmail} onChange={onEmailChange} placeholder="officer@example.com" />
        <TextInput label="Temporary password" type="password" value={createPassword} onChange={onPasswordChange} placeholder="Minimum 6 characters" minLength={6} />
        <TextInput label="Steam Hex ID" value={createSteamHex} onChange={onSteamHexChange} placeholder="steam:110000112345678" />
        <RoleSelect value={createRole} onChange={onRoleChange} />
        <button
          type="submit"
          disabled={createState.loading}
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-sky-400 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {createState.loading ? "Creating user" : "Create user"}
        </button>
      </form>
      <ActionFeedback state={createState} />
    </section>
  );
}

function UserDetailPanel({
  detailRole,
  details,
  detailState,
  onChangeRole,
  onDelete,
  onPasswordReset,
  onRoleChange,
}: {
  detailRole: Role;
  details: UserDetails | null;
  detailState: ActionState;
  onChangeRole: () => void;
  onDelete: () => void;
  onPasswordReset: () => void;
  onRoleChange: (value: Role) => void;
}) {
  if (!details) {
    return (
      <section className="rounded-lg border border-dashed border-white/15 bg-white/[0.03] p-6">
        <h2 className="text-xl font-semibold text-white">User Detail</h2>
        <p className="mt-2 text-sm text-neutral-400">
          Select a user to view account details, CAD history placeholders, and admin actions.
        </p>
        <ActionFeedback state={detailState} />
      </section>
    );
  }

  const historyEntries = Object.entries(details.history);
  const hasHistory = historyEntries.some(([, items]) => items.length > 0);

  return (
    <section className="rounded-lg border border-white/10 bg-neutral-900 p-5">
      <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-300">
            User Detail
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-white">
            {details.profile.display_name ?? "Unnamed User"}
          </h2>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <DetailItem label="Email" value={details.profile.email ?? "No email"} />
            <DetailItem label="Role" value={details.profile.role} />
            <DetailItem label="Steam Hex" value={details.profile.steam_hex ?? "Not set"} />
            <DetailItem label="Created" value={formatDate(details.profile.created_at)} />
            <DetailItem label="Last login" value={formatDate(details.profile.last_login_at)} />
            <DetailItem label="User ID" value={details.profile.id} />
          </dl>
        </div>

        <div className="rounded-md border border-white/10 bg-neutral-950 p-4">
          <h3 className="font-semibold text-white">Admin Actions</h3>
          <div className="mt-4 space-y-4">
            <RoleSelect value={detailRole} onChange={onRoleChange} />
            <button
              type="button"
              onClick={onChangeRole}
              disabled={detailState.loading}
              className="mr-3 inline-flex min-h-10 items-center justify-center rounded-md bg-sky-400 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-sky-300 disabled:opacity-60"
            >
              Update role
            </button>
            <button
              type="button"
              onClick={onPasswordReset}
              disabled={detailState.loading}
              className="mr-3 inline-flex min-h-10 items-center justify-center rounded-md border border-white/15 px-4 py-2 text-sm font-semibold text-neutral-200 hover:bg-white/10 disabled:opacity-60"
            >
              Send reset email
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={detailState.loading}
              className="inline-flex min-h-10 items-center justify-center rounded-md bg-rose-300 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-rose-200 disabled:opacity-60"
            >
              Delete user
            </button>
          </div>
          <ActionFeedback state={detailState} />
        </div>
      </div>

      <div className="mt-6 rounded-md border border-white/10 bg-white/[0.03] p-4">
        <h3 className="font-semibold text-white">User History</h3>
        <p className="mt-2 text-sm text-neutral-400">
          CAD history, reports, arrests, citations, warrants, notes, and admin actions.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {historyEntries.map(([key, items]) => (
            <div key={key} className="rounded-md border border-white/10 bg-neutral-950 p-4">
              <div className="text-2xl font-semibold text-white">{items.length}</div>
              <div className="mt-1 text-sm text-neutral-300">{historyLabels[key] ?? key}</div>
            </div>
          ))}
        </div>
        {!hasHistory ? (
          <div className="mt-4 rounded-md border border-dashed border-white/15 px-4 py-3 text-sm text-neutral-400">
            No history available yet. Detailed CAD history views are Under Construction.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function TextInput({
  label,
  minLength,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  label: string;
  minLength?: number;
  onChange: (value: string) => void;
  placeholder: string;
  type?: "email" | "password" | "text";
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-neutral-300">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        minLength={minLength}
        className="mt-2 h-11 w-full rounded-md border border-white/10 bg-neutral-950 px-3 text-white placeholder:text-neutral-600 focus:border-sky-300"
        placeholder={placeholder}
      />
    </label>
  );
}

function RoleSelect({
  onChange,
  value,
}: {
  onChange: (value: Role) => void;
  value: Role;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-neutral-300">Role</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as Role)}
        className="mt-2 h-11 w-full rounded-md border border-white/10 bg-neutral-950 px-3 text-white focus:border-sky-300"
      >
        {roles.map((role) => (
          <option key={role} value={role}>
            {role}
          </option>
        ))}
      </select>
    </label>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-neutral-950 p-4">
      <dt className="text-xs uppercase tracking-[0.16em] text-neutral-500">{label}</dt>
      <dd className="mt-2 break-words text-sm text-neutral-200">{value}</dd>
    </div>
  );
}

function ActionFeedback({ state }: { state: ActionState }) {
  return (
    <div className="mt-4 space-y-3">
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

function formatDate(value: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
