"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "../../../components/navbar";
import Footer from "../../../components/footer";

const resolveApiBase = () => {
  const env = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (typeof window !== "undefined") {
    const origin = window.location.origin.replace(/\/$/, "");
    if (!env || env === origin) return "http://localhost:8000";
  }
  return env || "http://localhost:8000";
};

// added: multi-base fallback (mirrors other pages)
const bases = () => {
  const env = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  const set = new Set<string>(["http://127.0.0.1:8000","http://localhost:8000","http://backend.test"]);
  if (env) set.add(env);
  return Array.from(set);
};
async function fetchWithFallback(path:string, init:RequestInit){
  let last:any=null;
  const preferred = (typeof window !== "undefined" ? localStorage.getItem("api_base_used") : null)?.replace(/\/$/, "");
  const list = [preferred, ...bases()].filter(Boolean).filter((v,i,a)=>a.indexOf(v as string)===i) as string[];
  for(const b of list){
    try{
      const c=new AbortController(); const t=setTimeout(()=>c.abort(),8000);
      const r=await fetch(`${b}${path}`,{
        mode:"cors",
        cache:"no-store",
        ...init,
        headers:{ Accept:"application/json", ...(init.headers||{}) },
        signal:c.signal
      });
      clearTimeout(t);
      return r;
    }catch(e:any){
      last=(e?.name==="AbortError")?new Error("Request timeout"):e;
    }
  }
  throw last||new Error("Network unreachable");
}

