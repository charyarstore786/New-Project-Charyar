"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export default function NavLink({
  href,
  icon,
  label,
  compact = false,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  compact?: boolean;
}) {
  const pathname = usePathname();
  const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  if (compact) {
    return (
      <Link
        href={href}
        data-active={active}
        className={`admin-nav-link flex flex-none items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${
          active ? "bg-ink text-white" : "bg-white text-ink/60 hover:bg-ink/5"
        }`}
      >
        <span className="text-[15px]">{icon}</span>
        {label}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      data-active={active}
      className="admin-nav-link flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/75 hover:bg-white/[0.06] hover:text-white"
    >
      <span className="admin-nav-icon text-[17px]">{icon}</span>
      {label}
    </Link>
  );
}
