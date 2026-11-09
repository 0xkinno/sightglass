// RoundSheet.ts
// The artifact the engineer already uses: the round sheet that goes into the engine log, signed.
// Canonical JSON (sorted keys) plus a SHA-256 digest. The chief engineer countersigns the digest
// that was shown to them, so a sheet cannot change between being read and being countersigned.

import {Entry, SignRequest} from "./EvidenceGate"
import {RoundPlan} from "./RoundPlan"
import {sha256Hex} from "./Sha256"

export interface RoundSheet {
  schema: "sightglass.round.v1"
  roundId: string // unique per round, e.g. "2026-11-09T21-58Z-ums"
  planId: string
  planName: string
  startedAtMs: number
  signedAtMs: number
  decision: "READY" | "HOLD"
  escalation: string | null
  signer: string
  entries: Entry[]
  counts: {seen: number; corrected: number; byEye: number; alarm: number; watch: number}
  source: "lens-studio-preview" | "specs-device"
}

export function canonical(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v)
  if (Array.isArray(v)) return "[" + v.map(canonical).join(",") + "]"
  const o = v as Record<string, unknown>
  const keys = Object.keys(o).filter((k) => o[k] !== undefined).sort()
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonical(o[k])).join(",") + "}"
}

export function buildSheet(
  plan: RoundPlan,
  roundId: string,
  startedAtMs: number,
  signedAtMs: number,
  req: SignRequest,
  entries: Entry[],
  source: RoundSheet["source"],
): {sheet: RoundSheet; digest: string} {
  const counts = {
    seen: entries.filter((e) => e.state === "SEEN").length,
    corrected: entries.filter((e) => e.state === "CORRECTED").length,
    byEye: entries.filter((e) => e.state === "BY_EYE").length,
    alarm: entries.filter((e) => e.verdict === "ALARM").length,
    watch: entries.filter((e) => e.verdict === "WATCH").length,
  }
  const sheet: RoundSheet = {
    schema: "sightglass.round.v1",
    roundId,
    planId: plan.id,
    planName: plan.name,
    startedAtMs,
    signedAtMs,
    decision: req.decision,
    escalation: req.escalation,
    signer: req.signer.trim(),
    entries,
    counts,
    source,
  }
  return {sheet, digest: sha256Hex(canonical(sheet))}
}

export function verifyDigest(sheet: RoundSheet, digest: string): boolean {
  return sha256Hex(canonical(sheet)) === digest
}
