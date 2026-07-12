// Minimal in-memory per-IP rate limiter for API routes. Resets on redeploy,
// which is fine for a single-property site; swap for Upstash/KV if needed.

const buckets = new Map<string, Map<string, number[]>>();

export function rateLimited(
  bucket: string,
  ip: string,
  { max, windowMs }: { max: number; windowMs: number },
): boolean {
  let hits = buckets.get(bucket);
  if (!hits) {
    hits = new Map();
    buckets.set(bucket, hits);
  }
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= max) {
    hits.set(ip, list);
    return true;
  }
  list.push(now);
  hits.set(ip, list);
  return false;
}

export function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown"
  );
}
