"use client";

import "./admin.css";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/admin/dashboard", label: "仪表盘" },
  { href: "/admin/orders", label: "订单" },
  { href: "/admin/workers", label: "兼职者" },
  { href: "/admin/withdrawals", label: "提现" },
  { href: "/admin/reviews", label: "评价" },
  { href: "/admin/appeals", label: "申诉" },
  { href: "/admin/aftersales", label: "售后" },
  { href: "/admin/users", label: "用户" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const showNav = pathname !== "/admin";

  return (
    <div className="admin-shell">
      {showNav ? (
        <aside className="admin-nav">
          <div className="admin-brand">校园服务·Admin</div>
          <nav className="admin-nav-list">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="admin-nav-link">
                {link.label}
              </a>
            ))}
          </nav>
        </aside>
      ) : null}
      <main className={showNav ? "admin-content" : "admin-content full"}>{children}</main>
    </div>
  );
}
