import { NextResponse } from "next/server";
import { isAuthFailure, requireUser } from "@/src/lib/authSession";
import {
  findActiveCooldown,
  getOrCreateApplication,
  getProfileIdentity,
  loadQuestions,
} from "@/src/lib/membership";
import { getUserPermissions } from "@/src/lib/permissions";
import { getSupabaseAdminClient } from "@/src/lib/supabaseAdmin";

export async function GET(request: Request) {
  const auth = await requireUser(request);

  if (isAuthFailure(auth)) {
    return auth.response;
  }

  try {
    const profile = await getProfileIdentity(auth.user.id);
    const email = profile?.email ?? auth.user.email ?? "";
    const application = await getOrCreateApplication(auth.user.id, email);
    const applicationId = String(application.id);
    const supabaseAdmin = getSupabaseAdminClient();

    const [
      applicationQuestions,
      interviewQuestions,
      applicationAnswers,
      interview,
      notifications,
      cooldown,
      permissions,
    ] = await Promise.all([
      loadQuestions("application"),
      loadQuestions("interview"),
      supabaseAdmin
        .from("membership_application_answers")
        .select("question_id,answer")
        .eq("application_id", applicationId),
      supabaseAdmin
        .from("membership_interviews")
        .select("id,status,denial_reason,decision_reason,decided_at,interviewer_id")
        .eq("application_id", applicationId)
        .maybeSingle<Record<string, unknown>>(),
      supabaseAdmin
        .from("membership_notifications")
        .select("id,subject,body,read_at,created_at")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false })
        .limit(20),
      findActiveCooldown({
        discordId: profile?.discord_id,
        email,
        steamId64: profile?.steam_id64,
      }),
      getUserPermissions(auth.user.id),
    ]);

    return NextResponse.json({
      application,
      applicationAnswers: applicationAnswers.data ?? [],
      applicationQuestions,
      cooldown,
      hasCadAccess: permissions.has("cad:access"),
      interview: interview.data ?? null,
      interviewQuestions,
      notifications: notifications.data ?? [],
      profile,
      success: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? `${error.message}. If this is a new install, run supabase/membership-access-schema.sql.`
            : "Unable to load membership status.",
      },
      { status: 500 },
    );
  }
}
