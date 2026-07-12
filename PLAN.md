# Direct Booking Website — Newport Studio Apartment (Project Plan)

_Last updated: 4 July 2026_

## Context

The owner has a short-stay studio apartment in Newport, Wales (max 2 guests), listed on Airbnb, Booking.com and Vrbo — all managed through the **Sympl channel manager**. This project builds an international-standard direct-booking website with: synced availability via Sympl (no double bookings), Stripe payments, a £200 damage deposit held by card, mandatory guest ID verification with manual host approval, an AI guest assistant, automated emails, strong SEO, and GDPR-compliant handling of data.

**Feasibility: every requested feature is achievable.** One implementation note: card pre-authorisations expire after ~7 days, so the deposit uses the industry-standard "save card → hold at check-in → chargeable for 10 days after checkout" pattern (details below), which fully delivers the requested outcome.

## Key decisions

| Decision | Choice | Why |
|---|---|---|
| Architecture | Full custom Next.js app | Full control over ID/deposit/approval flow — off-the-shelf widgets can't do this |
| Channel sync | **Sympl via two-way iCal** (no API key needed) | Owner already uses Sympl as the hub for all OTA channels; iCal import/export is free and needs only two links copied. Adapter design allows API drivers later |
| Damage deposit | Save card at booking → £200 hold on check-in day → off-session charge up to £200 within 10 days of checkout | Stripe pre-auths expire after 7 days; this standard pattern fully covers the 10-day inspection window |
| ID verification | Stripe Identity | Same vendor as payments, ~£1.20/check, self-serve, auto document scan + data extraction |
| AI chat | Claude API-backed widget | Cloud-based, grounded in a property knowledge base |
| Email | Resend | Simple API, good deliverability; templates in-code |

**Mock mode:** every external service (Stripe, Sympl/iCal, Identity, Resend, Claude) sits behind an interface with a mock implementation, controlled by env vars. The site runs fully end-to-end locally with zero accounts. When the owner signs up for each service, keys/links go into `.env` and the real integration switches on.

## Tech stack

- **Next.js 15 (App Router) + TypeScript + Tailwind CSS** — fast, SEO-strong (SSG/ISR), mobile-first
- **Prisma + SQLite** for local dev; `DATABASE_URL` switchable to Postgres (Neon) for production on Vercel
- **Stripe** (Payments + Identity), **Resend** (email), **Anthropic API** (chat), **Sympl iCal** (channel sync)
- Deploy target: **Vercel** (cron jobs for automations, webhook endpoints)

## Data model (Prisma)

- `Booking` — dates, guests (≤2), price breakdown, status state machine:
  `PENDING_VERIFICATION → PENDING_APPROVAL → APPROVED → CHECKED_IN → CHECKED_OUT → CLOSED` (+ `REJECTED`, `CANCELLED`), Stripe IDs (payment intent, setup intent/customer, deposit intent)
- `Guest` — name, email, phone, country; verification status + extracted ID summary (name, DOB, doc type/number, expiry) — **document images stay in Stripe Identity, never stored in our DB**
- `CalendarBlock` — synced external bookings/blocks imported from the Sympl iCal feed
- `EmailLog` / `EventLog` — what was sent/when (idempotency for cron)
- `DamageClaim` — amount, note, Stripe charge ID

## Booking flow (guest-facing)

1. **Search availability** — date picker greyed out from local calendar (own bookings + Sympl-synced blocks); guests ≤ 2
2. **Quote** — nightly rate × nights + cleaning fee, transparent breakdown (rates set in local site config — direct prices can undercut OTA prices)
3. **Guest details** form
4. **ID verification** — Stripe Identity verification session inline (passport / driving licence / national ID); extracted details land in the admin dashboard + email to host
5. **Payment** — one Stripe flow: stay total as a **manual-capture PaymentIntent** (authorized, not captured) + card saved for the deposit (SetupIntent on the same Customer)
6. Booking becomes `PENDING_APPROVAL`; dates are blocked on the site immediately and appear in the exported iCal feed for Sympl; host gets an email + dashboard entry
7. **Host approves** → stay payment captured, confirmation email sent. **Rejects** → authorization released (guest never charged), dates unblocked, polite email. Auto-cancel if no decision within 6 days (before the 7-day auth expiry)

## Damage deposit lifecycle

- Booking time: card saved + verified (£0), clearly explained to guest ("£200 damage deposit — held, not charged")
- **Check-in day (cron):** off-session £200 manual-capture PaymentIntent → funds held
- **Checkout + inspection:** admin dashboard buttons — *Release deposit* (cancel intent) or *Charge damage* (capture up to £200 with a note)
- **Auto-release cron:** hold cancelled automatically ~6 days after checkout if the host takes no action
- **Days 7–10 fallback:** hold expired but the saved card allows an off-session charge up to £200 from the dashboard, covering the full 10-day window
- Failure handling: if the check-in-day hold is declined, host is alerted by email/dashboard

## Channel sync via Sympl (no double bookings)

Sympl remains the hub for all OTA channels; the website connects to Sympl only:

