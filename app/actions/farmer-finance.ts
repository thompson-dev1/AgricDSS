"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUserById } from "@/app/lib/data/users";
import { readSession } from "@/app/lib/session";

const paymentMethods = new Set(["MTN Mobile Money", "Vodafone Cash", "AirtelTigo Money", "Bank Transfer"]);

export async function submitSubscriptionPaymentAction(formData: FormData) {
  const session = await readSession(); if (!session) redirect("/login?return_to=%2Ffarmer%2Fsubscription");
  const user = await getUserById(session.userId); if (!user || user.role !== "farmer") redirect("/dashboard");
  const method = String(formData.get("payment_method") || ""); const reference = String(formData.get("payment_ref") || "").trim();
  if (!paymentMethods.has(method) || reference.length < 4 || reference.length > 120) redirect("/farmer/subscription?error=invalid_payment");
  const { writeDb } = await import("@/app/lib/write-db");
  const submit = writeDb.transaction(async () => {
    const status = await (writeDb.prepare("SELECT is_subscribed FROM users WHERE id=?").get(user.id)) as { is_subscribed: number } | undefined;
    if (status?.is_subscribed) return false;
    const pending = await (writeDb.prepare("SELECT 1 FROM subscriptions WHERE user_id=? AND lower(status)='pending' LIMIT 1").get(user.id));
    if (pending) return false;
    await (writeDb.prepare("INSERT INTO subscriptions (user_id,amount,payment_method,payment_ref,status) VALUES (?,50,?,?,'pending')").run(user.id, method, reference));
    await (writeDb.prepare("INSERT INTO notifications (user_id,message) VALUES (0,?)").run(`Subscription payment received from ${user.name}. Ref: ${reference}. Review in the admin subscriptions panel.`));
    return true;
  });
  if (!(await submit())) redirect("/farmer/subscription?error=already_active_or_pending");
  revalidatePath("/farmer/subscription"); revalidatePath("/admin"); redirect("/farmer/subscription?submitted=1");
}

export async function submitPromotionPaymentAction(formData: FormData) {
  const session = await readSession(); if (!session) redirect("/login?return_to=%2Ffarmer%2Fpromotions");
  const user = await getUserById(session.userId); if (!user || user.role !== "farmer") redirect("/dashboard");
  const productId = Number(formData.get("product_id")); const method = String(formData.get("payment_method") || ""); const reference = String(formData.get("payment_ref") || "").trim();
  if (!Number.isInteger(productId) || productId < 1 || !paymentMethods.has(method) || reference.length < 4 || reference.length > 120) redirect("/farmer/promotions?error=invalid_payment");
  const { writeDb } = await import("@/app/lib/write-db");
  const submit = writeDb.transaction(async () => {
    const product = await (writeDb.prepare("SELECT product_name,type,is_promoted FROM products WHERE id=? AND user_id=?").get(productId, user.id)) as { product_name: string | null; type: string | null; is_promoted: number | null } | undefined;
    if (!product || product.is_promoted) return false;
    if (await (writeDb.prepare("SELECT 1 FROM promotions WHERE product_id=? AND lower(status)='pending' LIMIT 1").get(productId))) return false;
    await (writeDb.prepare("INSERT INTO promotions (product_id,user_id,amount,payment_method,payment_ref,expires_at,status) VALUES (?,?,20,?,?,datetime('now','+30 days'),'pending')").run(productId, user.id, method, reference));
    await (writeDb.prepare("INSERT INTO notifications (user_id,message) VALUES (0,?)").run(`Promotion payment received from ${user.name} for ${product.product_name || product.type || "a product"}. Ref: ${reference}. Review in the admin promotions panel.`));
    return true;
  });
  if (!(await submit())) redirect("/farmer/promotions?error=already_promoted_or_pending");
  revalidatePath("/farmer/promotions"); revalidatePath("/admin"); redirect("/farmer/promotions?submitted=1");
}
