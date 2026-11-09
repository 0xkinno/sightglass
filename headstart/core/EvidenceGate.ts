// EvidenceGate.ts
// The rule this product exists for: a reading enters the round sheet only if the gauge was seen
// and a person accepted it, or a person read it by eye and said so. Nothing is assumed.
//
// Entry states shown to people (plain words in the UI):
//   SEEN       the camera saw the dial, code computed the value, the engineer accepted it
//   CORRECTED  the engineer changed the computed value; both numbers are kept
//   BY_EYE     the dial could not be read from the frame; the engineer entered the value
//   NOT_READ   nothing entered yet (the round cannot be signed)

import {readDial, toLogResolution, DialResult, DialPoints} from "./DialGeometry"
import {ParseResult} from "./ReaderContract"
import {GaugeSpec} from "./RoundPlan"
import {verdictFor, changeCheck, Verdict} from "./Verdict"

export type EntryState = "NOT_READ" | "SEEN" | "CORRECTED" | "BY_EYE"
export type ProposalKind = "PROPOSED" | "REVIEW" | "CANT_READ"

export interface Proposal {
  kind: ProposalKind
  gaugeId: string
  value: number | null // computed by code, null when CANT_READ
  plusMinus: number | null
  verdict: Verdict | null
  notes: string[] // plain words, shown on the tag, e.g. "Scale on dial differs from round card"
  modelValue: number | null // the model's own guess, kept for the record, never used
  frameRef: string | null // id of the crop that was sent, so the chief engineer sees what was seen
  points: DialPoints | null // where the reader pointed, drawn over the crop on the handover page
  atMs: number
}

export interface Entry {
  gaugeId: string
  state: EntryState
  value: number | null
  computedValue: number | null // what code computed from the frame, kept when corrected
  verdict: Verdict | null
  frameRef: string | null
  points: DialPoints | null
  notes: string[]
  atMs: number | null
}

export interface PrevReading {
  value: number
  atMs: number
}

export function propose(
  g: GaugeSpec,
  parsed: ParseResult,
  frameRef: string | null,
  atMs: number,
  prev: PrevReading | null,
): Proposal {
  const base = {gaugeId: g.id, frameRef, atMs, points: parsed.ok ? parsed.out.points : null}
  if (!parsed.ok) {
    return {...base, kind: "CANT_READ", value: null, plusMinus: null, verdict: null, notes: ["No usable answer from the reader: " + parsed.why], modelValue: null}
  }
  const out = parsed.out
  if (!out.legible) {
    const why = out.reason ? out.reason : "needle or scale hidden"
    return {...base, kind: "CANT_READ", value: null, plusMinus: null, verdict: null, notes: ["Can't read it: " + why], modelValue: out.modelValue}
  }
  // The scale always comes from the round card (a person set it), never from the model.
  const r: DialResult = readDial(out.points, {min: g.min, max: g.max, unit: g.unit, minorTick: g.minorTick})
  if (!r.ok) {
    return {...base, kind: "CANT_READ", value: null, plusMinus: null, verdict: null, notes: ["Can't read it: " + r.reason.split("-").join(" ")], modelValue: out.modelValue}
  }
  const notes: string[] = []
  let kind: ProposalKind = "PROPOSED"
  if (out.minLabel !== g.min || out.maxLabel !== g.max) {
    notes.push(`Dial shows ${out.minLabel} to ${out.maxLabel}, round card says ${g.min} to ${g.max}`)
    kind = "REVIEW"
  }
  if (r.clampedAtEnd) notes.push("Needle on its stop pin")
  const value = toLogResolution(r.value, g.minorTick)
  const cc = changeCheck(prev ? prev.value : null, prev ? prev.atMs : null, value, atMs, g)
  if (!cc.plausible) {
    notes.push(`Moved ${cc.deltaPerHour.toFixed(2)} ${g.unit} per hour since last watch, faster than this plant moves`)
    kind = "REVIEW"
  }
  const v = verdictFor(value, g)
  return {...base, kind, value, plusMinus: r.plusMinus, verdict: v.verdict, notes, modelValue: out.modelValue}
}

export function emptyEntry(gaugeId: string): Entry {
  return {gaugeId, state: "NOT_READ", value: null, computedValue: null, verdict: null, frameRef: null, points: null, notes: [], atMs: null}
}

export function accept(p: Proposal): Entry {
  if (p.kind === "CANT_READ" || p.value === null) throw new Error("cannot accept a proposal with no value")
  return {gaugeId: p.gaugeId, state: "SEEN", value: p.value, computedValue: p.value, verdict: p.verdict, frameRef: p.frameRef, points: p.points, notes: p.notes.slice(), atMs: p.atMs}
}

export function correct(p: Proposal, g: GaugeSpec, newValue: number): Entry {
  if (p.value === null) throw new Error("use byEye when there is no computed value")
  const v = toLogResolution(newValue, g.minorTick)
  if (v === p.value) return accept(p)
  const notes = p.notes.slice()
  notes.push(`Engineer entered ${v} ${g.unit}, frame gave ${p.value} ${g.unit}`)
  return {gaugeId: g.id, state: "CORRECTED", value: v, computedValue: p.value, verdict: verdictFor(v, g).verdict, frameRef: p.frameRef, points: p.points, notes, atMs: p.atMs}
}

export function byEye(g: GaugeSpec, value: number, atMs: number, frameRef: string | null, why: string): Entry {
  const v = toLogResolution(value, g.minorTick)
  return {gaugeId: g.id, state: "BY_EYE", value: v, computedValue: null, verdict: verdictFor(v, g).verdict, frameRef, points: null, notes: ["Read by eye: " + why], atMs}
}

// ---------------------------------------------------------------------------------------------
// Signing the round. The decision is the real action: can the engine room be left unmanned?

export type UmsDecision = "READY" | "HOLD"

export const ESCALATIONS = ["Called the second engineer", "Called the chief engineer", "Stayed on watch"] as const
export type Escalation = (typeof ESCALATIONS)[number]

export interface SignRequest {
  decision: UmsDecision
  escalation: Escalation | null
  signer: string // the role or name the engineer enters, e.g. "4/E on duty"
}

export type SignResult = {ok: true} | {ok: false; why: string}

export function canSign(entries: Entry[], req: SignRequest): SignResult {
  const missing = entries.filter((e) => e.state === "NOT_READ").length
  if (missing > 0) return {ok: false, why: `${missing} gauge${missing === 1 ? "" : "s"} not read`}
  const alarms = entries.filter((e) => e.verdict === "ALARM")
  if (req.decision === "READY" && alarms.length > 0) {
    return {ok: false, why: `Can't leave the room unmanned with ${alarms.length} reading${alarms.length === 1 ? "" : "s"} in alarm`}
  }
  if (req.decision === "HOLD" && req.escalation === null) {
    return {ok: false, why: "Say who you told before holding the room"}
  }
  if (!req.signer || req.signer.trim().length < 2) return {ok: false, why: "Enter who is signing"}
  return {ok: true}
}
