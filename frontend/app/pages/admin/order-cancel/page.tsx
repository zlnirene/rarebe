"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SidebarAdmin from "../../../components/sidebaradmin";

type OrderRow = {
  id: number;
  order_code: string;
  user_name?: string | null;
  status: string;
  is_complete?: boolean;
  total_price: number;
  created_at?: string | null;
  cancel?: string | null;
};

type OrderDetail = {
  id: number;
  order_code: string;
  status: string;
  is_complete?: boolean;
  total_price: number;
  subtotal: number;
  shipping_fee: number;
  created_at?: string;
  cancel?: string | null;
  user?: { id: number; name: string; email: string } | null;
  address?: {
    id: number;
    nama_tempat: string;
    no_telp: string;
    alamat: string;
    kecamatan: string;
    kabupaten: string;
    provinsi: string;
  } | null;
  courier?: { id: number; name: string; code?: string | null; price?: number | null } | null;
  items: {
    id: number;
    product_id: number;
    quantity: number;
    price: number;
    total: number;
    product?: { id: number; name: string; slug: string; main_image_url?: string | null } | null;
  }[];
};

const bases = () => {
  const env = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  const set = new Set<string>(["http://127.0.0.1:8000","http://localhost:8000","http://backend.test"]);
  if (env) set.add(env);
  return Array.from(set);
};
async function fetchWithFallback(path: string, init: RequestInit) {
  let last: any = null;
  for (const b of bases()) {
    try {
      const c = new AbortController();
      const t = setTimeout(()=>c.abort(),10000);
      const r = await fetch(`${b}${path}`, { cache:"no-store", ...init, signal:c.signal });
      clearTimeout(t);
      return r;
    } catch(e){ last = e; }
  }
  throw last || new Error("Network error");
}

const formatIDR = (v:number|string) =>
  new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",minimumFractionDigits:0}).format(Number(v||0));

const statusBadge = (status: string, isComplete?: boolean) => {
  const st = (status||"").toLowerCase();
  const base = "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wide";
  switch (st) {
    case "pending": return <span className={`${base} bg-amber-100 text-amber-700 border border-amber-200`}>PENDING</span>;
    case "paid": return <span className={`${base} bg-pink-100 text-pink-700 border border-pink-200`}>PAID</span>;
    case "shipped": return <span className={`${base} bg-indigo-100 text-indigo-700 border border-indigo-200`}>SHIPPED</span>;
    case "to receive": return <span className={`${base} bg-sky-100 text-sky-700 border border-sky-200`}>TO RECEIVE</span>;
    case "completed":
      return isComplete
        ? <span className={`${base} bg-green-100 text-green-700 border border-green-200`}>COMPLETED</span>
        : <span className={`${base} bg-zinc-100 text-zinc-600 border border-zinc-200`}>COMPLETED</span>;
    case "cancelled": return <span className={`${base} bg-red-100 text-red-700 border border-red-200`}>CANCELLED</span>;
    default: return <span className={`${base} bg-zinc-100 text-zinc-600 border border-zinc-200`}>{st}</span>;
  }
};

