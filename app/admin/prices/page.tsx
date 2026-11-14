import { redirect } from "next/navigation";
import { createMarketPriceAction, updateMarketPriceAction } from "@/app/actions/admin";
import { db } from "@/app/lib/db";
import { getUserById } from "@/app/lib/data/users";
import { readSession } from "@/app/lib/session";
import "./prices.css";

export const metadata = { title: "Manage Market Prices | AGRIC DSS" };
type Props = { searchParams: Promise<{ error?: string; updated?: string; created?: string }> };
type PriceRow = { id: number; crop_name: string | null; market_name: string | null; price: number | null };

export default async function AdminPricesPage({ searchParams }: Props) {
  const session = await readSession();
  if (!session) redirect("/login?return_to=%2Fadmin%2Fprices");
  const admin = await getUserById(session.userId);
  if (!admin || admin.role !== "admin") redirect("/dashboard");
  const { error, updated, created } = await searchParams;
  const rows = await (db.prepare("SELECT id, crop_name, market_name, price FROM prices ORDER BY crop_name, market_name").all()) as PriceRow[];
  return <main className="price-admin"><div className="price-admin-wrap"><header><div><p>ADMINISTRATION</p><h1>Manage Market Prices</h1><span>Update the recommended prices farmers and buyers see.</span></div><a href="/admin?tab=users">Back to Admin</a></header>
    {updated && <p className="price-admin-message success" role="status">Market price updated.</p>}{created&&<p className="price-admin-message success" role="status">Market price added.</p>}{error && <p className="price-admin-message error" role="alert">{error === "not_found" ? "That price entry was not found." : error === "invalid_entry" ? "Enter a crop, market, and valid price." : "Enter a valid price greater than zero."}</p>}
    <section className="price-admin-card price-add-card"><h2>Add price guideline</h2><form action={createMarketPriceAction}><label>Crop<input name="crop_name" maxLength={100} required/></label><label>Market<input name="market_name" maxLength={100} required/></label><label>Price (GHS)<input name="price" type="number" min="0.01" step="0.01" required/></label><button type="submit">Add price</button></form></section>
    <section className="price-admin-card"><div className="price-admin-scroll"><table><thead><tr><th>Crop</th><th>Market</th><th>Price (GHS)</th><th>Update</th></tr></thead><tbody>{rows.length ? rows.map((row) => <tr key={row.id}><td>{row.crop_name || "—"}</td><td>{row.market_name || "—"}</td><td colSpan={2}><form action={updateMarketPriceAction}><input type="hidden" name="price_id" value={row.id} /><input aria-label={`Price for ${row.crop_name} at ${row.market_name}`} type="number" name="price" defaultValue={row.price || 0} min="0.01" step="0.01" required /><button type="submit">Save</button></form></td></tr>) : <tr><td colSpan={4} className="price-admin-empty">No market price guidelines are recorded.</td></tr>}</tbody></table></div></section>
  </div></main>;
}
