"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "./components/navbar";
import Footer from "./components/footer";

function RareBeautyVideoSection() {
  return (
    <section className="relative w-full h-[90vh] overflow-hidden group cursor-pointer">
      {/* Image Background (fragrance floral) */}
      <picture className="absolute inset-0 block w-full h-full">
        <source srcSet="/images/fragrance-floral.webp" type="image/webp" />
        <img
          src="/images/fragrance-floral.jpg"
          alt="Fragrance Floral"
          className="absolute inset-0 w-full h-full object-cover brightness-90 transition-all duration-700 group-hover:brightness-75"
          loading="lazy"
        />
      </picture>

      {/* Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />

      {/* Text Content */}
      <div className="absolute inset-0 flex flex-col justify-center items-center text-center px-6 text-white transition-all duration-700 group-hover:scale-105">
        <h2 className="text-3xl md:text-5xl font-semibold tracking-wide mb-4">
          The Body Shop Eau de Parfum
        </h2>
        <p className="text-base md:text-lg max-w-xl mb-6">
          Discover a fragrance that captures confidence, authenticity, and warmth — a delicate blend
          of jasmine, white musk, and soft amber that celebrates individuality in every note.
        </p>

        <a
          href="/product/rarebeauty-edp"
          className="text-lg font-medium underline underline-offset-4 hover:text-[#0a5b46] transition-all duration-300"
        >
          Shop Now →
        </a>
      </div>
    </section>
  );
}

const bases = () => {
  const env = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  const set = new Set<string>();
  set.add("http://127.0.0.1:8000");
  set.add("http://localhost:8000");
  if (env) set.add(env);
  set.add("http://backend.test");
  return Array.from(set);
};

