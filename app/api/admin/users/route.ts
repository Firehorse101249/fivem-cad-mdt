import { NextResponse } from "next/server";
import { isAdminAuthFailure, requireAdmin } from "@/src/lib/adminAuth";
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

export async function POST(request: Request) {
  const adminAuth = await requireAdmin(request);

  if (isAdminAuthFailure(adminAuth)) {
    return adminAuth.response;
  }

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

    if (!data.user) {
      return errorResponse("Supabase did not return a created user.", 500);
    }

    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: data.user.id,
      email: data.user.email ?? email,
      role,
      display_name: data.user.email ?? email,
    });

    if (profileError) {
      return errorResponse(`User created, but profile setup failed: ${profileError.message}`, 500);
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
          role,
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
