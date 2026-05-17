import { NextResponse } from "next/server";
import { writeAuditLog } from "@/src/lib/auditLog";
import { createWebsiteNotification } from "@/src/lib/membership";
import { grantRoleByKey, isPermissionAuthFailure, requirePermission } from "@/src/lib/permissions";
import { getSupabaseAdminClient } from "@/src/lib/supabaseAdmin";

type RouteContext = {
  params: Promise<{ interviewId: string }>;
};

type DecisionBody = {
  decision?: unknown;
  reason?: unknown;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requirePermission(request, "interviews:conduct");

  if (isPermissionAuthFailure(auth)) {
    return auth.response;
  }

  let body: DecisionBody;

  try {
    body = (await request.json()) as DecisionBody;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const decision = body.decision === "accept" || body.decision === "deny" ? body.decision : "";
  const reason = text(body.reason);

  if (!decision) {
    return NextResponse.json({ success: false, error: "Decision must be accept or deny." }, { status: 400 });
  }

  if (decision === "deny" && !reason) {
    return NextResponse.json({ success: false, error: "A denial reason is required." }, { status: 400 });
  }

  const { interviewId } = await context.params;
  const supabaseAdmin = getSupabaseAdminClient();
  const { data: interview, error: interviewError } = await supabaseAdmin
    .from("membership_interviews")
    .select("*")
    .eq("id", interviewId)
    .maybeSingle<Record<string, unknown>>();

  if (interviewError || !interview) {
    return NextResponse.json(
      { success: false, error: interviewError?.message ?? "Interview not found." },
      { status: 404 },
    );
  }

  const { data: application } = await supabaseAdmin
    .from("membership_applications")
    .select("*")
    .eq("id", String(interview.application_id))
    .maybeSingle<Record<string, unknown>>();

  if (!application) {
    return NextResponse.json({ success: false, error: "Application not found." }, { status: 404 });
  }

  const now = new Date().toISOString();
  const accepted = decision === "accept";
  const status = accepted ? "accepted" : "denied";
  const applicationStatus = accepted ? "interview_accepted" : "interview_denied";

  const { error } = await supabaseAdmin
    .from("membership_interviews")
    .update({
      decided_at: now,
      decision_reason: accepted ? reason || "Accepted after interview." : null,
      denial_reason: accepted ? null : reason,
      interviewer_id: auth.user.id,
      status,
      updated_at: now,
    })
    .eq("id", interviewId);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }

  await supabaseAdmin
    .from("membership_applications")
    .update({ status: applicationStatus, updated_at: now })
    .eq("id", String(interview.application_id));

  await supabaseAdmin
    .from("profiles")
    .update({ membership_status: applicationStatus, updated_at: now })
    .eq("id", String(application.user_id));

  if (accepted) {
    const grant = await grantRoleByKey(String(application.user_id), "member", auth.user.id);

    if (grant.error) {
      return NextResponse.json({ success: false, error: grant.error }, { status: 400 });
    }
  }

  await createWebsiteNotification({
    applicationId: String(application.id),
    body: accepted
      ? "Your interview has been accepted. CAD access has been granted."
      : `Your interview has been denied. ${reason}`,
    subject: accepted ? "Interview accepted" : "Interview denied",
    userId: String(application.user_id),
  });

  await writeAuditLog({
    actorEmail: auth.user.email,
    actorId: auth.user.id,
    afterData: { decision, reason: reason || null },
    beforeData: interview,
    entityId: interviewId,
    entityType: "membership_interviews",
    eventType: accepted ? "membership_interview_accepted" : "membership_interview_denied",
    metadata: { decision, reason: reason || null },
    request,
    severity: accepted ? "info" : "warning",
    summary: `${accepted ? "Accepted" : "Denied"} interview for ${String(application.email ?? application.user_id)}.`,
    targetUserId: String(application.user_id),
  });

  return NextResponse.json({ success: true });
}
