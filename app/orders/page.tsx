import { redirect } from "next/navigation";
import { confirmTransactionCodeAction } from "@/app/actions/orders";
import { submitFeedbackAction } from "@/app/actions/feedback";
import { getOrderHistory } from "@/app/lib/data/orders";
import { getUserById } from "@/app/lib/data/users";
import { readSession } from "@/app/lib/session";
import "./orders.css";

export const metadata = { title: "My Orders | AGRIC DSS" };
type OrdersPageProps = { searchParams: Promise<{ error?: string; updated?: string; feedback?: string; placed?: string }> };

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const session = await readSession();
  if (!session) redirect("/login?return_to=%2Forders");
  const user = await getUserById(session.userId);
  if (!user || !["buyer", "farmer"].includes(user.role)) redirect("/dashboard");
  const { error, updated, feedback, placed } = await searchParams;
  const role = user.role as "buyer" | "farmer";
  const orders = await getOrderHistory(user.id, role);

  return (
    <main className="order-page">
      <div className="orders-container">
        <header className="orders-title"><p>AGRIC DSS · {role === "buyer" ? "Buyer" : "Farmer"}</p><h1>{role === "buyer" ? "My Orders" : "Incoming Orders"}</h1><a href="/dashboard">Back to dashboard</a></header>
        {updated && <p className="orders-message success" role="status">Order confirmation updated.</p>}
        {placed && <p className="orders-message success" role="status">Your cart orders were placed successfully.</p>}
        {error && <p className="orders-message error" role="alert">{error === "not_found" ? "That order is not available to this account." : "The transaction code is incorrect. Check it and try again."}</p>}
        {feedback && <p className={`orders-message ${feedback === "saved" ? "success" : "error"}`} role={feedback === "saved" ? "status" : "alert"}>{feedback === "saved" ? "Your feedback was saved." : ({ rating_locked: "Ratings unlock after order completion. You can report an issue before then.", rating_required: "Select a rating before saving feedback for a completed order.", report_required: "Select a report reason before submitting.", invalid_report: "That report reason is not available for your role.", not_allowed: "You are not a participant in this order.", not_found: "That order could not be found." } as Record<string, string>)[feedback] || "Check the feedback details and try again."}</p>}
        {orders.length ? <div className="orders-list">{orders.map((order) => {
          const confirmed = role === "buyer" ? order.buyerConfirmed : order.sellerConfirmed;
          const bothConfirmed = order.buyerConfirmed && order.sellerConfirmed;
          return <article className="order-list-card" key={order.id}>
            <div className="order-list-header"><div><span className="order-number">Order #{order.id}</span><h2>{order.productName}</h2></div><span className={`order-status ${order.status.toLowerCase()}`}>{order.status}</span></div>
            <div className="order-list-details"><span>{order.quantity} {order.unit}</span><strong>{new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(order.total)}</strong><span>{role === "buyer" ? `Farmer: ${order.sellerName}` : `Buyer: ${order.buyerName}`}</span></div>
            <div className="confirmation-progress"><span className={order.buyerConfirmed ? "confirmed" : ""}>Buyer {order.buyerConfirmed ? "confirmed" : "pending"}</span><span className={order.sellerConfirmed ? "confirmed" : ""}>Farmer {order.sellerConfirmed ? "confirmed" : "pending"}</span></div>
            <section className="feedback-box"><div className="feedback-head"><strong><i className="fas fa-star" aria-hidden="true" /> Rate and Report {role === "buyer" ? "Seller" : "Buyer"}</strong><span className="feedback-meta">{role === "buyer" ? order.sellerName : order.buyerName}{order.targetRatingAvg !== null ? ` | ${order.targetRatingAvg.toFixed(1)}/5 avg` : ""}{order.targetReportCount ? ` | ${order.targetReportCount} report${order.targetReportCount === 1 ? "" : "s"}` : ""}</span></div>
              <form action={submitFeedbackAction}><input type="hidden" name="order_id" value={order.id} /><div className="feedback-grid"><label className="feedback-field"><span>Rate</span><select name="rating" defaultValue={order.myFeedbackRating || ""} disabled={order.status.toLowerCase() !== "completed"}><option value="">{order.status.toLowerCase() === "completed" ? "Select rating" : "After completion"}</option>{[5,4,3,2,1].map((stars) => <option key={stars} value={stars}>{stars} {stars === 1 ? "star" : "stars"}</option>)}</select></label>
                <label className="feedback-field"><span>{role === "buyer" ? "Report seller" : "Report buyer"}</span><select name="report_reason" defaultValue={order.myFeedbackReport}><option value="">{role === "buyer" ? "Select a seller issue" : "Select a buyer issue"}</option>{(role === "buyer" ? ["Poor quality of products", "Wrong product delivered", "Damaged or spoiled products", "Late delivery", "Seller did not respond", "False listing", "Other"] : ["No payment received", "Late payment", "Buyer did not confirm", "Buyer did not show up", "Abusive behavior", "Fake order", "Other"]).map((reason) => <option key={reason}>{reason}</option>)}</select></label><textarea name="comment" maxLength={500} defaultValue={order.myFeedbackComment} placeholder="Optional note" /></div><button type="submit">Save Rating and Report</button>{order.status.toLowerCase() !== "completed" && <p className="feedback-note">Reports are role-specific. Ratings unlock after both sides complete verification.</p>}</form>
            </section>
            {role === "farmer" && order.status !== "Completed" && <p className="seller-code">Transaction code for this order: <strong>{order.verificationCode}</strong></p>}
            {order.status !== "Completed" && <div className="order-code-entry">
              {confirmed || bothConfirmed ? <p>You confirmed this transaction. Waiting for the other party.</p> : <form action={confirmTransactionCodeAction}>
                <input type="hidden" name="order_id" value={order.id} />
                <label htmlFor={`code-${order.id}`}>Enter transaction code after delivery</label>
                <div><input id={`code-${order.id}`} type="text" name="verification_code" placeholder="TXN-XXXXXX" maxLength={10} required /><button type="submit">Confirm delivery</button></div>
              </form>}
            </div>}
          </article>;
        })}</div> : <div className="orders-empty"><i className="fas fa-box-open" aria-hidden="true" /><h2>No orders yet</h2><p>Your orders will appear here once you place or receive one.</p><a href="/marketplace">Browse the marketplace</a></div>}
      </div>
    </main>
  );
}
