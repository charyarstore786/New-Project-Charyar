"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

export type DealType = "PERCENTAGE_OFF" | "FIXED_RATE";

function revalidateDealPaths() {
  revalidatePath("/");
  revalidatePath("/book");
  revalidatePath("/admin/deals");
}

function parseDateOnly(v: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function createDeal(input: {
  name: string;
  startDate: string;
  endDate: string;
  type: DealType;
  value: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const name = input.name.trim().slice(0, 80);
  if (!name) return { ok: false, error: "Please name this deal." };

  const startDate = parseDateOnly(input.startDate);
  const endDate = parseDateOnly(input.endDate);
  if (!startDate || !endDate) return { ok: false, error: "Please choose valid dates." };
  if (endDate <= startDate) return { ok: false, error: "End date must be after start date." };

  if (input.type === "PERCENTAGE_OFF") {
    if (!Number.isFinite(input.value) || input.value <= 0 || input.value > 100) {
      return { ok: false, error: "Percentage off must be between 1 and 100." };
    }
  } else if (input.type === "FIXED_RATE") {
    if (!Number.isFinite(input.value) || input.value <= 0) {
      return { ok: false, error: "Fixed rate must be greater than £0." };
    }
  } else {
    return { ok: false, error: "Invalid deal type." };
  }

  await db.deal.create({
    data: {
      name,
      startDate,
      endDate,
      type: input.type,
      value: input.type === "FIXED_RATE" ? Math.round(input.value * 100) : Math.round(input.value),
    },
  });

  revalidateDealPaths();
  return { ok: true };
}

export async function toggleDealActive(id: string, active: boolean) {
  await db.deal.update({ where: { id }, data: { active } });
  revalidateDealPaths();
}

export async function deleteDeal(id: string) {
  await db.deal.delete({ where: { id } });
  revalidateDealPaths();
}