export default function AdminCancelledOrdersPage(){
  const router = useRouter();
  const token = useMemo(()=> (typeof window!=="undefined"?localStorage.getItem("auth_token"):null),[]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);
  const [orders,setOrders]=useState<OrderRow[]>([]);
  const [expandedId,setExpandedId]=useState<number|null>(null); // only one can be open
  const [details,setDetails]=useState<Record<number, OrderDetail>>({});
  const [msg,setMsg]=useState<string|null>(null);

  useEffect(()=>{
    const guard = async () => {
      if (!token) { router.replace("/pages/admin/loginadmin"); return; }
      try {
        const res = await fetchWithFallback("/api/user",{headers:{Accept:"application/json",Authorization:`Bearer ${token}`}});
        if (!res.ok) throw new Error();
        const u = await res.json();
        if (!["admin","superadmin"].includes(u?.role)) throw new Error();
      } catch { router.replace("/pages/admin/loginadmin"); }
    };
    guard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  const load = async () => {
    setLoading(true); setError(null); setMsg(null);
    try{
      if (!token) throw new Error("Auth required");
      const res = await fetchWithFallback("/api/admin/orders",{headers:{Accept:"application/json",Authorization:`Bearer ${token}`}});
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message||"Failed to load orders");
      const list: OrderRow[] = (Array.isArray(data)?data:[]).filter((o:any)=> (o.status||"").toLowerCase()==="cancelled");
      setOrders(list);
      setExpandedId(null); // reset open row
      setDetails({});
      if (!list.length) setMsg("No cancelled orders.");
    }catch(e:any){ setError(e?.message||"Failed to load orders"); }
    finally{ setLoading(false); }
  };

  useEffect(()=>{ load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ },[]);

  const toggleExpand = async (orderId:number) => {
    const willOpen = expandedId !== orderId;
    setExpandedId(willOpen ? orderId : null);
    if (willOpen && !details[orderId]) {
      try{
        const res = await fetchWithFallback(`/api/admin/orders/${orderId}`,{
          headers:{Accept:"application/json",Authorization:`Bearer ${token}`}
        });
        const data = await res.json();
        if (res.ok) setDetails(d=> ({...d, [orderId]: data as OrderDetail}));
      }catch{/* ignore */}
    }
  };

  return (
    <SidebarAdmin>
      <main className="mx-auto max-w-6xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-[#004236]">Cancelled Orders</h1>
          <button onClick={load} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:border-[#004236] hover:text-[#004236]">
            Refresh
          </button>
        </div>
        {msg && <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{msg}</div>}
        {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div className="overflow-x-auto rounded-lg border border-gray-100 bg-white shadow-md">
          <table className="min-w-[1100px] text-left text-sm">
            <thead className="bg-[#f9f5f7] text-xs font-semibold uppercase text-[#004236]">
              <tr>
                <th className="px-6 py-3">#</th>
                <th className="px-6 py-3">Order Code</th>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Cancel Reason</th>
                <th className="px-6 py-3">Total</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3 text-center">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-6 text-center text-sm text-gray-500">Loading...</td></tr>
              ) : orders.length===0 ? (
                <tr><td colSpan={8} className="px-6 py-6 text-center text-sm text-gray-500">No cancelled orders.</td></tr>
              ) : orders.map((o, idx)=>(
                <tr key={o.id} className="align-top">
                  <td className="px-6 py-3 font-medium">{idx+1}</td>
                  <td className="px-6 py-3">{o.order_code}</td>
                  <td className="px-6 py-3">{o.user_name || "-"}</td>
                  <td className="px-6 py-3">{statusBadge(o.status, o.is_complete)}</td>
                  <td className="px-6 py-3 max-w-[280px] whitespace-pre-wrap">{o.cancel || "-"}</td>
                  <td className="px-6 py-3">{formatIDR(o.total_price)}</td>
                  <td className="px-6 py-3">{o.created_at ? new Date(o.created_at).toLocaleString() : "-"}</td>
                  <td className="px-6 py-3 text-center">
                    <button
                      onClick={()=>toggleExpand(o.id)}
                      className="rounded-full border border-zinc-300 px-4 py-1.5 text-xs font-semibold text-[#004236] hover:border-[#004236]"
                    >
                      {expandedId === o.id ? "Hide" : "View"}
                    </button>
                    {expandedId === o.id && (
                      <div className="mt-3 text-left">
                        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                          {!details[o.id] ? (
                            <div className="text-xs text-zinc-600">Loading detail...</div>
                          ) : (
                            <div className="space-y-3">
                              <div className="text-xs text-zinc-500">Order Code: <span className="text-zinc-800 font-medium">{details[o.id].order_code}</span></div>
                              <div className="text-xs text-zinc-500">Cancel Reason: <span className="text-zinc-800">{details[o.id].cancel || "-"}</span></div>
                              <div className="text-xs text-zinc-500">Subtotal: <span className="text-zinc-800">{formatIDR(details[o.id].subtotal)}</span></div>
                              <div className="text-xs text-zinc-500">Shipping: <span className="text-zinc-800">{formatIDR(details[o.id].shipping_fee)}</span></div>
                              <div className="text-xs text-zinc-500">Total: <span className="text-zinc-800">{formatIDR(details[o.id].total_price)}</span></div>
                              <div className="pt-2 border-t border-zinc-200">
                                <div className="text-sm font-semibold">Items</div>
                                {(!details[o.id].items || details[o.id].items.length===0) ? (
                                  <div className="text-xs text-zinc-600 mt-1">No items.</div>
                                ) : (
                                  <ul className="mt-2 space-y-2">
                                    {details[o.id].items.map((it)=>(
                                      <li key={it.id} className="flex items-center gap-3">
                                        <img
                                          src={it.product?.main_image_url || "/images/products/placeholder.jpg"}
                                          alt={it.product?.name || "Product"}
                                          className="h-8 w-8 rounded object-cover"
                                        />
                                        <div className="flex-1">
                                          <div className="text-xs text-zinc-900">{it.product?.name || `#${it.product_id}`}</div>
                                          <div className="text-[11px] text-zinc-500">Qty {it.quantity}</div>
                                        </div>
                                        <div className="text-xs text-zinc-900">{formatIDR(it.total)}</div>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                              <div className="pt-2 border-t border-zinc-200">
                                <div className="text-sm font-semibold">Shipping Address</div>
                                {details[o.id].address ? (
                                  <div className="mt-1 text-xs text-zinc-700 whitespace-pre-line">
                                    {details[o.id].address?.nama_tempat} ({details[o.id].address?.no_telp}){"\n"}
                                    {details[o.id].address?.alamat}{"\n"}
                                    {details[o.id].address?.kecamatan}, {details[o.id].address?.kabupaten}, {details[o.id].address?.provinsi}
                                  </div>
                                ) : <div className="mt-1 text-xs text-zinc-600">No address.</div>}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </SidebarAdmin>
  );
}
