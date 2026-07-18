import type { Metadata } from "next";
import { site } from "@/lib/site";
import { getPricing } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "House Rules & FAQ",
  description:
    "House rules, check-in times and frequently asked questions for Short Stay Newport.",
};

export const revalidate = 60;

function buildRules(deposit: number, maxGuests: number) {
  return [
    [`Maximum ${maxGuests} guests`, "The booking is valid only for the number of guests specified at the time of reservation."],
    ["No unregistered guests", "No unregistered guests or overnight visitors are allowed without prior approval from the host."],
    ["No smoking or vaping", "Smoking is not permitted inside the property. Smoking is permitted outside only."],
    ["No parties or events", "Parties, gatherings and events are strictly prohibited — please respect our neighbours."],
    ["Quiet hours 10 PM – 8 AM", "Keep noise to a minimum during quiet hours."],
    ["No pets", "We are unable to accommodate pets."],
    ["Light meals only", "The kitchenette has a kettle, toaster and microwave. Full cooking is not permitted."],
    ["Leave it as you found it", "Please leave the studio clean and tidy — excessive mess may incur a cleaning fee. Please don't move or remove furniture, decor or amenities."],
    ["Report issues promptly", "If anything is damaged or needs attention, please let us know straight away so we can sort it quickly."],
    ["ID verification required", "For everyone's security, the lead guest must complete a quick photo ID check before the booking is confirmed."],
    [`£${deposit} damage deposit`, `A £${deposit} deposit is held on your card on the day of check-in and released after checkout, provided the studio is left as found.`],
    ["Parking", "Free street parking is available on a first-come, first-served basis. Please don't park on double yellow lines or block driveways — the host isn't responsible for damage to or theft from your vehicle."],
    ["Breach of house rules", "Breaching the guest limit, house rules or hosting an event may result in immediate cancellation without refund, and possible additional charges."],
  ];
}

function buildFaqs(deposit: number) {
  return [
    [
      "What are the check-in and check-out times?",
      `Check-in is from ${site.checkIn} and check-out is by ${site.checkOut}. Early check-in or late check-out may be available for an additional fee, subject to availability — just ask. Full check-in instructions are emailed to you the day before arrival.`,
    ],
    [
      "Is the studio completely private?",
      "Yes — it is fully self-contained with its own private entrance, bathroom and kitchenette. You won't share anything with anyone.",
    ],
    [
      "Can I cook in the studio?",
      "The kitchenette is designed for light meals: kettle, toaster and microwave, with complimentary tea, coffee and sugar. Full cooking isn't permitted, but Newport city centre — a mile away — has plenty of restaurants and takeaways.",
    ],
    [
      "How does the damage deposit work?",
      `Your card details are saved securely when you book — nothing is charged. On the day of check-in a £${deposit} hold is placed on the card, and it is released automatically after checkout once the studio is checked. You only pay if something is damaged.`,
    ],
    [
      "What's your cancellation policy?",
      "Free cancellation up to 24 hours before check-in, with a full refund of the stay total. Cancellations within 24 hours of check-in, or no-shows, aren't refundable. The damage deposit is separate and is never affected by cancellation timing.",
    ],
    [
      "Why do you need my ID?",
      "A quick photo ID check (passport, driving licence or national ID) keeps the studio safe and secure for every guest. It takes about a minute on your phone and your documents are handled by our secure verification provider — we never store them ourselves.",
    ],
    [
      "Is parking available?",
      "Yes, free street parking is available near the studio. Please park legally — this is the guest's responsibility.",
    ],
    [
      "Is there a washing machine?",
      "Yes — the studio has both a washing machine and a tumble dryer, plus an iron and ironing board.",
    ],
    [
      "How far is the Celtic Manor / ICC Wales?",
      "About 2 miles — roughly a 5–10 minute drive. Cardiff is around 10 miles and Bristol Airport about 50 minutes by car.",
    ],
    [
      "When will I get the address and entry details?",
      "The full address is shared once your booking is confirmed, and detailed check-in instructions are emailed the day before you arrive.",
    ],
  ];
}

export default async function RulesPage() {
  const { deposit, maxGuests } = await getPricing();
  const rules = buildRules(deposit, maxGuests);
  const faqs = buildFaqs(deposit);
  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-32 sm:px-6">
      <span className="btn-red px-4 py-1.5 text-xs uppercase tracking-[0.2em]">
        Good to know
      </span>
      <h1 className="title-red mt-4 font-display text-4xl font-semibold">
        House Rules & FAQ
      </h1>
      <p className="mt-4 max-w-2xl text-ink/70">
        A few simple rules keep the studio lovely for every guest — and here
        are the answers to the questions we get asked most.
      </p>

      <h2 className="title-pink mt-14 font-display text-2xl font-semibold">House rules</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {rules.map(([title, body]) => (
          <div
            key={title}
            className="rounded-2xl border border-ink/10 bg-white p-5"
          >
            <h3 className="font-semibold">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink/70">{body}</p>
          </div>
        ))}
      </div>

      <h2 className="title-blue mt-16 font-display text-2xl font-semibold">
        Frequently asked questions
      </h2>
      <div className="mt-6 divide-y divide-ink/10 rounded-2xl border border-ink/10 bg-white px-6">
        {faqs.map(([q, a]) => (
          <details key={q} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
              {q}
              <span
                className="text-accent transition-transform group-open:rotate-45"
                aria-hidden
              >
                +
              </span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-ink/70">{a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
