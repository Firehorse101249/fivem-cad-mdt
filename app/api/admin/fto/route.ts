import { NextResponse } from "next/server";
import { writeAuditLog } from "@/src/lib/auditLog";
import { isPermissionAuthFailure, requirePermission } from "@/src/lib/permissions";
import { getSupabaseAdminClient } from "@/src/lib/supabaseAdmin";

type AdminFtoBody = {
  action?: unknown;
  category?: unknown;
  department_key?: unknown;
  description?: unknown;
  fto_user_id?: unknown;
  item_id?: unknown;
  task?: unknown;
  template_id?: unknown;
  trainee_user_id?: unknown;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(request: Request) {
  const auth = await requirePermission(request, "fto:manage");

  if (isPermissionAuthFailure(auth)) {
    return auth.response;
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const [{ data: templates }, { data: items }, { data: assignments }, { data: profiles }] = await Promise.all([
    supabaseAdmin.from("fto_checklist_templates").select("*").order("created_at", { ascending: false }),
    supabaseAdmin.from("fto_checklist_items").select("*").order("sort_order", { ascending: true }),
    supabaseAdmin.from("fto_assignments").select("*").order("created_at", { ascending: false }).limit(100),
    supabaseAdmin.from("profiles").select("id,email,display_name,role,membership_status").order("display_name", { ascending: true }).limit(300),
  ]);

  return NextResponse.json({
    assignments: assignments ?? [],
    items: items ?? [],
    profiles: profiles ?? [],
    success: true,
    templates: templates ?? [],
  });
}

export async function POST(request: Request) {
  const auth = await requirePermission(request, "fto:manage");

  if (isPermissionAuthFailure(auth)) {
    return auth.response;
  }

  let body: AdminFtoBody;
  try {
    body = (await request.json()) as AdminFtoBody;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const action = text(body.action);
  const supabaseAdmin = getSupabaseAdminClient();

  if (action === "create_assignment") {
    const traineeUserId = text(body.trainee_user_id);
    const ftoUserId = text(body.fto_user_id);
    const templateId = text(body.template_id);

    if (!traineeUserId || !ftoUserId || !templateId) {
      return NextResponse.json({ success: false, error: "Trainee, FTO, and template are required." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.from("fto_assignments").insert({
      created_by: auth.user.id,
      department_key: text(body.department_key) || null,
      fto_user_id: ftoUserId,
      template_id: templateId,
      trainee_user_id: traineeUserId,
    }).select("*").single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    await writeAuditLog({
      actorEmail: auth.user.email,
      actorId: auth.user.id,
      afterData: data,
      entityId: String(data.id),
      entityType: "fto_assignments",
      eventType: "fto_assignment_created",
      request,
      summary: "Created FTO assignment.",
      targetUserId: traineeUserId,
    });

    return NextResponse.json({ assignment: data, success: true });
  }

  if (action === "create_item") {
    const templateId = text(body.template_id);
    const task = text(body.task);
    if (!templateId || !task) {
      return NextResponse.json({ success: false, error: "Template and task are required." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.from("fto_checklist_items").insert({
      category: text(body.category) || "Agency Specific",
      description: text(body.description),
      sort_order: Date.now() % 100000,
      task,
      template_id: templateId,
    }).select("*").single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ item: data, success: true });
  }

  if (action === "update_item") {
    const itemId = text(body.item_id);
    if (!itemId) {
      return NextResponse.json({ success: false, error: "Item id is required." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.from("fto_checklist_items").update({
      category: text(body.category) || "Agency Specific",
      description: text(body.description),
      task: text(body.task),
      updated_at: new Date().toISOString(),
    }).eq("id", itemId).select("*").single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ item: data, success: true });
  }

  return NextResponse.json({ success: false, error: "Unsupported FTO admin action." }, { status: 400 });
}
