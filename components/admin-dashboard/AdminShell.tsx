"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/app/_components/LogoutButton";

const adminLinks = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/applications", label: "Applications" },
  { href: "/admin/interviews", label: "Interviews" },
  { href: "/admin/questions", label: "Questions" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/roles", label: "Roles" },
  { href: "/admin/certifications", label: "Certifications" },
  { href: "/admin/fto", label: "FTO" },
  { href: "/admin/audit", label: "Audit" },
  { href: "/admin/system", label: "System" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="border-b border-white/10 bg-neutral-900">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link href="/" className="text-sm font-medium text-sky-300 hover:text-sky-200">
              Sentinel CAD/MDT
            </Link>
            <h1 className="mt-2 text-3xl font-semibold text-white">Admin</h1>
          </div>
          <div className="flex gap-3">
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
      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[240px_1fr]">
        <aside className="h-fit rounded-lg border border-white/10 bg-neutral-900 p-3">
          <nav className="flex gap-2 overflow-x-auto lg:block lg:space-y-1 lg:overflow-visible">
            {adminLinks.map((link) => (
              <Link
                href={link.href}
                key={link.href}
                className={`block shrink-0 rounded-md px-3 py-2 text-sm font-medium ${
                  pathname === link.href
                    ? "bg-sky-400 text-neutral-950"
                    : "text-neutral-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
