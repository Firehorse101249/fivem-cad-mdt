import { NextResponse } from "next/server";
import { isAuthFailure, requireUser } from "@/src/lib/authSession";

export async function GET(request: Request) {
  const auth = await requireUser(request);

  if (isAuthFailure(auth)) {
    return auth.response;
  }

  const url = new URL(request.url);
  const origin = url.origin;
  const returnTo = `${origin}/api/auth/steam/callback`;
  const realm = origin;
  const params = new URLSearchParams({
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.mode": "checkid_setup",
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.realm": realm,
    "openid.return_to": returnTo,
  });

  return NextResponse.redirect(`https://steamcommunity.com/openid/login?${params.toString()}`);
}
