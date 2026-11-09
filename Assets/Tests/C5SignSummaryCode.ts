// c5: read and decide all eight gauges, check the computed summary, sign HOLD with an escalation, check the code.
// Real pinch: every dot, every Accept/Correct/By eye/Plus/Done button, Sign HOLD, and the escalation button.
// No direct calls except reading state.

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {waitUntil, beginRound, newInteractor, readByPinch, pinchAction, pinchCard, waitMode, tag, entryOf, ALL_IDS} from "./SightglassTestKit"

@component
export class C5SignSummaryCode extends Scenario {
  async run(): Promise<void> {
    const main = await beginRound(1)
    main.sender.target = "off" // c5 checks the sign flow; the send scenario is the only one that posts
    const it = newInteractor()

    for (const id of ALL_IDS) {
      await readByPinch(it, main, id)
      if (id === "AE1-LO") {
        expect(tag(main, id).mode).toBe("cant")
        await pinchAction(it, main, id, "BY_EYE")
        await waitMode(main, id, ["adjust"])
        await pinchAction(it, main, id, "DONE")
      } else if (id === "ME-SCAV") {
        await pinchAction(it, main, id, "CORRECT")
        await waitMode(main, id, ["adjust"])
        await pinchAction(it, main, id, "PLUS")
        await pinchAction(it, main, id, "DONE")
      } else {
        await pinchAction(it, main, id, "ACCEPT")
      }
      await waitMode(main, id, ["decided"])
    }

    await waitUntil(() => main.decidedCount === ALL_IDS.length, 5000, () => "decided " + main.decidedCount)
    for (const id of ALL_IDS) expect(entryOf(main, id).state !== "NOT_READ", id + " has no state").toBe(true)
    expect(entryOf(main, "ME-LO-IN").verdict).toBe("ALARM")
    expect(entryOf(main, "ME-LO-IN").state).toBe("SEEN")
    expect(entryOf(main, "ME-SCAV").state).toBe("CORRECTED")
    expect(entryOf(main, "AE1-LO").state).toBe("BY_EYE")

    // Summary is computed from the entries.
    const es = main.entries
    const seen = es.filter((e) => e.state === "SEEN").length
    const cor = es.filter((e) => e.state === "CORRECTED").length
    const eye = es.filter((e) => e.state === "BY_EYE").length
    const alarms = es.filter((e) => e.verdict === "ALARM").length
    const expected = es.length + " read: " + seen + " seen, " + cor + " corrected, " + eye + " by eye. " + alarms + " alarm" + (alarms === 1 ? "" : "s") + "."
    expect(main.card.summaryText).toBe(expected)
    expect(main.card.summaryText).toBe("8 read: 6 seen, 1 corrected, 1 by eye. 1 alarm.")
    expect(main.signReadyEnabled).toBe(false)

    // HOLD without an escalation opens the escalations, nothing is sent.
    await pinchCard(it, main, "Btn Sign HOLD")
    expect(main.signed).toBe(false)
    expect(main.card.escalationsVisible).toBe(true)

    // Pick an escalation: signed, short code, card says it was sent.
    await pinchCard(it, main, "Btn Called the chief engineer")
    await sleep(200)
    expect(main.signed).toBe(true)
    const code = main.shortCode
    expect(code.length).toBe(4)
    expect(/^[0-9A-F]{4}$/.test(code), "code: " + code).toBe(true)
    expect(main.digest.substring(0, 4).toUpperCase()).toBe(code)
    expect(main.card.resultText.indexOf("Not sent. Kept on the glasses, code " + code)).toBe(0)
    expect(main.sendOk).toBe(false)
  }
}
