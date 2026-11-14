import "server-only";
import { db } from "@/app/lib/db";

export type ChatContact = { id: number; name: string; role: string; lastMessage: string | null; unread: number };

export async function getChatContacts(userId: number, activeId = 0): Promise<ChatContact[]> {
  const rows = await (db.prepare(`
    SELECT u.id, u.name, u.role,
      (SELECT m.message FROM messages m WHERE (m.sender_id=u.id AND m.receiver_id=?) OR (m.sender_id=? AND m.receiver_id=u.id) ORDER BY m.id DESC LIMIT 1) AS last_message,
      (SELECT COUNT(*) FROM messages m WHERE m.sender_id=u.id AND m.receiver_id=? AND m.is_read=0) AS unread
    FROM users u
    WHERE u.id IN (SELECT sender_id FROM messages WHERE receiver_id=? UNION SELECT receiver_id FROM messages WHERE sender_id=?)
       OR u.id=?
    ORDER BY (SELECT MAX(m.id) FROM messages m WHERE (m.sender_id=u.id AND m.receiver_id=?) OR (m.sender_id=? AND m.receiver_id=u.id)) DESC
  `).all(userId, userId, userId, userId, userId, activeId || -1, userId, userId)) as Array<{
    id: number; name: string | null; role: string | null; last_message: string | null; unread: number;
  }>;
  return rows.map((row) => ({ id: row.id, name: row.name || "User", role: row.role || "user", lastMessage: row.last_message, unread: Number(row.unread) }));
}

export async function getChatContact(userId: number, contactId: number) {
  return await (db.prepare("SELECT id, name, role FROM users WHERE id = ? AND id != ? LIMIT 1")
    .get(contactId, userId)) as { id: number; name: string | null; role: string | null } | undefined;
}
