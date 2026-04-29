import { NextResponse } from "next/server";
import { isAdminAuthFailure, requireAdmin } from "@/src/lib/adminAuth";
import { getMaintenanceMode } from "@/src/lib/maintenance";
import { getSupabaseAdminClient } from "@/src/lib/supabaseAdmin";

type MaintenanceBody = {
  enabled?: unknown;
  message?: unknown;
};

function errorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function GET(request: Request) {
  const adminAuth = await requireAdmin(request);

  if (isAdminAuthFailure(adminAuth)) {
    return adminAuth.response;
  }

  const maintenance = await getMaintenanceMode();

  return NextResponse.json({
    success: true,
    maintenance,
  });
}

export async function POST(request: Request) {
  const adminAuth = await requireAdmin(request);

  if (isAdminAuthFailure(adminAuth)) {
    return adminAuth.response;
  }

  let body: MaintenanceBody;

  try {
    body = (await request.json()) as MaintenanceBody;
  } catch {
    return errorResponse("Invalid JSON body.", 400);
  }

  if (typeof body.enabled !== "boolean") {
    return errorResponse("Maintenance enabled must be true or false.", 400);
  }

  if (typeof body.message !== "string" || !body.message.trim()) {
    return errorResponse("Maintenance message is required.", 400);
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const { error } = await supabaseAdmin.from("system_settings").upsert({
    key: "maintenance_mode",
    value: {
      enabled: body.enabled,
      message: body.message.trim(),
    },
    updated_at: new Date().toISOString(),
    updated_by: adminAuth.user.id,
  });

  if (error) {
    return errorResponse(error.message, 400);
  }

  return NextResponse.json({
    success: true,
    maintenance: {
      enabled: body.enabled,
      message: body.message.trim(),
    },
  });
}
