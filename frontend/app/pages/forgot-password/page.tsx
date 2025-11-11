"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Navbar from "../../components/navbar";
import Footer from "../../components/footer";

const bases = () => {
  const env = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  const set = new Set<string>([
    "http://127.0.0.1:8000",
    "http://localhost:8000",
    "http://backend.test"
  ]);
  if (env) set.add(env);
  return Array.from(set);
};
async function fetchWithFallback(path: string, init: RequestInit) {
  let last: any = null;
  const list = bases().filter((v,i,a)=>a.indexOf(v)===i);
  for (const b of list) {
    try {
      const c = new AbortController(); const t = setTimeout(()=>c.abort(),8000);
      const r = await fetch(`${b}${path}`, {
        mode:"cors",
        cache:"no-store",
        ...init,
        headers:{ Accept:"application/json", ...(init.headers||{}) },
        signal: c.signal
      });
      clearTimeout(t);
      return r;
    } catch(e:any){
      last = e?.name==="AbortError" ? new Error("Request timeout") : e;
    }
  }
  throw last || new Error("Network unreachable");
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <ForgotPasswordInner />
    </Suspense>
  );
}

const Fallback = () => (
  <>
    <Navbar />
    <div className="min-h-screen bg-[#FDFBF8] pt-16 flex items-center justify-center text-sm text-zinc-600">
      Loading...
    </div>
    <Footer />
  </>
);

