import { NextResponse } from "next/server";
import { isAdminAuthFailure, requireAdmin } from "@/src/lib/adminAuth";
import { writeAuditLog } from "@/src/lib/auditLog";
import { getSupabaseAdminClient } from "@/src/lib/supabaseAdmin";

type UserRouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

async function deleteUser(request: Request, context: UserRouteContext) {
  const adminAuth = await requireAdmin(request);

  if (isAdminAuthFailure(adminAuth)) {
    return adminAuth.response;
  }

  const { userId } = await context.params;
  const supabaseAdmin = getSupabaseAdminClient();
  const { data: beforeProfile } = await supabaseAdmin
    .from("profiles")
    .select("id,email,role,display_name,steam_hex")
    .eq("id", userId)
    .maybeSingle<Record<string, unknown>>();

  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
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
}

export async function POST(request: Request, context: UserRouteContext) {
  return deleteUser(request, context);
}

export async function DELETE(request: Request, context: UserRouteContext) {
  return deleteUser(request, context);
}
