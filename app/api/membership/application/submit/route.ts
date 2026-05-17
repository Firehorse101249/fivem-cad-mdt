import { NextResponse } from "next/server";
import { isAuthFailure, requireUser } from "@/src/lib/authSession";
import { writeAuditLog } from "@/src/lib/auditLog";
import {
  findActiveCooldown,
  getOrCreateApplication,
  getProfileIdentity,
  loadQuestions,
} from "@/src/lib/membership";
import { getSupabaseAdminClient } from "@/src/lib/supabaseAdmin";

export async function POST(request: Request) {
  const auth = await requireUser(request);

  if (isAuthFailure(auth)) {
    return auth.response;
  }

  try {
    const profile = await getProfileIdentity(auth.user.id);
    const email = profile?.email ?? auth.user.email ?? "";

    if (!email || !profile?.steam_id64 || !profile.discord_id) {
      return NextResponse.json(
        { success: false, error: "Email, linked Steam, and linked Discord are required before submitting." },
        { status: 400 },
      );
    }

    const cooldown = await findActiveCooldown({
      discordId: profile.discord_id,
      email,
      steamId64: profile.steam_id64,
    });

    if (cooldown) {
      return NextResponse.json(
        {
          success: false,
          error: `You must wait until ${new Date(String(cooldown.expires_at)).toLocaleDateString()} before reapplying.`,
          cooldown,
        },
        { status: 403 },
      );
    }

    const application = await getOrCreateApplication(auth.user.id, email);

    if (application.status !== "draft") {
      return NextResponse.json(
        { success: false, error: "This application has already been submitted." },
        { status: 409 },
      );
    }

    const questions = await loadQuestions("application");
    const supabaseAdmin = getSupabaseAdminClient();
    const { data: answers, error: answersError } = await supabaseAdmin
      .from("membership_application_answers")
      .select("question_id,answer")
      .eq("application_id", application.id);

    if (answersError) {
      return NextResponse.json({ success: false, error: answersError.message }, { status: 400 });
    }

    const answerMap = new Map((answers ?? []).map((answer) => [String(answer.question_id), String(answer.answer ?? "").trim()]));
    const missing = questions.filter((question) => question.required && !answerMap.get(question.id));

    if (missing.length) {
      return NextResponse.json(
        { success: false, error: `Required answers missing: ${missing.map((item) => item.prompt).join(", ")}` },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("membership_applications")
      .update({
        status: "submitted",
        submitted_at: now,
        updated_at: now,
      })
      .eq("id", application.id);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    await supabaseAdmin
      .from("profiles")
      .update({ membership_status: "submitted", updated_at: now })
      .eq("id", auth.user.id);

    await writeAuditLog({
      actorEmail: auth.user.email,
      actorId: auth.user.id,
      afterData: { status: "submitted" },
      entityId: String(application.id),
      entityType: "membership_applications",
      eventType: "membership_application_submitted",
      metadata: {
        discord_id: profile.discord_id,
        steam_id64: profile.steam_id64,
      },
      request,
      summary: `Membership application submitted by ${email}.`,
      targetUserId: auth.user.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unable to submit application." },
      { status: 500 },
    );
  }
}
