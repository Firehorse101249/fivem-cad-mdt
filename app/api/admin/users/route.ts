import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/src/lib/supabaseAdmin";

type CreateUserBody = {
  email?: unknown;
  password?: unknown;
  role?: unknown;
};

type ApiError = {
  message?: string;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

// TODO: Protect this route with verified admin authentication/authorization.
// API routes act as a secure middle layer: the browser calls this endpoint, and
// only this server-side route touches the service role key. That key bypasses
// RLS and has full Supabase project access, so it must never be exposed client-side.
export async function POST(request: Request) {
  let body: CreateUserBody;

  try {
    body = (await request.json()) as CreateUserBody;
  } catch {
    return errorResponse("Invalid JSON body.", 400);
  }

  const email = isNonEmptyString(body.email) ? body.email.trim() : "";
  const password = isNonEmptyString(body.password) ? body.password : "";
  const role = isNonEmptyString(body.role) ? body.role.trim() : "";

  if (!email || !password || !role) {
    return errorResponse("Email, password, and role are required.", 400);
  }

  try {
    const supabaseAdmin = getSupabaseAdminClient();

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role,
      },
    });

    if (error) {
      return errorResponse(error.message, 400);
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          id: data.user?.id,
          email: data.user?.email,
          role: data.user?.user_metadata?.role ?? role,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : (error as ApiError).message ?? "Unable to create user.";

    return errorResponse(message, 500);
  }
}
