import { getPricing } from "@/lib/pricing";
import Card from "@/components/admin/Card";
import PageHeader from "@/components/admin/PageHeader";
import SettingsForm from "./SettingsForm";

// Reads live DB data — must never be statically prerendered at build time.
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const pricing = await getPricing();

  return (
    <div>
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        subtitle="Pricing and booking policy — changes apply across the site immediately."
      />

      <Card className="mt-6 max-w-xl p-6">
        <SettingsForm initial={pricing} />
      </Card>

      <p className="mt-4 max-w-xl text-xs text-ink/40">
        This nightly rate is the base rate. To offer a lower rate or discount for specific dates
        (e.g. off-season, last-minute), use{" "}
        <a href="/admin/deals" className="underline">
          Deals
        </a>{" "}
        instead of changing the base rate.
      </p>
    </div>
  );
}
