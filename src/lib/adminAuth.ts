import { createClient, type User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const ADMIN_ACCESS_COOKIE = "sb-access-token";

type AdminAuthSuccess = {
  user: User;
};

type AdminAuthFailure = {
  response: NextResponse;
};

export type AdminAuthResult = AdminAuthSuccess | AdminAuthFailure;

function jsonError(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

function getCookieValue(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie");

  if (!cookieHeader) {
    return "";
  }

  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  const match = cookies.find((cookie) => cookie.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.slice(name.length + 1)) : "";
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return "";
  }

  return authorization.slice("Bearer ".length).trim();
}

export function isAdminAuthFailure(result: AdminAuthResult): result is AdminAuthFailure {
  return "response" in result;
}

export async function requireAdmin(request: Request): Promise<AdminAuthResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      response: jsonError("Supabase authentication is not configured.", 500),
    };
  }

  const accessToken = getCookieValue(request, ADMIN_ACCESS_COOKIE) || getBearerToken(request);

  if (!accessToken) {
    return {
      response: jsonError("You must be logged in to use admin tools.", 401),
    };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user) {
    return {
      response: jsonError("Your session is invalid or expired.", 401),
    };
  }

  // Admin API routes are public URLs, so each route must verify both identity
  // and authorization before using the service-role admin client.
  if (data.user.user_metadata?.role !== "admin") {
    return {
      response: jsonError("Admin access is required.", 403),
    };
  }

  return { user: data.user };
}
