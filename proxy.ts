import { NextRequest, NextResponse } from "next/server";
import { getMaintenanceMode } from "@/src/lib/maintenance";

const publicFilePattern = /\.(.*)$/;

function isStaticAsset(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/audio") ||
    publicFilePattern.test(pathname)
  );
}

function isAllowedDuringMaintenance(pathname: string) {
  return (
    pathname === "/maintenance" ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/membership" ||
    pathname.startsWith("/membership/") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/api/auth/session" ||
    pathname.startsWith("/api/auth/steam/") ||
    pathname === "/api/auth/discord/sync" ||
    pathname.startsWith("/api/membership/") ||
    pathname === "/api/admin/system-settings/maintenance" ||
    pathname.startsWith("/api/admin/")
  );
}

// Next.js 16 renamed middleware.ts to proxy.ts. Proxy runs on the server before
// route rendering, so it can safely call the server-only maintenance helper.
// We intentionally allow /admin and protected admin APIs during maintenance so
// an admin can turn maintenance mode off without changing Vercel env vars.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  const maintenance = await getMaintenanceMode();

  if (!maintenance.enabled || isAllowedDuringMaintenance(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api")) {
    return NextResponse.json({ message: "Maintenance Mode Active" }, { status: 503 });
  }

  const maintenanceUrl = request.nextUrl.clone();
  maintenanceUrl.pathname = "/maintenance";
  maintenanceUrl.search = "";

  return NextResponse.redirect(maintenanceUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