async function apiFetch(path: string, init: RequestInit) {
  const list = bases().filter((v, i, a) => a.indexOf(v) === i);
  let last: any = null;
  for (const b of list) {
    try {
      const c = new AbortController();
      const t = setTimeout(() => c.abort(), 8000);
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

const formatIDR = (value: number | string) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(Number(value || 0));

type HomeProduct = {
  id: number;
  name: string;
  slug: string;
  price: number;
  main_image_url?: string | null;
  is_new?: boolean;
  is_best_seller?: boolean;
  stock: number;
};

type HomeCat = { id: number; name: string; slug: string; image_url?: string | null };

async function fetchBestSellers(): Promise<HomeProduct[]> {
  try {
    const res = await apiFetch("/api/shop/products?is_best_seller=1", { headers: { Accept: "application/json" } });
    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? data as HomeProduct[] : [];
  } catch {
    return [];
  }
}

async function fetchCategories(): Promise<HomeCat[]> {
  try {
    const res = await apiFetch("/api/categories", { headers: { Accept: "application/json" } });
    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? data as HomeCat[] : (Array.isArray(data?.data) ? data.data as HomeCat[] : []);
  } catch {
    return [];
  }
}

export default function Home() {
  const [bestsellers, setBestsellers] = useState<HomeProduct[]>([]);
  const [categories, setCategories] = useState<HomeCat[]>([]);
  const [ratings, setRatings] = useState<Record<number, number | null>>({});
  const router = useRouter();
  const loggedIn = typeof window !== "undefined" && !!localStorage.getItem("auth_token");

  useEffect(() => {
    fetchBestSellers().then(setBestsellers);
    fetchCategories().then(setCategories);
  }, []);

  useEffect(() => {
    if (!bestsellers.length) return;
    (async () => {
      try {
        const results = await Promise.all(
          bestsellers.slice(0, 30).map(async (p) => {
            try {
              const res = await apiFetch(`/api/products/${p.id}/details`, { headers: { Accept: "application/json" } });
              const d = await res.json().catch(() => ({}));
              return { id: p.id, rating: typeof d?.average_rating === "number" ? d.average_rating : null };
            } catch {
              return { id: p.id, rating: null };
            }
          })
        );
        const map: Record<number, number | null> = {};
        results.forEach(r => { map[r.id] = r.rating; });
        setRatings(map);
      } catch {}
    })();
  }, [bestsellers]);

  const renderStars = (rating?: number | null) => {
    const r = rating || 0;
    return (
      <div className="flex items-center gap-0.5">
        {[1,2,3,4,5].map(s => (
          <svg key={s} width="14" height="14" viewBox="0 0 24 24" className={s <= r ? "text-yellow-500" : "text-zinc-300"} fill="currentColor">
            <path d="M12 17.3 6.8 20.4l1.2-5.9L3.5 9.8l6-.5L12 3.6l2.5 5.7 6 .5-4.5 4.7 1.2 5.9z"/>
          </svg>
        ))}
        <span className="ml-1 text-[11px] text-zinc-600">{r ? r.toFixed(2) : "–"}</span>
      </div>
    );
  };

  const addToCartBySlug = async (slug: string) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    if (!token) {
      router.push("/pages/user/login");
      return;
    }
    try {
      const res = await apiFetch(`/api/shop/products/slug/${encodeURIComponent(slug)}`, {
        headers: { Accept: "application/json" },
      });
      const prod = await res.json();
      if (!res.ok || !prod?.id) throw new Error("Product not found");

      const detailRes = await apiFetch(`/api/products/${prod.id}`, { headers: { Accept: "application/json" } });
      const detail = await detailRes.json().catch(() => ({}));
      const hasVariants = Array.isArray(detail?.variants) && detail.variants.length > 0;
      if (hasVariants) {
        window.location.href = `/pages/user/product-detail?slug=${encodeURIComponent(slug)}`;
        return;
      }

      const addRes = await apiFetch(`/api/cart/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ product_id: prod.id, quantity: 1 }),
      });
      if (!addRes.ok) {
        const data = await addRes.json().catch(() => ({}));
        throw new Error(data?.message || "Failed to add to cart");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to add to cart.");
    }
  };

  const buyNow = async (slug: string) => {
    if (!loggedIn) {
      router.push("/pages/user/login");
      return;
    }
    await addToCartBySlug(slug);
    router.push("/pages/user/checkout");
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#FDFBF8] text-zinc-900">
        {/* Hero (full-screen with background image and overlay text) */}
        <section id="hero" className="relative w-full min-h-screen">
          {/* Background image from assets (replace with your image path) */}
          <img
            src="/images/hero.webp"
            alt="Rare Beauty hero"
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />

          {/* Content */}
          <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl items-center px-6">
            <div className="max-w-2xl">
              <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
                Nature-inspired care for body, face, and soul
              </h1>
              <p className="mt-4 text-base text-zinc-100 sm:text-lg lg:text-xl">
                The Body Shop brings ethically sourced, feel-good beauty — made with love for people and the planet.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/pages/user/shop"
                  className="inline-flex items-center justify-center rounded-full bg-white/90 px-6 py-3 text-sm font-semibold text-[#004236] shadow hover:bg-white"
                >
                  Shop Now
                </Link>
                <Link
                  href="/pages/user/shop"
                  className="inline-flex items-center justify-center rounded-full border border-white/70 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/20"
                >
                  Bestsellers
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Bestsellers (Shop-card layout) */}
        <section className="bg-[#FCF8F6] px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900 mb-2">
                Bestsellers
              </h2>
              <Link
                href="/pages/user/shop"
                className="text-xs uppercase tracking-widest underline underline-offset-4 hover:text-[#004236] transition-colors"
              >
                Shop now
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {bestsellers.map((p) => (
                <article key={p.id} className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md">
                  <a href={`/pages/user/product-detail?slug=${encodeURIComponent(p.slug)}`} className="block relative">
                    <div className="aspect-[4/5] w-full overflow-hidden bg-[#FDFBF8]">
                      <img
                        src={p.main_image_url || "/images/products/placeholder.jpg"}
                        alt={p.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      {(p.is_new || p.is_best_seller) && (
                        <div className="absolute top-2 left-2 flex flex-col gap-1">
                          {p.is_new && (
                            <span className="rounded-full bg-emerald-100/90 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                              NEW
                            </span>
                          )}
                          {p.is_best_seller && (
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
                      <span className="text-xs text-zinc-500">Stock: {p.stock ?? 0}</span>
                      {renderStars(ratings[p.id])}
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <button
                        aria-label="Add to cart"
                        className="inline-flex flex-1 items-center justify-center rounded-full bg-[#004236] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#00362c]"
                        onClick={() => addToCartBySlug(p.slug)}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M6 6h15l-1.5 9h-13z" />
                          <circle cx="9" cy="20" r="1.5" />
                          <circle cx="18" cy="20" r="1.5" />
                          <path d="M6 6L5 2H2" strokeLinecap="round" />
                        </svg>
                      </button>
                      <button
                        className="inline-flex flex-1 items-center justify-center rounded-full border border-[#004236] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#004236] transition-colors hover:bg-[#d6ce4b] hover:text-zinc-900"
                        onClick={() => buyNow(p.slug)}
                      >
                        Buy Now
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Shop by Category (dynamic, responsive grid) */}
        <section className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-center text-2xl sm:text-3xl font-semibold text-gray-900 mb-10 tracking-tight">
            Shop By Category
          </h2>
          {categories.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 text-center">
              Loading categories...
            </div>
          ) : (
            <div
              className="grid gap-6"
              style={{ gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" }}
            >
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/pages/user/shop?category=${encodeURIComponent(c.slug)}`}
                  className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-[#FDFBF8] shadow-sm hover:shadow-md transition"
                >
                  <div className="aspect-square w-full overflow-hidden">
                    {c.image_url ? (
                      <img
                        src={c.image_url}
                        alt={c.name}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-4xl font-semibold text-zinc-400">
                        {c.name?.charAt(0) ?? "?"}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-30 group-hover:opacity-40 transition" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <div className="inline-block rounded-md bg-white/90 px-3 py-1 text-xs font-semibold text-[#004236] shadow group-hover:bg-[#004236] group-hover:text-white transition">
                      {c.name}
                    </div>
                  </div>
                  <span className="pointer-events-none absolute inset-0 rounded-xl ring-0 group-hover:ring-2 group-hover:ring-[#004236]/60 transition" />
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Rare Beauty Video Section (kept) */}
        <RareBeautyVideoSection />
      </div>
      <Footer />
    </>
  );
}
