import "server-only";
import { SiteNavigation } from "@/app/components/site-navigation";
import { db } from "@/app/lib/db";
import { getUserById } from "@/app/lib/data/users";
import { readSession } from "@/app/lib/session";

export async function AppNavigation() {
  const session = await readSession();
  const user = session ? await getUserById(session.userId) : null;
  if (!user) return <SiteNavigation />;
  const notificationOwner = user.role === "admin" ? 0 : user.id;
  const notifications = Number((await (db.prepare("SELECT COUNT(*) AS total FROM notifications WHERE user_id=? AND is_read=0").get(notificationOwner)) as { total: number }).total);
  const messages = user.role === "admin" ? 0 : Number((await (db.prepare("SELECT COUNT(*) AS total FROM messages WHERE receiver_id=? AND is_read=0").get(user.id)) as { total: number }).total);
  const ownerColumn = user.role === "farmer" ? "seller_id" : "buyer_id";
  const orders = user.role === "admin" ? 0 : Number((await (db.prepare(`SELECT COUNT(*) AS total FROM orders WHERE ${ownerColumn}=? AND lower(status)='pending'`).get(user.id)) as { total: number }).total);
  return <SiteNavigation role={user.role} name={user.name} counts={{ notifications, messages, orders }} />;
}
