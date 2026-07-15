import Image from "next/image";
import Link from "next/link";
import Gallery from "@/components/Gallery";
import HomeAvailability from "@/components/HomeAvailability";
import { photos } from "@/lib/site";
import { getPricing } from "@/lib/pricing";

// Pricing/settings are admin-editable — cache pages for at most a minute so
// changes show up quickly without going fully dynamic. Also revalidated
// on-demand (revalidatePath) right when settings/deals are saved.
export const revalidate = 60;

const highlights = [
  { label: "Sleeps 2 guests", icon: "👥", title: "title-pink" },
  { label: "Private entrance", icon: "🔑", title: "title-red" },
  { label: "Free Wi-Fi", icon: "📶", title: "title-blue" },
  { label: "Free street parking", icon: "🅿️", title: "title-pink" },
  { label: "5 min to Newport station", icon: "🚉", title: "title-red" },
  { label: "Self check-in", icon: "🕒", title: "title-blue" },
];

const amenities: { group: string; items: string[] }[] = [
  {
    group: "Sleep & Relax",
    items: [
      "2 comfortable single beds",
      "Fresh linen & towels included",
      "Sofa and lounge seating",
      '50" smart TV',
      "Central heating",
    ],
  },
  {
    group: "Kitchenette",
    items: [
      "Fridge freezer",
      "Kettle, toaster & microwave",
      "Complimentary tea, coffee & sugar",
      "Dining table for two",
      "No full cooking — light meals only",
    ],
  },
  {
    group: "Bathroom & Laundry",
    items: [
      "Private bathroom",
      "Bathtub with overhead shower",
      "Heated towel rail",
      "Washing machine",
      "Tumble dryer",
      "Hair dryer",
    ],
  },
  {
    group: "Work & Practical",
    items: [
      "Table doubles as a workspace",
      "Fast free Wi-Fi",
      "Iron & ironing board",
      "Wardrobe",
      "Free street parking nearby",
    ],
  },
];

const distances = [
  { place: "Newport city centre", distance: "~1 mile" },
  { place: "Newport train station", distance: "~5 min drive" },
  { place: "Celtic Manor Resort / ICC Wales", distance: "~2 miles" },
  { place: "Cardiff", distance: "~10 miles" },
  { place: "Bristol Airport", distance: "~50 min drive" },
];

