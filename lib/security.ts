/**
 * Same-origin guard for state-changing API routes. Browsers always attach an
 * Origin header to cross-site POSTs, so a mismatch means the request didn't
 * come from our own pages. Requests without an Origin (curl, server-to-server)
 * pass through — rate limiting and validation still apply to those.
 */
export function crossOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}
