import "server-only";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { withWriteTransaction, writeDb } from "@/app/lib/db";

let rateLimitSchema: Promise<unknown> | undefined;
async function ensureRateLimitSchema() {
  rateLimitSchema ||= writeDb.exec(`CREATE TABLE IF NOT EXISTS app_rate_limits (
    key TEXT PRIMARY KEY,
    window_started_at INTEGER NOT NULL,
    attempts INTEGER NOT NULL,
    blocked_until INTEGER NOT NULL DEFAULT 0
  )`);
  await rateLimitSchema;
}

let calls = 0;

export async function requestAddress(): Promise<string> {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for");
  const address = forwarded?.split(",").map((part) => part.trim()).filter(Boolean).at(-1)
    || requestHeaders.get("x-real-ip")
    || "unknown";
  return address.slice(0, 128);
}

export async function consumeRateLimit(scope: string, identity: string, limit: number, windowMs: number) {
  await ensureRateLimitSchema();
  const now = Date.now();
  const key = createHash("sha256").update(`${scope}\0${identity}`).digest("hex");
  const result = await withWriteTransaction(async (tx) => {
    const existing = await tx.prepare("SELECT window_started_at, attempts, blocked_until FROM app_rate_limits WHERE key = ?")
      .get(key) as { window_started_at: number; attempts: number; blocked_until: number } | undefined;
    if (existing && existing.blocked_until > now) {
      return { allowed: false, retryAfterSeconds: Math.ceil((existing.blocked_until - now) / 1000) };
    }
    const fresh = !existing || now - existing.window_started_at >= windowMs;
    const startedAt = fresh ? now : existing.window_started_at;
    const attempts = fresh ? 1 : existing.attempts + 1;
    const blockedUntil = attempts > limit ? startedAt + windowMs : 0;
    await tx.prepare(`INSERT INTO app_rate_limits (key, window_started_at, attempts, blocked_until)
      VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET
      window_started_at = excluded.window_started_at, attempts = excluded.attempts,
      blocked_until = excluded.blocked_until`).run(key, startedAt, attempts, blockedUntil);
    return blockedUntil
      ? { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((blockedUntil - now) / 1000)) }
      : { allowed: true, retryAfterSeconds: 0 };
  });
  if (++calls % 100 === 0) {
    await writeDb.prepare("DELETE FROM app_rate_limits WHERE window_started_at < ? AND blocked_until < ?").run(now - 30 * 86400000, now);
  }
  return result;
}
