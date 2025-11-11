"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

// API base resolver + fallback fetch (so it hits Laravel API, not Next.js)
const resolveApiBases = () => {
  const env = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  const set = new Set<string>(["http://127.0.0.1:8000","http://localhost:8000","http://backend.test"]);
  if (env) set.add(env);
  return Array.from(set);
};
async function fetchWithFallback(path: string, init: RequestInit) {
  let last: any = null;
  const pref = (typeof window !== "undefined" ? localStorage.getItem("api_base_used") : null)?.replace(/\/$/, "");
  const list = [pref, ...resolveApiBases()].filter(Boolean).filter((v, i, a) => a.indexOf(v as string) === i) as string[];
  for (const b of list) {
    try {
      const c = new AbortController(); const t = setTimeout(()=>c.abort(), 8000);
      const r = await fetch(`${b}${path}`, { mode: "cors", cache: "no-store", ...init, signal: c.signal });
      clearTimeout(t);
      return r;
    } catch (e: any) { last = e?.name === "AbortError" ? new Error("Request timeout") : e; }
  }
  throw last || new Error("Network unreachable");
}

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

const mainNav: NavItem[] = [
  {
    label: "Dashboard",
    href: "/pages/admin/dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    label: "Categories",
    href: "/pages/admin/category",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M4 5h16M4 12h16M4 19h16" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Products",
    href: "/pages/admin/product",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M3 7l9-4 9 4-9 4-9-4Z" />
        <path d="M3 7v10l9 4 9-4V7" />
        <path d="M12 11v10" />
      </svg>
    ),
  },
  {
    label: "Orders",
    href: "/pages/admin/order",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M6 6h15l-1.5 9a2 2 0 0 1-2 1.7H9.5A2 2 0 0 1 7.6 15L6 6Z" />
        <path d="M9 6V5a3 3 0 0 1 6 0v1" />
      </svg>
    ),
  },
  {
    label: "Cancelled Orders",
    href: "/pages/admin/order-cancel",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <circle cx="12" cy="12" r="9" />
        <path d="M15 9l-6 6M9 9l6 6" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Users",
    href: "/pages/admin/user",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <circle cx="12" cy="8" r="3.2" />
        <path d="M5 19a7 7 0 0 1 14 0" />
      </svg>
    ),
  },
  {
    label: "Product Variants",
    href: "/pages/admin/product-variant",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M3 7l9-4 9 4-9 4-9-4Z" />
        <path d="M3 7v10l9 4 9-4V7" />
        <path d="M12 11v10" />
      </svg>
    ),
  },
];

