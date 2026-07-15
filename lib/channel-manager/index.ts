import { getSymplIcalUrl } from "@/lib/pricing";
import { ICalProvider } from "./ical";
import { MockProvider } from "./mock";
import type { ChannelProvider } from "./types";

export type { ChannelProvider, ExternalBlock } from "./types";

/**
 * Real Sympl iCal sync when a URL is configured, mock otherwise. The admin-set
 * URL (see /admin/sync) takes priority; SYMPL_ICAL_URL is a fallback for
 * anyone who'd rather keep it as a Vercel env var.
 */
export async function getChannelProvider(): Promise<ChannelProvider> {
  const url = (await getSymplIcalUrl()) || process.env.SYMPL_ICAL_URL;
  return url ? new ICalProvider(url) : new MockProvider();
}
