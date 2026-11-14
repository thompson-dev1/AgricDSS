import { redirect } from "next/navigation";
import { submitSubscriptionPaymentAction } from "@/app/actions/farmer-finance";
import { db } from "@/app/lib/db";
import { getUserById } from "@/app/lib/data/users";
import { readSession } from "@/app/lib/session";
import "./subscription.css";

export const metadata = { title: "Farmer Subscription | AGRIC DSS" };
type Props = { searchParams: Promise<{ error?: string; submitted?: string }> };
type Payment = { id: number; amount: number; payment_method: string; payment_ref: string | null; status: string; created_at: string | null };
export default async function FarmerSubscriptionPage({ searchParams }: Props) {
  const session = await readSession(); if (!session) redirect("/login?return_to=%2Ffarmer%2Fsubscription");
  const user = await getUserById(session.userId); if (!user || user.role !== "farmer") redirect("/dashboard");
  const subscribed = (await (db.prepare("SELECT is_subscribed FROM users WHERE id=?").get(user.id)) as { is_subscribed: number } | undefined)?.is_subscribed === 1;
  const payments = await (db.prepare("SELECT id,amount,payment_method,payment_ref,status,created_at FROM subscriptions WHERE user_id=? ORDER BY id DESC").all(user.id)) as Payment[];
  const { error, submitted } = await searchParams;
  return <main className="subscription-page"><section className="subscription-card">{error && <p className="subscription-notice error" role="alert">{error === "already_active_or_pending" ? "Your subscription is active or a payment is already awaiting review." : "Enter a valid payment method and transaction reference."}</p>}{submitted && <p className="subscription-notice success" role="status">Payment details submitted. The admin will verify the transaction reference.</p>}
    {subscribed ? <div className="subscription-active"><span className="subscription-check">✓</span><h1>Account Activated</h1><p>You have full access to all platform features.</p><b>Active Subscription</b><FeatureList /><a href="/dashboard">Go to Dashboard</a></div> : <><header><h1><i className="fas fa-wheat-awn" aria-hidden="true" /> Farmer Subscription</h1><p>One-time payment to unlock all platform features</p></header><div className="subscription-price">GHS 50 <small>one-time</small></div><FeatureList /><div className="subscription-payment"><h2><i className="fas fa-credit-card" aria-hidden="true" /> Make Payment</h2><div className="subscription-momo">Send GHS 50.00 via Mobile Money, then enter your transaction details below. {process.env.PAYMENT_MOMO_NUMBER ? <>Payment number: <b>{process.env.PAYMENT_MOMO_NUMBER}</b>.</> : null}</div><form action={submitSubscriptionPaymentAction}><label>Payment method<select name="payment_method" required><option>MTN Mobile Money</option><option>Vodafone Cash</option><option>AirtelTigo Money</option><option>Bank Transfer</option></select></label><label>Transaction Reference / ID<input name="payment_ref" maxLength={120} placeholder="Transaction reference" required /></label><button type="submit">Pay GHS 50.00 & Submit for Activation</button></form></div></>}
    {!subscribed && payments.length > 0 && <section className="subscription-history"><h2>Payment Requests</h2>{payments.map((payment) => <p key={payment.id}><span>{payment.payment_method} · {payment.payment_ref || "No reference"}</span><b className={payment.status.toLowerCase()}>{payment.status}</b></p>)}</section>}
  </section></main>;
}
function FeatureList(){return <ul className="subscription-features">{["Sell farm products to verified buyers","Access farm support services & tools","Apply for agricultural loans","View real-time market prices","Get buyer reputation & trust insights","Promote products for top visibility","Receive notifications & order alerts"].map((feature)=><li key={feature}><i className="fas fa-check-circle" aria-hidden="true" /> {feature}</li>)}</ul>}
