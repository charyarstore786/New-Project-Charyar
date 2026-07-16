import { db } from "@/lib/db";
import PageHeader from "@/components/admin/PageHeader";
import DealsClient from "./DealsClient";

// Reads live DB data — must never be statically prerendered at build time.
export const dynamic = "force-dynamic";

export default async function DealsPage() {
  const deals = await db.deal.findMany({ orderBy: { startDate: "desc" } });

  return (
    <div>
      <PageHeader
        eyebrow="Promotions"
        title="Deals"
        subtitle="Date-range discounts, applied automatically on top of the base nightly rate."
      />

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
