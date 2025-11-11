"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SidebarAdmin from "../../../components/sidebaradmin";

type Customer = {
  id: number;
  name: string;
  email: string;
  role: "customer" | "admin" | "superadmin";
  is_active: boolean;
  email_verified_at?: string | null;
  created_at?: string;
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
  const bases = resolveApiBases().filter((v, i, a) => a.indexOf(v) === i);
  let lastErr: any = null;
  for (const base of bases) {
    try {
      const c = new AbortController();
      const t = setTimeout(() => c.abort(), 8000);
      const res = await fetch(`${base}${path}`, {
        mode: "cors",
        cache: "no-store",
        ...init,
        headers: { Accept: "application/json", ...(init.headers || {}) },
        signal: c.signal,
      });
      clearTimeout(t);
      return res;
    } catch (e: any) {
      lastErr = e?.name === "AbortError" ? new Error("Request timeout") : e;
    }
  }
  throw lastErr || new Error("Network unreachable");
}

export default function AdminCustomerPage() {
  const router = useRouter();
  const token = useMemo(() => (typeof window !== "undefined" ? localStorage.getItem("admin_token") : null), []);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [form, setForm] = useState<{
    id: number | null;
    name: string;
    email: string;
    password: string;
    is_active: boolean;
    email_verified: boolean;
  }>({
    id: null,
    name: "",
    email: "",
    password: "",
    is_active: true,
    email_verified: true,
  });

  useEffect(() => {
    const guard = async () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
      if (!token) {
        router.replace("/pages/admin/loginadmin");
        return;
      }
      try {
        const res = await fetchWithFallback("/api/user", {
          headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Unauthorized");
        const user = await res.json();
        if (!["admin", "superadmin"].includes(user?.role)) throw new Error("Forbidden");
      } catch {
        router.replace("/pages/admin/loginadmin");
      }
    };
    guard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    setError(null);
    setMsg(null);
    try {
      if (!token) throw new Error("Not authenticated");
      const qs = search ? `?search=${encodeURIComponent(search)}` : "";
      const res = await fetchWithFallback(`/api/admin/customers${qs}`, {
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data as any)?.message || "Failed to load users");
      const list: Customer[] = Array.isArray(data) ? data : data?.data || [];
      setCustomers(list);
    } catch (e: any) {
      setError(e?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => {
    setIsEditing(false);
    setForm({ id: null, name: "", email: "", password: "", is_active: true, email_verified: true });
    setShowForm(true);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openEdit = (u: Customer) => {
    setIsEditing(true);
    setForm({
      id: u.id,
      name: u.name,
      email: u.email,
      password: "",
      is_active: !!u.is_active,
      email_verified: !!u.email_verified_at,
    });
    setShowForm(true);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelForm = () => {
    setShowForm(false);
    setIsEditing(false);
    setMsg(null);
    setError(null);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (/[^A-Za-z\s]/.test(form.name) || !form.name.trim()) {
      setError("Nama harus angka");
      return;
    }
    setError(null);
    setMsg(null);
    try {
      if (!token) throw new Error("Not authenticated");
      const payload: any = {
        name: form.name,
        email: form.email,
        is_active: form.is_active,
        email_verified: form.email_verified,
      };
      if (!isEditing || form.password.trim()) payload.password = form.password;

      const method = isEditing ? "PUT" : "POST";
      const path = isEditing ? `/api/admin/customers/${form.id}` : "/api/admin/customers";

      const res = await fetchWithFallback(path, {
        method,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          data?.errors ? Object.values(data.errors).flat().join(" ") : data?.message || "Save failed";
        throw new Error(msg);
      }
      setMsg(isEditing ? "Customer updated." : "Customer created.");
      cancelForm();
      loadCustomers();
    } catch (e: any) {
      setError(e?.message || "Save failed");
    }
  };

  const toggleActive = async (u: Customer) => {
    setError(null);
    setMsg(null);
    try {
      if (!token) throw new Error("Not authenticated");
      const res = await fetchWithFallback(`/api/admin/customers/${u.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: !u.is_active }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to update status");
      loadCustomers();
    } catch (e: any) {
      setError(e?.message || "Failed to update status");
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this customer?")) return;
    setError(null);
    setMsg(null);
    try {
      if (!token) throw new Error("Not authenticated");
      const res = await fetchWithFallback(`/api/admin/customers/${id}`, {
        method: "DELETE",
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Delete failed");
      setMsg("Customer deleted.");
      loadCustomers();
    } catch (e: any) {
      setError(e?.message || "Delete failed");
    }
  };

  return (
    <SidebarAdmin>
      <main className="mx-auto max-w-6xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-[#004236]">Customer Management</h1>
          <div className="flex items-center gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name/email..."
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#004236] focus:ring-2 focus:ring-[#004236]/30"
            />
            <button
              onClick={loadCustomers}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm hover:border-[#004236] hover:text-[#004236]"
            >
              Search
            </button>
            <button
              onClick={openCreate}
              className="rounded-lg bg-[#004236] px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-[#00362c]"
            >
              Add Customer
            </button>
          </div>
        </div>

        {msg && <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{msg}</div>}
        {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        {showForm && (
          <div className="mb-6 rounded-xl border border-gray-100 bg-white p-6 shadow-md">
            <h2 className="mb-2 text-lg font-semibold text-[#004236]">
              {isEditing ? "Edit Customer" : "Add New Customer"}
            </h2>
            <p className="mb-5 text-xs text-zinc-500">Kelola data pengguna. Field bertanda bintang wajib diisi.</p>

            <form onSubmit={save} className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-1">
                <label className="mb-1 block text-sm text-gray-600">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value.replace(/[^A-Za-z\s]+/g, "") }))}
                  required
                  pattern="^[A-Za-z\\s]+$"
                  title="Nama harus angka"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#004236] focus:ring-2 focus:ring-[#004236]/30"
                />
              </div>

              <div className="md:col-span-1">
                <label className="mb-1 block text-sm text-gray-600">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#004236] focus:ring-2 focus:ring-[#004236]/30"
                />
                <p className="mt-1 text-[11px] text-zinc-500">Email harus unik.</p>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-gray-600">
                  Password {isEditing ? "(optional)" : <span className="text-red-500">*</span>}
                </label>
                <div className="flex gap-2">
                  <input
                    type={showPwd ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder={isEditing ? "•••••••• (leave blank to keep)" : ""}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#004236] focus:ring-2 focus:ring-[#004236]/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="shrink-0 rounded-lg border border-zinc-300 px-3 text-xs hover:bg-zinc-100"
                  >
                    {showPwd ? "Hide" : "Show"}
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-zinc-500">Minimal 6 karakter (untuk akun baru).</p>
              </div>

              <div className="md:col-span-1 flex items-center gap-3">
                <input
                  id="active"
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  className="h-4 w-4 accent-[#004236]"
                />
                <label htmlFor="active" className="text-sm text-gray-700">Active</label>
              </div>

              <div className="md:col-span-1 flex items-center gap-3">
                <input
                  id="verified"
                  type="checkbox"
                  checked={form.email_verified}
                  onChange={(e) => setForm((f) => ({ ...f, email_verified: e.target.checked }))}
                  className="h-4 w-4 accent-[#004236]"
                />
                <label htmlFor="verified" className="text-sm text-gray-700">Email Verified</label>
              </div>

              {/* Sticky action bar */}
              <div className="md:col-span-2 sticky bottom-0 z-10 -mx-6 -mb-6 border-t border-zinc-200 bg-white/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-white/70 flex justify-end gap-3">
                <button type="button" onClick={cancelForm} className="rounded-lg bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300">
                  Cancel
                </button>
                <button type="submit" className="rounded-lg bg-[#004236] px-4 py-2 text-white hover:bg-[#00362c]">
                  {isEditing ? "Update" : "Save"}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="overflow-x-auto rounded-lg border border-gray-100 bg-white shadow-md">
          <table className="min-w-[1000px] text-left text-sm">
            <thead className="bg-[#f9f5f7] text-xs font-semibold uppercase text-[#004236]">
              <tr>
                <th className="px-6 py-3">#</th>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Verified</th>
                <th className="px-6 py-3">Active</th>
                <th className="px-6 py-3">Joined</th>
                <th className="px-6 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-6 text-center text-sm text-gray-500">Loading...</td></tr>
              ) : customers.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-6 text-center text-sm text-gray-500">No customers found.</td></tr>
              ) : (
                customers.map((u, i) => (
                  <tr key={u.id} className="transition hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium">{i + 1}</td>
                    <td className="px-6 py-3 whitespace-normal break-words">{u.name}</td>
                    <td className="px-6 py-3 whitespace-normal break-words">{u.email}</td>
                    <td className="px-6 py-3">{u.email_verified_at ? "Yes" : "No"}</td>
                    <td className="px-6 py-3">
                      <button
                        onClick={() => toggleActive(u)}
                        className={`rounded-full px-3 py-1 text-xs ${u.is_active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}
                      >
                        {u.is_active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-6 py-3">{u.created_at ? new Date(u.created_at).toLocaleDateString() : "-"}</td>
                    <td className="px-6 py-3 text-center">
                      <button onClick={() => openEdit(u)} className="text-sm text-blue-600 hover:underline">Edit</button>
                      <span className="px-2 text-gray-300">|</span>
                      <button onClick={() => remove(u.id)} className="text-sm text-red-600 hover:underline">Delete</button>
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