function ForgotPasswordInner() {
  const params = useSearchParams();
  const router = useRouter();

  // Phase detection
  const [phase, setPhase] = useState<1 | 2>(1); // 1: request OTP, 2: reset password
  const [email, setEmail] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<"customer" | "admin" | "superadmin">("customer");
  const [expires, setExpires] = useState<string | null>(null);

  // On mount decide phase
  useEffect(() => {
    const verified = localStorage.getItem("forgot_verified") === "1";
    const storedEmail = localStorage.getItem("forgot_email") || "";
    const storedRole = (localStorage.getItem("forgot_role") || "customer") as any;
    setEmail(storedEmail);
    setRole(storedRole);
    if (verified && storedEmail) {
      const currentOtp = localStorage.getItem("forgot_otp");
      if (!currentOtp) {
        localStorage.removeItem("forgot_verified");
        return;
      }
      // Re-verifikasi diam-diam untuk memastikan OTP belum berubah
      (async () => {
        try {
          const res = await fetchWithFallback("/api/auth/verify-reset-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ email: storedEmail, otp: currentOtp })
          });
          const data = await res.json().catch(()=>({}));
          if (!res.ok) throw new Error(data?.message || "OTP invalid");
          if (data?.otp_expires_at) setExpires(data.otp_expires_at);
          setPhase(2);
          setMessage("OTP verified. Please set your new password.");
        } catch {
          // OTP tidak valid lagi -> reset flow
          localStorage.removeItem("forgot_verified");
          localStorage.removeItem("forgot_otp");
          setPhase(1);
          setError("OTP sudah kadaluarsa / berubah. Silakan minta ulang.");
        }
      })();
    } else {
      localStorage.removeItem("forgot_otp");
      localStorage.removeItem("forgot_verified");
    }
  }, []);

  const requestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetchWithFallback("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed");
      // Save context for OTP page
      localStorage.setItem("forgot_email", email);
      localStorage.setItem("forgot_role", data?.role || "customer");
      localStorage.setItem("pending_context", "forgot");
      if (data?.otp_expires_at) localStorage.setItem("forgot_expires_at", data.otp_expires_at);
      setExpires(data?.otp_expires_at || null);
      router.replace("/pages/user/otp?context=forgot");
    } catch (e: any) {
      const net = ["Failed to fetch","Network error","Network unreachable","Request timeout"].includes(e?.message);
      if (net) {
        // Optimistic fallback: kemungkinan OTP terkirim walau response diblok CORS
        localStorage.setItem("forgot_email", email);
        localStorage.setItem("forgot_role", "customer");
        localStorage.setItem("pending_context", "forgot");
        router.replace("/pages/user/otp?context=forgot");
        return;
      }
      setError(e?.message || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      if (newPwd !== confirmPwd) throw new Error("Password confirmation mismatch.");
      const otp = localStorage.getItem("forgot_otp");
      const verified = localStorage.getItem("forgot_verified") === "1";
      if (!verified) throw new Error("OTP belum diverifikasi. Silakan masukkan kode OTP terlebih dahulu.");
      if (!otp) throw new Error("Missing OTP context. Restart process.");
      // Re-verifikasi terakhir sebelum kirim reset (deteksi jika user resend setelah verifikasi)
      const preCheck = await fetchWithFallback("/api/auth/verify-reset-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email, otp })
      });
      if (!preCheck.ok) {
        const jd = await preCheck.json().catch(()=>({}));
        throw new Error(jd?.message || "OTP tidak valid lagi. Mohon verifikasi ulang.");
      }
      const res = await fetchWithFallback("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email, otp, new_password: newPwd }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed");
      setMessage("Password updated. Redirecting to login...");
      // Clear forgot context
      localStorage.removeItem("forgot_email");
      localStorage.removeItem("forgot_role");
      localStorage.removeItem("forgot_otp");
      localStorage.removeItem("forgot_verified");
      localStorage.removeItem("pending_context");
      localStorage.removeItem("forgot_expires_at");
      setTimeout(() => {
        if ((role === "admin" || role === "superadmin")) {
          router.replace("/pages/admin/loginadmin");
        } else {
          router.replace("/pages/user/login");
        }
      }, 1200);
    } catch (e: any) {
      const net = ["Failed to fetch","Network error","Network unreachable","Request timeout"].includes(e?.message);
      if (net) {
        setError("Tidak dapat menghubungi API.");
      } else {
        setError(e?.message || "Gagal reset password");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#FDFBF8] text-zinc-900 pt-16">
        <main className="mx-auto max-w-md px-6 py-12">
          <h1 className="text-2xl font-semibold tracking-tight mb-1">
            {phase === 1 ? "Forgot Password" : "Reset Password"}
          </h1>
          <p className="text-sm text-zinc-600">
            {phase === 1
              ? "Enter your registered email to receive an OTP."
              : "Enter your new password."}
          </p>

          {message && (
            <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              {message}{expires ? ` (OTP Expires: ${new Date(expires).toLocaleTimeString()})` : ""}
            </div>
          )}
          {error && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {phase === 1 && (
            <form onSubmit={requestOtp} className="mt-6 space-y-4 rounded-2xl border border-zinc-200 bg-white p-6">
              <div>
                <label className="block text-sm font-medium text-zinc-800">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004236]/30"
                  placeholder="you@example.com"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-full bg-[#004236] px-5 py-3 text-sm font-semibold text-white hover:bg-[#00362c] disabled:opacity-50"
              >
                {submitting ? "Sending..." : "Send OTP"}
              </button>
              <button
                type="button"
                onClick={() => router.replace("/pages/user/login")}
                className="w-full text-center text-xs text-zinc-600 hover:text-[#004236]"
              >
                Back to login
              </button>
            </form>
          )}

          {phase === 2 && (
            <form onSubmit={resetPassword} className="mt-6 space-y-4 rounded-2xl border border-zinc-200 bg-white p-6">
              <div>
                <label className="block text-sm font-medium text-zinc-800">Email</label>
                <input
                  type="email"
                  value={email}
                  readOnly
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-800">New Password</label>
                <input
                  type="password"
                  minLength={6}
                  required
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004236]/30"
                  placeholder="Min 6 characters"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-800">Confirm New Password</label>
                <input
                  type="password"
                  minLength={6}
                  required
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004236]/30"
                  placeholder="Repeat password"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-full bg-[#004236] px-5 py-3 text-sm font-semibold text-white hover:bg-[#00362c] disabled:opacity-50"
              >
                {submitting ? "Updating..." : "Reset Password"}
              </button>
              <button
                type="button"
                onClick={() => {
                  // restart flow
                  localStorage.removeItem("forgot_verified");
                  localStorage.removeItem("forgot_otp");
                  setPhase(1);
                  setNewPwd("");
                  setConfirmPwd("");
                  setMessage(null);
                  setError(null);
                }}
                className="w-full text-center text-xs text-zinc-600 hover:text-[#004236]"
              >
                Start over
              </button>
            </form>
          )}
        </main>
      </div>
      <Footer />
    </>
  );
}
