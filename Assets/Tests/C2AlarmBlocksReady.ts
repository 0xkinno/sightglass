// c2: ME-LO-IN at 1.6 bar is an alarm. READY stays blocked, HOLD needs an escalation.
// Real pinch: dots, Accept, Recheck. Direct calls: main.requestRead/accept/byEyeBegin/adjustDone for the other seven
// gauges (setup only), main.sign and card.pressSignReady for the refusal checks, card.pressEscalation for the final HOLD.

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {waitUntil, beginRound, newInteractor, readByPinch, pinchAction, waitMode, tag, entryOf, ALL_IDS} from "./SightglassTestKit"

const LO = "ME-LO-IN"
const ALARM_LINE = "LO inlet 1.6 bar is below its 1.8 bar alarm. The room can't go unmanned."

@component
export class C2AlarmBlocksReady extends Scenario {
  async run(): Promise<void> {
    const main = await beginRound(1)
    const it = newInteractor()
    const t = tag(main, LO)

    // Pinch the dot: the tag turns coral, the card says the room can't go unmanned.
    await readByPinch(it, main, LO)
    expect(t.tone).toBe("alarm")
    expect(t.detailLine.indexOf("Alarm")).toBe(0)
    expect(main.card.stateText).toBe(ALARM_LINE)

    // Accept the alarm reading by pinch. The card keeps saying it.
    await pinchAction(it, main, LO, "ACCEPT")
    expect(entryOf(main, LO).state).toBe("SEEN")
    expect(entryOf(main, LO).verdict).toBe("ALARM")
    expect(main.card.stateText).toBe(ALARM_LINE)

    // Round not complete: sign row hidden, READY off, both signs refused.
    expect(main.signReadyEnabled).toBe(false)
    expect(main.sign("READY")).toBe(false)
    expect(main.sign("HOLD", 1)).toBe(false)
    expect(main.signed).toBe(false)

    // Setup by direct call: decide the other seven so the round is complete with one alarm standing.
    for (const id of ALL_IDS) {
      if (id === LO) continue
      await main.requestRead(id)
      if (tag(main, id).mode === "cant") {
        main.byEyeBegin(id)
        main.adjustDone(id)
      } else {
        main.accept(id)
      }
    }
    await waitUntil(() => main.decidedCount === ALL_IDS.length, 5000, () => "decided " + main.decidedCount)
    expect(main.card.signRowVisible).toBe(true)
    expect(main.signReadyEnabled).toBe(false)
    expect(main.card.signHoldEnabled).toBe(true)
    expect(main.card.stateText).toBe(ALARM_LINE)

    // READY refused. HOLD without an escalation refused and the three escalations appear.
    expect(main.sign("READY")).toBe(false)
    expect(main.card.pressSignReady()).toBe(false)
    expect(main.sign("HOLD")).toBe(false)
    expect(main.card.escalationsVisible).toBe(true)
    expect(main.signed).toBe(false)

    // Recheck by pinch after the plant recovers: the old entry is cleared, a new read is normal, READY opens up.
    main.plant.setProgress(0)
    await pinchAction(it, main, LO, "RECHECK")
    expect(entryOf(main, LO).state).toBe("NOT_READ")
    expect(main.signReadyEnabled).toBe(false)
    await waitMode(main, LO, ["proposal", "cant"])
    expect(t.tone).toBe("normal")
    await pinchAction(it, main, LO, "ACCEPT")
    await sleep(200)
    expect(main.signReadyEnabled).toBe(true)

    // Back to the alarm: recheck at 1.6 bar and accept. READY closes again.
    main.plant.setProgress(1)
    await pinchAction(it, main, LO, "RECHECK")
    await waitMode(main, LO, ["proposal", "cant"])
    expect(t.tone).toBe("alarm")
    await pinchAction(it, main, LO, "ACCEPT")
    await sleep(200)
    expect(main.signReadyEnabled).toBe(false)
    expect(main.sign("READY")).toBe(false)
    expect(main.signed).toBe(false)

    // HOLD with an escalation is accepted (this finishes the round).
    expect(main.card.escalationsVisible).toBe(true)
    expect(main.card.pressEscalation(1)).toBe(true)
    expect(main.signed).toBe(true)
    expect(main.shortCode.length).toBe(4)
  }
}
