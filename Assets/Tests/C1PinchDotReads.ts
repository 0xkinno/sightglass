// c1: pinching the dot beside a normal gauge shows Reading, then value, unit and verdict, computed by code.
// Real pinch: the dot. No direct calls.

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {readDial, toLogResolution} from "../Scripts/Core/DialGeometry"
import {verdictFor} from "../Scripts/Core/Verdict"
import {beginRound, newInteractor, pinchDot, waitMode, tag, spec, entryOf, proposalOf, numberOf, TagWatcher} from "./SightglassTestKit"

const ID = "SW-PUMP"

@component
export class C1PinchDotReads extends Scenario {
  async run(): Promise<void> {
    const main = await beginRound(0)
    const it = newInteractor()
    const t = tag(main, ID)
    const g = spec(ID)

    expect(t.mode).toBe("idle")
    expect(entryOf(main, ID).state).toBe("NOT_READ")

    const watch = new TagWatcher(this, t)
    await pinchDot(it, main, ID)
    await waitMode(main, ID, ["proposal", "cant"])
    await sleep(200)
    watch.stop()

    // Reading was shown first, then the proposal.
    expect(watch.seen.indexOf("reading:Reading") >= 0, "tag never showed Reading: " + watch.seen.join(" > ")).toBe(true)
    expect(t.mode).toBe("proposal")

    const p = proposalOf(main, ID)
    expect(p.value !== null).toBe(true)
    const shown = numberOf(t.headlineText)
    expect(t.headlineText.endsWith(" " + g.unit), "headline: " + t.headlineText).toBe(true)
    expect(Math.abs(shown - (p.value as number)) < 1e-6, "tag " + shown + " vs proposal " + p.value).toBe(true)

    // The value is within one minor tick of what the plant holds for this gauge right now.
    const plantValue = main.plant.valueOf(ID)
    expect(Math.abs(shown - plantValue) <= g.minorTick, "tag " + shown + " plant " + plantValue + " tick " + g.minorTick).toBe(true)

    // Verdict word on the tag matches the verdict code derives from the number.
    const v = verdictFor(p.value as number, g).verdict
    expect(p.verdict).toBe(v)
    expect(t.detailLine.indexOf(v === "ALARM" ? "Alarm" : v === "WATCH" ? "Watch" : "Normal")).toBe(0)

    // Computed by code: redo the geometry from the points the reader gave, with the scale from the round card.
    expect(p.points !== null).toBe(true)
    const r = readDial(p.points as any, {min: g.min, max: g.max, unit: g.unit, minorTick: g.minorTick})
    expect(r.ok).toBe(true)
    if (r.ok) expect(toLogResolution(r.value, g.minorTick)).toBeCloseTo(p.value as number, 6)
    // The reader gives points, not a number: no model value is carried into the proposal.
    expect(p.modelValue).toBeNull()

    // Nothing is in the round until the engineer accepts.
    expect(entryOf(main, ID).state).toBe("NOT_READ")
  }
}
