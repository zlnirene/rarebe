"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const bases = () => {
  const env = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  const set = new Set<string>(["http://backend.test","http://127.0.0.1:8000","http://localhost:8000"]);
  if (env) set.add(env);
  return Array.from(set);
};

async function fetchFallback(path: string, init: RequestInit) {
  let last:any=null;
  const list = bases().filter((v,i,a)=>a.indexOf(v)===i);
  for(const b of list){
    try{
      const c=new AbortController(); const t=setTimeout(()=>c.abort(),8000);
      const r=await fetch(`${b}${path}`,{ mode:"cors", cache:"no-store", ...init, headers:{ Accept:"application/json", ...(init.headers||{}) }, signal:c.signal });
      clearTimeout(t);
      return r;
    }catch(e:any){ last=(e?.name==="AbortError")?new Error("Request timeout"):e; }
  }
  throw last||new Error("Network unreachable");
}

export default function AdminOtpPage() {
  const router = useRouter();
  const [otp,setOtp] = useState("");
  const [email,setEmail] = useState<string|null>(null);
  const [expires,setExpires] = useState<string|null>(null);
  const [submitting,setSubmitting]=useState(false);
  const [resending,setResending]=useState(false);
  const [msg,setMsg]=useState<string|null>(null);
  const [err,setErr]=useState<string|null>(null);

  useEffect(()=>{
    const em = localStorage.getItem("pending_email");
    const role = localStorage.getItem("pending_role");
    const exp = localStorage.getItem("otp_expires_at");
    setEmail(em);
    setExpires(exp);
    if (!em || !role || !["admin","superadmin"].includes(role)) {
      router.replace("/pages/admin/loginadmin");
    }
  },[router]);

  const verify = async (e:React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setMsg(null); setErr(null);
    try{
      if(!email) throw new Error("Missing email.");
      const res = await fetchFallback("/api/auth/verify-otp",{
        method:"POST",
        headers:{ "Content-Type":"application/json", Accept:"application/json" },
        body: JSON.stringify({ email, otp })
      });
      const data = await res.json().catch(()=>({}));
      if(!res.ok) throw new Error(data?.message||"OTP invalid");
      const adminToken = data?.admin_token;
      if(!adminToken) throw new Error("Admin token missing.");
      localStorage.setItem("admin_token", adminToken);
      localStorage.removeItem("pending_email");
      localStorage.removeItem("pending_role");
      localStorage.removeItem("otp_expires_at");
      setMsg("OTP verified. Redirecting...");
      setTimeout(()=> router.replace("/pages/admin/dashboard"), 700);
    }catch(e:any){
      const m = ["Failed to fetch","Network error","Network unreachable","Request timeout"].includes(e?.message)
        ? "Failed to reach API."
        : e?.message || "Verification failed";
      setErr(m);
    }finally{ setSubmitting(false); }
  };

  const resend = async () => {
    setResending(true); setMsg(null); setErr(null);
    try{
      if(!email) throw new Error("Missing email.");
      const res = await fetchFallback("/api/auth/resend-otp",{
        method:"POST",
        headers:{ "Content-Type":"application/json", Accept:"application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json().catch(()=>({}));
      if(!res.ok) throw new Error(data?.message||"Resend failed");
      if (data?.otp_expires_at) {
        localStorage.setItem("otp_expires_at", data.otp_expires_at);
        setExpires(data.otp_expires_at);
      }
      setMsg("OTP resent.");
    }catch(e:any){
      const m = ["Failed to fetch","Network error","Network unreachable","Request timeout"].includes(e?.message)
        ? "Failed to reach API."
        : e?.message || "Resend failed";
      setErr(m);
    }finally{ setResending(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-zinc-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight mb-2">Admin OTP Verification</h1>
        <p className="text-sm text-zinc-600 mb-4">
          Enter the 6-digit code sent to {email || "your email"}{expires ? ` (expires: ${new Date(expires).toLocaleTimeString()})`:""}.
        </p>
        {msg && <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{msg}</div>}
        {err && <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div>}
        <form onSubmit={verify} className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={otp}
            onChange={(e)=>setOtp(e.target.value.replace(/\D/g,""))}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-center tracking-widest text-sm focus:outline-none focus:ring-2 focus:ring-[#004236]/30"
            placeholder="______"
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-[#004236] px-5 py-3 text-sm font-semibold text-white hover:bg-[#00362c] disabled:opacity-50"
          >
            {submitting ? "Verifying..." : "Verify OTP"}
          </button>
          <button
            type="button"
            onClick={resend}
            disabled={resending}
            className="w-full rounded-full border border-[#004236] px-5 py-3 text-sm font-semibold text-[#004236] hover:bg-[#004236]/5 disabled:opacity-50"
          >
            {resending ? "Resending..." : "Resend OTP"}
          </button>
          <button
            type="button"
            onClick={()=>router.replace("/pages/admin/loginadmin")}
            className="w-full text-center text-xs text-zinc-600 hover:text-[#004236]"
          >
            Back to login
          </button>
        </form>
      </div>
    </div>
  );
}
