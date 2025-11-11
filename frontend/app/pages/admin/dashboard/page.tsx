"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SidebarAdmin from "../../../components/sidebaradmin";

const formatIDR = (v: number | string) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(Number(v || 0));

const resolveApiBases = () => {
  const env = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  const set = new Set<string>(["http://127.0.0.1:8000","http://localhost:8000","http://backend.test"]);
  if (env) set.add(env);
  return Array.from(set);
};
async function fetchWithFallback(path: string, init: RequestInit = {}) {
  let last: any = null;
  const bases = resolveApiBases().filter((v,i,a)=>a.indexOf(v)===i);
  for (const b of bases) {
    try {
      const c = new AbortController(); const t = setTimeout(()=>c.abort(), 8000);
      const r = await fetch(`${b}${path}`, { mode:"cors", cache:"no-store", ...init, headers:{ Accept:"application/json", ...(init.headers||{}) }, signal:c.signal });
      clearTimeout(t);
      return r;
    } catch (e:any) { last = e?.name === "AbortError" ? new Error("Request timeout") : e; }
  }
  throw last || new Error("Network unreachable");
}

type Stats = {
  capital: number;
  revenue: number;
  sold_qty: number;
  recent_orders: Array<{
    id: number;
    order_code: string;
    total_price: number;
    status: string;
    created_at: string;
    user_name: string;
    user_email: string;
  }>;
  active_products: number;
  paid_orders_count: number;
};

const badge = (s: string) => {
  const st = (s || "").toLowerCase();
  const base = "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wide";
  switch (st) {
    case "pending": return <span className={`${base} bg-amber-100 text-amber-700 border border-amber-200`}>PENDING</span>;
    case "paid": return <span className={`${base} bg-emerald-100 text-emerald-700 border border-emerald-200`}>PAID</span>;
    case "shipped": return <span className={`${base} bg-indigo-100 text-indigo-700 border border-indigo-200`}>SHIPPED</span>;
    case "to receive": return <span className={`${base} bg-sky-100 text-sky-700 border border-sky-200`}>TO RECEIVE</span>;
    case "completed": return <span className={`${base} bg-green-100 text-green-700 border border-green-200`}>COMPLETED</span>;
    case "cancelled": return <span className={`${base} bg-red-100 text-red-700 border border-red-200`}>CANCELLED</span>;
    default: return <span className={`${base} bg-zinc-100 text-zinc-600 border border-zinc-200`}>{st}</span>;
  }
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const token = useMemo(() => (typeof window !== "undefined" ? localStorage.getItem("admin_token") : null), []);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  // guard admin
  useEffect(() => {
    const guard = async () => {
      const t = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
      if (!t) { router.replace("/pages/admin/loginadmin"); return; }
      try {
        const res = await fetchWithFallback("/api/user", { headers: { Accept:"application/json", Authorization:`Bearer ${t}` } });
        if (!res.ok) throw new Error("Unauthorized");
        const u = await res.json();
        if (!["admin","superadmin"].includes(u?.role)) throw new Error("Forbidden");
      } catch {
        router.replace("/pages/admin/loginadmin");
      }
    };
    guard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    if (!token) return;
    setLoading(true); setError(null);
    try {
      const res = await fetchWithFallback("/api/admin/dashboard-stats", {
        headers: { Accept:"application/json", Authorization:`Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to load stats");
      setStats(data as Stats);
    } catch (e:any) {
      setError(e?.message || "Failed to load stats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [token]);

  return (
    <SidebarAdmin>
      <main className="mx-auto max-w-6xl p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#004236]">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-600">Overview of capital, revenue and recent orders.</p>
        </div>

        {error && (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        {loading ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">Loading...</div>
        ) : (
          <>
            {/* Stat cards */}
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-6">
              <div className="rounded-xl border border-zinc-200 bg-white p-5">
                <div className="text-xs font-semibold uppercase tracking-wider text-zinc-600">Initial Capital</div>
                <div className="mt-2 text-2xl font-semibold text-[#004236]">
                  {formatIDR(stats?.capital || 0)}
                </div>
                <p className="mt-1 text-xs text-zinc-500">Sum of modal price x stock</p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-5">
                <div className="text-xs font-semibold uppercase tracking-wider text-zinc-600">Revenue (Omzet)</div>
                <div className="mt-2 text-2xl font-semibold text-[#004236]">
                  {formatIDR(stats?.revenue || 0)}
                </div>
                <p className="mt-1 text-xs text-zinc-500">From paid/shipped/to receive/completed orders</p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-5">
                <div className="text-xs font-semibold uppercase tracking-wider text-zinc-600">Active Products</div>
                <div className="mt-2 text-2xl font-semibold text-[#004236]">
                  {stats?.active_products ?? 0}
                </div>
                <p className="mt-1 text-xs text-zinc-500">Currently published items</p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-5">
                <div className="text-xs font-semibold uppercase tracking-wider text-zinc-600">Paid Orders</div>
                <div className="mt-2 text-2xl font-semibold text-[#004236]">
                  {stats?.paid_orders_count ?? 0}
                </div>
                <p className="mt-1 text-xs text-zinc-500">Orders with status 'paid'</p>
              </div>
            </section>

            {/* Recent orders */}
            <section className="rounded-xl border border-zinc-200 bg-white">
              <div className="flex items-center justify-between border-b border-zinc-200 p-4">
                <h2 className="text-base font-semibold">Recent Orders</h2>
                <span className="text-xs text-zinc-600">Sold Qty: <b>{stats?.sold_qty ?? 0}</b></span>
              </div>
              {(!stats || (stats.recent_orders || []).length === 0) ? (
                <div className="p-6 text-sm text-zinc-600">No recent orders.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[900px] text-left text-sm">
                    <thead className="bg-[#f9f5f7] text-xs font-semibold uppercase text-[#004236]">
                      <tr>
                        <th className="px-6 py-3">Order Code</th>
                        <th className="px-6 py-3">Customer</th>
                        <th className="px-6 py-3">Total</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700">
                      {stats.recent_orders.map((o) => (
                        <tr key={o.id} className="transition hover:bg-gray-50">
                          <td className="px-6 py-3 font-medium">{o.order_code}</td>
                          <td className="px-6 py-3">
                            <div className="text-sm">{o.user_name}</div>
                            <div className="text-xs text-zinc-500">{o.user_email}</div>
                          </td>
                          <td className="px-6 py-3">{formatIDR(o.total_price)}</td>
                          <td className="px-6 py-3">{badge(o.status)}</td>
                          <td className="px-6 py-3">{o.created_at ? new Date(o.created_at).toLocaleString() : "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </SidebarAdmin>
  );
}
