import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/src/lib/supabaseAdmin";
import { isNonEmptyString } from "@/src/lib/userRules";

type SignupBody = {
  email?: unknown;
  password?: unknown;
  display_name?: unknown;
};

function errorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function POST(request: Request) {
  let body: SignupBody;

  try {
    body = (await request.json()) as SignupBody;
  } catch {
    return errorResponse("Invalid JSON body.", 400);
  }

  const email = isNonEmptyString(body.email) ? body.email.trim() : "";
  const password = isNonEmptyString(body.password) ? body.password : "";
  const displayName = isNonEmptyString(body.display_name) ? body.display_name.trim() : "";

  if (!email || !password || !displayName) {
    return errorResponse("Email, password, and display name are required.", 400);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return errorResponse("Supabase signup is not configured.", 500);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
        role: "civilian",
      },
    },
  });

  if (error) {
    return errorResponse(error.message, 400);
  }

  if (!data.user) {
    return errorResponse("Supabase did not return a signup user.", 500);
  }

  try {
    const supabaseAdmin = getSupabaseAdminClient();

    // Public signup never accepts a role from the browser. Every new account is
    // inserted as civilian; admins can promote users later through protected routes.
    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: data.user.id,
      email,
      role: "civilian",
      display_name: displayName,
      membership_status: "not_applied",
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      return errorResponse(`Signup created, but profile setup failed: ${profileError.message}`, 500);
    }

    return NextResponse.json({
      success: true,
      message: "Account created. Check your email if confirmation is enabled, then log in.",
    });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Unable to finish signup.", 500);
  }
}
