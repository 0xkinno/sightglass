// GaugeReader.ts
// Owns: turning a gauge (and, in live mode, a captured crop) into a ReaderOutput.
// Modes: live (Gemini through Snap's Remote Service Gateway), fixture (points built from PlantSim, used by LEAF),
// replay (a recorded live response for the gauge), fault-lies (confident answer, needle 90 degrees off),
// fault-garbage (prose instead of JSON).
// Must not: compute the value. It returns where the needle and scale marks are in the crop;
// readDial in Core turns those points into a number. The scale never comes from the model.

import {UMS_EVENING_ROUND, gaugeById} from "./Core/RoundPlan"
import {Gemini} from "Remote Service Gateway.lspkg/HostedExternal/Gemini"
import {parseReader, ParseResult, READER_MODEL, readerRequestBody} from "./Core/ReaderContract"
import {propose} from "./Core/EvidenceGate"
import {PlantSim} from "./PlantSim"
import {Capture} from "./FrameCapture"
import {RECORDED, RECORDED_STRETCH} from "../Tests/fixtures/Fixtures"

export type ReaderMode = "live" | "fixture" | "fault-lies" | "fault-garbage"

export interface ReadResult {
  parsed: ParseResult
  ms: number
  tokens: number | null
  mode: ReaderMode
}

const CROP = 256
const CENTER = CROP / 2
const MARK_RADIUS = 100 // scale marks sit at this distance from the pivot in the crop
const NEEDLE_RADIUS = 82

function polar(cwDeg: number, r: number): {x: number; y: number} {
  // Image coordinates, y down, angle measured clockwise from +x.
  const a = (cwDeg * Math.PI) / 180
  return {x: CENTER + r * Math.cos(a), y: CENTER + r * Math.sin(a)}
}

