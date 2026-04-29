"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { LogoutButton } from "../_components/LogoutButton";

const roles = ["admin", "dispatch", "officer", "civilian"];

const futureAdminTools = [
  {
    title: "Delete user",
    description: "Safely remove or disable CAD access for a selected account.",
  },
  {
    title: "Reset password",
    description: "Send a secure reset flow or issue a temporary password.",
  },
  {
    title: "Change permissions",
    description: "Adjust roles, departments, and CAD/MDT module access.",
  },
];

type CreateUserResponse = {
  success: boolean;
  error?: string;
  user?: {
    email?: string;
    role?: string;
  };
};

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(roles[2]);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage("");
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          role,
        }),
      });

      const result = (await response.json()) as CreateUserResponse;

      if (!response.ok || !result.success) {
        setErrorMessage(result.error ?? "Unable to create user.");
        return;
      }

      setStatusMessage(
        `Created ${result.user?.email ?? email} with ${result.user?.role ?? role} access.`,
      );
      setEmail("");
      setPassword("");
      setRole(roles[2]);
    } catch {
      setErrorMessage("Unable to reach the admin API route.");
    } finally {
      setIsSubmitting(false);
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
            Server-side admin boundary
          </p>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-neutral-300">
            User creation now posts to a Next.js API route. That route is the secure
            middle layer that can use the Supabase service-role key on the server.
            The service-role key bypasses RLS and has full database access, so it
            must never be exposed to browser code.
          </p>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-lg border border-white/10 bg-neutral-900 p-5">
            <div className="mb-5">
              <h2 className="text-xl font-semibold text-white">Create User</h2>
              <p className="mt-2 text-sm leading-6 text-neutral-400">
                Add a Supabase Auth user with a confirmed email and role metadata.
              </p>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-neutral-300">Email address</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="mt-2 h-11 w-full rounded-md border border-white/10 bg-neutral-950 px-3 text-white placeholder:text-neutral-600 focus:border-sky-300"
                  placeholder="officer@example.com"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-neutral-300">Temporary password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={6}
                  className="mt-2 h-11 w-full rounded-md border border-white/10 bg-neutral-950 px-3 text-white placeholder:text-neutral-600 focus:border-sky-300"
                  placeholder="Minimum 6 characters"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-neutral-300">Role</span>
                <select
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                  className="mt-2 h-11 w-full rounded-md border border-white/10 bg-neutral-950 px-3 text-white focus:border-sky-300"
                >
                  {roles.map((roleOption) => (
                    <option key={roleOption} value={roleOption}>
                      {roleOption}
                    </option>
                  ))}
                </select>
              </label>

              {statusMessage ? (
                <div className="rounded-md border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-100">
                  {statusMessage}
                </div>
              ) : null}

              {errorMessage ? (
                <div className="rounded-md border border-rose-300/30 bg-rose-300/10 px-3 py-2 text-sm text-rose-100">
                  {errorMessage}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex min-h-11 items-center justify-center rounded-md bg-sky-400 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Creating user" : "Create user"}
              </button>
            </form>
          </article>

          <article className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
            <h2 className="text-xl font-semibold text-white">Admin Roadmap</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-400">
              These tools are intentionally visible but inactive until each has a
              protected server-side endpoint.
            </p>

            <div className="mt-5 space-y-3">
              {futureAdminTools.map((tool) => (
                <div key={tool.title} className="rounded-md border border-dashed border-white/15 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-white">{tool.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-neutral-400">{tool.description}</p>
                    </div>
                    <span className="shrink-0 rounded-md border border-amber-300/25 px-2 py-1 text-xs font-medium text-amber-200">
                      Under Construction
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="mt-8 rounded-lg border border-white/10 bg-neutral-900 p-5">
          <h2 className="text-xl font-semibold text-white">Future Admin Tools</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {["Audit log viewer", "Department roster manager", "Penal code editor", "Server integration settings"].map(
              (tool) => (
                <div key={tool} className="rounded-md border border-dashed border-white/15 p-4">
                  <div className="mb-4 size-2 rounded-full bg-sky-300" />
                  <p className="text-sm font-medium text-neutral-300">{tool}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-neutral-600">
                    Under Construction
                  </p>
                </div>
              ),
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
