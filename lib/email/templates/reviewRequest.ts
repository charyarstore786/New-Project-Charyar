import "server-only";
import { site } from "@/lib/site";

/** Sent a couple of days after checkout (see lib/cron/dailyTasks.ts sendReviewRequests). */

export type ReviewRequestEmailInput = {
  firstName: string;
};

export function reviewRequestEmailSubject(): string {
  return `How was your stay? — ${site.name}`;
}

export function reviewRequestEmailText(input: ReviewRequestEmailInput): string {
  const reviewLink = process.env.GOOGLE_REVIEW_LINK;
  const reviewLine = reviewLink
    ? `If you have a couple of minutes, a quick Google review would mean a lot to us: ${reviewLink}`
    : "If you have a couple of minutes, we'd love a quick review — just reply to this email and we'll send the link.";

  return `Dear ${input.firstName}

Thank you again for staying with ${site.name} — we hope you had a comfortable, easy stay.

${reviewLine}

Hope to host you again soon!
${site.name}`;
}
