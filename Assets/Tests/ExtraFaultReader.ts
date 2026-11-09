// extra-fault-reader: a lying reader and a garbage reader never put a SEEN entry into the round by themselves.
// Garbage gives "Can't read it" with no Accept. A lie gives a confident wrong number that stays a proposal until a person accepts.

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {beginRound, newInteractor, readByPinch, tag, spec, entryOf, proposalOf} from "./SightglassTestKit"

@component
export class ExtraFaultReader extends Scenario {
  async run(): Promise<void> {
    const main = await beginRound(0)
    const it = newInteractor()
    const reader = main.reader
    try {
      // Garbage: prose instead of JSON.
      reader.mode = "fault-garbage"
      await readByPinch(it, main, "ME-SCAV")
      expect(tag(main, "ME-SCAV").mode).toBe("cant")
      expect(tag(main, "ME-SCAV").buttons.indexOf("ACCEPT") >= 0, "garbage offered Accept").toBe(false)
      expect(main.proposalFor("ME-SCAV")?.value).toBeNull()
      expect(entryOf(main, "ME-SCAV").state).toBe("NOT_READ")

      // Lies: needle 90 degrees off, confident, legible.
      reader.mode = "fault-lies"
      await readByPinch(it, main, "FO-SUP")
      const g = spec("FO-SUP")
      const p = proposalOf(main, "FO-SUP")
      const truth = main.plant.valueOf("FO-SUP")
      expect(p.value !== null, "a lie should still give a number").toBe(true)
      expect(Math.abs((p.value as number) - truth) > 3 * g.minorTick, "the lie is not wrong enough to test: " + p.value + " vs " + truth).toBe(true)
      await sleep(400)
      expect(entryOf(main, "FO-SUP").state, "a lie became an entry without a person").toBe("NOT_READ")
      expect(main.entries.some((e) => e.state === "SEEN"), "something is SEEN with nobody accepting").toBe(false)
    } finally {
      reader.mode = "fixture"
    }
  }
}
