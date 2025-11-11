"use client";
import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SidebarAdmin from "../../../components/sidebaradmin";

const bases = () => {
  const env = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  const set = new Set<string>(["http://127.0.0.1:8000","http://localhost:8000","http://backend.test"]);
  if (env) set.add(env);
  return Array.from(set);
};
async function fetchWithFallback(path:string, init:RequestInit){
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

const OrderItemFallback = () => (
  <SidebarAdmin>
    <main className="mx-auto max-w-4xl p-6">
      <div className="rounded-lg border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
        Loading order detail...
      </div>
    </main>
  </SidebarAdmin>
);

export default function AdminOrderItemPage() {
  return (
    <Suspense fallback={<OrderItemFallback />}>
      <AdminOrderItemPageInner />
    </Suspense>
  );
}

function AdminOrderItemPageInner() {
  const params = useSearchParams(); // now safely inside Suspense
  const orderIdParam = params.get("order_id");
  const router = useRouter();
  const token = useMemo(()=> (typeof window!=="undefined"?localStorage.getItem("admin_token"):null),[]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);
  const [msg,setMsg]=useState<string|null>(null);
  const [order,setOrder]=useState<any|null>(null);

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

  useEffect(()=>{
    const load = async () => {
      if (!orderIdParam) { setError("No order_id"); setLoading(false); return; }
      setLoading(true); setError(null);
      try{
        if (!token) throw new Error("Auth required");
        const res = await fetchWithFallback(`/api/admin/orders/${orderIdParam}`,{
          headers:{Accept:"application/json",Authorization:`Bearer ${token}`}
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message||"Failed to load order");
        setOrder(data);
      }catch(e:any){ setError(e?.message||"Failed to load order"); }
      finally{ setLoading(false); }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[orderIdParam]);

  const markShipped = async () => {
    if (!order) return;
    setMsg(null); setError(null);
    try{
      const res = await fetchWithFallback(`/api/admin/orders/${order.id}/mark-shipped`,{
        method:"PATCH",
        headers:{Accept:"application/json",Authorization:`Bearer ${token}`}
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message||"Failed");
      setMsg("Order marked shipped.");
      setOrder((o:any)=> o ? {...o,status:"shipped"}:o);
    }catch(e:any){ setError(e?.message||"Failed"); }
  };
  const markToReceive = async () => {
    if (!order) return;
    setMsg(null); setError(null);
    try{
      const res = await fetchWithFallback(`/api/admin/orders/${order.id}/mark-to-receive`,{
        method:"PATCH",
        headers:{Accept:"application/json",Authorization:`Bearer ${token}`}
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message||"Failed");
      setMsg("Order moved to 'to receive'.");
      setOrder((o:any)=> o ? {...o,status:"to receive"}:o);
    }catch(e:any){ setError(e?.message||"Failed"); }
  };

  return (
    <SidebarAdmin>
      <main className="mx-auto max-w-4xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-[#004236]">Order Detail</h1>
          <button onClick={()=>router.push("/pages/admin/order")} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:border-[#004236] hover:text-[#004236]">
            Back
          </button>
        </div>
        {msg && <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{msg}</div>}
        {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {loading ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-6 text-sm text-zinc-600">Loading...</div>
        ) : !order ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-6 text-sm text-zinc-600">Order not found.</div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-lg border border-zinc-200 bg-white p-6">
              <h2 className="text-base font-semibold mb-4">Summary</h2>
              {(() => {
                const itemsSubtotal = Array.isArray(order.items)
                  ? order.items.reduce((s: number, it: any) => s + Number(it.price || 0) * Number(it.quantity || 0), 0)
                  : 0;
                const shippingFee = Math.max(0, Number(order.total_price || 0) - itemsSubtotal);
                const created =
                  order.created_at ? new Date(order.created_at).toLocaleString() : "-";
                const customerName =
                  order.user?.name || order.user_name || order.customer_name || "-";
                const customerEmail =
                  order.user?.email || order.user_email || "-";
                return (
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="text-zinc-500">Order Code</dt>
                      <dd className="text-zinc-900 font-medium">{order.order_code}</dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">Status</dt>
                      <dd className="mt-1">{statusBadge(order.status, order.is_complete)}</dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">Total</dt>
                      <dd className="text-zinc-900">{formatIDR(order.total_price)}</dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">Subtotal</dt>
                      <dd className="text-zinc-900">{formatIDR(itemsSubtotal)}</dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">Shipping</dt>
                      <dd className="text-zinc-900">{formatIDR(shippingFee)}</dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">Date</dt>
                      <dd className="text-zinc-900 whitespace-nowrap">{created}</dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">Customer</dt>
                      <dd className="text-zinc-900">{customerName}</dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">Email</dt>
                      <dd className="text-zinc-900">{customerEmail}</dd>
                    </div>
                  </dl>
                );
              })()}
              {order.status==="paid" && (
                <button
                  onClick={markShipped}
                  className="mt-5 mr-3 rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Mark Shipped
                </button>
              )}
              {order.status==="shipped" && (
                <button
                  onClick={markToReceive}
                  className="mt-5 rounded-full bg-sky-600 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-700"
                >
                  Mark To Receive
                </button>
              )}
              {order.status==="to receive" && (
                <span className="mt-5 inline-flex rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700 border border-green-200">
                  Waiting customer confirmation
                </span>
              )}
              {order.status==="completed" && (
                <span className="mt-5 inline-flex rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700 border border-emerald-200">
                  Completed
                </span>
              )}
              {order.status==="cancelled" && (
                <span className="mt-5 inline-flex rounded-full bg-red-100 px-4 py-2 text-sm font-semibold text-red-700 border border-red-200">
                  Cancelled
                </span>
              )}
            </div>

            {/* Shipping Address */}
            <div className="rounded-lg border border-zinc-200 bg-white p-6">
              <h2 className="text-base font-semibold mb-4">Shipping Address</h2>
              {order.address ? (
                <div className="text-sm space-y-1">
                  <div className="font-medium text-zinc-900">{order.address.nama_tempat}</div>
                  <div className="text-zinc-700">{order.address.alamat}</div>
                  <div className="text-zinc-500">
                    {order.address.kecamatan}, {order.address.kabupaten}, {order.address.provinsi}
                  </div>
                  <div className="text-zinc-500">Telp: {order.address.no_telp}</div>
                </div>
              ) : (
                <div className="text-sm text-zinc-600">No address data.</div>
              )}
            </div>

            {/* Items */}
            <div className="rounded-lg border border-zinc-200 bg-white p-6">
              <h2 className="text-base font-semibold mb-4">Items</h2>
              {Array.isArray(order.items) && order.items.length > 0 ? (
                <ul className="divide-y divide-zinc-200">
                  {order.items.map((it:any) => (
                    <li key={it.id} className="py-3 flex items-center gap-4">
                      <div className="h-12 w-12 rounded border border-zinc-200 bg-zinc-50 overflow-hidden">
                        <img
                          src={it.product?.main_image_url || "/images/products/placeholder.jpg"}
                          alt={it.product?.name || "Product"}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-zinc-900">{it.product?.name || `#${it.product_id}`}</div>
                        <div className="text-xs text-zinc-500">Qty: {it.quantity}</div>
                      </div>
                      <div className="text-sm font-semibold text-zinc-800">
                        {formatIDR(Number(it.price) * Number(it.quantity))}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-zinc-600">No items.</div>
              )}
            </div>
          </div>
        )}
      </main>
    </SidebarAdmin>
  );
}
