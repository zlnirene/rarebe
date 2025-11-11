"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SidebarAdmin from "../../../components/sidebaradmin";

type Category = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  image_url?: string | null;
  is_active: boolean;
};

const resolveApiBases = () => {
  const env = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  const set = new Set<string>();
  // Prefer local loopback first to reduce DNS/CORS issues
  set.add("http://127.0.0.1:8000");
  set.add("http://localhost:8000");
  if (env) set.add(env);
  set.add("http://backend.test");
  return Array.from(set);
};

async function fetchWithFallback(path: string, init: RequestInit) {
  const bases = resolveApiBases()
    .filter((v, i, a) => a.indexOf(v) === i); // dedupe
  let lastErr: any = null;
  for (const base of bases) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${base}${path}`, {
        mode: "cors",
        cache: "no-store",
        ...init,
        headers: {
          Accept: "application/json",
          ...(init.headers || {}),
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return { res, base };
    } catch (e: any) {
      lastErr = (e?.name === "AbortError") ? new Error("Request timeout") : e;
    }
  }
  throw lastErr || new Error("Network unreachable");
}

export default function AdminCategoryPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiUsed, setApiUsed] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(true);

  const token = useMemo(() => (typeof window !== "undefined" ? localStorage.getItem("admin_token") : null), []);

  const [form, setForm] = useState<{
    id: number | null;
    name: string;
    slug: string;
    description: string;
    image: File | null;
    imagePreview: string | null;
    is_active: boolean;
  }>({
    id: null,
    name: "",
    slug: "",
    description: "",
    image: null,
    imagePreview: null,
    is_active: true,
  });

  const loadCategories = async () => {
    setLoading(true);
    setError(null);
    setMsg(null);
    try {
      // If no token, fallback to public endpoint (read-only)
      if (!token) {
        setIsAdmin(false);
        const { res, base } = await fetchWithFallback("/api/categories", {
          headers: { Accept: "application/json" },
        });
        setApiUsed(`${base}/api/categories`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "Failed to load categories");
        setCategories(Array.isArray(data) ? data : data?.data || []);
        return;
      }

      // Try admin endpoint first
      const { res, base } = await fetchWithFallback("/api/admin/categories", {
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      });
      setApiUsed(`${base}/api/admin/categories`);

      if (res.ok) {
        const data = await res.json();
        setIsAdmin(true);
        setCategories(Array.isArray(data) ? data : data?.data || []);
      } else if (res.status === 401 || res.status === 403) {
        // Forbidden/Unauthorized -> fallback to public (read-only)
        setIsAdmin(false);
        const { res: resPublic, base: basePublic } = await fetchWithFallback("/api/categories", {
          headers: { Accept: "application/json" },
        });
        setApiUsed(`${basePublic}/api/categories`);
        const dataPublic = await resPublic.json();
        if (!resPublic.ok) throw new Error(dataPublic?.message || "Failed to load categories");
        setCategories(Array.isArray(dataPublic) ? dataPublic : dataPublic?.data || []);
      } else {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Failed to load categories");
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        if (!["admin", "superadmin"].includes(user?.role)) {
          throw new Error("Forbidden");
        }
      } catch {
        router.replace("/pages/admin/loginadmin");
      }
    };
    guard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleForm = () => {
    if (!isAdmin) return;
    setShowForm((s) => !s);
  };

  const cancelEdit = () => {
    setShowForm(false);
    setIsEditing(false);
    setForm({
      id: null,
      name: "",
      slug: "",
      description: "",
      image: null,
      imagePreview: null,
      is_active: true,
    });
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/ /g, "-")
      .replace(/[^\w-]+/g, "");
  };

  const onNameInput = (value: string) => {
    setForm((f) => ({
      ...f,
      name: value,
      slug: f.slug ? f.slug : generateSlug(value),
    }));
  };

  const onFileChange = (file: File | null) => {
    if (file) {
      const url = URL.createObjectURL(file);
      setForm((f) => ({ ...f, image: file, imagePreview: url }));
    } else {
      setForm((f) => ({ ...f, image: null, imagePreview: null }));
    }
  };

  const saveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setError("Not authorized.");
      return;
    }
    setError(null);
    setMsg(null);
    try {
      if (!token) throw new Error("Not authenticated.");

      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("description", form.description);
      fd.append("is_active", form.is_active ? "1" : "0");
      if (form.image) fd.append("image", form.image);

      let path = "/api/admin/categories";
      let method = "POST";
      if (isEditing && form.id) {
        path = `/api/admin/categories/${form.id}?_method=PUT`;
        method = "POST"; // Laravel method override
      }

      const { res, base } = await fetchWithFallback(path, {
        method,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: fd,
      });
      setApiUsed(base);

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          data?.errors ? Object.values(data.errors).flat().join(" ") : data?.message || "Save failed";
        throw new Error(msg);
      }

      setMsg(isEditing ? "Category updated." : "Category created.");
      cancelEdit();
      setShowForm(false);
      loadCategories();
    } catch (e: any) {
      setError(e?.message || "Save failed");
    }
  };

  const editCategory = (cat: Category) => {
    if (!isAdmin) return;
    setIsEditing(true);
    setShowForm(true);
    setForm({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description || "",
      image: null,
      imagePreview: cat.image_url || null,
      is_active: !!cat.is_active,
    });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteCategory = async (id: number) => {
    if (!isAdmin) {
      setError("Not authorized.");
      return;
    }
    if (!confirm("Are you sure?")) return;
    setError(null);
    setMsg(null);
    try {
      if (!token) throw new Error("Not authenticated.");
      const { res, base } = await fetchWithFallback(`/api/admin/categories/${id}`, {
        method: "DELETE",
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      });
      setApiUsed(base);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Delete failed");
      }
      setMsg("Category deleted.");
      if (isEditing && form.id === id) cancelEdit();
      loadCategories();
    } catch (e: any) {
      setError(e?.message || "Delete failed");
    }
  };

  return (
    <SidebarAdmin>
      <main className="mx-auto max-w-6xl p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-[#004236]">Category Management</h1>
          {isAdmin ? (
            <button
              onClick={toggleForm}
              className="rounded-lg bg-[#004236] px-4 py-2 text-white shadow transition hover:bg-[#00362c]"
            >
              {showForm ? "Close" : "Add Category"}
            </button>
          ) : (
            <span className="text-xs text-zinc-500">Read-only (login as admin to edit)</span>
          )}
        </div>
        {/* Debug: API used */}
        {/* {apiUsed && (
          <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            API: {apiUsed} {isAdmin ? "(admin)" : "(public)"}
          </div>
        )} */}
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

        {/* Form (admin only) */}
        {isAdmin && showForm && (
          <div className="mb-6 rounded-xl border border-gray-100 bg-white p-6 shadow-md">
            <h2 className="mb-2 text-lg font-semibold text-[#004236]">
              {isEditing ? "Edit Category" : "Add New Category"}
            </h2>
            <p className="mb-5 text-xs text-zinc-500">Kelompokkan produk dengan kategori yang rapi.</p>

            <form onSubmit={saveCategory} className="space-y-6" encType="multipart/form-data">
              <div className="grid gap-6 md:grid-cols-12">
                <div className="md:col-span-7 rounded-lg border border-zinc-100 p-4">
                  <h3 className="text-sm font-semibold text-zinc-800">Detail</h3>
                  <p className="mb-4 text-xs text-zinc-500">Nama, slug, dan deskripsi kategori.</p>

                  {/* Name */}
                  <div>
                    <label className="mb-1 block text-sm text-gray-600">Category Name</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => onNameInput(e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:border-[#004236] focus:outline-none focus:ring-2 focus:ring-[#004236]/40"
                      placeholder="Enter category name"
                    />
                  </div>

                  {/* Slug */}
                  <div>
                    <label className="mb-1 block text-sm text-gray-600">Slug</label>
                    <input
                      type="text"
                      required
                      value={form.slug}
                      onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:border-[#004236] focus:outline-none focus:ring-2 focus:ring-[#004236]/40"
                      placeholder="Auto-generated slug"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="mb-1 block text-sm text-gray-600">Description</label>
                    <textarea
                      rows={2}
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:border-[#004236] focus:outline-none focus:ring-2 focus:ring-[#004236]/40"
                      placeholder="Short description"
                    />
                  </div>

                  <div className="mt-2 text-[11px] text-zinc-500">Aktifkan kategori agar tampil di halaman shop.</div>
                  {/* Active */}
                  <div className="flex items-center gap-3">
                    <input
                      id="is_active"
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                      className="h-4 w-4 accent-[#004236]"
                    />
                    <label htmlFor="is_active" className="text-sm text-gray-700">
                      Active
                    </label>
                  </div>
                </div>

                <div className="md:col-span-5 rounded-lg border border-zinc-100 p-4">
                  <h3 className="text-sm font-semibold text-zinc-800">Image</h3>
                  <p className="mb-4 text-xs text-zinc-500">Rasio 1:1 disarankan (PNG/JPG), ukuran maksimal 1–2MB.</p>

                  {/* Image upload + preview */}
                  <div>
                    <label className="mb-1 block text-sm text-gray-600">Image</label>
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
                </div>
              </div>

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

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-gray-100 bg-white shadow-md">
          <table className="min-w-[1000px] text-left text-sm">
            <thead className="bg-[#f9f5f7] text-xs font-semibold uppercase text-[#004236]">
              <tr>
                <th className="px-6 py-3">#</th>
                <th className="px-6 py-3">Image</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Slug</th>
                <th className="px-6 py-3">Description</th>
                <th className="px-6 py-3 text-center">Active</th>
                <th className="px-6 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-6 text-center text-sm text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="px-6 py-6 text-center text-sm text-red-600">
                    {error}
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-6 text-center text-sm text-gray-500">
                    No categories found.
                  </td>
                </tr>
              ) : (
                categories.map((cat, index) => (
                  <tr key={cat.id} className="transition hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium">{index + 1}</td>
                    <td className="px-6 py-3">
                      {cat.image_url ? (
                        <img
                          src={cat.image_url}
                          alt={cat.name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-gray-400">No image</span>
                      )}
                    </td>
                    <td className="px-6 py-3 whitespace-normal break-words">{cat.name}</td>
                    <td className="px-6 py-3 whitespace-normal break-words">{cat.slug}</td>
                    <td className="px-6 py-3 whitespace-normal break-words">{cat.description}</td>
                    <td className="px-6 py-3 text-center">
                      <span className={cat.is_active ? "text-green-600" : "text-red-600"}>
                        {cat.is_active ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      {isAdmin ? (
                        <>
                          <button
                            onClick={() => editCategory(cat)}
                            className="text-sm text-blue-600 hover:underline"
                          >
                            Edit
                          </button>
                          <span className="px-2 text-gray-300">|</span>
                          <button
                            onClick={() => deleteCategory(cat.id)}
                            className="text-sm text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-zinc-400">—</span>
                      )}
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
