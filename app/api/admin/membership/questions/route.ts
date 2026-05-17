import { NextResponse } from "next/server";
import { writeAuditLog } from "@/src/lib/auditLog";
import { isPermissionAuthFailure, requirePermission } from "@/src/lib/permissions";
import { getSupabaseAdminClient } from "@/src/lib/supabaseAdmin";

type QuestionBody = {
  active?: unknown;
  field_type?: unknown;
  id?: unknown;
  prompt?: unknown;
  question_key?: unknown;
  required?: unknown;
  section?: unknown;
  sort_order?: unknown;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(request: Request) {
  const auth = await requirePermission(request, "questions:manage");

  if (isPermissionAuthFailure(auth)) {
    return auth.response;
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const { data, error } = await supabaseAdmin
    .from("membership_question_definitions")
    .select("*")
    .order("section", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ questions: data ?? [], success: true });
}

export async function POST(request: Request) {
  const auth = await requirePermission(request, "questions:manage");

  if (isPermissionAuthFailure(auth)) {
    return auth.response;
  }

  let body: QuestionBody;

  try {
    body = (await request.json()) as QuestionBody;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const id = text(body.id);
  const section = body.section === "application" || body.section === "interview" ? body.section : "";
  const fieldType = body.field_type === "text" || body.field_type === "textarea" || body.field_type === "date"
    ? body.field_type
    : "";
  const prompt = text(body.prompt);
  const questionKey = text(body.question_key);
  const sortOrder = typeof body.sort_order === "number" && Number.isFinite(body.sort_order) ? body.sort_order : 0;

  if (!section || !fieldType || !prompt || (!id && !questionKey)) {
    return NextResponse.json(
      { success: false, error: "Section, field type, prompt, and question key are required." },
      { status: 400 },
    );
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const payload = {
    active: typeof body.active === "boolean" ? body.active : true,
    field_type: fieldType,
    prompt,
    question_key: questionKey || prompt.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""),
    required: typeof body.required === "boolean" ? body.required : true,
    section,
    sort_order: sortOrder,
    updated_at: new Date().toISOString(),
  };
  const result = id
    ? await supabaseAdmin.from("membership_question_definitions").update(payload).eq("id", id).select("*").single()
    : await supabaseAdmin.from("membership_question_definitions").insert(payload).select("*").single();

  if (result.error) {
    return NextResponse.json({ success: false, error: result.error.message }, { status: 400 });
  }

  await writeAuditLog({
    actorEmail: auth.user.email,
    actorId: auth.user.id,
    afterData: result.data,
    entityId: String(result.data.id),
    entityType: "membership_question_definitions",
    eventType: id ? "membership_question_updated" : "membership_question_created",
    request,
    summary: `${id ? "Updated" : "Created"} ${section} question.`,
  });

  return NextResponse.json({ question: result.data, success: true });
}
