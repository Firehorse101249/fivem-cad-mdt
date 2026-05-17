import { NextResponse } from "next/server";
import { isAuthFailure, requireUser } from "@/src/lib/authSession";
import { getOrCreateApplication, isRecord, loadQuestions, stringValue } from "@/src/lib/membership";
import { getSupabaseAdminClient } from "@/src/lib/supabaseAdmin";

type ApplicationBody = {
  answers?: unknown;
};

export async function POST(request: Request) {
  const auth = await requireUser(request);

  if (isAuthFailure(auth)) {
    return auth.response;
  }

  let body: ApplicationBody;

  try {
    body = (await request.json()) as ApplicationBody;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  if (!isRecord(body.answers)) {
    return NextResponse.json({ success: false, error: "Answers must be an object." }, { status: 400 });
  }

  const inputAnswers = body.answers;

  try {
    const application = await getOrCreateApplication(auth.user.id, auth.user.email ?? "");

    if (application.status && application.status !== "draft") {
      return NextResponse.json(
        { success: false, error: "Submitted applications cannot be edited here." },
        { status: 409 },
      );
    }

    const questions = await loadQuestions("application");
    const rows = questions.map((question) => ({
      answer: stringValue(inputAnswers[question.id]),
      application_id: application.id,
      question_id: question.id,
      updated_at: new Date().toISOString(),
    }));
    const supabaseAdmin = getSupabaseAdminClient();

    if (rows.length) {
      const { error } = await supabaseAdmin
        .from("membership_application_answers")
        .upsert(rows, { onConflict: "application_id,question_id" });

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }
    }

    await supabaseAdmin
      .from("membership_applications")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", application.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unable to save application." },
      { status: 500 },
    );
  }
}
