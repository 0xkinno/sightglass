// Verdict.ts
// Code decides the verdict. The model never says "normal" or "alarm".

import {Bands, GaugeSpec} from "./RoundPlan"

export type Verdict = "NORMAL" | "WATCH" | "ALARM"

export interface VerdictResult {
  verdict: Verdict
  why: string // short plain words for the tag, no dashes
}

export function verdictFor(value: number, g: GaugeSpec): VerdictResult {
  const b: Bands = g.bands
  if (b.alarmLow !== undefined && value <= b.alarmLow) {
    return {verdict: "ALARM", why: `below ${b.alarmLow} ${g.unit} alarm`}
  }
  if (b.alarmHigh !== undefined && value >= b.alarmHigh) {
    return {verdict: "ALARM", why: `above ${b.alarmHigh} ${g.unit} alarm`}
  }
  if (b.warnLow !== undefined && value <= b.warnLow) {
    return {verdict: "WATCH", why: `low, under ${b.warnLow} ${g.unit}`}
  }
  if (b.warnHigh !== undefined && value >= b.warnHigh) {
    return {verdict: "WATCH", why: `high, over ${b.warnHigh} ${g.unit}`}
  }
  return {verdict: "NORMAL", why: "inside limits"}
}

export interface ChangeCheck {
  plausible: boolean
  deltaPerHour: number
}

// A reading that changed faster than the plant can change since the last confirmed watch
// reading is more likely a misread than a real change. It goes to REVIEW, never straight in.
export function changeCheck(prev: number | null, prevAtMs: number | null, value: number, atMs: number, g: GaugeSpec): ChangeCheck {
  if (prev === null || prevAtMs === null) return {plausible: true, deltaPerHour: 0}
  const hours = Math.max((atMs - prevAtMs) / 3_600_000, 0.25) // floor at 15 minutes so a quick recheck is not flagged
  const deltaPerHour = Math.abs(value - prev) / hours
  return {plausible: deltaPerHour <= g.maxChangePerHour, deltaPerHour}
}
