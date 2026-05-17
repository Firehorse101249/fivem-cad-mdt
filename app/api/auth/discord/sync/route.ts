import { NextResponse } from "next/server";
import { isAuthFailure, requireUser } from "@/src/lib/authSession";
import { writeAuditLog } from "@/src/lib/auditLog";
import { getSupabaseAdminClient } from "@/src/lib/supabaseAdmin";

type IdentityData = {
  identity_data?: {
    full_name?: string;
    name?: string;
    preferred_username?: string;
    provider_id?: string;
    sub?: string;
    user_name?: string;
  };
  provider?: string;
  user_id?: string;
};

export async function POST(request: Request) {
  const auth = await requireUser(request);

  if (isAuthFailure(auth)) {
    return auth.response;
  }

  const identities = ((auth.user as { identities?: IdentityData[] }).identities ?? []).filter(
    (identity) => identity.provider === "discord",
  );
  const discord = identities[0];
  const discordId = discord?.identity_data?.provider_id ?? discord?.identity_data?.sub ?? discord?.user_id ?? "";
  const discordUsername =
    discord?.identity_data?.preferred_username ??
    discord?.identity_data?.user_name ??
    discord?.identity_data?.full_name ??
    discord?.identity_data?.name ??
    "";

  if (!discordId) {
    return NextResponse.json(
      { success: false, error: "No linked Discord identity was found on this session." },
      { status: 400 },
    );
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      discord_id: discordId,
      discord_username: discordUsername || discordId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", auth.user.id);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }

  await writeAuditLog({
    actorEmail: auth.user.email,
    actorId: auth.user.id,
    afterData: { discord_id: discordId, discord_username: discordUsername || discordId },
    entityId: auth.user.id,
    entityType: "profiles",
    eventType: "discord_identity_linked",
    metadata: { discord_id: discordId },
    request,
    summary: `Linked Discord identity ${discordUsername || discordId}.`,
    targetUserId: auth.user.id,
  });

  return NextResponse.json({
    discord: {
      id: discordId,
      username: discordUsername || discordId,
    },
    success: true,
  });
}
