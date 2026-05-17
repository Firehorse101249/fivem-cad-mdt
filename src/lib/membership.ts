import { getSupabaseAdminClient } from "./supabaseAdmin";

export const APPLICATION_STATUSES = [
  "draft",
  "submitted",
  "application_approved",
  "application_denied",
  "interview_pending",
  "interview_accepted",
  "interview_denied",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export type MembershipQuestion = {
  active: boolean;
  field_type: "text" | "textarea" | "date";
  help_text: string | null;
  id: string;
  prompt: string;
  question_key: string;
  required: boolean;
  section: "application" | "interview";
  sort_order: number;
};

export type ProfileIdentity = {
  discord_id: string | null;
  discord_username: string | null;
  email: string | null;
  id: string;
  membership_status: string | null;
  steam_id64: string | null;
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function loadQuestions(section: "application" | "interview", includeInactive = false) {
  const supabaseAdmin = getSupabaseAdminClient();
  let query = supabaseAdmin
    .from("membership_question_definitions")
    .select("id,section,question_key,prompt,help_text,field_type,required,sort_order,active")
    .eq("section", section)
    .order("sort_order", { ascending: true });

  if (!includeInactive) {
    query = query.eq("active", true);
  }

  const { data, error } = await query.returns<MembershipQuestion[]>();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getProfileIdentity(userId: string) {
  const supabaseAdmin = getSupabaseAdminClient();
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id,email,steam_id64,discord_id,discord_username,membership_status")
    .eq("id", userId)
    .maybeSingle<ProfileIdentity>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getOrCreateApplication(userId: string, email: string) {
  const supabaseAdmin = getSupabaseAdminClient();
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("membership_applications")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle<Record<string, unknown>>();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    return existing;
  }

  const { data, error } = await supabaseAdmin
    .from("membership_applications")
    .insert({
      email,
      status: "draft",
      user_id: userId,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single<Record<string, unknown>>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function findActiveCooldown(identity: {
  discordId?: string | null;
  email?: string | null;
  steamId64?: string | null;
}) {
  const supabaseAdmin = getSupabaseAdminClient();
  const filters = [
    identity.email ? `email.eq.${identity.email}` : "",
    identity.steamId64 ? `steam_id64.eq.${identity.steamId64}` : "",
    identity.discordId ? `discord_id.eq.${identity.discordId}` : "",
  ].filter(Boolean);

  if (!filters.length) {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from("membership_denial_cooldowns")
    .select("*")
    .gt("expires_at", new Date().toISOString())
    .or(filters.join(","))
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle<Record<string, unknown>>();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? null;
}

export async function createWebsiteNotification(input: {
  applicationId?: string | null;
  body: string;
  subject: string;
  userId: string;
}) {
  const supabaseAdmin = getSupabaseAdminClient();
  await supabaseAdmin.from("membership_notifications").insert({
    application_id: input.applicationId ?? null,
    body: input.body,
    channel: "website",
    subject: input.subject,
    user_id: input.userId,
  });
}
