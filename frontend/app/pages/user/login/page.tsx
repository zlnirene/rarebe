"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../../../components/navbar";
import Footer from "../../../components/footer";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import ReCAPTCHA from "react-google-recaptcha"; // 🧩 Tambahan reCAPTCHA
import axios from "axios";

const resolveApiBase = () => {
  const env = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (typeof window !== "undefined") {
    const origin = window.location.origin.replace(/\/$/, "");
    // If unset or accidentally set to the Next.js origin (e.g., http://localhost:3000), fallback to Laravel
    if (!env || env === origin) return "http://localhost:8000";
  }
  return env || "http://localhost:8000";
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const captchaRef = useRef<ReCAPTCHA>(null); // 🧩 Tambahan reCAPTCHA ref

  const attemptLogin = async (email: string, password: string, captcha: string) => {
    const bases = ["http://backend.test", resolveApiBase()].filter((v, i, a) => v && a.indexOf(v) === i);
    let lastErr: any = null;
    for (const b of bases) {
      try {
        const c = new AbortController();
        const t = setTimeout(() => c.abort(), 8000);
        const res = await fetch(`${b}/api/auth/login`, {
          method: "POST",
          mode: "cors",
          cache: "no-store",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ email, password, captcha_token: captcha }), // 🧩 Kirim token captcha
          signal: c.signal,
        });
        clearTimeout(t);
        return { res, base: b };
      } catch (e: any) {
        lastErr = e?.name === "AbortError" ? new Error("Request timeout") : e;
      }
    }
    throw lastErr || new Error("Network unreachable");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // 🧩 Validasi captcha
    const token = captchaRef.current?.getValue();
    if (!token) {
      setError("Please complete the reCAPTCHA verification.");
      setSubmitting(false);
      return;
    }

    try {
      const { res, base } = await attemptLogin(email, password, token);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Incorrect email or password.");
        }
        throw new Error(data?.message || "Login failed");
      }

      // token now only issued after OTP verification
      const normalizedEmail = String(data?.user?.email || email).trim().toLowerCase();
      localStorage.setItem("pending_email", normalizedEmail);
      localStorage.setItem("pending_role", "customer");
      if (data?.otp_expires_at) localStorage.setItem("otp_expires_at", data.otp_expires_at);
      if (base) localStorage.setItem("api_base_used", base);

      router.push("/pages/user/otp");
    } catch (err: any) {
      const net = ["Failed to fetch", "Network error", "Network unreachable", "Request timeout"].includes(err?.message);
      if (net) {
        const normalizedEmail = String(email).trim().toLowerCase();
        localStorage.setItem("pending_email", normalizedEmail);
        localStorage.setItem("pending_role", "customer");
        const base = resolveApiBase();
        if (base) localStorage.setItem("api_base_used", base);
        router.push("/pages/user/otp");
        return;
      }
      const msg = net
        ? "Failed to reach API. Check NEXT_PUBLIC_API_URL and backend CORS."
        : err?.message || "Something went wrong";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#FDFBF8] text-zinc-900 pt-16">
        <main className="mx-auto max-w-4xl px-6 py-12">
          <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
            <div className="grid md:grid-cols-2">
              {/* Brand panel */}
              <aside className="relative hidden md:flex flex-col justify-between gap-6 border-r border-zinc-200 bg-gradient-to-br from-[#f7eef2] via-[#FDFBF8] to-[#f3e7ec] p-8">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-[#004236]">The Body Shop</h2>
                  <p className="mt-2 text-sm text-zinc-700">
                    Effortless, skin-loving cosmetics. Sign in to continue.
                  </p>
                </div>
                <div className="rounded-2xl border border-[#7f2549]/15 bg-white/40 p-4 text-sm text-zinc-700">
                  Tip: After login, check your email for a 6-digit OTP code.
                </div>
              </aside>

              {/* Form panel */}
              <section className="p-6 sm:p-10">
                <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
                <p className="mt-2 text-sm text-zinc-600">
                  Enter your email and password to receive an OTP.
                </p>

                <div className="mt-3 text-right">
                  <Link href="/pages/forgot-password" className="text-xs font-medium text-[#004236] hover:underline">
                    Forgot password?
                  </Link>
                </div>

                <form onSubmit={onSubmit} className="mt-4 space-y-4" autoComplete="off">
                  {error && (
                    <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-zinc-800">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004236]/30 focus:border-[#004236]"
                      placeholder="you@gmail.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-zinc-800">
                      Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004236]/30 focus:border-[#004236]"
                      placeholder="••••••••"
                      autoComplete="new-password"
                    />
                  </div>

                  {/* 🧩 Tambahan reCAPTCHA */}
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

                  <GoogleOAuthProvider clientId="1001335307425-04g1g92fom1jt43uobd8vse4jjmt8qht.apps.googleusercontent.com">
                    <GoogleLogin
                      onSuccess={async (credentialResponse) => {
                        try {
                          const token = credentialResponse.credential;
                          const res = await axios.post("http://backend.test/api/google-login", { token });
                          if (res.status === 200) {
                            localStorage.setItem("auth_token", res.data.token);
                            window.dispatchEvent(new Event("authChanged"));
                            router.push("/");
                          }
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                    />
                  </GoogleOAuthProvider>

                  <p className="text-center text-sm text-zinc-600">
                    Don&apos;t have an account?{" "}
                    <Link href="/pages/user/register" className="font-medium text-[#004236] hover:underline">
                      Register
                    </Link>
                  </p>
                </form>
              </section>
            </div>
          </div>
        </main>
      </div>
      <Footer />
    </>
  );
}
