import "server-only";

import { db } from "@/app/lib/db";

export type InventoryProduct = {
  id: number;
  name: string;
  type: string;
  quantity: number;
  unit: string;
  unitWeight: number | null;
  weightUnit: string;
  price: number;
  image: string | null;
};

export async function getFarmerInventory(userId: number): Promise<InventoryProduct[]> {
  const rows = await (db.prepare(
    `SELECT id, product_name, type, quantity, unit, unit_weight, weight_unit, price, image
     FROM products WHERE user_id = ? ORDER BY id DESC`,
  ).all(userId)) as Array<{
    id: number; product_name: string | null; type: string | null; quantity: number | null;
    unit: string | null; unit_weight: number | null; weight_unit: string | null;
    price: number | null; image: string | null;
  }>;
  return rows.map((row) => ({
    id: row.id,
    name: row.product_name || "Unnamed product",
    type: row.type || "Other",
    quantity: Number(row.quantity || 0),
    unit: row.unit || "kg",
    unitWeight: row.unit_weight ? Number(row.unit_weight) : null,
    weightUnit: row.weight_unit || "kg",
    price: Number(row.price || 0),
    image: row.image,
  }));
}
