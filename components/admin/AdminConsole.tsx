"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { LogoutButton } from "@/app/_components/LogoutButton";

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
  auditLogs?: AuditLogEntry[];
  error?: string;
  filters?: AuditFilterOptions;
  history?: Record<string, unknown[]>;
  maintenance?: MaintenanceSetting;
  message?: string;
  profile?: UserProfile;
  success: boolean;
  user?: {
    email?: string;
    role?: string;
  };
  users?: UserProfile[];
};

type MaintenanceSetting = {
  enabled: boolean;
  message: string;
};

type AuditLogEntry = {
  actor_email: string | null;
  actor_id: string | null;
  created_at: string;
  entity_id: string | null;
  entity_type: string;
  event_type: string;
  id: string;
  ip_address: string | null;
  metadata: Record<string, unknown> | null;
  severity: string;
  source: string;
  summary: string;
  target_civilian_id: string | null;
  target_user_id: string | null;
};

type AuditFilterOptions = {
  entityTypes: string[];
  eventTypes: string[];
};

type ActionState = {
  error: string;
  loading: boolean;
  success: string;
};

const blankAction: ActionState = { error: "", loading: false, success: "" };

const futureTools = [
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

export function AdminConsole() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [details, setDetails] = useState<UserDetails | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all");
  const [listState, setListState] = useState<ActionState>({ error: "", loading: true, success: "" });
  const [createState, setCreateState] = useState<ActionState>(blankAction);
  const [detailState, setDetailState] = useState<ActionState>(blankAction);
  const [maintenanceState, setMaintenanceState] = useState<ActionState>(blankAction);
  const [auditState, setAuditState] = useState<ActionState>({ error: "", loading: true, success: "" });
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditFilters, setAuditFilters] = useState<AuditFilterOptions>({ entityTypes: [], eventTypes: [] });
  const [auditUserId, setAuditUserId] = useState("");
  const [auditEventType, setAuditEventType] = useState("");
  const [auditEntityType, setAuditEntityType] = useState("");
  const [auditSearch, setAuditSearch] = useState("");
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState(
    "System temporarily offline for development",
  );
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

  async function loadAuditLogs(filters?: {
    entityType?: string;
    eventType?: string;
    search?: string;
    userId?: string;
  }) {
    setAuditState({ error: "", loading: true, success: "" });

    const params = new URLSearchParams();
    const nextUserId = filters?.userId ?? auditUserId;
    const nextEventType = filters?.eventType ?? auditEventType;
    const nextEntityType = filters?.entityType ?? auditEntityType;
    const nextSearch = filters?.search ?? auditSearch;

    if (nextUserId) params.set("userId", nextUserId);
    if (nextEventType) params.set("eventType", nextEventType);
    if (nextEntityType) params.set("entityType", nextEntityType);
    if (nextSearch) params.set("search", nextSearch);
    params.set("limit", "150");

    try {
      const response = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      const result = (await response.json()) as ApiResponse;

      if (!response.ok || !result.success) {
        setAuditState({ error: result.error ?? "Unable to load audit logs.", loading: false, success: "" });
        return;
      }

      setAuditLogs(result.auditLogs ?? []);
      setAuditFilters(result.filters ?? { entityTypes: [], eventTypes: [] });
      setAuditState({ error: "", loading: false, success: "" });
    } catch {
      setAuditState({ error: "Unable to reach the audit log API route.", loading: false, success: "" });
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

    async function loadInitialMaintenance() {
      try {
        const response = await fetch("/api/admin/system-settings/maintenance");
        const result = (await response.json()) as ApiResponse;

        if (!isActive) {
          return;
        }

        if (!response.ok || !result.success || !result.maintenance) {
          setMaintenanceState({
            error: result.error ?? "Unable to load maintenance setting.",
            loading: false,
            success: "",
          });
          return;
        }

        setMaintenanceEnabled(result.maintenance.enabled);
        setMaintenanceMessage(result.maintenance.message);
        setMaintenanceState({ error: "", loading: false, success: "" });
      } catch {
        if (isActive) {
          setMaintenanceState({
            error: "Unable to reach the maintenance settings API route.",
            loading: false,
            success: "",
          });
        }
      }
    }

    void loadInitialMaintenance();

    async function loadInitialAuditLogs() {
      try {
        const response = await fetch("/api/admin/audit-logs?limit=150");
        const result = (await response.json()) as ApiResponse;

        if (!isActive) {
          return;
        }

        if (!response.ok || !result.success) {
          setAuditState({ error: result.error ?? "Unable to load audit logs.", loading: false, success: "" });
          return;
        }

        setAuditLogs(result.auditLogs ?? []);
        setAuditFilters(result.filters ?? { entityTypes: [], eventTypes: [] });
        setAuditState({ error: "", loading: false, success: "" });
      } catch {
        if (isActive) {
          setAuditState({ error: "Unable to reach the audit log API route.", loading: false, success: "" });
        }
      }
    }

    void loadInitialAuditLogs();

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

  async function handleSaveMaintenance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMaintenanceState({ error: "", loading: true, success: "" });

    try {
      const response = await fetch("/api/admin/system-settings/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: maintenanceEnabled,
          message: maintenanceMessage,
        }),
      });
      const result = (await response.json()) as ApiResponse;

      if (!response.ok || !result.success || !result.maintenance) {
        setMaintenanceState({
          error: result.error ?? "Unable to save maintenance setting.",
          loading: false,
          success: "",
        });
        return;
      }

      setMaintenanceEnabled(result.maintenance.enabled);
      setMaintenanceMessage(result.maintenance.message);
      setMaintenanceState({
        error: "",
        loading: false,
        success: result.maintenance.enabled
          ? "Maintenance mode is now ON."
          : "Maintenance mode is now OFF.",
      });
      await loadAuditLogs();
    } catch {
      setMaintenanceState({
        error: "Unable to reach the maintenance settings API route.",
        loading: false,
        success: "",
      });
    }
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
      await loadAuditLogs();
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
      await loadAuditLogs();
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
      await loadAuditLogs();
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
      await loadAuditLogs();
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

        <SystemControls
          enabled={maintenanceEnabled}
          message={maintenanceMessage}
          onEnabledChange={setMaintenanceEnabled}
          onMessageChange={setMaintenanceMessage}
          onSubmit={handleSaveMaintenance}
          state={maintenanceState}
        />

        <AuditLogViewer
          entityType={auditEntityType}
          eventType={auditEventType}
          filters={auditFilters}
          logs={auditLogs}
          onEntityTypeChange={setAuditEntityType}
          onEventTypeChange={setAuditEventType}
          onRefresh={() => void loadAuditLogs()}
          onSearchChange={setAuditSearch}
          onSubmit={(event) => {
            event.preventDefault();
            void loadAuditLogs();
          }}
          onUserChange={setAuditUserId}
          search={auditSearch}
          state={auditState}
          userId={auditUserId}
          users={users}
        />

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

