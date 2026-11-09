// Pure validation for a posted round, so tests run without a network or a blob store.
import {verifyDigest} from "./core/RoundSheet"
import type {RoundSheet} from "./core/RoundSheet"
import {postSchema} from "./schema"
import type {StoredRound} from "./schema"

export type Accepted = {ok: true; round: StoredRound} | {ok: false; status: number; error: string}

export function acceptRound(body: unknown, now = Date.now()): Accepted {
  const parsed = postSchema.safeParse(body)
  if (!parsed.success) {
    const i = parsed.error.issues[0]
    return {ok: false, status: 400, error: "Invalid round sheet: " + i.path.join(".") + " " + i.message}
  }
  const {sheet, digest, frames, overlays} = parsed.data
  if (!verifyDigest(sheet as unknown as RoundSheet, digest)) {
    return {ok: false, status: 422, error: "Digest does not match the sheet. Nothing was stored."}
  }
  const refs = new Set(sheet.entries.map((e) => e.frameRef).filter((x): x is string => Boolean(x)))
  const kept: Record<string, string> = {}
  for (const [k, v] of Object.entries(frames ?? {})) if (refs.has(k)) kept[k] = v
  const keptOverlays: NonNullable<StoredRound["overlays"]> = {}
  for (const [k, v] of Object.entries(overlays ?? {})) if (refs.has(k) && kept[k]) keptOverlays[k] = v
  return {ok: true, round: {digest, receivedAtMs: now, sheet, frames: kept, overlays: keptOverlays, countersigns: []}}
}
