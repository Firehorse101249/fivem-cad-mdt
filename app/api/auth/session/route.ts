import { NextResponse } from "next/server";

const ACCESS_COOKIE = "sb-access-token";

type SessionBody = {
  accessToken?: unknown;
  expiresIn?: unknown;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function POST(request: Request) {
  let body: SessionBody;

  try {
    body = (await request.json()) as SessionBody;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  if (!isNonEmptyString(body.accessToken)) {
    return NextResponse.json(
      { success: false, error: "A Supabase access token is required." },
      { status: 400 },
    );
  }

  const response = NextResponse.json({ success: true });
  const maxAge =
    typeof body.expiresIn === "number" && body.expiresIn > 0
      ? Math.min(body.expiresIn, 60 * 60)
      : 60 * 60;

  response.cookies.set({
    name: ACCESS_COOKIE,
    value: body.accessToken,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });

  response.cookies.set({
    name: ACCESS_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}
