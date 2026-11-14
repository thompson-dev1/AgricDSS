import { redirect } from "next/navigation";
import { createBuyRequestAction, deleteBuyRequestAction } from "@/app/actions/buy-requests";
import { getBuyerRequests } from "@/app/lib/data/buy-requests";
import { getUserById } from "@/app/lib/data/users";
import { readSession } from "@/app/lib/session";
import "./requests.css";

export const metadata = { title: "Post a Buy Request | AGRIC DSS" };
type Props = { searchParams: Promise<{ error?: string; posted?: string; deleted?: string }> };
const categories = ["Grains & Cereals", "Tubers & Roots", "Legumes & Nuts", "Vegetables", "Fruits", "Cattle", "Poultry", "Goats & Sheep", "Pigs", "Other Animals", "Fish", "Crabs & Shellfish", "Other Seafood", "Dairy Products", "Processed Foods", "Oils & Fats", "Spices & Herbs", "Animal Feed", "Seeds & Seedlings", "Other"];
const cash = (n: number) => new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(n);

export default async function BuyerRequestsPage({ searchParams }: Props) {
  const session = await readSession(); if (!session) redirect("/login?return_to=%2Fbuyer%2Frequests");
  const user = await getUserById(session.userId); if (!user || user.role !== "buyer") redirect("/dashboard");
  const { error, posted, deleted } = await searchParams; const requests = await getBuyerRequests(user.id);
  return <main className="buy-requests-page"><div className="buy-requests-wrap"><header><h1><i className="fas fa-bullhorn" aria-hidden="true" /> Post a Buy Request</h1><p>Tell farmers exactly what you’re looking for. They can match products to your needs.</p></header>
    {error && <p className="buy-request-alert error" role="alert">Check the category, product, quantity range, and optional budget.</p>}{posted && <p className="buy-request-alert success" role="status">Your buy request has been posted for farmers to see.</p>}{deleted && <p className="buy-request-alert success" role="status">Request removed successfully.</p>}
    <section className="buy-request-form-card"><form action={createBuyRequestAction} className="buy-request-grid"><label>Product Category *<select name="product_type" defaultValue="" required><option value="" disabled>Select category</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label>Specific Product Name *<input name="product_name" placeholder="e.g. Onions, Maize" maxLength={120} required /></label>
      <div className="buy-request-row"><label>Minimum quantity *<input name="min_quantity" type="number" min="1" defaultValue="1" required /></label><label>Maximum quantity *<input name="max_quantity" type="number" min="1" defaultValue="100" required /></label></div>
      <div className="buy-request-row budget-row"><label>Unit *<select name="unit" defaultValue="kg">{["kg", "bags", "tons", "crates", "boxes", "pieces"].map((unit) => <option key={unit}>{unit}</option>)}</select></label><label>Min GHS<input name="min_price" type="number" min="0" step="0.01" placeholder="Optional" /></label><label>Max GHS<input name="max_price" type="number" min="0" step="0.01" placeholder="Optional" /></label></div>
      <label className="full-width">Special Requirements <span>(optional)</span><textarea name="notes" maxLength={1000} placeholder="Organic, fresh harvest, farm pickup…" /></label><button className="buy-request-submit" type="submit"><i className="fas fa-paper-plane" aria-hidden="true" /> Publish Request to Farmers</button></form></section>
    <h2 className="my-requests-title"><i className="fas fa-list-check" aria-hidden="true" /> My Buy Requests</h2>{requests.length ? <div className="buyer-request-list">{requests.map((request) => <article className="buyer-request-item" key={request.id}><div className="buyer-request-main"><span className="buyer-request-icon"><i className="fas fa-basket-shopping" aria-hidden="true" /></span><div><h3>{request.productName}</h3><p>{request.productType}</p></div></div><div className="buyer-request-details"><div><b>Quantity</b><span>{request.minQuantity} – {request.maxQuantity} {request.unit}</span></div><div><b>Price range (GHS)</b><span>{request.minPrice > 0 || request.maxPrice > 0 ? `${cash(request.minPrice)} – ${cash(request.maxPrice)}` : "Negotiable"}</span></div></div><div className="buyer-request-actions"><span className={`request-status ${request.status}`}>{request.status}</span><form action={deleteBuyRequestAction}><input type="hidden" name="request_id" value={request.id} /><button type="submit" aria-label={`Remove ${request.productName} request`}><i className="fas fa-trash" aria-hidden="true" /></button></form></div></article>)}</div> : <div className="buyer-request-empty"><i className="fas fa-inbox" aria-hidden="true" /><p>You haven’t posted any buy requests yet.</p></div>}
  </div></main>;
}
