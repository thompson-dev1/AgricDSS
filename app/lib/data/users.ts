import "server-only";

import { db } from "@/app/lib/db";

export type AppRole = "farmer" | "buyer" | "admin";

export type AppUser = {
  id: number;
  name: string;
  email: string;
  role: AppRole;
  password: string;
  isVerified: boolean;
  hasPendingVerification: boolean;
};

export type MarketplaceProduct = {
  id: number;
  productName: string | null;
  type: string | null;
  quantity: number | null;
  unit: string | null;
  price: number | null;
  image: string | null;
  isPromoted: boolean;
  farmerId: number | null;
  farmerName: string | null;
  location: string | null;
};

export type DashboardData = {
  name: string;
  role: AppRole;
  email: string;
  phone: string;
  location: string;
  productCount: number;
  pendingOrders: number;
  completedOrders: number;
  totalValue: number;
  connectedFarmers: number;
};

type UserRow = {
  id: number;
  name: string | null;
  email: string | null;
  role: string | null;
  password: string | null;
  is_verified: number | null;
  otp: string | null;
};

function toAppUser(row: UserRow | undefined): AppUser | null {
  if (!row || !row.id || !row.email || !row.role || !row.password) return null;
  return {
    id: row.id,
    name: row.name || "User",
    email: row.email,
    role: row.role as AppRole,
    password: row.password,
    isVerified: row.is_verified === 1,
    hasPendingVerification: Boolean(row.otp?.startsWith("{")),
  };
}

export async function getUserByEmail(email: string): Promise<AppUser | null> {
  const row = await (db
    .prepare(
      `SELECT id, name, email, role, password, is_verified, otp
       FROM users
       WHERE lower(email) = lower(?)
       LIMIT 1`,
    )
    .get(email)) as UserRow | undefined;

  return toAppUser(row);
}

export async function getUserById(id: number): Promise<AppUser | null> {
  const row = await (db
    .prepare(
      `SELECT id, name, email, role, password, is_verified, otp
       FROM users
       WHERE id = ?
       LIMIT 1`,
    )
    .get(id)) as UserRow | undefined;

  return toAppUser(row);
}

export async function getPendingEmailById(id: number): Promise<string | null> {
  const row = await (db
    .prepare("SELECT email FROM users WHERE id = ? AND is_verified = 0 LIMIT 1")
    .get(id)) as { email: string | null } | undefined;
  return row?.email || null;
}

export async function searchMarketplaceProducts(search: string): Promise<MarketplaceProduct[]> {
  const searchPattern = `%${search}%`;
  const rows = await (db
    .prepare(
      `SELECT p.id, p.product_name, p.type, p.quantity, p.unit, p.price, p.image,
              COALESCE(p.is_promoted, 0) AS is_promoted, p.user_id AS farmer_id,
              u.name AS farmer_name, u.location
       FROM products p
       LEFT JOIN users u ON p.user_id = u.id
       WHERE (? = '' OR p.product_name LIKE ? OR p.name LIKE ? OR p.type LIKE ?
              OR u.name LIKE ? OR u.location LIKE ?)
       ORDER BY COALESCE(p.is_promoted, 0) DESC, p.id DESC
       LIMIT 100`,
    )
    .all(search, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern)) as Array<{
    id: number;
    product_name: string | null;
    type: string | null;
    quantity: number | null;
    unit: string | null;
    price: number | null;
    image: string | null;
    is_promoted: number;
    farmer_id: number | null;
    farmer_name: string | null;
    location: string | null;
  }>;

  return rows.map((row) => ({
    id: row.id,
    productName: row.product_name,
    type: row.type,
    quantity: row.quantity,
    unit: row.unit,
    price: row.price,
    image: row.image,
    isPromoted: row.is_promoted === 1,
    farmerId: row.farmer_id,
    farmerName: row.farmer_name,
    location: row.location,
  }));
}

export async function getDashboardData(userId: number): Promise<DashboardData | null> {
  const userRow = await (db
    .prepare("SELECT id, name, email, phone, location, role FROM users WHERE id = ? LIMIT 1")
    .get(userId)) as { id: number; name: string | null; email: string | null; phone: string | null; location: string | null; role: string | null } | undefined;
  if (!userRow || !userRow.role || !["farmer", "buyer", "admin"].includes(userRow.role)) return null;

  const isFarmer = userRow.role === "farmer";
  const orderOwnerColumn = isFarmer ? "seller_id" : "buyer_id";
  const productCount = isFarmer
    ? Number((await (db.prepare("SELECT COUNT(*) AS total FROM products WHERE user_id = ?").get(userId)) as { total: number }).total)
    : 0;
  const pendingOrders = Number(
    (await (db.prepare(`SELECT COUNT(*) AS total FROM orders WHERE ${orderOwnerColumn} = ? AND status = 'Pending'`).get(userId)) as { total: number }).total,
  );
  const completedOrders = Number(
    (await (db.prepare(`SELECT COUNT(*) AS total FROM orders WHERE ${orderOwnerColumn} = ? AND status = 'Completed'`).get(userId)) as { total: number }).total,
  );
  const totalValue = Number(
    (await (db.prepare(`SELECT COALESCE(SUM(total), 0) AS total FROM orders WHERE ${orderOwnerColumn} = ? AND status = 'Completed'`).get(userId)) as { total: number }).total,
  );
  const connectedFarmers = isFarmer
    ? 0
    : Number((await (db.prepare("SELECT COUNT(DISTINCT seller_id) AS total FROM orders WHERE buyer_id = ?").get(userId)) as { total: number }).total);

  return {
    name: userRow.name || (isFarmer ? "Farmer" : "Buyer"),
    role: userRow.role as AppRole,
    email: userRow.email || "No email",
    phone: userRow.phone || "No phone",
    location: userRow.location || "Location not set",
    productCount,
    pendingOrders,
    completedOrders,
    totalValue,
    connectedFarmers,
  };
}
