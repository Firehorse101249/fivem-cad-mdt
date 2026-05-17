import { NextResponse } from "next/server";
import { writeAuditLog } from "@/src/lib/auditLog";
import { createWebsiteNotification } from "@/src/lib/membership";
import { isPermissionAuthFailure, requirePermission } from "@/src/lib/permissions";
import { getSupabaseAdminClient } from "@/src/lib/supabaseAdmin";

type ReviewBody = {
  decision?: unknown;
  reason?: unknown;
};

type RouteContext = {
  params: Promise<{ applicationId: string }>;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requirePermission(request, "applications:review");

  if (isPermissionAuthFailure(auth)) {
    return auth.response;
  }

  let body: ReviewBody;

  try {
    body = (await request.json()) as ReviewBody;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const decision = body.decision === "approve" || body.decision === "deny" ? body.decision : "";
  const reason = text(body.reason);

  if (!decision) {
    return NextResponse.json({ success: false, error: "Decision must be approve or deny." }, { status: 400 });
  }

  if (decision === "deny" && !reason) {
    return NextResponse.json({ success: false, error: "A denial reason is required." }, { status: 400 });
  }

  const { applicationId } = await context.params;
  const supabaseAdmin = getSupabaseAdminClient();
  const { data: application, error: applicationError } = await supabaseAdmin
    .from("membership_applications")
    .select("*")
    .eq("id", applicationId)
    .maybeSingle<Record<string, unknown>>();

  if (applicationError || !application) {
    return NextResponse.json(
      { success: false, error: applicationError?.message ?? "Application not found." },
      { status: 404 },
    );
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id,email,steam_id64,discord_id,discord_username")
    .eq("id", String(application.user_id))
    .maybeSingle<Record<string, unknown>>();

  const now = new Date().toISOString();

  if (decision === "approve") {
    const { error } = await supabaseAdmin
      .from("membership_applications")
      .update({
        reviewed_at: now,
        reviewed_by: auth.user.id,
        status: "application_approved",
        updated_at: now,
      })
      .eq("id", applicationId);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    await supabaseAdmin.from("membership_interviews").upsert({
      application_id: applicationId,
      status: "pending",
      updated_at: now,
    }, { onConflict: "application_id" });

    await supabaseAdmin
      .from("profiles")
      .update({ membership_status: "application_approved", updated_at: now })
      .eq("id", String(application.user_id));

    await createWebsiteNotification({
      applicationId,
      body: "Your application has been accepted. Staff will move you into the interview stage.",
      subject: "Application accepted",
      userId: String(application.user_id),
    });
  } else {
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabaseAdmin
      .from("membership_applications")
      .update({
        denial_reason: reason,
        reviewed_at: now,
        reviewed_by: auth.user.id,
        status: "application_denied",
        updated_at: now,
      })
      .eq("id", applicationId);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    await supabaseAdmin.from("membership_denial_cooldowns").insert({
      application_id: applicationId,
      created_by: auth.user.id,
      discord_id: typeof profile?.discord_id === "string" ? profile.discord_id : null,
      email: typeof profile?.email === "string" ? profile.email : String(application.email ?? ""),
      expires_at: expiresAt,
      reason,
      steam_id64: typeof profile?.steam_id64 === "string" ? profile.steam_id64 : null,
      user_id: String(application.user_id),
    });

    await supabaseAdmin
      .from("profiles")
      .update({ membership_status: "application_denied", updated_at: now })
      .eq("id", String(application.user_id));

    await createWebsiteNotification({
      applicationId,
      body: `${reason} You may reapply after ${new Date(expiresAt).toLocaleDateString()}.`,
      subject: "Application denied",
      userId: String(application.user_id),
    });
  }

  await writeAuditLog({
    actorEmail: auth.user.email,
    actorId: auth.user.id,
    afterData: {
      decision,
      reason: decision === "deny" ? reason : null,
    },
    beforeData: application,
    entityId: applicationId,
    entityType: "membership_applications",
    eventType: decision === "approve" ? "membership_application_approved" : "membership_application_denied",
    metadata: { decision, reason: decision === "deny" ? reason : null },
    request,
    severity: decision === "deny" ? "warning" : "info",
    summary: `${decision === "approve" ? "Approved" : "Denied"} membership application for ${String(application.email ?? application.user_id)}.`,
    targetUserId: String(application.user_id),
  });

  return NextResponse.json({ success: true });
}
