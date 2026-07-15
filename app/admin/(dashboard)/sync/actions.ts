"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { syncExternalBlocks } from "@/lib/booking/availability";

export async function updateIcalImportUrl(url: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = url.trim();
  if (trimmed) {
    try {
      new URL(trimmed);
    } catch {
      return { ok: false, error: "Please enter a valid URL." };
    }
  }

  await db.setting.upsert({
    where: { id: "singleton" },
    // Setting rows are created with all required pricing fields elsewhere
    // (see /admin/settings); this action only ever fires after that row
    // exists in practice, but guard with sane defaults just in case.
    create: {
      id: "singleton",
      nightlyRate: 0,
      cleaningFee: 0,
      deposit: 0,
      minNights: 1,
      maxNights: 30,
      maxGuests: 1,
      symplIcalUrl: trimmed || null,
    },
    update: { symplIcalUrl: trimmed || null },
  });

  revalidatePath("/admin/sync");
  return { ok: true };
}

export async function syncNow(): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  try {
    await syncExternalBlocks(true);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Sync failed." };
  }
  const count = await db.calendarBlock.count();
  revalidatePath("/admin/sync");
  return { ok: true, count };
}
