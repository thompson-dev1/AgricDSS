import { basename, join } from "node:path";
import { existsSync } from "node:fs";
import { searchMarketplaceProducts } from "@/app/lib/data/users";
import { createOrderAction } from "@/app/actions/orders";
import { addToCartAction } from "@/app/actions/cart";
import "./marketplace.css";

export const metadata = { title: "Farmers Marketplace | AGRIC DSS" };

type MarketplacePageProps = { searchParams: Promise<{ q?: string; search?: string; error?: string }> };

function fallbackImage(type: string | null) {
  const label = (type || "").toLowerCase();
  if (label.includes("maize")) return "maize.JPG";
  if (label.includes("rice") || label.includes("bean")) return "food stuffs.JPG";
  if (label.includes("tomato")) return "tomato.JPG";
  if (label.includes("onion")) return "onions.jpeg";
  if (label.includes("pepper")) return "green,red,yellwo papper.JPG";
  if (["cabbage", "carrot", "cucumber", "lettuce", "spinach"].some((name) => label.includes(name))) return "vegetables.JPG";
  if (label.includes("okra")) return "okro.JPG";
  if (label.includes("watermelon")) return "watermelon.JPG";
  if (label.includes("chicken") || label.includes("poultry")) return "chicken.JPG";
  if (label.includes("cattle") || label.includes("livestock")) return "cattle.JPG";
  if (label.includes("pig")) return "pig.JPG";
  if (label.includes("rabbit")) return "rabbit.JPG";
  if (label.includes("turkey")) return "turkey.JPG";
  if (label.includes("goat")) return "goat.JPG";
  return "bg.jpg";
}

function productImage(image: string | null, type: string | null) {
  if (image) {
    const isUpload = image.startsWith("uploads/");
    const filename = basename(image);
    const publicFolder = isUpload ? "uploads" : "images";
    if (isUpload) return `/uploads/${encodeURIComponent(filename)}`;
    if (existsSync(join(process.cwd(), "public", publicFolder, filename))) {
      return `/${publicFolder}/${encodeURIComponent(filename)}`;
    }
  }
  return `/images/${encodeURIComponent(fallbackImage(type))}`;
}

export default async function MarketplacePage({ searchParams }: MarketplacePageProps) {
  const params = await searchParams;
  const search = (params.q || params.search || "").trim().slice(0, 100);
  const products = await searchMarketplaceProducts(search);
  const errorMessage: Record<string, string> = {
    invalid_quantity: "Enter a valid quantity.",
    buyer_only: "Sign in with a buyer account to place an order.",
    product_unavailable: "That product is no longer available in the requested quantity.",
    order_failed: "We could not save the order. Please try again.",
  };

  return (
    <>
      <main className="marketplace-page">
        <header className="market-header">
          <h1><i className="fas fa-wheat-awn" aria-hidden="true" /> Farmers Marketplace</h1>
          <p>Buy directly from farmers</p>
          <form method="GET" action="/marketplace" className="market-search">
            <div className="market-search-box">
              <span className="search-icon"><i className="fas fa-search" aria-hidden="true" /></span>
              <input type="search" name="q" defaultValue={search} placeholder="Search by product, farmer or location..." aria-label="Search marketplace" />
              <button type="submit">Search</button>
            </div>
          </form>
          {search && <a href="/marketplace" className="clear-search">✕ Clear search results</a>}
        </header>
        <section className="market-container" aria-label="Marketplace listings">
          {params.error && <p className="market-error" role="alert">{errorMessage[params.error] || "We could not complete that action."}</p>}
          {products.length ? <div className="market-grid">
            {products.map((product) => {
              const name = product.productName || product.type || "Farm produce";
              return <article className={`market-card${product.isPromoted ? " promoted" : ""}`} key={product.id}>
                <img className="market-card-image" src={productImage(product.image, product.type)} alt={name} />
                {product.isPromoted && <div className="promoted-ribbon"><i className="fas fa-star" aria-hidden="true" /> PROMOTED LISTING</div>}
                <div className="market-card-body">
                  <h2>{name}</h2>
                <h3 className="market-product-link"><a href={`/products/${product.id}`}>View product details</a></h3>
                <div className="farmer-name"><i className="fas fa-user-tie" aria-hidden="true" /> {product.farmerName || "Unknown Farmer"}</div>
                  <div className="market-location"><i className="fas fa-map-marker-alt" aria-hidden="true" /> {product.location || "No location"}</div>
                  <div className="market-price"><i className="fas fa-box" aria-hidden="true" /> {product.quantity ?? 0} {product.unit || "units"}</div>
                  <div className="market-price"><i className="fas fa-money-bill-wave" aria-hidden="true" /> GHS {Number(product.price || 0).toFixed(2)}</div>
                  <span className="fresh-badge">{product.isPromoted ? <><i className="fas fa-star" aria-hidden="true" /> Top Pick</> : "Fresh Farm Produce"}</span>
                  {product.quantity && product.quantity > 0 && product.price && product.price > 0 && product.farmerId ? <><form action={createOrderAction} className="market-order-form">
                    <input type="hidden" name="product_id" value={product.id} />
                    <label className="visually-hidden" htmlFor={`quantity-${product.id}`}>Quantity for {name}</label>
                    <input id={`quantity-${product.id}`} type="number" name="quantity" min="1" max={product.quantity} defaultValue="1" required />
                    <button className="market-signin" type="submit"><i className="fas fa-shopping-cart" aria-hidden="true" /> Buy</button>
                  </form><form action={addToCartAction} className="market-cart-form"><input type="hidden" name="product_id" value={product.id}/><input type="hidden" name="quantity" value="1"/><button type="submit"><i className="fas fa-cart-plus" aria-hidden="true"/> Add to Cart</button></form></> : <div className="market-out-of-stock">{product.quantity && product.quantity > 0 ? product.price && product.price > 0 ? "Farmer account needs an update before ordering" : "Listing needs a price or farmer account update" : "Out of Stock"}</div>}
                </div>
              </article>;
            })}
          </div> : <div className="market-no-data"><i className="fas fa-times-circle" aria-hidden="true" /><p>{search ? "No products match your search." : "No products found."}</p></div>}
        </section>
      </main>
    </>
  );
}
