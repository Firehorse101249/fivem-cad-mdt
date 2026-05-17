import { NextResponse } from "next/server";
import { writeAuditLog } from "@/src/lib/auditLog";
import { isPermissionAuthFailure, requirePermission } from "@/src/lib/permissions";
import { getSupabaseAdminClient } from "@/src/lib/supabaseAdmin";

type CertificationBody = {
  description?: unknown;
  id?: unknown;
  key?: unknown;
  name?: unknown;
  permission_keys?: unknown;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function textArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export async function GET(request: Request) {
  const auth = await requirePermission(request, "certifications:manage");

  if (isPermissionAuthFailure(auth)) {
    return auth.response;
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const [{ data: certifications, error }, { data: permissions }] = await Promise.all([
    supabaseAdmin
      .from("access_certifications")
      .select("*, access_certification_permissions(permission_key)")
      .order("name", { ascending: true }),
    supabaseAdmin.from("access_permissions").select("*").order("category", { ascending: true }).order("key", { ascending: true }),
  ]);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ certifications: certifications ?? [], permissions: permissions ?? [], success: true });
}

export async function POST(request: Request) {
  const auth = await requirePermission(request, "certifications:manage");

  if (isPermissionAuthFailure(auth)) {
    return auth.response;
  }

  let body: CertificationBody;

  try {
    body = (await request.json()) as CertificationBody;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const id = text(body.id);
  const key = text(body.key);
  const name = text(body.name);
  const permissionKeys = textArray(body.permission_keys);

  if (!name || (!id && !key)) {
    return NextResponse.json({ success: false, error: "Certification name and key are required." }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const payload = {
    description: text(body.description),
    key: key || name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""),
    name,
    updated_at: new Date().toISOString(),
  };
  const result = id
    ? await supabaseAdmin.from("access_certifications").update(payload).eq("id", id).select("*").single()
    : await supabaseAdmin.from("access_certifications").insert(payload).select("*").single();

  if (result.error) {
    return NextResponse.json({ success: false, error: result.error.message }, { status: 400 });
  }

  await supabaseAdmin.from("access_certification_permissions").delete().eq("certification_id", result.data.id);

  if (permissionKeys.length) {
    const { error } = await supabaseAdmin.from("access_certification_permissions").insert(
      permissionKeys.map((permissionKey) => ({
        certification_id: result.data.id,
        permission_key: permissionKey,
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
    entityType: "access_certifications",
    eventType: id ? "access_certification_updated" : "access_certification_created",
    request,
    summary: `${id ? "Updated" : "Created"} certification ${name}.`,
  });

  return NextResponse.json({ certification: result.data, success: true });
}
