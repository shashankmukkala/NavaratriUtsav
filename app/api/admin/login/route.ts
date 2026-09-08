import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, ADMIN_COOKIE_MAX_AGE_SECONDS, createAdminSessionToken } from "@/lib/adminAuth";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const password = body?.password;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return NextResponse.json(
      { error: "Server is missing ADMIN_PASSWORD. Add it to .env.local (see README)." },
      { status: 500 }
    );
  }
  if (typeof password !== "string" || password !== adminPassword) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, createAdminSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE_SECONDS,
  });
  return response;
}
