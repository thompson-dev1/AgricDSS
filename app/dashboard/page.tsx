import { redirect } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { getDashboardData } from "@/app/lib/data/users";
import { readSession } from "@/app/lib/session";
import "./dashboard.css";

export const metadata = { title: "Dashboard | AGRIC DSS" };
const money = (amount: number) => new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(amount);

export default async function DashboardPage() {
  const session = await readSession();
  if (!session) redirect("/login");

  const data = await getDashboardData(session.userId);
  if (!data) redirect("/login");

  const isFarmer = data.role === "farmer";
  const isBuyer = data.role === "buyer";
  const actions = isFarmer
    ? [
        { icon: "fa-wheat-awn", tone: "sell", title: "My Inventory", text: "Add produce listings, update available stock, and manage what buyers can find in the marketplace.", label: "Manage Inventory", href: "/farmer/products" },
        { icon: "fa-tractor", tone: "services", title: "Farm Services", text: "Hire professionals for land preparation, weeding, harvesting, and equipment rentals.", label: "Browse Services", href: "/services" },
        { icon: "fa-hand-holding-dollar", tone: "loan", title: "Apply for Loan", text: "Need capital? Request financial support or input credits for your next farming season.", label: "Request Funds", href: "/farmer/loans" },
      ]
    : [
        { icon: "fa-wheat-awn", tone: "market", title: "Browse Farm Produce", text: "Explore the marketplace to find high-quality crops, livestock, and agricultural services directly from verified farmers.", label: "Enter Marketplace", href: "/marketplace" },
        { icon: "fa-box-open", tone: "orders", title: "My Orders", text: "Track your ongoing purchases, communicate with sellers, and confirm deliveries to complete your transactions.", label: "Track Orders", href: "/orders" },
        { icon: "fa-bullhorn", tone: "request", title: "Post Buy Request", text: "Tell farmers exactly what you need! Specify the product, quantity range, and budget so they can match their harvest to you.", label: "Post a Request", href: "/buyer/requests" },
      ];

  return (
    <main className={`workspace-dashboard${isBuyer ? " buyer-dashboard" : ""}`} data-role={data.role}>
      <div className="dashboard-container">
        <div className="welcome-header">
          <h1>Welcome back, {data.name}! 👋</h1>
          <p>{isFarmer ? "Here is what's happening with your farm today." : isBuyer ? "Ready to source the best agricultural products today?" : "Welcome to the AGRIC DSS administration workspace."}</p>
        </div>

        {(isFarmer || isBuyer) ? <>
          <section className="profile-strip">
            <div className="profile-info">
              <div className="profile-avatar"><i className={`fas ${isFarmer ? "fa-tractor" : "fa-shopping-basket"}`} aria-hidden="true" /></div>
              <div className="profile-text">
                <h2>{data.name}</h2>
                <p>{isFarmer ? <><i className="fas fa-map-marker-alt" aria-hidden="true" /> {data.location} &nbsp; | &nbsp; <i className="fas fa-leaf" aria-hidden="true" /> Size not set</> : <><i className="fas fa-envelope" aria-hidden="true" /> {data.email} &nbsp; | &nbsp; <i className="fas fa-phone" aria-hidden="true" /> {data.phone}</>}</p>
              </div>
            </div>
            <a href="/profile" className="btn btn-light btn-sm profile-edit"><i className="fas fa-edit" aria-hidden="true" /> Edit Profile</a>
          </section>

          <section className="stats-grid" aria-label="Account statistics">
            {isFarmer ? <>
              <Stat icon="fa-box" tone="green" value={data.productCount} label="Active Products" />
              <Stat icon="fa-shopping-basket" tone="orange" value={data.pendingOrders} label="Pending Orders" />
              <Stat icon="fa-check-circle" tone="blue" value={data.completedOrders} label="Completed Sales" />
              <Stat icon="fa-chart-line" tone="gold" value={money(data.totalValue)} label="Total Earnings" />
            </> : <>
              <Stat icon="fa-clock" tone="orange" value={data.pendingOrders} label="Pending Orders" />
              <Stat icon="fa-check-double" tone="green" value={data.completedOrders} label="Completed Purchases" />
              <Stat icon="fa-users" tone="blue" value={data.connectedFarmers} label="Connected Farmers" />
              <Stat icon="fa-wallet" tone="purple" value={money(data.totalValue)} label="Total Spent" />
            </>}
          </section>

          <h2 className="action-heading">{isFarmer ? "Quick Actions" : "Marketplace Actions"}</h2>
          <section className="action-grid">
            {actions.map((action) => <article className="action-card" key={action.title}>
              <div className={`action-icon ${action.tone}`}><i className={`fas ${action.icon}`} aria-hidden="true" /></div>
              <h3>{action.title}</h3>
              <p>{action.text}</p>
              <a href={action.href} className={`btn-action ${action.tone}`}>{action.label}</a>
            </article>)}
          </section>
        </> : <section className="admin-dashboard-placeholder">
          <div className="admin-placeholder-icon"><i className="fas fa-shield-alt" aria-hidden="true" /></div>
          <h2>Administration</h2>
          <p>Review users, orders, subscriptions, promotions, and loan requests across AGRIC DSS.</p>
          <a href="/admin" className="btn-action sell">Open Admin Control Panel</a>
        </section>}

        <form action={logoutAction} className="dashboard-logout"><button type="submit" className="btn btn-outline-secondary">Log out</button></form>
      </div>
    </main>
  );
}

function Stat({ icon, tone, value, label }: { icon: string; tone: string; value: string | number; label: string }) {
  return <article className="stat-card"><div className={`stat-icon ${tone}`}><i className={`fas ${icon}`} aria-hidden="true" /></div><div className="stat-info"><h3>{value}</h3><p>{label}</p></div></article>;
}
