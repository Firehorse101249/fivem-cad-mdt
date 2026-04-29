import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/src/lib/supabaseAdmin";

const ACCESS_COOKIE = "sb-access-token";

type SessionBody = {
  accessToken?: unknown;
  expiresIn?: unknown;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function POST(request: Request) {
  let body: SessionBody;

  try {
    body = (await request.json()) as SessionBody;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  if (!isNonEmptyString(body.accessToken)) {
    return NextResponse.json(
      { success: false, error: "A Supabase access token is required." },
      { status: 400 },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    const { data } = await supabase.auth.getUser(body.accessToken);

    if (data.user) {
      try {
        const supabaseAdmin = getSupabaseAdminClient();
        await supabaseAdmin
          .from("profiles")
          .update({
            last_login_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", data.user.id);
      } catch {
        // Last-login tracking should not block a successful browser session.
      }
    }
  }

  const response = NextResponse.json({ success: true });
  const maxAge =
    typeof body.expiresIn === "number" && body.expiresIn > 0
      ? Math.min(body.expiresIn, 60 * 60)
      : 60 * 60;

  response.cookies.set({
    name: ACCESS_COOKIE,
    value: body.accessToken,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });

  response.cookies.set({
    name: ACCESS_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}
