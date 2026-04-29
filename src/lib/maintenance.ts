import { getSupabaseAdminClient } from "./supabaseAdmin";

export type MaintenanceMode = {
  enabled: boolean;
  message: string;
};

const defaultMaintenanceMode: MaintenanceMode = {
  enabled: false,
  message: "System temporarily offline for development",
};

export async function getMaintenanceMode(): Promise<MaintenanceMode> {
  try {
    const supabaseAdmin = getSupabaseAdminClient();
    const { data, error } = await supabaseAdmin
      .from("system_settings")
      .select("value")
      .eq("key", "maintenance_mode")
      .maybeSingle<{ value: unknown }>();

    if (error || !data || typeof data.value !== "object" || data.value === null) {
      return defaultMaintenanceMode;
    }

    const value = data.value as Partial<MaintenanceMode>;

    return {
      enabled: typeof value.enabled === "boolean" ? value.enabled : false,
      message:
        typeof value.message === "string" && value.message.trim()
          ? value.message
          : defaultMaintenanceMode.message,
    };
  } catch {
    // Fail open: database/config errors should not accidentally lock everyone out.
    return defaultMaintenanceMode;
  }
}
