"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUserById } from "@/app/lib/data/users";
import { readSession } from "@/app/lib/session";

export async function decideAdminRequestAction(formData: FormData) {
  const session = await readSession();
  if (!session) redirect("/login?return_to=%2Fadmin");
  const admin = await getUserById(session.userId);
  if (!admin || admin.role !== "admin") redirect("/dashboard");
  const kind = String(formData.get("kind") || "");
  const id = Number(formData.get("id"));
  const decision = String(formData.get("decision") || "");
  const redirectTab = kind === "loan" ? "loans" : kind === "promotion" ? "promotions" : "subscriptions";
  if (!["loan", "promotion", "subscription"].includes(kind) || !Number.isInteger(id) || id < 1 || !["approve", "reject"].includes(decision)) redirect("/admin?error=invalid_request");

  const { writeDb } = await import("@/app/lib/write-db");
  const processDecision = writeDb.transaction(async () => {
    const table = kind === "loan" ? "loans" : kind === "promotion" ? "promotions" : "subscriptions";
    const row = await (writeDb.prepare(`SELECT id, user_id, status${kind === "promotion" ? ", product_id" : ""}${kind === "loan" ? ", amount" : ""} FROM ${table} WHERE id = ?`).get(id)) as { id: number; user_id: number; status: string; product_id?: number; amount?: number } | undefined;
    if (!row || row.status.toLowerCase() !== "pending") return false;
    const approved = decision === "approve";
    const status = kind === "loan" ? (approved ? "Approved" : "Rejected") : (approved ? "approved" : "rejected");
    await (writeDb.prepare(`UPDATE ${table} SET status = ? WHERE id = ? AND lower(status) = 'pending'`).run(status, id));
    if (kind === "subscription" && approved) {
      await (writeDb.prepare("UPDATE users SET is_subscribed = 1, subscribed_at = datetime('now') WHERE id = ?").run(row.user_id));
    }
    if (kind === "promotion" && approved && row.product_id) {
      await (writeDb.prepare("UPDATE products SET is_promoted = 1, promoted_at = datetime('now') WHERE id = ? AND user_id = ?").run(row.product_id, row.user_id));
    }
    const label = kind === "loan" ? "loan" : kind;
    const message = `Your ${label} request${kind === "loan" ? ` for GHS ${Number(row.amount || 0).toFixed(2)}` : ""} was ${approved ? "approved" : "rejected"} by the admin.`;
    await (writeDb.prepare("INSERT INTO notifications (user_id, message) VALUES (?, ?)").run(row.user_id, message));
    return true;
  });
  const changed = await processDecision();
  revalidatePath("/admin");
  revalidatePath("/marketplace");
  if (!changed) redirect(`/admin?tab=${redirectTab}&error=already_processed`);
  redirect(`/admin?tab=${redirectTab}&updated=1`);
}

export async function updateMarketPriceAction(formData: FormData) {
  const session = await readSession();
  if (!session) redirect("/login?return_to=%2Fadmin%2Fprices");
  const admin = await getUserById(session.userId);
  if (!admin || admin.role !== "admin") redirect("/dashboard");
  const id = Number(formData.get("price_id"));
  const price = Number(formData.get("price"));
  if (!Number.isInteger(id) || id < 1 || !Number.isFinite(price) || price <= 0 || price > 100_000_000) redirect("/admin/prices?error=invalid_price");
  const { writeDb } = await import("@/app/lib/write-db");
  const result = await (writeDb.prepare("UPDATE prices SET price = ? WHERE id = ?").run(price, id));
  revalidatePath("/admin/prices");
  revalidatePath("/marketplace");
  redirect(result.changes ? "/admin/prices?updated=1" : "/admin/prices?error=not_found");
}

export async function createMarketPriceAction(formData:FormData){
  const session=await readSession();if(!session)redirect("/login?return_to=%2Fadmin%2Fprices");const admin=await getUserById(session.userId);if(!admin||admin.role!=="admin")redirect("/dashboard");
  const crop=String(formData.get("crop_name")||"").trim();const market=String(formData.get("market_name")||"").trim();const price=Number(formData.get("price"));
  if(!crop||crop.length>100||!market||market.length>100||!Number.isFinite(price)||price<=0||price>100_000_000)redirect("/admin/prices?error=invalid_entry");
  const {writeDb}=await import("@/app/lib/write-db");await (writeDb.prepare("INSERT INTO prices (crop_name,market_name,price) VALUES (?,?,?)").run(crop,market,price));revalidatePath("/admin/prices");revalidatePath("/prices");redirect("/admin/prices?created=1");
}
