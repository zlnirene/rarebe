"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../../../components/navbar";
import Footer from "../../../components/footer";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import axios from "axios";

const resolveApiBases = () => {
  const env = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  const set = new Set<string>();
  if (env) set.add(env);
  set.add("http://backend.test");
  set.add("http://127.0.0.1:8000");
  set.add("http://localhost:8000");
  return Array.from(set);
};

async function fetchWithFallback(path: string, init: RequestInit) {
  const bases = resolveApiBases();
  let lastErr: any = null;
  for (const base of bases) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${base}${path}`, { ...init, signal: controller.signal });
      clearTimeout(timeout);
      if (!res) throw new Error("Network error");
      return { res, base };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Network error");
}

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiUsed, setApiUsed] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Gmail-only validation
    const normalizedEmail = email.trim().toLowerCase();
    if (!/@gmail\.com$/i.test(normalizedEmail)) {
      setError("Please register with a Gmail address (example@gmail.com).");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const { res, base } = await fetchWithFallback("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ name, email: normalizedEmail, password }),
      });
      setApiUsed(base);

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          data?.errors
            ? Object.values(data.errors).flat().join(" ")
            : data?.message || "Registration failed";
        throw new Error(msg);
      }

      // OTP-first flow: save pending email and go to OTP page
      localStorage.setItem("pending_email", data?.user?.email || normalizedEmail);
      localStorage.setItem("pending_role", "customer");
      if (data?.otp_expires_at) localStorage.setItem("otp_expires_at", data.otp_expires_at);

      router.push("/pages/user/otp");
    } catch (err: any) {
      const msg =
        err?.name === "AbortError" ||
        err?.message === "Failed to fetch" ||
        err?.message === "Network error"
          ? "Failed to reach API. Ensure backend is running and CORS is configured."
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
              {/* Brand / Visual panel (match login theme) */}
              <aside className="relative hidden md:flex flex-col justify-between gap-6 border-r border-zinc-200 bg-gradient-to-br from-[#f7eef2] via-[#FDFBF8] to-[#f3e7ec] p-8">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-[#004236]">
                    The Body Shop
                  </h2>
                  <p className="mt-2 text-sm text-zinc-700">
                    Create your account to shop favorites and manage orders.
                  </p>
                </div>
                <div className="rounded-2xl border border-[#004236]/15 bg-white/40 p-4 text-sm text-zinc-700">
                  You&apos;ll receive a 6-digit OTP to verify your email.
                </div>
              </aside>

              {/* Form panel */}
              <section className="p-6 sm:p-10">
                <h1 className="text-3xl font-semibold tracking-tight">Create account</h1>
                <p className="mt-2 text-sm text-zinc-600">
                  Use a Gmail address and verify with the OTP we send.
                </p>

                <form onSubmit={onSubmit} className="mt-6 space-y-4">
                  {error && (
                    <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                      {error}
                    </div>
                  )}
                  {apiUsed && (
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                      Using API: {apiUsed}
                    </div>
                  )}

                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-zinc-800">
                      Name
                    </label>
                    <input
                      id="name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004236]/30"
                      placeholder="Your name"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-zinc-800">
                      Email (Gmail only)
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004236]/30"
                      placeholder="yourname@gmail.com"
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
                      className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004236]/30"
                      placeholder="••••••••"
                    />
                  </div>

                  <div>
                    <label htmlFor="confirm" className="block text-sm font-medium text-zinc-800">
                      Confirm password
                    </label>
                    <input
                      id="confirm"
                      type="password"
                      required
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004236]/30"
                      placeholder="••••••••"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-full bg-[#004236] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#00362c] disabled:opacity-50"
                  >
                    {submitting ? "Creating account..." : "Create account"}
                  </button>

                  {/* Google sign-up like login page */}
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
                          setError("Google sign-in failed. Please try again.");
                        }
                      }}
                      onError={() => setError("Google sign-in failed. Please try again.")}
                    />
                  </GoogleOAuthProvider>

                  <p className="text-center text-sm text-zinc-600">
                    Already have an account?{" "}
                    <Link
                      href="/pages/user/login"
                      className="font-medium text-[#004236] hover:underline"
                    >
                      Login
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
