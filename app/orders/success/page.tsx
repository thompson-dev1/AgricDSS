import { redirect } from "next/navigation";
import { getBuyerOrder } from "@/app/lib/data/orders";
import { getUserById } from "@/app/lib/data/users";
import { readSession } from "@/app/lib/session";
import "../orders.css";

export const metadata = { title: "Order Receipt | AGRIC DSS" };
type OrderSuccessProps = { searchParams: Promise<{ id?: string }> };

export default async function OrderSuccessPage({ searchParams }: OrderSuccessProps) {
  const session = await readSession();
  if (!session) redirect("/login");
  const user = await getUserById(session.userId);
  if (!user || user.role !== "buyer") redirect("/dashboard");
  const { id } = await searchParams;
  const orderId = Number(id);
  if (!Number.isInteger(orderId) || orderId < 1) redirect("/orders");
  const order = await getBuyerOrder(orderId, user.id);
  if (!order) redirect("/orders");

  return (
    <main className="order-page">
      <section className="order-success-card">
        <header className="order-success-header"><i className="fas fa-circle-check" aria-hidden="true" /><h1>Order Placed</h1><p>AGRIC DSS · Order #{order.id}</p></header>
        <div className="order-success-body">
          <div className="order-detail-row"><span>Product</span><strong>{order.productName}</strong></div>
          <div className="order-detail-row"><span>Farmer</span><strong>{order.sellerName}</strong></div>
          <div className="order-detail-row"><span>Contact</span><strong>{order.sellerPhone}</strong></div>
          <div className="order-detail-row"><span>Quantity</span><strong>{order.quantity} {order.unit}</strong></div>
          <div className="order-detail-row"><span>Status</span><strong>{order.status}</strong></div>
          <div className="order-confirm-code"><span>Transaction code</span><strong>{order.verificationCode}</strong><small>Share this code with the farmer after the order is delivered.</small></div>
          <div className="order-total"><span>Total</span><strong>{new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(order.total)}</strong></div>
          <a className="order-primary-link" href="/orders">View my orders</a>
        </div>
      </section>
    </main>
  );
}
