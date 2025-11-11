"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [threshold, setThreshold] = useState(0);
  const [user, setUser] = useState<{ id: number; name: string; email: string; role: string } | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [cartCount, setCartCount] = useState<number>(0); // distinct product count badge
  const [searchTerm, setSearchTerm] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // New: categories for Shop dropdown
  type Cat = { id: number; name: string; slug: string; image_url?: string | null };
  const [cats, setCats] = useState<Cat[]>([]);
  const [shopOpen, setShopOpen] = useState(false);
  const hoverTimer = useRef<number | null>(null);

  const openShop = () => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    setShopOpen(true);
  };
  const closeShop = () => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setShopOpen(false), 120);
  };

  useEffect(() => {
    if (!searchOpen) return;
    const to = setTimeout(() => searchInputRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(to);
      window.removeEventListener("keydown", onKey);
    };
  }, [searchOpen]);

  const onSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const term = searchTerm.trim();
    if (!term) return;
    router.push(`/pages/user/shop?search=${encodeURIComponent(term)}`);
    setSearchOpen(false);
  };

  useEffect(() => {
    const HEADER_H = 56; // h-14
    const computeThreshold = () => {
      const hero = document.getElementById("hero");
      if (hero) return Math.max((hero as HTMLElement).offsetHeight - HEADER_H, 0);
      return 0;
    };
    const onResize = () => setThreshold(computeThreshold());
    const onScroll = () => {
      const y = window.scrollY || 0;
      const beyondHero = threshold > 0 ? y >= threshold : y > 0;
      setIsScrolled(beyondHero);
    };
    setThreshold(computeThreshold());
    onScroll();
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
    };
  }, [threshold]);

  useEffect(() => {
    // flag presence of token immediately to decide account link target
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    setHasToken(!!token);
    if (!token) return;

    const bases = (() => {
      const env = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
      const set = new Set<string>();
      set.add("http://127.0.0.1:8000");
      set.add("http://localhost:8000");
      if (env) set.add(env);
      set.add("http://backend.test");
      return Array.from(set);
    })();

    (async () => {
      for (const base of bases) {
        try {
          const res = await fetch(`${base}/api/user`, {
            headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
            cache: "no-store",
          });
          if (res && res.ok) {
            const u = await res.json().catch(() => null);
            if (u && u.id) {
              setUser({ id: u.id, name: u.name, email: u.email, role: u.role });
              break;
            }
          }
        } catch {
          // ignore and try next base
        }
      }
    })();
  }, []);

  // New: load categories for dropdown
  useEffect(() => {
    const bases = (() => {
      const env = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
      const set = new Set<string>();
      set.add("http://127.0.0.1:8000");
      set.add("http://localhost:8000");
      if (env) set.add(env);
      set.add("http://backend.test");
      return Array.from(set);
    })();
    (async () => {
      for (const base of bases) {
        try {
          const res = await fetch(`${base}/api/categories`, { headers: { Accept: "application/json" }, cache: "no-store" });
          if (res && res.ok) {
            const data = await res.json();
            const list: Cat[] = (Array.isArray(data) ? data : data?.data || []) as Cat[];
            setCats(list);
            break;
          }
        } catch {}
      }
    })();
  }, []);

  // Helper: fetch cart summary (distinct items count)
  const fetchCartSummary = async (token: string) => {
    const bases = (() => {
      const env = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
      const set = new Set<string>();
      set.add("http://127.0.0.1:8000");
      set.add("http://localhost:8000");
      if (env) set.add(env);
      set.add("http://backend.test");
      return Array.from(set);
    })();
    for (const base of bases) {
      try {
        const res = await fetch(`${base}/api/cart/summary`, {
          headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          if (typeof data?.items_count === "number") {
            setCartCount(data.items_count);
            localStorage.setItem("cart_count", String(data.items_count));
          }
          return;
        }
      } catch {
        // try next base
      }
    }
    // fallback dari localStorage jika tersedia
    const stored = localStorage.getItem("cart_count");
    if (stored) setCartCount(Number(stored) || 0);
  };

  // panggil saat mount jika ada token (tanpa menunggu user)
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    if (token) fetchCartSummary(token);
  }, []);

  // listener custom event & storage cart_updated + cart_count
  useEffect(() => {
    const refresh = () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
      if (token) fetchCartSummary(token);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === "cart_updated" || e.key === "cart_count") {
        const v = localStorage.getItem("cart_count");
        if (v) setCartCount(Number(v) || 0);
        refresh();
      }
    };
    window.addEventListener("cart:updated" as any, refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("cart:updated" as any, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const accountHref = hasToken || user ? "/pages/user/profile" : "/pages/user/login";

  return (
    <header
      className={[
        "fixed inset-x-0 top-0 z-50 border-b transition-all duration-300",
        isScrolled
          ? "bg-[#FDFBF8] border-zinc-200 shadow-sm"
          : "bg-white/30 border-transparent backdrop-blur-md",
      ].join(" ")}
    >
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-3 sm:px-5 relative">
        {/* Left: Logo */}
        <Link
          href="/"
          className="text-[15px] font-semibold tracking-tight text-[#7f2549] hover:opacity-90"
        >
          <img
            src="/images/logo.png"
            alt="Site Logo"
            className="h-8 w-auto object-contain"
            loading="lazy"
          />
        </Link>

        {/* Middle: Links with Shop dropdown */}
        <ul className="hidden sm:flex items-center gap-5 text-[13px]">
          <li>
            <Link href="/" className="font-semibold text-[#004236] transition-colors hover:opacity-80">
              Home
            </Link>
          </li>

          {/* Shop trigger keeps dropdown visible on hover */}
          <li onMouseEnter={openShop} onMouseLeave={closeShop} className="relative">
            <Link href="/pages/user/shop" className="font-semibold text-[#004236] transition-colors hover:opacity-80">
              Shop
            </Link>
          </li>
        </ul>

        {/* Right: Icons */}
        <div className="flex items-center gap-1.5" suppressHydrationWarning>
          {/* Search toggle button */}
          <button
            type="button"
            aria-label="Open search"
            onClick={() => setSearchOpen(o => !o)}
            className="rounded-full p-1.5 text-zinc-700 hover:text-[#004236] hover:bg-zinc-100/70 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="11" cy="11" r="7" strokeWidth="1.7" />
              <path d="M20 20l-3.5-3.5" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </button>

          <Link
            href="/pages/user/cart"
            aria-label="Cart"
            className="relative rounded-full p-1.5 text-zinc-700 hover:text-[#004236] hover:bg-zinc-100/70 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M6 8h12l-1.2 11a2 2 0 0 1-2 1.8H9.2A2 2 0 0 1 7.2 19L6 8Z" strokeWidth="1.7" />
              <path d="M9 8V6a3 3 0 0 1 6 0v2" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-[#004236] px-1 text-[10px] font-semibold leading-[18px] text-white text-center">
                {cartCount}
              </span>
            )}
          </Link>
          <Link
            href={accountHref}
            aria-label="Account"
            className="rounded-full p-1.5 text-zinc-700 hover:text-[#004236] hover:bg-zinc-100/70 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="8" r="3.2" strokeWidth="1.7" />
              <path d="M5 19a7 7 0 0 1 14 0" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </Link>
        </div>

        {/* Search overlay panel */}
        {searchOpen && (
          <div
            className="absolute inset-x-0 top-full z-40 bg-white/90 backdrop-blur border-t border-zinc-200 px-4 py-3 shadow-sm"
            role="dialog"
            aria-label="Product search"
            suppressHydrationWarning
          >
            <form onSubmit={onSubmitSearch} className="flex items-center gap-2">
              <input
                ref={searchInputRef}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search products..."
                className="flex-1 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-[#004236] focus:ring-2 focus:ring-[#004236]/20"
              />
              <button
                type="submit"
                className="rounded-full bg-[#004236] px-4 py-2 text-xs font-semibold text-white hover:bg-[#00362c] transition-colors"
              >
                Search
              </button>
              <button
                type="button"
                aria-label="Close search"
                onClick={() => { setSearchOpen(false); }}
                className="rounded-full p-2 text-zinc-600 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M6 6l12 12M6 18L18 6" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </form>
          </div>
        )}
      </nav>

      {/* Shop dropdown panel: fixed to keep visible while hovering */}
      <div
        onMouseEnter={openShop}
        onMouseLeave={closeShop}
        className={[
          "pointer-events-auto fixed left-0 right-0 top-14 z-40 shadow-sm transition-all",
          shopOpen ? "opacity-100 visible" : "opacity-0 invisible",
          // Match navbar background depending on scroll: above hero (transparent) vs scrolled (solid)
          isScrolled
            ? "bg-[#FDFBF8] border-b border-zinc-200"
            : "bg-white/30 border-b border-transparent backdrop-blur supports-backdrop-blur:backdrop-blur-md"
        ].join(" ")}
      >
        <div className="mx-auto max-w-6xl px-6 py-5">
          {/* Centered categories with larger circular images */}
          <div className="flex flex-wrap items-center justify-center gap-8">
            {cats.length === 0 ? (
              <div className="text-sm text-zinc-600">Loading categories...</div>
            ) : (
              cats.map((c) => (
                <Link
                  key={c.id}
                  href={`/pages/user/shop?category=${encodeURIComponent(c.slug)}`}
                  className="group flex flex-col items-center text-center"
                >
                  <div className="relative h-28 w-28 rounded-full border-2 border-zinc-200 bg-[#FDFBF8] transition-all duration-200 group-hover:border-[#004236] group-hover:shadow-md">
                    {c.image_url ? (
                      <img
                        src={c.image_url}
                        alt={c.name}
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-full text-base text-zinc-500">
                        {c.name?.charAt(0) ?? "?"}
                      </div>
                    )}
                  </div>
                  <div className="mt-3 line-clamp-2 text-sm font-semibold text-zinc-800 transition-colors group-hover:text-[#004236]">
                    {c.name}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
