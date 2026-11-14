import { redirect } from "next/navigation";
import { decideAdminRequestAction } from "@/app/actions/admin";
import { db } from "@/app/lib/db";
import { getUserById } from "@/app/lib/data/users";
import { readSession } from "@/app/lib/session";
import "./admin.css";

export const metadata = { title: "Admin Dashboard | AGRIC DSS" };
type Row = Record<string, string | number | null>;
type Props = { searchParams: Promise<{ tab?: string }> };
const cash = (n: number) => new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(n);

export default async function AdminPage({ searchParams }: Props) {
  const session = await readSession();
  if (!session) redirect("/login?return_to=%2Fadmin");
  const user = await getUserById(session.userId);
  if (!user || user.role !== "admin") redirect("/dashboard");
  const { tab: choice } = await searchParams;
  const validTabs = ["users", "orders", "subscriptions", "promotions", "loans"];
  const tab = validTabs.includes(choice || "") ? choice! : "users";
  const count = async (sql: string) => Number((await (db.prepare(sql).get()) as { count: number }).count);
  const sum = async (sql: string) => Number((await (db.prepare(sql).get()) as { total: number }).total);
  const [farmers, buyers, pendingOrders, pendingLoans, completedVolume] = await Promise.all([
    count("SELECT COUNT(*) count FROM users WHERE role='farmer'"),
    count("SELECT COUNT(*) count FROM users WHERE role='buyer'"),
    count("SELECT COUNT(*) count FROM orders WHERE lower(status)='pending'"),
    count("SELECT COUNT(*) count FROM loans WHERE lower(status)='pending'"),
    sum("SELECT COALESCE(SUM(total),0) total FROM orders WHERE lower(status)='completed'"),
  ]);
  const stats = [
    ["fa-tractor", "green", farmers, "Registered Farmers"],
    ["fa-shopping-basket", "blue", buyers, "Registered Buyers"],
    ["fa-box-open", "orange", pendingOrders, "Pending Orders"],
    ["fa-hand-holding-dollar", "purple", pendingLoans, "Pending Loans"],
    ["fa-chart-line", "gold", cash(completedVolume), "Completed Volume"],
  ];
  const queries: Record<string, string> = {
    users: "SELECT id,name,email,phone,role,is_verified FROM users ORDER BY id DESC LIMIT 200",
    orders: `SELECT o.id,o.quantity,o.total,o.status,o.created_at,p.product_name,b.name buyer_name,s.name seller_name FROM orders o LEFT JOIN products p ON p.id=o.product_id LEFT JOIN users b ON b.id=o.buyer_id LEFT JOIN users s ON s.id=o.seller_id ORDER BY o.id DESC LIMIT 200`,
    subscriptions: "SELECT s.id,s.amount,s.payment_ref,s.status,s.created_at,u.name user_name FROM subscriptions s LEFT JOIN users u ON u.id=s.user_id ORDER BY s.id DESC LIMIT 200",
    promotions: "SELECT p.id,p.amount,p.payment_ref,p.status,p.created_at,u.name user_name,pr.product_name FROM promotions p LEFT JOIN users u ON u.id=p.user_id LEFT JOIN products pr ON pr.id=p.product_id ORDER BY p.id DESC LIMIT 200",
    loans: "SELECT l.id,l.amount,l.purpose,l.status,l.created_at,u.name user_name FROM loans l LEFT JOIN users u ON u.id=l.user_id ORDER BY l.id DESC LIMIT 200",
  };
  const rows = await (db.prepare(queries[tab]).all()) as Row[];
  const title: Record<string, string> = { users: "System Users", orders: "Order Tracking", subscriptions: "Subscription Payments", promotions: "Product Promotion Payments", loans: "Loan Requests" };
  const links = [["users", "User Management", "fa-users"], ["subscriptions", "Subscriptions", "fa-crown"], ["promotions", "Promotions", "fa-bullhorn"], ["orders", "Order Tracking", "fa-shipping-fast"], ["loans", "Loan Requests", "fa-money-check-alt"]];

  return <main className="admin-page"><div className="admin-shell">
    <header className="admin-header"><div><p>AGRIC DSS · ADMINISTRATION</p><h1>Admin Control Panel</h1><span>System overview and management dashboard</span></div><div className="admin-header-links"><a href="/admin/products">Manage products</a><a href="/admin/prices">Manage market prices</a><a href="/dashboard">Back to dashboard</a></div></header>
    <section className="admin-stats">{stats.map(([icon, tone, value, label]) => <article key={String(label)}><div className={`admin-stat-icon ${tone}`}><i className={`fas ${icon}`} aria-hidden="true" /></div><div><strong>{value}</strong><span>{label}</span></div></article>)}</section>
    <nav className="admin-tabs" aria-label="Admin sections">{links.map(([id, label, icon]) => <a key={id} className={tab === id ? "active" : ""} href={`/admin?tab=${id}`}><i className={`fas ${icon}`} aria-hidden="true" /> {label}</a>)}</nav>
    <section className="admin-panel"><div className="admin-panel-heading"><h2>{title[tab]}</h2><span>Up to 200 recent records</span></div>
      {tab === "orders" && <p className="admin-help">Transactions and delivery are handled between the buyer and farmer.</p>}
      <div className="admin-table-scroll"><table><thead><tr>{tab === "users" ? <><th>Name</th><th>Contact</th><th>Role</th><th>Verification</th></> : tab === "orders" ? <><th>Order</th><th>Product & Qty</th><th>Buyer</th><th>Farmer</th><th>Total</th><th>Status</th></> : tab === "subscriptions" ? <><th>Farmer</th><th>Amount</th><th>Payment reference</th><th>Date</th><th>Status</th><th>Decision</th></> : tab === "promotions" ? <><th>Farmer & Product</th><th>Amount</th><th>Payment reference</th><th>Date</th><th>Status</th><th>Decision</th></> : <><th>Loan</th><th>Applicant</th><th>Amount</th><th>Purpose</th><th>Date</th><th>Status</th><th>Decision</th></>}</tr></thead><tbody>
      {rows.length ? rows.map((r, i) => <tr key={String(r.id || i)}>{tab === "users" ? <><td><strong>{r.name || "User"}</strong><small>Account #{r.id}</small></td><td>{r.email}<small>{r.phone || "No phone listed"}</small></td><td><Badge value={r.role} /></td><td><Badge value={r.is_verified ? "Verified" : "Unverified"} /></td></> : tab === "orders" ? <><td>#{r.id}<small>{r.created_at}</small></td><td><strong>{r.product_name || "Product unavailable"}</strong><small>Quantity: {r.quantity}</small></td><td>{r.buyer_name || "—"}</td><td>{r.seller_name || "—"}</td><td>{cash(Number(r.total || 0))}</td><td><Badge value={r.status} /></td></> : tab === "subscriptions" ? <><td>{r.user_name || "Unknown farmer"}</td><td>{cash(Number(r.amount || 0))}</td><td>{r.payment_ref || "—"}</td><td>{r.created_at || "—"}</td><td><Badge value={r.status} /></td><td><DecisionButtons kind="subscription" id={Number(r.id)} status={r.status} /></td></> : tab === "promotions" ? <><td><strong>{r.user_name || "Unknown farmer"}</strong><small>{r.product_name || "Product unavailable"}</small></td><td>{cash(Number(r.amount || 0))}</td><td>{r.payment_ref || "—"}</td><td>{r.created_at || "—"}</td><td><Badge value={r.status} /></td><td><DecisionButtons kind="promotion" id={Number(r.id)} status={r.status} /></td></> : <><td className="loan-id"><a href={`/admin/loans/${r.id}`}>#LN-{String(r.id).padStart(4, "0")}</a></td><td>{r.user_name || "Unknown applicant"}</td><td>{cash(Number(r.amount || 0))}</td><td>{r.purpose || "—"}</td><td>{r.created_at || "—"}</td><td><Badge value={r.status} /></td><td><DecisionButtons kind="loan" id={Number(r.id)} status={r.status} /></td></>}</tr>) : <tr><td colSpan={7} className="admin-empty">No records found.</td></tr>}
      </tbody></table></div>
    </section>
  </div></main>;
}

function Badge({ value }: { value: string | number | null }) {
  const text = String(value || "Unknown");
  return <span className={`admin-badge ${text.toLowerCase()}`}>{text}</span>;
}

function DecisionButtons({ kind, id, status }: { kind: "loan" | "promotion" | "subscription"; id: number; status: string | number | null }) {
  if (String(status).toLowerCase() !== "pending") return <span className="admin-processed">Processed</span>;
  return <div className="admin-decisions"><form action={decideAdminRequestAction}><input type="hidden" name="kind" value={kind} /><input type="hidden" name="id" value={id} /><button name="decision" value="approve" className="approve">Approve</button></form><form action={decideAdminRequestAction}><input type="hidden" name="kind" value={kind} /><input type="hidden" name="id" value={id} /><button name="decision" value="reject" className="reject">Reject</button></form></div>;
}
