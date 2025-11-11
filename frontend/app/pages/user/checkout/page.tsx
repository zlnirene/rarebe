"use client";

import { useEffect, useMemo, useState, Suspense } from "react"; // added Suspense
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "../../../components/navbar";
import Footer from "../../../components/footer";

// Midtrans Snap types
declare global {
  interface Window {
    snap?: { pay: (token: string, options: any) => void };
  }
}
const MIDTRANS_CLIENT_KEY = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "";

type Address = {
  id: number;
  nama_tempat: string;
  no_telp: string;
  alamat: string;
  kecamatan: string;
  kabupaten: string;
  provinsi: string;
};

type Courier = { id: number; name: string; code?: string | null; price?: number | null };

type CartItem = {
  id: number;
  product_id: number;
  quantity: number;
  price: number;
  total: number;
  product?: { id: number; name: string; slug: string; main_image_url?: string | null } | null;
};

type InitResponse = {
  existing_order?: boolean;
  order_code?: string;
  order_id?: number;
  default_address_id?: number | null;
  default_courier_id?: number | null;
  shipping_fee?: number;
  order_address?: Address | null;
  order_courier?: Courier | null;
  addresses?: Address[];
  couriers?: Courier[];
  cart: { items: CartItem[]; subtotal: number };
};

const formatIDR = (v: number | string) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(Number(v || 0));

const bases = () => {
  const env = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  const set = new Set<string>(["http://127.0.0.1:8000","http://localhost:8000","http://backend.test"]);
  if (env) set.add(env);
  return Array.from(set);
};
async function fetchWithFallback(path: string, init: RequestInit) {
  let last: any = null;
  const list = bases().filter((v, i, a) => a.indexOf(v) === i);
  for (const b of list) {
    try {
      const c = new AbortController(); const t = setTimeout(() => c.abort(), 10000);
      const r = await fetch(`${b}${path}`, {
        mode: "cors",
        cache: "no-store",
        ...init,
        headers: { Accept: "application/json", ...(init.headers || {}) },
        signal: c.signal,
      });
      clearTimeout(t);
      return r;
    } catch (e: any) {
      last = e?.name === "AbortError" ? new Error("Request timeout") : e;
    }
  }
  throw last || new Error("Network unreachable");
}

// Lightweight fallback while search params hydrate
const LoadingCheckout = () => (
  <>
    <Navbar />
    <div className="min-h-screen bg-[#FDFBF8] text-zinc-900 pt-16">
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
          Loading checkout...
        </div>
      </main>
    </div>
    <Footer />
  </>
);

// Wrapper with Suspense (new)
export default function CheckoutPage() {
  return (
    <Suspense fallback={<LoadingCheckout />}>
      <CheckoutPageInner />
    </Suspense>
  );
}

