import { NextResponse } from "next/server";
import { isAdminAuthFailure, requireAdmin } from "@/src/lib/adminAuth";
import { writeAuditLog } from "@/src/lib/auditLog";
import { grantRoleByKey } from "@/src/lib/permissions";
import { getSupabaseAdminClient } from "@/src/lib/supabaseAdmin";
import { isNonEmptyString, isUserRole, isValidSteamHex } from "@/src/lib/userRules";

type CreateUserBody = {
  display_name?: unknown;
  email?: unknown;
  password?: unknown;
  role?: unknown;
  role_ids?: unknown;
  certification_ids?: unknown;
  bypass_approved?: unknown;
  steam_hex?: unknown;
};

type ApiError = {
  message?: string;
};

function errorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

function ids(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

export async function GET(request: Request) {
  const adminAuth = await requireAdmin(request);

  if (isAdminAuthFailure(adminAuth)) {
    return adminAuth.response;
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim().toLowerCase() ?? "";
  const supabaseAdmin = getSupabaseAdminClient();

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id,email,role,display_name,steam_hex,steam_id64,membership_status,created_at,updated_at,last_login_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return errorResponse(error.message, 400);
  }

  const users = (data ?? []).filter((user) => {
    if (!search) {
      return true;
    }

    return [user.email, user.role, user.display_name, user.steam_hex]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(search));
  });

  return NextResponse.json({
    success: true,
    users,
  });
}

export async function POST(request: Request) {
  const adminAuth = await requireAdmin(request);

  if (isAdminAuthFailure(adminAuth)) {
    return adminAuth.response;
  }

  let body: CreateUserBody;

  try {
    body = (await request.json()) as CreateUserBody;
  } catch {
    return errorResponse("Invalid JSON body.", 400);
  }

  const email = isNonEmptyString(body.email) ? body.email.trim() : "";
  const password = isNonEmptyString(body.password) ? body.password : "";
  const role = isUserRole(body.role) ? body.role : "";
  const displayName = isNonEmptyString(body.display_name) ? body.display_name.trim() : "";
  const steamHex = isNonEmptyString(body.steam_hex) ? body.steam_hex.trim() : "";
  const roleIds = ids(body.role_ids);
  const certificationIds = ids(body.certification_ids);
  const bypassApproved = body.bypass_approved === true;

  if (!email || !password || !role) {
    return errorResponse("Email, password, and role are required.", 400);
  }

  if (steamHex && !isValidSteamHex(steamHex)) {
    return errorResponse("Steam Hex ID must look like steam:110000112345678 or a raw hex value.", 400);
  }

  try {
    const supabaseAdmin = getSupabaseAdminClient();

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: displayName,
        role,
        steam_hex: steamHex,
      },
    });

    if (error) {
      return errorResponse(error.message, 400);
    }

    if (!data.user) {
      return errorResponse("Supabase did not return a created user.", 500);
    }

    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: data.user.id,
      email: data.user.email ?? email,
      role,
      display_name: displayName || data.user.email || email,
      membership_status: bypassApproved ? "interview_accepted" : "not_applied",
      steam_hex: steamHex || null,
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      return errorResponse(`User created, but profile setup failed: ${profileError.message}`, 500);
    }

    if (bypassApproved) {
      const grant = await grantRoleByKey(data.user.id, "member", adminAuth.user.id);
      if (grant.error) {
        return errorResponse(`User created, but CAD member access failed: ${grant.error}`, 500);
      }
    }

    if (roleIds.length) {
      const { error } = await supabaseAdmin.from("user_access_roles").upsert(
        roleIds.map((roleId) => ({
          assigned_by: adminAuth.user.id,
          role_id: roleId,
          user_id: data.user.id,
        })),
      );

      if (error) {
        return errorResponse(`User created, but role assignment failed: ${error.message}`, 500);
      }
    }

    if (certificationIds.length) {
      const { error } = await supabaseAdmin.from("user_access_certifications").upsert(
        certificationIds.map((certificationId) => ({
          assigned_by: adminAuth.user.id,
          certification_id: certificationId,
          user_id: data.user.id,
        })),
      );

      if (error) {
        return errorResponse(`User created, but certification assignment failed: ${error.message}`, 500);
      }
    }

    await writeAuditLog({
      actorEmail: adminAuth.user.email,
      actorId: adminAuth.user.id,
      afterData: {
        display_name: displayName || data.user.email || email,
        email: data.user.email ?? email,
        membership_status: bypassApproved ? "interview_accepted" : "not_applied",
        role,
        role_ids: roleIds,
        certification_ids: certificationIds,
        steam_hex: steamHex || null,
      },
      entityId: data.user.id,
      entityType: "profiles",
      eventType: "user_created",
      metadata: {
        created_email: data.user.email ?? email,
        bypass_approved: bypassApproved,
        created_role: role,
      },
      request,
      summary: `Created user ${data.user.email ?? email} with ${role} role.`,
      targetUserId: data.user.id,
    });

    if (bypassApproved) {
      await writeAuditLog({
        actorEmail: adminAuth.user.email,
        actorId: adminAuth.user.id,
        afterData: { membership_status: "interview_accepted", role_ids: roleIds, certification_ids: certificationIds },
        entityId: data.user.id,
        entityType: "membership_applications",
        eventType: "membership_bypassed",
        metadata: { created_user: true },
        request,
        severity: "warning",
        summary: `Bypassed membership and granted CAD access to ${data.user.email ?? email}.`,
        targetUserId: data.user.id,
      });
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
          role,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : (error as ApiError).message ?? "Unable to create user.";

    return errorResponse(message, 500);
  }
}
