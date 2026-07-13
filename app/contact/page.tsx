import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with your host at Short Stay Newport.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-32 sm:px-6">
      <span className="btn-blue px-4 py-1.5 text-xs uppercase tracking-[0.2em]">
        Contact
      </span>
      <h1 className="title-blue mt-4 font-display text-4xl font-semibold">
        Talk to your host
      </h1>
      <p className="mt-4 max-w-2xl text-ink/70">
        Questions about dates, the studio or your stay? We are happy to help —
        usually within a few hours.
      </p>

      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        <a
          href={`mailto:${site.email}`}
          className="group rounded-2xl border border-ink/10 bg-white p-8 transition-shadow hover:shadow-md"
        >
          <p className="text-sm font-semibold uppercase tracking-wider text-ink/50">
            Email
          </p>
          <p className="mt-3 font-display text-xl font-semibold text-accent group-hover:underline">
            {site.email}
          </p>
          <p className="mt-2 text-sm text-ink/60">
            Best for booking enquiries and anything non-urgent.
          </p>
        </a>
        <a
          href={site.whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="group rounded-2xl border border-ink/10 bg-white p-8 transition-shadow hover:shadow-md"
        >
          <p className="text-sm font-semibold uppercase tracking-wider text-ink/50">
            WhatsApp Chat
          </p>
          <p className="mt-3 font-display text-xl font-semibold text-accent group-hover:underline">
            Start a WhatsApp chat
          </p>
          <p className="mt-2 text-sm text-ink/60">
            Chat with us on WhatsApp — best for same-day questions or during
            your stay.
          </p>
        </a>
      </div>

      <div className="mt-10 rounded-2xl bg-accent/5 p-8">
        <h2 className="font-display text-xl font-semibold">
          Ready to book?
        </h2>
        <p className="mt-2 max-w-xl text-sm text-ink/70">
          Email or WhatsApp us your dates and we will confirm availability and
          the total price — from £{site.nightlyRate} per night for up to{" "}
          {site.maxGuests} guests.
        </p>
      </div>
    </div>
  );
}
