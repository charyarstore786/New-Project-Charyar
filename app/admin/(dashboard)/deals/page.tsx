import { db } from "@/lib/db";
import DealsClient from "./DealsClient";

// Reads live DB data — must never be statically prerendered at build time.
export const dynamic = "force-dynamic";

export default async function DealsPage() {
  const deals = await db.deal.findMany({ orderBy: { startDate: "desc" } });

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Deals</h1>
      <p className="mt-1 text-sm text-ink/50">
        Date-range discounts, applied automatically on top of the base nightly rate.
      </p>

      <div className="mt-6">
        <DealsClient
          deals={deals.map((d) => ({
            id: d.id,
            name: d.name,
            startDate: d.startDate.toISOString().slice(0, 10),
            endDate: d.endDate.toISOString().slice(0, 10),
            type: d.type as "PERCENTAGE_OFF" | "FIXED_RATE",
            value: d.value,
            active: d.active,
          }))}
        />
      </div>
    </div>
  );
}
