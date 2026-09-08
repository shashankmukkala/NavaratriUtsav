import crypto from "node:crypto";
import { NextRequest } from "next/server";

export const ADMIN_COOKIE = "annadhanam_admin_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error("Missing ADMIN_SESSION_SECRET. Add it to .env.local (see README).");
  }
  return secret;
}

function hmac(expiry: string): string {
  return crypto.createHmac("sha256", getSecret()).update(expiry).digest("hex");
}

/** Creates a signed session token: "<expiryMs>.<hmac>". No server-side session store needed. */
export function createAdminSessionToken(): string {
  const expiry = String(Date.now() + SESSION_TTL_MS);
  return `${expiry}.${hmac(expiry)}`;
}

export function isValidAdminToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const [expiry, signature] = token.split(".");
  if (!expiry || !signature) return false;
  if (Date.now() > Number(expiry)) return false;

  const expected = hmac(expiry);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function requireAdmin(request: NextRequest): boolean {
  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  return isValidAdminToken(token);
}

export const ADMIN_COOKIE_MAX_AGE_SECONDS = SESSION_TTL_MS / 1000;
