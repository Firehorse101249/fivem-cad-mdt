import { NextResponse } from "next/server";
import { writeAuditLog } from "@/src/lib/auditLog";
import { isPermissionAuthFailure, requirePermission } from "@/src/lib/permissions";
import { getSupabaseAdminClient } from "@/src/lib/supabaseAdmin";

type RoleBody = {
  description?: unknown;
  id?: unknown;
  key?: unknown;
  name?: unknown;
  permission_keys?: unknown;
  priority?: unknown;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function textArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export async function GET(request: Request) {
  const auth = await requirePermission(request, "roles:manage");

  if (isPermissionAuthFailure(auth)) {
    return auth.response;
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const [{ data: roles, error }, { data: permissions }] = await Promise.all([
    supabaseAdmin
      .from("access_roles")
      .select("*, access_role_permissions(permission_key)")
      .order("priority", { ascending: false }),
    supabaseAdmin.from("access_permissions").select("*").order("category", { ascending: true }).order("key", { ascending: true }),
  ]);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ permissions: permissions ?? [], roles: roles ?? [], success: true });
}

export async function POST(request: Request) {
  const auth = await requirePermission(request, "roles:manage");

  if (isPermissionAuthFailure(auth)) {
    return auth.response;
  }

  let body: RoleBody;

  try {
    body = (await request.json()) as RoleBody;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const id = text(body.id);
  const key = text(body.key);
  const name = text(body.name);
  const permissionKeys = textArray(body.permission_keys);

  if (!name || (!id && !key)) {
    return NextResponse.json({ success: false, error: "Role name and key are required." }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdminClient();

  if (id) {
    const { data: existing } = await supabaseAdmin
      .from("access_roles")
      .select("is_founder")
      .eq("id", id)
      .maybeSingle<{ is_founder: boolean }>();

    if (existing?.is_founder) {
      return NextResponse.json({ success: false, error: "Founder role cannot be edited." }, { status: 403 });
    }
  }

  const payload = {
    description: text(body.description),
    key: key || name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""),
    name,
    priority: typeof body.priority === "number" && Number.isFinite(body.priority) ? body.priority : 0,
    updated_at: new Date().toISOString(),
  };
  const result = id
    ? await supabaseAdmin.from("access_roles").update(payload).eq("id", id).select("*").single()
    : await supabaseAdmin.from("access_roles").insert(payload).select("*").single();

  if (result.error) {
    return NextResponse.json({ success: false, error: result.error.message }, { status: 400 });
  }

  await supabaseAdmin.from("access_role_permissions").delete().eq("role_id", result.data.id);

  if (permissionKeys.length) {
    const { error } = await supabaseAdmin.from("access_role_permissions").insert(
      permissionKeys.map((permissionKey) => ({
        permission_key: permissionKey,
        role_id: result.data.id,
      })),
    );

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
  }

  await writeAuditLog({
    actorEmail: auth.user.email,
    actorId: auth.user.id,
    afterData: { ...result.data, permission_keys: permissionKeys },
    entityId: String(result.data.id),
    entityType: "access_roles",
    eventType: id ? "access_role_updated" : "access_role_created",
    request,
    summary: `${id ? "Updated" : "Created"} access role ${name}.`,
  });

  return NextResponse.json({ role: result.data, success: true });
}
