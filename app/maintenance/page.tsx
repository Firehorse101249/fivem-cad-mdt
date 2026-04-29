import Link from "next/link";
import { getMaintenanceMode } from "@/src/lib/maintenance";

export default async function MaintenancePage() {
  const maintenance = await getMaintenanceMode();

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-6 py-10 text-neutral-100">
      <section className="w-full max-w-2xl rounded-lg border border-amber-300/20 bg-neutral-900 p-6 shadow-2xl shadow-black/40">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-md bg-amber-300/10 font-bold text-amber-100 ring-1 ring-amber-300/30">
            SC
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
              Sentinel CAD/MDT
            </p>
            <h1 className="text-2xl font-semibold text-white">Maintenance Mode</h1>
          </div>
        </div>

        <div className="rounded-md border border-amber-300/20 bg-amber-300/[0.06] p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-200">
            System Temporarily Offline
          </p>
          <p className="mt-4 text-lg leading-8 text-neutral-200">
            {maintenance.message || "System temporarily offline for development"}
          </p>
        </div>

        <p className="mt-5 text-sm leading-6 text-neutral-400">
          Public CAD access is paused while development or maintenance is ongoing.
          Administrators can still sign in and manage system controls.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-sky-400 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-sky-300"
          >
            Admin Login
          </Link>
          <Link
            href="/admin"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-white/15 px-4 py-2 text-sm font-semibold text-neutral-200 hover:bg-white/10"
          >
            Admin Console
          </Link>
        </div>
      </section>
    </main>
  );
}
