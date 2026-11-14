import { getUserById } from "@/app/lib/data/users";
import { readSession } from "@/app/lib/session";
import { db } from "@/app/lib/db";
import { consumeRateLimit, requestAddress } from "@/app/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await readSession();
  if (!session || !await getUserById(session.userId)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const address = await requestAddress();
  const limit = await consumeRateLimit("messages-read", `${session.userId}:${address}`, 120, 60 * 1000);
  if (!limit.allowed) return Response.json({ error: "Too many requests. Please wait before trying again." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds), "Cache-Control": "no-store" } });
  const contactId = Number(new URL(request.url).searchParams.get("contactId"));
  if (!Number.isInteger(contactId) || contactId < 1 || contactId === session.userId || !await getUserById(contactId)) return Response.json({ error: "Invalid contact" }, { status: 400 });
  const { writeDb } = await import("@/app/lib/write-db");
  await (writeDb.prepare("UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND is_read = 0").run(contactId, session.userId));
  const messages = await (db.prepare(`SELECT id, sender_id, message, created_at FROM messages
    WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
    ORDER BY id DESC LIMIT 300`).all(session.userId, contactId, contactId, session.userId)) as Array<{
      id: number; sender_id: number; message: string; created_at: string;
    }>;
  return Response.json({ messages: messages.map((message) => ({ id: message.id, senderId: message.sender_id, message: message.message, time: message.created_at })) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const session = await readSession();
  if (!session || !await getUserById(session.userId)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const address = await requestAddress();
  const limit = await consumeRateLimit("messages-user", `${session.userId}:${address}`, 60, 60 * 1000);
  if (!limit.allowed) return Response.json({ error: "Too many messages. Please wait before trying again." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds), "Cache-Control": "no-store" } });
  let body: { receiverId?: unknown; message?: unknown };
  try { body = await request.json() as typeof body; } catch { return Response.json({ error: "Invalid request" }, { status: 400 }); }
  const receiverId = Number(body.receiverId);
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!Number.isInteger(receiverId) || receiverId < 1 || receiverId === session.userId || !await getUserById(receiverId) || !message || message.length > 2000) {
    return Response.json({ error: "Enter a message of up to 2,000 characters and choose a valid contact." }, { status: 400 });
  }
  const { writeDb } = await import("@/app/lib/write-db");
  const result = await (writeDb.prepare("INSERT INTO messages (sender_id, receiver_id, message) VALUES (?, ?, ?)").run(session.userId, receiverId, message));
  return Response.json({ ok: true, id: Number(result.lastInsertRowid) }, { status: 201 });
}
