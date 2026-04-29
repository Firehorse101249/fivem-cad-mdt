import Link from "next/link";
import { LogoutButton } from "../_components/LogoutButton";

const adminSections = [
  {
    title: "Create User",
    description: "Prepare accounts for officers, dispatchers, civilians, and staff.",
    fields: ["Email address", "Temporary password", "Display name"],
    action: "Queue User Creation",
  },
  {
    title: "Set Permissions",
    description: "Assign department access, CAD sections, and future role groups.",
    fields: ["User email", "Role", "Department"],
    action: "Save Permissions",
  },
  {
    title: "Remove User",
    description: "Disable or remove users that should no longer access the CAD.",
    fields: ["User email", "Removal reason"],
    action: "Review Removal",
  },
  {
    title: "Reset Password",
    description: "Start a safe password reset flow for an existing user.",
    fields: ["User email"],
    action: "Send Reset",
  },
];

const futureTools = [
  "Audit log viewer",
  "Department roster manager",
  "Penal code editor",
  "Server integration settings",
];

export default function AdminPage() {
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
            Server-only setup required
          </p>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-neutral-300">
            These admin tools are intentionally UI-only until a secure server action
            is wired with a Supabase service-role key stored on the server. The
            service-role key must never be exposed through NEXT_PUBLIC variables or
            sent to the browser.
          </p>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          {adminSections.map((section) => (
            <article key={section.title} className="rounded-lg border border-white/10 bg-neutral-900 p-5">
              <div className="mb-5">
                <h2 className="text-xl font-semibold text-white">{section.title}</h2>
                <p className="mt-2 text-sm leading-6 text-neutral-400">{section.description}</p>
              </div>

              <form className="space-y-4">
                {section.fields.map((field) => (
                  <label key={field} className="block">
                    <span className="text-sm font-medium text-neutral-300">{field}</span>
                    <input
                      type={field.toLowerCase().includes("password") ? "password" : "text"}
                      className="mt-2 h-11 w-full rounded-md border border-white/10 bg-neutral-950 px-3 text-white placeholder:text-neutral-600 focus:border-sky-300"
                      placeholder={field}
                    />
                  </label>
                ))}

                <button
                  type="button"
                  className="inline-flex min-h-11 items-center justify-center rounded-md border border-white/15 px-4 py-2 text-sm font-semibold text-neutral-300"
                  title="Requires server-only Supabase admin action"
                >
                  {section.action}
                </button>
              </form>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-white/10 bg-white/[0.04] p-5">
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
