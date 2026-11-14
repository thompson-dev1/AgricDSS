"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { getUserById } from "@/app/lib/data/users";
import { readSession, createSession } from "@/app/lib/session";
import { consumeRateLimit, requestAddress } from "@/app/lib/rate-limit";

export async function changePasswordAction(formData: FormData) {
  const session = await readSession();
  if (!session) redirect("/login?return_to=%2Fprofile");
  const user = await getUserById(session.userId);
  if (!user) redirect("/login");

  const address = await requestAddress();
  if (!(await consumeRateLimit("password-change", `${user.id}:${address}`, 5, 60 * 60 * 1000)).allowed) {
    redirect("/profile?error=rate_limited");
  }
  const currentPassword = String(formData.get("current_password") ?? "");
  const newPassword = String(formData.get("new_password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");
  const matched = await bcrypt.compare(currentPassword, user.password);
  if (!matched) redirect("/profile?error=current_password");
  if (newPassword.length < 12) redirect("/profile?error=password_short");
  if (newPassword !== confirmPassword) redirect("/profile?error=password_mismatch");
  if (newPassword === currentPassword) redirect("/profile?error=password_same");

  const hash = await bcrypt.hash(newPassword, 12);
  const { writeDb } = await import("@/app/lib/write-db");
  const updatePassword = writeDb.transaction(async () => {
    await (writeDb.prepare("UPDATE users SET password = ? WHERE id = ?").run(hash, user.id));
    await (writeDb.prepare("UPDATE farmers SET password = ? WHERE lower(email) = lower(?)").run(hash, user.email));
  });
  await updatePassword();
  await createSession(user.id);
  redirect("/profile?password_changed=1");
}
