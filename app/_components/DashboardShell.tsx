"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cadSections } from "../_data/cad";
import { LogoutButton } from "./LogoutButton";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/cad/dispatch" || pathname === "/cad/officer" || pathname === "/cad/fto") {
    return <>{children}</>;
  }

  const linkClass = (href: string) => {
    const active = pathname === href;
    return `block shrink-0 rounded-md px-3 py-2 text-sm font-medium transition ${
      active
        ? "bg-sky-300 text-neutral-950 shadow-lg shadow-sky-950/20"
        : "text-neutral-300 hover:bg-white/10 hover:text-white"
    }`;
  };

  return (
    <div className="min-h-screen bg-[#070a0f] text-neutral-100">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="border-b border-white/10 bg-[#101419]/95 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-4 px-5 py-4 lg:block">
            <Link href="/cad" className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-md bg-sky-400/10 text-sm font-bold text-sky-200 ring-1 ring-sky-400/30">
                SC
              </span>
              <span>
                <span className="block text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">
                  Sentinel
                </span>
                <span className="block font-semibold text-white">CAD/MDT</span>
              </span>
            </Link>
            <div className="lg:hidden">
              <LogoutButton />
            </div>
          </div>

          <nav className="flex gap-2 overflow-x-auto px-5 pb-4 lg:block lg:max-h-[calc(100vh-96px)] lg:space-y-1 lg:overflow-y-auto">
            <Link
              href="/cad"
              className={linkClass("/cad")}
            >
              Dashboard
            </Link>
            {cadSections.map((section) => (
              <Link
                key={section.href}
                href={section.href}
                className={linkClass(section.href)}
              >
                {section.title}
              </Link>
            ))}
          </nav>
        </aside>

        <div className="min-w-0">
          <header className="hidden border-b border-white/10 bg-[#0b0f14]/95 px-6 py-4 lg:flex lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                FiveM Operations Center
              </p>
              <p className="text-lg font-semibold text-white">Computer Aided Dispatch</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-md border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-xs font-semibold text-emerald-100">
                Authenticated
              </span>
              <Link
                href="/admin"
                className="rounded-md px-3 py-2 text-sm font-medium text-neutral-300 hover:bg-white/10 hover:text-white"
              >
                Admin
              </Link>
              <LogoutButton />
            </div>
          </header>
          <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
