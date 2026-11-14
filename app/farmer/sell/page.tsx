import { redirect } from "next/navigation";
import { listCropForSaleAction } from "@/app/actions/farmer-crops";
import { getUserById } from "@/app/lib/data/users";
import { readSession } from "@/app/lib/session";
import { db } from "@/app/lib/db";
import "../products/products.css";

export const metadata = { title: "Sell Crops | AGRIC DSS" };
type Props = { searchParams: Promise<{error?:string;listed?:string}> };
export default async function SellCropsPage({searchParams}:Props) {
  const session=await readSession(); if(!session) redirect("/login?return_to=%2Ffarmer%2Fsell");
  const user=await getUserById(session.userId); if(!user||user.role!=="farmer") redirect("/dashboard");
  const [{error,listed},crops,markets,offers]=await Promise.all([
    searchParams,
    Promise.resolve(await (db.prepare("SELECT id,crop_name FROM crops ORDER BY crop_name").all()) as Array<{id:number;crop_name:string}>),
    Promise.resolve(await (db.prepare("SELECT id,market_name,location FROM markets ORDER BY market_name").all()) as Array<{id:number;market_name:string;location:string|null}>),
    Promise.resolve(await (db.prepare("SELECT fp.id,fp.quantity,fp.expected_price,fp.status,c.crop_name,m.market_name FROM farmer_products fp JOIN crops c ON c.id=fp.crop_id JOIN markets m ON m.id=fp.market_id WHERE fp.user_id=? ORDER BY fp.id DESC").all(user.id)) as Array<{id:number;quantity:number;expected_price:number;status:string;crop_name:string;market_name:string}>),
  ]);
  return <main className="inventory-page"><div className="inventory-wrap"><header className="inventory-heading"><div><p>FARMER WORKSPACE</p><h1>List Crops for Sale</h1><span>Share your harvest and expected price with buyers in your market.</span></div><a href="/dashboard">Back to dashboard</a></header>
    {error&&<p className="inventory-notice error">Choose a crop and market and enter valid quantity and price.</p>}{listed&&<p className="inventory-notice success">Your crop is now listed.</p>}
    <div className="inventory-columns"><section className="inventory-form-card"><h2>New crop listing</h2><form action={listCropForSaleAction}>
      <label>Crop *<select name="crop_id" required defaultValue=""><option value="" disabled>Select crop</option>{crops.map(c=><option value={c.id} key={c.id}>{c.crop_name}</option>)}</select></label>
      <label>Market *<select name="market_id" required defaultValue=""><option value="" disabled>Select market</option>{markets.map(m=><option value={m.id} key={m.id}>{m.market_name}{m.location?` — ${m.location}`:""}</option>)}</select></label>
      <label>Quantity *<input name="quantity" type="number" min="0.01" step="any" required /></label><label>Expected price (GHS) *<input name="expected_price" type="number" min="0.01" step="0.01" required /></label>
      <button className="inventory-submit">Publish listing</button>
    </form></section><section className="inventory-stock-card"><div className="inventory-stock-title"><h2>Your crop listings</h2><span>{offers.length} listings</span></div>{offers.length?<div className="inventory-table-scroll"><table><thead><tr><th>Crop</th><th>Market</th><th>Quantity</th><th>Expected price</th><th>Status</th></tr></thead><tbody>{offers.map(o=><tr key={o.id}><td>{o.crop_name}</td><td>{o.market_name}</td><td>{o.quantity}</td><td>GHS {Number(o.expected_price).toFixed(2)}</td><td>{o.status}</td></tr>)}</tbody></table></div>:<p>No crop listings yet.</p>}</section></div>
  </div></main>;
}
