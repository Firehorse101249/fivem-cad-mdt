import { NextResponse } from "next/server";
import { isPermissionAuthFailure, requirePermission } from "@/src/lib/permissions";
import { getSupabaseAdminClient } from "@/src/lib/supabaseAdmin";

export async function GET(request: Request) {
  const auth = await requirePermission(request, "interviews:conduct");

  if (isPermissionAuthFailure(auth)) {
    return auth.response;
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const { data: interviews, error } = await supabaseAdmin
    .from("membership_interviews")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }

  const applicationIds = Array.from(new Set((interviews ?? []).map((interview) => interview.application_id).filter(Boolean)));
  const [{ data: applications }, { data: questions }, { data: interviewAnswers }] = await Promise.all([
    applicationIds.length
      ? supabaseAdmin.from("membership_applications").select("*").in("id", applicationIds)
      : Promise.resolve({ data: [] }),
    supabaseAdmin
      .from("membership_question_definitions")
      .select("id,section,question_key,prompt,sort_order,field_type,required,active")
      .eq("section", "interview")
      .order("sort_order", { ascending: true }),
    (interviews ?? []).length
      ? supabaseAdmin
          .from("membership_interview_answers")
          .select("interview_id,question_id,answer")
          .in("interview_id", (interviews ?? []).map((interview) => interview.id))
      : Promise.resolve({ data: [] }),
  ]);
  const userIds = Array.from(new Set((applications ?? []).map((application) => application.user_id).filter(Boolean)));
  const { data: profiles } = userIds.length
    ? await supabaseAdmin
        .from("profiles")
        .select("id,email,display_name,steam_id64,discord_id,discord_username,membership_status")
        .in("id", userIds)
    : { data: [] };
  const { data: applicationQuestions } = await supabaseAdmin
    .from("membership_question_definitions")
    .select("id,section,question_key,prompt,sort_order")
    .eq("section", "application")
    .order("sort_order", { ascending: true });
  const { data: applicationAnswers } = applicationIds.length
    ? await supabaseAdmin
        .from("membership_application_answers")
        .select("application_id,question_id,answer")
        .in("application_id", applicationIds)
    : { data: [] };

  return NextResponse.json({
    applicationAnswers: applicationAnswers ?? [],
    applicationQuestions: applicationQuestions ?? [],
    applications: applications ?? [],
    interviewAnswers: interviewAnswers ?? [],
    interviews: interviews ?? [],
    profiles: profiles ?? [],
    questions: questions ?? [],
    success: true,
  });
}
