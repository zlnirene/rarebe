"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SidebarAdmin from "../../../components/sidebaradmin";

const formatIDR = (value: number | string) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(Number(value || 0));

type Category = { id: number; name: string };
type Product = {
  id: number;
  category_id: number;
  name: string;
  slug: string;
  description?: string | null;
  price: number;
  stock: number;
  main_image?: string | null;
  main_image_url?: string | null;
  is_active: boolean;
  category?: Category;
  sku?: string | null;               // added
  bpom_number?: string | null;       // added
  long_description?: string | null;  // added
  tips?: string | null;              // added
  is_new?: boolean;                  // added
  is_best_seller?: boolean;          // added
  modal_price?: number; // added
};

type ProductImage = {
  id: number;
  product_id: number;
  image_path: string;
  image_url?: string;
  is_primary: boolean;
  sort_order: number;
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
  const bases = resolveApiBases().filter((v,i,a)=>a.indexOf(v)===i);
  let lastErr: any = null;
  for (const base of bases) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(()=>controller.abort(),8000);
      const res = await fetch(`${base}${path}`, {
        mode:"cors",
        cache:"no-store",
        ...init,
        headers:{
          Accept:"application/json",
          ...(init.headers||{})
        },
        signal:controller.signal
      });
      clearTimeout(timeout);
      return { res, base };
    } catch(e:any){
      lastErr = (e?.name==="AbortError") ? new Error("Request timeout") : e;
    }
  }
  throw lastErr || new Error("Network unreachable");
}

