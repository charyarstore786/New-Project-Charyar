"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconLogout } from "@/components/admin/icons";

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
          ? "flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1 text-xs text-white/75 hover:bg-white/10"
          : "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white/90"
      }
    >
      <IconLogout className={compact ? "text-sm" : "text-base"} />
      {loading ? "Signing out…" : "Sign out"}
    </button>
  );
}
