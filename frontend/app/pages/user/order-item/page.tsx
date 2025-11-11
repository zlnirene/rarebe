"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "../../../components/navbar";
import Footer from "../../../components/footer";

type OrderItem = {
  id: number;
  product_id: number;
  quantity: number;
  price: number;
  total: number;
  product?: { id: number; name: string; slug: string; main_image_url?: string | null } | null;
};
type OrderDetail = {
  id: number;
  order_code: string;
  status: string;
  is_complete: boolean;
  total_price: number;
  subtotal: number;
  shipping_fee: number;
  created_at?: string;
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
  items: OrderItem[];
};
type Review = {
  id: number;
  rating: number;
  review?: string | null;
  user_name?: string | null;
  created_at?: string;
};

const bases = () => {
  const env = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  const set = new Set<string>(["http://127.0.0.1:8000","http://localhost:8000","http://backend.test"]);
  if (env) set.add(env);
  return Array.from(set);
};
async function fetchWithFallback(path: string, init: RequestInit = {}) {
  let last: any = null;
  const list = bases().filter((v,i,a)=>a.indexOf(v)===i);
  for (const b of list) {
    try {
      const c = new AbortController(); const t = setTimeout(()=>c.abort(),8000);
      const r = await fetch(`${b}${path}`, {
        mode:"cors",
        cache:"no-store",
        ...init,
        headers:{ Accept:"application/json", ...(init.headers||{}) },
        signal:c.signal
      });
      clearTimeout(t);
      return r;
    } catch(e:any) { last = e?.name==="AbortError" ? new Error("Request timeout") : e; }
  }
  throw last || new Error("Network unreachable");
}

const formatIDR = (v:number|string) =>
  new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",minimumFractionDigits:0}).format(Number(v||0));

// Add: interactive star picker for review form
const StarPicker = ({
  value = 5,
  onChange,
}: {
  value?: number;
  onChange: (v: number) => void;
}) => {
  const val = Math.max(1, Math.min(5, Number.isFinite(value as number) ? (value as number) : 1));
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          aria-label={`${i} star${i > 1 ? "s" : ""}`}
          className="p-0.5 focus:outline-none focus:ring-2 focus:ring-[#004236]/30 rounded"
          onClick={() => onChange(i)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onChange(i);
            }
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            className={i <= val ? "text-yellow-500" : "text-zinc-300"}
            fill="currentColor"
          >
            <path d="M12 17.3 6.8 20.4l1.2-5.9L3.5 9.8l6-.5L12 3.6l2.5 5.7 6 .5-4.5 4.7 1.2 5.9z" />
          </svg>
        </button>
      ))}
      <span className="ml-2 text-xs text-zinc-600">{val}/5</span>
    </div>
  );
};

const OrderItemFallback = () => (
  <>
    <Navbar />
    <div className="min-h-screen bg-[#FDFBF8] text-zinc-900 pt-16">
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
          Loading order...
        </div>
      </main>
    </div>
    <Footer />
  </>
);

export default function UserOrderDetailPage() {
  return (
    <Suspense fallback={<OrderItemFallback />}>
      <UserOrderDetailPageInner />
    </Suspense>
  );
}

function UserOrderDetailPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const orderCode = params.get("order_code");
  const token = useMemo(()=> (typeof window!=="undefined"?localStorage.getItem("auth_token"):null),[]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState<string|null>(null);
  const [order,setOrder] = useState<OrderDetail|null>(null);
  const [confirming,setConfirming] = useState(false);
  const [reviewsMap,setReviewsMap] = useState<Record<number,Review[]>>({});
  const [reviewsLoading,setReviewsLoading] = useState(false);

  // New: user's own review draft/state per product
  const [myReviews,setMyReviews] = useState<Record<number,{ id: number|null; rating: number; review: string }>>({});
  const [saving,setSaving] = useState<Record<number, boolean>>({});
  const [saveErr,setSaveErr] = useState<Record<number, string|null>>({});

  useEffect(()=>{
    if (!token) { router.replace("/pages/user/login"); return; }
    const load = async () => {
      if (!orderCode) { setError("Missing order_code"); setLoading(false); return; }
      setLoading(true); setError(null);
      try {
        const res = await fetchWithFallback(`/api/orders/${encodeURIComponent(orderCode)}`, {
          headers:{ Accept:"application/json", Authorization:`Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "Failed to load order");
        setOrder(data as OrderDetail);
      } catch(e:any){ setError(e?.message||"Failed to load order"); }
      finally { setLoading(false); }
    };
    load();
  },[orderCode, token, router]);

  useEffect(()=>{
    const loadReviews = async () => {
      if (!order || !token) return;
      const productIds = Array.from(new Set(order.items.map(i=> i.product_id)));
      if (productIds.length === 0) return;
      setReviewsLoading(true);
      try {
        const results = await Promise.all(productIds.map(async pid => {
          try {
            const res = await fetchWithFallback(`/api/products/${pid}/reviews`, { headers:{ Accept:"application/json" } });
            const data = await res.json().catch(()=>[]);
            return { pid, list: Array.isArray(data)? data as Review[] : [] };
          } catch { return { pid, list: [] }; }
        }));
        const map: Record<number,Review[]> = {};
        results.forEach(r => { map[r.pid] = r.list; });
        setReviewsMap(map);
      } finally {
        setReviewsLoading(false);
      }
    };
    loadReviews();
  },[order, token]);

  // Load current user's review per product when order completed
  useEffect(() => {
    if (!order || !token) return;
    const canReview = (order.status === "completed" && !!order.is_complete);
    if (!canReview) return;
    const productIds = Array.from(new Set(order.items.map(i=> i.product_id)));
    if (productIds.length === 0) return;

    (async () => {
      const next: Record<number,{ id:number|null; rating:number; review:string }> = {};
      for (const pid of productIds) {
        try {
          const res = await fetchWithFallback(`/api/reviews/mine?product_id=${pid}`, {
            headers:{ Accept:"application/json", Authorization:`Bearer ${token}` }
          });
          const data = await res.json().catch(()=>null);
          if (res.ok && data && typeof data === "object") {
            next[pid] = {
              id: Number(data.id ?? null) || null,
              rating: Number(data.rating ?? 5) || 5,
              review: String(data.review ?? ""),
            };
          } else {
            next[pid] = { id: null, rating: 5, review: "" };
          }
        } catch {
          next[pid] = { id: null, rating: 5, review: "" };
        }
      }
      setMyReviews(next);
    })();
  }, [order, token]);

  const updateDraft = (pid:number, patch: Partial<{rating:number; review:string}>) => {
    setMyReviews(m => ({ ...m, [pid]: { id: m[pid]?.id ?? null, rating: patch.rating ?? (m[pid]?.rating ?? 5), review: patch.review ?? (m[pid]?.review ?? "") } }));
    setSaveErr(e => ({ ...e, [pid]: null }));
  };

  const submitReview = async (pid:number) => {
    if (!order || !token) return;
    const draft = myReviews[pid] || { id:null, rating:5, review:"" };
    const itemForPid = order.items.find(it => it.product_id === pid);
    const orderItemId = itemForPid?.id ?? null;

    setSaving(s => ({ ...s, [pid]: true }));
    setSaveErr(e => ({ ...e, [pid]: null }));
    try {
      let res: Response;
      if (draft.id) {
        res = await fetchWithFallback(`/api/reviews/${draft.id}`, {
          method:"PUT",
          headers:{ "Content-Type":"application/json", Accept:"application/json", Authorization:`Bearer ${token}` },
          body: JSON.stringify({ rating: draft.rating, review: draft.review })
        });
      } else {
        res = await fetchWithFallback(`/api/reviews`, {
          method:"POST",
          headers:{ "Content-Type":"application/json", Accept:"application/json", Authorization:`Bearer ${token}` },
          body: JSON.stringify({ product_id: pid, order_item_id: orderItemId, rating: draft.rating, review: draft.review })
        });
      }
      const data = await res.json().catch(()=> ({}));
      if (!res.ok) {
        const msg = data?.errors ? Object.values(data.errors).flat().join(" ") : data?.message || "Failed to save review";
        throw new Error(msg);
      }
      // Refresh my review id (for new) and public reviews list for this product
      const newId = data?.id ? Number(data.id) : (draft.id ?? null);
      setMyReviews(m => ({ ...m, [pid]: { id: newId, rating: draft.rating, review: draft.review } }));
      // refresh public list for this pid
      try {
        const r = await fetchWithFallback(`/api/products/${pid}/reviews`, { headers:{ Accept:"application/json" } });
        const d = await r.json().catch(()=>[]);
        setReviewsMap(map => ({ ...map, [pid]: Array.isArray(d) ? d : [] }));
      } catch {}
    } catch(e:any) {
      setSaveErr(errs => ({ ...errs, [pid]: e?.message || "Failed to save review" }));
    } finally {
      setSaving(s => ({ ...s, [pid]: false }));
    }
  };

  const confirmDelivery = async () => {
    if (!order) return;
    setConfirming(true); setError(null);
    try{
      const res = await fetchWithFallback("/api/orders/confirm-delivery",{
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          Accept:"application/json",
          Authorization:`Bearer ${token}`
        },
        body: JSON.stringify({ order_code: order.order_code })
      });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data?.message || "Failed to confirm");
      setOrder(o => o ? { ...o, status: data.status || "completed", is_complete: !!data.is_complete } : o);
    } catch(e:any){ setError(e?.message||"Failed to confirm"); }
    finally{ setConfirming(false); }
  };

  const statusBadge = (s:string, complete:boolean) => {
    const st = s.toLowerCase();
    const base = "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wide";
    switch(st){
      case "pending": return <span className={`${base} bg-amber-100 text-amber-700 border border-amber-200`}>PENDING</span>;
      case "paid": return <span className={`${base} bg-emerald-100 text-emerald-700 border border-emerald-200`}>PAID</span>;
      case "shipped": return <span className={`${base} bg-indigo-100 text-indigo-700 border border-indigo-200`}>SHIPPED</span>;
      case "to receive": return <span className={`${base} bg-sky-100 text-sky-700 border border-sky-200`}>TO RECEIVE</span>;
      case "completed":
        return complete
          ? <span className={`${base} bg-green-100 text-green-700 border border-green-200`}>COMPLETED</span>
          : <span className={`${base} bg-zinc-100 text-zinc-600 border border-zinc-200`}>COMPLETED</span>;
      case "cancelled": return <span className={`${base} bg-red-100 text-red-700 border border-red-200`}>CANCELLED</span>;
      default: return <span className={`${base} bg-zinc-100 text-zinc-600 border border-zinc-200`}>{st}</span>;
    }
  };

  // Add star renderer helper (5 stars)
  const renderStars = (rating: number) => {
    const r = Math.max(0, Math.min(5, rating));
    return (
      <div className="flex items-center gap-1">
        {[1,2,3,4,5].map(i => (
          <svg
            key={i}
            width="14"
            height="14"
            viewBox="0 0 24 24"
            className={i <= r ? "text-yellow-500" : "text-zinc-300"}
            fill="currentColor"
          >
            <path d="M12 17.3 6.8 20.4l1.2-5.9L3.5 9.8l6-.5L12 3.6l2.5 5.7 6 .5-4.5 4.7 1.2 5.9z"/>
          </svg>
        ))}
      </div>
    );
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#FDFBF8] text-zinc-900 pt-16">
        <main className="mx-auto max-w-5xl px-6 py-10">
          <h1 className="text-2xl font-semibold tracking-tight">Order Detail</h1>
          <p className="mt-2 text-sm text-zinc-600">Review order status and product reviews.</p>

          {error && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}
          {loading ? (
            <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">Loading...</div>
          ) : !order ? (
            <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">Order not found.</div>
          ) : (
            <div className="mt-6 space-y-8">
              {/* Summary */}
              <section className="rounded-2xl border border-zinc-200 bg-white p-6">
                <h2 className="text-base font-semibold">Summary</h2>
                <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
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
                    <dd className="text-zinc-900">{formatIDR(order.subtotal)}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Shipping</dt>
                    <dd className="text-zinc-900">{formatIDR(order.shipping_fee)}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Date</dt>
                    <dd className="text-zinc-900">
                      {order.created_at ? new Date(order.created_at).toLocaleString() : "-"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Address</dt>
                    <dd className="text-zinc-900 whitespace-pre-line">
                      {order.address
                        ? `${order.address.nama_tempat} (${order.address.no_telp})
${order.address.alamat}
${order.address.kecamatan}, ${order.address.kabupaten}, ${order.address.provinsi}`
                        : "-"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Courier</dt>
                    <dd className="text-zinc-900">
                      {order.courier ? `${order.courier.name}` : "-"}
                    </dd>
                  </div>
                </dl>
                {order.status === "to receive" && !order.is_complete && (
                  <button
                    onClick={confirmDelivery}
                    disabled={confirming}
                    className="mt-5 rounded-full bg-[#004236] px-5 py-2 text-sm font-semibold text-white hover:bg-[#00362c] disabled:opacity-50"
                  >
                    {confirming ? "Processing..." : "Complete Order"}
                  </button>
                )}
              </section>

              {/* Items */}
              <section className="rounded-2xl border border-zinc-200 bg-white p-6">
                <h2 className="text-base font-semibold">Items</h2>
                {order.items.length === 0 ? (
                  <div className="mt-4 text-sm text-zinc-600">No items.</div>
                ) : (
                  <ul className="mt-4 space-y-4">
                    {order.items.map(it => (
                      <li key={it.id} className="flex items-center gap-4">
                        <img
                          src={it.product?.main_image_url || "/images/products/placeholder.jpg"}
                          alt={it.product?.name || "Product"}
                          className="h-14 w-14 rounded object-cover"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-zinc-900">
                            {it.product?.name || "Product"}
                          </div>
                          <div className="text-xs text-zinc-500">Qty {it.quantity}</div>
                        </div>
                        <div className="text-sm text-zinc-900">{formatIDR(it.total)}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Reviews */}
              <section className="rounded-2xl border border-zinc-200 bg-white p-6">
                <h2 className="text-base font-semibold">Reviews for Ordered Products</h2>
                {/* Show form gate note if not completed */}
                {(!order || order.status !== "completed" || !order.is_complete) ? (
                  <div className="mt-3 text-sm text-zinc-600">
                    You can write a review after you complete this order.
                  </div>
                ) : null}

                {reviewsLoading ? (
                  <div className="mt-4 text-sm text-zinc-600">Loading reviews...</div>
                ) : (
                  <div className="mt-4 space-y-6">
                    {order && order.items.map(it => {
                      const pid = it.product_id;
                      const list = reviewsMap[pid] || [];
                      const mine = myReviews[pid];
                      const canReview = order.status === "completed" && !!order.is_complete;

                      return (
                        <div key={`rev-block-${pid}`}>
                          <h3 className="text-sm font-semibold text-[#004236] mb-2">
                            {it.product?.name || `Product #${pid}`}
                          </h3>

                          {/* Review Form (only when order completed) */}
                          {canReview && (
                            <div className="mb-3 rounded-md border border-zinc-200 p-3">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                <label className="text-xs font-semibold text-zinc-700">Your Rating</label>
                                <StarPicker
                                  value={mine?.rating ?? 5}
                                  onChange={(v) => updateDraft(pid, { rating: v })}
                                />
                              </div>
                              <div className="mt-2">
                                <label className="text-xs font-semibold text-zinc-700">Your Review</label>
                                <textarea
                                  rows={3}
                                  value={mine?.review ?? ""}
                                  onChange={(e)=>updateDraft(pid,{ review: e.target.value })}
                                  className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004236]/30"
                                  placeholder="Share your experience..."
                                />
                              </div>
                              {saveErr[pid] && (
                                <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                                  {saveErr[pid]}
                                </div>
                              )}
                              <div className="mt-2 flex justify-end">
                                <button
                                  type="button"
                                  onClick={()=>submitReview(pid)}
                                  disabled={!!saving[pid]}
                                  className="rounded-full bg-[#004236] px-4 py-2 text-xs font-semibold text-white hover:bg-[#00362c] disabled:opacity-50"
                                >
                                  {mine?.id ? (saving[pid] ? "Updating..." : "Update Review") : (saving[pid] ? "Saving..." : "Save Review")}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Public reviews list */}
                          {list.length === 0 ? (
                            <div className="text-xs text-zinc-500">No reviews.</div>
                          ) : (
                            <ul className="space-y-3">
                              {list.map(r => (
                                <li
                                  key={r.id}
                                  className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-zinc-800">
                                      {r.user_name || "User"}
                                    </span>
                                    <span className="text-[10px] text-zinc-500">
                                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : "-"}
                                    </span>
                                  </div>
                                  <div className="mt-2">{renderStars(r.rating)}</div>
                                  {r.review && (
                                    <p className="mt-1 text-[11px] leading-relaxed text-zinc-700">
                                      {r.review}
                                    </p>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          )}
        </main>
      </div>
      <Footer />
    </>
  );
}
