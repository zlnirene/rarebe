"use client";
import SidebarAdmin from "../../../components/sidebaradmin";

export default function AdminProductVariantPage() {
  return (
    <SidebarAdmin>
      <main className="mx-auto max-w-4xl p-6">
        <h1 className="text-2xl font-semibold text-[#004236] mb-4">Product Variants</h1>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Variant feature has been disabled and removed from the system.
        </div>
      </main>
    </SidebarAdmin>
  );
}
