import { NextResponse } from "next/server";
import { isAdminAuthFailure, requireAdmin } from "@/src/lib/adminAuth";
import { writeAuditLog } from "@/src/lib/auditLog";
import { getSupabaseAdminClient } from "@/src/lib/supabaseAdmin";
import { isUserRole } from "@/src/lib/userRules";

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
  const role = isUserRole(body.role) ? body.role : "";

  if (!userId || !role) {
    return errorResponse("User ID and role are required.", 400);
  }

  try {
    const supabaseAdmin = getSupabaseAdminClient();
    const { data: beforeProfile } = await supabaseAdmin
      .from("profiles")
      .select("email,role,display_name")
      .eq("id", userId)
      .maybeSingle<{ display_name: string | null; email: string | null; role: string | null }>();

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: {
        role,
      },
    });

    if (error) {
      return errorResponse(error.message, 400);
    }

    const { error: profileError } = await supabaseAdmin.from("profiles").update({
      role,
      updated_at: new Date().toISOString(),
    }).eq("id", userId);

    if (profileError) {
      return errorResponse(`Auth user updated, but profile role failed: ${profileError.message}`, 500);
    }

    await writeAuditLog({
      actorEmail: adminAuth.user.email,
      actorId: adminAuth.user.id,
      afterData: {
        role,
      },
      beforeData: beforeProfile ?? null,
      entityId: userId,
      entityType: "profiles",
      eventType: "user_role_changed",
      metadata: {
        new_role: role,
        previous_role: beforeProfile?.role ?? null,
        target_email: beforeProfile?.email ?? data.user.email ?? null,
      },
      request,
      severity: beforeProfile?.role === "admin" || role === "admin" ? "warning" : "info",
      summary: `Changed ${beforeProfile?.email ?? data.user.email ?? userId} role from ${beforeProfile?.role ?? "unknown"} to ${role}.`,
      targetUserId: userId,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        role,
      },
    });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Unable to change permissions.", 500);
  }
}
