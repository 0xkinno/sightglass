// AccuracyRun.ts
// Preview driver for P4 evidence. For each of the 8 gauges it makes reps live reads through the real path
// (FrameCapture crop, GaugeReader live through RSG, Core readDial through propose) and logs the reading next to
// the PlantSim truth. Alternates two arms: "hide" (overlay off for the capture frame, the shipped path) and
// "show" (overlay left on, tag open, band arc visible) for the first showReps reps.
// The preview camera stays still. Before each gauge the driver turns the stand-in room about the vertical axis so
// that dial sits straight ahead, like an engineer turning to face it. It waits until the dial is fully in view.
// Log lines: SIGHTGLASS_ACC. Enable with run = true, then refresh the preview. Does nothing otherwise.

import {UMS_EVENING_ROUND} from "../Scripts/Core/RoundPlan"
import {propose} from "../Scripts/Core/EvidenceGate"
import {GaugeReader} from "../Scripts/GaugeReader"
import {FrameCapture} from "../Scripts/FrameCapture"
import {PlantSim} from "../Scripts/PlantSim"
import {SightglassMain} from "../Scripts/SightglassMain"
import {GaugeStationView} from "../Scripts/GaugeStationView"

@component
export class AccuracyRun extends BaseScriptComponent {
  @input main!: SightglassMain
  @input reader!: GaugeReader
  @input capture!: FrameCapture
  @input plant!: PlantSim
  @input machineRoot!: SceneObject
  @input run: boolean = false
  @input reps: number = 5
  @input showReps: number = 3
  @input waitSecondsPerCapture: number = 90
  @input gaugeOrder: string = "ME-LO-IN,ME-JCW-OUT,ME-SCAV,FO-SUP,SW-PUMP,AIR-START,AE1-LO,STG-OIL"

  onAwake() {
    if (!this.run) return
    this.createEvent("OnStartEvent").bind(() => {
      this.go()
    })
  }

  private sleep(sec: number): Promise<void> {
    return new Promise<void>((resolve) => {
      const ev = this.createEvent("DelayedCallbackEvent")
      ev.bind(() => resolve())
      ev.reset(sec)
    })
  }

  private async go(): Promise<void> {
    await this.sleep(3)
    this.reader.mode = "live"
    this.reader.addCropSize = true
    this.reader.noThinking = true
    this.plant.setProgress(0.3)
    print("SIGHTGLASS_ACC_START reps=" + this.reps + " showReps=" + this.showReps)
    const ids = this.gaugeOrder.split(",")
    for (const id of ids) {
      const g = UMS_EVENING_ROUND.gauges.filter((x) => x.id === id)[0]
      for (let rep = 1; rep <= this.reps; rep++) {
        const arms = rep <= this.showReps ? ["hide", "show"] : ["hide"]
        for (const arm of arms) {
          await this.one(g, rep, arm)
        }
      }
    }
    this.machineRoot.getTransform().setWorldRotation(quat.quatIdentity())
    print("SIGHTGLASS_ACC_DONE")
  }

  private aim(id: string): void {
    const view = GaugeStationView.byId[id]
    const rt = this.machineRoot.getTransform()
    rt.setWorldRotation(quat.quatIdentity())
    const p = view.sceneObject.getTransform().getWorldPosition()
    const a = Math.atan2(p.x, -p.z)
    for (const sign of [-1, 1]) {
      rt.setWorldRotation(quat.angleAxis(sign * a, vec3.up()))
      const q = view.sceneObject.getTransform().getWorldPosition()
      if (Math.abs(q.x) < 1) return
    }
  }

  private async one(g: any, rep: number, arm: string): Promise<void> {
    const id: string = g.id
    this.aim(id)
    const deadline = getTime() + this.waitSecondsPerCapture
    while (!this.capture.dialInView(id)) {
      if (getTime() > deadline) {
        print("SIGHTGLASS_ACC arm=" + arm + " gauge=" + id + " rep=" + rep + " skipped=dial-not-in-view")
        return
      }
      await this.sleep(0.5)
    }
    const view = GaugeStationView.byId[id]
    const tag = this.main.tagFor(id)
    if (arm === "show") {
      view.setBandVisible(true)
      if (tag) tag.show("reading", "Reading", "", "neutral", [])
    } else {
      view.setBandVisible(false)
    }
    const truth = this.plant.valueOf(id)
    const cap = await this.capture.capture(id, arm === "hide")
    const res = await this.reader.read(id, cap)
    const p = propose(g, res.parsed, cap.ok ? cap.frameRef : null, Date.now(), null)
    if (tag) tag.show("idle", "", "", "neutral", [])
    view.setBandVisible(false)
    const read = p.value === null ? "null" : p.value.toFixed(3)
    const errTicks = p.value === null ? "null" : ((p.value - truth) / g.minorTick).toFixed(2)
    const expectCant = this.plant.isFogged(id)
    print(
      "SIGHTGLASS_ACC arm=" + arm + " gauge=" + id + " rep=" + rep + " truth=" + truth.toFixed(3) + " read=" + read +
        " errTicks=" + errTicks + " minorTick=" + g.minorTick + " kind=" + p.kind + " verdict=" + p.verdict + " expectCant=" + expectCant +
        " crop=" + (cap.ok ? cap.w + "x" + cap.h : "none") + " ms=" + res.ms + " tokens=" + (res.tokens === null ? "null" : res.tokens) +
        " modelValue=" + (p.modelValue === null ? "null" : String(p.modelValue)) + (cap.ok ? "" : " capfail=" + cap.why),
    )
    await this.sleep(0.8)
  }
}
