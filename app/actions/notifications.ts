"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { readSession } from "@/app/lib/session";
import { getUserById } from "@/app/lib/data/users";
import { notificationHref } from "@/app/lib/notification-links";

export async function markNotificationReadAction(formData: FormData) {
  const session = await readSession();
  if (!session) redirect("/login?return_to=%2Fnotifications");
  const user = await getUserById(session.userId);
  if (!user) redirect("/login");
  const id = Number(formData.get("notification_id"));
  if (!Number.isInteger(id) || id < 1) redirect("/notifications");
  const { writeDb } = await import("@/app/lib/write-db");
  await (writeDb.prepare("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?").run(id, user.role === "admin" ? 0 : user.id));
  revalidatePath("/notifications");
  const message = (await (writeDb.prepare("SELECT message FROM notifications WHERE id = ? AND user_id = ?").get(id, user.role === "admin" ? 0 : user.id)) as { message: string } | undefined)?.message || "";
  const href = notificationHref(message, user.role);
  redirect(href || "/notifications");
}

export async function markAllNotificationsReadAction() {
  const session = await readSession();
  if (!session) redirect("/login?return_to=%2Fnotifications");
  const user = await getUserById(session.userId);
  if (!user) redirect("/login");
  const { writeDb } = await import("@/app/lib/write-db");
  await (writeDb.prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ?").run(user.role === "admin" ? 0 : user.id));
  revalidatePath("/notifications");
  redirect("/notifications");
}

