import test from "node:test"
import assert from "node:assert/strict"
import {createHash} from "node:crypto"
import {acceptRound} from "../lib/accept"
import {buildSheet, canonical} from "../lib/core/RoundSheet"
import {sha256Hex} from "../lib/core/Sha256"
import {UMS_EVENING_ROUND} from "../lib/core/RoundPlan"
import type {Entry} from "../lib/core/EvidenceGate"

const pts = {center: {x: 0.5, y: 0.5}, needleTip: {x: 0.7, y: 0.3}, minMark: {x: 0.3, y: 0.7}, maxMark: {x: 0.7, y: 0.7}}
const entries: Entry[] = UMS_EVENING_ROUND.gauges.map((g, i) => ({
  gaugeId: g.id,
  state: "SEEN",
  value: g.min + 1,
  computedValue: g.min + 1,
  verdict: "NORMAL",
  frameRef: i === 0 ? "f0" : null,
  points: i === 0 ? pts : null,
  notes: [],
  atMs: 1000 + i,
}))
const tiny = "data:image/png;base64,iVBORw0KGgo="

function good() {
  const {sheet, digest} = buildSheet(UMS_EVENING_ROUND, "2026-11-09T21-58Z-test", 1, 2, {decision: "READY", escalation: null, signer: "4/E on duty"} as never, entries, "lens-studio-preview")
  return {sheet, digest, frames: {f0: tiny, unused: tiny}}
}

test("Sha256 in the door matches Node crypto", () => {
  const s = canonical(good().sheet)
  assert.equal(sha256Hex(s), createHash("sha256").update(s).digest("hex"))
})

test("a good sheet is accepted and unused frames are dropped", () => {
  const a = acceptRound(good())
  assert.ok(a.ok)
  if (a.ok) assert.deepEqual(Object.keys(a.round.frames), ["f0"])
})

test("a changed value fails the digest check", () => {
  const b = good()
  b.sheet.entries[0].value = 99
  const a = acceptRound(b)
  assert.ok(!a.ok)
  if (!a.ok) assert.equal(a.status, 422)
})

test("a wrong digest is refused", () => {
  const a = acceptRound({...good(), digest: "0".repeat(64)})
  assert.ok(!a.ok && a.status === 422)
})

test("unknown fields, bad ids and bad frames are refused", () => {
  assert.ok(!acceptRound({...good(), extra: 1}).ok)
  const b = good()
  b.sheet.roundId = "../x"
  assert.ok(!acceptRound(b).ok)
  assert.ok(!acceptRound({...good(), frames: {f0: "data:text/html;base64,AAAA"}}).ok)
  assert.ok(!acceptRound("nope").ok)
})
