import { NextResponse } from "next/server";
import { isAuthFailure, requireUser, type AuthenticatedUser } from "./authSession";
import { getSupabaseAdminClient } from "./supabaseAdmin";

export const ALL_PERMISSIONS = [
  "admin:access",
  "applications:review",
  "interviews:conduct",
  "questions:manage",
  "roles:manage",
  "certifications:manage",
  "departments:manage",
  "users:manage",
  "audit:view",
  "system:manage",
  "fto:manage",
  "cad:access",
  "cad:dispatch",
  "cad:officer",
  "cad:civilian",
  "cad:fto",
  "reports:write",
  "reports:review",
] as const;

export type PermissionKey = (typeof ALL_PERMISSIONS)[number] | (string & {});

export type PermissionAuthSuccess = AuthenticatedUser & {
  permissions: Set<string>;
};

export type PermissionAuthResult =
  | PermissionAuthSuccess
  | {
      response: NextResponse;
    };

export function isPermissionAuthFailure(
  result: PermissionAuthResult,
): result is { response: NextResponse } {
  return "response" in result;
}

export async function getUserPermissions(userId: string) {
  const supabaseAdmin = getSupabaseAdminClient();

  const { data: founderRoles } = await supabaseAdmin
    .from("user_access_roles")
    .select("access_roles!inner(is_founder)")
    .eq("user_id", userId)
    .eq("access_roles.is_founder", true)
    .limit(1);

  if ((founderRoles ?? []).length > 0) {
    return new Set<string>(ALL_PERMISSIONS);
  }

  const permissions = new Set<string>();

  const { data: roleRows } = await supabaseAdmin
    .from("user_access_roles")
    .select("access_roles!inner(access_role_permissions(permission_key))")
    .eq("user_id", userId);

  for (const row of roleRows ?? []) {
    const role = row.access_roles as { access_role_permissions?: Array<{ permission_key?: string }> } | null;
    for (const permission of role?.access_role_permissions ?? []) {
      if (permission.permission_key) {
        permissions.add(permission.permission_key);
      }
    }
  }

  const { data: certRows } = await supabaseAdmin
    .from("user_access_certifications")
    .select("access_certifications!inner(access_certification_permissions(permission_key))")
    .eq("user_id", userId)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

  for (const row of certRows ?? []) {
    const certification = row.access_certifications as
      | { access_certification_permissions?: Array<{ permission_key?: string }> }
      | null;
    for (const permission of certification?.access_certification_permissions ?? []) {
      if (permission.permission_key) {
        permissions.add(permission.permission_key);
      }
    }
  }

  const { data: legacyProfile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle<{ role: string | null }>();

  if (legacyProfile?.role === "admin") {
    for (const permission of ALL_PERMISSIONS) {
      permissions.add(permission);
    }
  }

  return permissions;
}

export async function userHasPermission(userId: string, permission: PermissionKey) {
  return (await getUserPermissions(userId)).has(permission);
}

export async function requirePermission(
  request: Request,
  permission: PermissionKey,
): Promise<PermissionAuthResult> {
  const auth = await requireUser(request);

  if (isAuthFailure(auth)) {
    return auth;
  }

  const permissions = await getUserPermissions(auth.user.id);

  if (!permissions.has(permission)) {
    return {
      response: NextResponse.json(
        { success: false, error: `Permission required: ${permission}.` },
        { status: 403 },
      ),
    };
  }

  return {
    ...auth,
    permissions,
  };
}

export async function grantRoleByKey(userId: string, roleKey: string, assignedBy?: string | null) {
  const supabaseAdmin = getSupabaseAdminClient();
  const { data: role, error } = await supabaseAdmin
    .from("access_roles")
    .select("id")
    .eq("key", roleKey)
    .maybeSingle<{ id: string }>();

  if (error || !role) {
    return { error: error?.message ?? `Role ${roleKey} was not found.` };
  }

  const { error: assignError } = await supabaseAdmin.from("user_access_roles").upsert({
    assigned_by: assignedBy ?? null,
    role_id: role.id,
    user_id: userId,
  });

  return { error: assignError?.message ?? null };
}
