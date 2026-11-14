import "server-only";
import { db } from "@/app/lib/db";

export type BuyRequest = { id: number; buyerId: number; buyerName: string; productType: string; productName: string; minQuantity: number; maxQuantity: number; unit: string; minPrice: number; maxPrice: number; notes: string; status: string; createdAt: string | null };
export async function getBuyerRequests(buyerId: number): Promise<BuyRequest[]> {
  const rows = await (db.prepare("SELECT br.*,u.name AS buyer_name FROM buy_requests br LEFT JOIN users u ON u.id=br.buyer_id WHERE br.buyer_id=? ORDER BY br.created_at DESC,br.id DESC")
    .all(buyerId)) as Array<{ id: number; buyer_id: number; buyer_name: string | null; product_type: string; product_name: string; min_quantity: number; max_quantity: number; unit: string; min_price: number | null; max_price: number | null; notes: string | null; status: string; created_at: string | null }>;
  return rows.map((row) => ({ id: row.id, buyerId: row.buyer_id, buyerName: row.buyer_name || "Buyer", productType: row.product_type, productName: row.product_name, minQuantity: row.min_quantity, maxQuantity: row.max_quantity, unit: row.unit, minPrice: Number(row.min_price || 0), maxPrice: Number(row.max_price || 0), notes: row.notes || "", status: row.status || "open", createdAt: row.created_at }));
}
export async function getOpenBuyerRequests(): Promise<BuyRequest[]> {
  const rows = await (db.prepare("SELECT br.*,u.name AS buyer_name FROM buy_requests br LEFT JOIN users u ON u.id=br.buyer_id WHERE lower(br.status)='open' ORDER BY br.created_at DESC,br.id DESC LIMIT 100")
    .all()) as Array<{ id: number; buyer_id: number; buyer_name: string | null; product_type: string; product_name: string; min_quantity: number; max_quantity: number; unit: string; min_price: number | null; max_price: number | null; notes: string | null; status: string; created_at: string | null }>;
  return rows.map((row) => ({ id: row.id, buyerId: row.buyer_id, buyerName: row.buyer_name || "Buyer", productType: row.product_type, productName: row.product_name, minQuantity: row.min_quantity, maxQuantity: row.max_quantity, unit: row.unit, minPrice: Number(row.min_price || 0), maxPrice: Number(row.max_price || 0), notes: row.notes || "", status: row.status || "open", createdAt: row.created_at }));
}
