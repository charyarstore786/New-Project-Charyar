import Link from "next/link";
import type { ReactNode } from "react";
import LogoutButton from "./LogoutButton";

const NAV = [
  { href: "/admin", label: "Overview", icon: "📊" },
  { href: "/admin/bookings", label: "Bookings", icon: "📋" },
  { href: "/admin/calendar", label: "Calendar", icon: "🗓️" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f6f5f3] text-ink">
      <div className="flex min-h-screen">
        <aside className="hidden w-60 flex-none flex-col border-r border-ink/10 bg-ink px-4 py-6 text-white sm:flex">
          <p className="px-2 font-display text-lg font-semibold">Short Stay Newport</p>
          <p className="px-2 text-xs text-white/40">Admin dashboard</p>

          <nav className="mt-8 flex flex-1 flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                <span aria-hidden>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>

          <LogoutButton />
        </aside>

        <div className="flex-1">
          {/* Mobile top nav */}
          <div className="flex items-center justify-between border-b border-ink/10 bg-ink px-4 py-3 text-white sm:hidden">
            <p className="font-display font-semibold">Short Stay Newport</p>
            <LogoutButton compact />
          </div>
          <nav className="flex gap-1 overflow-x-auto border-b border-ink/10 bg-white px-2 py-2 sm:hidden">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex-none rounded-full px-3 py-1.5 text-sm text-ink/70 hover:bg-ink/5"
              >
                {item.icon} {item.label}
              </Link>
            ))}
          </nav>

          <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
