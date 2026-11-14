import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getUserById } from "@/app/lib/data/users";

const COOKIE_NAME = "agric_session";
const SESSION_SECONDS = 60 * 60 * 24 * 7;

type SessionPayload = { userId: number; expiresAt: number };

function signingSecret() {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV !== "production") return "local-development-only-secret-change-before-deploy-000000";
  throw new Error("SESSION_SECRET must contain at least 32 characters.");
}

function sign(payload: string, passwordHash: string) {
  return createHmac("sha256", `${signingSecret()}:${passwordHash}`).update(payload).digest("base64url");
}

export async function createSession(userId: number) {
  const user = await getUserById(userId);
  if (!user) throw new Error("Cannot create a session for a missing user.");
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const payload = Buffer.from(JSON.stringify({ userId, expiresAt } satisfies SessionPayload)).toString("base64url");
  const token = `${payload}.${sign(payload, user.password)}`;
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESSION_SECONDS,
  });
}

export async function readSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const [payload, providedSignature, extra] = token.split(".");
  if (!payload || !providedSignature || extra) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionPayload;
    if (!Number.isInteger(parsed.userId) || parsed.userId <= 0 || parsed.expiresAt <= Date.now() / 1000) return null;
    const user = await getUserById(parsed.userId);
    if (!user) return null;
    const expected = Buffer.from(sign(payload, user.password));
    const provided = Buffer.from(providedSignature);
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function deleteSession() {
  (await cookies()).delete(COOKIE_NAME);
}
