import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  autoCancelStalePending,
  autoReleaseDeposits,
  placeDepositsForCheckIns,
  purgeOldGuestIdData,
  retryDeclinedDeposits,
  sendCheckInInstructions,
  sendCheckOutInstructions,
  sendReviewRequests,
} from "@/lib/cron/dailyTasks";

/**
 * Single daily cron entry point (see PLAN.md "Automations"), scheduled in
 * vercel.json. Vercel sends `Authorization: Bearer $CRON_SECRET` for
 * Cron Job invocations once CRON_SECRET is set as a project env var.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("Cron route called but CRON_SECRET is not set");
    return NextResponse.json({ error: "Cron not configured." }, { status: 500 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const results = {
    deposits: await placeDepositsForCheckIns(),
    depositRetries: await retryDeclinedDeposits(),
    depositAutoRelease: await autoReleaseDeposits(),
    checkInEmails: await sendCheckInInstructions(),
    checkOutEmails: await sendCheckOutInstructions(),
    reviewRequests: await sendReviewRequests(),
    autoCancelled: await autoCancelStalePending(),
    gdprPurge: await purgeOldGuestIdData(),
  };

  const totalProcessed = Object.values(results).reduce((sum, r) => sum + r.processed, 0);
  const allErrors = Object.values(results).flatMap((r) => r.errors);

  await db.eventLog.create({
    data: {
      type: "CRON_DAILY_RUN",
      detail: `Processed ${totalProcessed} item(s)${allErrors.length ? `, ${allErrors.length} error(s): ${allErrors.join("; ")}` : "."}`,
    },
  });

  return NextResponse.json({ ok: true, results });
}
