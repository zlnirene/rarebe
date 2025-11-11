"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Navbar from "../../../components/navbar";
import Footer from "../../../components/footer";
import { useRouter } from "next/navigation";

type CartItem = {
  id: number;
  quantity: number;
  price: number; // unit snapshot
  total: number;
  product: { id: number; name: string; slug: string; main_image_url: string | null } | null;
};

const formatIDR = (n: number | string) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(Number(n || 0));

const resolveApiBases = () => {
  const env = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  const set = new Set<string>();
  set.add("http://127.0.0.1:8000");
  set.add("http://localhost:8000");
  if (env) set.add(env);
  set.add("http://backend.test");
  return Array.from(set);
};

async function fetchWithFallback(path: string, init: RequestInit) {
  const bases = resolveApiBases();
  let lastErr: any = null;
  for (const base of bases) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(`${base}${path}`, { cache: "no-store", ...init, signal: controller.signal });
      clearTimeout(timeout);
      if (!res) throw new Error("Network error");
      return res;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Network error");
}

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const token = useMemo(() => (typeof window !== "undefined" ? localStorage.getItem("auth_token") : null), []);
  const router = useRouter();

  const loadCart = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithFallback("/api/cart", {
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to load cart");
      setItems((data?.items || []) as CartItem[]);
    } catch (e: any) {
      setError(e?.message || "Failed to load cart");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      window.location.href = "/pages/user/login";
      return;
    }
    loadCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const subtotal = useMemo(() => items.reduce((sum, i) => sum + Number(i.total || 0), 0), [items]);

  const inc = async (id: number) => {
    try {
      const item = items.find((i) => i.id === id);
      if (!item) return;
      const res = await fetchWithFallback(`/api/cart/item/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ quantity: item.quantity + 1 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to update item");
      setItems(data.items || []);
    } catch (e: any) {
      setError(e?.message || "Failed to update item");
    }
  };

  const dec = async (id: number) => {
    try {
      const item = items.find((i) => i.id === id);
      if (!item) return;
      const newQty = Math.max(1, item.quantity - 1);
      const res = await fetchWithFallback(`/api/cart/item/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ quantity: newQty }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to update item");
      setItems(data.items || []);
    } catch (e: any) {
      setError(e?.message || "Failed to update item");
    }
  };

  const removeItem = async (id: number) => {
    try {
      const res = await fetchWithFallback(`/api/cart/item/${id}`, {
        method: "DELETE",
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to remove item");
      setItems(data.items || []);
    } catch (e: any) {
      setError(e?.message || "Failed to remove item");
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#FDFBF8] text-zinc-900 pt-16">
        <main className="mx-auto max-w-6xl px-6 py-10">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Your Bag</h1>
          <p className="mt-2 text-sm text-zinc-600">Review your items and proceed to checkout.</p>

          {error && <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
            <section className="lg:col-span-8">
              <div className="rounded-2xl border border-zinc-200 bg-white">
                {loading ? (
                  <div className="p-8 text-center text-sm text-zinc-600">Loading...</div>
                ) : items.length === 0 ? (
                  <div className="p-8 text-center text-sm text-zinc-600">
                    Your cart is empty.{" "}
                    <Link href="/pages/user/shop" className="text-[#7f2549] underline">
                      Continue shopping
                    </Link>
                    .
                  </div>
                ) : (
                  <ul className="divide-y divide-zinc-200">
                    {items.map((item) => (
                      <li key={item.id} className="p-4 sm:p-5">
                        <div className="flex items-start gap-4">
                          <Link
                            href={`/pages/user/product-detail?slug=${encodeURIComponent(item.product?.slug || "")}`}
                            className="block h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-[#FDFBF8]"
                          >
                            <img
                              src={item.product?.main_image_url || "/images/products/placeholder.jpg"}
                              alt={item.product?.name || "Product"}
                              className="h-full w-full object-cover"
                            />
                          </Link>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <Link
                                  href={`/pages/user/product-detail?slug=${encodeURIComponent(item.product?.slug || "")}`}
                                  className="line-clamp-2 text-sm font-medium text-zinc-900 hover:text-[#7f2549]"
                                >
                                  {item.product?.name || "Product"}
                                </Link>
                                <div className="mt-1 text-sm text-zinc-600">
                                  Unit price: {formatIDR(item.price)}
                                </div>
                              </div>
                              <button
                                aria-label="Remove item"
                                className="rounded-full border border-zinc-200 p-2 text-zinc-600 transition-colors hover:border-red-300 hover:text-red-600"
                                onClick={() => removeItem(item.id)}
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                  <path d="M6 7h12" strokeWidth="1.8" strokeLinecap="round" />
                                  <path d="M9 7v12m6-12v12" strokeWidth="1.8" />
                                  <path d="M10 7h4l-.5-2h-3z" strokeWidth="1.8" />
                                </svg>
                              </button>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                              <div className="inline-flex items-center rounded-full border border-zinc-200">
                                <button
                                  className="px-3 py-2 text-sm font-medium text-zinc-700 hover:text-[#7f2549]"
                                  onClick={() => dec(item.id)}
                                  aria-label="Decrease quantity"
                                >
                                  −
                                </button>
                                <span className="px-4 text-sm">{item.quantity}</span>
                                <button
                                  className="px-3 py-2 text-sm font-medium text-zinc-700 hover:text-[#7f2549]"
                                  onClick={() => inc(item.id)}
                                  aria-label="Increase quantity"
                                >
                                  +
                                </button>
                              </div>

                              <div className="text-right text-sm font-semibold text-zinc-900">
                                {formatIDR(item.total)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-4">
                <Link
                  href="/pages/user/shop"
                  className="inline-flex items-center gap-2 text-sm font-medium text-[#7f2549] hover:underline"
                >
                  ← Continue shopping
                </Link>
              </div>
            </section>

            <aside className="lg:col-span-4">
              <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                <h2 className="text-base font-semibold text-zinc-900">Order Summary</h2>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-600">Subtotal</span>
                    <span className="font-medium text-zinc-900">{formatIDR(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-600">Shipping</span>
                    <span className="font-medium text-zinc-900">Calculated at checkout</span>
                  </div>
                </div>
                <div className="mt-4 border-t border-zinc-200 pt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-zinc-900">Total</span>
                    <span className="text-lg font-semibold text-zinc-900">{formatIDR(subtotal)}</span>
                  </div>
                </div>

                <button
                  className="mt-6 w-full rounded-full bg-[#7f2549] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#6b1f3e] disabled:opacity-50"
                  disabled={items.length === 0}
                  onClick={() => router.push("/pages/user/checkout")}
                >
                  Proceed to Checkout
                </button>
              </div>
            </aside>
          </div>
        </main>
      </div>
      <Footer />
    </>
  );
}
