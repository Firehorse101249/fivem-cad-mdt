import { NextResponse } from "next/server";
import { isAuthFailure, requireUser } from "@/src/lib/authSession";
import { writeAuditLog } from "@/src/lib/auditLog";
import { getSupabaseAdminClient } from "@/src/lib/supabaseAdmin";

function extractSteamId(claimedId: string | null) {
  const match = claimedId?.match(/^https?:\/\/steamcommunity\.com\/openid\/id\/(\d{17,20})$/);
  return match?.[1] ?? "";
}

export async function GET(request: Request) {
  const auth = await requireUser(request);
  const origin = new URL(request.url).origin;

  if (isAuthFailure(auth)) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const url = new URL(request.url);
  const verifyParams = new URLSearchParams(url.searchParams);
  verifyParams.set("openid.mode", "check_authentication");

  const verification = await fetch("https://steamcommunity.com/openid/login", {
    body: verifyParams.toString(),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });
  const verificationText = await verification.text();

  if (!verification.ok || !verificationText.includes("is_valid:true")) {
    return NextResponse.redirect(`${origin}/membership?steam=failed`);
  }

  const steamId64 = extractSteamId(url.searchParams.get("openid.claimed_id"));

  if (!steamId64) {
    return NextResponse.redirect(`${origin}/membership?steam=missing`);
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      steam_id64: steamId64,
      updated_at: new Date().toISOString(),
    })
    .eq("id", auth.user.id);

  if (error) {
    return NextResponse.redirect(`${origin}/membership?steam=error`);
  }

  await writeAuditLog({
    actorEmail: auth.user.email,
    actorId: auth.user.id,
    afterData: { steam_id64: steamId64 },
    entityId: auth.user.id,
    entityType: "profiles",
    eventType: "steam_identity_linked",
    metadata: { steam_id64: steamId64 },
    request,
    summary: `Linked SteamID64 ${steamId64}.`,
    targetUserId: auth.user.id,
  });

  return NextResponse.redirect(`${origin}/membership?steam=linked`);
}
