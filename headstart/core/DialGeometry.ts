// DialGeometry.ts
// Pure TypeScript. No Lens Studio APIs, no Node APIs. Runs in the Lens and in Node tests.
//
// The model never produces the number the engineer acts on. The model only points at
// four places on the dial face (the centre, the needle tip, the lowest scale mark and the
// highest scale mark). This file turns those points into a value, or refuses.
//
// Coordinates are image pixels with y pointing down, as returned for the cropped frame.
// Angles are measured clockwise from the +x axis, because almost every pressure and
// temperature gauge on a ship reads clockwise.

export interface Pt {
  x: number
  y: number
}

export interface DialPoints {
  center: Pt
  needleTip: Pt
  minMark: Pt
  maxMark: Pt
}

export interface ScaleSpec {
  min: number // value printed at the lowest mark, taken from the round card (set by a person)
  max: number // value printed at the highest mark, taken from the round card
  unit: string
  minorTick: number // value step of one minor tick, used for the uncertainty band
}

export type GeometryRefusal =
  | "needle-outside-scale"
  | "sweep-implausible"
  | "radii-inconsistent"
  | "needle-too-short"
  | "degenerate-points"

export interface DialReading {
  ok: true
  value: number
  // half-width of the band the true value most likely lies in, from a 2 degree pointing error
  plusMinus: number
  sweepDeg: number
  needleDeg: number // needle position from the lowest mark, degrees
  clampedAtEnd: boolean // needle sat within tolerance just past an end stop
}

export interface DialRefusal {
  ok: false
  reason: GeometryRefusal
  detail: string
}

export type DialResult = DialReading | DialRefusal

const TWO_PI = Math.PI * 2
const DEG = 180 / Math.PI

export const GEOMETRY_LIMITS = {
  minSweepDeg: 90, // narrower than this is not a round dial we support
  maxSweepDeg: 345, // a full circle has no end stops to read against
  radiusRatioTolerance: 0.3, // min and max marks must sit at similar radii (perspective allowance)
  minNeedleRatio: 0.35, // needle tip must reach at least this share of the scale radius
  maxNeedleRatio: 1.3,
  endStopToleranceDeg: 6, // a needle resting on its stop pin may sit slightly past the mark
  pointingErrorDeg: 2, // assumed error of a located point, used for the plus or minus band
}

function angleCW(c: Pt, p: Pt): number {
  // image y points down, so atan2(dy, dx) already increases clockwise on screen
  return Math.atan2(p.y - c.y, p.x - c.x)
}

function norm2pi(a: number): number {
  let r = a % TWO_PI
  if (r < 0) r += TWO_PI
  return r
}

function dist(a: Pt, b: Pt): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

export function readDial(points: DialPoints, scale: ScaleSpec): DialResult {
  const L = GEOMETRY_LIMITS
  const rMin = dist(points.center, points.minMark)
  const rMax = dist(points.center, points.maxMark)
  const rTip = dist(points.center, points.needleTip)

  if (rMin < 1 || rMax < 1 || rTip < 1 || !isFinite(rMin + rMax + rTip)) {
    return {ok: false, reason: "degenerate-points", detail: "points coincide with the centre or are not numbers"}
  }
  if (scale.max === scale.min) {
    return {ok: false, reason: "degenerate-points", detail: "scale min equals scale max"}
  }

  const rScale = (rMin + rMax) / 2
  if (Math.abs(rMin - rMax) / rScale > L.radiusRatioTolerance) {
    return {
      ok: false,
      reason: "radii-inconsistent",
      detail: `min mark at ${rMin.toFixed(1)} px, max mark at ${rMax.toFixed(1)} px from centre`,
    }
  }
  const needleRatio = rTip / rScale
  if (needleRatio < L.minNeedleRatio) {
    return {ok: false, reason: "needle-too-short", detail: `needle reaches ${(needleRatio * 100).toFixed(0)}% of scale radius`}
  }
  if (needleRatio > L.maxNeedleRatio) {
    return {ok: false, reason: "radii-inconsistent", detail: `needle reaches ${(needleRatio * 100).toFixed(0)}% of scale radius`}
  }

  const aMin = angleCW(points.center, points.minMark)
  const aMax = angleCW(points.center, points.maxMark)
  const aTip = angleCW(points.center, points.needleTip)

  const sweep = norm2pi(aMax - aMin)
  const sweepDeg = sweep * DEG
  if (sweepDeg < L.minSweepDeg || sweepDeg > L.maxSweepDeg) {
    return {ok: false, reason: "sweep-implausible", detail: `scale sweep ${sweepDeg.toFixed(1)} deg`}
  }

  let pos = norm2pi(aTip - aMin)
  let clamped = false
  if (pos > sweep) {
    // The needle is in the dead zone between the max mark and the min mark.
    const pastMax = (pos - sweep) * DEG
    const beforeMin = (TWO_PI - pos) * DEG
    if (pastMax <= L.endStopToleranceDeg) {
      pos = sweep
      clamped = true
    } else if (beforeMin <= L.endStopToleranceDeg) {
      pos = 0
      clamped = true
    } else {
      return {
        ok: false,
        reason: "needle-outside-scale",
        detail: `needle ${pastMax.toFixed(1)} deg past max and ${beforeMin.toFixed(1)} deg before min`,
      }
    }
  }

  const span = scale.max - scale.min
  const value = scale.min + (span * pos) / sweep
  const plusMinus = Math.abs(span) * (L.pointingErrorDeg / sweepDeg)

  return {
    ok: true,
    value,
    plusMinus,
    sweepDeg,
    needleDeg: pos * DEG,
    clampedAtEnd: clamped,
  }
}

// Round a reading to the resolution an engineer would write in the log: half a minor tick.
export function toLogResolution(value: number, minorTick: number): number {
  const step = minorTick / 2
  if (step <= 0) return value
  const snapped = Math.round(value / step) * step
  // strip binary residue (2.4000000000000004) so the log shows what an engineer would write
  const decimals = Math.min(6, Math.max(0, Math.ceil(-Math.log10(step)) + 1))
  return Number(snapped.toFixed(decimals))
}
