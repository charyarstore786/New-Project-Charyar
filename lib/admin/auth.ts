import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

// Simple signed-cookie session for the single-user admin dashboard (see
// PLAN.md "Admin dashboard"). No accounts, no NextAuth — one shared password
// from ADMIN_PASSWORD, and a cookie that's just a timestamp + HMAC over it
// (keyed on the password itself, so rotating ADMIN_PASSWORD invalidates
// every existing session).

export const ADMIN_COOKIE = "admin_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function secret(): string {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error("ADMIN_PASSWORD is not set");
  return password;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

export function checkPassword(candidate: string): boolean {
  const expected = secret();
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function createSessionToken(): string {
  const issuedAt = Date.now().toString();
  return `${issuedAt}.${sign(issuedAt)}`;
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const [issuedAt, signature] = token.split(".");
  if (!issuedAt || !signature) return false;
  let expected: string;
  try {
    expected = sign(issuedAt);
  } catch {
    return false;
  }
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  return Date.now() - Number(issuedAt) < SESSION_TTL_MS;
}
