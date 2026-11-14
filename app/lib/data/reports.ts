import "server-only";

import { db } from "@/app/lib/db";

export type SaleReportRow = { id: number; product: string; quantity: number; total: number; date: string; market: string };

export async function getFarmerSalesReport(farmerId: number) {
  const rows = await (db.prepare(
    `SELECT s.id, s.quantity, s.total_price, COALESCE(s.date,s.created_at) AS sale_date,
            COALESCE(NULLIF(p.product_name,''),p.name,p.type,'Farm produce') AS product,
            '—' AS market
     FROM sales s LEFT JOIN products p ON p.id=s.product_id
     WHERE s.farmer_id=? ORDER BY COALESCE(s.date,s.created_at) DESC,s.id DESC LIMIT 500`,
  ).all(farmerId)) as Array<{id:number;quantity:number|null;total_price:number|null;sale_date:string|null;product:string|null;market:string|null}>;
  const sales: SaleReportRow[] = rows.map((r) => ({ id:r.id, product:r.product||"Farm produce", quantity:Number(r.quantity||0), total:Number(r.total_price||0), date:r.sale_date||"", market:r.market||"—" }));
  return { sales, revenue: sales.reduce((sum, row) => sum + row.total, 0), quantity: sales.reduce((sum, row) => sum + row.quantity, 0) };
}

export async function getMarketPriceRows() {
  return await (db.prepare("SELECT id,crop_name,market_name,price FROM prices ORDER BY crop_name,market_name").all()) as Array<{id:number;crop_name:string;market_name:string;price:number}>;
}
