"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SidebarAdmin from "../../../components/sidebaradmin";

type OrderRow = {
  id: number;
  order_code: string;
  user_name?: string;
  status: string;
  is_complete?: boolean;
  total_price: number;
  created_at?: string;
};

const bases = () => {
  const env = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  const set = new Set<string>(["http://127.0.0.1:8000","http://localhost:8000","http://backend.test"]);
  if (env) set.add(env);
  return Array.from(set);
};

async function fetchWithFallback(path: string, init: RequestInit) {
  let last:any=null;
  const list = bases().filter((v,i,a)=>a.indexOf(v)===i);
  for(const b of list){
    try{
      const c=new AbortController(); const t=setTimeout(()=>c.abort(),8000);
      const r=await fetch(`${b}${path}`,{
        mode:"cors",
        cache:"no-store",
        ...init,
        headers:{ Accept:"application/json", ...(init.headers||{}) },
        signal:c.signal
      });
      clearTimeout(t);
      return r;
    }catch(e:any){
      last=(e?.name==="AbortError")?new Error("Request timeout"):e;
    }
  }
  throw last||new Error("Network unreachable");
}

const formatIDR = (v:number|string) =>
  new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",minimumFractionDigits:0}).format(Number(v||0));

const statusBadge = (status: string, isComplete?: boolean) => {
  const st = status.toLowerCase();
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

export default function AdminOrdersPage() {
  const router = useRouter();
  const token = useMemo(()=> (typeof window!=="undefined"?localStorage.getItem("admin_token"):null),[]);
  const [orders,setOrders] = useState<OrderRow[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState<string|null>(null);
  const [msg,setMsg] = useState<string|null>(null);

  useEffect(()=>{
    const guard = async () => {
      if (!token) { router.replace("/pages/admin/loginadmin"); return; }
      try {
        const res = await fetchWithFallback("/api/user",{headers:{Accept:"application/json",Authorization:`Bearer ${token}`}});
        if (!res.ok) throw new Error();
        const u = await res.json();
        if (!["admin","superadmin"].includes(u?.role)) throw new Error();
      } catch {
        router.replace("/pages/admin/loginadmin");
      }
    };
    guard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      if (!token) throw new Error("Auth required");
      const res = await fetchWithFallback("/api/admin/orders",{headers:{Accept:"application/json",Authorization:`Bearer ${token}`}});
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message||"Failed to load orders");
      setOrders(Array.isArray(data)?data:[]);
    } catch(e:any){
      setError(e?.message||"Failed to load orders");
    } finally { setLoading(false); }
  };

  useEffect(()=>{ load(); // eslint-disable-next-line
  },[]);

  return (
    <SidebarAdmin>
      <main className="mx-auto max-w-6xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-[#004236]">Orders</h1>
          <button onClick={load} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:border-[#004236] hover:text-[#004236]">
            Refresh
          </button>
        </div>
        {msg && <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{msg}</div>}
        {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <div className="overflow-x-auto rounded-lg border border-gray-100 bg-white shadow-md">
          <table className="min-w-[1000px] w-full text-left text-sm">
            <thead className="bg-[#f9f5f7] text-xs font-semibold uppercase text-[#004236]">
              <tr>
                <th className="px-6 py-3">ID</th>
                <th className="px-6 py-3">Order Code</th>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Total</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3 text-center w-[140px]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-6 text-center text-sm text-gray-500">Loading...</td></tr>
              ) : orders.length===0 ? (
                <tr><td colSpan={7} className="px-6 py-6 text-center text-sm text-gray-500">No orders.</td></tr>
              ) : orders.map(o=>(
                <tr key={o.id} className="transition hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium">{o.id}</td>
                  <td className="px-6 py-3">{o.order_code}</td>
                  <td className="px-6 py-3">{o.user_name||"-"}</td>
                  <td className="px-6 py-3">{statusBadge(o.status, o.is_complete)}</td>
                  <td className="px-6 py-3">{formatIDR(o.total_price)}</td>
                  <td className="px-6 py-3">{o.created_at? new Date(o.created_at).toLocaleString(): "-"}</td>
                  <td className="px-6 py-3 text-center w-[140px]">
                    <button
                      onClick={()=>router.push(`/pages/admin/order-item?order_id=${o.id}`)}
                      className="rounded-full border border-zinc-300 px-4 py-1.5 text-xs font-semibold text-[#004236] hover:border-[#004236]"
                    >
                      View
                    </button>
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
