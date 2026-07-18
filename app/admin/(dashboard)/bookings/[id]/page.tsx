import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatGbp } from "@/lib/booking/quote";
import { deriveDepositStatus } from "@/lib/booking/depositStatus";
import { getPricing } from "@/lib/pricing";
import StatusBadge from "@/components/admin/StatusBadge";
import Card from "@/components/admin/Card";
import Row from "@/components/admin/Row";
import { IconChevronLeft } from "@/components/admin/icons";
import ActionButtons from "./ActionButtons";
import CardSection from "./CardSection";
import MessagesThread from "./MessagesThread";

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const booking = await db.booking.findUnique({
    where: { id },
    include: {
      guest: true,
      damageClaims: { orderBy: { createdAt: "desc" } },
      emails: { orderBy: { sentAt: "desc" } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!booking) notFound();

  const events = await db.eventLog.findMany({
    where: { bookingId: id },
    orderBy: { createdAt: "desc" },
  });

  const depositStatus = deriveDepositStatus(events);
  const { deposit: depositAmount } = await getPricing();

  let idSummary: Record<string, string> | null = null;
  try {
    idSummary = booking.guest.idSummary ? JSON.parse(booking.guest.idSummary) : null;
  } catch {
    idSummary = null;
  }

  return (
    <div>
      <Link href="/admin/bookings" className="flex items-center gap-1 text-sm text-ink/50 hover:text-gold-dark">
        <IconChevronLeft className="text-xs" /> All bookings
      </Link>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">{booking.reference}</h1>
          <p className="mt-1 text-sm text-ink/50">
            {booking.checkIn.toISOString().slice(0, 10)} → {booking.checkOut.toISOString().slice(0, 10)} ·{" "}
            {booking.nights} night(s) · {booking.guests} guest(s)
          </p>
        </div>
        <StatusBadge status={booking.status} />
      </div>

      <div className="mt-6">
        <ActionButtons
          bookingId={booking.id}
          reference={booking.reference}
          status={booking.status}
          checkIn={booking.checkIn.toISOString()}
          depositStatus={depositStatus}
          depositAmount={depositAmount}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card as="section" className="p-5">
          <h2 className="font-display text-lg font-semibold">Guest</h2>
          <div className="mt-3">
            <Row label="Name" value={booking.guest.name} />
            <Row label="Email" value={booking.guest.email} />
            <Row label="Phone" value={booking.guest.phone} />
            <Row label="Address" value={booking.guest.address || "—"} />
            <Row label="Country" value={booking.guest.country || "—"} />
            <Row label="Verification" value={booking.guest.verificationStatus} />
          </div>
          {idSummary && (
            <div className="mt-4 rounded-lg bg-gold/[0.07] p-3 text-sm">
              <p className="font-medium">ID check summary</p>
              <p className="mt-1 text-ink/60">
                {idSummary.documentType} · {idSummary.documentNumber} · checked{" "}
                {idSummary.checkedAt ? new Date(idSummary.checkedAt).toLocaleString("en-GB") : "—"}
              </p>
            </div>
          )}
        </Card>

        <Card as="section" className="p-5">
          <h2 className="font-display text-lg font-semibold">Payment</h2>
          <div className="mt-3">
            <Row label="Nightly rate" value={formatGbp(booking.nightlyRate)} />
            <Row label="Cleaning fee" value={formatGbp(booking.cleaningFee)} />
            <Row label="Total" value={<span className="font-display text-base">{formatGbp(booking.total)}</span>} />
            <Row label="Stripe customer" value={<code className="text-xs">{booking.stripeCustomerId || "—"}</code>} />
            <Row
              label="Payment intent"
              value={<code className="text-xs">{booking.stripePaymentIntentId || "—"}</code>}
            />
            <Row label="Setup intent" value={<code className="text-xs">{booking.stripeSetupIntentId || "—"}</code>} />
            <Row label="Deposit status" value={depositStatus} />
            <Row label="Deposit intent" value={<code className="text-xs">{booking.stripeDepositIntentId || "—"}</code>} />
          </div>
        </Card>

        <CardSection
          bookingId={booking.id}
          guestName={booking.guest.name}
          guestEmail={booking.guest.email}
          total={booking.total}
          hasCard={!!booking.stripeCustomerId && !!booking.stripeSetupIntentId}
          alreadyCharged={!!booking.stripePaymentIntentId}
        />

        <Card as="section" className="p-5">
          <h2 className="font-display text-lg font-semibold">Damage claims</h2>
          {booking.damageClaims.length === 0 ? (
            <p className="mt-3 text-sm text-ink/50">None recorded.</p>
          ) : (
            <div className="mt-3">
              {booking.damageClaims.map((c) => (
                <Row
                  key={c.id}
                  label={new Date(c.createdAt).toLocaleDateString("en-GB")}
                  value={`${formatGbp(c.amount)} — ${c.note}`}
                />
              ))}
            </div>
          )}
        </Card>

        <Card as="section" className="p-5">
          <h2 className="font-display text-lg font-semibold">Emails sent</h2>
          {booking.emails.length === 0 ? (
            <p className="mt-3 text-sm text-ink/50">None yet.</p>
          ) : (
            <div className="mt-3">
              {booking.emails.map((e) => (
                <Row key={e.id} label={e.type} value={new Date(e.sentAt).toLocaleString("en-GB")} />
              ))}
            </div>
          )}
        </Card>

        <MessagesThread
          bookingId={booking.id}
          messages={booking.messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }))}
        />

        <Card as="section" className="p-5 lg:col-span-2">
          <h2 className="font-display text-lg font-semibold">Activity log</h2>
          {events.length === 0 ? (
            <p className="mt-3 text-sm text-ink/50">No events yet.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {events.map((e) => (
                <li key={e.id} className="text-sm">
                  <span className="font-medium">{e.type}</span>{" "}
                  <span className="text-ink/40">{new Date(e.createdAt).toLocaleString("en-GB")}</span>
                  {e.detail && <p className="text-ink/60">{e.detail}</p>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
