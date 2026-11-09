// extra-overlay-hidden: for the capture frame every overlay object is off, and everything is back as it was after.
// Uses the real FrameCapture on the real composite. No network.

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {aimDial, beginRound, resetRoom, tag, waitUntil} from "./SightglassTestKit"
import {GaugeStationView} from "../Scripts/GaugeStationView"

const ID = "STG-OIL"

@component
export class ExtraOverlayHidden extends Scenario {
  async run(): Promise<void> {
    const main = await beginRound(0)
    const fc = main.capture
    aimDial(main, ID)
    await sleep(300)
    await waitUntil(() => fc.dialInView(ID), 6000, () => "dial not in view for capture")
    // Overlay in its busiest state: tag open on Reading and the band arc drawn.
    tag(main, ID).show("reading", "Reading", "", "neutral", [])
    ;(GaugeStationView.byId[ID] as GaugeStationView).setBandVisible(true)
    await sleep(200)
    const roots = fc.overlayRoots
    const before = roots.map((o) => o.enabled)
    expect(before.some((b) => b), "overlay should be on before the capture").toBe(true)

    const hidden = await fc.capture(ID, true)
    expect(hidden.ok, "capture failed: " + hidden.why).toBe(true)
    expect(hidden.overlayHiddenFrame).toBe(true)
    const snap = fc.lastOverlayAtEncode
    expect(snap !== null).toBe(true)
    const s = snap as {roots: boolean[]; bands: boolean[]}
    expect(s.roots.some((b) => b), "an overlay object was still on at the capture frame: " + s.roots.join(",")).toBe(false)
    expect(s.bands.some((b) => b), "a band arc was still on at the capture frame: " + s.bands.join(",")).toBe(false)
    // Restored afterwards.
    expect(roots.map((o) => o.enabled).join(",")).toBe(before.join(","))
    expect((GaugeStationView.byId[ID] as GaugeStationView).bandVisible).toBe(true)

    // The comparison arm: with hide off, the overlay is on at the capture frame.
    const shown = await fc.capture(ID, false)
    expect(shown.ok, "capture failed: " + shown.why).toBe(true)
    expect(shown.overlayHiddenFrame).toBe(false)
    expect((fc.lastOverlayAtEncode as {roots: boolean[]; bands: boolean[]}).roots.some((b) => b)).toBe(true)
    resetRoom(main)
  }
}
