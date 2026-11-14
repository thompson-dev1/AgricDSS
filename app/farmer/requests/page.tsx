import { redirect } from "next/navigation";
import { getOpenBuyerRequests } from "@/app/lib/data/buy-requests";
import { getFarmerInventory } from "@/app/lib/data/inventory";
import { acceptBuyerRequestAction } from "@/app/actions/orders";
import { getUserById } from "@/app/lib/data/users";
import { readSession } from "@/app/lib/session";
import "./requests.css";

export const metadata = { title: "Buyer Requests | AGRIC DSS" };
const cash = (n: number) => new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(n);
type Props={searchParams:Promise<{error?:string}>};
export default async function FarmerRequestsPage({searchParams}:Props) {
  const session = await readSession(); if (!session) redirect("/login?return_to=%2Ffarmer%2Frequests");
  const user = await getUserById(session.userId); if (!user || user.role !== "farmer") redirect("/dashboard");
  const [requests,products,{error}] = await Promise.all([getOpenBuyerRequests(),getFarmerInventory(user.id),searchParams]);
  const errorText=error==="not_match"?"That listing does not meet the buyer request range.":error==="handled"?"This request has already been accepted.":error?"Check the selected listing and quantity.":"";
  return <main className="farmer-requests-page"><div className="farmer-requests-wrap"><header><div><p>FARMER WORKSPACE</p><h1>Buyer Requests</h1><span>See what buyers are looking for and contact them directly.</span></div><a href="/dashboard">Back to dashboard</a></header>
    {errorText&&<p className="request-error" role="alert">{errorText}</p>}
    {requests.length ? <div className="farmer-request-list">{requests.map((request) => {const matches=products.filter(p=>(p.name.trim().toLowerCase()===request.productName.trim().toLowerCase()||p.type.trim().toLowerCase()===request.productType.trim().toLowerCase())&&p.quantity>=request.minQuantity&&(!request.unit||p.unit.toLowerCase()===request.unit.toLowerCase()));return <article key={request.id}><div className="farmer-request-top"><div><span>{request.productType}</span><h2>{request.productName}</h2></div><span className="open-request">Open</span></div><div className="farmer-request-details"><span><b>Buyer</b>{request.buyerName}</span><span><b>Quantity</b>{request.minQuantity}–{request.maxQuantity} {request.unit}</span><span><b>Budget</b>{request.minPrice || request.maxPrice ? `${cash(request.minPrice)} – ${cash(request.maxPrice)}` : "Negotiable"}</span></div>{request.notes && <p className="farmer-request-notes">{request.notes}</p>}{matches.length>0&&<form action={acceptBuyerRequestAction} className="accept-request-form"><input type="hidden" name="request_id" value={request.id}/><select aria-label={`Product for request ${request.id}`} name="product_id" required defaultValue=""> <option value="" disabled>Select your matching product</option>{matches.map(p=><option key={p.id} value={p.id}>{p.name} · {p.quantity} {p.unit} · {cash(p.price)}/{p.unit}</option>)}</select><input aria-label="Quantity to sell" name="quantity" type="number" min={request.minQuantity} max={Math.min(request.maxQuantity,...matches.map(p=>p.quantity))} defaultValue={request.minQuantity} required/><button type="submit">Accept request</button></form>}<a className="contact-buyer-link" href={`/messages?user_id=${request.buyerId}`}><i className="fas fa-comment-dots" aria-hidden="true" /> Contact buyer</a></article>})}</div> : <section className="farmer-request-empty"><i className="fas fa-inbox" aria-hidden="true" /><h2>No open requests right now</h2><p>Buyer requests will appear here when they post what they need.</p></section>}
  </div></main>;
}
