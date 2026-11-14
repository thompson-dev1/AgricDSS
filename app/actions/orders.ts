"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getOrderableProduct } from "@/app/lib/data/orders";
import { getUserById } from "@/app/lib/data/users";
import { readSession } from "@/app/lib/session";

export async function createOrderAction(formData: FormData) {
  const productId = Number(formData.get("product_id"));
  const quantity = Number(formData.get("quantity"));
  if (!Number.isInteger(productId) || productId < 1 || !Number.isInteger(quantity) || quantity < 1) {
    redirect("/marketplace?error=invalid_quantity");
  }

  const session = await readSession();
  if (!session) redirect(`/login?return_to=${encodeURIComponent("/marketplace")}`);
  const buyer = await getUserById(session.userId);
  if (!buyer || buyer.role !== "buyer") redirect("/marketplace?error=buyer_only");

  const product = await getOrderableProduct(productId);
  if (!product || product.quantity < quantity || product.sellerId === buyer.id) {
    redirect("/marketplace?error=product_unavailable");
  }

  const { writeDb } = await import("@/app/lib/write-db");
  const verificationCode = `TXN-${randomBytes(3).toString("hex").toUpperCase()}`;
  let orderId = 0;
  try {
    const createOrder = writeDb.transaction(async () => {
      const result = await (writeDb
        .prepare(
          `INSERT INTO orders (buyer_id, seller_id, product_id, quantity, total, status, verification_code)
           VALUES (?, ?, ?, ?, ?, 'Pending', ?)`,
        )
        .run(buyer.id, product.sellerId, product.id, quantity, quantity * product.price, verificationCode));
      const id = Number(result.lastInsertRowid);
      const productLabel = product.name.replace(/[<>]/g, "");
      await (writeDb.prepare("INSERT INTO notifications (user_id, message) VALUES (?, ?)")
        .run(product.sellerId, `New order #${id} received: ${productLabel}, quantity ${quantity}. Transaction code: ${verificationCode}.`));
      await (writeDb.prepare("INSERT INTO notifications (user_id, message) VALUES (?, ?)")
        .run(buyer.id, `Your order #${id} for ${productLabel} has been placed. Contact the farmer to arrange delivery and payment.`));
      return id;
    });
    orderId = await createOrder();
  } catch {
    redirect("/marketplace?error=order_failed");
  }

  redirect(`/orders/success?id=${orderId}`);
}

export async function acceptBuyerRequestAction(formData: FormData) {
  const requestId=Number(formData.get("request_id")); const productId=Number(formData.get("product_id")); const quantity=Number(formData.get("quantity"));
  if(!Number.isInteger(requestId)||requestId<1||!Number.isInteger(productId)||productId<1||!Number.isInteger(quantity)||quantity<1) redirect("/farmer/requests?error=invalid");
  const session=await readSession(); if(!session) redirect("/login?return_to=%2Ffarmer%2Frequests");
  const farmer=await getUserById(session.userId); if(!farmer||farmer.role!=="farmer") redirect("/dashboard");
  const {writeDb}=await import("@/app/lib/write-db"); let orderId=0;
  const accept=writeDb.transaction(async ()=>{
    const request=await (writeDb.prepare("SELECT id,buyer_id,product_type,product_name,min_quantity,max_quantity,min_price,max_price,unit,status FROM buy_requests WHERE id=?").get(requestId)) as {id:number;buyer_id:number;product_type:string;product_name:string;min_quantity:number;max_quantity:number;min_price:number|null;max_price:number|null;unit:string;status:string}|undefined;
    const product=await (writeDb.prepare("SELECT id,user_id,product_name,type,quantity,unit,price FROM products WHERE id=?").get(productId)) as {id:number;user_id:number;product_name:string|null;type:string|null;quantity:number;unit:string|null;price:number|null}|undefined;
    if(!request||request.status.toLowerCase()!=="open"||!product||product.user_id!==farmer.id||product.quantity<quantity||quantity<request.min_quantity||quantity>request.max_quantity) return false;
    if(request.unit&&product.unit&&request.unit.toLowerCase()!==product.unit.toLowerCase()) return false;
    const item=(product.product_name||product.type||"").trim().toLowerCase(); const type=(product.type||"").trim().toLowerCase();
    if(item!==request.product_name.trim().toLowerCase()&&type!==request.product_type.trim().toLowerCase()) return false;
    let price=Number(product.price||0); if(price<=0) price=Number(request.max_price||request.min_price||0); if(price<=0) return false;
    const code=`TXN-${randomBytes(3).toString("hex").toUpperCase()}`;
    const created=await (writeDb.prepare("INSERT INTO orders (buyer_id,seller_id,product_id,quantity,total,status,verification_code) VALUES (?,?,?,?,?,'Pending',?)").run(request.buyer_id,farmer.id,product.id,quantity,quantity*price,code));
    orderId=Number(created.lastInsertRowid);
    const label=(product.product_name||product.type||"farm produce").replace(/[<>]/g,"");
    const changed=await (writeDb.prepare("UPDATE buy_requests SET status='matched' WHERE id=? AND lower(status)='open'").run(requestId));
    if(!changed.changes) throw new Error("Request already handled");
    await (writeDb.prepare("INSERT INTO notifications (user_id,message) VALUES (?,?)").run(request.buyer_id,`A farmer accepted your request for ${label}. Order #${orderId} is pending verification. Code: ${code}`));
    await (writeDb.prepare("INSERT INTO notifications (user_id,message) VALUES (?,?)").run(farmer.id,`Sale request sent to buyer for ${label}. Order #${orderId} is now pending verification.`));
    return true;
  });
  let accepted=false; try { accepted=await accept(); } catch { redirect(`/farmer/requests?error=handled`); }
  if(!accepted) redirect(`/farmer/requests?error=not_match`);
  revalidatePath("/farmer/requests"); revalidatePath("/buyer/requests"); revalidatePath("/orders"); revalidatePath("/admin");
  redirect(`/orders/success?id=${orderId}`);
}

