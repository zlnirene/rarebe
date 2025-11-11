"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../../components/navbar";
import Footer from "../../../components/footer";
import { useSearchParams } from "next/navigation";

const formatIDR = (value: number | string) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(Number(value || 0));

type ApiCategory = { id: number; name: string; slug: string };
type ApiProduct = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  price: number | string;
  stock: number;
  main_image_url?: string | null;
  category_id: number;
  category?: { id: number; name: string; slug: string }; // include slug from ShopController
  is_new?: boolean;          // added
  is_best_seller?: boolean;  // added
};

type UiProduct = {
  id: number;
  name: string;
  slug: string;
  price: number;
  image: string | null;
  categoryName: string;
  categorySlug: string | null;
  isNew?: boolean;
  isBestSeller?: boolean;
  stock: number;            // added
  avgRating?: number | null; // added
  soldCount?: number | null;
};

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

// Replace simple fetchWithFallback usage for initial load with a multi-base success search.
async function fetchFirstOkJson(path: string, init: RequestInit) {
  const bases = resolveApiBases();
  let lastErr: string = "All backends failed.";
  for (const base of bases) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(`${base}${path}`, { cache: "no-store", ...init, signal: controller.signal });
      clearTimeout(t);
      if (!res) {
        lastErr = `No response from ${base}${path}`;
        continue;
      }
      if (res.ok) {
        const data = await res.json().catch(() => null);
        return { base, data };
      } else {
        // capture message if possible then try next base
        const data = await res.json().catch(() => null);
        lastErr = data?.message
          ? `${data.message} (status ${res.status} at ${base}${path})`
          : `Status ${res.status} at ${base}${path}`;
        continue;
      }
    } catch (e: any) {
      lastErr = e?.message || `Error at ${base}${path}`;
    }
  }
  throw new Error(lastErr);
}

const shortCategory = (name: string) => {
  return name.split(/\s+/)[0] || name;
};

const ShopFallback = () => (
  <>
    <Navbar />
    <div className="min-h-screen bg-[#FDFBF8] text-zinc-900 pt-16">
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
          Loading shop...
        </div>
      </main>
    </div>
    <Footer />
  </>
);

export default function ShopPage() {
  return (
    <Suspense fallback={<ShopFallback />}>
      <ShopPageInner />
    </Suspense>
  );
}

