"use server";

import { randomUUID } from "node:crypto";
import { savePublicUpload } from "@/app/lib/uploads";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUserById } from "@/app/lib/data/users";
import { readSession } from "@/app/lib/session";

function imageExtension(bytes: Buffer) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return ".jpg";
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return ".png";
  if (bytes.length >= 6 && ["GIF87a", "GIF89a"].includes(bytes.toString("ascii", 0, 6))) return ".gif";
  return null;
}

export async function updateProfileAction(formData: FormData) {
  const session = await readSession();
  if (!session) redirect("/login?return_to=%2Fprofile");
  const user = await getUserById(session.userId);
  if (!user) redirect("/login");
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  if (!name || name.length > 120 || phone.length > 40 || location.length > 160) redirect("/profile?error=invalid_details");

  let picture: string | undefined;
  const uploaded = formData.get("profile_picture");
  if (uploaded instanceof File && uploaded.size > 0) {
    if (uploaded.size > 2_000_000) redirect("/profile?error=image_too_large");
    const bytes = Buffer.from(await uploaded.arrayBuffer());
    const extension = imageExtension(bytes);
    if (!extension) redirect("/profile?error=invalid_image");
    picture = `profile_${user.id}_${randomUUID()}${extension}`;
    const contentType = extension === ".jpg" ? "image/jpeg" : extension === ".png" ? "image/png" : "image/gif";
    await savePublicUpload(`uploads/profiles/${picture}`, bytes, contentType);
  }

  const { writeDb } = await import("@/app/lib/write-db");
  if (picture) {
    await (writeDb.prepare("UPDATE users SET name = ?, phone = ?, location = ?, profile_picture = ? WHERE id = ?")
      .run(name, phone, location, picture, user.id));
  } else {
    await (writeDb.prepare("UPDATE users SET name = ?, phone = ?, location = ? WHERE id = ?")
      .run(name, phone, location, user.id));
  }
  revalidatePath("/profile");
  revalidatePath("/dashboard");
  redirect("/profile?updated=1");
}