export async function confirmTransactionCodeAction(formData: FormData) {
  const orderId = Number(formData.get("order_id"));
  const enteredCode = String(formData.get("verification_code") ?? "").trim().toUpperCase();
  if (!Number.isInteger(orderId) || orderId < 1 || !/^TXN-[A-F0-9]{6}$/.test(enteredCode)) {
    redirect("/orders?error=invalid_code");
  }

  const session = await readSession();
  if (!session) redirect("/login?return_to=%2Forders");
  const user = await getUserById(session.userId);
  if (!user || !["buyer", "farmer"].includes(user.role)) redirect("/dashboard");

  const { writeDb } = await import("@/app/lib/write-db");
  const order = await (writeDb.prepare(
    "SELECT id, buyer_id, seller_id, status, verification_code, buyer_confirmed, seller_confirmed FROM orders WHERE id = ? LIMIT 1",
  ).get(orderId)) as { id: number; buyer_id: number; seller_id: number; status: string; verification_code: string; buyer_confirmed: number; seller_confirmed: number } | undefined;
  const isBuyer = user.role === "buyer" && order?.buyer_id === user.id;
  const isSeller = user.role === "farmer" && order?.seller_id === user.id;
  if (!order || (!isBuyer && !isSeller)) redirect("/orders?error=not_found");
  if (order.verification_code !== enteredCode) redirect("/orders?error=invalid_code");
  if (order.status === "Completed") redirect("/orders?updated=1");

  const confirmOrder = writeDb.transaction(async () => {
    if (isBuyer) {
      await (writeDb.prepare("UPDATE orders SET buyer_confirmed = 1, buyer_confirmed_at = datetime('now') WHERE id = ? AND buyer_id = ?")
        .run(orderId, user.id));
    } else {
      await (writeDb.prepare("UPDATE orders SET seller_confirmed = 1, seller_confirmed_at = datetime('now') WHERE id = ? AND seller_id = ?")
        .run(orderId, user.id));
    }
    const updated = await (writeDb.prepare("SELECT buyer_confirmed, seller_confirmed, buyer_id, seller_id FROM orders WHERE id = ?")
      .get(orderId)) as { buyer_confirmed: number; seller_confirmed: number; buyer_id: number; seller_id: number };
    if (updated.buyer_confirmed && updated.seller_confirmed) {
      await (writeDb.prepare("UPDATE orders SET status = 'Completed' WHERE id = ?").run(orderId));
      await (writeDb.prepare("INSERT INTO notifications (user_id, message) VALUES (?, ?)")
        .run(updated.buyer_id, `Order #${orderId} is complete. Both parties confirmed the transaction.`));
      await (writeDb.prepare("INSERT INTO notifications (user_id, message) VALUES (?, ?)")
        .run(updated.seller_id, `Order #${orderId} is complete. Both parties confirmed the transaction.`));
    }
  });
  await confirmOrder();
  redirect("/orders?updated=1");
}
