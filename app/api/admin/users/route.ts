import { NextResponse } from "next/server";
import { isAdminAuthFailure, requireAdmin } from "@/src/lib/adminAuth";
import { getSupabaseAdminClient } from "@/src/lib/supabaseAdmin";
import { isNonEmptyString, isUserRole, isValidSteamHex } from "@/src/lib/userRules";

type CreateUserBody = {
  display_name?: unknown;
  email?: unknown;
  password?: unknown;
  role?: unknown;
  steam_hex?: unknown;
};

type ApiError = {
  message?: string;
};

function errorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
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
    .select("id,email,role,display_name,steam_hex,created_at,updated_at,last_login_at")
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
      steam_hex: steamHex || null,
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      return errorResponse(`User created, but profile setup failed: ${profileError.message}`, 500);
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
