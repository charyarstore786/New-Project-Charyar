import { ICalProvider } from "./ical";
import { MockProvider } from "./mock";
import type { ChannelProvider } from "./types";

export type { ChannelProvider, ExternalBlock } from "./types";

/** Real Sympl iCal sync when the URL is configured, mock otherwise. */
export function getChannelProvider(): ChannelProvider {
  const url = process.env.SYMPL_ICAL_URL;
  return url ? new ICalProvider(url) : new MockProvider();
}
