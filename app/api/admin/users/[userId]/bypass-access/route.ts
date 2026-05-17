import { NextResponse } from "next/server";
import { writeAuditLog } from "@/src/lib/auditLog";
import { grantRoleByKey, isPermissionAuthFailure, requirePermission } from "@/src/lib/permissions";
import { getSupabaseAdminClient } from "@/src/lib/supabaseAdmin";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

type BypassBody = {
  certification_ids?: unknown;
  role_ids?: unknown;
};

function ids(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requirePermission(request, "users:manage");

  if (isPermissionAuthFailure(auth)) {
    return auth.response;
  }

  let body: BypassBody = {};

  try {
    body = (await request.json()) as BypassBody;
  } catch {
    body = {};
  }

  const { userId } = await context.params;
  const roleIds = ids(body.role_ids);
  const certificationIds = ids(body.certification_ids);
  const supabaseAdmin = getSupabaseAdminClient();

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id,email,display_name,membership_status")
    .eq("id", userId)
    .maybeSingle<{ display_name: string | null; email: string | null; id: string; membership_status: string | null }>();

  if (profileError || !profile) {
    return NextResponse.json({ success: false, error: profileError?.message ?? "User profile not found." }, { status: 404 });
  }

  const now = new Date().toISOString();
  const { error: updateError } = await supabaseAdmin
    .from("profiles")
    .update({ membership_status: "interview_accepted", updated_at: now })
    .eq("id", userId);

  if (updateError) {
    return NextResponse.json({ success: false, error: updateError.message }, { status: 400 });
  }

  const { data: existingApplication } = await supabaseAdmin
    .from("membership_applications")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle<{ id: string }>();

  if (existingApplication?.id) {
    await supabaseAdmin
      .from("membership_applications")
      .update({ reviewed_at: now, reviewed_by: auth.user.id, status: "interview_accepted", updated_at: now })
      .eq("id", existingApplication.id);
  } else {
    await supabaseAdmin.from("membership_applications").insert({
      email: profile.email ?? "",
      reviewed_at: now,
      reviewed_by: auth.user.id,
      status: "interview_accepted",
      submitted_at: now,
      updated_at: now,
      user_id: userId,
    });
  }

  const grant = await grantRoleByKey(userId, "member", auth.user.id);
  if (grant.error) {
    return NextResponse.json({ success: false, error: grant.error }, { status: 400 });
  }

  if (roleIds.length) {
    const { error } = await supabaseAdmin.from("user_access_roles").upsert(
      roleIds.map((roleId) => ({
        assigned_by: auth.user.id,
        role_id: roleId,
        user_id: userId,
      })),
    );
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }

  if (certificationIds.length) {
    const { error } = await supabaseAdmin.from("user_access_certifications").upsert(
      certificationIds.map((certificationId) => ({
        assigned_by: auth.user.id,
        certification_id: certificationId,
        user_id: userId,
      })),
    );
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }

  await writeAuditLog({
    actorEmail: auth.user.email,
    actorId: auth.user.id,
    afterData: { membership_status: "interview_accepted", role_ids: roleIds, certification_ids: certificationIds },
    beforeData: { membership_status: profile.membership_status },
    entityId: userId,
    entityType: "membership_applications",
    eventType: "membership_bypassed",
    request,
    severity: "warning",
    summary: `Bypassed membership and granted CAD access to ${profile.email ?? userId}.`,
    targetUserId: userId,
  });

  return NextResponse.json({ success: true });
}
