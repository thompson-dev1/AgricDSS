import "server-only";

import { db } from "@/app/lib/db";

export type OrderableProduct = {
  id: number;
  name: string;
  type: string;
  quantity: number;
  unit: string;
  price: number;
  sellerId: number;
  sellerName: string;
  sellerPhone: string;
  location: string;
};

export type OrderHistoryItem = {
  id: number;
  productName: string;
  quantity: number;
  unit: string;
  total: number;
  status: string;
  verificationCode: string;
  buyerConfirmed: boolean;
  sellerConfirmed: boolean;
  createdAt: string | null;
  buyerName: string;
  sellerName: string;
  myFeedbackRating: number | null;
  myFeedbackReport: string;
  myFeedbackComment: string;
  targetRatingAvg: number | null;
  targetReportCount: number;
};

export async function getOrderableProduct(productId: number): Promise<OrderableProduct | null> {
  const row = await (db.prepare(
    `SELECT p.id, COALESCE(NULLIF(p.product_name, ''), p.type, p.name, 'Farm produce') AS product_name,
            p.type, p.quantity, p.unit, p.price, p.user_id AS seller_id,
            u.name AS seller_name, u.phone AS seller_phone, u.location
     FROM products p
     JOIN users u ON u.id = p.user_id
     WHERE p.id = ?
     LIMIT 1`,
  ).get(productId)) as {
    id: number; product_name: string | null; type: string | null; quantity: number | null;
    unit: string | null; price: number | null; seller_id: number; seller_name: string | null;
    seller_phone: string | null; location: string | null;
  } | undefined;

  if (!row) return null;
  return {
    id: row.id,
    name: row.product_name || row.type || "Farm produce",
    type: row.type || row.product_name || "Farm produce",
    quantity: Number(row.quantity || 0),
    unit: row.unit || "units",
    price: Number(row.price || 0),
    sellerId: row.seller_id,
    sellerName: row.seller_name || "Unknown Farmer",
    sellerPhone: row.seller_phone || "No phone",
    location: row.location || "No location",
  };
}

export async function getOrderHistory(userId: number, role: "buyer" | "farmer"): Promise<OrderHistoryItem[]> {
  const ownerColumn = role === "buyer" ? "o.buyer_id" : "o.seller_id";
  const feedbackTarget = role === "buyer" ? "COALESCE(NULLIF(o.seller_id, 0), p.user_id)" : "o.buyer_id";
  const rows = await (db.prepare(
    `SELECT o.id, o.quantity, o.total, o.status, o.verification_code,
            o.buyer_confirmed, o.seller_confirmed, o.created_at,
            COALESCE(NULLIF(p.product_name, ''), p.type, p.name, 'Farm produce') AS product_name,
            p.unit, buyer.name AS buyer_name, seller.name AS seller_name,
            my_feedback.rating AS my_feedback_rating, my_feedback.report_reason AS my_feedback_report,
            my_feedback.comment AS my_feedback_comment, target_feedback.avg_rating AS target_rating_avg,
            target_feedback.report_count AS target_report_count
     FROM orders o
     LEFT JOIN products p ON p.id = o.product_id
     LEFT JOIN users buyer ON buyer.id = o.buyer_id
     LEFT JOIN users seller ON seller.id = o.seller_id
     LEFT JOIN peer_feedback my_feedback ON my_feedback.order_id = o.id AND my_feedback.reviewer_id = ?
     LEFT JOIN (SELECT reviewed_id, AVG(rating) AS avg_rating, SUM(CASE WHEN report_reason != '' THEN 1 ELSE 0 END) AS report_count FROM peer_feedback GROUP BY reviewed_id) target_feedback
       ON target_feedback.reviewed_id = ${feedbackTarget}
     WHERE ${ownerColumn} = ?
     ORDER BY o.id DESC
     LIMIT 100`,
  ).all(userId, userId)) as Array<{
    id: number; quantity: number | null; total: number | null; status: string | null;
    verification_code: string | null; buyer_confirmed: number | null; seller_confirmed: number | null;
    created_at: string | null; product_name: string | null; unit: string | null;
    buyer_name: string | null; seller_name: string | null;
    my_feedback_rating: number | null; my_feedback_report: string | null; my_feedback_comment: string | null;
    target_rating_avg: number | null; target_report_count: number | null;
  }>;

  return rows.map((row) => ({
    id: row.id,
    productName: row.product_name || "Farm produce",
    quantity: Number(row.quantity || 0),
    unit: row.unit || "units",
    total: Number(row.total || 0),
    status: row.status || "Pending",
    verificationCode: row.verification_code || "",
    buyerConfirmed: row.buyer_confirmed === 1,
    sellerConfirmed: row.seller_confirmed === 1,
    createdAt: row.created_at,
    buyerName: row.buyer_name || "Buyer",
    sellerName: row.seller_name || "Farmer",
    myFeedbackRating: row.my_feedback_rating === null ? null : Number(row.my_feedback_rating),
    myFeedbackReport: row.my_feedback_report || "",
    myFeedbackComment: row.my_feedback_comment || "",
    targetRatingAvg: row.target_rating_avg === null ? null : Number(row.target_rating_avg),
    targetReportCount: Number(row.target_report_count || 0),
  }));
}

export async function getBuyerOrder(orderId: number, buyerId: number): Promise<(OrderHistoryItem & { sellerPhone: string }) | null> {
  const row = await (db.prepare(
    `SELECT o.id, o.quantity, o.total, o.status, o.verification_code,
            o.buyer_confirmed, o.seller_confirmed, o.created_at,
            COALESCE(NULLIF(p.product_name, ''), p.type, p.name, 'Farm produce') AS product_name,
            p.unit, buyer.name AS buyer_name, seller.name AS seller_name, seller.phone AS seller_phone
     FROM orders o
     LEFT JOIN products p ON p.id = o.product_id
     LEFT JOIN users buyer ON buyer.id = o.buyer_id
     LEFT JOIN users seller ON seller.id = o.seller_id
     WHERE o.id = ? AND o.buyer_id = ?
     LIMIT 1`,
  ).get(orderId, buyerId)) as {
    id: number; quantity: number | null; total: number | null; status: string | null;
    verification_code: string | null; buyer_confirmed: number | null; seller_confirmed: number | null;
    created_at: string | null; product_name: string | null; unit: string | null;
    buyer_name: string | null; seller_name: string | null; seller_phone: string | null;
  } | undefined;
  if (!row) return null;
  return {
    id: row.id,
    productName: row.product_name || "Farm produce",
    quantity: Number(row.quantity || 0),
    unit: row.unit || "units",
    total: Number(row.total || 0),
    status: row.status || "Pending",
    verificationCode: row.verification_code || "",
    buyerConfirmed: row.buyer_confirmed === 1,
    sellerConfirmed: row.seller_confirmed === 1,
    createdAt: row.created_at,
    buyerName: row.buyer_name || "Buyer",
    sellerName: row.seller_name || "Farmer",
    myFeedbackRating: null,
    myFeedbackReport: "",
    myFeedbackComment: "",
    targetRatingAvg: null,
    targetReportCount: 0,
    sellerPhone: row.seller_phone || "No phone",
  };
}
