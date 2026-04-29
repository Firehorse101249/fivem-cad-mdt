import { NextResponse } from "next/server";
import { isAdminAuthFailure, requireAdmin } from "@/src/lib/adminAuth";
import { getSupabaseAdminClient } from "@/src/lib/supabaseAdmin";

type PermissionsBody = {
  userId?: unknown;
  role?: unknown;
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

  let body: PermissionsBody;

  try {
    body = (await request.json()) as PermissionsBody;
  } catch {
    return errorResponse("Invalid JSON body.", 400);
  }

  const userId = isNonEmptyString(body.userId) ? body.userId.trim() : "";
  const role = isNonEmptyString(body.role) ? body.role.trim() : "";

  if (!userId || !role) {
    return errorResponse("User ID and role are required.", 400);
  }

  try {
    const supabaseAdmin = getSupabaseAdminClient();
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: {
        role,
      },
    });

    if (error) {
      return errorResponse(error.message, 400);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        role: data.user.user_metadata?.role ?? role,
      },
    });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Unable to change permissions.", 500);
  }
}
