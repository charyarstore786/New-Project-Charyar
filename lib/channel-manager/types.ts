// Channel-manager adapter layer (see PLAN.md "Channel sync via Sympl").
// The website talks only to this interface; Sympl (via iCal) is the primary
// provider, and API-based drivers can be added later without touching the
// booking engine.

/** An externally booked/blocked period. End date is exclusive, ISO date-only. */
export type ExternalBlock = {
  /** Stable unique id from the source (iCal UID) — used as the upsert key. */
  uid: string;
  start: string;
  end: string;
  summary?: string;
};

export interface ChannelProvider {
  readonly name: string;
  /** Fetch the current set of external blocks (OTA bookings via Sympl). */
  getBlocks(): Promise<ExternalBlock[]>;
  /**
   * Push a direct booking out to the channel manager. With iCal sync this is
   * a no-op: Sympl pulls our /api/calendar.ics feed instead.
   */
  pushBooking(booking: { reference: string; start: string; end: string }): Promise<void>;
  /** Cancel a previously pushed booking (no-op for iCal, as above). */
  cancelBooking(reference: string): Promise<void>;
}