export default function OtpPage() {
  const router = useRouter();
  const params = useSearchParams();
  const API_BASE = resolveApiBase();

  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<string>("customer"); // added state
  const [mounted,setMounted] = useState(false); // added
  const [expiresDisplay,setExpiresDisplay] = useState(""); // added
  const [context,setContext] = useState<"login"|"forgot">("login"); // new

  useEffect(() => {
    // detect context
    const c = (typeof window !== "undefined" ? (localStorage.getItem("pending_context") || params.get("context")) : null) || "login";
    const ctx = c === "forgot" ? "forgot" : "login";
    setContext(ctx);

    const storedEmail = ctx === "forgot"
      ? (localStorage.getItem("forgot_email") || localStorage.getItem("pending_email"))
      : localStorage.getItem("pending_email");
    const exp = ctx === "forgot"
      ? (localStorage.getItem("forgot_expires_at") || localStorage.getItem("otp_expires_at"))
      : localStorage.getItem("otp_expires_at");
    setEmail(storedEmail);
    setExpiresAt(exp);
    const role = localStorage.getItem("pending_role") || "customer"; // added
    setRole(role);
    if (!storedEmail) {
      router.replace(role === "admin" || role === "superadmin" ? "/pages/admin/loginadmin" : "/pages/user/login");
    }
  }, [router, params]);

  useEffect(()=>{ setMounted(true); },[]); // added

  useEffect(()=>{
    if (mounted && expiresAt) {
      try { setExpiresDisplay(new Date(expiresAt).toLocaleTimeString()); }
      catch { setExpiresDisplay(expiresAt); }
    } else {
      setExpiresDisplay("");
    }
  },[mounted,expiresAt]); // added

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);
    try {
      if (!email) throw new Error("Missing email context. Please login again.");
      if (context === "forgot") {
        if (otp.length !== 6) throw new Error("OTP must be 6 digits.");
        // Verify but do not consume OTP
        const res = await fetchWithFallback(`/api/auth/verify-reset-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ email, otp })
        });
        const data = await res.json().catch(()=>({}));
        if (!res.ok) throw new Error(data?.message || "Failed to verify OTP");
        localStorage.setItem("forgot_otp", otp);          // keep OTP for reset step
        localStorage.setItem("forgot_verified", "1");      // flag verified
        if (data?.otp_expires_at) localStorage.setItem("forgot_expires_at", data.otp_expires_at);
        localStorage.setItem("forgot_role", data?.role || "customer");
        setMessage("OTP validated. Redirecting...");
        setTimeout(()=> router.replace("/pages/forgot-password"), 600);
        return;
      }

      const res = await fetchWithFallback(`/api/auth/verify-otp`,{
        method:"POST",
        headers:{ "Content-Type":"application/json", Accept:"application/json" },
        body: JSON.stringify({ email, otp })
      });
      if (!res) throw new Error("Network error");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "OTP verification failed");

      setMessage("OTP verified. Redirecting...");
      const r = (localStorage.getItem("pending_role") || role || "customer").toLowerCase();
      // Simpan token sesuai peran. Backend mengembalikan:
      // - customer: { token }
      // - admin/superadmin: { admin_token }
      if (r === "admin" || r === "superadmin") {
        if (data?.admin_token) {
          localStorage.setItem("admin_token", data.admin_token);
        } else if (data?.token) {
          // fallback jika backend masih mengirim 'token'
          localStorage.setItem("admin_token", data.token);
        } else {
          throw new Error("Admin token missing.");
        }
      } else {
        if (data?.token) {
          localStorage.setItem("auth_token", data.token);
        } else {
          throw new Error("Token missing.");
        }
      }
      // Bersihkan context OTP setelah sukses
      try {
        localStorage.removeItem("pending_email");
        localStorage.removeItem("pending_role");
        localStorage.removeItem("otp_expires_at");
      } catch {}
      setTimeout(() => {
        if (r === "admin" || r === "superadmin") {
          router.replace("/pages/admin/dashboard");
        } else {
          router.replace("/pages/user/profile");
        }
      }, 800);
    } catch (err: any) {
     const net = ["Failed to fetch","Network error","Network unreachable","Request timeout"].includes(err?.message);
     const msg = net
       ? "Tidak dapat menghubungi API. Periksa NEXT_PUBLIC_API_URL, APP_URL, SANCTUM_STATEFUL_DOMAINS & CORS backend."
       : err?.message || "Something went wrong";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const resendOtp = async () => {
    setResending(true);
    setMessage(null);
    setError(null);
    try {
      if (!email) throw new Error("Missing email context. Please login again.");
      const res = await fetchWithFallback(`/api/auth/resend-otp`,{
        method:"POST",
        headers:{ "Content-Type":"application/json", Accept:"application/json" },
        body: JSON.stringify({ email })
      });
      if (!res) throw new Error("Network error");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to resend OTP");
      setMessage("OTP resent to your email.");
      if (data?.otp_expires_at) {
        localStorage.setItem("otp_expires_at", data.otp_expires_at);
        setExpiresAt(data.otp_expires_at);
      }
      // Jika mode forgot: paksa verifikasi ulang OTP baru
      if (context === "forgot") {
        localStorage.removeItem("forgot_verified");
        localStorage.removeItem("forgot_otp");
        localStorage.removeItem("forgot_expires_at");
        setMessage("OTP baru dikirim. Silakan verifikasi kembali kode tersebut.");
      }
    } catch (err: any) {
     const net = ["Failed to fetch","Network error","Network unreachable","Request timeout"].includes(err?.message);
     const msg = net
       ? "Tidak dapat menghubungi API. Periksa konfigurasi URL dan CORS backend."
       : err?.message || "Something went wrong";
      setError(msg);
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#FDFBF8] text-zinc-900 pt-16">
        <main className="mx-auto max-w-md px-6 py-12">
          <h1 className="text-3xl font-semibold tracking-tight">
            {context === "forgot" ? "Enter OTP (Reset Password)" : "Enter OTP"}
          </h1>
          <p
            className="mt-2 text-sm text-zinc-600"
            suppressHydrationWarning // added
          >
            {context === "forgot"
              ? `We sent a 6-digit code to ${email || "your email"} to reset your password.`
              : `We sent a 6-digit code to ${email || "your email"}`}
            {expiresDisplay ? ` · Expires at: ${expiresDisplay}` : ""}
          </p>

          <form onSubmit={verifyOtp} className="mt-6 space-y-4 rounded-2xl border border-zinc-200 bg-white p-6">
            {message && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                {message}
              </div>
            )}
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-zinc-800">
                6-digit code
              </label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-[#004236]/30"
                placeholder="______"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-[#004236] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#00362c] disabled:opacity-50"
            >
              {submitting ? "Verifying..." : "Verify OTP"}
            </button>

            <button
              type="button"
              onClick={resendOtp}
              disabled={resending}
              className="w-full rounded-full border border-[#004236] px-5 py-3 text-sm font-semibold text-[#004236] transition-colors hover:bg-[#004236]/5 disabled:opacity-50"
            >
              {resending ? "Resending..." : "Resend OTP"}
            </button>

            <button
              type="button"
              onClick={() =>
                router.push(
                  role === "admin" || role === "superadmin"
                    ? "/pages/admin/loginadmin"
                    : "/pages/user/login"
                )
              }
              className="w-full text-center text-sm text-zinc-600 hover:text-[#004236]"
            >
              Back to login
            </button>
          </form>
        </main>
      </div>
      <Footer />
    </>
  );
}
