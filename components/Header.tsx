"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const links = [
  { href: "/", label: "Home", btn: "btn-fancy" },
  { href: "/#gallery", label: "Gallery", btn: "btn-fancy" },
  { href: "/#amenities", label: "Amenities", btn: "btn-red" },
  { href: "/#location", label: "Location", btn: "btn-blue" },
  { href: "/rules", label: "House Rules & FAQ", btn: "btn-fancy" },
  { href: "/contact", label: "Contact", btn: "btn-red" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const transparent = pathname === "/" && !scrolled && !open;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        transparent
          ? "bg-transparent text-white"
          : "bg-cream/95 text-ink shadow-sm backdrop-blur"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className={`font-display text-lg font-semibold tracking-wide ${
            transparent ? "" : "title-tricolor"
          }`}
        >
          Short Stay Newport
        </Link>

        <nav className="hidden items-center gap-3 text-sm md:flex">
          {links.slice(1).map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`${l.btn} px-4 py-1.5 text-xs`}
            >
              {l.label}
            </Link>
          ))}
          <Link href="/book" className="btn-blue px-5 py-2 text-xs">
            Book Direct
          </Link>
        </nav>

        <button
          className="flex h-10 w-10 items-center justify-center md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <span className="relative block h-4 w-6">
            <span
              className={`absolute left-0 top-0 h-0.5 w-6 bg-current transition-transform ${open ? "translate-y-[7px] rotate-45" : ""}`}
            />
            <span
              className={`absolute left-0 top-[7px] h-0.5 w-6 bg-current transition-opacity ${open ? "opacity-0" : ""}`}
            />
            <span
              className={`absolute left-0 top-[14px] h-0.5 w-6 bg-current transition-transform ${open ? "-translate-y-[7px] -rotate-45" : ""}`}
            />
          </span>
        </button>
      </div>

      {open && (
        <nav className="border-t border-ink/10 bg-cream px-6 py-4 md:hidden">
          <ul className="flex flex-col items-start gap-3 text-ink">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={`${l.btn} px-4 py-1.5 text-sm`}
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/book"
                onClick={() => setOpen(false)}
                className="btn-blue px-5 py-2 text-sm"
              >
                Book Direct
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
