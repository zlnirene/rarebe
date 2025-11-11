"use client";
import { useSearchParams, useRouter } from "next/navigation";
import Navbar from "../../../components/navbar";
import Footer from "../../../components/footer";
import { useEffect, useState, Suspense } from "react";

const PendingFallback = () => (
  <>
    <Navbar />
    <div className="min-h-screen bg-[#FDFBF8] text-zinc-900 pt-16">
      <main className="mx-auto max-w-lg px-6 py-12">
        <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm text-sm text-zinc-600">
          Memuat status pembayaran...
        </div>
      </main>
    </div>
    <Footer />
  </>
);

export default function PendingPaymentPage() {
  return (
    <Suspense fallback={<PendingFallback />}>
      <PendingPaymentInner />
    </Suspense>
  );
}

function PendingPaymentInner() {
  const params = useSearchParams();
  const router = useRouter();
  const orderCode = params.get("order_code");
  const [msg, setMsg] = useState("Pembayaran gagal atau dibatalkan.");

  useEffect(() => {
    setMsg(orderCode ? "Pembayaran untuk pesanan ini gagal/dibatalkan." : "Pembayaran gagal atau dibatalkan.");
  }, [orderCode]);

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#FDFBF8] text-zinc-900 pt-16">
        <main className="mx-auto max-w-lg px-6 py-12">
          <div className="rounded-3xl border border-red-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-semibold tracking-tight mb-4 text-red-700">Pembayaran Gagal</h1>
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {msg}
            </div>
            {orderCode && (
              <p className="mt-4 text-xs text-zinc-500">
                Kode Pesanan: <span className="font-mono font-semibold">{orderCode}</span>
              </p>
            )}
            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={() => router.push("/pages/user/checkout")}
                className="w-full rounded-full bg-[#004236] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#00362c]"
              >
                Coba Lagi Pembayaran
              </button>
              <button
                onClick={() => router.push("/pages/user/profile")}
                className="w-full rounded-full border border-[#004236] px-5 py-3 text-sm font-semibold text-[#004236] transition-colors hover:bg-[#004236]/5"
              >
                Lihat Riwayat Pesanan
              </button>
              <button
                onClick={() => router.push("/pages/user/shop")}
                className="w-full rounded-full border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
              >
                Kembali Belanja
              </button>
            </div>
            <p className="mt-6 text-xs text-zinc-500 leading-relaxed">
              Jika Anda mengalami kendala saat melakukan pembayaran, silakan coba lagi atau hubungi dukungan pelanggan kami.
            </p>
          </div>
        </main>
      </div>
      <Footer />
    </>
  );
}
