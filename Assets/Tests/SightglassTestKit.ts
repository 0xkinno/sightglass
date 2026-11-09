// SightglassTestKit.ts
// Shared helpers for the Sightglass LEAF scenarios (fixture reader mode).
// Finds SightglassMain on the scene object "Sightglass", waits for the round to start, pins the plant,
// and drives the tags and the round card with real pinches through a LEAF interactor.
// Must not: change any lens script. It only reads state and presses what a person could press.

import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {findInteractablesByName} from "Leaf.lspkg/Interactors/InteractableUtils"
import {findSceneObjectByName, sleep} from "Leaf.lspkg/Utils/common/Utils"
import {SightglassMain} from "../Scripts/SightglassMain"
import {GaugeStationView} from "../Scripts/GaugeStationView"
import {GaugeTag, TagAction, TagMode} from "../Scripts/GaugeTag"
import {UMS_EVENING_ROUND, GaugeSpec, gaugeById} from "../Scripts/Core/RoundPlan"
import {Proposal, Entry} from "../Scripts/Core/EvidenceGate"

// Polls a condition every 50 ms. Leaf 2.0.2 has no waitUntil, so the kit carries its own.
export async function waitUntil(cond: () => boolean, timeoutMs: number, why: () => string): Promise<void> {
  const start = getTime()
  while (!cond()) {
    if ((getTime() - start) * 1000 > timeoutMs) throw new Error("timeout: " + why())
    await sleep(50)
  }
}

export const ALL_IDS: string[] = UMS_EVENING_ROUND.gauges.map((g) => g.id)
const WAIT_MS = 8000

export function spec(id: string): GaugeSpec {
  return gaugeById(UMS_EVENING_ROUND, id) as GaugeSpec
}

export function getMain(): SightglassMain {
  const so = findSceneObjectByName("Sightglass")
  if (!so) throw new Error('scene object "Sightglass" not found')
  const main = so.getComponent(SightglassMain.getTypeName()) as SightglassMain
  if (!main) throw new Error("SightglassMain not found on Sightglass")
  return main
}

// Wait for the round to start (8 entries, 8 tags), then pin the plant drift so the run does not depend on the timer.
export async function beginRound(progress: number): Promise<SightglassMain> {
  const main = getMain()
  await waitUntil(
    () => main.entries.length === ALL_IDS.length && ALL_IDS.every((id) => main.tagFor(id) !== null),
    WAIT_MS,
    () => "round did not start, entries=" + main.entries.length,
  )
  main.plant.setProgress(progress)
  await sleep(300)
  return main
}

export function newInteractor(): DefaultLeafInteractor {
  const it = new DefaultLeafInteractor()
  return it
}

export function tag(main: SightglassMain, id: string): GaugeTag {
  const t = main.tagFor(id)
  if (!t) throw new Error("no tag for " + id)
  return t
}

async function findInter(name: string, root: SceneObject, what: string): Promise<Interactable> {
  let found: Interactable | undefined
  await waitUntil(
    () => {
      found = findInteractablesByName(name, root, true)[0]
      return found !== undefined
    },
    WAIT_MS,
    () => "no enabled interactable " + name + " for " + what,
  )
  return found as Interactable
}

// Real pinch on the dot beside a gauge.
export async function pinchDot(it: DefaultLeafInteractor, main: SightglassMain, id: string): Promise<void> {
  const t = tag(main, id)
  const dot = await findInter("Dot", t.getSceneObject(), "dot of " + id)
  await it.trigger(dot)
  await sleep(100)
}

// Real pinch on one of the decision buttons of a tag. The slot index is the position of the action in tag.buttons.
export async function pinchAction(it: DefaultLeafInteractor, main: SightglassMain, id: string, action: TagAction): Promise<void> {
  const t = tag(main, id)
  await waitUntil(() => t.buttons.indexOf(action) >= 0, WAIT_MS, () => id + " tag does not offer " + action + ", buttons=" + t.buttons.join(","))
  const slot = await findInter("Slot" + t.buttons.indexOf(action), t.getSceneObject(), id + " " + action)
  await it.trigger(slot)
  await sleep(150)
}

// Real pinch on a button of the round card, by its scene object name ("Btn Sign HOLD", "Btn Called the chief engineer").
export async function pinchCard(it: DefaultLeafInteractor, main: SightglassMain, name: string): Promise<void> {
  const b = await findInter(name, main.card.getSceneObject(), "card button " + name)
  await it.trigger(b)
  await sleep(150)
}

export async function waitMode(main: SightglassMain, id: string, modes: TagMode[], ms: number = WAIT_MS): Promise<void> {
  const t = tag(main, id)
  await waitUntil(() => modes.indexOf(t.mode) >= 0, ms, () => id + " tag mode is " + t.mode + ", wanted " + modes.join("|"))
}

// Pinch the dot and wait for the tag to settle on a proposal or on Can't read it.
export async function readByPinch(it: DefaultLeafInteractor, main: SightglassMain, id: string): Promise<void> {
  if (main.reader.mode === "live") {
    // A live read needs the dial in view, so turn the room to it first, as an engineer turns to a gauge.
    aimDial(main, id)
    await waitUntil(() => main.capture.dialInView(id), WAIT_MS, () => id + " dial not in view for a live read")
  }
  await pinchDot(it, main, id)
  await waitMode(main, id, ["proposal", "cant"], main.reader.mode === "live" ? 30000 : WAIT_MS)
}

export function numberOf(headline: string): number {
  return parseFloat(headline.split(" ")[0])
}

export function entryOf(main: SightglassMain, id: string): Entry {
  const e = main.entryFor(id)
  if (!e) throw new Error("no entry for " + id)
  return e
}

export function proposalOf(main: SightglassMain, id: string): Proposal {
  const p = main.proposalFor(id)
  if (!p) throw new Error("no proposal for " + id)
  return p
}

// Records every tag mode change (with its headline) frame by frame, so a short state like Reading is not missed.
export class TagWatcher {
  seen: string[] = []
  private ev: any
  constructor(private owner: BaseScriptComponent, private t: GaugeTag) {
    this.ev = owner.createEvent("UpdateEvent")
    this.ev.bind(() => {
      const s = this.t.mode + ":" + this.t.headlineText
      if (this.seen.length === 0 || this.seen[this.seen.length - 1] !== s) this.seen.push(s)
    })
  }
  stop(): void {
    this.owner.removeEvent(this.ev)
  }
}

// Turn the stand-in room about the vertical axis so a dial sits straight ahead of the camera, like an engineer
// turning to face it. Runtime only. yawExtraDeg turns it further away.
export function aimDial(main: SightglassMain, id: string, yawExtraDeg: number = 0): void {
  const view = GaugeStationView.byId[id]
  const rt = main.machineRoot.getTransform()
  rt.setWorldRotation(quat.quatIdentity())
  const p = view.sceneObject.getTransform().getWorldPosition()
  const a = Math.atan2(p.x, -p.z)
  for (const sign of [-1, 1]) {
    rt.setWorldRotation(quat.angleAxis(sign * a, vec3.up()))
    const q = view.sceneObject.getTransform().getWorldPosition()
    if (Math.abs(q.x) < 1) break
  }
  if (yawExtraDeg !== 0) rt.setWorldRotation(rt.getWorldRotation().multiply(quat.angleAxis((yawExtraDeg * Math.PI) / 180, vec3.up())))
}

export function resetRoom(main: SightglassMain): void {
  main.machineRoot.getTransform().setWorldRotation(quat.quatIdentity())
}
