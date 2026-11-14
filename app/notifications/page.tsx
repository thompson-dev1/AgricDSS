import { redirect } from "next/navigation";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/app/actions/notifications";
import { notificationHref } from "@/app/lib/notification-links";
import { db } from "@/app/lib/db";
import { getUserById } from "@/app/lib/data/users";
import { readSession } from "@/app/lib/session";
import "./notifications.css";

export const metadata = { title: "Notifications | AGRIC DSS" };
type NotificationRow = { id: number; message: string | null; is_read: number | null; created_at: string | null; date: string | null };
const plainText = (message: string) => message.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0*39;/g, "'").replace(/\s+/g, " ").trim();

export default async function NotificationsPage() {
  const session = await readSession();
  if (!session) redirect("/login?return_to=%2Fnotifications");
  const user = await getUserById(session.userId);
  if (!user) redirect("/login");
  const notificationUserId = user.role === "admin" ? 0 : user.id;
  const rows = await (db.prepare("SELECT id,message,is_read,created_at,date FROM notifications WHERE user_id = ? ORDER BY is_read ASC,id DESC LIMIT 200")
    .all(notificationUserId)) as NotificationRow[];
  const unreadCount = rows.reduce((count, row) => count + (row.is_read ? 0 : 1), 0);
  return <main className="notifications-page"><header className="notification-header"><h1><i className="fas fa-bell" aria-hidden="true" /> Notifications</h1><p>Stay updated on orders, confirmations & activity</p></header><div className="notification-list-wrap">
    {rows.length ? <><div className="notification-top"><span className="notification-count">{unreadCount} unread notification{unreadCount === 1 ? "" : "s"}</span>{unreadCount > 0 && <form action={markAllNotificationsReadAction}><button className="mark-all-notifications" type="submit"><i className="fas fa-check-circle" aria-hidden="true" /> Mark All as Read</button></form>}</div>
      <div className="notification-list">{rows.map((row) => { const message = row.message || "You have a new update."; const href = notificationHref(message, user.role); const isUnread = !row.is_read; const actionForm = <form action={markNotificationReadAction}><input type="hidden" name="notification_id" value={row.id} /><button className="mark-notification-read" type="submit">{isUnread ? "Mark Read" : "View Details"}</button></form>;
        return <article className={`notification-card ${isUnread ? "unread" : "read"}`} key={row.id}><span className={`notification-dot ${isUnread ? "unread" : "read"}`} /><div className="notification-content"><p>{plainText(message)}</p><time><i className="far fa-calendar-alt" aria-hidden="true" /> {row.created_at || row.date || "Just now"}</time></div>{href ? actionForm : isUnread ? actionForm : null}</article>;
      })}</div></> : <section className="notification-empty"><i className="fas fa-bell-slash" aria-hidden="true" /><h2>No notifications yet</h2><p>You’ll see alerts here when there’s activity on your account.</p></section>}
  </div></main>;
}
