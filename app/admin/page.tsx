"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { LogoutButton } from "../_components/LogoutButton";

const roles = ["admin", "dispatch", "officer", "civilian"];

type ActionKey = "create" | "delete" | "reset" | "permissions";

type ActionState = {
  error: string;
  loading: boolean;
  success: string;
};

type AdminApiResponse = {
  success: boolean;
  error?: string;
  message?: string;
  user?: {
    email?: string;
    role?: string;
  };
};

const initialActionState: Record<ActionKey, ActionState> = {
  create: { error: "", loading: false, success: "" },
  delete: { error: "", loading: false, success: "" },
  reset: { error: "", loading: false, success: "" },
  permissions: { error: "", loading: false, success: "" },
};

const futureTools = [
  "Audit log viewer",
  "Department roster manager",
  "Penal code editor",
  "Server integration settings",
];

export default function AdminPage() {
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState(roles[2]);
  const [deleteUserId, setDeleteUserId] = useState("");
  const [resetUserId, setResetUserId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [permissionsUserId, setPermissionsUserId] = useState("");
  const [permissionsRole, setPermissionsRole] = useState(roles[2]);
  const [actionState, setActionState] = useState(initialActionState);

  function setActionStatus(action: ActionKey, nextState: Partial<ActionState>) {
    setActionState((current) => ({
      ...current,
      [action]: {
        ...current[action],
        ...nextState,
      },
    }));
  }

  async function postAdminAction(
    action: ActionKey,
    url: string,
    body: Record<string, string>,
    successMessage: (result: AdminApiResponse) => string,
  ) {
    setActionStatus(action, { error: "", loading: true, success: "" });

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const result = (await response.json()) as AdminApiResponse;

      if (!response.ok || !result.success) {
        setActionStatus(action, {
          error: result.error ?? "Admin action failed.",
          loading: false,
        });
        return false;
      }

      setActionStatus(action, {
        loading: false,
        success: successMessage(result),
      });
      return true;
    } catch {
      setActionStatus(action, {
        error: "Unable to reach the admin API route.",
        loading: false,
      });
      return false;
    }
  }

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const ok = await postAdminAction(
      "create",
      "/api/admin/users",
      {
        email: createEmail,
        password: createPassword,
        role: createRole,
      },
      (result) =>
        `Created ${result.user?.email ?? createEmail} with ${
          result.user?.role ?? createRole
        } access.`,
    );

    if (ok) {
      setCreateEmail("");
      setCreatePassword("");
      setCreateRole(roles[2]);
    }
  }

  async function handleDeleteUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const ok = await postAdminAction(
      "delete",
      "/api/admin/users/delete",
      { userId: deleteUserId },
      (result) => result.message ?? "User deleted.",
    );

    if (ok) {
      setDeleteUserId("");
    }
  }

  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const ok = await postAdminAction(
      "reset",
      "/api/admin/users/reset-password",
      {
        userId: resetUserId,
        newPassword,
      },
      (result) => `Password reset for ${result.user?.email ?? resetUserId}.`,
    );

    if (ok) {
      setResetUserId("");
      setNewPassword("");
    }
  }

  async function handleChangePermissions(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const ok = await postAdminAction(
      "permissions",
      "/api/admin/users/permissions",
      {
        userId: permissionsUserId,
        role: permissionsRole,
      },
      (result) =>
        `Updated ${result.user?.email ?? permissionsUserId} to ${
          result.user?.role ?? permissionsRole
        }.`,
    );

    if (ok) {
      setPermissionsUserId("");
      setPermissionsRole(roles[2]);
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

      <div className="mx-auto max-w-7xl px-6 py-8">
        <section className="mb-8 rounded-lg border border-amber-300/20 bg-amber-300/[0.06] p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-200">
            Protected Admin Actions
          </p>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-neutral-300">
            These forms call server-side API routes. Each route verifies the current
            Supabase user and requires <span className="font-semibold text-white">admin</span>{" "}
            role metadata before it uses the service-role admin client.
          </p>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <AdminCard
            title="Create User"
            description="Add a Supabase Auth user with a confirmed email and role metadata."
            action="create"
            actionState={actionState.create}
          >
            <form onSubmit={handleCreateUser} className="space-y-4">
              <TextInput
                label="Email address"
                type="email"
                value={createEmail}
                onChange={setCreateEmail}
                placeholder="officer@example.com"
              />
              <TextInput
                label="Temporary password"
                type="password"
                value={createPassword}
                onChange={setCreatePassword}
                placeholder="Minimum 6 characters"
                minLength={6}
              />
              <RoleSelect value={createRole} onChange={setCreateRole} />
              <SubmitButton loading={actionState.create.loading} label="Create user" loadingLabel="Creating user" />
            </form>
          </AdminCard>

          <AdminCard
            title="Delete User"
            description="Remove a Supabase Auth user by ID."
            action="delete"
            actionState={actionState.delete}
          >
            <form onSubmit={handleDeleteUser} className="space-y-4">
              <TextInput
                label="User ID"
                value={deleteUserId}
                onChange={setDeleteUserId}
                placeholder="Supabase auth user UUID"
              />
              <SubmitButton
                loading={actionState.delete.loading}
                label="Delete user"
                loadingLabel="Deleting user"
                tone="danger"
              />
            </form>
          </AdminCard>

          <AdminCard
            title="Reset User Password"
            description="Set a new password for an existing Supabase Auth user."
            action="reset"
            actionState={actionState.reset}
          >
            <form onSubmit={handleResetPassword} className="space-y-4">
              <TextInput
                label="User ID"
                value={resetUserId}
                onChange={setResetUserId}
                placeholder="Supabase auth user UUID"
              />
              <TextInput
                label="New password"
                type="password"
                value={newPassword}
                onChange={setNewPassword}
                placeholder="Minimum 6 characters"
                minLength={6}
              />
              <SubmitButton
                loading={actionState.reset.loading}
                label="Reset password"
                loadingLabel="Resetting password"
              />
            </form>
          </AdminCard>

          <AdminCard
            title="Change Permissions"
            description="Update a user's role stored in Supabase user metadata."
            action="permissions"
            actionState={actionState.permissions}
          >
            <form onSubmit={handleChangePermissions} className="space-y-4">
              <TextInput
                label="User ID"
                value={permissionsUserId}
                onChange={setPermissionsUserId}
                placeholder="Supabase auth user UUID"
              />
              <RoleSelect value={permissionsRole} onChange={setPermissionsRole} />
              <SubmitButton
                loading={actionState.permissions.loading}
                label="Change role"
                loadingLabel="Changing role"
              />
            </form>
          </AdminCard>
        </section>

        <section className="mt-8 rounded-lg border border-white/10 bg-neutral-900 p-5">
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

function AdminCard({
  actionState,
  children,
  description,
  title,
}: {
  action: ActionKey;
  actionState: ActionState;
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <article className="rounded-lg border border-white/10 bg-neutral-900 p-5">
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-neutral-400">{description}</p>
      </div>
      {children}
      <ActionFeedback state={actionState} />
    </article>
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
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-neutral-300">Role</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-md border border-white/10 bg-neutral-950 px-3 text-white focus:border-sky-300"
      >
        {roles.map((roleOption) => (
          <option key={roleOption} value={roleOption}>
            {roleOption}
          </option>
        ))}
      </select>
    </label>
  );
}

function SubmitButton({
  label,
  loading,
  loadingLabel,
  tone = "default",
}: {
  label: string;
  loading: boolean;
  loadingLabel: string;
  tone?: "danger" | "default";
}) {
  const className =
    tone === "danger"
      ? "inline-flex min-h-11 items-center justify-center rounded-md bg-rose-300 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
      : "inline-flex min-h-11 items-center justify-center rounded-md bg-sky-400 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <button type="submit" disabled={loading} className={className}>
      {loading ? loadingLabel : label}
    </button>
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