function AuditLogViewer({
  entityType,
  eventType,
  filters,
  logs,
  onEntityTypeChange,
  onEventTypeChange,
  onRefresh,
  onSearchChange,
  onSubmit,
  onUserChange,
  search,
  state,
  userId,
  users,
}: {
  entityType: string;
  eventType: string;
  filters: AuditFilterOptions;
  logs: AuditLogEntry[];
  onEntityTypeChange: (value: string) => void;
  onEventTypeChange: (value: string) => void;
  onRefresh: () => void;
  onSearchChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUserChange: (value: string) => void;
  search: string;
  state: ActionState;
  userId: string;
  users: UserProfile[];
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-neutral-900 p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-300">
            Audit Log Viewer
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">Change History</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-400">
            Tracks admin user actions, maintenance changes, and Supabase-backed
            character/profile table changes. Character events require the audit SQL
            triggers to be installed.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex min-h-10 items-center justify-center rounded-md border border-white/15 px-4 py-2 text-sm font-semibold text-neutral-200 hover:bg-white/10"
        >
          Refresh
        </button>
      </div>

      <form onSubmit={onSubmit} className="mt-5 grid gap-3 lg:grid-cols-[1fr_1fr_1fr_1.2fr_auto]">
        <label className="block">
          <span className="text-sm font-medium text-neutral-300">User</span>
          <select
            value={userId}
            onChange={(event) => onUserChange(event.target.value)}
            className="mt-2 h-11 w-full rounded-md border border-white/10 bg-neutral-950 px-3 text-sm text-white focus:border-sky-300"
          >
            <option value="">All users</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.display_name ?? user.email ?? user.id}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-neutral-300">Log type</span>
          <select
            value={eventType}
            onChange={(event) => onEventTypeChange(event.target.value)}
            className="mt-2 h-11 w-full rounded-md border border-white/10 bg-neutral-950 px-3 text-sm text-white focus:border-sky-300"
          >
            <option value="">All log types</option>
            {filters.eventTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-neutral-300">Entity</span>
          <select
            value={entityType}
            onChange={(event) => onEntityTypeChange(event.target.value)}
            className="mt-2 h-11 w-full rounded-md border border-white/10 bg-neutral-950 px-3 text-sm text-white focus:border-sky-300"
          >
            <option value="">All entities</option>
            {filters.entityTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-neutral-300">Search</span>
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="mt-2 h-11 w-full rounded-md border border-white/10 bg-neutral-950 px-3 text-sm text-white placeholder:text-neutral-600 focus:border-sky-300"
            placeholder="Summary, email, entity id"
          />
        </label>

        <button
          type="submit"
          disabled={state.loading}
          className="mt-7 inline-flex h-11 items-center justify-center rounded-md bg-sky-400 px-4 text-sm font-semibold text-neutral-950 hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {state.loading ? "Loading" : "Apply"}
        </button>
      </form>

      <ActionFeedback state={state} />

      <div className="mt-5 overflow-hidden rounded-md border border-white/10">
        <div className="grid grid-cols-[0.95fr_0.85fr_1.4fr] bg-neutral-950 px-4 py-3 text-xs uppercase tracking-[0.16em] text-neutral-500 xl:grid-cols-[0.8fr_0.8fr_0.75fr_1.5fr_0.9fr_0.8fr]">
          <span>Time</span>
          <span>Type</span>
          <span className="hidden xl:block">Actor</span>
          <span>Summary</span>
          <span className="hidden xl:block">Entity</span>
          <span className="hidden xl:block">Source</span>
        </div>
        <div className="max-h-[520px] overflow-y-auto">
          {logs.map((log) => (
            <article
              key={log.id}
              className="grid grid-cols-[0.95fr_0.85fr_1.4fr] gap-3 border-t border-white/10 px-4 py-3 text-sm xl:grid-cols-[0.8fr_0.8fr_0.75fr_1.5fr_0.9fr_0.8fr]"
            >
              <span className="font-mono text-xs text-neutral-400">{formatDate(log.created_at)}</span>
              <span className={`h-fit rounded-md border px-2 py-1 text-xs ${severityClass(log.severity)}`}>
                {log.event_type}
              </span>
              <span className="hidden truncate text-neutral-300 xl:block">
                {log.actor_email ?? log.actor_id ?? "System"}
              </span>
              <span className="text-neutral-200">
                {log.summary}
                <span className="mt-1 block font-mono text-xs text-neutral-600">
                  target user: {log.target_user_id ?? "none"} / civilian: {log.target_civilian_id ?? "none"}
                </span>
              </span>
              <span className="hidden break-words font-mono text-xs text-neutral-400 xl:block">
                {log.entity_type}:{log.entity_id ?? "unknown"}
              </span>
              <span className="hidden text-neutral-400 xl:block">{log.source}</span>
            </article>
          ))}
          {!logs.length && !state.loading ? (
            <div className="border-t border-white/10 px-4 py-6 text-sm text-neutral-400">
              No audit logs found. Run supabase/audit-log-schema.sql, then perform an admin action.
            </div>
          ) : null}
        </div>
      </div>
    </section>
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

function SystemControls({
  enabled,
  message,
  onEnabledChange,
  onMessageChange,
  onSubmit,
  state,
}: {
  enabled: boolean;
  message: string;
  onEnabledChange: (value: boolean) => void;
  onMessageChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  state: ActionState;
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-neutral-900 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-300">
            Development Controls
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">System Controls</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-400">
            Maintenance mode hides the public CAD while development is ongoing.
            Admin routes remain accessible so you can turn it back off.
          </p>
        </div>
        <span
          className={`rounded-md border px-3 py-2 text-sm font-semibold ${
            enabled
              ? "border-amber-300/30 bg-amber-300/10 text-amber-100"
              : "border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
          }`}
        >
          {enabled ? "Maintenance ON" : "Maintenance OFF"}
        </span>
      </div>

      <form onSubmit={onSubmit} className="mt-5 grid gap-4 lg:grid-cols-[auto_1fr_auto] lg:items-end">
        <label className="flex items-center gap-3 rounded-md border border-white/10 bg-neutral-950 px-4 py-3">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => onEnabledChange(event.target.checked)}
            className="size-5 accent-sky-400"
          />
          <span className="text-sm font-medium text-neutral-200">Maintenance Mode</span>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-neutral-300">Maintenance message</span>
          <input
            value={message}
            onChange={(event) => onMessageChange(event.target.value)}
            className="mt-2 h-11 w-full rounded-md border border-white/10 bg-neutral-950 px-3 text-white placeholder:text-neutral-600 focus:border-sky-300"
            placeholder="System temporarily offline for development"
            required
          />
        </label>

        <button
          type="submit"
          disabled={state.loading}
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-sky-400 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {state.loading ? "Saving" : "Save"}
        </button>
      </form>
      <ActionFeedback state={state} />
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

function severityClass(severity: string) {
  if (severity === "critical") return "border-rose-300/40 bg-rose-400/10 text-rose-100";
  if (severity === "warning") return "border-amber-300/35 bg-amber-300/10 text-amber-100";
  if (severity === "debug") return "border-white/10 bg-white/[0.04] text-neutral-400";
  return "border-sky-300/30 bg-sky-300/10 text-sky-100";
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