// Renamed original component (was export default function CheckoutPage)
function CheckoutPageInner() {
  const router = useRouter();
  const params = useSearchParams(); // unchanged usage now inside Suspense
  const orderCodeParam = params.get("order_code");

  const token = useMemo(() => (typeof window !== "undefined" ? localStorage.getItem("auth_token") : null), []);

  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [items, setItems] = useState<CartItem[]>([]);
  const [subtotal, setSubtotal] = useState<number>(0);

  const [selectedAddress, setSelectedAddress] = useState<number | null>(null);
  const [selectedCourier, setSelectedCourier] = useState<number | null>(null);
  const [shippingFee, setShippingFee] = useState<number>(0);

  const [existingOrder, setExistingOrder] = useState<boolean>(false);
  const [orderCode, setOrderCode] = useState<string | null>(null);

  const [showAddrForm,setShowAddrForm] = useState(false);
  const [creatingAddr,setCreatingAddr] = useState(false);
  const [addrError,setAddrError] = useState<string|null>(null);
  const [addrForm,setAddrForm] = useState({
    nama_tempat:"",
    no_telp:"",
    alamat:"",
    kecamatan:"",
    kabupaten:"",
    provinsi:""
  });

  const deriveShipping = (courierId: number | null, list: Courier[], fallback?: number) => {
    if (!courierId) return fallback ?? 0;
    const c = list.find(x => x.id === courierId);
    return typeof c?.price === "number" ? Number(c.price) : (fallback ?? 0);
  };

  const loadInit = async () => {
    if (!token) {
      router.replace("/pages/user/login");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const qs = orderCodeParam ? `?order_code=${encodeURIComponent(orderCodeParam)}` : "";
      const res = await fetchWithFallback(`/api/checkout/init${qs}`, {
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      });
      const data: InitResponse = await res.json();
      if (!res.ok) throw new Error((data as any)?.message || "Failed to init checkout");

      setExistingOrder(!!data.existing_order);
      setOrderCode(data.order_code || null);

      // Items and subtotal
      setItems(data.cart?.items || []);
      setSubtotal(Number(data.cart?.subtotal || 0));

      // Addresses
      if (Array.isArray(data.addresses)) setAddresses(data.addresses);
      const defAddr = (data.existing_order ? data.default_address_id ?? data.order_address?.id : data.default_address_id) ?? null;
      setSelectedAddress(defAddr ?? null);

      // Couriers
      if (Array.isArray(data.couriers)) setCouriers(data.couriers);
      const defCourier = (data.existing_order ? data.default_courier_id ?? data.order_courier?.id : data.default_courier_id) ?? null;
      setSelectedCourier(defCourier ?? null);

      // Shipping fee
      const startFee = data.existing_order
        ? Number(data.shipping_fee ?? data.order_courier?.price ?? 0)
        : deriveShipping(defCourier ?? null, data.couriers || [], 0);
      setShippingFee(startFee);
    } catch (e: any) {
      setError(e?.message || "Failed to init checkout");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadInit(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [orderCodeParam, token]);

  useEffect(() => {
    // Update shipping when courier changes (new order flow)
    if (!existingOrder && couriers.length) {
      setShippingFee(deriveShipping(selectedCourier, couriers, 0));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourier, couriers, existingOrder]);

  // Load Midtrans Snap script once
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.snap) return;
    const script = document.createElement("script");
    script.src = "https://app.sandbox.midtrans.com/snap/snap.js";
    if (MIDTRANS_CLIENT_KEY) script.setAttribute("data-client-key", MIDTRANS_CLIENT_KEY);
    script.async = true;
    document.body.appendChild(script);
    return () => {
      // keep script for page lifetime
    };
  }, []);

  const payNow = async () => {
    if (!token) {
      router.replace("/pages/user/login");
      return;
    }
    setPaying(true);
    setError(null);
    setMsg(null);
    try {
      const payload: any = {};
      if (existingOrder && orderCode) {
        payload.order_code = orderCode;
        if (selectedAddress) payload.address_id = selectedAddress;
        if (selectedCourier) payload.courier_id = selectedCourier;
      } else {
        if (!selectedAddress) throw new Error("Please select a shipping address.");
        if (!selectedCourier) throw new Error("Please select a courier.");
        payload.address_id = selectedAddress;
        payload.courier_id = selectedCourier;
      }

      const res = await fetchWithFallback("/api/checkout/pay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to create payment");

      const oc = data?.order_code || orderCode || null;
      const snapToken = data?.snap_token;

      // Use Snap popup if token and snap.js available
      if (snapToken && typeof window !== "undefined" && window.snap?.pay) {
        window.snap.pay(snapToken, {
          onSuccess: async () => {
            // Confirm in case notification not yet processed
            try {
              if (oc) {
                await fetchWithFallback("/api/checkout/confirm", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({ order_code: oc }),
                });
              }
            } catch {}
            if (oc) {
              router.push(`/pages/user/complete-payment?order_code=${encodeURIComponent(oc)}`);
            } else {
              setMsg("Payment success.");
            }
          },
          onPending: () => {
            if (oc) router.push(`/pages/user/complete-payment?order_code=${encodeURIComponent(oc)}`);
            else setMsg("Payment pending.");
          },
          onError: () => {
            setError("Payment error. Please try again.");
          },
          onClose: () => {
            setMsg("Payment popup closed.");
          },
        });
        return;
      }

      // Fallback: redirect URL or vtweb link
      const redirectUrl = data?.redirect_url;
      if (redirectUrl) {
        window.location.href = redirectUrl;
        return;
      }
      if (snapToken) {
        window.location.href = `https://app.sandbox.midtrans.com/snap/v2/vtweb/${encodeURIComponent(snapToken)}`;
        return;
      }

      setMsg("Payment created. Awaiting gateway response.");
    } catch (e: any) {
      setError(e?.message || "Payment failed");
    } finally {
      setPaying(false);
    }
  };

  const saveAddress = async (e:React.FormEvent) => {
    e.preventDefault();
    if (!token) { router.replace("/pages/user/login"); return; }
    setCreatingAddr(true); setAddrError(null);
    try {
      const res = await fetchWithFallback("/api/addresses",{
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          Accept:"application/json",
          Authorization:`Bearer ${token}`
        },
        body: JSON.stringify(addrForm)
      });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) {
        const msg = data?.errors ? Object.values(data.errors).flat().join(" ") : data?.message || "Failed";
        throw new Error(msg);
      }
      setShowAddrForm(false);
      setAddrForm({nama_tempat:"",no_telp:"",alamat:"",kecamatan:"",kabupaten:"",provinsi:""});
      await loadInit();
    } catch(e:any){
      setAddrError(e?.message||"Failed to save address");
    } finally {
      setCreatingAddr(false);
    }
  };

  const total = useMemo(() => subtotal + (shippingFee || 0), [subtotal, shippingFee]);

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#FDFBF8] text-zinc-900 pt-16">
        <main className="mx-auto max-w-5xl px-6 py-10">
          <h1 className="text-2xl font-semibold tracking-tight">Checkout</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Review your order, choose courier, and proceed to payment.
          </p>

          {error && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}
          {msg && (
            <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{msg}</div>
          )}

          {loading ? (
            <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">Loading...</div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
              <section className="lg:col-span-2 space-y-6">
                {/* Address */}
                <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                  <h2 className="text-base font-semibold">Shipping Address</h2>
                  {addresses.length === 0 && !showAddrForm && (
                    <div className="mt-3 text-sm text-zinc-600">
                      No saved addresses. Add a new one below.
                      <button
                        type="button"
                        onClick={()=>setShowAddrForm(true)}
                        className="ml-2 rounded-md border border-[#004236] px-2 py-1 text-xs text-[#004236] hover:bg-[#004236]/5"
                      >Add Address</button>
                    </div>
                  )}
                  {addresses.length > 0 && (
                    <>
                      <div className="mt-3 flex gap-3">
                        <select
                          value={selectedAddress ?? ""}
                          onChange={(e) => setSelectedAddress(e.target.value ? Number(e.target.value) : null)}
                          className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004236]/30"
                        >
                          <option value="">Select address</option>
                          {addresses.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.nama_tempat} • {a.alamat}, {a.kecamatan}, {a.kabupaten}, {a.provinsi}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={()=>setShowAddrForm(s=>!s)}
                          className="rounded-md border border-[#004236] px-3 py-2 text-xs font-semibold text-[#004236] hover:bg-[#004236]/5"
                        >
                          {showAddrForm ? "Close" : "Add Address"}
                        </button>
                      </div>
                    </>
                  )}

                  {showAddrForm && (
                    <form onSubmit={saveAddress} className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
                      {addrError && (
                        <div className="sm:col-span-2 rounded-md border border-red-200 bg-red-50 p-2 text-red-700 text-xs">
                          {addrError}
                        </div>
                      )}
                      <div>
                        <label className="mb-1 block text-xs font-medium text-zinc-600">Nama Tempat</label>
                        <input
                          required
                          value={addrForm.nama_tempat}
                          onChange={e=>setAddrForm(f=>({...f,nama_tempat:e.target.value}))}
                          className="w-full rounded-md border border-zinc-300 px-2 py-2 focus:ring-2 focus:ring-[#004236]/30"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-zinc-600">No. Telp</label>
                        <input
                          required
                          value={addrForm.no_telp}
                          onChange={e=>setAddrForm(f=>({...f,no_telp:e.target.value}))}
                          className="w-full rounded-md border border-zinc-300 px-2 py-2 focus:ring-2 focus:ring-[#004236]/30"
                          placeholder="+62..."
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs font-medium text-zinc-600">Alamat Lengkap</label>
                        <textarea
                          required
                          rows={2}
                          value={addrForm.alamat}
                          onChange={e=>setAddrForm(f=>({...f,alamat:e.target.value}))}
                          className="w-full rounded-md border border-zinc-300 px-2 py-2 focus:ring-2 focus:ring-[#004236]/30"
                          placeholder="Jalan, nomor rumah, RT/RW, dsb."
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-zinc-600">Kecamatan</label>
                        <input
                          required
                          value={addrForm.kecamatan}
                          onChange={e=>setAddrForm(f=>({...f,kecamatan:e.target.value}))}
                          className="w-full rounded-md border border-zinc-300 px-2 py-2 focus:ring-2 focus:ring-[#004236]/30"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-zinc-600">Kabupaten/Kota</label>
                        <input
                          required
                          value={addrForm.kabupaten}
                          onChange={e=>setAddrForm(f=>({...f,kabupaten:e.target.value}))}
                          className="w-full rounded-md border border-zinc-300 px-2 py-2 focus:ring-2 focus:ring-[#004236]/30"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs font-medium text-zinc-600">Provinsi</label>
                        <input
                          required
                          value={addrForm.provinsi}
                          onChange={e=>setAddrForm(f=>({...f,provinsi:e.target.value}))}
                          className="w-full rounded-md border border-zinc-300 px-2 py-2 focus:ring-2 focus:ring-[#004236]/30"
                        />
                      </div>
                      <div className="sm:col-span-2 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={()=>{ setShowAddrForm(false); setAddrError(null); }}
                          className="rounded-md bg-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-300"
                        >Cancel</button>
                        <button
                          type="submit"
                          disabled={creatingAddr}
                          className="rounded-md bg-[#004236] px-4 py-2 text-xs font-semibold text-white hover:bg-[#00362c] disabled:opacity-50"
                        >{creatingAddr ? "Saving..." : "Save Address"}</button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Courier - redesigned with small rounded and palette */}
                <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                  <h2 className="text-base font-semibold">Courier</h2>
                  {couriers.length === 0 ? (
                    <div className="mt-3 text-sm text-zinc-600">No couriers available.</div>
                  ) : (
                    <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {couriers.map((c) => {
                        const active = selectedCourier === c.id;
                        return (
                          <li key={c.id}>
                            <button
                              type="button"
                              onClick={() => setSelectedCourier(c.id)}
                              className={
                                "w-full rounded-md border p-3 text-left transition " +
                                (active
                                  ? "border-[#004236] bg-[#004236] text-white"
                                  : "border-zinc-300 bg-white text-zinc-800 hover:border-[#004236]")
                              }
                            >
                              <div className="flex items-center justify-between">
                                <div className="font-medium">
                                  {c.name} {c.code ? `(${c.code})` : ""}
                                </div>
                                <div
                                  className={
                                    "ml-3 rounded-sm px-2 py-0.5 text-[11px] font-semibold " +
                                    (active
                                      ? "bg-white text-[#004236]"
                                      : "bg-[#d6ce4b] text-[#004236]")
                                  }
                                >
                                  {formatIDR(c.price ?? 0)}
                                </div>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </section>

              {/* Right: order summary */}
              <aside className="space-y-6">
                <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                  <h2 className="text-base font-semibold">Order Summary</h2>
                  <ul className="mt-3 divide-y divide-zinc-200">
                    {items.length === 0 ? (
                      <li className="py-3 text-sm text-zinc-600">No items.</li>
                    ) : (
                      items.map((it) => (
                        <li key={it.id} className="flex items-center gap-3 py-3">
                          <img
                            src={it.product?.main_image_url || "/images/products/placeholder.jpg"}
                            alt={it.product?.name || "Product"}
                            className="h-10 w-10 rounded object-cover"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-zinc-900">
                              {it.product?.name || "Product"}
                            </div>
                            <div className="text-xs text-zinc-500">Qty {it.quantity}</div>
                          </div>
                          <div className="text-sm text-zinc-900">{formatIDR(it.total)}</div>
                        </li>
                      ))
                    )};
                  </ul>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-zinc-600">Subtotal</dt>
                      <dd className="text-zinc-900">{formatIDR(subtotal)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-zinc-600">Shipping</dt>
                      <dd className="text-zinc-900">{formatIDR(shippingFee)}</dd>
                    </div>
                    <div className="flex justify-between border-t border-zinc-200 pt-2 font-semibold">
                      <dt className="text-zinc-800">Total</dt>
                      <dd className="text-[#004236]">{formatIDR(total)}</dd>
                    </div>
                  </dl>

                  <button
                    type="button"
                    disabled={paying || (!existingOrder && (!selectedAddress || !selectedCourier))}
                    onClick={payNow}
                    className="mt-4 w-full rounded-md bg-[#004236] px-4 py-2 text-sm font-semibold text-white hover:text-[#004236] transition hover:bg-[#d6ce4b]"
                  >
                    {paying ? "Processing..." : "Pay Now"}
                  </button>
                </div>

                {existingOrder && orderCode && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    Resuming pending order {orderCode}. You can change address and courier before paying.
                  </div>
                )}
              </aside>
            </div>
          )}
        </main>
      </div>
      <Footer />
    </>
  );
}

// ...existing code (end of file)...
