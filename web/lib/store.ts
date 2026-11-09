import {list, put} from "@vercel/blob"
import type {StoredRound} from "./schema"

const PREFIX = "rounds/"

export const storeConfigured = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN)

export async function saveRound(r: StoredRound): Promise<void> {
  await put(PREFIX + r.sheet.roundId + ".json", JSON.stringify(r), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  })
}

async function fetchJson(url: string): Promise<StoredRound | null> {
  const res = await fetch(url, {cache: "no-store"})
  if (!res.ok) return null
  return (await res.json()) as StoredRound
}

export async function getRound(id: string): Promise<StoredRound | null> {
  const {blobs} = await list({prefix: PREFIX + id + ".json", limit: 1})
  const b = blobs.find((x) => x.pathname === PREFIX + id + ".json")
  return b ? fetchJson(b.url) : null
}

export interface RoundSummary {
  roundId: string
  planName: string
  signer: string
  decision: string
  signedAtMs: number
  digest: string
  source: string
  recorded: boolean
  countersigned: number
  counts: StoredRound["sheet"]["counts"]
}

export async function listRounds(): Promise<RoundSummary[]> {
  const {blobs} = await list({prefix: PREFIX, limit: 100})
  const rows = await Promise.all(blobs.map((b) => fetchJson(b.url)))
  return rows
    .filter((r): r is StoredRound => r !== null)
    .map((r) => ({
      roundId: r.sheet.roundId,
      planName: r.sheet.planName,
      signer: r.sheet.signer,
      decision: r.sheet.decision,
      signedAtMs: r.sheet.signedAtMs,
      digest: r.digest,
      source: r.sheet.source,
      recorded: Boolean(r.recorded),
      countersigned: r.countersigns.length,
      counts: r.sheet.counts,
    }))
    .sort((a, b) => Number(b.recorded) - Number(a.recorded) || b.signedAtMs - a.signedAtMs)
}

export async function timedList(): Promise<{ms: number; count: number; atMs: number}> {
  const t0 = Date.now()
  const {blobs} = await list({prefix: PREFIX, limit: 100})
  return {ms: Date.now() - t0, count: blobs.length, atMs: Date.now()}
}
