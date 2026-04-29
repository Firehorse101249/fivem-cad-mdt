import Link from "next/link";

const features = [
  {
    title: "Live Dispatch Board",
    description:
      "Organize active calls, priority levels, units, scene status, and assignment flow from one command surface.",
  },
  {
    title: "Officer MDT",
    description:
      "Give patrol units fast access to calls, reports, warrants, BOLOs, citations, arrests, and lookup tools.",
  },
  {
    title: "Civilian Records",
    description:
      "Keep civilians, vehicles, identifiers, and incident history structured for roleplay communities.",
  },
  {
    title: "Admin Controls",
    description:
      "Prepare user onboarding, permissions, removals, password resets, and future department tooling.",
  },
];

const stats = [
  ["12", "CAD sections"],
  ["24/7", "server ready"],
  ["RBAC", "planned access"],
];

function ArrowIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6 6 6-6 6" />
    </svg>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen overflow-hidden bg-neutral-950 text-neutral-100">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-md border border-sky-400/40 bg-sky-400/10 text-sm font-bold text-sky-200">
            SC
          </span>
          <span>
            <span className="block text-sm font-semibold uppercase tracking-[0.24em] text-neutral-400">
              Sentinel
            </span>
            <span className="block text-lg font-semibold text-white">CAD/MDT</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-3 text-sm text-neutral-300 sm:flex">
          <Link href="/admin" className="rounded-md px-3 py-2 hover:bg-white/10">
            Admin
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-md bg-sky-400 px-4 py-2 font-semibold text-neutral-950 hover:bg-sky-300"
          >
            Login <ArrowIcon />
          </Link>
        </nav>
      </header>

      <main>
        <section className="relative mx-auto grid min-h-[calc(100vh-80px)] w-full max-w-7xl items-center gap-12 px-6 pb-12 pt-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="absolute inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.16),transparent_34%),radial-gradient(circle_at_75%_12%,rgba(234,179,8,0.11),transparent_28%)]" />
          <div className="max-w-3xl">
            <p className="mb-5 inline-flex rounded-md border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-sm font-medium text-sky-200">
              FiveM roleplay operations, cleaned up and mission-ready
            </p>
            <h1 className="text-5xl font-semibold leading-tight text-white sm:text-6xl lg:text-7xl">
              Sentinel CAD/MDT
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-300">
              A dark, responsive command platform for dispatchers, officers, and
              administrators to manage calls, records, BOLOs, warrants, reports,
              citations, arrests, and community access.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-sky-400 px-5 py-3 font-semibold text-neutral-950 hover:bg-sky-300"
              >
                Login to CAD <ArrowIcon />
              </Link>
              <Link
                href="/admin"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-white/15 px-5 py-3 font-semibold text-white hover:bg-white/10"
              >
                Admin Access <ArrowIcon />
              </Link>
            </div>
            <div className="mt-10 grid max-w-lg grid-cols-3 gap-3">
              {stats.map(([value, label]) => (
                <div key={label} className="rounded-md border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-2xl font-semibold text-white">{value}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.18em] text-neutral-500">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-neutral-900/80 p-4 shadow-2xl shadow-black/50">
            <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <p className="text-sm text-neutral-400">Active Dispatch</p>
                <h2 className="text-xl font-semibold text-white">Priority Queue</h2>
              </div>
              <span className="rounded-md bg-emerald-400/10 px-3 py-1 text-sm font-medium text-emerald-300">
                Online
              </span>
            </div>
            <div className="space-y-3">
              {["10-50 at Strawberry Ave", "Traffic stop, postal 829", "BOLO review pending"].map(
                (call, index) => (
                  <div
                    key={call}
                    className="grid gap-3 rounded-md border border-white/10 bg-neutral-950/70 p-4 sm:grid-cols-[auto_1fr_auto]"
                  >
                    <span className="grid size-10 place-items-center rounded-md bg-amber-400/10 text-sm font-bold text-amber-300">
                      P{index + 1}
                    </span>
                    <div>
                      <h3 className="font-semibold text-white">{call}</h3>
                      <p className="mt-1 text-sm text-neutral-400">
                        Units assigned, scene notes synced, report shell ready.
                      </p>
                    </div>
                    <span className="self-start rounded-md border border-sky-400/30 px-2 py-1 text-xs font-medium text-sky-200">
                      CAD
                    </span>
                  </div>
                ),
              )}
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-neutral-900/60">
          <div className="mx-auto grid max-w-7xl gap-8 px-6 py-16 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-300">
                What it does
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-white">
                A practical CAD/MDT foundation for departments and civilians.
              </h2>
            </div>
            <p className="text-base leading-8 text-neutral-300">
              Sentinel is built as the operations layer for a FiveM community:
              dispatchers can triage calls, officers can move through MDT tasks,
              civilians and vehicles have a place to grow, and administrators get
              a controlled surface for onboarding and permissions.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-16">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="rounded-lg border border-white/10 bg-white/[0.04] p-5"
              >
                <div className="mb-5 size-2 rounded-full bg-sky-300" />
                <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-neutral-400">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 px-6 py-8 text-sm text-neutral-500">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p>Sentinel CAD/MDT for FiveM roleplay communities.</p>
          <div className="flex gap-4">
            <Link href="/cad" className="hover:text-neutral-200">
              Dashboard
            </Link>
            <Link href="/login" className="hover:text-neutral-200">
              Login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
