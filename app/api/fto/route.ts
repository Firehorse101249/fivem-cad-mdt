import { NextResponse } from "next/server";
import { isPermissionAuthFailure, requirePermission } from "@/src/lib/permissions";
import { getSupabaseAdminClient } from "@/src/lib/supabaseAdmin";

type NoteBody = {
  assignment_id?: unknown;
  body?: unknown;
  note_type?: unknown;
  rating?: unknown;
};

type ProgressBody = {
  assignment_id?: unknown;
  item_id?: unknown;
  notes?: unknown;
  status?: unknown;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(request: Request) {
  const auth = await requirePermission(request, "cad:fto");

  if (isPermissionAuthFailure(auth)) {
    return auth.response;
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const { data: assignments, error } = await supabaseAdmin
    .from("fto_assignments")
    .select("*")
    .eq("fto_user_id", auth.user.id)
    .neq("status", "removed")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }

  const templateIds = Array.from(new Set((assignments ?? []).map((assignment) => assignment.template_id).filter(Boolean)));
  const assignmentIds = (assignments ?? []).map((assignment) => assignment.id);
  const traineeIds = Array.from(new Set((assignments ?? []).map((assignment) => assignment.trainee_user_id).filter(Boolean)));

  const [{ data: items }, { data: progress }, { data: notes }, { data: trainees }] = await Promise.all([
    templateIds.length
      ? supabaseAdmin.from("fto_checklist_items").select("*").in("template_id", templateIds).eq("active", true).order("sort_order", { ascending: true })
      : Promise.resolve({ data: [] }),
    assignmentIds.length
      ? supabaseAdmin.from("fto_checklist_progress").select("*").in("assignment_id", assignmentIds)
      : Promise.resolve({ data: [] }),
    assignmentIds.length
      ? supabaseAdmin.from("fto_notes").select("*").in("assignment_id", assignmentIds).order("created_at", { ascending: false }).limit(100)
      : Promise.resolve({ data: [] }),
    traineeIds.length
      ? supabaseAdmin.from("profiles").select("id,email,display_name,role,membership_status").in("id", traineeIds)
      : Promise.resolve({ data: [] }),
  ]);

  return NextResponse.json({
    assignments: assignments ?? [],
    items: items ?? [],
    notes: notes ?? [],
    progress: progress ?? [],
    success: true,
    trainees: trainees ?? [],
  });
}

export async function POST(request: Request) {
  const auth = await requirePermission(request, "cad:fto");

  if (isPermissionAuthFailure(auth)) {
    return auth.response;
  }

  let body: NoteBody;
  try {
    body = (await request.json()) as NoteBody;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const assignmentId = text(body.assignment_id);
  const noteBody = text(body.body);
  const noteType = ["note", "daily_observation", "remediation", "weekly_summary"].includes(text(body.note_type))
    ? text(body.note_type)
    : "note";
  const rating = typeof body.rating === "number" && Number.isFinite(body.rating) ? Math.max(1, Math.min(7, Math.round(body.rating))) : null;

  if (!assignmentId || !noteBody) {
    return NextResponse.json({ success: false, error: "Assignment and note body are required." }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const { data: assignment } = await supabaseAdmin
    .from("fto_assignments")
    .select("id,fto_user_id")
    .eq("id", assignmentId)
    .eq("fto_user_id", auth.user.id)
    .maybeSingle<{ fto_user_id: string | null; id: string }>();

  if (!assignment) {
    return NextResponse.json({ success: false, error: "FTO assignment not found." }, { status: 404 });
  }

  const { error } = await supabaseAdmin.from("fto_notes").insert({
    assignment_id: assignmentId,
    author_id: auth.user.id,
    body: noteBody,
    note_type: noteType,
    rating,
  });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(request: Request) {
  const auth = await requirePermission(request, "cad:fto");

  if (isPermissionAuthFailure(auth)) {
    return auth.response;
  }

  let body: ProgressBody;
  try {
    body = (await request.json()) as ProgressBody;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const assignmentId = text(body.assignment_id);
  const itemId = text(body.item_id);
  const status = ["not_started", "observed", "needs_remediation", "complete"].includes(text(body.status))
    ? text(body.status)
    : "";

  if (!assignmentId || !itemId || !status) {
    return NextResponse.json({ success: false, error: "Assignment, item, and status are required." }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const { data: assignment } = await supabaseAdmin
    .from("fto_assignments")
    .select("id,fto_user_id")
    .eq("id", assignmentId)
    .eq("fto_user_id", auth.user.id)
    .maybeSingle<{ fto_user_id: string | null; id: string }>();

  if (!assignment) {
    return NextResponse.json({ success: false, error: "FTO assignment not found." }, { status: 404 });
  }

  const { error } = await supabaseAdmin.from("fto_checklist_progress").upsert({
    assignment_id: assignmentId,
    item_id: itemId,
    notes: text(body.notes),
    status,
    updated_at: new Date().toISOString(),
    updated_by: auth.user.id,
  });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
