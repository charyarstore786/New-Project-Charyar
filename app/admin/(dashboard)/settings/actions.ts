"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

export type SettingsInput = {
  nightlyRate: number;
  cleaningFee: number;
  deposit: number;
  minNights: number;
  maxNights: number;
  maxGuests: number;
};

function revalidatePricedPaths() {
  revalidatePath("/");
  revalidatePath("/book");
  revalidatePath("/rules");
  revalidatePath("/terms");
  revalidatePath("/contact");
  revalidatePath("/admin/settings");
}

export async function updateSettings(input: SettingsInput): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!Number.isFinite(input.nightlyRate) || input.nightlyRate <= 0) {
    return { ok: false, error: "Nightly rate must be greater than £0." };
  }
  if (!Number.isFinite(input.cleaningFee) || input.cleaningFee < 0) {
    return { ok: false, error: "Cleaning fee can't be negative." };
  }
  if (!Number.isFinite(input.deposit) || input.deposit < 0) {
    return { ok: false, error: "Deposit can't be negative." };
  }
  if (!Number.isInteger(input.minNights) || input.minNights < 1) {
    return { ok: false, error: "Minimum nights must be at least 1." };
  }
  if (!Number.isInteger(input.maxNights) || input.maxNights < input.minNights) {
    return { ok: false, error: "Maximum nights must be at least the minimum." };
  }
  if (!Number.isInteger(input.maxGuests) || input.maxGuests < 1) {
    return { ok: false, error: "Maximum guests must be at least 1." };
  }

  const data = {
    nightlyRate: Math.round(input.nightlyRate * 100),
    cleaningFee: Math.round(input.cleaningFee * 100),
    deposit: Math.round(input.deposit * 100),
    minNights: input.minNights,
    maxNights: input.maxNights,
    maxGuests: input.maxGuests,
  };

  await db.setting.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...data },
    update: data,
  });

  revalidatePricedPaths();
  return { ok: true };
}
