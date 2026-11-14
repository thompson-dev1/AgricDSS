import { redirect } from "next/navigation";
import { addInventoryProductAction, sellInventoryProductAction } from "@/app/actions/inventory";
import { getFarmerInventory } from "@/app/lib/data/inventory";
import { getUserById } from "@/app/lib/data/users";
import { readSession } from "@/app/lib/session";
import "./products.css";

export const metadata = { title: "My Inventory | AGRIC DSS" };
type PageProps = { searchParams: Promise<{ error?: string; added?: string; sold?: string }> };
const categories = ["Grains & Cereals", "Tubers & Roots", "Legumes & Nuts", "Vegetables", "Fruits", "Cattle", "Poultry", "Goats & Sheep", "Pigs", "Other Animals", "Fish", "Crabs & Shellfish", "Other Seafood", "Dairy Products", "Processed Foods", "Oils & Fats", "Spices & Herbs", "Animal Feed", "Seeds & Seedlings", "Other"];
const money = (amount: number) => new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(amount);

export default async function FarmerProductsPage({ searchParams }: PageProps) {
  const session = await readSession();
  if (!session) redirect("/login?return_to=%2Ffarmer%2Fproducts");
  const user = await getUserById(session.userId);
  if (!user || user.role !== "farmer") redirect("/dashboard");
  const [{ error, added, sold }, products] = await Promise.all([searchParams, getFarmerInventory(user.id)]);
  const errorText: Record<string, string> = {
    invalid_product: "Check the product details and try again.", invalid_quantity: "Enter a valid quantity.",
    not_enough_stock: "That quantity is greater than the available stock.", image_too_large: "Choose an image smaller than 2 MB.", invalid_image: "Use a JPG, PNG, or WebP image.",
  };

  return <main className="inventory-page"><div className="inventory-wrap">
    <header className="inventory-heading"><div><p>FARMER WORKSPACE</p><h1>My Inventory Manager</h1><span>Manage your listings and keep your available stock up to date.</span></div><a href="/dashboard">Back to dashboard</a></header>
    {error && <p className="inventory-notice error" role="alert">{errorText[error] || "Something went wrong. Please try again."}</p>}
    {added && <p className="inventory-notice success" role="status">Product added to your inventory.</p>}
    {sold && <p className="inventory-notice success" role="status">Stock updated successfully.</p>}
    <div className="inventory-columns">
      <section className="inventory-form-card"><h2><i className="fas fa-plus-circle" aria-hidden="true" /> Add New Product</h2>
        <form action={addInventoryProductAction} encType="multipart/form-data">
          <label>Category *<select name="type" required defaultValue=""><option value="" disabled>Select category</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
          <label>Product name *<input name="product_name" placeholder="e.g. Onions, Maize" maxLength={120} required /></label>
          <div className="inventory-field-row"><label>Quantity *<input type="number" name="quantity" min="0.01" step="any" required /></label><label>Unit *<select name="unit" defaultValue="kg">{["kg", "bags", "tons", "crates", "boxes", "bunches", "liters", "pieces"].map((unit) => <option key={unit}>{unit}</option>)}</select></label></div>
          <div className="inventory-field-row"><label>Weight per unit<input type="number" name="unit_weight" min="0" step="any" placeholder="Optional" /></label><label>Weight unit<select name="weight_unit" defaultValue="kg"><option value="kg">kg</option><option value="g">grams</option><option value="lbs">lbs</option></select></label></div>
          <label>Price per unit (GHS) *<input type="number" name="price" min="0.01" step="0.01" required /></label>
          <label>Product image <span className="inventory-muted">(optional, max 2 MB)</span><input type="file" name="image" accept="image/jpeg,image/png,image/webp" /></label>
          <button type="submit" className="inventory-submit">Add to Inventory</button>
        </form>
      </section>
      <section className="inventory-stock-card"><div className="inventory-stock-title"><h2><i className="fas fa-boxes" aria-hidden="true" /> Current Stock</h2><span>{products.length} {products.length === 1 ? "listing" : "listings"}</span></div>
        {products.length ? <div className="inventory-table-scroll"><table><thead><tr><th>Product</th><th>Details</th><th>Stock</th><th>Sell direct</th></tr></thead><tbody>{products.map((product) => {
          const file = product.image?.replace(/^uploads\//, "");
          const image = file && file !== "default_product.jpg" ? `/uploads/${encodeURIComponent(file)}` : "/images/default_product.jpg";
          return <tr key={product.id}><td><div className="inventory-product"><img src={image} alt="" /><div><strong>{product.name}</strong><small>{product.type}</small></div></div></td><td><strong>{money(product.price)}</strong><small>per {product.unit}</small>{product.unitWeight ? <small>{product.unitWeight} {product.weightUnit} per {product.unit}</small> : null}</td><td><span className={`stock-pill${product.quantity > 0 ? " available" : " empty"}`}>{product.quantity} {product.unit}</span></td><td><form action={sellInventoryProductAction} className="sell-stock-form"><input type="hidden" name="product_id" value={product.id} /><input aria-label={`Quantity of ${product.name} sold`} type="number" name="sell_qty" min="0.01" max={product.quantity} step="any" placeholder="Qty" required disabled={product.quantity <= 0} /><button type="submit" disabled={product.quantity <= 0}>Sell</button></form></td></tr>;
        })}</tbody></table></div> : <div className="inventory-empty"><i className="fas fa-box-open" aria-hidden="true" /><h3>Your inventory is empty</h3><p>Add a product to start listing it in the marketplace.</p></div>}
      </section>
    </div>
  </div></main>;
}
