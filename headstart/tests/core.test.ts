// Run: npx tsx --test tests/core.test.ts   (from the repo root; tsx resolves extensionless imports like Lens Studio does)
import {test} from "node:test"
import assert from "node:assert/strict"
import {createHash} from "node:crypto"
import {readDial, toLogResolution} from "../Assets/Scripts/Core/DialGeometry"
import {SAMPLE_UMS_ROUND, gaugeById} from "../Assets/Scripts/Core/RoundPlan"
import {verdictFor, changeCheck} from "../Assets/Scripts/Core/Verdict"
import {parseReader} from "../Assets/Scripts/Core/ReaderContract"
import {propose, accept, correct, byEye, canSign, emptyEntry} from "../Assets/Scripts/Core/EvidenceGate"
import {buildSheet, verifyDigest, canonical} from "../Assets/Scripts/Core/RoundSheet"
import {sha256Hex} from "../Assets/Scripts/Core/Sha256"

// A standard 270 degree dial drawn in a 200x200 crop: centre (100,100), radius 80.
// Min mark at 7:30 (135 deg clockwise from +x, screen coords), max at 4:30 (45 deg), sweep 270.
function at(deg: number, r = 80) {
  const a = (deg * Math.PI) / 180
  return {x: 100 + r * Math.cos(a), y: 100 + r * Math.sin(a)}
}
const C = {x: 100, y: 100}
const MIN = at(135)
const MAX = at(45)
const SCALE = {min: 0, max: 6, unit: "bar", minorTick: 0.2}

test("needle straight up on a 0 to 6 bar 270 degree dial reads 3 bar", () => {
  const r = readDial({center: C, needleTip: at(270, 60), minMark: MIN, maxMark: MAX}, SCALE)
  assert.equal(r.ok, true)
  if (r.ok) {
    assert.ok(Math.abs(r.value - 3) < 1e-9)
    assert.ok(Math.abs(r.sweepDeg - 270) < 1e-9)
    assert.ok(Math.abs(r.plusMinus - (6 * 2) / 270) < 1e-9)
  }
})

test("needle at the min and max marks reads the ends", () => {
  const a = readDial({center: C, needleTip: at(135, 60), minMark: MIN, maxMark: MAX}, SCALE)
  const b = readDial({center: C, needleTip: at(45, 60), minMark: MIN, maxMark: MAX}, SCALE)
  assert.ok(a.ok && Math.abs(a.value - 0) < 1e-9)
  assert.ok(b.ok && Math.abs(b.value - 6) < 1e-9)
})

test("needle in the dead zone at the bottom is refused, not guessed", () => {
  const r = readDial({center: C, needleTip: at(90, 60), minMark: MIN, maxMark: MAX}, SCALE)
  assert.equal(r.ok, false)
  if (!r.ok) assert.equal(r.reason, "needle-outside-scale")
})

test("needle resting on its stop pin just past max is clamped and flagged", () => {
  const r = readDial({center: C, needleTip: at(49, 60), minMark: MIN, maxMark: MAX}, SCALE)
  assert.ok(r.ok && r.clampedAtEnd && Math.abs(r.value - 6) < 1e-9)
})

test("a tail-of-needle point too close to the pivot is refused", () => {
  const r = readDial({center: C, needleTip: at(270, 15), minMark: MIN, maxMark: MAX}, SCALE)
  assert.equal(r.ok, false)
  if (!r.ok) assert.equal(r.reason, "needle-too-short")
})

test("marks at very different radii are refused", () => {
  const r = readDial({center: C, needleTip: at(270, 60), minMark: at(135, 80), maxMark: at(45, 30)}, SCALE)
  assert.equal(r.ok, false)
})

test("log resolution is half a minor tick", () => {
  assert.equal(toLogResolution(2.37, 0.2), 2.4)
  assert.equal(toLogResolution(2.33, 0.2), 2.3)
})

test("verdict bands come from the round card", () => {
  const g = gaugeById(SAMPLE_UMS_ROUND, "ME-LO-IN")!
  assert.equal(verdictFor(1.6, g).verdict, "ALARM")
  assert.equal(verdictFor(2.0, g).verdict, "WATCH")
  assert.equal(verdictFor(3.2, g).verdict, "NORMAL")
  assert.equal(verdictFor(4.6, g).verdict, "WATCH")
})

test("a reading that moved faster than the plant can is implausible", () => {
  const g = gaugeById(SAMPLE_UMS_ROUND, "ME-LO-IN")!
  const t0 = 0
  const t4h = 4 * 3_600_000
  assert.equal(changeCheck(3.2, t0, 3.0, t4h, g).plausible, true)
  assert.equal(changeCheck(3.2, t0, 0.4, t4h, g).plausible, false)
})