export default async function Home() {
  const { nightlyRate } = await getPricing();
  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-[92svh] items-end">
        <Image
          src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=2400&auto=format&fit=crop"
          alt="Stylish modern studio apartment interior"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/30" />
        <div className="relative mx-auto w-full max-w-6xl px-4 pb-16 pt-40 sm:px-6">
          <p className="animate-fade-up text-sm font-medium uppercase tracking-[0.25em] text-white/80">
            Newport · South Wales
          </p>
          <h1 className="animate-fade-up delay-100 mt-4 max-w-2xl font-display text-4xl font-semibold leading-tight text-white sm:text-5xl md:text-6xl">
            Your private studio,{" "}
            <span className="title-tricolor">minutes from everything.</span>
          </h1>
          <p className="animate-fade-up delay-200 mt-5 max-w-xl text-lg text-white/85">
            A stylish self-contained studio for up to two guests — with its own
            entrance, free parking and everything you need for a short stay in
            Newport.
          </p>
          <div className="animate-fade-up delay-300 mt-8 flex flex-wrap items-center gap-4">
            <Link href="/book" className="btn-fancy px-7 py-3">
              Book Direct — from £{nightlyRate}/night
            </Link>
            <Link
              href="/#gallery"
              className="rounded-full border border-white/60 px-7 py-3 font-medium text-white transition-colors hover:bg-white/10"
            >
              View the studio
            </Link>
          </div>
        </div>
      </section>

      {/* Highlights strip */}
      <section className="border-b border-ink/10 bg-white">
        <ul className="mx-auto grid max-w-6xl grid-cols-2 gap-x-4 gap-y-5 px-4 py-8 text-base sm:grid-cols-3 sm:px-6 lg:grid-cols-6">
          {highlights.map((h) => (
            <li key={h.label} className="flex items-center gap-2.5">
              <span className="text-xl" aria-hidden>{h.icon}</span>
              <span className={`${h.title} font-display font-bold`}>{h.label}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Intro */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <span className="btn-fancy px-4 py-1.5 text-xs uppercase tracking-[0.2em]">
              Welcome
            </span>
            <h2 className="title-pink mt-4 font-display text-3xl font-semibold sm:text-4xl">
              Small on square feet.
              <br />
              Big on comfort.
            </h2>
            <p className="mt-5 leading-relaxed text-ink/70">
              Short Stay Newport is a fully self-contained apartment with its
              own private entrance — no shared hallways, no fuss. Inside you
              will find two comfortable single beds, a sofa, a dining table
              that doubles as a workspace, a kitchenette for light meals, and
              your own bathroom with a bathtub shower.
            </p>
            <p className="mt-4 leading-relaxed text-ink/70">
              Perfect for contractors, weekend visitors, hospital stays and
              anyone visiting Newport, Cardiff or the Celtic Manor — with the
              city centre about a mile away and free street parking outside.
            </p>
            <div className="mt-7 flex items-baseline gap-3 rounded-2xl border border-accent/25 bg-accent/5 px-6 py-5">
              <span className="font-display text-4xl font-semibold text-accent">
                £{nightlyRate}
              </span>
              <span className="text-ink/70">
                per night · book direct & skip booking-site fees
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Image
              src="/photos/twin-beds.jpg"
              alt="Twin beds with fresh linen"
              width={600}
              height={450}
              className="rounded-2xl object-cover"
            />
            <Image
              src="/photos/tea-coffee-station.jpg"
              alt="Tea and coffee station"
              width={600}
              height={450}
              className="mt-8 rounded-2xl object-cover"
            />
            <Image
              src="/photos/bathroom.jpg"
              alt="Private bathroom"
              width={600}
              height={450}
              className="rounded-2xl object-cover"
            />
            <Image
              src="/photos/dining-table.jpg"
              alt="Dining table set for two"
              width={600}
              height={450}
              className="mt-8 rounded-2xl object-cover"
            />
          </div>
        </div>
      </section>

      {/* Availability */}
      <section id="availability" className="scroll-mt-20 bg-white py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <span className="btn-blue px-4 py-1.5 text-xs uppercase tracking-[0.2em]">
            Availability
          </span>
          <h2 className="title-blue mt-4 font-display text-3xl font-semibold sm:text-4xl">
            Check your dates
          </h2>
          <p className="mt-4 max-w-xl text-ink/70">
            Live availability, synced with Airbnb, Booking.com and Vrbo. Pick
            your dates below to see pricing and start your booking.
          </p>
          <div className="mt-10">
            <HomeAvailability />
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section id="gallery" className="scroll-mt-20 bg-white py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <span className="btn-red px-4 py-1.5 text-xs uppercase tracking-[0.2em]">
            Gallery
          </span>
          <h2 className="title-red mt-4 font-display text-3xl font-semibold sm:text-4xl">
            Take a look around
          </h2>
          <p className="mt-4 max-w-xl text-ink/70">
            Every corner of the studio, exactly as you will find it.
          </p>
          <div className="mt-10">
            <Gallery photos={photos} />
          </div>
        </div>
      </section>

      {/* Amenities */}
      <section id="amenities" className="scroll-mt-20 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <span className="btn-blue px-4 py-1.5 text-xs uppercase tracking-[0.2em]">
            Amenities
          </span>
          <h2 className="title-blue mt-4 font-display text-3xl font-semibold sm:text-4xl">
            Everything you need, nothing you don&apos;t
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {amenities.map((a) => (
              <div
                key={a.group}
                className="rounded-2xl border border-ink/10 bg-white p-6"
              >
                <h3 className="font-display text-lg font-semibold">
                  {a.group}
                </h3>
                <ul className="mt-4 space-y-2 text-sm text-ink/70">
                  {a.items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-accent" aria-hidden>
                        ✓
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-ink/60">
            Please note: the kitchenette is designed for light meals — kettle,
            toaster and microwave only, no full cooking.
          </p>
        </div>
      </section>

      {/* Location */}
      <section id="location" className="scroll-mt-20 bg-ink py-20 text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 md:grid-cols-2">
          <div>
            <span className="btn-fancy px-4 py-1.5 text-xs uppercase tracking-[0.2em]">
              Location
            </span>
            <h2 className="title-pink mt-4 font-display text-3xl font-semibold sm:text-4xl">
              In the heart of South Wales
            </h2>
            <p className="mt-5 leading-relaxed text-white/70">
              Set in a quiet residential spot in Newport, you are a short hop
              from the city centre, the M4, and the Celtic Manor Resort — with
              Cardiff and the Welsh valleys within easy reach.
            </p>
            <ul className="mt-8 divide-y divide-white/10">
              {distances.map((d) => (
                <li
                  key={d.place}
                  className="flex items-center justify-between py-3 text-sm"
                >
                  <span>{d.place}</span>
                  <span className="font-medium text-white/70">
                    {d.distance}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-white/50">
              Full address shared after booking confirmation.
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl">
            <iframe
              title="Map showing the general area of the studio in Newport"
              src="https://www.google.com/maps?q=Newport,+NP19,+UK&output=embed"
              className="h-full min-h-[320px] w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>

      {/* Book direct benefits + CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <span className="btn-red px-4 py-1.5 text-xs uppercase tracking-[0.2em]">
            Book Direct
          </span>
          <h2 className="title-red mt-4 font-display text-3xl font-semibold sm:text-4xl">
            The best rate is always here
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-ink/70">
            No booking-site commission means we can offer you our lowest price
            — plus a direct line to your host before, during and after your
            stay.
          </p>
          <div className="mx-auto mt-10 grid max-w-3xl gap-6 sm:grid-cols-3">
            {[
              ["£", "Lowest price", "Direct rates undercut the big booking sites"],
              ["✓", "Verified & secure", "Card payments and ID checks handled securely"],
              ["☎", "Talk to your host", "Questions answered fast by the people who know the studio"],
            ].map(([icon, title, body]) => (
              <div
                key={title}
                className="rounded-2xl border border-ink/10 bg-white p-6 text-left"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 font-display text-lg font-semibold text-accent">
                  {icon}
                </span>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-ink/70">{body}</p>
              </div>
            ))}
          </div>
          <Link href="/book" className="btn-fancy mt-10 px-8 py-3.5">
            Check availability
          </Link>
        </div>
      </section>
    </>
  );
}
