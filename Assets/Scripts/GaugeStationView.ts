// GaugeStationView.ts
// Owns: the 3D stand-in dial for one gauge: 15 cm light face, dark ticks, numerals and unit printed on the
// face, a separate needle mesh driven by PlantSim, a band arc shown only while the tag is open, and a fog
// quad over the illegible gauge. This is physical stand-in art, not a UI panel, so the numerals are plain
// Component.Text inside this module (the reader must see them on the face).
// Expects @inputs: gaugeId, plant, material (vertexBaseColorMaterial), foggedGlass.
// Must not: decide readings or verdicts. It only draws what it is told and what PlantSim says.

import {UMS_EVENING_ROUND, GaugeSpec, gaugeById} from "./Core/RoundPlan"
import {verdictFor} from "./Core/Verdict"
import {MeshAcc, childObject, PALETTE, Rgba} from "./SightglassMesh"
import {PlantSim} from "./PlantSim"

const FACE_COLOR: Rgba = [0.92, 0.94, 0.96, 1]
const TICK_COLOR: Rgba = [0.1, 0.12, 0.15, 1]
const NEEDLE_COLOR: Rgba = [1.0, 0.36, 0.2, 1]
const FOG_COLOR: Rgba = [0.82, 0.87, 0.92, 0.9]
const SWEEP_START_CW_DEG = 135
const SWEEP_DEG = 270

function niceStep(span: number): number {
  const cands = [0.5, 1, 2, 5, 10, 20, 25, 50]
  for (const c of cands) {
    if (span / c <= 8) return c
  }
  return span / 5
}

function fmt(v: number): string {
  return Number(v.toFixed(2)).toString()
}

@component
export class GaugeStationView extends BaseScriptComponent {
  static byId: {[id: string]: GaugeStationView} = {}

  @ui.label('<span style="color: #60A5FA;">GaugeStationView: stand-in dial</span>')
  @ui.separator
  @ui.group_start("References")
  @input
  @hint("Round card gauge id this dial shows, for example ME-LO-IN.")
  gaugeId: string = "ME-LO-IN"

  @input
  @hint("Plant simulator that drives the needle.")
  plant!: PlantSim

  @input
  @hint("Vertex colour material used for every dial mesh.")
  material!: Material
  @ui.group_end

  @ui.group_start("Settings")
  @input
  @hint("Dial face diameter in centimetres. Real gauges of this kind are 150 mm.")
  @widget(new SliderWidget(10, 25, 0.5))
  faceDiameterCm: number = 15

  @input
  @hint("Cover this dial with a fogged glass quad so the reader cannot see the needle.")
  foggedGlass: boolean = false
  @ui.group_end

  private spec: GaugeSpec | null = null
  private needleObj: SceneObject | null = null
  private bandObj: SceneObject | null = null
  private shownValue: number = 0

  get gauge(): GaugeSpec {
    return this.spec as GaugeSpec
  }

  get isFogged(): boolean {
    return this.foggedGlass
  }

  get bandVisible(): boolean {
    return this.bandObj !== null && this.bandObj.enabled
  }

  // Value the needle currently points at, in the gauge unit.
  get displayedValue(): number {
    return this.shownValue
  }

  // Needle angle in image terms: degrees clockwise from +x, as the reader sees it.
  get needleCwDeg(): number {
    const g = this.gauge
    const t = (this.shownValue - g.min) / (g.max - g.min)
    return SWEEP_START_CW_DEG + SWEEP_DEG * Math.max(0, Math.min(1, t))
  }

  centerWorld(): vec3 {
    return this.sceneObject.getTransform().getWorldPosition()
  }

  setBandVisible(visible: boolean): void {
    if (this.bandObj) this.bandObj.enabled = visible
  }

  onAwake() {
    const g = gaugeById(UMS_EVENING_ROUND, this.gaugeId)
    if (!g) {
      print("GaugeStationView: unknown gauge id " + this.gaugeId)
      return
    }
    this.spec = g
    GaugeStationView.byId[this.gaugeId] = this
    this.buildDial(g)
    this.createEvent("UpdateEvent").bind(() => this.updateNeedle())
  }

  private cwToXY(cwDeg: number, r: number): vec2 {
    // Screen clockwise angle to local dial coordinates (y up).
    const a = (cwDeg * Math.PI) / 180
    return new vec2(r * Math.cos(a), -r * Math.sin(a))
  }

  private valueToCw(g: GaugeSpec, v: number): number {
    return SWEEP_START_CW_DEG + (SWEEP_DEG * (v - g.min)) / (g.max - g.min)
  }

