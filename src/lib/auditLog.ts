import { getSupabaseAdminClient } from "./supabaseAdmin";

export const AUDIT_LOG_TYPES = [
  "user_created",
  "user_role_changed",
  "user_deleted",
  "password_reset_sent",
  "maintenance_updated",
  "civilian_profile_created",
  "civilian_profile_updated",
  "civilian_profile_deleted",
  "civilian_license_created",
  "civilian_license_updated",
  "civilian_license_deleted",
  "civilian_vehicle_created",
  "civilian_vehicle_updated",
  "civilian_vehicle_deleted",
  "civilian_record_created",
  "civilian_record_updated",
  "civilian_record_deleted",
  "system_setting_changed",
] as const;

export type AuditLogType = (typeof AUDIT_LOG_TYPES)[number] | (string & {});

type AuditLogInput = {
  actorEmail?: string | null;
  actorId?: string | null;
  afterData?: Record<string, unknown> | null;
  beforeData?: Record<string, unknown> | null;
  entityId?: string | null;
  entityType: string;
  eventType: AuditLogType;
  metadata?: Record<string, unknown>;
  request?: Request;
  severity?: "debug" | "info" | "warning" | "critical";
  source?: string;
  summary: string;
  targetCivilianId?: string | null;
  targetUserId?: string | null;
};

function requestIp(request?: Request) {
  if (!request) return null;

  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null
  );
}

export async function writeAuditLog(input: AuditLogInput) {
  try {
    const supabaseAdmin = getSupabaseAdminClient();
    const { error } = await supabaseAdmin.from("audit_logs").insert({
      actor_email: input.actorEmail ?? null,
      actor_id: input.actorId ?? null,
      after_data: input.afterData ?? null,
      before_data: input.beforeData ?? null,
      entity_id: input.entityId ?? null,
      entity_type: input.entityType,
      event_type: input.eventType,
      ip_address: requestIp(input.request),
      metadata: input.metadata ?? {},
      severity: input.severity ?? "info",
      source: input.source ?? "admin_console",
      summary: input.summary,
      target_civilian_id: input.targetCivilianId ?? null,
      target_user_id: input.targetUserId ?? null,
      user_agent: input.request?.headers.get("user-agent") ?? null,
    });

    if (error) {
      console.error("Audit log write failed:", error.message);
    }
  } catch (error) {
    console.error("Audit log write failed:", error instanceof Error ? error.message : error);
  }
}
