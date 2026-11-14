"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUserById } from "@/app/lib/data/users";
import { readSession } from "@/app/lib/session";

const buyerReports = new Set(["Poor quality of products", "Wrong product delivered", "Damaged or spoiled products", "Late delivery", "Seller did not respond", "False listing", "Other"]);
const farmerReports = new Set(["No payment received", "Late payment", "Buyer did not confirm", "Buyer did not show up", "Abusive behavior", "Fake order", "Other"]);

export async function submitFeedbackAction(formData: FormData) {
  const session = await readSession();
  if (!session) redirect("/login?return_to=%2Forders");
  const user = await getUserById(session.userId);
  if (!user || !["buyer", "farmer"].includes(user.role)) redirect("/dashboard");
  const orderId = Number(formData.get("order_id"));
  const ratingRaw = String(formData.get("rating") || "");
  const rating = ratingRaw ? Number(ratingRaw) : null;
  const reportReason = String(formData.get("report_reason") || "").trim();
  const comment = String(formData.get("comment") || "").trim().slice(0, 500);
  if (!Number.isInteger(orderId) || orderId < 1 || (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5))) redirect("/orders?feedback=invalid");
  const { writeDb } = await import("@/app/lib/write-db");
  const order = await (writeDb.prepare(`SELECT o.id,o.buyer_id,o.seller_id,o.status,o.product_id,p.product_name,p.type,p.user_id AS product_owner_id
    FROM orders o LEFT JOIN products p ON p.id=o.product_id WHERE o.id=? LIMIT 1`).get(orderId)) as {
      id: number; buyer_id: number; seller_id: number | null; status: string; product_id: number;
      product_name: string | null; type: string | null; product_owner_id: number | null;
    } | undefined;
  if (!order) redirect("/orders?feedback=not_found");
  const sellerId = order.seller_id || order.product_owner_id || 0;
  const reviewerRole = user.role as "buyer" | "farmer";
  const targetId = user.id === order.buyer_id ? sellerId : user.id === sellerId ? order.buyer_id : 0;
  if (!targetId || targetId === user.id) redirect("/orders?feedback=not_allowed");
  const completed = order.status.toLowerCase() === "completed";
  if (rating !== null && !completed) redirect("/orders?feedback=rating_locked");
  if (completed && rating === null) redirect("/orders?feedback=rating_required");
  const reports = reviewerRole === "buyer" ? buyerReports : farmerReports;
  if (!completed && !reportReason) redirect("/orders?feedback=report_required");
  if (reportReason && !reports.has(reportReason)) redirect("/orders?feedback=invalid_report");

  const save = writeDb.transaction(async () => {
    const existing = await (writeDb.prepare("SELECT rating,report_reason,comment FROM peer_feedback WHERE order_id=? AND reviewer_id=?")
      .get(orderId, user.id)) as { rating: number | null; report_reason: string | null; comment: string | null } | undefined;
    const finalRating = rating ?? existing?.rating ?? null;
    const finalReport = reportReason || existing?.report_reason || "";
    const finalComment = comment || existing?.comment || "";
    if (existing) {
      await (writeDb.prepare(`UPDATE peer_feedback SET reviewed_id=?, reviewer_role=?, rating=?, report_reason=?, comment=?, updated_at=datetime('now') WHERE order_id=? AND reviewer_id=?`)
        .run(targetId, reviewerRole, finalRating, finalReport, finalComment, orderId, user.id));
    } else {
      await (writeDb.prepare(`INSERT INTO peer_feedback (order_id,reviewer_id,reviewed_id,reviewer_role,rating,report_reason,comment) VALUES (?,?,?,?,?,?,?)`)
        .run(orderId, user.id, targetId, reviewerRole, finalRating, finalReport, finalComment));
    }
    if (finalReport && !existing?.report_reason) await (writeDb.prepare("UPDATE users SET fraud_reports=COALESCE(fraud_reports,0)+1 WHERE id=?").run(targetId));
    const productName = order.product_name || order.type || "an order";
    const message = `${reportReason ? "You received a report" : "You received a rating"} on order #${orderId} for ${productName}.`;
    await (writeDb.prepare("INSERT INTO notifications (user_id,message) VALUES (?,?)").run(targetId, message));
  });
  await save();
  revalidatePath("/orders");
  revalidatePath("/admin");
  redirect("/orders?feedback=saved");
}