@component
export class GaugeReader extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">GaugeReader: live, fixture and fault modes</span>')
  @ui.separator
  @ui.group_start("References")
  @input
  @hint("Plant simulator. Only the fixture and fault modes read it, never the live mode.")
  plant!: PlantSim
  @ui.group_end

  @ui.group_start("Settings")
  @input
  @hint("Reader mode: live, fixture, replay, fault-lies or fault-garbage.")
  @widget(
    new ComboBoxWidget([
      new ComboBoxItem("fixture", "fixture"),
      new ComboBoxItem("live", "live"),
      new ComboBoxItem("replay", "replay"),
      new ComboBoxItem("fault-lies", "fault-lies"),
      new ComboBoxItem("fault-garbage", "fault-garbage"),
    ]),
  )
  mode: string = "fixture"

  @input
  @hint("Live only. Add a line telling the model the crop size in pixels. The shared contract prompt stays unchanged.")
  addCropSize: boolean = true

  @input
  @hint("Live only. Add a line that says how the scale is laid out: a 270 degree sweep, lowest mark lower left, highest lower right. The shared contract prompt stays unchanged.")
  addScaleHint: boolean = false

  @input
  @hint("Live only. Set the Gemini thinking budget to 0 for speed.")
  noThinking: boolean = true

  @input
  @hint("Pause before the answer comes back in the non-live modes, so the Reading state is visible on the tag.")
  @widget(new SliderWidget(0, 2000, 50))
  fixtureLatencyMs: number = 350
  @ui.group_end

  // Reader output for one gauge, as the model would return it: points in a 256 x 256 crop.
  buildFixtureJson(gaugeId: string, needleOffsetDeg: number = 0): string | null {
    const g = gaugeById(UMS_EVENING_ROUND, gaugeId)
    if (!g) return null
    const legible = !this.plant.isFogged(gaugeId)
    const value = this.plant.valueOf(gaugeId)
    const t = Math.max(0, Math.min(1, (value - g.min) / (g.max - g.min)))
    const minMark = polar(135, MARK_RADIUS)
    const maxMark = polar(45, MARK_RADIUS)
    const tip = polar(135 + 270 * t + needleOffsetDeg, NEEDLE_RADIUS)
    return JSON.stringify({
      legible: legible,
      reason: legible ? "" : "glass is fogged, needle tip hidden",
      image_width: CROP,
      image_height: CROP,
      center: {x: CENTER, y: CENTER},
      needle_tip: tip,
      min_mark: minMark,
      max_mark: maxMark,
      min_label: g.min,
      max_label: g.max,
      unit: g.unit,
    })
  }

  private finish(gaugeId: string, parsed: ParseResult, started: number, tokens: number | null, extra: string): ReadResult {
    // tokens stays null when the gateway response carries no usageMetadata; it is never estimated.
    const g = gaugeById(UMS_EVENING_ROUND, gaugeId)
    const ms = Math.round((getTime() - started) * 1000)
    const kind = g ? propose(g, parsed, null, 0, null).kind : "CANT_READ"
    print("SIGHTGLASS_READ gauge=" + gaugeId + " mode=" + this.mode + " ms=" + ms + " tokens=" + (tokens === null ? "null" : tokens) + " kind=" + kind + extra)
    return {parsed: parsed, ms: ms, tokens: tokens, mode: this.mode as ReaderMode}
  }

  private async readLive(gaugeId: string, cap: Capture | null, started: number): Promise<ReadResult> {
    if (!cap || !cap.ok) {
      return this.finish(gaugeId, {ok: false, why: "no capture: " + (cap ? cap.why : "none")}, started, null, "")
    }
    try {
      const body: any = readerRequestBody(cap.jpegB64)
      if (this.addCropSize) body.contents[0].parts.push({text: "This image is " + cap.w + " pixels wide and " + cap.h + " pixels high."})
      if (this.addScaleHint) body.contents[0].parts.push({text: "The scale sweeps 270 degrees clockwise. The lowest printed value is at the lower left of the dial, the highest printed value is at the lower right, and the gap between them is at the bottom. min_mark and max_mark are the tick marks at those two ends, not marks at the left and right of the pivot."})
      if (this.noThinking) body.generationConfig.thinkingConfig = {thinkingBudget: 0}
      const resp: any = await Gemini.models({model: READER_MODEL, type: "generateContent", body: body} as any)
      const text: string = resp && resp.candidates && resp.candidates[0] && resp.candidates[0].content && resp.candidates[0].content.parts && resp.candidates[0].content.parts[0] ? resp.candidates[0].content.parts[0].text : ""
      const tokens: number | null = resp && resp.usageMetadata && typeof resp.usageMetadata.totalTokenCount === "number" ? resp.usageMetadata.totalTokenCount : null
      if (tokens === null) print("SIGHTGLASS_RESPKEYS " + (resp ? Object.keys(resp).join(",") : "none"))
      print("SIGHTGLASS_RAW gauge=" + gaugeId + " crop=" + cap.w + "x" + cap.h + " json=" + String(text).replace(/\s+/g, " "))
      let parsed = parseReader(text, cap.w, cap.h)
      if (parsed.ok && cap.stretchX > 0 && Math.abs(cap.stretchX - 1) > 0.001) {
        // The composite is squashed horizontally by stretchX. Undo that so the dial is a circle for readDial.
        const o = parsed.out
        const fx = (p: {x: number; y: number}) => ({x: p.x / cap.stretchX, y: p.y})
        parsed = {ok: true, out: {...o, points: {center: fx(o.points.center), needleTip: fx(o.points.needleTip), minMark: fx(o.points.minMark), maxMark: fx(o.points.maxMark)}}}
      }
      return this.finish(gaugeId, parsed, started, tokens, " stretchX=" + cap.stretchX.toFixed(3))
    } catch (e) {
      return this.finish(gaugeId, {ok: false, why: "reader call failed: " + String(e).slice(0, 160)}, started, null, "")
    }
  }

  private replayParse(rec: string): ParseResult {
    const j = JSON.parse(rec)
    const w = typeof j.image_width === "number" ? j.image_width : CROP
    const h = typeof j.image_height === "number" ? j.image_height : CROP
    const r = parseReader(rec, w, h)
    if (!r.ok || Math.abs(RECORDED_STRETCH - 1) < 0.001) return r
    const o = r.out
    const fx = (p: {x: number; y: number}) => ({x: p.x / RECORDED_STRETCH, y: p.y})
    return {ok: true, out: {...o, points: {center: fx(o.points.center), needleTip: fx(o.points.needleTip), minMark: fx(o.points.minMark), maxMark: fx(o.points.maxMark)}}}
  }

  read(gaugeId: string, cap: Capture | null = null): Promise<ReadResult> {
    const started = getTime()
    if (this.mode === "live") return this.readLive(gaugeId, cap, started)
    return new Promise<ReadResult>((resolve) => {
      const done = () => {
        const g = gaugeById(UMS_EVENING_ROUND, gaugeId)
        let parsed: ParseResult
        if (!g) {
          parsed = {ok: false, why: "unknown gauge"}
        } else if (this.mode === "fixture") {
          parsed = parseReader(this.buildFixtureJson(gaugeId) as string, CROP, CROP)
        } else if (this.mode === "fault-lies") {
          parsed = parseReader(this.buildFixtureJson(gaugeId, 90) as string, CROP, CROP)
        } else if (this.mode === "fault-garbage") {
          parsed = parseReader("The gauge looks fine to me, about seventy percent of the way round.", CROP, CROP)
        } else if (this.mode === "replay") {
          const rec = RECORDED[gaugeId]
          parsed = rec ? this.replayParse(rec) : {ok: false, why: "no recorded fixture for " + gaugeId}
        } else {
          parsed = {ok: false, why: "reader mode '" + this.mode + "' is not available"}
        }
        resolve(this.finish(gaugeId, parsed, started, null, ""))
      }
      const ev = this.createEvent("DelayedCallbackEvent")
      ev.bind(done)
      ev.reset(Math.max(0, this.fixtureLatencyMs) / 1000)
    })
  }
}
