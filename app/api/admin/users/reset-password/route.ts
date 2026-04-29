import { NextResponse } from "next/server";
import { isAdminAuthFailure, requireAdmin } from "@/src/lib/adminAuth";
import { getSupabaseAdminClient } from "@/src/lib/supabaseAdmin";

type ResetPasswordBody = {
  userId?: unknown;
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

  let body: ResetPasswordBody;

  try {
    body = (await request.json()) as ResetPasswordBody;
  } catch {
    return errorResponse("Invalid JSON body.", 400);
  }

  const userId = isNonEmptyString(body.userId) ? body.userId.trim() : "";

  if (!userId) {
    return errorResponse("User ID is required.", 400);
  }

  try {
    const supabaseAdmin = getSupabaseAdminClient();

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .maybeSingle<{ email: string | null }>();

    if (profileError) {
      return errorResponse(profileError.message, 400);
    }

    if (!profile?.email) {
      return errorResponse("User email was not found.", 404);
    }

    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(profile.email);

    if (error) {
      return errorResponse(error.message, 400);
    }

    return NextResponse.json({
      success: true,
      message: `Password reset email sent to ${profile.email}.`,
    });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Unable to send password reset.", 500);
  }
}
