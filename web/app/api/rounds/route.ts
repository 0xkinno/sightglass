import {NextResponse} from "next/server"
import {acceptRound} from "../../../lib/accept"
import {allow, clientIp} from "../../../lib/ratelimit"
import {MAX_BODY_BYTES} from "../../../lib/schema"
import {getRound, listRounds, saveRound, storeConfigured} from "../../../lib/store"

export const dynamic = "force-dynamic"

export async function GET() {
  if (!storeConfigured()) return NextResponse.json({rounds: [], store: "not configured"})
  return NextResponse.json({rounds: await listRounds()})
}

export async function POST(req: Request) {
  if (!allow(clientIp(req))) return NextResponse.json({error: "Limit is 10 rounds per hour per address."}, {status: 429})
  const len = Number(req.headers.get("content-length") ?? "0")
  if (len > MAX_BODY_BYTES) return NextResponse.json({error: "Body over 2 MB."}, {status: 413})
  const text = await req.text()
  if (text.length > MAX_BODY_BYTES) return NextResponse.json({error: "Body over 2 MB."}, {status: 413})
  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    return NextResponse.json({error: "Body is not JSON."}, {status: 400})
  }
  const a = acceptRound(body)
  if (!a.ok) return NextResponse.json({error: a.error}, {status: a.status})
  if (!storeConfigured()) return NextResponse.json({error: "Store not configured. Nothing was stored."}, {status: 503})
  const existing = await getRound(a.round.sheet.roundId)
  if (existing) {
    if (existing.digest === a.round.digest) return NextResponse.json({id: existing.sheet.roundId, digest: existing.digest, duplicate: true})
    return NextResponse.json({error: "A different sheet already has this round id."}, {status: 409})
  }
  await saveRound(a.round)
  return NextResponse.json({id: a.round.sheet.roundId, digest: a.round.digest, url: "/handover/" + a.round.sheet.roundId}, {status: 201})
}
