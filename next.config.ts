import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.NETLIFY ? {} : { output: "standalone" as const }),
  experimental: {
    serverActions: {
      bodySizeLimit: "3mb",
    },
  },
  async redirects() {
    return [
      { source: "/dashboard.php", destination: "/dashboard", permanent: false },
      { source: "/buyer_dashboard.php", destination: "/dashboard", permanent: false },
      { source: "/admin_dashboard.php", destination: "/admin", permanent: false },
      { source: "/admin_products.php", destination: "/admin/products", permanent: false },
      { source: "/market.php", destination: "/marketplace", permanent: false },
      { source: "/browse_products.php", destination: "/marketplace", permanent: false },
      { source: "/search.php", destination: "/marketplace", permanent: false },
      { source: "/view_products.php", destination: "/marketplace", permanent: false },
      { source: "/view_prices.php", destination: "/prices", permanent: false },
      { source: "/manage_prices.php", destination: "/admin/prices", permanent: false },
      { source: "/login.php", destination: "/login", permanent: false },
      { source: "/register.php", destination: "/register", permanent: false },
      { source: "/verify_email.php", destination: "/verify-email", permanent: false },
      { source: "/otp_verify.php", destination: "/verify-email", permanent: false },
      { source: "/verify.php", destination: "/verify-email", permanent: false },
      { source: "/logout.php", destination: "/dashboard", permanent: false },
      { source: "/profile.php", destination: "/profile", permanent: false },
      { source: "/cart.php", destination: "/cart", permanent: false },
      { source: "/my_orders.php", destination: "/orders", permanent: false },
      { source: "/farmer_orders.php", destination: "/orders", permanent: false },
      { source: "/my_products.php", destination: "/farmer/products", permanent: false },
      { source: "/sell.php", destination: "/farmer/products", permanent: false },
      { source: "/add_product.php", destination: "/farmer/sell", permanent: false },
      { source: "/buyer_requests.php", destination: "/buyer/requests", permanent: false },
      { source: "/farmer_requests.php", destination: "/farmer/requests", permanent: false },
      { source: "/loan.php", destination: "/farmer/loans", permanent: false },
      { source: "/subscription.php", destination: "/farmer/subscription", permanent: false },
      { source: "/promote_product.php", destination: "/farmer/promotions", permanent: false },
      { source: "/shop.php", destination: "/shop", permanent: false },
      { source: "/buy.php", destination: "/services", permanent: false },
      { source: "/chat.php", destination: "/messages", permanent: false },
      { source: "/notifications.php", destination: "/notifications", permanent: false },
    ];
  },
};

export default nextConfig;
