// Admin-editable pricing/policy, replacing the hardcoded values that used to
// live only in lib/site.ts. Falls back to those hardcoded values until a
// Setting row is saved (see the admin Settings page), so the site keeps
// working with zero configuration.

import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { site } from "@/lib/site";

export type Pricing = {
  /** All money in pounds (not pence) — matches lib/site.ts's convention. */
  nightlyRate: number;
  cleaningFee: number;
  deposit: number;
  minNights: number;
  maxNights: number;
  maxGuests: number;
};

/** Cached per-request (React cache()) so multiple call sites in one render/request share one DB read. */
export const getPricing = cache(async (): Promise<Pricing> => {
  const row = await db.setting.findUnique({ where: { id: "singleton" } });
  if (!row) {
    return {
      nightlyRate: site.nightlyRate,
      cleaningFee: site.cleaningFee,
      deposit: site.deposit,
      minNights: site.minNights,
      maxNights: site.maxNights,
      maxGuests: site.maxGuests,
    };
  }
  return {
    nightlyRate: row.nightlyRate / 100,
    cleaningFee: row.cleaningFee / 100,
    deposit: row.deposit / 100,
    minNights: row.minNights,
    maxNights: row.maxNights,
    maxGuests: row.maxGuests,
  };
});

export type DealRow = { startDate: Date; endDate: Date; type: string; value: number };

/** Active deals overlapping [from, to) — pass no args for "all active deals" (e.g. for the admin list). */
export async function getActiveDeals(from?: Date, to?: Date): Promise<DealRow[]> {
  return db.deal.findMany({
    where: {
      active: true,
      ...(from && to ? { startDate: { lt: to }, endDate: { gt: from } } : {}),
    },
    orderBy: { createdAt: "asc" },
    select: { startDate: true, endDate: true, type: true, value: true },
  });
}

/** Nightly rate in pence for one specific night, applying the first matching active deal (by creation order). */
export function nightlyRateForNight(night: Date, basePence: number, deals: DealRow[]): number {
  for (const deal of deals) {
    if (night >= deal.startDate && night < deal.endDate) {
      if (deal.type === "FIXED_RATE") return deal.value;
      if (deal.type === "PERCENTAGE_OFF") return Math.round(basePence * (1 - deal.value / 100));
    }
  }
  return basePence;
}
