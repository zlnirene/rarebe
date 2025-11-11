"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SidebarAdmin from "../../../components/sidebaradmin";

type AdminUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  email_verified_at?: string | null;
};

const resolveApiBases = () => {
  const env = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  const set = new Set<string>(["http://127.0.0.1:8000","http://localhost:8000","http://backend.test"]);
  if (env) set.add(env);
  return Array.from(set);
};

async function fetchWithFallback(path: string, init: RequestInit) {
  const bases = resolveApiBases().filter((v,i,a)=>a.indexOf(v)===i);
  let last: any = null;
  for (const b of bases) {
    try {
      const c = new AbortController();
      const t = setTimeout(()=>c.abort(),8000);
      const r = await fetch(`${b}${path}`, {
        cache:"no-store",
        ...init,
        headers:{ Accept:"application/json", ...(init.headers||{}) },
        signal: c.signal
      });
      clearTimeout(t);
      return r;
    } catch(e:any){ last = e; }
  }
  throw last || new Error("Network unreachable");
}

export default function SuperadminManageAdminsPage() {
  const router = useRouter();
  const token = useMemo(()=> (typeof window!=="undefined"?localStorage.getItem("admin_token"):null),[]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);
  const [msg,setMsg]=useState<string|null>(null);
  const [list,setList]=useState<AdminUser[]>([]);
  const [search,setSearch]=useState("");
  const [showForm,setShowForm]=useState(false);
  const [editing,setEditing]=useState(false);
  const [form,setForm]=useState<{id:number|null;name:string;email:string;password:string;is_active:boolean}>({
    id:null,name:"",email:"",password:"",is_active:true
  });
  const [guardChecked,setGuardChecked]=useState(false);
  const [highlightId,setHighlightId] = useState<number|null>(null); // row highlight after save

  const StatusBadge = ({active}:{active:boolean}) => (
    <span className={
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold " +
      (active
        ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
        : "bg-red-100 text-red-700 border border-red-200")
    }>{active ? "ACTIVE":"INACTIVE"}</span>
  );
  const ActionButton = ({label,onClick,color="indigo"}:{label:string;onClick:()=>void;color?:"indigo"|"red"}) => {
    const base = "rounded-md px-2.5 py-1 text-[11px] font-semibold transition";
    const map:Record<string,string> = {
      indigo:"bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200",
      red:"bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
    };
    return <button type="button" onClick={onClick} className={base+" "+map[color]}>{label}</button>;
  };

  // Guard: must be superadmin
  useEffect(()=>{
    const check = async () => {
      if (!token){ router.replace("/pages/admin/loginadmin"); return; }
      try {
        const r = await fetchWithFallback("/api/user",{headers:{Accept:"application/json",Authorization:`Bearer ${token}`}});
        if (!r.ok) throw new Error();
        const u = await r.json();
        if (u?.role !== "superadmin") {
          router.replace("/pages/admin/loginadmin");
          return;
        }
        setGuardChecked(true);
      } catch {
        router.replace("/pages/admin/loginadmin");
      }
    };
    check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  const load = async () => {
    if (!token) return;
    setLoading(true); setError(null); setMsg(null);
    try {
      const qs = search ? `?search=${encodeURIComponent(search)}` : "";
      const r = await fetchWithFallback(`/api/superadmin/admin-users${qs}`,{
        headers:{Accept:"application/json",Authorization:`Bearer ${token}`}
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.message || "Failed");
      setList(Array.isArray(data)?data:[]);
    } catch(e:any){
      setError(e?.message || "Failed to load");
    } finally { setLoading(false); }
  };

  useEffect(()=>{ if (guardChecked) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ },[guardChecked]);

  const openCreate = () => {
    setEditing(false);
    setForm({id:null,name:"",email:"",password:"",is_active:true});
    setShowForm(true);
    setHighlightId(null);
    if (typeof window!=="undefined") window.scrollTo({top:0,behavior:"smooth"});
  };
  const openEdit = (u:AdminUser) => {
    setEditing(true);
    setForm({id:u.id,name:u.name,email:u.email,password:"",is_active:u.is_active});
    setShowForm(true);
    setHighlightId(null);
    if (typeof window!=="undefined") window.scrollTo({top:0,behavior:"smooth"});
  };
  const cancel = () => {
    setShowForm(false);
    setEditing(false);
    setError(null);
    setMsg(null);
  };

  const save = async (e:React.FormEvent) => {
    e.preventDefault();
    setError(null); setMsg(null);
    try {
      if (!token) throw new Error("Not auth");
      const payload: any = { name: form.name, email: form.email, is_active: form.is_active };
      // role enforced backend; send for clarity (ignored on update)
      if (!editing) payload.role = "admin";
      if (!editing || form.password.trim()) payload.password = form.password;
      const method = editing ? "PUT" : "POST";
      const path = editing ? `/api/superadmin/admin-users/${form.id}` : "/api/superadmin/admin-users";
      const r = await fetchWithFallback(path,{
        method,
        headers:{ "Content-Type":"application/json", Accept:"application/json", Authorization:`Bearer ${token}`},
        body: JSON.stringify(payload)
      });
      const data = await r.json().catch(()=>({}));
      if (!r.ok){
        const msg = data?.errors ? Object.values(data.errors).flat().join(" ") : data?.message || "Save failed";
        throw new Error(msg);
      }
      setMsg(editing?"Admin updated.":"Admin created.");
      if (data?.id) setHighlightId(data.id);
      cancel();
      load();
    } catch(e:any){ setError(e?.message || "Save failed"); }
  };

  const remove = async (id:number) => {
    if (!confirm("Delete this admin user?")) return;
    setError(null); setMsg(null);
    try{
      if (!token) throw new Error("Not auth");
      const r = await fetchWithFallback(`/api/superadmin/admin-users/${id}`,{
        method:"DELETE",
        headers:{Accept:"application/json",Authorization:`Bearer ${token}`}
      });
      const data = await r.json().catch(()=>({}));
      if (!r.ok) throw new Error(data?.message || "Delete failed");
      setMsg("Admin deleted.");
      if (highlightId===id) setHighlightId(null);
      load();
    } catch(e:any){ setError(e?.message || "Delete failed"); }
  };

  const toggleActive = async (u:AdminUser) => {
    setError(null); setMsg(null);
    try{
      if (!token) throw new Error("Not auth");
      const r = await fetchWithFallback(`/api/superadmin/admin-users/${u.id}`,{
        method:"PUT",
        headers:{ "Content-Type":"application/json", Accept:"application/json", Authorization:`Bearer ${token}`},
        body: JSON.stringify({ is_active: !u.is_active, name:u.name, email:u.email })
      });
      const data = await r.json().catch(()=>({}));
      if (!r.ok) throw new Error(data?.message || "Update failed");
      load();
    } catch(e:any){ setError(e?.message || "Update failed"); }
  };

  return (
    <SidebarAdmin>
      <main className="mx-auto max-w-6xl p-6">
        <div className="mb-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-[#004236]">Admin Accounts</h1>
              <p className="mt-1 text-xs text-zinc-500">Kelola akun dengan role admin. Hanya superadmin yang dapat membuat / menghapus.</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                value={search}
                onChange={e=>setSearch(e.target.value)}
                placeholder="Search name / email..."
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004236]/25"
              />
              <button
                onClick={load}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium hover:border-[#004236] hover:text-[#004236]"
              >Filter</button>
              <button
                onClick={openCreate}
                className="rounded-lg bg-[#004236] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#00362c]"
              >Add Admin</button>
            </div>
          </div>
          {msg && <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{msg}</div>}
          {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        </div>

        {showForm && (
          <div className="mb-6 rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
              <h2 className="text-sm font-semibold text-[#004236]">{editing ? "Edit Admin Account" : "Add Admin Account"}</h2>
              <button
                type="button"
                onClick={cancel}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100"
              >
                Close
              </button>
            </div>
            <form onSubmit={save} className="px-5 py-5 space-y-6">
+             <div className="flex items-center gap-2 text-xs">
+               <span className="font-semibold text-zinc-600">Role:</span>
+               <span className="rounded-full bg-[#004236]/10 px-2 py-0.5 font-medium text-[#004236]">admin</span>
+               <span className="text-[10px] text-zinc-500">Fixed (superadmin creates admin accounts)</span>
+             </div>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-zinc-700">Name *</label>
                    <input
                      value={form.name}
                      required
                      onChange={e=>setForm(f=>({...f,name:e.target.value}))}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-[#004236] placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#004236]/25"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-zinc-700">Email *</label>
                    <input
                      type="email"
                      value={form.email}
                      required
                      onChange={e=>setForm(f=>({...f,email:e.target.value}))}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-[#004236] placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#004236]/25"
                    />
                    <p className="mt-1 text-[10px] text-zinc-500">Must be a valid unique email.</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-zinc-700">
                      Password {editing && <span className="text-zinc-500">(blank = unchanged)</span>}
                    </label>
                    <input
                      type="password"
                      value={form.password}
                      onChange={e=>setForm(f=>({...f,password:e.target.value}))}
                      placeholder={editing?"Leave blank to keep current":"Min 6 chars"}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-[#004236] placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#004236]/25"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      id="admin-active"
                      type="checkbox"
                      checked={form.is_active}
                      onChange={e=>setForm(f=>({...f,is_active:e.target.checked}))}
                      className="h-4 w-4 accent-[#004236]"
                    />
                    <label htmlFor="admin-active" className="text-xs font-medium text-zinc-700">Active</label>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={cancel}
                  className="rounded-md bg-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-[#004236] px-5 py-2 text-xs font-semibold text-white hover:bg-[#00362c]"
                >
                  {editing?"Update":"Save"}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm table-fixed">
            <thead className="bg-zinc-50 text-[11px] font-semibold uppercase tracking-wide text-zinc-600">
              <tr>
                <th className="px-5 py-3 font-medium w-10">#</th>
                <th className="px-5 py-3 font-medium">Name / Email</th>
                <th className="px-5 py-3 font-medium w-24">Verified</th>
                <th className="px-5 py-3 font-medium w-28">Status</th>
                <th className="px-5 py-3 font-medium w-48">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-6 text-center text-xs text-zinc-500">Loading...</td></tr>
              ) : list.length===0 ? (
                <tr><td colSpan={5} className="px-5 py-6 text-center text-xs text-zinc-500">No admin users.</td></tr>
              ) : list.map((u,i)=> {
                const verified = !!u.email_verified_at;
                const active = !!u.is_active;
                const highlight = highlightId===u.id;
                return (
                  <tr
                    key={u.id}
                    className={"transition hover:bg-zinc-50 "+(highlight?"animate-pulse bg-emerald-50/60":"")}
                  >
                    <td className="px-5 py-3 font-medium text-zinc-700">{i+1}</td>
                    <td className="px-5 py-3">
                      <div className="font-semibold text-zinc-900">{u.name}</div>
                      <div className="mt-0.5 text-[11px] text-zinc-500">{u.email}</div>
                    </td>
                    <td className="px-5 py-3">
                      {verified
                        ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">YES</span>
                        : <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">NO</span>}
                    </td>
                    <td className="px-5 py-3">
                      <span className={
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold "+
                        (active?"bg-emerald-100 text-emerald-700 border border-emerald-200":"bg-red-100 text-red-700 border border-red-200")
                      }>
                        {active?"ACTIVE":"INACTIVE"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={()=>openEdit(u)}
                          className="rounded-md bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-100 border border-indigo-200"
                        >Edit</button>
                        <button
                          type="button"
                          onClick={()=>remove(u.id)}
                          className="rounded-md bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-100 border border-red-200"
                        >Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </SidebarAdmin>
  );
}
