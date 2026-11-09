// extra-chevron: the chevron shows only when the next dial is out of view, and it points at that dial.

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {aimDial, beginRound, resetRoom, waitUntil} from "./SightglassTestKit"

@component
export class ExtraChevron extends Scenario {
  async run(): Promise<void> {
    const main = await beginRound(0)
    const next = main.nextGaugeId as string
    expect(next !== null).toBe(true)
    try {
      // Next dial straight ahead: no chevron.
      aimDial(main, next)
      await sleep(500)
      expect(main.chevron.visible, "chevron shown with the next dial straight ahead").toBe(false)
      expect(main.chevron.pointsAt).toBeNull()

      // Turn the room 120 degrees: the next dial is out of view, chevron shows and points at it.
      aimDial(main, next, 120)
      await waitUntil(() => main.chevron.visible, 3000, () => "chevron did not show with the next dial out of view")
      expect(main.chevron.pointsAt).toBe(next)

      // Back in view: it goes away.
      aimDial(main, next)
      await waitUntil(() => !main.chevron.visible, 3000, () => "chevron stayed on with the next dial in view")
    } finally {
      resetRoom(main)
    }
  }
}
