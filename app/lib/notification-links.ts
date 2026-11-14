export function notificationHref(message: string, role: string) {
  const lower = message.toLowerCase();
  if (role === "admin" && lower.includes("subscription")) return "/admin?tab=subscriptions";
  if (role === "admin" && lower.includes("promotion")) return "/admin?tab=promotions";
  if (role === "admin" && lower.includes("loan")) return "/admin?tab=loans";
  if (lower.includes("subscription")) return "/farmer/subscription";
  if (lower.includes("promotion")) return "/farmer/promotions";
  if (lower.includes("order") || lower.includes("placed") || lower.includes("deliver") || lower.includes("transaction")) return "/orders";
  if (lower.includes("product") || lower.includes("stock")) return role === "farmer" ? "/farmer/products" : "/marketplace";
  if (lower.includes("loan")) return "/farmer/loans";
  if (lower.includes("message")) return "/messages";
  if (lower.includes("rating") || lower.includes("report")) return "/orders";
  return "";
}
