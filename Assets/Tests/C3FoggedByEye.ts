// c3: AE1-LO is fogged. The read says Can't read it. By eye, plus and minus, Done gives a Read by eye entry.
// Real pinch: dot, By eye, Plus, Minus, Done. No direct calls.

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {beginRound, newInteractor, readByPinch, pinchAction, waitMode, tag, spec, entryOf, numberOf} from "./SightglassTestKit"

const ID = "AE1-LO"

@component
export class C3FoggedByEye extends Scenario {
  async run(): Promise<void> {
    const main = await beginRound(0)
    const it = newInteractor()
    const t = tag(main, ID)
    const g = spec(ID)

    expect(main.viewFor(ID)?.isFogged).toBe(true)
    await readByPinch(it, main, ID)
    expect(t.mode).toBe("cant")
    expect(t.visibleText.indexOf("Can't read it")).toBe(0)
    expect(t.buttons.indexOf("BY_EYE") >= 0).toBe(true)
    expect(main.proposalFor(ID)?.value).toBeNull()
    expect(entryOf(main, ID).state).toBe("NOT_READ")

    await pinchAction(it, main, ID, "BY_EYE")
    await waitMode(main, ID, ["adjust"])
    const start = numberOf(t.headlineText)

    await pinchAction(it, main, ID, "PLUS")
    await pinchAction(it, main, ID, "PLUS")
    await pinchAction(it, main, ID, "MINUS")
    await sleep(200)
    const entered = numberOf(t.headlineText)
    expect(entered).toBeCloseTo(start + g.minorTick, 6)

    await pinchAction(it, main, ID, "DONE")
    await waitMode(main, ID, ["decided"])
    const e = entryOf(main, ID)
    expect(e.state).toBe("BY_EYE")
    expect(e.value as number).toBeCloseTo(entered, 6)
    expect(e.computedValue).toBeNull()
    expect(t.visibleText.indexOf("Read by eye") >= 0, "tag: " + t.visibleText).toBe(true)
  }
}
