import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How The Newport Studio handles your personal data.",
};

export default function PrivacyPage() {
  return (
    <div className="prose-headings:font-display mx-auto max-w-3xl px-4 pb-24 pt-32 sm:px-6">
      <h1 className="title-pink font-display text-4xl font-semibold">Privacy Policy</h1>
      <p className="mt-2 text-sm text-ink/50">Last updated: July 2026</p>

      <div className="mt-8 space-y-8 leading-relaxed text-ink/80">
        <section>
          <h2 className="font-display text-2xl font-semibold text-ink">
            Who we are
          </h2>
          <p className="mt-3">
            {site.name} is operated by {site.legalName}. You can contact us at{" "}
            <a className="text-accent underline" href={`mailto:${site.email}`}>
              {site.email}
            </a>{" "}
            or via WhatsApp.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-ink">
            What we collect and why
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>
              <strong>Booking details</strong> — your name, email, phone number
              and stay dates, used to manage your reservation and stay.
            </li>
            <li>
              <strong>Payment details</strong> — card payments are processed by
              our payment provider (Stripe). Your card number never touches our
              systems.
            </li>
            <li>
              <strong>Identity verification</strong> — before a booking is
              confirmed, the lead guest completes a photo ID check handled by a
              secure verification provider. Your ID document images stay with
              that provider; we only receive the verification result and basic
              extracted details, which are deleted shortly after your stay.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-ink">
            How long we keep it
          </h2>
          <p className="mt-3">
            Booking records are kept for as long as required for accounting and
            legal purposes. Identity verification summaries are deleted shortly
            after checkout. We never sell your data.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-ink">
            Your rights
          </h2>
          <p className="mt-3">
            Under UK GDPR you can request access to, correction of, or deletion
            of your personal data at any time by emailing{" "}
            <a className="text-accent underline" href={`mailto:${site.email}`}>
              {site.email}
            </a>
            . You also have the right to complain to the ICO
            (ico.org.uk).
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-ink">
            Cookies
          </h2>
          <p className="mt-3">
            This site does not use advertising or tracking cookies.
          </p>
        </section>
      </div>
    </div>
  );
}
