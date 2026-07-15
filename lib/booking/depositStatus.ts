// Derives the current damage-deposit state from EventLog entries rather than
// a dedicated column — booking.stripeDepositIntentId already tracks the
// active intent, and the log gives a full history for free.

export type DepositStatus = "NONE" | "HELD" | "DECLINED" | "RELEASED" | "CHARGED" | "WAIVED";

const EVENT_TO_STATUS: Record<string, DepositStatus> = {
  DEPOSIT_HELD: "HELD",
  DEPOSIT_HOLD_DECLINED: "DECLINED",
  DEPOSIT_RELEASED: "RELEASED",
  DEPOSIT_CHARGED: "CHARGED",
  DEPOSIT_WAIVED: "WAIVED",
};

export function deriveDepositStatus(events: { type: string; createdAt: Date }[]): DepositStatus {
  const latest = events
    .filter((e) => e.type in EVENT_TO_STATUS)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  return latest ? EVENT_TO_STATUS[latest.type] : "NONE";
}
