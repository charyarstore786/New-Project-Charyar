// Simple keyword-matched FAQ for the chat widget — no AI/API calls, so it
// works even without an Anthropic key. Content mirrors app/(site)/rules/page.tsx
// so answers stay consistent with the public House Rules & FAQ page.
import { site } from "@/lib/site";

export type FaqEntry = { keywords: string[]; answer: string };

export const FAQ_ENTRIES: FaqEntry[] = [
  {
    keywords: ["check in", "check-in", "checkin", "arrival", "arrive"],
    answer: `Check-in is from ${site.checkIn}. Early check-in may be available for a fee, subject to availability — just ask. Full instructions are emailed the day before you arrive.`,
  },
  {
    keywords: ["check out", "check-out", "checkout", "depart", "leaving"],
    answer: `Check-out is by ${site.checkOut}. Late check-out may be available for an additional fee, subject to availability — just ask.`,
  },
  {
    keywords: ["private", "shared", "share", "own entrance"],
    answer: "Yes, it's fully self-contained with its own private entrance, bathroom and kitchenette — you won't share anything with anyone.",
  },
  {
    keywords: ["cook", "cooking", "kitchen", "stove", "oven", "hob"],
    answer: "The kitchenette is for light meals only — kettle, toaster and microwave, plus complimentary tea, coffee and sugar. Full cooking isn't permitted, but Newport city centre (about a mile away) has plenty of restaurants and takeaways.",
  },
  {
    keywords: ["deposit", "damage deposit", "hold on my card", "security deposit"],
    answer: `Your card is saved securely when you book — nothing is charged then. A £${site.deposit} hold is placed on check-in day and released automatically after checkout, provided the studio is left as found.`,
  },
  {
    keywords: ["id check", "id verification", "identity", "why do you need my id", "passport"],
    answer: "A quick photo ID check (passport, driving licence or national ID) keeps the studio safe for every guest. It takes about a minute and is handled by our secure verification provider — we never store the documents ourselves.",
  },
  {
    keywords: ["park", "parking", "car"],
    answer: "Free street parking is available nearby on a first-come, first-served basis. Please don't block driveways or park on double yellow lines — parking is the guest's responsibility.",
  },
  {
    keywords: ["wash", "laundry", "dryer", "iron"],
    answer: "Yes — there's a washing machine and tumble dryer, plus an iron and ironing board.",
  },
  {
    keywords: ["celtic manor", "icc wales", "cardiff", "airport", "bristol", "how far", "distance"],
    answer: "Celtic Manor / ICC Wales is about 2 miles (5–10 min drive), Cardiff is around 10 miles, and Bristol Airport is about 50 minutes by car.",
  },
  {
    keywords: ["address", "location", "where is", "entry instructions", "key"],
    answer: "The full address is shared once your booking is confirmed, with detailed check-in and entry instructions emailed the day before you arrive.",
  },
  {
    keywords: ["how many guests", "max guests", "maximum guests", "sleeps"],
    answer: `The studio sleeps up to ${site.maxGuests} guests — the booking is only valid for the number of guests confirmed at the time of reservation.`,
  },
  {
    keywords: ["visitor", "extra guest", "unregistered", "friend over"],
    answer: "No unregistered guests or overnight visitors are allowed without prior approval from the host — please check with us first.",
  },
  {
    keywords: ["smok", "vape", "vaping", "cigarette"],
    answer: "Smoking and vaping aren't permitted inside — outside only, please.",
  },
  {
    keywords: ["party", "parties", "event", "gathering"],
    answer: "Parties, gatherings and events are strictly prohibited — please respect our neighbours.",
  },
  {
    keywords: ["quiet hours", "noise", "loud"],
    answer: "Quiet hours are 10 PM – 8 AM — please keep noise to a minimum during this time.",
  },
  {
    keywords: ["pet", "dog", "cat", "animal"],
    answer: "Sorry, we're unable to accommodate pets.",
  },
  {
    keywords: ["clean", "mess", "tidy"],
    answer: "Please leave the studio clean and tidy — excessive mess may incur a cleaning fee, and please don't move or remove furniture, decor or amenities.",
  },
  {
    keywords: ["wifi", "wi-fi", "internet"],
    answer: "Yes, fast free Wi-Fi is included throughout your stay.",
  },
  {
    keywords: ["tv", "television"],
    answer: "There's a 50-inch smart TV in the lounge area.",
  },
  {
    keywords: ["price", "cost", "rate", "how much", "per night"],
    answer: `From £${site.nightlyRate} per night — book direct for the best rate, no booking-site fees.`,
  },
];

/** Lightweight keyword match — no AI, works with zero external services. */
export function matchFaq(text: string): string | null {
  const normalized = text.toLowerCase();
  let best: { entry: FaqEntry; score: number } | null = null;
  for (const entry of FAQ_ENTRIES) {
    const score = entry.keywords.filter((k) => normalized.includes(k)).length;
    if (score > 0 && (!best || score > best.score)) best = { entry, score };
  }
  return best?.entry.answer ?? null;
}