- `lib/channel-manager/` adapter interface: `getAvailability()`, `pushBooking()`, `cancelBooking()` — with `ICalProvider` (primary) and `MockProvider`; API drivers addable later without rewriting the booking engine
- **Import (pull):** cron every ~10 min fetches the Sympl iCal export URL (from env config) and updates `CalendarBlock`
- **Export (push):** site serves `/api/calendar.ics` — an iCal feed of direct bookings (from `PENDING_APPROVAL` onward). Owner pastes this URL into Sympl once; all OTAs then block those dates via Sympl
- Rates are NOT synced via iCal — nightly rate + cleaning fee live in local site config
- Final availability check inside the booking transaction as a second guard; the manual-approval step is an additional human safety net for any iCal refresh lag

## Admin dashboard (`/admin`, cookie session, password from env)

- Bookings list with status filters; detail view: guest info, ID verification result + extracted fields, payment state
- Actions: approve / reject, release deposit / charge damage, resend emails
- Calendar view of local + Sympl-synced blocks

## Automations (Vercel cron + Stripe/Identity webhooks)

- On approval → **confirmation email** (dates, price, house rules, deposit explainer)
- Day before arrival → **check-in instructions**
- Checkout morning → **check-out instructions**
- Check-in day → place deposit hold; checkout+6d → auto-release; all idempotent via `EmailLog`/`EventLog`

## AI chat assistant

- Floating chat widget (site-wide) → `/api/chat` route → Claude API with a system prompt built from `content/knowledge-base.md`: amenities, house rules (no cooking — kettle/toaster/microwave only), location, transport, check-in/out procedure, parking, FAQs. Refuses to invent prices/availability — links to the booking widget instead.

## Site content & SEO

Pages: Home (hero, gallery, amenities grid, location section, booking CTA), Booking flow, House Rules & FAQ, Contact, Privacy Policy, Terms.

Property details: max 2 guests; 2 single beds, sofa, 2 chairs, table (dining/working); fridge freezer, 50" smart TV, wardrobe, iron & board, hair dryer; kettle/toaster/microwave + complimentary tea/coffee/sugar (no cooking); washing machine + tumble dryer; private bathroom with bathtub-shower; heating; free Wi-Fi; free street parking (legal parking is guest's responsibility).

Location: ~1 mile city centre, ~5 min Newport train station, ~2 miles Celtic Manor Resort, ~10 miles Cardiff, ~50 min Bristol Airport.

SEO: per-page metadata + OpenGraph, JSON-LD `VacationRental` + `LodgingBusiness` structured data, sitemap.xml, robots.txt, semantic HTML, next/image, static generation for content pages, local-SEO copy targeting "Newport short stay", "studio apartment Newport", "serviced accommodation Newport Wales".

## GDPR & security

- ID documents live only in Stripe Identity (their retention controls); DB stores verification status + minimal extracted summary, purged N days after checkout by cron
- Card data never touches the server (Stripe Elements); webhook signature verification; admin auth; rate-limited API routes
- Privacy policy covering ID checks, deposit, retention; cookie banner (only if analytics added)

## File structure (key paths)

```
app/                    # pages + api routes (book/, admin/, api/chat, api/calendar.ics, api/webhooks/stripe, api/cron/*)
components/             # UI + booking wizard + chat widget
lib/stripe/             # payments.ts, deposit.ts, identity.ts (+ mocks)
lib/channel-manager/    # types.ts, ical.ts, mock.ts
lib/email/              # resend + react-email templates
content/knowledge-base.md, prisma/schema.prisma, .env.example
```

## Implementation order

1. Scaffold Next.js + Tailwind + Prisma; remove old `index.html`
2. Content pages + design system + SEO (fully static, immediately deployable)
3. Booking engine: availability, quote, wizard UI (mock providers)
4. Stripe payments + deposit lifecycle; Stripe Identity step
5. Admin dashboard + approval flow
6. Emails + cron automations; iCal import/export sync with Sympl
7. AI chat widget; polish, mobile QA, structured-data validation

## Verification

- `npm run dev` → walk the full booking flow in mock mode: search dates → quote → details → (mock) ID verify → (mock) pay → appears in `/admin` → approve → confirmation "email" logged → deposit hold/release simulated via cron routes triggered manually
- Double-booking guard: add an overlapping mock iCal block, confirm dates are unbookable
- iCal export: validate `/api/calendar.ics` output against the iCalendar spec
- Stripe test mode end-to-end once keys exist (test cards incl. off-session decline card)
- SEO: validate JSON-LD with Google's Rich Results test markup, check mobile viewport at 375px, Lighthouse pass

## What the owner provides

**Now:** nothing — the site runs fully in mock mode.

**Content (whenever convenient):** property photos, house rules text, check-in/out times and instructions, nightly price + cleaning fee, contact email/phone.

**At launch:** Sympl iCal export URL (into `.env`) + paste the site's iCal feed URL into Sympl; Stripe account with Identity enabled; Resend account + verified sending domain; Anthropic API key; domain name; Vercel account; chosen `ADMIN_PASSWORD`.
