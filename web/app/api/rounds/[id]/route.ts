import {NextResponse} from "next/server"
import {ID_RE} from "../../../../lib/schema"
import {getRound, storeConfigured} from "../../../../lib/store"

export const dynamic = "force-dynamic"

export async function GET(_: Request, {params}: {params: Promise<{id: string}>}) {
  const {id} = await params
  if (!ID_RE.test(id)) return NextResponse.json({error: "Bad id."}, {status: 400})
  if (!storeConfigured()) return NextResponse.json({error: "Store not configured."}, {status: 503})
  const r = await getRound(id)
  if (!r) return NextResponse.json({error: "Not found."}, {status: 404})
  return NextResponse.json(r)
}
