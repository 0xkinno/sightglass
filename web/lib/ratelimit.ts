// Per-IP limit, 10 posts per hour. In memory, so it is per server instance. /api/status says so.
export const LIMIT_PER_HOUR = 10
const hits = new Map<string, number[]>()

export function allow(ip: string, now = Date.now()): boolean {
  const cutoff = now - 3_600_000
  const arr = (hits.get(ip) ?? []).filter((t) => t > cutoff)
  if (arr.length >= LIMIT_PER_HOUR) {
    hits.set(ip, arr)
    return false
  }
  arr.push(now)
  hits.set(ip, arr)
  if (hits.size > 5000) for (const [k, v] of hits) if (v[v.length - 1] <= cutoff) hits.delete(k)
  return true
}

export function clientIp(req: Request): string {
  return (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim()
}
