import { createClient, type User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const ACCESS_COOKIE = "sb-access-token";

export type AuthenticatedUser = {
  accessToken: string;
  user: User;
};

export type AuthFailure = {
  response: NextResponse;
};

export type AuthResult = AuthenticatedUser | AuthFailure;

export function isAuthFailure(result: AuthResult): result is AuthFailure {
  return "response" in result;
}

export function jsonError(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export function getCookieValue(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie");

  if (!cookieHeader) {
    return "";
  }

  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  const match = cookies.find((cookie) => cookie.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.slice(name.length + 1)) : "";
}

export function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return "";
  }

  return authorization.slice("Bearer ".length).trim();
}

export async function requireUser(request: Request): Promise<AuthResult> {
  const accessToken = getCookieValue(request, ACCESS_COOKIE) || getBearerToken(request);

  if (!accessToken) {
    return { response: jsonError("You must be logged in.", 401) };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { response: jsonError("Supabase authentication is not configured.", 500) };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user) {
    return { response: jsonError("Your session is invalid or expired.", 401) };
  }

  return { accessToken, user: data.user };
}
