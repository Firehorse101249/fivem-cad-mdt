import { NextResponse } from "next/server";
import { writeAuditLog } from "@/src/lib/auditLog";
import { isPermissionAuthFailure, requirePermission } from "@/src/lib/permissions";
import { getSupabaseAdminClient } from "@/src/lib/supabaseAdmin";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

type AccessBody = {
  certification_ids?: unknown;
  role_ids?: unknown;
};

function ids(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

export async function GET(request: Request, context: RouteContext) {
  const auth = await requirePermission(request, "users:manage");

  if (isPermissionAuthFailure(auth)) {
    return auth.response;
  }

  const { userId } = await context.params;
  const supabaseAdmin = getSupabaseAdminClient();
  const [{ data: roleAssignments }, { data: certificationAssignments }, { data: roles }, { data: certifications }, { data: departments }] =
    await Promise.all([
      supabaseAdmin.from("user_access_roles").select("role_id").eq("user_id", userId),
      supabaseAdmin.from("user_access_certifications").select("certification_id").eq("user_id", userId),
      supabaseAdmin
        .from("access_roles")
        .select("*")
        .order("department_key", { ascending: true, nullsFirst: true })
        .order("role_kind", { ascending: true })
        .order("rank_order", { ascending: true, nullsFirst: false })
        .order("priority", { ascending: false }),
      supabaseAdmin
        .from("access_certifications")
        .select("*")
        .order("department_key", { ascending: true, nullsFirst: true })
        .order("certification_kind", { ascending: true })
        .order("name", { ascending: true }),
      supabaseAdmin.from("access_departments").select("*").order("sort_order", { ascending: true }),
    ]);

  return NextResponse.json({
    certificationAssignments: certificationAssignments ?? [],
    certifications: certifications ?? [],
    departments: departments ?? [],
    roleAssignments: roleAssignments ?? [],
    roles: roles ?? [],
    success: true,
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requirePermission(request, "users:manage");

  if (isPermissionAuthFailure(auth)) {
    return auth.response;
  }

  let body: AccessBody;

  try {
    body = (await request.json()) as AccessBody;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const { userId } = await context.params;
  const roleIds = ids(body.role_ids);
  const certificationIds = ids(body.certification_ids);
  const supabaseAdmin = getSupabaseAdminClient();

  await supabaseAdmin.from("user_access_roles").delete().eq("user_id", userId);

  if (roleIds.length) {
    const { error } = await supabaseAdmin.from("user_access_roles").insert(
      roleIds.map((roleId) => ({
        assigned_by: auth.user.id,
        role_id: roleId,
        user_id: userId,
      })),
    );

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
  }

  await supabaseAdmin.from("user_access_certifications").delete().eq("user_id", userId);

  if (certificationIds.length) {
    const { error } = await supabaseAdmin.from("user_access_certifications").insert(
      certificationIds.map((certificationId) => ({
        assigned_by: auth.user.id,
        certification_id: certificationId,
        user_id: userId,
      })),
    );

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
  }

  await writeAuditLog({
    actorEmail: auth.user.email,
    actorId: auth.user.id,
    afterData: { certification_ids: certificationIds, role_ids: roleIds },
    entityId: userId,
    entityType: "user_access",
    eventType: "user_access_updated",
    request,
    severity: "warning",
    summary: "Updated user roles and certifications.",
    targetUserId: userId,
  });

  return NextResponse.json({ success: true });
}
