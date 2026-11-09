// extra-send: a signed round is posted to the live handover door and the card says Sent only after a 200 or 201.
// Leg 1: real post, then read the round back from the door and compare digests.
// Leg 2: a forced 500 (httpbin.org/status/500), the card says Not sent.
// Leg 3: the real address again, the same sheet is accepted as a duplicate and the card says Sent.
// This scenario posts one real round to the door. It is the only scenario that does.

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {waitUntil, beginRound, newInteractor, readByPinch, pinchAction, pinchCard, waitMode, ALL_IDS} from "./SightglassTestKit"

@component
export class ExtraSend extends Scenario {
  private internetModule: InternetModule = require("LensStudio:InternetModule")

  async run(): Promise<void> {
    const main = await beginRound(1)
    const it = newInteractor()
    const sender = main.sender
    const liveUrl = sender.url
    const liveTarget = sender.target
    sender.target = "live"
    try {
      for (const id of ALL_IDS) {
        await readByPinch(it, main, id)
        if (id === "AE1-LO") {
          await pinchAction(it, main, id, "BY_EYE")
          await waitMode(main, id, ["adjust"])
          await pinchAction(it, main, id, "DONE")
        } else {
          await pinchAction(it, main, id, "ACCEPT")
        }
        await waitMode(main, id, ["decided"])
      }
      await pinchCard(it, main, "Btn Sign HOLD")
      await pinchCard(it, main, "Btn Called the chief engineer")
      expect(main.signed).toBe(true)

      // Leg 1: real post.
      await waitUntil(() => main.sendStatus !== -1 && main.card.resultText.indexOf("Sending") !== 0, 20000, () => "send did not finish, card says: " + main.card.resultText)
      expect(main.sendStatus === 200 || main.sendStatus === 201, "door answered " + main.sendStatus).toBe(true)
      expect(main.sendOk).toBe(true)
      expect(main.card.resultText.indexOf("Sent to the chief engineer, code " + main.shortCode)).toBe(0)
      const roundId = (main.sheet as {roundId: string}).roundId
      const back = await this.internetModule.fetch(liveUrl + "/api/rounds/" + roundId, {method: "GET"})
      expect(back.status, "round not found on the door").toBe(200)
      const j = JSON.parse(await back.text())
      expect(j.digest).toBe(main.digest)
      print("LEAF_INLENS_INFO send-door url=" + main.doorUrl + " digest=" + main.digest)

      // Leg 2: forced 500.
      sender.url = "https://httpbin.org/status/500?p=" // the door path is appended after the query mark, so the path stays /status/500
      const bad = (await main.retrySend()) as {ok: boolean; status: number}
      expect(bad.status).toBe(500)
      expect(main.sendOk).toBe(false)
      expect(main.card.resultText.indexOf("Not sent")).toBe(0)
      expect(main.card.resultText.indexOf("Sent to the chief engineer") === 0, "card claims Sent after a 500").toBe(false)

      // Leg 3: back to the real address.
      sender.url = liveUrl
      await main.retrySend()
      expect(main.sendOk).toBe(true)
      expect(main.card.resultText.indexOf("Sent to the chief engineer, code " + main.shortCode)).toBe(0)
      await sleep(100)
    } finally {
      sender.url = liveUrl
      sender.target = liveTarget
    }
  }
}
