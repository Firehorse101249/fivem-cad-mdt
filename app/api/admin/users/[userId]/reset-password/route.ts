import { NextResponse } from "next/server";
import { isAdminAuthFailure, requireAdmin } from "@/src/lib/adminAuth";
import { getSupabaseAdminClient } from "@/src/lib/supabaseAdmin";

type UserRouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

export async function POST(request: Request, context: UserRouteContext) {
  const adminAuth = await requireAdmin(request);

  if (isAdminAuthFailure(adminAuth)) {
    return adminAuth.response;
  }

  const { userId } = await context.params;
  const supabaseAdmin = getSupabaseAdminClient();

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .maybeSingle<{ email: string | null }>();

  if (profileError) {
    return NextResponse.json({ success: false, error: profileError.message }, { status: 400 });
  }

  if (!profile?.email) {
    return NextResponse.json(
      { success: false, error: "User email was not found." },
      { status: 404 },
    );
  }

  // This sends Supabase's password reset email. It does not manually set a password.
  const { error } = await supabaseAdmin.auth.resetPasswordForEmail(profile.email);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    message: `Password reset email sent to ${profile.email}.`,
  });
}
