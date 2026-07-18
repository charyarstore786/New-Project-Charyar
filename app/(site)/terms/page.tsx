import type { Metadata } from "next";
import { site } from "@/lib/site";
import { getPricing } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "Booking terms and conditions for Short Stay Newport.",
};

export const revalidate = 60;

export default async function TermsPage() {
  const { maxGuests, deposit } = await getPricing();
  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-32 sm:px-6">
      <h1 className="title-blue font-display text-4xl font-semibold">
        Terms & Conditions
      </h1>
      <p className="mt-2 text-sm text-ink/50">Last updated: July 2026</p>

      <div className="mt-8 space-y-8 leading-relaxed text-ink/80">
        <section>
          <h2 className="font-display text-2xl font-semibold text-ink">
            Bookings
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>The studio accommodates a maximum of {maxGuests} guests.</li>
            <li>
              All bookings are subject to identity verification of the lead
              guest and host approval before confirmation.
            </li>
            <li>
              Check-in is from {site.checkIn}; check-out is by {site.checkOut}.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-ink">
            Payment & deposit
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>
              The full cost of the stay is authorised at booking and charged
              once the booking is approved.
            </li>
            <li>
              A refundable damage deposit of £{deposit} is held on the
              lead guest&apos;s card on the day of check-in and released after
              checkout, subject to inspection.
            </li>
            <li>
              Damage beyond normal wear and tear may be charged against the
              deposit, up to £{deposit}, within 10 days of checkout.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-ink">
            During your stay
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>
              Guests must follow the house rules, including no smoking, no
              parties, no pets and quiet hours from 10 PM to 8 AM.
            </li>
            <li>
              The kitchenette is for light meal preparation only (kettle,
              toaster, microwave). Cooking appliances must not be brought in.
            </li>
            <li>
              The host may end a stay without refund where rules are seriously
              breached.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-ink">
            Cancellations
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>
              Free cancellation up to 24 hours before check-in — the full
              stay total is refunded.
            </li>
            <li>
              Cancellations made within 24 hours of check-in, and no-shows,
              are non-refundable.
            </li>
            <li>
              The damage deposit is never affected by cancellation timing —
              it is only ever charged in the case of genuine damage to the
              property.
            </li>
            <li>
              If the host must cancel for reasons beyond their control, all
              payments and holds are refunded in full.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-ink">
            Liability
          </h2>
          <p className="mt-3">
            Guests are responsible for their own belongings during their stay.
            Nothing in these terms limits liability that cannot be limited
            under UK law. The property is operated by {site.legalName}.
          </p>
        </section>
      </div>
    </div>
  );
}
