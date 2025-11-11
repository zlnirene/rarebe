"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Navbar from "../../../components/navbar";
import Footer from "../../../components/footer";

const formatIDR = (value: number | string) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(Number(value || 0));

type Category = { id: number; name: string };
type ApiProduct = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  price: number | string;
  stock: number;
  main_image_url?: string | null;
  category_id: number;
  category?: Category;
  is_active: boolean;
  sku?: string | null;              // added
  bpom_number?: string | null;      // added
  long_description?: string | null; // added
  tips?: string | null;             // added
};

type ProductImage = { id:number; image_url:string|null; is_primary:boolean };
type ReviewItem = { id:number; rating:number; comment:string|null; user_name?:string|null; created_at?:string };

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

// Add a lightweight fallback while search params hydrate
const ProductDetailFallback = () => (
  <>
    <Navbar />
    <div className="min-h-screen bg-[#FDFBF8] text-zinc-900 pt-16">
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
          Loading product detail...
        </div>
      </main>
    </div>
    <Footer />
  </>
);

export default function ProductDetailPage() {
  return (
    <Suspense fallback={<ProductDetailFallback />}>
      <ProductDetailPageInner />
    </Suspense>
  );
}

function ProductDetailPageInner() {
  const params = useSearchParams();
  const slug = params.get("slug");
  const idParam = params.get("id");
  const router = useRouter();

  const [product, setProduct] = useState<ApiProduct | null>(null);
  const [related, setRelated] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Added states
  const [soldCount,setSoldCount] = useState<number>(0);
  const [images,setImages] = useState<ProductImage[]>([]);
  const [activeImage,setActiveImage] = useState<string|null>(null);
  const [reviews,setReviews] = useState<ReviewItem[]>([]);
  const [avgRating,setAvgRating] = useState<number|null>(null);
  const [detailsLoading,setDetailsLoading] = useState(false);

  const token = useMemo(() => (typeof window !== "undefined" ? localStorage.getItem("auth_token") : null), []); // added

  const priceFormatted = useMemo(
    () => (product ? formatIDR(product.price ?? 0) : formatIDR(0)),
    [product]
  );

  const loadById = async (id: number) => {
    const res = await fetchWithFallback(`/api/products/${id}`, { headers: { Accept: "application/json" } });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Failed to load product");
    return data as ApiProduct;
  };

  const loadList = async () => {
    const res = await fetchWithFallback(`/api/products`, { headers: { Accept: "application/json" } });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Failed to load products");
    return data as ApiProduct[];
  };

  const loadDetailsExtras = async (id:number) => {
    setDetailsLoading(true);
    try {
      const res = await fetchWithFallback(`/api/products/${id}/details`, { headers:{Accept:"application/json"} });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message||"Failed to load details");
      setSoldCount(data.sold_count || 0);
      setImages(Array.isArray(data.images)?data.images:[]);
      const primary = data.images?.find((i:ProductImage)=>i.is_primary)?.image_url || data.images?.[0]?.image_url || null;
      setActiveImage(primary || null);
      setReviews(Array.isArray(data.reviews)?data.reviews:[]);
      setAvgRating(data.average_rating ?? null);
    } catch(e:any){
      // silent error shown in UI via missing sections
    } finally {
      setDetailsLoading(false);
    }
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      let prod: ApiProduct | null = null;

      if (idParam && /^\d+$/.test(idParam)) {
        prod = await loadById(Number(idParam));
      } else if (slug) {
        const list = await loadList();
        prod = list.find((p) => p.slug === slug) || null;
        if (!prod) throw new Error("Product not found.");
      } else {
        throw new Error("Missing product identifier (use ?id= or ?slug=).");
      }

      setProduct(prod);
      await loadDetailsExtras(prod.id);

      // Related
      const all = await loadList();
      const rel = all
        .filter((p) => p.category_id === prod.category_id && p.id !== prod.id)
        .slice(0, 6);
      setRelated(rel);
    } catch (e: any) {
      setError(e?.message || "Failed to load product");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [slug, idParam]); // eslint-disable-line react-hooks/exhaustive-deps

  const starBar = (rating:number|null) => {
    const r = rating ?? 0;
    return (
      <div className="flex items-center gap-1">
        {[1,2,3,4,5].map(s=>
          <svg key={s} width="16" height="16" viewBox="0 0 24 24" className={s<=r ? "text-yellow-500" : "text-zinc-300"} fill="currentColor">
            <path d="M12 17.3 6.8 20.4l1.2-5.9L3.5 9.8l6-0.5L12 3.6l2.5 5.7 6 .5-4.5 4.7 1.2 5.9z"/>
          </svg>
        )}
        <span className="text-xs text-zinc-600 ml-1">{r ? r.toFixed(2) : "No rating"}</span>
      </div>
    );
  };

  const addToCartGeneric = async (productId: number): Promise<boolean> => { // added
    if (!token) { router.push("/pages/user/login"); return false; }
    const body = { product_id: productId, quantity: 1 };
    const bases = resolveApiBases();
    let last: any = null;
    for (const b of bases) {
      try {
        const c = new AbortController();
        const t = setTimeout(() => c.abort(), 8000);
        const r = await fetch(`${b}/api/cart/add`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
            body: JSON.stringify(body),
            cache: "no-store",
            signal: c.signal
        });
        clearTimeout(t);
        if (r.ok) {
          const data = await r.json().catch(() => ({}));
          const distinct = Array.isArray(data?.items) ? data.items.length : 0;
          try {
            localStorage.setItem("cart_count", String(distinct));
            localStorage.setItem("cart_updated", String(Date.now()));
            window.dispatchEvent(new CustomEvent("cart:updated"));
          } catch {}
          return true;
        } else {
          const d = await r.json().catch(() => ({}));
          last = new Error(d?.message || "Add to cart failed");
        }
      } catch (e) {
        last = e;
      }
    }
    alert(last?.message || "Failed to add to cart");
    return false;
  };

  const buyNow = async (pid: number) => { // added
    const ok = await addToCartGeneric(pid);
    if (ok) router.push("/pages/user/checkout");
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#FDFBF8] text-zinc-900 pt-16">
        <main className="mx-auto max-w-6xl px-6 py-10">
          {loading ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">Loading...</div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>
          ) : !product ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
              Product not found.
            </div>
          ) : (
            <>
              {/* Product header */}
              <section className="grid grid-cols-1 gap-10 md:grid-cols-2">
                {/* Image / Gallery */}
                <div className="space-y-4">
                  <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
                    <div className="aspect-square w-full overflow-hidden bg-[#FDFBF8]">
                      <img
                        src={activeImage || product.main_image_url || "/images/products/placeholder.jpg"}
                        alt={product.name}
                        className="h-full w-full object-cover transition-opacity"
                      />
                    </div>
                  </div>
                  {images.length > 0 && (
                    <ul className="grid grid-cols-5 gap-2">
                      {images.map(img => (
                        <li key={img.id}>
                          <button
                            type="button"
                            onClick={()=> setActiveImage(img.image_url)}
                            className={`block border rounded-lg overflow-hidden ${activeImage===img.image_url ? "border-[#004236]" : "border-zinc-200"} hover:border-[#004236]`}
                          >
                            <img
                              src={img.image_url || "/images/products/placeholder.jpg"}
                              alt="thumb"
                              className="aspect-square w-full object-cover"
                            />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Info */}
                <div className="rounded-2xl">
                  <div className="flex items-start justify-between gap-4">
                    <h1 className="text-2xl font-semibold tracking-tight">{product.name}</h1>
                    <div className="text-xl font-semibold text-[#004236]">{priceFormatted}</div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-zinc-600">
                    {product.category?.name && <span className="font-medium">Category: {product.category.name}</span>}
                    {product.sku && <span>SKU: {product.sku}</span>}
                    {product.bpom_number && <span>BPOM: {product.bpom_number}</span>}
                    <span>Stock: {product.stock}</span>
                    <span>Sold: {soldCount}</span>
                    {starBar(avgRating)}
                  </div>

                  <div className="mt-8 space-y-8">
                    <div>
                      <h2 className="text-sm font-semibold text-zinc-800 uppercase tracking-wide">Overview</h2>
                      <p className="mt-2 text-sm text-zinc-700 whitespace-pre-line">
                        {product.description
                          ? product.description
                          : "Discover an effortless essential crafted to elevate your daily beauty ritual."}
                      </p>
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-zinc-800 uppercase tracking-wide">Product Story</h2>
                      <p className="mt-2 text-sm text-zinc-700 whitespace-pre-line">
                        {product.long_description
                          ? product.long_description
                          : "Inspired by skin-loving comfort and timeless glow, this formula is designed to nourish while enhancing natural radiance."}
                      </p>
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-zinc-800 uppercase tracking-wide">Application Tips</h2>
                      <p className="mt-2 text-sm text-zinc-700 whitespace-pre-line">
                        {product.tips
                          ? product.tips
                          : "Apply gently on clean skin. Layer as desired for buildable coverage and a luminous finish."}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        className="rounded-full bg-[#004236] px-6 py-3 text-sm font-semibold text-white hover:bg-[#00362c]"
                        onClick={() => buyNow(product.id)} // changed
                      >
                        Buy Now
                      </button>
                      <button
                        className="rounded-full border border-[#004236] px-6 py-3 text-sm font-semibold text-[#004236] hover:bg-[#004236]/5"
                        onClick={() => addToCartGeneric(product.id)} // use working add-to-cart
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* Reviews */}
              <section className="mt-12 rounded-2xl border border-zinc-200 bg-white p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-base font-semibold">Customer Reviews</h2>
                  <div>{starBar(avgRating)}</div>
                </div>
                {detailsLoading && reviews.length===0 ? (
                  <div className="text-sm text-zinc-600">Loading reviews...</div>
                ) : reviews.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-zinc-200 p-4 text-sm text-zinc-600">
                    No reviews yet.
                  </div>
                ) : (
                  <ul className="space-y-4">
                    {reviews.map(r => (
                      <li key={r.id} className="rounded-lg border border-zinc-200 bg-white p-4 text-sm">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-zinc-900">{r.user_name || "User"}</div>
                          <div className="flex items-center gap-1">
                            {[1,2,3,4,5].map(s=>
                              <svg key={s} width="14" height="14" viewBox="0 0 24 24" className={s<=r.rating ? "text-yellow-500" : "text-zinc-300"} fill="currentColor">
                                <path d="M12 17.3 6.8 20.4l1.2-5.9L3.5 9.8l6-0.5L12 3.6l2.5 5.7 6 .5-4.5 4.7 1.2 5.9z"/>
                              </svg>
                            )}
                          </div>
                        </div>
                        {r.comment && (
                          <p className="mt-2 text-xs text-zinc-700 whitespace-pre-line">{r.comment}</p>
                        )}
                        <div className="mt-1 text-[10px] text-zinc-500">
                          {r.created_at ? new Date(r.created_at).toLocaleDateString() : ""}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Related */}
              <section className="mt-12">
                <h2 className="text-lg font-semibold">Related Products</h2>
                {related.length === 0 ? (
                  <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
                    No related products.
                  </div>
                ) : (
                  <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {related.map((p) => (
                      <article
                        key={p.id}
                        className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md"
                      >
                        <a
                          href={`/pages/user/product-detail?slug=${encodeURIComponent(p.slug)}`}
                          className="block relative"
                        >
                          <div className="aspect-square w-full overflow-hidden bg-[#FDFBF8]">
                            <img
                              src={p.main_image_url || "/images/products/placeholder.jpg"}
                              alt={p.name}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          </div>
                        </a>
                        <div className="p-4">
                          <h3 className="line-clamp-2 text-sm font-medium text-zinc-900">{p.name}</h3>
                          <p className="mt-1 text-sm text-zinc-600">{formatIDR(p.price ?? 0)}</p>
                          <div className="mt-4 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => buyNow(p.id)}
                              className="inline-flex flex-1 items-center justify-center rounded-full bg-[#004236] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-[#00362c]"
                            >
                              Buy Now
                            </button>
                            <button
                              aria-label="Add to cart"
                              className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white p-2 text-zinc-700 transition-colors hover:border-[#004236] hover:text-[#004236]"
                              onClick={() => addToCartGeneric(p.id)}
                            >
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M6 6h15l-1.5 9h-13z" strokeWidth="1.8" />
                                <circle cx="9" cy="20" r="1.5" />
                                <circle cx="18" cy="20" r="1.5" />
                                <path d="M6 6L5 2H2" strokeWidth="1.8" strokeLinecap="round" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>

            </>
          )}
        </main>
      </div>
      <Footer />
    </>
  );
}
