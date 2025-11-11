"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react"; // added Suspense
import Navbar from "../../../components/navbar";
import Footer from "../../../components/footer";

// Wrapper with Suspense
export default function CompletePaymentPage() {
  return (
    <Suspense
      fallback={
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
      }
    >
      <CompletePaymentInner />
    </Suspense>
  );
}

function CompletePaymentInner() {
  const params = useSearchParams(); // now safely inside Suspense
  const router = useRouter();
  const orderCode = params.get("order_code");
  const status = params.get("status"); // paid | pending | null
  const [message, setMessage] = useState("Memproses pembayaran Anda...");

  useEffect(() => {
    if (!orderCode) {
      setMessage("Informasi pesanan tidak ditemukan.");
      return;
    }
    if (status === "paid") {
      setMessage("Pembayaran berhasil! Terima kasih atas pesanan Anda.");
    } else if (status === "pending") {
      setMessage("Pembayaran sedang diproses. Status akan berubah menjadi 'paid' setelah konfirmasi.");
    } else {
      setMessage("Status pembayaran belum diketahui. Silakan cek riwayat pesanan Anda.");
    }
  }, [orderCode, status]);

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#FDFBF8] text-zinc-900 pt-16">
        <main className="mx-auto max-w-lg px-6 py-12">
          <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-semibold tracking-tight mb-4">Status Pembayaran</h1>
            <div
              className={
                "rounded-xl border p-4 text-sm " +
                (status === "paid"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : status === "pending"
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-zinc-200 bg-zinc-50 text-zinc-700")
              }
            >
              {message}
            </div>

            {orderCode && (
              <p className="mt-4 text-xs text-zinc-500">
                Kode Pesanan: <span className="font-mono font-semibold">{orderCode}</span>
              </p>
            )}

            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={() => router.push("/pages/user/profile")}
                className="w-full rounded-full bg-[#004236] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#00362c]"
              >
                Lihat Riwayat Pesanan
              </button>
              <button
                onClick={() => router.push("/pages/user/shop")}
                className="w-full rounded-full border border-[#004236] px-5 py-3 text-sm font-semibold text-[#004236] transition-colors hover:bg-[#004236]/5"
              >
                Kembali Belanja
              </button>
            </div>

            <p className="mt-6 text-xs text-zinc-500 leading-relaxed">
              Jika status masih pending, mohon tunggu beberapa saat atau cek kembali di halaman profil.
              Apabila terjadi kendala, hubungi dukungan pelanggan kami.
            </p>
          </div>
        </main>
      </div>
      <Footer />
    </>
  );
}
