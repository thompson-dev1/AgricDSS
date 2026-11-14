import { redirect } from "next/navigation";
import { submitPromotionPaymentAction } from "@/app/actions/farmer-finance";
import { db } from "@/app/lib/db";
import { getUserById } from "@/app/lib/data/users";
import { readSession } from "@/app/lib/session";
import "./promotions.css";

export const metadata = { title: "Promote Products | AGRIC DSS" };
type Props = { searchParams: Promise<{ error?: string; submitted?: string }> };
type Product = { id: number; product_name: string | null; type: string | null; quantity: number | null; unit: string | null; price: number | null; is_promoted: number | null; pending: number };
export default async function FarmerPromotionsPage({ searchParams }: Props) {
  const session = await readSession(); if (!session) redirect("/login?return_to=%2Ffarmer%2Fpromotions");
  const user = await getUserById(session.userId); if (!user || user.role !== "farmer") redirect("/dashboard");
  const products = await (db.prepare(`SELECT p.id,p.product_name,p.type,p.quantity,p.unit,p.price,p.is_promoted,
    EXISTS(SELECT 1 FROM promotions pr WHERE pr.product_id=p.id AND lower(pr.status)='pending') AS pending
    FROM products p WHERE p.user_id=? ORDER BY p.is_promoted DESC,p.id DESC`).all(user.id)) as Product[];
  const { error, submitted } = await searchParams;
  return <main className="promotions-page"><div className="promotions-wrap"><header><h1><i className="fas fa-star" aria-hidden="true" /> Promote Your Products</h1><p>Boost an eligible listing to the top of the marketplace</p></header>{error && <p className="promotion-notice error" role="alert">{error === "already_promoted_or_pending" ? "This listing is already promoted or has a payment awaiting review." : "Enter a valid payment method and transaction reference."}</p>}{submitted && <p className="promotion-notice success" role="status">Payment details submitted. Your promotion will be active after admin verification.</p>}
    <section className="promotion-price"><span>PROMOTION FEE</span><strong>GHS 20 <small>/ product</small></strong><p>Approved listings stay featured for 30 days.</p></section><h2>Your Products</h2>{products.length ? products.map((product) => <article className={`promotion-product${product.is_promoted ? " promoted" : ""}`} key={product.id}><div className="promotion-product-info"><h3>{product.product_name || product.type || "Farm produce"}{product.is_promoted ? <span className="promotion-badge"><i className="fas fa-star" aria-hidden="true" /> PROMOTED</span> : null}</h3><p>{product.quantity} {product.unit || "units"} · GHS {Number(product.price || 0).toFixed(2)}</p></div>{product.is_promoted ? <span className="promotion-active">Active</span> : product.pending ? <span className="promotion-pending">Payment awaiting review</span> : <details className="promotion-details"><summary>Promote</summary><div className="promotion-form"><p>Submit your payment method and transaction reference for admin verification.</p><form action={submitPromotionPaymentAction}><input type="hidden" name="product_id" value={product.id} /><label>Payment method<select name="payment_method"><option>MTN Mobile Money</option><option>Vodafone Cash</option><option>AirtelTigo Money</option><option>Bank Transfer</option></select></label><label>Transaction reference<input name="payment_ref" placeholder="Reference / transaction ID" maxLength={120} required /></label><button type="submit">Pay GHS 20 & Request Promotion</button></form></div></details>}</article>) : <p className="promotion-empty">You don’t have any products to promote yet. <a href="/farmer/products">Add a listing first</a>.</p>}</div></main>;
}
