import { NextResponse } from "next/server";
import { isAdminAuthFailure, requireAdmin } from "@/src/lib/adminAuth";
import { getSupabaseAdminClient } from "@/src/lib/supabaseAdmin";

type UserRouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

const historyQueries = [
  { key: "reports", table: "reports", column: "created_by" },
  { key: "citations", table: "citations", column: "created_by" },
  { key: "arrests", table: "arrests", column: "created_by" },
  { key: "warrants", table: "warrants", column: "created_by" },
  { key: "bolos", table: "bolos", column: "created_by" },
  { key: "dispatch_calls", table: "dispatch_calls", column: "created_by" },
  { key: "vehicles", table: "vehicles", column: "owner_id" },
  { key: "civilians", table: "civilians", column: "owner_id" },
];

async function getHistory(table: string, column: string, userId: string) {
  const supabaseAdmin = getSupabaseAdminClient();
  const { data, error } = await supabaseAdmin
    .from(table)
    .select("*")
    .eq(column, userId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    return [];
  }

  return data ?? [];
}

export async function GET(request: Request, context: UserRouteContext) {
  const adminAuth = await requireAdmin(request);

  if (isAdminAuthFailure(adminAuth)) {
    return adminAuth.response;
  }

  const { userId } = await context.params;
  const supabaseAdmin = getSupabaseAdminClient();

  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("id,email,role,display_name,steam_hex,created_at,updated_at,last_login_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }

  if (!profile) {
    return NextResponse.json({ success: false, error: "User not found." }, { status: 404 });
  }

  const historyEntries = await Promise.all(
    historyQueries.map(async (query) => [
      query.key,
      await getHistory(query.table, query.column, userId),
    ]),
  );

  return NextResponse.json({
    success: true,
    profile,
    history: Object.fromEntries(historyEntries),
  });
}
