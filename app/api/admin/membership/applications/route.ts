import { NextResponse } from "next/server";
import { isPermissionAuthFailure, requirePermission } from "@/src/lib/permissions";
import { getSupabaseAdminClient } from "@/src/lib/supabaseAdmin";

export async function GET(request: Request) {
  const auth = await requirePermission(request, "applications:review");

  if (isPermissionAuthFailure(auth)) {
    return auth.response;
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status")?.trim();
  let query = supabaseAdmin
    .from("membership_applications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data: applications, error } = await query;

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }

  const userIds = Array.from(new Set((applications ?? []).map((application) => application.user_id).filter(Boolean)));
  const applicationIds = (applications ?? []).map((application) => application.id);
  const [{ data: profiles }, { data: questions }, { data: answers }] = await Promise.all([
    userIds.length
      ? supabaseAdmin
          .from("profiles")
          .select("id,email,display_name,steam_id64,discord_id,discord_username,membership_status")
          .in("id", userIds)
      : Promise.resolve({ data: [] }),
    supabaseAdmin
      .from("membership_question_definitions")
      .select("id,section,question_key,prompt,sort_order")
      .eq("section", "application")
      .order("sort_order", { ascending: true }),
    applicationIds.length
      ? supabaseAdmin
          .from("membership_application_answers")
          .select("application_id,question_id,answer")
          .in("application_id", applicationIds)
      : Promise.resolve({ data: [] }),
  ]);

  return NextResponse.json({
    answers: answers ?? [],
    applications: applications ?? [],
    profiles: profiles ?? [],
    questions: questions ?? [],
    success: true,
  });
}
