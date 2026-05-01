import { NextResponse } from "next/server";
import { isAdminAuthFailure, requireAdmin } from "@/src/lib/adminAuth";
import { writeAuditLog } from "@/src/lib/auditLog";
import { getSupabaseAdminClient } from "@/src/lib/supabaseAdmin";

type DeleteUserBody = {
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

  let body: DeleteUserBody;

  try {
    body = (await request.json()) as DeleteUserBody;
  } catch {
    return errorResponse("Invalid JSON body.", 400);
  }

  const userId = isNonEmptyString(body.userId) ? body.userId.trim() : "";

  if (!userId) {
    return errorResponse("User ID is required.", 400);
  }

  try {
    const supabaseAdmin = getSupabaseAdminClient();
    const { data: beforeProfile } = await supabaseAdmin
      .from("profiles")
      .select("id,email,role,display_name,steam_hex")
      .eq("id", userId)
      .maybeSingle<Record<string, unknown>>();

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      return errorResponse(error.message, 400);
    }

    await supabaseAdmin.from("profiles").delete().eq("id", userId);

    await writeAuditLog({
      actorEmail: adminAuth.user.email,
      actorId: adminAuth.user.id,
      beforeData: beforeProfile ?? null,
      entityId: userId,
      entityType: "profiles",
      eventType: "user_deleted",
      metadata: {
        deleted_email: typeof beforeProfile?.email === "string" ? beforeProfile.email : null,
        deleted_role: typeof beforeProfile?.role === "string" ? beforeProfile.role : null,
      },
      request,
      severity: "critical",
      summary: `Deleted user ${typeof beforeProfile?.email === "string" ? beforeProfile.email : userId}.`,
      targetUserId: userId,
    });

    return NextResponse.json({
      success: true,
      message: "User deleted.",
    });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Unable to delete user.", 500);
  }
}