export default function AdminProductPage() {
  const router = useRouter();
  const token = useMemo(() => (typeof window !== "undefined" ? localStorage.getItem("admin_token") : null), []);
  const [isAdmin, setIsAdmin] = useState(true); // generic flag (admin or superadmin)
  const [userRole, setUserRole] = useState<'admin'|'superadmin'|'other'>('other');

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiUsed, setApiUsed] = useState<string | null>(null); // added to avoid ReferenceError
  const [skuSearch,setSkuSearch] = useState(""); // search by SKU

  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<{
    id: number | null;
    category_id: number | "";
    name: string;
    description: string;
    price: string;
    modal_price: string; // added
    stock: string;
    sku: string;                 // added
    bpom_number: string;         // added
    long_description: string;    // added
    tips: string;                // added
    main_image: File | null;
    imagePreview: string | null;
    is_active: boolean;
    is_new: boolean;            // added
    is_best_seller: boolean;    // added
  }>({
    id: null,
    category_id: "",
    name: "",
    description: "",
    price: "",
    modal_price: "", // added
    stock: "",
    sku: "",                 // added
    bpom_number: "",         // added
    long_description: "",    // added
    tips: "",                // added
    main_image: null,
    imagePreview: null,
    is_active: true,
    is_new: false,            // added
    is_best_seller: false,    // added
  });

  const [gallery,setGallery] = useState<ProductImage[]>([]);
  const [galleryLoading,setGalleryLoading] = useState(false);
  const [galleryErr,setGalleryErr] = useState<string|null>(null);
  const [uploading,setUploading] = useState(false);

  const [stockDelta, setStockDelta] = useState<Record<number, string>>({}); // added
  const [galleryOnly, setGalleryOnly] = useState(false);

  const loadCategories = async () => {
    const { res, base } = await fetchWithFallback("/api/categories", { headers: { Accept: "application/json" } });
    setApiUsed(`${base}/api/categories`);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Failed to load categories");
    // Normalize: support array or { data: [...] }
    const list = (Array.isArray(data) ? data : data?.data || []) as Category[];
    setCategories(list);
  };

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    setMsg(null);
    try {
      if (!token) {
        setIsAdmin(false);
        await loadCategories();
        const { res, base } = await fetchWithFallback("/api/products", { headers: { Accept: "application/json" } });
        setApiUsed(`${base}/api/products`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "Failed to load products");
        const list: Product[] = Array.isArray(data) ? data : (data?.data || []);
        setProducts(list);
        return;
      }
      await loadCategories();
      const { res, base } = await fetchWithFallback("/api/admin/products", {
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      });
      setApiUsed(`${base}/api/admin/products`);
      if (res.ok) {
        const data = await res.json();
        setIsAdmin(true);
        // userRole already set in guard; keep
        const list: Product[] = Array.isArray(data) ? data : (data?.data || []);
        setProducts(list);
      } else if (res.status === 401 || res.status === 403) {
        setIsAdmin(false);
        const { res: resPub, base: basePub } = await fetchWithFallback("/api/products", {
          headers: { Accept: "application/json" },
        });
        setApiUsed(`${basePub}/api/products`);
        const data = await resPub.json();
        if (!resPub.ok) throw new Error(data?.message || "Failed to load products");
        const list: Product[] = Array.isArray(data) ? data : (data?.data || []);
        setProducts(list);
      } else {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Failed to load products");
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const loadGallery = async (productId:number) => {
    if (!token) return;
    setGalleryLoading(true); setGalleryErr(null);
    try {
      const { res } = await fetchWithFallback(`/api/admin/products/${productId}/images`, {
        headers:{Accept:"application/json",Authorization:`Bearer ${token}`}
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message||"Failed load images");
      setGallery(Array.isArray(data)?data:[]);
    } catch(e:any){ setGalleryErr(e?.message||"Failed load images"); }
    finally{ setGalleryLoading(false); }
  };

  const uploadImage = async (file:File, isPrimary:boolean) => {
    if (!token || !form.id) return;
    setUploading(true); setGalleryErr(null);
    try {
      const fd = new FormData();
      fd.append("image", file);
      if (isPrimary) fd.append("is_primary","1");
      const { res } = await fetchWithFallback(`/api/admin/products/${form.id}/images`, {
        method:"POST",
        headers:{Authorization:`Bearer ${token}`},
        body:fd
      });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data?.message||"Upload failed");
      loadGallery(form.id);
    } catch(e:any){ setGalleryErr(e?.message||"Upload failed"); }
    finally{ setUploading(false); }
  };

  const makePrimary = async (img:ProductImage) => {
    if (!token || !form.id) return;
    try {
      const { res } = await fetchWithFallback(`/api/admin/products/${form.id}/images/${img.id}/primary`, {
        method:"PATCH",
        headers:{Accept:"application/json",Authorization:`Bearer ${token}`}
      });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data?.message||"Failed set primary");
      loadGallery(form.id);
    } catch(e:any){ setGalleryErr(e?.message||"Failed set primary"); }
  };

  const deleteImage = async (img:ProductImage) => {
    if (!token || !form.id) return;
    if (!confirm("Delete this image?")) return;
    try {
      const { res } = await fetchWithFallback(`/api/admin/products/${form.id}/images/${img.id}`, {
        method:"DELETE",
        headers:{Accept:"application/json",Authorization:`Bearer ${token}`}
      });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data?.message||"Delete failed");
      loadGallery(form.id);
    } catch(e:any){ setGalleryErr(e?.message||"Delete failed"); }
  };

  const adjustStock = async (p: Product) => {
    if (!['admin','superadmin'].includes(userRole)) return;
    const inc = Number(stockDelta[p.id] || 0);
    if (!inc || isNaN(inc)) return;
    const nextStock = Math.max(0, (Number(p.stock) || 0) + inc);
    setError(null);
    setMsg(null);
    try {
      if (!token) throw new Error("Not authenticated.");
      // Build FormData similar to saveProduct/edit flow with updated stock
      const fd = new FormData();
      fd.append("category_id", String(p.category_id));
      fd.append("name", p.name);
      fd.append("description", String(p.description || ""));
      fd.append("modal_price", String(p.modal_price ?? 0));
      fd.append("price", String(p.price ?? 0));
      fd.append("stock", String(nextStock));
      fd.append("sku", String(p.sku || ""));
      fd.append("bpom_number", String(p.bpom_number || ""));
      fd.append("long_description", String(p.long_description || ""));
      fd.append("tips", String(p.tips || ""));
      fd.append("is_active", p.is_active ? "1" : "0");
      fd.append("is_new", p.is_new ? "1" : "0");
      fd.append("is_best_seller", p.is_best_seller ? "1" : "0");

      const path = `/api/admin/products/${p.id}?_method=PUT`;
      const { res } = await fetchWithFallback(path, {
        method: "POST",
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.errors ? Object.values(data.errors).flat().join(" ") : data?.message || "Update failed";
        throw new Error(msg);
      }
      setMsg(`Stock updated: ${p.name} (+${inc})`);
      setStockDelta(s => ({ ...s, [p.id]: "" }));
      loadProducts();
    } catch (e: any) {
      setError(e?.message || "Failed to update stock");
    }
  };

  useEffect(() => {
    const guard = async () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
      if (!token) {
        router.replace("/pages/admin/loginadmin");
        return;
      }
      try {
        const { res } = await fetchWithFallback("/api/user", {
          headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Unauthorized");
        const user = await res.json();
        if (!["admin", "superadmin"].includes(user?.role)) throw new Error("Forbidden");
        setUserRole(user.role === 'superadmin' ? 'superadmin' : 'admin');
        setIsAdmin(true);
      } catch {
        router.replace("/pages/admin/loginadmin");
      }
    };
    guard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ensure products load on first render (handles both admin/public flows)
  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Disable editing for superadmin (only creation)
  const toggleForm = () => {
    if (!isAdmin || userRole !== 'superadmin') return;
    // superadmin: open blank form only (no edit mode)
    setIsEditing(false);
    setGalleryOnly(false);
    setShowForm((s) => !s);
  };
  const cancelEdit = () => {
    setShowForm(false);
    setIsEditing(false);
    setGalleryOnly(false);
    setForm({
      id: null,
      category_id: "",
      name: "",
      description: "",
      price: "",
      modal_price: "", // added reset
      stock: "",
      sku: "",                 // added reset
      bpom_number: "",         // added reset
      long_description: "",    // added reset
      tips: "",                // added reset
      main_image: null,
      imagePreview: null,
      is_active: true,
      is_new: false,            // added reset
      is_best_seller: false,    // added reset
    });
  };

  const onFileChange = (file: File | null) => {
    if (file) {
      const url = URL.createObjectURL(file);
      setForm((f) => ({ ...f, main_image: file, imagePreview: url }));
    } else {
      setForm((f) => ({ ...f, main_image: null, imagePreview: null }));
    }
  };

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    // Creation: only superadmin; update: admin or superadmin
    if (isEditing && !['admin','superadmin'].includes(userRole)) {
      setError("Only admin can edit products.");
      return;
    }
    if (!isEditing && userRole !== 'superadmin') {
      setError("Only superadmin can add products.");
      return;
    }
    setError(null);
    setMsg(null);
    try {
      if (!token) throw new Error("Not authenticated.");

      const fd = new FormData();
      fd.append("category_id", String(form.category_id));
      fd.append("name", form.name);
      fd.append("description", form.description);
      fd.append("modal_price", form.modal_price || "0");
      fd.append("price", form.price || "0");
      fd.append("stock", form.stock || "0");
      fd.append("sku", form.sku || "");
      fd.append("bpom_number", form.bpom_number || "");
      fd.append("long_description", form.long_description || "");
      fd.append("tips", form.tips || "");
      fd.append("is_active", form.is_active ? "1" : "0");
      fd.append("is_new", form.is_new ? "1" : "0");
      fd.append("is_best_seller", form.is_best_seller ? "1" : "0");
      if (form.main_image) fd.append("main_image", form.main_image);

      let path = "/api/admin/products";
      let method: "POST"|"PUT" = "POST";
      if (isEditing && form.id) {
        // Use Laravel method override for multipart updates (prevents missing fields)
        path = `/api/admin/products/${form.id}?_method=PUT`;
        method = "POST";
      }

      const { res } = await fetchWithFallback(path, {
        method,
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          data?.errors ? Object.values(data.errors).flat().join(" ") : data?.message || "Save failed";
        throw new Error(msg);
      }

      setMsg(isEditing ? "Product updated." : "Product created.");
      cancelEdit();
      loadProducts();
    } catch (e: any) {
      setError(e?.message || "Save failed");
    }
  };

  const editProduct = (p: Product) => {
    // Admin or superadmin can edit
    if (!['admin','superadmin'].includes(userRole)) return;
    setIsEditing(true);
    setGalleryOnly(false);
    setShowForm(true);
    setForm(f => ({
      id: p.id,
      category_id: p.category_id,
      name: p.name,
      description: p.description || "",
      price: String(p.price ?? ""),
      modal_price: String(p.modal_price ?? ""), // added
      stock: String(p.stock ?? ""),
      sku: p.sku || "",                               // added
      bpom_number: p.bpom_number || "",               // added
      long_description: p.long_description || "",     // added
      tips: p.tips || "",                             // added
      main_image: null,
      imagePreview: p.main_image_url || null,
      is_active: !!p.is_active,
      is_new: !!p.is_new,
      is_best_seller: !!p.is_best_seller,
    }));
    loadGallery(p.id);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Superadmin: open gallery manager for existing product (no field editing)
  const openGallery = (p: Product) => {
    if (userRole !== 'superadmin') return;
    setIsEditing(false);
    setGalleryOnly(true);
    setShowForm(true);
    setForm(f => ({
      id: p.id,
      category_id: p.category_id,
      name: p.name,
      description: p.description || "",
      price: String(p.price ?? ""),
      modal_price: String(p.modal_price ?? ""),
      stock: String(p.stock ?? ""),
      sku: p.sku || "",
      bpom_number: p.bpom_number || "",
      long_description: p.long_description || "",
      tips: p.tips || "",
      main_image: null,
      imagePreview: p.main_image_url || null,
      is_active: !!p.is_active,
      is_new: !!p.is_new,
      is_best_seller: !!p.is_best_seller,
    }));
    loadGallery(p.id);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteProduct = async (id: number) => {
    if (userRole !== 'superadmin') {
      setError("Only superadmin can delete products.");
      return;
    }
    if (!confirm("Delete this product?")) return;
    setError(null);
    setMsg(null);
    try {
      if (!token) throw new Error("Not authenticated.");
      const { res } = await fetchWithFallback(`/api/admin/products/${id}`, {
        method: "DELETE",
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Delete failed");
      }
      setMsg("Product deleted.");
      if (isEditing && form.id === id) cancelEdit();
      loadProducts();
    } catch (e: any) {
      setError(e?.message || "Delete failed");
    }
  };

  const visibleProducts = useMemo(
    () => skuSearch.trim()
      ? products.filter(p => (p.sku || "").toLowerCase().includes(skuSearch.trim().toLowerCase()))
      : products,
    [products, skuSearch]
  );

  return (
    <SidebarAdmin>
      <main className="mx-auto max-w-6xl p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-[#004236]">Product Management</h1>
          <div className="flex items-center gap-3">
            <input
              value={skuSearch}
              onChange={e=>setSkuSearch(e.target.value)}
              placeholder="Search SKU..."
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004236]/30"
            />
            {userRole === 'superadmin' && (
              <button
                onClick={toggleForm}
                className="rounded-lg bg-[#004236] px-4 py-2 text-white shadow transition hover:bg-[#00362c]"
              >
                {showForm && !galleryOnly ? "Close" : "Add Product"}
              </button>
            )}
            {userRole === 'admin' && (
              <span className="text-xs text-zinc-500">Admin: edit & adjust stock only (no add/delete)</span>
            )}
            {userRole === 'other' && (
              <span className="text-xs text-zinc-500">Read-only</span>
            )}
          </div>
        </div>
        {msg && (
          <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            {msg}
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Form: shown for add (superadmin) and edit (admin/superadmin). Hidden in gallery-only mode */}
        {showForm && !galleryOnly && (
          <div className="mb-6 rounded-xl border border-gray-100 bg-white p-6 shadow-md">
            <h2 className="mb-2 text-lg font-semibold text-[#004236]">
             {isEditing ? "Edit Product" : "Add New Product"}
            </h2>
            {!isEditing && userRole === 'superadmin' && (
              <p className="mb-5 text-xs text-zinc-500">Superadmin can add products.</p>
            )}
            <form onSubmit={saveProduct} className="space-y-6" encType="multipart/form-data">
              {/* Basic Info */}
              <section className="rounded-lg border border-zinc-100 p-4">
                <h3 className="text-sm font-semibold text-zinc-800">Basic Info</h3>
                <p className="mb-4 text-xs text-zinc-500">Nama dan kategori produk.</p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm text-gray-600">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.category_id}
                      onChange={(e) => setForm((f) => ({ ...f, category_id: Number(e.target.value) || "" }))}
                      required
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:border-[#004236] focus:outline-none focus:ring-2 focus:ring-[#004236]/40"
                    >
                      <option value="">Select category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-[11px] text-zinc-500">Pilih kategori yang sesuai.</p>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm text-gray-600">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:border-[#004236] focus:outline-none focus:ring-2 focus:ring-[#004236]/40"
                      placeholder="Product name"
                    />
                    <p className="mt-1 text-[11px] text-zinc-500">Nama produk akan membentuk slug secara otomatis di backend.</p>
                  </div>
                </div>
              </section>

              {/* Pricing & Stock */}
              <section className="rounded-lg border border-zinc-100 p-4">
                <h3 className="text-sm font-semibold text-zinc-800">Pricing & Stock</h3>
                <p className="mb-4 text-xs text-zinc-500">Harga modal, harga jual, dan stok tersedia.</p>

                <div className="grid gap-4 sm:grid-cols-3">
                  {/* Harga Modal */}
                  <div>
                    <label className="mb-1 block text-sm text-gray-600">Harga Modal</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.modal_price}
                      onChange={(e)=>setForm(f=>({...f,modal_price:e.target.value}))}
                      required
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-[#004236] focus:outline-none focus:ring-2 focus:ring-[#004236]/40"
                      placeholder="0.00"
                    />
                  </div>
                  {/* Harga Jual */}
                  <div>
                    <label className="mb-1 block text-sm text-gray-600">Harga Jual</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.price}
                      onChange={(e)=>setForm(f=>({...f,price:e.target.value}))}
                      required
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-[#004236] focus:outline-none focus:ring-2 focus:ring-[#004236]/40"
                      placeholder="0.00"
                    />
                  </div>
                  {/* Stock */}
                  <div>
                    <label className="mb-1 block text-sm text-gray-600">Stock</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={form.stock}
                      onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:border-[#004236] focus:outline-none focus:ring-2 focus:ring-[#004236]/40"
                      placeholder="0"
                    />
                  </div>
                </div>
              </section>

              {/* Content */}
              <section className="rounded-lg border border-zinc-100 p-4">
                <h3 className="text-sm font-semibold text-zinc-800">Content</h3>
                <p className="mb-4 text-xs text-zinc-500">Deskripsi singkat dan panjang untuk halaman produk.</p>

                {/* Short Description */}
                <div>
                  <label className="mb-1 block text-sm text-gray-600">Short Description</label>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:border-[#004236] focus:outline-none focus:ring-2 focus:ring-[#004236]/40"
                    placeholder="Short description"
                  />
                </div>

                {/* Long Description */}
                <div>
                  <label className="mb-1 block text-sm text-gray-600">Long Description</label>
                  <textarea
                    rows={5}
                    value={form.long_description}
                    onChange={(e) => setForm((f) => ({ ...f, long_description: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:border-[#004236] focus:outline-none focus:ring-2 focus:ring-[#004236]/40"
                    placeholder="Detailed product description"
                  />
                </div>

                {/* Tips */}
                <div>
                  <label className="mb-1 block text-sm text-gray-600">Tips</label>
                  <textarea
                    rows={3}
                    value={form.tips}
                    onChange={(e) => setForm((f) => ({ ...f, tips: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:border-[#004236] focus:outline-none focus:ring-2 focus:ring-[#004236]/40"
                    placeholder="Usage tips, application, etc."
                  />
                </div>
              </section>

              {/* Identifiers */}
              <section className="rounded-lg border border-zinc-100 p-4">
                <h3 className="text-sm font-semibold text-zinc-800">Identifiers</h3>
                <p className="mb-4 text-xs text-zinc-500">SKU dan nomor BPOM (opsional).</p>

                <div className="grid gap-4 sm:grid-cols-2">
                  {/* SKU */}
                  <div>
                    <label className="mb-1 block text-sm text-gray-600">SKU</label>
                    <input
                      type="text"
                      value={form.sku}
                      onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:border-[#004236] focus:outline-none focus:ring-2 focus:ring-[#004236]/40"
                      placeholder="e.g., RB-000123"
                    />
                  </div>
                  {/* BPOM Number */}
                  <div>
                    <label className="mb-1 block text-sm text-gray-600">BPOM Number</label>
                    <input
                      type="text"
                      value={form.bpom_number}
                      onChange={(e) => setForm((f) => ({ ...f, bpom_number: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:border-[#004236] focus:outline-none focus:ring-2 focus:ring-[#004236]/40"
                      placeholder="e.g., NA1820xxxxxxx"
                    />
                  </div>
                </div>
              </section>

              {/* Media */}
              <section className="rounded-lg border border-zinc-100 p-4">
                <h3 className="text-sm font-semibold text-zinc-800">Media</h3>
                <p className="mb-4 text-xs text-zinc-500">Unggah gambar utama berformat JPG/PNG, rasio 1:1 direkomendasikan.</p>

                {/* Main Image */}
                <div>
                  <label className="mb-1 block text-sm text-gray-600">Main Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => onFileChange(e.target.files?.[0] || null)}
                    className="w-full text-zinc-900"
                  />
                  {form.imagePreview && (
                    <div className="mt-2">
                      <img src={form.imagePreview} alt="Preview" className="h-20 rounded object-cover" />
                    </div>
                  )}
                </div>
              </section>

              {/* Flags & Status */}
              <section className="rounded-lg border border-zinc-100 p-4">
                <h3 className="text-sm font-semibold text-zinc-800">Flags & Status</h3>
                <p className="mb-4 text-xs text-zinc-500">Tandai atribut khusus dan tentukan status publikasi.</p>

                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.is_new}
                      onChange={(e) => setForm(f => ({ ...f, is_new: e.target.checked }))}
                      className="h-4 w-4 accent-[#004236]"
                    />
                    <span>New</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.is_best_seller}
                      onChange={(e) => setForm(f => ({ ...f, is_best_seller: e.target.checked }))}
                      className="h-4 w-4 accent-[#004236]"
                    />
                    <span>Best Seller</span>
                  </label>
                </div>

                {/* Status segmented control */}
                <div className="mt-6">
                  <label className="text-[11px] font-semibold tracking-wide text-zinc-600 uppercase">Status</label>
                  <div className="mt-2 inline-flex rounded-full border border-zinc-300 bg-white p-1 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, is_active: true }))}
                      className={
                        "px-4 py-1.5 text-xs font-semibold rounded-full transition " +
                        (form.is_active
                          ? "bg-[#004236] text-white shadow-sm"
                          : "text-zinc-600 hover:bg-zinc-100")
                      }
                    >
                      Active
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, is_active: false }))}
                      className={
                        "px-4 py-1.5 text-xs font-semibold rounded-full transition " +
                        (!form.is_active
                          ? "bg-red-600 text-white shadow-sm"
                          : "text-zinc-600 hover:bg-zinc-100")
                      }
                    >
                      Inactive
                    </button>
                  </div>
                </div>
              </section>

              {/* Sticky action bar */}
              <div className="sticky bottom-0 z-10 -mx-6 -mb-6 border-t border-zinc-200 bg-white/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-white/70">
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="rounded-lg bg-gray-200 px-4 py-2 text-gray-700 transition hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-[#004236] px-4 py-2 text-white transition hover:bg-[#00362c]"
                  >
                    {isEditing ? "Update" : "Save"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Edit mode gallery for both admin and superadmin */}
        {showForm && isEditing && form.id && (
          <div className="mb-6 rounded-xl border border-gray-100 bg-white p-6 shadow-md">
            <h2 className="mb-4 text-sm font-semibold text-[#004236]">Product Gallery</h2>
            <p className="mb-4 text-xs text-zinc-500">
              Unggah beberapa gambar untuk menampilkan produk. Tentukan satu gambar sebagai PRIMARY.
            </p>
            {galleryErr && (
              <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">{galleryErr}</div>
            )}

            {/* Upload Controls */}
            <div className="mb-5 flex flex-wrap gap-3">
              <label className="cursor-pointer rounded-lg border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 shadow-sm hover:border-[#004236] hover:text-[#004236]">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadImage(f, false);
                  }}
                />
                {uploading ? "Uploading..." : "Upload Image"}
              </label>
              <label className="cursor-pointer rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700 shadow-sm hover:bg-indigo-100 hover:border-indigo-400">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadImage(f, true);
                  }}
                />
                {uploading ? "Uploading..." : "Upload & Set Primary"}
              </label>
            </div>

            {/* Gallery Grid */}
            {galleryLoading ? (
              <div className="text-xs text-zinc-600">Loading images...</div>
            ) : gallery.length === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-xs text-zinc-500">
                Belum ada gambar. Unggah untuk mulai membangun gallery.
              </div>
            ) : (
              <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {gallery.map((img) => (
                  <li
                    key={img.id}
                    className="group relative overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm"
                  >
                    <div className="aspect-square w-full overflow-hidden bg-zinc-50">
                      <img
                        src={img.image_url || "/images/products/placeholder.jpg"}
                        alt="Gallery"
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                      {img.is_primary && (
                        <span className="absolute top-1 left-1 rounded bg-[#004236] px-2 py-0.5 text-[10px] font-semibold text-white shadow">
                          PRIMARY
                        </span>
                      )}
                    </div>

                    {/* Hover overlay actions */}
                    <div className="absolute inset-0 flex flex-col items-center justify-end gap-2 bg-gradient-to-t from-black/60 via-black/20 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
                      {!img.is_primary && (
                        <button
                          type="button"
                          onClick={() => makePrimary(img)}
                          className="w-full rounded-md bg-white/90 px-2 py-1 text-[11px] font-semibold text-zinc-800 hover:bg-white"
                        >
                          Set Primary
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => deleteImage(img)}
                        className="w-full rounded-md bg-red-600/90 px-2 py-1 text-[11px] font-semibold text-white hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Superadmin: gallery-only panel for existing product */}
        {userRole === 'superadmin' && showForm && galleryOnly && form.id && (
          <div className="mb-6 rounded-xl border border-gray-100 bg-white p-6 shadow-md">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#004236]">
                Product Gallery: {form.name}
              </h2>
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs hover:bg-zinc-100"
              >
                Close
              </button>
            </div>
            {galleryErr && (
              <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">{galleryErr}</div>
            )}
            <div className="mb-5 flex flex-wrap gap-3">
              <label className="cursor-pointer rounded-lg border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 shadow-sm hover:border-[#004236] hover:text-[#004236]">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadImage(f, false);
                  }}
                />
                {uploading ? "Uploading..." : "Upload Image"}
              </label>
              <label className="cursor-pointer rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700 shadow-sm hover:bg-indigo-100 hover:border-indigo-400">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadImage(f, true);
                  }}
                />
                {uploading ? "Uploading..." : "Upload & Set Primary"}
              </label>
            </div>
            {galleryLoading ? (
              <div className="text-xs text-zinc-600">Loading images...</div>
            ) : gallery.length === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-xs text-zinc-500">
                Belum ada gambar. Unggah untuk mulai membangun gallery.
              </div>
            ) : (
              <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {gallery.map((img) => (
                  <li key={img.id} className="group relative overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
                    <div className="aspect-square w-full overflow-hidden bg-zinc-50">
                      <img
                        src={img.image_url || "/images/products/placeholder.jpg"}
                        alt="Gallery"
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                      {img.is_primary && (
                        <span className="absolute top-1 left-1 rounded bg-[#004236] px-2 py-0.5 text-[10px] font-semibold text-white shadow">
                          PRIMARY
                        </span>
                      )}
                    </div>

                    {/* Hover overlay actions */}
                    <div className="absolute inset-0 flex flex-col items-center justify-end gap-2 bg-gradient-to-t from-black/60 via-black/20 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
                      {!img.is_primary && (
                        <button
                          type="button"
                          onClick={() => makePrimary(img)}
                          className="w-full rounded-md bg-white/90 px-2 py-1 text-[11px] font-semibold text-zinc-800 hover:bg-white"
                        >
                          Set Primary
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => deleteImage(img)}
                        className="w-full rounded-md bg-red-600/90 px-2 py-1 text-[11px] font-semibold text-white hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="overflow-x-auto rounded-lg border border-gray-100 bg-white shadow-md">
          <table className="min-w-[1200px] text-left text-sm" suppressHydrationWarning>
            <thead className="bg-[#f9f5f7] text-xs font-semibold uppercase text-[#004236]">
              <tr>
                <th className="px-6 py-3">#</th>
                <th className="px-6 py-3">Image</th>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Modal Price</th>
                <th className="px-6 py-3">Sale Price</th>
                <th className="px-6 py-3">SKU</th>
                <th className="px-6 py-3">BPOM</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Stock</th>
                <th className="px-6 py-3 text-center">Active</th>
                <th className="px-6 py-3 text-center">Action</th>
                <th className="px-6 py-3 text-center">Flags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {loading ? (
                <tr><td colSpan={11} className="px-6 py-6 text-center text-sm text-gray-500">Loading...</td></tr>
              ) : error ? (
                <tr><td colSpan={11} className="px-6 py-6 text-center text-sm text-red-600">{error}</td></tr>
              ) : visibleProducts.length === 0 ? (
                <tr><td colSpan={11} className="px-6 py-6 text-center text-sm text-gray-500">No products found.</td></tr>
              ) : (
                visibleProducts.map((p, i) => (
                  <tr key={p.id} className="transition hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium">{i + 1}</td>
                    <td className="px-6 py-3">
                      {p.main_image_url ? (
                        <img src={p.main_image_url} alt={p.name} className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <span className="text-gray-400">No image</span>
                      )}
                    </td>
                    <td className="px-6 py-3 whitespace-normal break-words">{p.name}</td>
                    <td className="px-6 py-3">{formatIDR(p.modal_price ?? 0)}</td>
                    <td className="px-6 py-3">{formatIDR(p.price)}</td>
                    <td className="px-6 py-3 whitespace-normal break-words">{p.sku || "-"}</td>
                    <td className="px-6 py-3 whitespace-normal break-words">{p.bpom_number || "-"}</td>
                    <td className="px-6 py-3 whitespace-normal break-words">{p.category?.name || "-"}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <span>{p.stock}</span>
                      {userRole === 'admin' && (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="1"
                            placeholder="+Qty"
                            value={stockDelta[p.id] ?? ""}
                            onChange={(e) => setStockDelta(s => ({ ...s, [p.id]: e.target.value }))}
                            className="w-20 rounded-md border border-zinc-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#004236]/30"
                          />
                          <button
                            type="button"
                            onClick={() => adjustStock(p)}
                            className="rounded-md bg-[#004236] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#00362c]"
                          >
                            Add
                          </button>
                        </div>
                      )}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className={p.is_active ? "text-green-600" : "text-red-600"}>{p.is_active ? "Yes" : "No"}</span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      {userRole === 'admin' && (
                        <button onClick={() => editProduct(p)} className="text-sm text-blue-600 hover:underline">Edit</button>
                      )}
                      {userRole === 'superadmin' && (
                        <div className="flex items-center justify-center gap-3">
                          <button onClick={() => editProduct(p)} className="text-sm text-blue-600 hover:underline">Edit</button>
                          <span className="text-gray-300">|</span>
                          <button onClick={() => openGallery(p)} className="text-sm text-indigo-600 hover:underline">Gallery</button>
                          <span className="text-gray-300">|</span>
                          <button onClick={() => deleteProduct(p.id)} className="text-sm text-red-600 hover:underline">Delete</button>
                        </div>
                      )}
                      {userRole === 'other' && <span className="text-xs text-zinc-400">—</span>}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <div className="flex gap-2">
                        {p.is_new && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">NEW</span>}
                        {p.is_best_seller && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">BEST</span>}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </SidebarAdmin>
  );
}
