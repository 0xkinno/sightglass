import {NextResponse} from "next/server"
import {LIMIT_PER_HOUR} from "../../../lib/ratelimit"
import {MAX_BODY_BYTES} from "../../../lib/schema"
import {storeConfigured, timedList} from "../../../lib/store"

export const dynamic = "force-dynamic"

// Measured, not claimed: one Blob list call is made now and its time is reported.
export async function GET() {
  const base = {
    time: new Date().toISOString(),
    limits: {bodyBytes: MAX_BODY_BYTES, postsPerHourPerIp: LIMIT_PER_HOUR, limiter: "in memory, per server instance"},
  }
  if (!storeConfigured()) return NextResponse.json({...base, ok: false, store: "not configured"}, {status: 503})
  try {
    const m = await timedList()
    return NextResponse.json({...base, ok: true, store: "vercel-blob", blobListMs: m.ms, rounds: m.count})
  } catch (e) {
    return NextResponse.json({...base, ok: false, store: "vercel-blob", error: String((e as Error).message).slice(0, 200)}, {status: 503})
  }
}
