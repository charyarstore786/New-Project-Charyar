import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/admin/auth";
import LogoutButton from "./LogoutButton";
import NavLink from "@/components/admin/NavLink";
import {
  IconOverview,
  IconBookings,
  IconCalendar,
  IconGuests,
  IconAnalytics,
  IconDeals,
  IconSync,
  IconSettings,
} from "@/components/admin/icons";

const NAV = [
  { href: "/admin", label: "Overview", icon: <IconOverview /> },
  { href: "/admin/bookings", label: "Bookings", icon: <IconBookings /> },
  { href: "/admin/calendar", label: "Calendar", icon: <IconCalendar /> },
  { href: "/admin/guests", label: "Guests", icon: <IconGuests /> },
  { href: "/admin/analytics", label: "Analytics", icon: <IconAnalytics /> },
  { href: "/admin/deals", label: "Deals", icon: <IconDeals /> },
  { href: "/admin/sync", label: "iCal Sync", icon: <IconSync /> },
  { href: "/admin/settings", label: "Settings", icon: <IconSettings /> },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!verifySessionToken(token)) redirect("/admin/login");

  return (
    <div className="admin-shell min-h-screen text-ink">
      <div className="flex min-h-screen">
        <aside className="admin-sidebar hidden w-64 flex-none flex-col px-4 py-6 text-white sm:flex">
          <div className="flex items-center gap-3 px-2">
            <span className="admin-brand-mark">SN</span>
            <div>
              <p className="font-display text-base font-semibold leading-tight">Short Stay Newport</p>
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/35">Admin dashboard</p>
            </div>
          </div>

          <nav className="mt-8 flex flex-1 flex-col gap-1">
            {NAV.map((item) => (
              <NavLink key={item.href} href={item.href} icon={item.icon} label={item.label} />
            ))}
          </nav>

          <div className="mt-4 border-t border-white/10 pt-4">
            <LogoutButton />
          </div>
        </aside>

        <div className="flex-1">
          {/* Mobile top nav */}
          <div className="admin-sidebar flex items-center justify-between px-4 py-3 text-white sm:hidden">
            <div className="flex items-center gap-2.5">
              <span className="admin-brand-mark h-8 w-8 text-sm">SN</span>
              <p className="font-display text-sm font-semibold">Short Stay Newport</p>
            </div>
            <LogoutButton compact />
          </div>
          <nav className="flex gap-1.5 overflow-x-auto border-b border-ink/10 bg-white/80 px-2 py-2 backdrop-blur sm:hidden">
            {NAV.map((item) => (
              <NavLink key={item.href} href={item.href} icon={item.icon} label={item.label} compact />
            ))}
          </nav>

          <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
