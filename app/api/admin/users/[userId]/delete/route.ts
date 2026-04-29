import { NextResponse } from "next/server";
import { isAdminAuthFailure, requireAdmin } from "@/src/lib/adminAuth";
import { getSupabaseAdminClient } from "@/src/lib/supabaseAdmin";

type UserRouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

async function deleteUser(request: Request, context: UserRouteContext) {
  const adminAuth = await requireAdmin(request);

  if (isAdminAuthFailure(adminAuth)) {
    return adminAuth.response;
  }

  const { userId } = await context.params;
  const supabaseAdmin = getSupabaseAdminClient();
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }

  await supabaseAdmin.from("profiles").delete().eq("id", userId);

  return NextResponse.json({
    success: true,
    message: "User deleted.",
  });
}

export async function POST(request: Request, context: UserRouteContext) {
  return deleteUser(request, context);
}

export async function DELETE(request: Request, context: UserRouteContext) {
  return deleteUser(request, context);
}