export default function SidebarAdmin({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);       // mobile drawer
  const [hovered, setHovered] = useState(false); // desktop hover
  const [adminName, setAdminName] = useState<string | null>(null);
  const [adminRole, setAdminRole] = useState<string | null>(null);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
  const expanded = open || hovered;

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetchWithFallback("/api/user", {
          headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const u = await res.json();
        setAdminName(u?.name || null);
        setAdminRole(u?.role || null);
        setAdminEmail(u?.email || null);
      } catch {}
    })();
  }, [token]);

  const logout = async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
      if (token) {
        await fetchWithFallback("/api/auth/logout", {
          method: "POST",
          headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        }).catch(()=>null);
      }
    } catch {}
    try {
      localStorage.removeItem("admin_token");
      localStorage.removeItem("pending_email");
      localStorage.removeItem("pending_role");
      localStorage.removeItem("otp_expires_at");
    } catch {}
    router.replace("/pages/admin/loginadmin");
  };

  const isActive = (href: string) => {
    // Treat order detail page (/pages/admin/order-item) as active Orders
    if (href === "/pages/admin/order") {
      return pathname?.startsWith("/pages/admin/order");
    }
    return href === "/pages/admin"
      ? pathname === href || pathname === "/pages/admin/"
      : pathname?.startsWith(href);
  };

  const linkClass = (active: boolean) =>
    [
      "group flex items-center rounded-lg px-2 py-2 text-sm transition-colors",
      expanded ? "gap-3" : "gap-0",
      active
        ? expanded
          ? "bg-[#004236]/10 text-[#004236] font-medium"
          : "text-[#004236]"
        : expanded
          ? "text-zinc-700 hover:bg-zinc-100"
          : "text-zinc-500 hover:text-[#004236]"
    ].join(" ");

  const labelClass = expanded
    ? "ml-2 block overflow-hidden whitespace-nowrap transition-all duration-300 ease-out max-w-[160px] opacity-100 translate-x-0 will-change:opacity,transform"
    : "ml-0 block overflow-hidden whitespace-nowrap transition-all duration-300 ease-in max-w-0 opacity-0 -translate-x-2 will-change:opacity,transform";

  return (
    <div className="min-h-screen bg-[#FDFBF8]">
      {/* Mobile toggle */}
      <div className="md:hidden p-2 border-b border-zinc-200 bg-white">
        <button onClick={() => setOpen(s => !s)} className="rounded-md border border-zinc-300 px-3 py-2 text-sm">
          {open ? "Close" : "Menu"}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={[
          "fixed inset-y-0 left-0 z-40 border-r border-zinc-200 bg-white transition-all duration-300 ease-out",
          expanded ? "w-60" : "w-16",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        ].join(" ")}
        aria-label="Admin sidebar"
      >
        <div className="flex h-full flex-col">
          {/* Brand */}
          <div className="px-3 py-4">
            <div className="flex items-center px-2 py-2 text-sm font-semibold tracking-wide text-[#004236]">
              <span className="w-10 flex items-center justify-center">
                <img
                  src="/images/logo.png"
                  alt="Logo"
                  className="h-8 w-auto object-contain"
                  loading="lazy"
                />
              </span>
              <span className={labelClass}>Admin Panel</span>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-2">
            <ul className="space-y-1">
              {mainNav.map(item => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={item.label}
                      onClick={() => setOpen(false)}
                      className={linkClass(active)}
                    >
                      <span className="w-10 flex items-center justify-center">{item.icon}</span>
                      <span className={labelClass}>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
              {/* Superadmin-only: Admin Accounts CRUD */}
              {adminRole === "superadmin" && (
                <li>
                  <Link
                    href="/pages/admin/admin"
                    title="Admin Accounts"
                    onClick={() => setOpen(false)}
                    className={linkClass(isActive("/pages/admin/admin"))}
                  >
                    <span className="w-10 flex items-center justify-center">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="9" cy="8" r="3" />
                        <path d="M2 20a7 7 0 0 1 14 0" />
                        <path d="M17 11h4" strokeWidth="2" strokeLinecap="round" />
                        <path d="M19 9v4" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </span>
                    <span className={labelClass}>Admin Accounts</span>
                  </Link>
                </li>
              )}
            </ul>
          </nav>

          {/* Footer: admin info + actions */}
          <div className="border-t border-zinc-200 p-2 space-y-2">
            {/* Admin info placed above Back to site / Logout */}
            {adminName && (
              <div className={expanded ? "rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2" : "hidden"}>
                <div className="text-xs font-semibold text-zinc-800 truncate">
                  {adminName}
                  {adminRole && (
                    <span className="ml-1 rounded bg-zinc-100 px-1 py-0.5 text-[10px] font-medium text-zinc-600">
                      {adminRole}
                    </span>
                  )}
                </div>
                {adminEmail && (
                  <div className="mt-0.5 truncate text-[11px] text-zinc-500">{adminEmail}</div>
                )}
              </div>
            )}

            <Link
              href="/"
              title="Back to site"
              onClick={() => setOpen(false)}
              className={[
                "flex items-center rounded-lg border border-zinc-200 px-2 py-2 text-xs font-medium transition-colors",
                "hover:border-[#004236] hover:text-[#004236]",
                expanded ? "justify-start text-zinc-700" : "justify-center text-zinc-500"
              ].join(" ")}
            >
              <span className="w-10 shrink-0 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M3 12h18M3 12l6-6M3 12l6 6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className={labelClass}>Back to site</span>
            </Link>

            <button
              onClick={logout}
              title="Logout"
              className={[
                "flex w-full items-center rounded-lg border border-red-200 px-2 py-2 text-xs font-medium transition-colors",
                "hover:bg-red-50",
                expanded ? "justify-start text-red-700" : "justify-center text-red-600"
              ].join(" ")}
            >
              <span className="w-10 shrink-0 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M16 17l5-5-5-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M21 12H9" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </span>
              <span className={labelClass}>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Content wrapper */}
      <div className={["transition-all duration-300", expanded ? "md:ml-60" : "md:ml-16", open ? "ml-60 md:ml-60" : "ml-0"].join(" ")}>
        {children}
      </div>
    </div>
  );
}
