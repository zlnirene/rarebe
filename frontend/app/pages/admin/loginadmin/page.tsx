"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import ReCAPTCHA from "react-google-recaptcha"; // ✅ added

const resolveApiBases = () => {
  const env = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  const set = new Set<string>();
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
      return { res, base };
    } catch (e: any) {
      lastErr = e?.name === "AbortError" ? new Error("Request timeout") : e;
    }
  }
  throw lastErr || new Error("Network unreachable");
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const captchaRef = useRef<ReCAPTCHA>(null); // ✅ added

  useEffect(() => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
    if (!token) {
      setChecking(false);
      return;
    }
    (async () => {
      try {
        const { res } = await fetchWithFallback("/api/user", {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error();
        const u = await res.json();
        if (["admin", "superadmin"].includes(u?.role)) {
          router.replace("/pages/admin/dashboard");
          return;
        }
      } catch {}
      setChecking(false);
    })();
  }, [router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // ✅ ambil token captcha
    const captchaToken = captchaRef.current?.getValue();
    if (!captchaToken) {
      setError("Please complete the reCAPTCHA verification.");
      setSubmitting(false);
      return;
    }

    try {
      const { res, base } = await fetchWithFallback("/api/auth/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email, password, captcha_token: captchaToken }), // ✅ send captcha_token
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) throw new Error("Incorrect email or password.");
        throw new Error(data?.message || "Login failed");
      }

      const normalizedEmail = String(data?.user?.email || email)
        .trim()
        .toLowerCase();
      localStorage.setItem("pending_email", normalizedEmail);
      localStorage.setItem("pending_role", data?.user?.role || "admin");
      if (data?.otp_expires_at)
        localStorage.setItem("otp_expires_at", data.otp_expires_at);
      if (base) localStorage.setItem("api_base_used", base);

      router.push("/pages/user/otp");
    } catch (err: any) {
      const net =
        err?.name === "AbortError" ||
        [
          "Failed to fetch",
          "Network error",
          "Network unreachable",
          "Request timeout",
        ].includes(err?.message);
      if (net) {
        const normalizedEmail = String(email).trim().toLowerCase();
        localStorage.setItem("pending_email", normalizedEmail);
        localStorage.setItem("pending_role", "admin");
        router.push("/pages/user/otp");
        return;
      }
      const msg =
        err?.name === "AbortError" ||
        [
          "Failed to fetch",
          "Network error",
          "Network unreachable",
          "Request timeout",
        ].includes(err?.message)
          ? "Failed to reach API. Ensure backend is running and CORS is configured."
          : err?.message || "Something went wrong";
      setError(msg);
    } finally {
      setSubmitting(false);
      captchaRef.current?.reset(); // ✅ reset captcha setelah submit
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-zinc-900">
      <main className="mx-auto max-w-md px-6 py-16">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-[#004236]">
            Admin Login
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Masuk untuk mengelola katalog, pesanan, dan pengguna.
          </p>
        </div>

        {checking ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 shadow-sm">
            Checking session...
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
          >
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-zinc-800"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#004236] focus:ring-2 focus:ring-[#004236]/30"
                placeholder="admin@example.com"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-zinc-800"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#004236] focus:ring-2 focus:ring-[#004236]/30"
                placeholder="••••••••"
              />
              <p className="mt-1 text-[11px] text-zinc-500">
                Gunakan akun admin atau superadmin.
              </p>
            </div>

            {/* ✅ reCAPTCHA added */}
            <div className="flex justify-center">
              <ReCAPTCHA
                sitekey="6LfiwwgsAAAAADrg93N9MGTd9Rn-u4mcSbHQCe6B"
                ref={captchaRef}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-[#004236] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#00362c] disabled:opacity-50"
            >
              {submitting ? "Signing in..." : "Sign in"}
            </button>
            <div className="mt-4 text-center">
              <a
                href="/pages/forgot-password?role=admin"
                className="text-xs font-medium text-[#004236] hover:underline"
              >
                Forgot password?
              </a>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
