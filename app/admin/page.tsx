import Link from "next/link";

const tiles = [
  ["Applications", "/admin/applications", "Review whitelist applications, approve for interview, or deny with cooldowns."],
  ["Interviews", "/admin/interviews", "Read application context, record interview answers, and accept or deny."],
  ["Questions", "/admin/questions", "Customize application and interview questions."],
  ["Users", "/admin/users", "Manage account roles, password resets, and access assignments."],
  ["Roles", "/admin/roles", "Customize roles and their permissions."],
  ["Certifications", "/admin/certifications", "Configure department-style certifications and module access."],
  ["Audit", "/admin/audit", "Review sensitive admin and membership events."],
  ["System", "/admin/system", "Maintenance and system controls."],
];

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-white/10 bg-neutral-900 p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-300">Admin Hub</p>
        <h2 className="mt-3 text-3xl font-semibold text-white">Staff tools</h2>
        <p className="mt-3 max-w-3xl leading-7 text-neutral-300">
          Manage whitelist applications, interviews, access roles, certifications, logs, and system settings from dedicated pages.
        </p>
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tiles.map(([title, href, description]) => (
          <Link
            className="rounded-lg border border-white/10 bg-white/[0.04] p-5 transition hover:border-sky-300/40 hover:bg-white/[0.07]"
            href={href}
            key={href}
          >
            <h3 className="text-xl font-semibold text-white">{title}</h3>
            <p className="mt-3 text-sm leading-6 text-neutral-400">{description}</p>
            <p className="mt-5 text-sm font-semibold text-sky-300">Open</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
