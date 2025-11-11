"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function GoogleOAuthLanding() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 text-sm text-zinc-700">
          Memproses login...
        </div>
      }
    >
      <OAuthHandler />
    </Suspense>
  );
}

function OAuthHandler() {
  const params = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState("Memproses login...");

  useEffect(() => {
    const token = params.get("token");
    const role = params.get("role");
    const key =
      params.get("key") ||
      (role === "admin" || role === "superadmin" ? "admin_token" : "auth_token");
    const target =
      params.get("target") ||
      (role === "admin" || role === "superadmin"
        ? "/pages/admin/dashboard"
        : "/pages/user/profile");

    if (!token) {
      setStatus("Token tidak ditemukan.");
      return;
    }
    try {
      localStorage.setItem(key, token);
      setStatus("Login berhasil. Mengalihkan...");
      const t = setTimeout(() => router.replace(target), 800);
      return () => clearTimeout(t);
    } catch {
      setStatus("Gagal menyimpan token.");
    }
  }, [params, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 text-sm text-zinc-700">
      {status}
    </div>
  );
}