function modelJson(tipDeg: number, extra: Record<string, unknown> = {}) {
  const tip = at(tipDeg, 60)
  return JSON.stringify({
    legible: true,
    reason: "",
    center: C,
    needle_tip: tip,
    min_mark: MIN,
    max_mark: MAX,
    min_label: 0,
    max_label: 6,
    unit: "bar",
    model_value: 4.4,
    ...extra,
  })
}

test("parser refuses non JSON and points outside the image", () => {
  assert.equal(parseReader("the gauge reads 3 bar", 200, 200).ok, false)
  assert.equal(parseReader(modelJson(270, {needle_tip: {x: 900, y: 10}}), 200, 200).ok, false)
})

test("propose uses the round card scale and code computes the value, ignoring the model's guess", () => {
  const g = gaugeById(SAMPLE_UMS_ROUND, "ME-LO-IN")!
  const p = propose(g, parseReader(modelJson(270), 200, 200), "frame-1", 1000, null)
  assert.equal(p.kind, "PROPOSED")
  assert.equal(p.value, 3)
  assert.equal(p.modelValue, 4.4) // recorded, not used
  assert.equal(p.verdict, "NORMAL")
})

test("scale labels that disagree with the round card send the reading to REVIEW", () => {
  const g = gaugeById(SAMPLE_UMS_ROUND, "ME-LO-IN")!
  const p = propose(g, parseReader(modelJson(270, {max_label: 10}), 200, 200), "frame-2", 1000, null)
  assert.equal(p.kind, "REVIEW")
  assert.equal(p.value, 3) // still computed on the card's 0 to 6, not the model's 0 to 10
})

test("illegible frame becomes CANT_READ and only a person can fill it", () => {
  const g = gaugeById(SAMPLE_UMS_ROUND, "AE1-LO")!
  const p = propose(g, parseReader(modelJson(270, {legible: false, reason: "fogged glass"}), 200, 200), "frame-3", 1000, null)
  assert.equal(p.kind, "CANT_READ")
  assert.throws(() => accept(p))
  const e = byEye(g, 4.13, 1500, "frame-3", "fogged glass")
  assert.equal(e.state, "BY_EYE")
  assert.equal(e.value, 4.1)
})

test("a correction keeps both numbers", () => {
  const g = gaugeById(SAMPLE_UMS_ROUND, "ME-LO-IN")!
  const p = propose(g, parseReader(modelJson(270), 200, 200), "frame-4", 1000, null)
  const e = correct(p, g, 2.8)
  assert.equal(e.state, "CORRECTED")
  assert.equal(e.value, 2.8)
  assert.equal(e.computedValue, 3)
})

test("signing: unread gauges block, an alarm blocks READY, HOLD needs an escalation", () => {
  const g = gaugeById(SAMPLE_UMS_ROUND, "ME-LO-IN")!
  const alarmTip = 135 + (1.6 / 6) * 270
  const p = propose(g, parseReader(modelJson(alarmTip), 200, 200), "frame-5", 1000, null)
  assert.equal(p.verdict, "ALARM")
  const e = accept(p)
  assert.equal(canSign([e, emptyEntry("X")], {decision: "HOLD", escalation: "Called the second engineer", signer: "4/E"}).ok, false)
  assert.equal(canSign([e], {decision: "READY", escalation: null, signer: "4/E"}).ok, false)
  assert.equal(canSign([e], {decision: "HOLD", escalation: null, signer: "4/E"}).ok, false)
  assert.equal(canSign([e], {decision: "HOLD", escalation: "Called the second engineer", signer: "4/E"}).ok, true)
})

test("sha256 matches node crypto, including non ASCII", () => {
  for (const s of ["", "abc", "Sightglass round 22:00", "a".repeat(1000), "temp 85 °C → ok"]) {
    assert.equal(sha256Hex(s), createHash("sha256").update(s, "utf8").digest("hex"))
  }
})

test("the round sheet digest changes if any entry changes", () => {
  const g = gaugeById(SAMPLE_UMS_ROUND, "ME-LO-IN")!
  const e = accept(propose(g, parseReader(modelJson(270), 200, 200), "frame-6", 1000, null))
  const {sheet, digest} = buildSheet(SAMPLE_UMS_ROUND, "r1", 0, 2000, {decision: "READY", escalation: null, signer: "4/E"}, [e], "lens-studio-preview")
  assert.equal(verifyDigest(sheet, digest), true)
  const tampered = JSON.parse(canonical(sheet))
  tampered.entries[0].value = 3.2
  assert.equal(verifyDigest(tampered, digest), false)
})
