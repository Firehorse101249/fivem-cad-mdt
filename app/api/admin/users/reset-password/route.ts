import { NextResponse } from "next/server";
import { isAdminAuthFailure, requireAdmin } from "@/src/lib/adminAuth";
import { getSupabaseAdminClient } from "@/src/lib/supabaseAdmin";

type ResetPasswordBody = {
  userId?: unknown;
  newPassword?: unknown;
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
  const newPassword = isNonEmptyString(body.newPassword) ? body.newPassword : "";

  if (!userId || !newPassword) {
    return errorResponse("User ID and new password are required.", 400);
  }

  if (newPassword.length < 6) {
    return errorResponse("New password must be at least 6 characters.", 400);
  }

  try {
    const supabaseAdmin = getSupabaseAdminClient();
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      return errorResponse(error.message, 400);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Unable to reset password.", 500);
  }
}