  private buildDial(g: GaugeSpec): void {
    const s = this.faceDiameterCm / 15 // everything below is authored for a 15 cm face
    const art = childObject(this.sceneObject, "DialArt")
    art.createComponent("Component.Canvas")

    // Face
    const face = childObject(art, "Face")
    const fm = new MeshAcc()
    fm.disc(0, 0, 7.5 * s, 48, FACE_COLOR)
    fm.attach(face, this.material)

    // Ticks
    const ticks = childObject(art, "Ticks", new vec3(0, 0, 0.15))
    const tm = new MeshAcc()
    const n = Math.round((g.max - g.min) / g.minorTick)
    const major = niceStep(g.max - g.min)
    for (let i = 0; i <= n; i++) {
      const v = g.min + i * g.minorTick
      const cw = this.valueToCw(g, v)
      const isMajor = Math.abs(v / major - Math.round(v / major)) < 1e-6
      const r0 = (isMajor ? 5.7 : 6.3) * s
      tm.line(this.cwToXY(cw, r0), this.cwToXY(cw, 7.0 * s), (isMajor ? 0.22 : 0.1) * s, TICK_COLOR)
    }
    tm.attach(ticks, this.material)

    // Numerals and unit printed on the face
    const labels = childObject(art, "Numerals", new vec3(0, 0, 0.3))
    for (let v = g.min; v <= g.max + 1e-6; v += major) {
      const p = this.cwToXY(this.valueToCw(g, v), 4.4 * s)
      this.addText(labels, fmt(v), p.x, p.y, 3, 1.6, 44 * s)
    }
    this.addText(labels, g.unit === "C" ? "°C" : g.unit, 0, -3.2 * s, 4, 1.6, 40 * s)

    // Band arc on the rim, hidden until the tag opens
    this.bandObj = childObject(art, "BandArc", new vec3(0, 0, 0.15))
    const bm = new MeshAcc()
    const marks: number[] = [g.min, g.max]
    const b = g.bands
    for (const v of [b.alarmLow, b.warnLow, b.warnHigh, b.alarmHigh]) {
      if (v !== undefined && v > g.min && v < g.max) marks.push(v)
    }
    marks.sort((x, y) => x - y)
    for (let i = 0; i < marks.length - 1; i++) {
      const lo = marks[i]
      const hi = marks[i + 1]
      const verdict = verdictFor((lo + hi) / 2, g).verdict
      const col = verdict === "ALARM" ? PALETTE.coral : verdict === "WATCH" ? PALETTE.amber : PALETTE.mint
      // Math angles run counter clockwise, screen clockwise angles run the other way.
      const aLo = (-this.valueToCw(g, lo) * Math.PI) / 180
      const aHi = (-this.valueToCw(g, hi) * Math.PI) / 180
      bm.arc(7.7 * s, 8.5 * s, aHi, aLo, col)
    }
    bm.attach(this.bandObj, this.material)
    this.bandObj.enabled = false

    // Needle, a separate mesh rotated from the plant value
    this.needleObj = childObject(art, "Needle", new vec3(0, 0, 0.6))
    const nm = new MeshAcc()
    nm.tri(new vec2(6.4 * s, 0), new vec2(0, 0.28 * s), new vec2(0, -0.28 * s), NEEDLE_COLOR)
    nm.quad(
      new vec2(-1.8 * s, -0.16 * s),
      new vec2(0, -0.28 * s),
      new vec2(0, 0.28 * s),
      new vec2(-1.8 * s, 0.16 * s),
      NEEDLE_COLOR,
    )
    nm.attach(this.needleObj, this.material)
    const hub = childObject(this.needleObj, "Hub", new vec3(0, 0, 0.15))
    const hm = new MeshAcc()
    hm.disc(0, 0, 0.7 * s, 20, TICK_COLOR)
    hm.attach(hub, this.material)

    // Fog quad over the illegible gauge
    if (this.foggedGlass) {
      const fog = childObject(art, "FogQuad", new vec3(0, 0, 1.0))
      const fq = new MeshAcc()
      fq.disc(0, 0, 7.6 * s, 48, FOG_COLOR)
      const rmv = fq.attach(fog, this.material)
      const fogMat = this.material.clone()
      fogMat.mainPass.blendMode = BlendMode.PremultipliedAlphaAuto
      rmv.mainMaterial = fogMat
    }

    this.shownValue = this.plant ? this.plant.valueOf(g.id) : g.min
    this.applyNeedle()
  }

  private addText(parent: SceneObject, text: string, x: number, y: number, w: number, h: number, size: number): void {
    const o = childObject(parent, "T " + text, new vec3(x, y, 0))
    const t = o.createComponent("Component.Text") as Text
    t.text = text
    t.size = size
    t.depthTest = true
    t.horizontalAlignment = HorizontalAlignment.Center
    t.verticalAlignment = VerticalAlignment.Center
    t.horizontalOverflow = HorizontalOverflow.Overflow
    t.verticalOverflow = VerticalOverflow.Overflow
    t.layoutRect = Rect.create(-w / 2, w / 2, -h / 2, h / 2)
    t.textFill.color = new vec4(TICK_COLOR[0], TICK_COLOR[1], TICK_COLOR[2], 1)
  }

  private updateNeedle(): void {
    if (!this.spec || !this.plant) return
    this.shownValue = this.plant.valueOf(this.spec.id)
    this.applyNeedle()
  }

  private applyNeedle(): void {
    if (!this.needleObj) return
    // The needle mesh points along +x. A clockwise screen angle is a negative rotation about +z.
    const rad = (-this.needleCwDeg * Math.PI) / 180
    this.needleObj.getTransform().setLocalRotation(quat.angleAxis(rad, vec3.forward()))
  }
}
