import {NextResponse} from "next/server"
import {allow, clientIp} from "../../../../../lib/ratelimit"
import {countersignSchema, ID_RE} from "../../../../../lib/schema"
import {getRound, saveRound, storeConfigured} from "../../../../../lib/store"

export const dynamic = "force-dynamic"

export async function POST(req: Request, {params}: {params: Promise<{id: string}>}) {
  const {id} = await params
  if (!ID_RE.test(id)) return NextResponse.json({error: "Bad id."}, {status: 400})
  if (!allow("cs:" + clientIp(req))) return NextResponse.json({error: "Limit is 10 per hour per address."}, {status: 429})
  const text = await req.text()
  if (text.length > 4096) return NextResponse.json({error: "Body too large."}, {status: 413})
  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    return NextResponse.json({error: "Body is not JSON."}, {status: 400})
  }
  const p = countersignSchema.safeParse(body)
  if (!p.success) {
    const i = p.error.issues[0]
    return NextResponse.json({error: "Invalid countersign: " + i.path.join(".") + " " + i.message}, {status: 400})
  }
  if (!storeConfigured()) return NextResponse.json({error: "Store not configured."}, {status: 503})
  const r = await getRound(id)
  if (!r) return NextResponse.json({error: "Not found."}, {status: 404})
  if (p.data.digest !== r.digest) {
    return NextResponse.json({error: "Digest does not match the stored sheet. Not countersigned."}, {status: 409})
  }
  r.countersigns.push({role: p.data.role, note: p.data.note ?? "", atMs: Date.now()})
  await saveRound(r)
  return NextResponse.json({ok: true, countersigns: r.countersigns.length})
}
