import { getPricing } from "@/lib/pricing";
import SettingsForm from "./SettingsForm";

// Reads live DB data — must never be statically prerendered at build time.
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const pricing = await getPricing();

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Settings</h1>
      <p className="mt-1 text-sm text-ink/50">
        Pricing and booking policy — changes apply across the site immediately.
      </p>

      <div className="mt-6 max-w-xl rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
        <SettingsForm initial={pricing} />
      </div>

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
