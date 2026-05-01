import { NextResponse } from "next/server";
import { isAdminAuthFailure, requireAdmin } from "@/src/lib/adminAuth";
import { writeAuditLog } from "@/src/lib/auditLog";
import { getSupabaseAdminClient } from "@/src/lib/supabaseAdmin";
import { isUserRole } from "@/src/lib/userRules";

type UserRouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

type PermissionsBody = {
  role?: unknown;
};

export async function POST(request: Request, context: UserRouteContext) {
  const adminAuth = await requireAdmin(request);

  if (isAdminAuthFailure(adminAuth)) {
    return adminAuth.response;
  }

  let body: PermissionsBody;

  try {
    body = (await request.json()) as PermissionsBody;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  if (!isUserRole(body.role)) {
    return NextResponse.json({ success: false, error: "Invalid role." }, { status: 400 });
  }

  const { userId } = await context.params;
  const role = body.role;
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
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({
      role,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (profileError) {
    return NextResponse.json({ success: false, error: profileError.message }, { status: 400 });
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
}
