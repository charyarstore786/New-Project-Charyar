import Link from "next/link";
import { site } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="border-t border-ink/10 bg-ink text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-3">
        <div>
          <p className="title-tricolor font-display text-xl font-semibold">{site.name}</p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/70">
            {site.tagline}. Book direct for the best rate — no booking-site
            fees.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-white/50">
            Explore
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            <li><Link className="btn-fancy px-3.5 py-1.5 text-xs" href="/#gallery">Gallery</Link></li>
            <li><Link className="btn-red px-3.5 py-1.5 text-xs" href="/#amenities">Amenities</Link></li>
            <li><Link className="btn-blue px-3.5 py-1.5 text-xs" href="/#location">Location</Link></li>
            <li><Link className="btn-red px-3.5 py-1.5 text-xs" href="/rules">House Rules & FAQ</Link></li>
            <li><Link className="btn-blue px-3.5 py-1.5 text-xs" href="/book">Book Direct</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-white/50">
            Contact
          </p>
          <ul className="mt-4 space-y-2 text-sm text-white/80">
            <li>
              <a className="hover:text-white" href={`mailto:${site.email}`}>
                {site.email}
              </a>
            </li>
            <li>
              <a
                className="hover:text-white"
                href={site.whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp Chat
              </a>
            </li>
            <li>Newport, South Wales, UK</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            © {new Date().getFullYear()} {site.legalName}. All rights reserved.
          </p>
          <p className="flex gap-2">
            <Link className="btn-fancy px-3.5 py-1.5 text-xs" href="/privacy">Privacy Policy</Link>
            <Link className="btn-blue px-3.5 py-1.5 text-xs" href="/terms">Terms</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
