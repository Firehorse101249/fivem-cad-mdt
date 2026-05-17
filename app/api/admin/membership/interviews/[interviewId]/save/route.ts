import { NextResponse } from "next/server";
import { writeAuditLog } from "@/src/lib/auditLog";
import { isRecord, loadQuestions, stringValue } from "@/src/lib/membership";
import { isPermissionAuthFailure, requirePermission } from "@/src/lib/permissions";
import { getSupabaseAdminClient } from "@/src/lib/supabaseAdmin";

type RouteContext = {
  params: Promise<{ interviewId: string }>;
};

type SaveBody = {
  answers?: unknown;
};

export async function POST(request: Request, context: RouteContext) {
  const auth = await requirePermission(request, "interviews:conduct");

  if (isPermissionAuthFailure(auth)) {
    return auth.response;
  }

  let body: SaveBody;

  try {
    body = (await request.json()) as SaveBody;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  if (!isRecord(body.answers)) {
    return NextResponse.json({ success: false, error: "Answers must be an object." }, { status: 400 });
  }

  const inputAnswers = body.answers;
  const { interviewId } = await context.params;
  const questions = await loadQuestions("interview");
  const supabaseAdmin = getSupabaseAdminClient();
  const rows = questions.map((question) => ({
    answer: stringValue(inputAnswers[question.id]),
    interview_id: interviewId,
    question_id: question.id,
    updated_at: new Date().toISOString(),
  }));

  if (rows.length) {
    const { error } = await supabaseAdmin
      .from("membership_interview_answers")
      .upsert(rows, { onConflict: "interview_id,question_id" });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
  }

  await supabaseAdmin
    .from("membership_interviews")
    .update({
      interviewer_id: auth.user.id,
      status: "in_progress",
      updated_at: new Date().toISOString(),
    })
    .eq("id", interviewId);

  await writeAuditLog({
    actorEmail: auth.user.email,
    actorId: auth.user.id,
    entityId: interviewId,
    entityType: "membership_interviews",
    eventType: "membership_interview_saved",
    request,
    summary: "Saved membership interview answers.",
  });

  return NextResponse.json({ success: true });
}