function ShopPageInner() {
  const router = useRouter();
  const [products, setProducts] = useState<UiProduct[]>([]); // ensure exists
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] =
    useState<"price-asc" | "price-desc" | "name-asc" | "name-desc">("price-asc");
  const sortOptions: Record<"price-asc"|"price-desc"|"name-asc"|"name-desc", string> = {
    "price-asc": "Price ↑",
    "price-desc": "Price ↓",
    "name-asc": "Name A–Z",
    "name-desc": "Name Z–A",
  };
  const params = useSearchParams();
  const paramSlug = params.get("category");
  const paramSearch = params.get("search") || params.get("q") || "";
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Price range filters
  const [priceMin, setPriceMin] = useState<string>("");
  const [priceMax, setPriceMax] = useState<string>("");
  const [appliedPrice, setAppliedPrice] = useState<{ min: number | null; max: number | null }>({ min: null, max: null });

  // Fetch categories once
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const catOk = await fetchFirstOkJson("/api/categories", { headers: { Accept: "application/json" } });
        const catsRaw = catOk.data;
        const cats: ApiCategory[] = Array.isArray(catsRaw) ? catsRaw : (catsRaw?.data || []);
        setCategories(cats);
      } catch (e: any) {
        setError(e?.message || "Failed to load categories");
      }
    };
    loadCategories();
  }, []);

  // Helper: convert products API payload to UiProduct[]
  const mapProducts = (prodsRaw: any[]): UiProduct[] => {
    const catMap = new Map<number, ApiCategory>();
    categories.forEach(c => catMap.set(c.id, c));
    return prodsRaw.map((p: ApiProduct) => {
      const cat = p.category ?? catMap.get(p.category_id);
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: Number(p.price ?? 0),
        image: p.main_image_url || null,
        categoryName: cat?.name || "-",
        categorySlug: cat?.slug || null,
        isNew: !!p.is_new,
        isBestSeller: !!p.is_best_seller,
        stock: p.stock ?? 0,
        avgRating: null,
        soldCount: null,
      };
    });
  };

  // Fetch products (optionally filtered by category IDs and price range)
  const fetchProductsByCategories = async (catIds: number[], min?: number | null, max?: number | null, search?: string) => {
    setLoading(true);
    setError(null);
    try {
      const qPrice = [
        typeof min === "number" && !Number.isNaN(min) ? `min_price=${encodeURIComponent(min)}` : "",
        typeof max === "number" && !Number.isNaN(max) ? `max_price=${encodeURIComponent(max)}` : "",
      ].filter(Boolean).join("&");
      const qSearch = search && search.trim() ? `search=${encodeURIComponent(search.trim())}` : "";
      const qs = [qPrice, qSearch].filter(Boolean).join("&");

      // 0 categories -> all
      if (catIds.length === 0) {
        const url = `/api/shop/products${qs ? `?${qs}` : ""}`;
        const prodOk = await fetchFirstOkJson(url, { headers: { Accept: "application/json" } });
        const raw = Array.isArray(prodOk.data) ? prodOk.data : (prodOk.data?.data || []);
        setProducts(mapProducts(raw));
        return;
      }
      // 1 category -> single filtered request
      if (catIds.length === 1) {
        const url = `/api/shop/products?category_id=${catIds[0]}${qs ? `&${qs}` : ""}`;
        const prodOk = await fetchFirstOkJson(url, { headers: { Accept: "application/json" } });
        const raw = Array.isArray(prodOk.data) ? prodOk.data : (prodOk.data?.data || []);
        setProducts(mapProducts(raw));
        return;
      }
      // Multiple categories -> parallel fetch & merge
      const results = await Promise.all(catIds.map(id =>
        fetchFirstOkJson(`/api/shop/products?category_id=${id}${qs ? `&${qs}` : ""}`, { headers: { Accept: "application/json" } })
          .then(r => Array.isArray(r.data) ? r.data : (r.data?.data || []))
          .catch(() => [])
      ));
      const merged: ApiProduct[] = [];
      const seen = new Set<number>();
      for (const arr of results) {
        for (const p of arr) {
          if (!seen.has(p.id)) {
            seen.add(p.id);
            merged.push(p);
          }
        }
      }
      setProducts(mapProducts(merged));
    } catch (e: any) {
      setError(e?.message || "Failed to load products");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial load of all products (after categories attempt)
  useEffect(() => {
    // Wait until categories loaded (or attempted) before first product fetch to map slugs
    if (categories.length || error || selected.size === 0) {
      fetchProductsByCategories([], appliedPrice.min, appliedPrice.max, searchQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, appliedPrice, searchQuery]);

  // Sync category selection from query param (slug)
  useEffect(() => {
    const s = params.get("category");
    if (s) setSelected(new Set([s]));
    setSearchQuery((params.get("search") || params.get("q") || "").toString());
  }, [params]);

  // Refetch products whenever selection changes (category slug -> id mapping)
  useEffect(() => {
    if (!categories.length) return;
    const catIds = Array.from(selected)
      .map(slug => categories.find(c => c.slug === slug)?.id)
      .filter((v): v is number => typeof v === "number");
    fetchProductsByCategories(catIds, appliedPrice.min, appliedPrice.max, searchQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, categories, appliedPrice, searchQuery]);

  const toggleOption = (slug: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      return next;
    });
  };

  const applyPrice = () => {
    const min = priceMin.trim() === "" ? null : Math.max(0, Number(priceMin));
    const max = priceMax.trim() === "" ? null : Math.max(0, Number(priceMax));
    setAppliedPrice({ min: Number.isFinite(min as number) ? (min as number) : null, max: Number.isFinite(max as number) ? (max as number) : null });
  };
  const clearPrice = () => {
    setPriceMin("");
    setPriceMax("");
    setAppliedPrice({ min: null, max: null });
  };

  // Sorting applied to already filtered (server-side) products
  const sorted = useMemo(() => {
    const arr = [...products];
    switch (sortBy) {
      case "price-asc":
        arr.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        arr.sort((a, b) => b.price - a.price);
        break;
      case "name-asc":
        arr.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        arr.sort((a, b) => b.name.localeCompare(a.name));
        break;
    }
    return arr;
  }, [products, sortBy]);

  const token = useMemo(() => (typeof window !== "undefined" ? localStorage.getItem("auth_token") : null), []);

  const addToCart = async (p: UiProduct): Promise<boolean> => {
    if (!token) {
      router.push("/pages/user/login"); // no alert, just redirect
      return false;
    }
    try {
      const body = { product_id: p.id, quantity: 1 };
      const bases = resolveApiBases();
      for (const base of bases) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10000);
          const res = await fetch(`${base}/api/cart/add`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
            cache: "no-store",
            signal: controller.signal,
          });
          clearTimeout(timeout);
          if (res?.status === 401 || res?.status === 403) {
            router.push("/pages/user/login"); // token invalid -> redirect
            return false;
          }
          if (res && res.ok) {
            const data = await res.json().catch(() => ({}));
            const distinct = Array.isArray(data?.items) ? data.items.length : 0;
            localStorage.setItem("cart_count", String(distinct));
            localStorage.setItem("cart_updated", String(Date.now()));
            window.dispatchEvent(new CustomEvent("cart:updated"));
            return true;
          }
          // non-auth failure: try next base
        } catch {
          // ignore and try next base
        }
      }
      return false; // silent failure
    } catch {
      return false;
    }
  };

  const buyNow = async (p: UiProduct) => {
    if (!token) {
      router.push("/pages/user/login");
      return;
    }
    const ok = await addToCart(p);
    if (ok) router.push("/pages/user/checkout");
  };

  // Fetch average rating for each product (details endpoint)
  const loadRatings = async (list: UiProduct[]) => {
    try {
      const targets = list.filter(p => p.avgRating == null || p.soldCount == null).slice(0, 30);
      const results = await Promise.all(
        targets.map(p =>
          fetchWithFallback(`/api/products/${p.id}/details`, { headers: { Accept: "application/json" } })
            .then(r => r.json().catch(() => ({})))
            .then(d => ({
              id: p.id,
              rating: typeof d.average_rating === "number" ? d.average_rating : null,
              sold: typeof d.sold_count === "number" ? d.sold_count : null,
            }))
            .catch(() => ({ id: p.id, rating: null, sold: null }))
        )
      );
      setProducts(prev =>
        prev.map(p => {
          const found = results.find(r => r.id === p.id);
          return found ? { ...p, avgRating: found.rating, soldCount: found.sold } : p;
        })
      );
    } catch {}
  };

  // Trigger ratings load after products change
  useEffect(() => {
    if (products.length) loadRatings(products);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  const renderStars = (rating: number | null | undefined) => {
    const r = rating || 0;
    return (
      <div className="flex items-center gap-0.5">
        {[1,2,3,4,5].map(s => (
          <svg key={s} width="14" height="14" viewBox="0 0 24 24"
               className={s <= r ? "text-yellow-500" : "text-zinc-300"} fill="currentColor">
            <path d="M12 17.3 6.8 20.4l1.2-5.9L3.5 9.8l6-.5L12 3.6l2.5 5.7 6 .5-4.5 4.7 1.2 5.9z"/>
          </svg>
        ))}
        <span className="ml-1 text-[11px] text-zinc-600">{r ? r.toFixed(2) : "–"}</span>
      </div>
    );
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#FDFBF8] text-zinc-900 pt-16">
        <main className="mx-auto max-w-6xl px-6 py-10">
          <div className="mb-6">
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Shop</h1>
            <p className="mt-2 text-sm text-zinc-600">
              {searchQuery && searchQuery.trim()
                ? `Results for "${searchQuery.trim()}".`
                : "Discover our latest and bestselling products."}
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Sidebar Filters */}
            <aside className="lg:col-span-3">
              <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                <h2 className="mb-3 text-sm font-semibold text-[#004236]">Categories</h2>
                {loading ? (
                  <div className="text-xs text-zinc-600">Loading categories...</div>
                ) : categories.length === 0 ? (
                  <div className="text-xs text-zinc-600">No categories.</div>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {categories.map((c) => {
                        const active = selected.has(c.slug);
                        return (
                          <button
                            key={c.slug}
                            type="button"
                            onClick={() => toggleOption(c.slug)}
                            className={
                              "group relative rounded-full px-4 py-1.5 text-[11px] font-semibold tracking-wide transition " +
                              (active
                                ? "bg-[#004236] text-white shadow-sm"
                                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200")
                            }
                          >
                            {c.name}
                            {active && (
                              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#d6ce4b] text-[9px] font-bold text-[#004236] shadow">
                                ✓
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {selected.size > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelected(new Set())}
                        className="mt-3 inline-flex items-center rounded-full border border-[#004236] px-3 py-1.5 text-[11px] font-semibold text-[#004236] hover:bg-[#004236]/5"
                      >
                        Clear
                      </button>
                    )}
                  </>
                )}

                {/* Price Range */}
                <div className="mt-6 border-t border-zinc-200 pt-4" suppressHydrationWarning>
                  <h3 className="mb-2 text-sm font-semibold text-[#004236]">Price Range</h3>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={priceMin}
                      onChange={(e) => setPriceMin(e.target.value)}
                      placeholder="Min"
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#004236]/30"
                    />
                    <span className="text-xs text-zinc-500">—</span>
                    <input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={priceMax}
                      onChange={(e) => setPriceMax(e.target.value)}
                      placeholder="Max"
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#004236]/30"
                    />
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={applyPrice}
                      className="rounded-full bg-[#004236] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#00362c]"
                    >
                      Apply
                    </button>
                    {(appliedPrice.min !== null || appliedPrice.max !== null) && (
                      <button
                        type="button"
                        onClick={clearPrice}
                        className="rounded-full border border-[#004236] px-3 py-1.5 text-xs font-semibold text-[#004236] hover:bg-[#004236]/5"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {(appliedPrice.min !== null || appliedPrice.max !== null) && (
                    <div className="mt-2 text-[11px] text-zinc-600">
                      Active: {appliedPrice.min !== null ? formatIDR(appliedPrice.min) : "—"} to {appliedPrice.max !== null ? formatIDR(appliedPrice.max) : "—"}
                    </div>
                  )}
                </div>
              </div>
            </aside>

            {/* Product Grid */}
            <section className="lg:col-span-9">
              <div className="mb-4 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <p className="text-xs text-zinc-600">
                  {loading
                    ? "Loading products..."
                    : `Showing ${sorted.length} product${sorted.length !== 1 ? "s" : ""}`}
                </p>
                <div className="flex flex-wrap items-center gap-2" suppressHydrationWarning>
                  <span className="text-xs font-semibold text-[#004236] mr-1">Sort:</span>
                  {Object.entries(sortOptions).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSortBy(key as typeof sortBy)}
                      className={
                        "rounded-full px-3 py-1.5 text-xs font-semibold transition " +
                        (sortBy === key
                          ? "bg-[#004236] text-white"
                          : "border border-zinc-300 text-zinc-700 hover:border-[#004236] hover:text-[#004236]")
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {loading ? (
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
                  Loading...
                </div>
              ) : sorted.length === 0 ? (
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
                  No products found.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {sorted.map((p) => (
                    <article key={p.id} className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md">
                      <a href={`/pages/user/product-detail?slug=${encodeURIComponent(p.slug)}`} className="block relative">
                        <div className="aspect-square w-full overflow-hidden bg-[#FDFBF8]">
                          <img
                            src={p.image || "/images/products/placeholder.jpg"}
                            alt={p.name}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          {(p.isNew || p.isBestSeller) && (
                            <div className="absolute top-2 left-2 flex flex-col gap-1">
                              {p.isNew && (
                                <span className="rounded-full bg-emerald-100/90 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                                  NEW
                                </span>
                              )}
                              {p.isBestSeller && (
                                <span className="rounded-full bg-amber-100/90 px-2 py-1 text-[10px] font-semibold text-amber-700">
                                  BEST
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </a>

                      <div className="p-4">
                        <h3 className="line-clamp-2 text-sm font-medium text-zinc-900">{p.name}</h3>
                        <p className="mt-1 text-sm text-zinc-600">{formatIDR(p.price)}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-xs text-zinc-500">
                            Stock: {p.stock} · Sold: {p.soldCount != null ? p.soldCount : "—"}
                          </span>
                          {renderStars(p.avgRating)}
                        </div>
                        <div className="mt-4 flex items-center gap-2">
                          {/* Buy Now on the left */}
                          <button
                            className="inline-flex flex-1 items-center justify-center rounded-full border border-[#004236] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#004236] transition-colors hover:bg-[#d6ce4b] hover:text-zinc-900"
                            onClick={() => buyNow(p)}
                          >
                            Buy Now
                          </button>
                          {/* Cart button narrower, hover yellow */}
                          <button
                            aria-label="Add to cart"
                            className="inline-flex items-center justify-center rounded-full bg-[#004236] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#d6ce4b] hover:text-[#004236]"
                            onClick={() => addToCart(p)}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M6 6h15l-1.5 9h-13z" />
                              <circle cx="9" cy="20" r="1.5" />
                              <circle cx="18" cy="20" r="1.5" />
                              <path d="M6 6L5 2H2" strokeLinecap="round" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
      <Footer />
    </>
  );
}
