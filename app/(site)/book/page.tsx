import type { Metadata } from "next";
import { Suspense } from "react";
import BookingWizard from "@/components/booking/BookingWizard";
import { site } from "@/lib/site";
import { getPricing } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Book Direct",
  description: `Book Short Stay Newport direct from £${site.nightlyRate}/night — live availability, instant request, the lowest rate guaranteed.`,
};

export const revalidate = 60;

export default async function BookPage() {
  const { nightlyRate, maxGuests } = await getPricing();
  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-32 sm:px-6">
      <span className="btn-fancy px-4 py-1.5 text-xs uppercase tracking-[0.2em]">
        Book Direct
      </span>
      <h1 className="title-pink mt-4 font-display text-4xl font-semibold">
        From £{nightlyRate} per night
      </h1>
      <p className="mt-4 max-w-2xl text-ink/70">
        Live availability synced with Airbnb, Booking.com and Vrbo — pick your
        dates, verify your ID and authorize payment. You&apos;re only charged
        once the host confirms.
      </p>

      <div className="mt-10">
        <Suspense fallback={<div className="rounded-2xl border border-ink/10 bg-white p-8 text-center text-ink/50">Loading…</div>}>
          <BookingWizard />
        </Suspense>
      </div>

      <p className="mt-10 text-sm text-ink/60">
        Prefer to book by message? Email{" "}
        <a href={`mailto:${site.email}`} className="font-medium text-accent-dark">
          {site.email}
        </a>{" "}
        or{" "}
        <a
          href={site.whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-accent-dark"
        >
          WhatsApp us
        </a>{" "}
        with your dates and number of guests (max {maxGuests}).
      </p>
    </div>
  );
}
