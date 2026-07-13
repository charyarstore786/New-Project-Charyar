"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={loading}
      className={
        compact
          ? "rounded-full border border-white/20 px-3 py-1 text-xs text-white/80 hover:bg-white/10"
          : "mt-auto rounded-lg border border-white/15 px-3 py-2 text-left text-sm text-white/70 hover:bg-white/10 hover:text-white"
      }
    >
      {loading ? "Signing out…" : "Sign out"}
    </button>
  );
}
