"use client";

import { useEffect, useState } from "react";

type Role = "farmer" | "buyer" | "admin";
type Counts = { notifications: number; messages: number; orders: number };
const EMPTY_COUNTS = { notifications: 0, messages: 0, orders: 0 };

export function SiteNavigation({ role, name, counts = EMPTY_COUNTS }: { role?: Role; name?: string; counts?: Counts }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [badges, setBadges] = useState(counts);
  useEffect(() => {
    if (!role) return;
    let active = true;
    const refresh = async () => { try { const response = await fetch("/api/counts", { cache: "no-store" }); if (response.ok && active) setBadges(await response.json() as Counts); } catch { /* Keep the last rendered counts if polling is unavailable. */ } };
    const timer = window.setInterval(() => void refresh(), 3000);
    return () => { active = false; window.clearInterval(timer); };
  }, [role]);

  const links: Array<{ href: string; icon: string; label: string; badge?: number; highlight?: boolean }> = role === "admin" ? [
    { href: "/admin", icon: "fa-chart-line", label: "Dashboard" }, { href: "/admin/products", icon: "fa-boxes-stacked", label: "Products" }, { href: "/admin/prices", icon: "fa-dollar-sign", label: "Prices" }, { href: "/notifications", icon: "fa-bell", label: "Alerts", badge: badges.notifications },
  ] : role === "farmer" ? [
    { href: "/dashboard", icon: "fa-chart-line", label: "Dashboard" }, { href: "/farmer/sell", icon: "fa-wheat-awn", label: "Sell Crops" }, { href: "/farmer/products", icon: "fa-box", label: "My Products" }, { href: "/farmer/reports", icon: "fa-chart-pie", label: "Reports" }, { href: "/analytics", icon: "fa-chart-line", label: "Analytics" }, { href: "/prices", icon: "fa-dollar-sign", label: "Prices" }, { href: "/services", icon: "fa-seedling", label: "Services" }, { href: "/farmer/loans", icon: "fa-money-bill-wave", label: "Loans" }, { href: "/orders", icon: "fa-inbox", label: "Orders", badge: badges.orders }, { href: "/messages", icon: "fa-comment-dots", label: "Inbox", badge: badges.messages }, { href: "/farmer/requests", icon: "fa-bullhorn", label: "Buy Requests" }, { href: "/farmer/promotions", icon: "fa-star", label: "Promote", highlight: true }, { href: "/farmer/subscription", icon: "fa-credit-card", label: "Plan" }, { href: "/notifications", icon: "fa-bell", label: "Alerts", badge: badges.notifications },
  ] : role === "buyer" ? [
    { href: "/dashboard", icon: "fa-chart-line", label: "Dashboard" }, { href: "/marketplace", icon: "fa-wheat-awn", label: "Marketplace" }, { href: "/cart", icon: "fa-cart-shopping", label: "Cart" }, { href: "/buyer/requests", icon: "fa-bullhorn", label: "Buy Requests" }, { href: "/orders", icon: "fa-box", label: "My Orders", badge: badges.orders }, { href: "/messages", icon: "fa-comment-dots", label: "Inbox", badge: badges.messages }, { href: "/notifications", icon: "fa-bell", label: "Alerts", badge: badges.notifications },
  ] : [
    { href: "/marketplace", icon: "fa-wheat-awn", label: "Marketplace" }, { href: "/prices", icon: "fa-dollar-sign", label: "Prices" }, { href: "/services", icon: "fa-tractor", label: "Services" }, { href: "/login", icon: "fa-lock", label: "Login" }, { href: "/register", icon: "fa-edit", label: "Register" },
  ];

  return <nav className="agric-nav" aria-label="Main navigation"><div className="nav-container"><a href={role ? role === "admin" ? "/admin" : "/dashboard" : "/"} className="nav-brand"><i className="fas fa-wheat-awn" aria-hidden="true" /> AGRIC DSS</a><button className="nav-toggle" type="button" aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>☰</button><div className={`nav-links${menuOpen ? " open" : ""}`}>
    {links.map((link) => <a key={link.href} href={link.href} className={`${link.highlight ? "nav-highlight " : ""}${link.href === "/notifications" || link.href === "/messages" || link.href === "/orders" ? "nav-notif-link" : ""}`}><i className={`fas ${link.icon}`} aria-hidden="true" /> {link.label}{link.badge ? <span className="nav-count-badge">{link.badge}</span> : null}</a>)}
    <form action="/marketplace" method="GET" className="nav-search"><input type="search" name="q" placeholder="Search…" aria-label="Search marketplace"/><button type="submit">Go</button></form>
    {role && <a href="/profile" className="nav-user"><i className="fas fa-user-circle" aria-hidden="true"/> {name || "Account"}</a>}
  </div></div></nav>;
}
