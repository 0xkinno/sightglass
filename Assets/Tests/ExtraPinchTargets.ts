// extra-pinch-targets: every pinch target is at least 2 degrees across and every gap inside a group is at least 1 degree,
// at station distance (distance from the start position, where the engineer stands). Sizes are the real component sizes.

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {beginRound, newInteractor, readByPinch, pinchAction, pinchCard, waitMode, tag, ALL_IDS} from "./SightglassTestKit"
import {PinchTarget} from "../Scripts/GaugeTag"

const MIN_TARGET_DEG = 2
const MIN_GAP_DEG = 1
const CARD_DISTANCE_CM = 80

function deg(sizeCm: number, distCm: number): number {
  return (2 * Math.atan(sizeCm / 2 / distCm) * 180) / Math.PI
}

function problems(targets: PinchTarget[], dist: (t: PinchTarget) => number): string[] {
  const out: string[] = []
  for (const t of targets) {
    const d = dist(t)
    const w = deg(t.widthCm, d)
    const h = deg(t.heightCm, d)
    if (w < MIN_TARGET_DEG || h < MIN_TARGET_DEG) out.push(t.parent + " " + t.name + " is " + w.toFixed(2) + " x " + h.toFixed(2) + " deg at " + Math.round(d) + " cm")
  }
  for (let i = 0; i < targets.length; i++) {
    for (let j = i + 1; j < targets.length; j++) {
      const a = targets[i]
      const b = targets[j]
      if (a.parent !== b.parent) continue
      const dx = Math.abs(a.centre.x - b.centre.x)
      const dy = Math.abs(a.centre.y - b.centre.y)
      const dz = Math.abs(a.centre.z - b.centre.z)
      const flat = Math.sqrt(dx * dx + dz * dz)
      const gap = Math.max(flat - (a.widthCm + b.widthCm) / 2, dy - (a.heightCm + b.heightCm) / 2)
      const gd = (Math.atan(gap / dist(a)) * 180) / Math.PI
      if (gd < MIN_GAP_DEG) out.push(a.parent + " " + a.name + " to " + b.name + " gap " + gd.toFixed(2) + " deg")
    }
  }
  return out
}

@component
export class ExtraPinchTargets extends Scenario {
  async run(): Promise<void> {
    const main = await beginRound(0)
    const it = newInteractor()
    const bad: string[] = []
    let n = 0
    for (const id of ALL_IDS) {
      // Idle: the dot is the target.
      const idle = tag(main, id).pinchTargets()
      await readByPinch(it, main, id) // opens the decision bar (or Can't read it with By eye and Retry)
      await sleep(300)
      const targets = idle.concat(tag(main, id).pinchTargets())
      print("LEAF_INLENS_INFO targets " + id + " " + targets.map((t) => t.name + ":" + t.widthCm.toFixed(1) + "x" + t.heightCm.toFixed(1) + "cm@" + Math.round(t.centre.length)).join(" "))
      n += targets.length
      bad.push(...problems(targets, (t) => t.centre.length))
      if (id === "AE1-LO") {
        await pinchAction(it, main, id, "BY_EYE")
        await waitMode(main, id, ["adjust"])
        const adj = tag(main, id).pinchTargets()
        n += adj.length
        bad.push(...problems(adj, (t) => t.centre.length))
        await pinchAction(it, main, id, "DONE")
      } else {
        await pinchAction(it, main, id, "ACCEPT")
      }
      await waitMode(main, id, ["decided"])
    }
    // The card with the sign row and the escalations open.
    await pinchCard(it, main, "Btn Sign HOLD")
    await sleep(300)
    expect(n >= ALL_IDS.length * 2, "too few targets measured: " + n).toBe(true)
    const card = main.card.pinchTargets()
    n += card.length
    bad.push(...problems(card, () => CARD_DISTANCE_CM))
    print("LEAF_INLENS_INFO pinch-targets measured=" + n + " problems=" + bad.length)
    expect(bad.length, bad.join(" | ")).toBe(0)
  }
}
