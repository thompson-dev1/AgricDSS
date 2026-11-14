"use server";

import { randomUUID } from "node:crypto";
import { savePublicUpload } from "@/app/lib/uploads";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUserById } from "@/app/lib/data/users";
import { readSession } from "@/app/lib/session";

const allowedTypes = new Set([
  "Grains & Cereals", "Tubers & Roots", "Legumes & Nuts", "Vegetables", "Fruits", "Cattle", "Poultry",
  "Goats & Sheep", "Pigs", "Other Animals", "Fish", "Crabs & Shellfish", "Other Seafood", "Dairy Products",
  "Processed Foods", "Oils & Fats", "Spices & Herbs", "Animal Feed", "Seeds & Seedlings", "Other",
]);
const allowedUnits = new Set(["kg", "bags", "tons", "crates", "boxes", "bunches", "liters", "pieces"]);

async function farmerId() {
  const session = await readSession();
  if (!session) redirect("/login?return_to=%2Ffarmer%2Fproducts");
  const user = await getUserById(session.userId);
  if (!user || user.role !== "farmer") redirect("/dashboard");
  return user.id;
}

function imageExtension(bytes: Buffer): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return ".jpg";
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return ".png";
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return ".webp";
  return null;
}

export async function addInventoryProductAction(formData: FormData) {
  const userId = await farmerId();
  const type = String(formData.get("type") ?? "").trim();
  const name = String(formData.get("product_name") ?? "").trim();
  const quantity = Number(formData.get("quantity"));
  const unit = String(formData.get("unit") ?? "");
  const unitWeight = Number(formData.get("unit_weight") || 0);
  const weightUnit = String(formData.get("weight_unit") || "kg");
  const price = Number(formData.get("price"));
  if (!allowedTypes.has(type) || !name || name.length > 120 || !Number.isFinite(quantity) || quantity <= 0 || quantity > 1_000_000 || !allowedUnits.has(unit) || !Number.isFinite(unitWeight) || unitWeight < 0 || unitWeight > 1_000_000 || !["kg", "g", "lbs"].includes(weightUnit) || !Number.isFinite(price) || price <= 0 || price > 100_000_000) {
    redirect("/farmer/products?error=invalid_product");
  }

  let imageName = "default_product.jpg";
  const image = formData.get("image");
  if (image instanceof File && image.size > 0) {
    if (image.size > 2_000_000) redirect("/farmer/products?error=image_too_large");
    const bytes = Buffer.from(await image.arrayBuffer());
    const extension = imageExtension(bytes);
    if (!extension) redirect("/farmer/products?error=invalid_image");
    imageName = `${randomUUID()}${extension}`;
    const contentType = extension === ".jpg" ? "image/jpeg" : extension === ".png" ? "image/png" : "image/webp";
    await savePublicUpload(`uploads/${imageName}`, bytes, contentType);
  }

  const { writeDb } = await import("@/app/lib/write-db");
  await (writeDb.prepare(
    `INSERT INTO products (user_id, product_name, type, quantity, unit, unit_weight, weight_unit, price, image, description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '')`,
  ).run(userId, name, type, quantity, unit, unitWeight, weightUnit, price, imageName));
  revalidatePath("/farmer/products");
  revalidatePath("/marketplace");
  revalidatePath("/dashboard");
  redirect("/farmer/products?added=1");
}

export async function sellInventoryProductAction(formData: FormData) {
  const userId = await farmerId();
  const productId = Number(formData.get("product_id"));
  const sellQuantity = Number(formData.get("sell_qty"));
  if (!Number.isInteger(productId) || productId < 1 || !Number.isFinite(sellQuantity) || sellQuantity <= 0) {
    redirect("/farmer/products?error=invalid_quantity");
  }
  const { writeDb } = await import("@/app/lib/write-db");
  const result = await (writeDb.prepare(
    `UPDATE products SET quantity = quantity - ?
     WHERE id = ? AND user_id = ? AND quantity >= ?`,
  ).run(sellQuantity, productId, userId, sellQuantity));
  revalidatePath("/farmer/products");
  revalidatePath("/marketplace");
  revalidatePath("/dashboard");
  redirect(result.changes ? "/farmer/products?sold=1" : "/farmer/products?error=not_enough_stock");
}
