import { NextResponse } from "next/server";
import { isAuthFailure, requireUser } from "@/src/lib/authSession";
import { getUserPermissions } from "@/src/lib/permissions";

export async function GET(request: Request) {
  const auth = await requireUser(request);

  if (isAuthFailure(auth)) {
    return auth.response;
  }

  const permissions = await getUserPermissions(auth.user.id);

  return NextResponse.json({
    destination: permissions.has("cad:access") ? "/cad" : "/membership",
    hasCadAccess: permissions.has("cad:access"),
    success: true,
  });
}
