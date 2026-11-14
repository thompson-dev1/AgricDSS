import { db } from "@/app/lib/db";
import { getUserById } from "@/app/lib/data/users";
import { readSession } from "@/app/lib/session";

export async function GET() {
  const session = await readSession();
  if (!session) return Response.json({ notifications: 0, messages: 0, orders: 0 }, { headers: { "Cache-Control": "no-store" } });
  const user = await getUserById(session.userId);
  if (!user) return Response.json({ notifications: 0, messages: 0, orders: 0 }, { headers: { "Cache-Control": "no-store" } });
  const owner = user.role === "admin" ? 0 : user.id;
  const notifications = Number((await (db.prepare("SELECT COUNT(*) AS total FROM notifications WHERE user_id=? AND is_read=0").get(owner)) as { total: number }).total);
  const messages = user.role === "admin" ? 0 : Number((await (db.prepare("SELECT COUNT(*) AS total FROM messages WHERE receiver_id=? AND is_read=0").get(user.id)) as { total: number }).total);
  const column = user.role === "farmer" ? "seller_id" : "buyer_id";
  const orders = user.role === "admin" ? 0 : Number((await (db.prepare(`SELECT COUNT(*) AS total FROM orders WHERE ${column}=? AND lower(status)='pending'`).get(user.id)) as { total: number }).total);
  return Response.json({ notifications, messages, orders }, { headers: { "Cache-Control": "no-store" } });
}
