"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/products", label: "Products" },
  { href: "/products/content", label: "Add Product Content" },
  { href: "/leads", label: "Leads" },
  { href: "/follow-ups", label: "Follow-ups" },
  { href: "/opportunities", label: "Opportunities" },
  { href: "/customers", label: "Customers" },
  { href: "/b2b-accounts", label: "B2B Accounts" },
  { href: "/service-tickets", label: "Service Tickets" },
  { href: "/reviews", label: "User Reviews" },
  { href: "/quotes", label: "Quotes" },
  { href: "/orders", label: "Orders" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, hasPermission } = useAuth();

  const navItems = [
    ...NAV_ITEMS,
    ...(hasPermission("social:manage") ? [{ href: "/marketing", label: "Marketing" }] : []),
    ...(hasPermission("branches:manage") ? [{ href: "/branches", label: "Branches" }] : []),
    ...(hasPermission("users:manage") ? [{ href: "/users", label: "Users" }] : []),
    // Admin-only ("*"), not the settings:manage permission — see settings/page.tsx.
    ...(hasPermission("*") ? [{ href: "/settings", label: "Settings" }] : []),
    { href: "/profile", label: "Profile" },
  ];

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2.5 border-b border-slate-200 px-4 py-4">
        <Image src="/dreamhome-logo.jpg" alt="DreamHome" width={32} height={32} className="rounded-full" />
        <div>
          <p className="text-sm font-semibold text-slate-900">DreamHome</p>
          <p className="text-xs text-slate-500">Sales & CRM</p>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 p-2">
        {navItems.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "block rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sky-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-sky-50 hover:text-sky-700",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 p-3">
        <p className="truncate text-xs font-medium text-slate-700">{user?.email}</p>
        <p className="mb-3 text-xs text-slate-400">{user?.roleName}</p>
        <Button variant="secondary" onClick={logout} className="w-full">
          Sign out
        </Button>
      </div>
    </aside>
  );
}
