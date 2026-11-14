"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUserById } from "@/app/lib/data/users";
import { readSession } from "@/app/lib/session";

const categories = new Set(["Grains & Cereals", "Tubers & Roots", "Legumes & Nuts", "Vegetables", "Fruits", "Cattle", "Poultry", "Goats & Sheep", "Pigs", "Other Animals", "Fish", "Crabs & Shellfish", "Other Seafood", "Dairy Products", "Processed Foods", "Oils & Fats", "Spices & Herbs", "Animal Feed", "Seeds & Seedlings", "Other"]);
const units = new Set(["kg", "bags", "tons", "crates", "boxes", "pieces"]);

export async function createBuyRequestAction(formData: FormData) {
  const session = await readSession(); if (!session) redirect("/login?return_to=%2Fbuyer%2Frequests");
  const user = await getUserById(session.userId); if (!user || user.role !== "buyer") redirect("/dashboard");
  const type = String(formData.get("product_type") || "").trim(); const name = String(formData.get("product_name") || "").trim();
  const minQty = Number(formData.get("min_quantity")); const maxQty = Number(formData.get("max_quantity"));
  const unit = String(formData.get("unit") || "kg"); const minPrice = Number(formData.get("min_price") || 0); const maxPrice = Number(formData.get("max_price") || 0); const notes = String(formData.get("notes") || "").trim();
  if (!categories.has(type) || !name || name.length > 120 || !Number.isInteger(minQty) || minQty < 1 || !Number.isInteger(maxQty) || maxQty < minQty || maxQty > 1_000_000 || !units.has(unit) || !Number.isFinite(minPrice) || minPrice < 0 || !Number.isFinite(maxPrice) || maxPrice < 0 || (maxPrice > 0 && minPrice > maxPrice) || notes.length > 1000) redirect("/buyer/requests?error=invalid_request");
  const { writeDb } = await import("@/app/lib/write-db");
  await (writeDb.prepare(`INSERT INTO buy_requests (buyer_id,product_type,product_name,min_quantity,max_quantity,unit,min_price,max_price,notes,status) VALUES (?,?,?,?,?,?,?,?,?,'open')`)
    .run(user.id, type, name, minQty, maxQty, unit, minPrice, maxPrice, notes));
  revalidatePath("/buyer/requests"); revalidatePath("/farmer/requests");
  redirect("/buyer/requests?posted=1");
}

export async function deleteBuyRequestAction(formData: FormData) {
  const session = await readSession(); if (!session) redirect("/login?return_to=%2Fbuyer%2Frequests");
  const user = await getUserById(session.userId); if (!user || user.role !== "buyer") redirect("/dashboard");
  const id = Number(formData.get("request_id")); if (!Number.isInteger(id) || id < 1) redirect("/buyer/requests");
  const { writeDb } = await import("@/app/lib/write-db");
  await (writeDb.prepare("DELETE FROM buy_requests WHERE id=? AND buyer_id=?").run(id, user.id));
  revalidatePath("/buyer/requests"); revalidatePath("/farmer/requests"); redirect("/buyer/requests?deleted=1");
}
