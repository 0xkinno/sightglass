// c4: Correct moves the value by exactly one minor tick per press. The entry keeps both numbers.
// Real pinch: dot, Correct, Plus, Minus, Plus, Done. No direct calls.

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {beginRound, newInteractor, readByPinch, pinchAction, waitMode, tag, spec, entryOf, proposalOf, numberOf} from "./SightglassTestKit"

const ID = "ME-SCAV"

@component
export class C4CorrectSteps extends Scenario {
  async run(): Promise<void> {
    const main = await beginRound(0)
    const it = newInteractor()
    const t = tag(main, ID)
    const g = spec(ID)

    await readByPinch(it, main, ID)
    expect(t.mode).toBe("proposal")
    const computed = proposalOf(main, ID).value as number

    await pinchAction(it, main, ID, "CORRECT")
    await waitMode(main, ID, ["adjust"])
    expect(numberOf(t.headlineText)).toBeCloseTo(computed, 6)

    await pinchAction(it, main, ID, "PLUS")
    await sleep(150)
    const up = numberOf(t.headlineText)
    expect(up - computed).toBeCloseTo(g.minorTick, 6)

    await pinchAction(it, main, ID, "MINUS")
    await sleep(150)
    const back = numberOf(t.headlineText)
    expect(up - back).toBeCloseTo(g.minorTick, 6)
    expect(back).toBeCloseTo(computed, 6)

    await pinchAction(it, main, ID, "PLUS")
    await sleep(150)
    await pinchAction(it, main, ID, "DONE")
    await waitMode(main, ID, ["decided"])

    const e = entryOf(main, ID)
    expect(e.state).toBe("CORRECTED")
    expect(e.value as number).toBeCloseTo(computed + g.minorTick, 6)
    expect(e.computedValue as number).toBeCloseTo(computed, 6)
    expect(e.value !== e.computedValue).toBe(true)
    expect(t.detailLine.indexOf("Corrected") >= 0, "tag: " + t.visibleText).toBe(true)
  }
}
