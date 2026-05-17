import { NextResponse } from "next/server";
import { isAdminAuthFailure, requireAdmin } from "@/src/lib/adminAuth";
import { AUDIT_LOG_TYPES } from "@/src/lib/auditLog";
import { getSupabaseAdminClient } from "@/src/lib/supabaseAdmin";

type AuditLogRow = {
  actor_email: string | null;
  actor_id: string | null;
  created_at: string;
  entity_id: string | null;
  entity_type: string;
  event_type: string;
  id: string;
  ip_address: string | null;
  metadata: Record<string, unknown> | null;
  severity: string;
  source: string;
  summary: string;
  target_civilian_id: string | null;
  target_user_id: string | null;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function errorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function GET(request: Request) {
  const adminAuth = await requireAdmin(request);

  if (isAdminAuthFailure(adminAuth)) {
    return adminAuth.response;
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId")?.trim() ?? "";
  const eventType = searchParams.get("eventType")?.trim() ?? "";
  const entityType = searchParams.get("entityType")?.trim() ?? "";
  const search = (searchParams.get("search")?.trim() ?? "").replace(/[%,()]/g, " ");
  const rawLimit = Number(searchParams.get("limit") ?? 50);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 50;
  const rawCursor = Number(searchParams.get("cursor") ?? 0);
  const offset = Number.isFinite(rawCursor) ? Math.max(0, rawCursor) : 0;

  if (userId && !uuidPattern.test(userId)) {
    return errorResponse("User filter must be a valid user id.", 400);
  }

  try {
    const supabaseAdmin = getSupabaseAdminClient();
    let query = supabaseAdmin
      .from("audit_logs")
      .select("id,created_at,event_type,entity_type,entity_id,actor_id,actor_email,target_user_id,target_civilian_id,summary,severity,source,ip_address,metadata")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit);

    if (eventType) {
      query = query.eq("event_type", eventType);
    }

    if (entityType) {
      query = query.eq("entity_type", entityType);
    }

    if (userId) {
      query = query.or(`actor_id.eq.${userId},target_user_id.eq.${userId}`);
    }

    if (search) {
      query = query.or(`summary.ilike.%${search}%,entity_id.ilike.%${search}%,actor_email.ilike.%${search}%`);
    }

    const { data, error } = await query.returns<AuditLogRow[]>();

    if (error) {
      return errorResponse(
        `${error.message}. If this is a new install, run supabase/audit-log-schema.sql in Supabase.`,
        400,
      );
    }

    const rows = data ?? [];
    const auditLogs = rows.slice(0, limit);
    const eventTypes = Array.from(
      new Set([...auditLogs.map((row) => row.event_type), ...AUDIT_LOG_TYPES]),
    ).sort();
    const entityTypes = Array.from(new Set(auditLogs.map((row) => row.entity_type))).sort();

    return NextResponse.json({
      success: true,
      auditLogs,
      filters: {
        entityTypes,
        eventTypes,
      },
      page: {
        cursor: String(offset),
        limit,
        nextCursor: rows.length > limit ? String(offset + limit) : null,
      },
    });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Unable to load audit logs.", 500);
  }
}
