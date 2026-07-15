"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { isRangeAvailable } from "@/lib/booking/availability";
import { parseIsoDate } from "@/lib/booking/dates";

const MANUAL_SOURCE = "manual";

function revalidateCalendarPaths() {
  revalidatePath("/admin/calendar");
  revalidatePath("/");
  revalidatePath("/book");
}

export async function createManualBlock(input: {
  startDate: string;
  endDate: string;
  note?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const startDate = parseIsoDate(input.startDate);
  const endDate = parseIsoDate(input.endDate);
  if (!startDate || !endDate) return { ok: false, error: "Please choose valid dates." };
  if (endDate <= startDate) return { ok: false, error: "End date must be after start date." };

  if (!(await isRangeAvailable(startDate, endDate))) {
    return { ok: false, error: "Those dates overlap an existing booking or block." };
  }

  await db.calendarBlock.create({
    data: {
      uid: `manual-${crypto.randomUUID()}`,
      start: startDate,
      end: endDate,
      summary: input.note?.trim().slice(0, 200) || "Blocked",
      source: MANUAL_SOURCE,
    },
  });

  revalidateCalendarPaths();
  return { ok: true };
}

/** Only manual blocks can be removed here — synced external blocks just come back on the next sync. */
export async function deleteManualBlock(id: string) {
  await db.calendarBlock.deleteMany({ where: { id, source: MANUAL_SOURCE } });
  revalidateCalendarPaths();
}
