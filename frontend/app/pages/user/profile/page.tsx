"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../../components/navbar";
import Footer from "../../../components/footer";

type ApiUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  email_verified_at?: string | null;
  created_at?: string;
};

type ProfileResponse = {
  user: ApiUser;
  orders: any[];
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

type Address = {
  id: number;
  nama_tempat: string;
  no_telp: string;
  alamat: string;
  kecamatan: string;
  kabupaten: string;
  provinsi: string;
};

const statusBadge = (s: string, isComplete?: boolean) => {
  const st = s.toLowerCase();
  const base = "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wide";
  switch (st) {
    case "pending": return <span className={`${base} bg-amber-100 text-amber-700 border border-amber-200`}>PENDING</span>;
    case "paid": return <span className={`${base} bg-emerald-100 text-emerald-700 border border-emerald-200`}>PAID</span>;
    case "shipped": return <span className={`${base} bg-indigo-100 text-indigo-700 border border-indigo-200`}>SHIPPED</span>;
    case "to receive": return <span className={`${base} bg-sky-100 text-sky-700 border border-sky-200`}>TO RECEIVE</span>;
    case "completed":
      return isComplete
        ? <span className={`${base} bg-green-100 text-green-700 border border-green-200`}>COMPLETED</span>
        : <span className={`${base} bg-zinc-100 text-zinc-600 border border-zinc-200`}>COMPLETED</span>;
    case "cancelled": return <span className={`${base} bg-red-100 text-red-700 border border-red-200`}>CANCELLED</span>;
    default: return <span className={`${base} bg-zinc-100 text-zinc-600 border border-zinc-200`}>{st}</span>;
  }
};

export default function ProfilePage() {
  const router = useRouter();
  const token = useMemo(() => (typeof window !== "undefined" ? localStorage.getItem("auth_token") : null), []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<ApiUser | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addrLoading, setAddrLoading] = useState<boolean>(false);
  const [addrError, setAddrError] = useState<string | null>(null);
  const [showAddrForm, setShowAddrForm] = useState<boolean>(false);
  const [addrEditingId, setAddrEditingId] = useState<number | null>(null);
  const [addrForm, setAddrForm] = useState<{
    nama_tempat: string;
    no_telp: string;
    alamat: string;
    kecamatan: string;
    kabupaten: string;
    provinsi: string;
  }>({
    nama_tempat: "",
    no_telp: "",
    alamat: "",
    kecamatan: "",
    kabupaten: "",
    provinsi: "",
  });
  const [showPwdForm, setShowPwdForm] = useState(false);
  const [pwdSubmitting, setPwdSubmitting] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdForm, setPwdForm] = useState({
    current_password: "",
    new_password: "",
    new_password_confirmation: "",
  });
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [profileForm, setProfileForm] = useState<{ name: string; email: string }>({
    name: "",
    email: "",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Tab status: "" = all (history order), others: pending|paid|shipped|completed|cancelled
  const [orderStatusTab, setOrderStatusTab] = useState<string>(""); // default: history order (all)

  const handleLogout = () => {
    try {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("pending_email");
      localStorage.removeItem("pending_role");
      localStorage.removeItem("otp_expires_at");
    } catch {}
    router.replace("/pages/user/login");
  };

  const loadAddresses = async () => {
    if (!token) return;
    setAddrLoading(true);
    setAddrError(null);
    try {
      const res = await fetchWithFallback("/api/addresses", {
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to load addresses");
      const list = Array.isArray(data) ? data : data?.data || [];
      setAddresses(list as Address[]);
    } catch (e: any) {
      setAddrError(e?.message || "Failed to load addresses");
    } finally {
      setAddrLoading(false);
    }
  };

  // Load user's orders from API (orders + order_items)
  const loadOrders = async () => {
    if (!token) return;
    try {
      const res = await fetchWithFallback("/api/orders/my", {
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setOrders(data);
        if (data.length === 0) {
          // retry once (optional)
          try {
            const res2 = await fetchWithFallback("/api/orders/my", {
              headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
            });
            const data2 = await res2.json();
            if (res2.ok && Array.isArray(data2)) setOrders(data2);
          } catch {}
        }
      }
    } catch {}
  };

  const startAddAddress = () => {
    setAddrEditingId(null);
    setAddrForm({
      nama_tempat: "",
      no_telp: "",
      alamat: "",
      kecamatan: "",
      kabupaten: "",
      provinsi: "",
    });
    setShowAddrForm(true);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startEditAddress = (addr: Address) => {
    setAddrEditingId(addr.id);
    setAddrForm({
      nama_tempat: addr.nama_tempat,
      no_telp: addr.no_telp,
      alamat: addr.alamat,
      kecamatan: addr.kecamatan,
      kabupaten: addr.kabupaten,
      provinsi: addr.provinsi,
    });
    setShowAddrForm(true);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelAddrForm = () => {
    setShowAddrForm(false);
    setAddrEditingId(null);
    setAddrError(null);
  };

  const saveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      router.replace("/pages/user/login");
      return;
    }
    setAddrError(null);
    try {
      const method = addrEditingId ? "PUT" : "POST";
      const path = addrEditingId ? `/api/addresses/${addrEditingId}` : "/api/addresses";
      const res = await fetchWithFallback(path, {
        method,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(addrForm),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          data?.errors ? Object.values(data.errors).flat().join(" ") : data?.message || "Save failed";
        throw new Error(msg);
      }
      await loadAddresses();
      cancelAddrForm();
    } catch (e: any) {
      setAddrError(e?.message || "Save failed");
    }
  };

  const deleteAddress = async (id: number) => {
    if (!token) return;
    if (!confirm("Delete this address?")) return;
    setAddrError(null);
    try {
      const res = await fetchWithFallback(`/api/addresses/${id}`, {
        method: "DELETE",
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Delete failed");
      await loadAddresses();
    } catch (e: any) {
      setAddrError(e?.message || "Delete failed");
    }
  };

  const openProfileEdit = () => {
    if (!user) return;
    setProfileForm({ name: user.name, email: user.email });
    setProfileMsg(null);
    setProfileError(null);
    setShowProfileForm(true);
  };

  const cancelProfileEdit = () => {
    setShowProfileForm(false);
    setProfileMsg(null);
    setProfileError(null);
  };

  const saveProfileEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (/[^A-Za-z\s]/.test(profileForm.name) || !profileForm.name.trim()) {
      setProfileError("Nama harus angka");
      return;
    }
    if (!token || !user) {
      router.replace("/pages/user/login");
      return;
    }
    setProfileSaving(true);
    setProfileMsg(null);
    setProfileError(null);
    try {
      const payload: any = {
        name: profileForm.name,
        email: profileForm.email,
      };
      const res = await fetchWithFallback("/api/profile", {
        method: "PUT",
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
          data?.errors ? Object.values(data.errors).flat().join(" ") : data?.message || "Update failed";
        throw new Error(msg);
      }
      // Update local user state
      setUser((u) => (u ? { ...u, name: data.user?.name ?? profileForm.name, email: data.user?.email ?? profileForm.email } : u));
      setProfileMsg("Profile updated successfully.");
      setShowProfileForm(false);
    } catch (err: any) {
      setProfileError(err?.message || "Update failed");
    } finally {
      setProfileSaving(false);
    }
  };

  useEffect(() => {
    const guardAndLoad = async () => {
      if (!token) {
        router.replace("/pages/user/login");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await fetchWithFallback("/api/profile", {
          headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        });
        const data: ProfileResponse = await res.json();
        if (!res.ok) throw new Error((data as any)?.message || "Failed to load profile");
        setUser(data.user);
        // do not rely on profile.orders; fetch from orders/my instead
      } catch (e: any) {
        setError(e?.message || "Failed to load profile");
        router.replace("/pages/user/login");
      } finally {
        setLoading(false);
      }
    };
    guardAndLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Load addresses and orders after profile is loaded successfully
    if (user && token) {
      loadAddresses();
      loadOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token]);

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      router.replace("/pages/user/login");
      return;
    }
    setPwdSubmitting(true);
    setPwdMsg(null);
    setPwdError(null);
    try {
      const res = await fetchWithFallback("/api/profile/password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(pwdForm),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          data?.errors ? Object.values(data.errors).flat().join(" ") : data?.message || "Update failed";
        throw new Error(msg);
      }
      setPwdMsg("Password updated successfully.");
      setPwdForm({ current_password: "", new_password: "", new_password_confirmation: "" });
      setShowPwdForm(false);
    } catch (err: any) {
      setPwdError(err?.message || "Update failed");
    } finally {
      setPwdSubmitting(false);
    }
  };

  // Filter orders by selected tab (map "complete" tab to "completed" status)
  const filteredOrders = useMemo(() => {
    if (!orderStatusTab) return orders;
    const key = orderStatusTab === "complete" ? "completed" : orderStatusTab;
    return orders.filter((o: any) => ((o.status || "").toLowerCase() === key));
  }, [orders, orderStatusTab]);

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#FDFBF8] text-zinc-900 pt-16">
        <main className="mx-auto max-w-5xl px-6 py-10">
          <h1 className="text-2xl font-semibold tracking-tight">My Profile</h1>
          <p className="mt-2 text-sm text-zinc-600">Manage your account details and view order history.</p>

          {/* Global password update status */}
          {pwdMsg && (
            <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              {pwdMsg}
            </div>
          )}
          {pwdError && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {pwdError}
            </div>
          )}

          {loading ? (
            <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
              Loading...
            </div>
          ) : error ? (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
              {error}
            </div>
          ) : !user ? (
            <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
              No user data.
            </div>
          ) : (
            <>
              {/* Account & Quick Actions */}
              <section className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                  <h2 className="text-base font-semibold">Account Information</h2>
                  {profileMsg && (
                    <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-700">
                      {profileMsg}
                    </div>
                  )}
                  {profileError && (
                    <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                      {profileError}
                    </div>
                  )}
                  <dl className="mt-4 space-y-3 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-zinc-500">Name</dt>
                      <dd className="text-zinc-900">{user.name}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-zinc-500">Email</dt>
                      <dd className="text-zinc-900">{user.email}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-zinc-500">Role</dt>
                      <dd className="text-zinc-900 capitalize">{user.role}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-zinc-500">Verified</dt>
                      <dd className="text-zinc-900">
                        {user.email_verified_at ? "Yes" : "No"}
                      </dd>
                    </div>
                    {user.created_at && (
                      <div className="flex justify-between">
                        <dt className="text-zinc-500">Member since</dt>
                        <dd className="text-zinc-900">
                          {new Date(user.created_at).toLocaleDateString()}
                        </dd>
                      </div>
                    )}
                  </dl>
                  {showProfileForm && (
                    <form onSubmit={saveProfileEdit} className="mt-6 space-y-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-600">Edit Profile</h3>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-zinc-700">Name</label>
                        <input
                          type="text"
                          required
                          value={profileForm.name}
                          onChange={(e) => setProfileForm(f => ({ ...f, name: e.target.value.replace(/[^A-Za-z\s]+/g,"") }))}
                         pattern="^[A-Za-z\\s]+$"
                         title="Nama harus angka"
                          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004236]/30"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-zinc-700">Email</label>
                        <input
                          type="email"
                          required
                          value={profileForm.email}
                          onChange={(e) => setProfileForm(f => ({ ...f, email: e.target.value }))}
                          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004236]/30"
                        />
                      </div>
                      <div className="flex justify-end gap-3 pt-1">
                        <button
                          type="button"
                          onClick={cancelProfileEdit}
                          className="rounded-md bg-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={profileSaving}
                          className="rounded-md bg-[#004236] px-4 py-2 text-xs font-semibold text-white hover:bg-[#00362c] disabled:opacity-60"
                        >
                          {profileSaving ? "Saving..." : "Save"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                  <h2 className="text-base font-semibold">Quick Actions</h2>
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                      onClick={() => (showProfileForm ? cancelProfileEdit() : openProfileEdit())}
                      className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium hover:border-[#004236] hover:text-[#004236]"
                    >
                      {showProfileForm ? "Close Edit" : "Edit Profile"}
                    </button>
                    <button
                      className="rounded-lg border border-zinc-200 px-4 py-2 text-sm hover:border-[#004236] hover:text-[#004236]"
                      onClick={() => setShowPwdForm((s) => !s)}
                    >
                      {showPwdForm ? "Close Password Form" : "Change Password"}
                    </button>
                    <button
                      onClick={handleLogout}
                      className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                    >
                      Log out
                    </button>
                  </div>
                  <p className="mt-3 text-xs text-zinc-500">Change your password securely below.</p>

                  {showPwdForm && (
                    <form onSubmit={submitPassword} className="mt-4 space-y-3">
                      <div>
                        <label className="mb-1 block text-sm text-gray-600">Current Password</label>
                        <input
                          type="password"
                          required
                          value={pwdForm.current_password}
                          onChange={(e) => setPwdForm((f) => ({ ...f, current_password: e.target.value }))}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#004236]/30"
                          placeholder="Current password"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-gray-600">New Password</label>
                        <input
                          type="password"
                          required
                          value={pwdForm.new_password}
                          onChange={(e) => setPwdForm((f) => ({ ...f, new_password: e.target.value }))}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#004236]/30"
                          placeholder="At least 6 characters"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-gray-600">Confirm New Password</label>
                        <input
                          type="password"
                          required
                          value={pwdForm.new_password_confirmation}
                          onChange={(e) =>
                            setPwdForm((f) => ({ ...f, new_password_confirmation: e.target.value }))
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#004236]/30"
                          placeholder="Re-type new password"
                        />
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={pwdSubmitting}
                          className="rounded-lg bg-[#004236] px-4 py-2 text-white transition hover:bg-[#00362c] disabled:opacity-60"
                        >
                          {pwdSubmitting ? "Updating..." : "Update Password"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </section>

              {/* Addresses */}
              <section className="mt-8 rounded-2xl border border-zinc-200 bg-white">
                <div className="flex items-center justify-between border-b border-zinc-200 p-4">
                  <h2 className="text-base font-semibold">My Addresses</h2>
                  <button
                    onClick={startAddAddress}
                    className="rounded-full bg-[#004236] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-[#00362c]"
                  >
                    Add New
                  </button>
                </div>

                {/* Add/Edit form */}
                {showAddrForm && (
                  <div className="p-4">
                    {addrError && (
                      <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        {addrError}
                      </div>
                    )}
                    <form onSubmit={saveAddress} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm text-gray-600">Nama Tempat</label>
                        <input
                          type="text"
                          required
                          value={addrForm.nama_tempat}
                          onChange={(e) => setAddrForm((f) => ({ ...f, nama_tempat: e.target.value }))}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#004236]/30"
                          placeholder="Rumah, Kantor, dsb."
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-gray-600">No. Telp</label>
                        <input
                          type="text"
                          required
                          value={addrForm.no_telp}
                          onChange={(e) => setAddrForm((f) => ({ ...f, no_telp: e.target.value }))}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#004236]/30"
                          placeholder="+62..."
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-sm text-gray-600">Alamat Lengkap</label>
                        <textarea
                          rows={2}
                          required
                          value={addrForm.alamat}
                          onChange={(e) => setAddrForm((f) => ({ ...f, alamat: e.target.value }))}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#004236]/30"
                          placeholder="Nama jalan, nomor rumah, RT/RW, patokan, dll."
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-gray-600">Kecamatan</label>
                        <input
                          type="text"
                          required
                          value={addrForm.kecamatan}
                          onChange={(e) => setAddrForm((f) => ({ ...f, kecamatan: e.target.value }))}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#004236]/30"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-gray-600">Kabupaten/Kota</label>
                        <input
                          type="text"
                          required
                          value={addrForm.kabupaten}
                          onChange={(e) => setAddrForm((f) => ({ ...f, kabupaten: e.target.value }))}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#004236]/30"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-sm text-gray-600">Provinsi</label>
                        <input
                          type="text"
                          required
                          value={addrForm.provinsi}
                          onChange={(e) => setAddrForm((f) => ({ ...f, provinsi: e.target.value }))}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#004236]/30"
                        />
                      </div>
                      <div className="sm:col-span-2 flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={cancelAddrForm}
                          className="rounded-lg bg-gray-200 px-4 py-2 text-gray-700 transition hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="rounded-lg bg-[#004236] px-4 py-2 text-white transition hover:bg-[#00362c]"
                        >
                          {addrEditingId ? "Update Address" : "Save Address"}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Address list */}
                <div className="p-4">
                  {addrLoading ? (
                    <div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-600">Loading...</div>
                  ) : addresses.length === 0 ? (
                    <div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
                      No addresses yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {addresses.map((a) => (
                        <div key={a.id} className="rounded-xl border border-zinc-200 bg-white p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="text-sm font-semibold text-zinc-900">{a.nama_tempat}</div>
                              <div className="mt-1 text-xs text-zinc-500">{a.no_telp}</div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => startEditAddress(a)}
                                className="rounded-md border border-zinc-200 px-3 py-1 text-xs hover:bg-zinc-100"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteAddress(a.id)}
                                className="rounded-md border border-red-200 px-3 py-1 text-xs text-red-700 hover:bg-red-50"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                          <div className="mt-3 text-sm text-zinc-700 whitespace-pre-line">{a.alamat}</div>
                          <div className="mt-2 text-xs text-zinc-600">
                            {a.kecamatan}, {a.kabupaten}, {a.provinsi}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* Order history with tabs */}
              <section className="mt-8 rounded-2xl border border-zinc-200 bg-white">
                <div className="border-b border-zinc-200 p-4">
                  <h2 className="text-base font-semibold">Order History</h2>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {/*
                      key: "", label: "History Order" untuk menampilkan semua order
                      key: "pending", label: "Pending"
                      key: "paid", label: "Paid"
                      key: "shipped", label: "Shipped"
                      key: "complete", label: "Complete" (di-mapping ke status 'completed')
                      key: "cancelled", label: "Cancelled"
                    */}
                    {/*
                      <button
                        key={t.key || "all"}
                        onClick={() => setOrderStatusTab(t.key)}
                        className={
                          "rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide transition " +
                          (orderStatusTab === t.key
                            ? "bg-[#004236] text-white"
                            : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200")
                        }
                      >
                        {t.label}
                      </button>
                    */}
                    <button
                      onClick={() => setOrderStatusTab("")}
                      className={
                        "rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide transition " +
                        (orderStatusTab === ""
                          ? "bg-[#004236] text-white"
                          : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200")
                      }
                    >
                      History Order
                    </button>
                    <button
                      onClick={() => setOrderStatusTab("pending")}
                      className={
                        "rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide transition " +
                        (orderStatusTab === "pending"
                          ? "bg-[#004236] text-white"
                          : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200")
                      }
                    >
                      Pending
                    </button>
                    <button
                      onClick={() => setOrderStatusTab("paid")}
                      className={
                        "rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide transition " +
                        (orderStatusTab === "paid"
                          ? "bg-[#004236] text-white"
                          : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200")
                      }
                    >
                      Paid
                    </button>
                    <button
                      onClick={() => setOrderStatusTab("shipped")}
                      className={
                        "rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide transition " +
                        (orderStatusTab === "shipped"
                          ? "bg-[#004236] text-white"
                          : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200")
                      }
                    >
                      Shipped
                    </button>
                    <button
                      onClick={() => setOrderStatusTab("complete")}
                      className={
                        "rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide transition " +
                        (orderStatusTab === "complete"
                          ? "bg-[#004236] text-white"
                          : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200")
                      }
                    >
                      Complete
                    </button>
                    <button
                      onClick={() => setOrderStatusTab("cancelled")}
                      className={
                        "rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide transition " +
                        (orderStatusTab === "cancelled"
                          ? "bg-[#004236] text-white"
                          : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200")
                      }
                    >
                      Cancelled
                    </button>
                  </div>
                </div>

                {filteredOrders.length === 0 ? (
                  <div className="p-6 text-sm text-zinc-600">No orders for this filter.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-[#f9f5f7] text-xs font-semibold uppercase text-[#7F2549]">
                        <tr>
                          <th className="px-6 py-3">Order Code</th>
                          <th className="px-6 py-3">Date</th>
                          <th className="px-6 py-3">Total</th>
                          <th className="px-6 py-3">Status</th>
                          <th className="px-6 py-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-gray-700">
                        {filteredOrders.map((o: any) => {
                          const code = o.order_code || o.code || o.id;
                          const status = (o.status || "").toLowerCase();
                          const total = typeof o.total_price !== "undefined" ? o.total_price : o.total;
                          return (
                            <tr key={o.id}>
                              <td className="px-6 py-3 font-medium">{code}</td>
                              <td className="px-6 py-3">{o.created_at ? new Date(o.created_at).toLocaleString() : "-"}</td>
                              <td className="px-6 py-3">
                                {typeof total !== "undefined"
                                  ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(Number(total))
                                  : "-"}
                              </td>
                              <td className="px-6 py-3">{statusBadge(status, o.is_complete)}</td>
                              <td className="px-6 py-3 text-center">
                                <div className="flex flex-col items-center gap-2">
                                  <button
                                    onClick={() =>
                                      router.push(`/pages/user/order-item?order_code=${encodeURIComponent(code)}`)
                                    }
                                    className="rounded-full border border-zinc-300 px-4 py-1.5 text-xs font-semibold text-zinc-700 hover:border-[#004236] hover:text-[#004236]"
                                  >
                                    View Detail
                                  </button>
                                  {status === "pending" && (
                                    <button
                                      onClick={() =>
                                        router.push(`/pages/user/checkout?order_code=${encodeURIComponent(code)}`)
                                      }
                                      className="rounded-full bg-pink-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-pink-700"
                                    >
                                      Lanjutkan Pembayaran
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
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
