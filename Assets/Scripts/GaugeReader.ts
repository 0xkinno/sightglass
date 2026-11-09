// GaugeReader.ts
// Owns: turning a gauge into a ReaderOutput. P3 has the fixture mode only (no camera, no RSG calls).
// Expects @inputs: plant (ground truth, fixture mode only), mode, fixtureLatencyMs.
// Must not: compute the value. It returns where the needle and scale marks are in a 256 x 256 crop;
// readDial in Core turns those points into a number.

import {SAMPLE_UMS_ROUND, gaugeById} from "./Core/RoundPlan"
import {parseReader, ParseResult} from "./Core/ReaderContract"
import {propose} from "./Core/EvidenceGate"
import {PlantSim} from "./PlantSim"

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
  @ui.label('<span style="color: #60A5FA;">GaugeReader: fixture reader</span>')
  @ui.separator
  @ui.group_start("References")
  @input
  @hint("Plant simulator. Only the fixture mode reads it.")
  plant!: PlantSim
  @ui.group_end

  @ui.group_start("Settings")
  @input
  @hint("Reader mode. Only 'fixture' is available in this build.")
  @widget(new ComboBoxWidget([new ComboBoxItem("fixture", "fixture")]))
  mode: string = "fixture"

  @input
  @hint("Pause before the answer comes back, so the Reading state is visible on the tag.")
  @widget(new SliderWidget(0, 2000, 50))
  fixtureLatencyMs: number = 350
  @ui.group_end

  // Reader output for one gauge, as the model would return it: points in a 256 x 256 crop.
  buildFixtureJson(gaugeId: string): string | null {
    const g = gaugeById(SAMPLE_UMS_ROUND, gaugeId)
    if (!g) return null
    const legible = !this.plant.isFogged(gaugeId)
    const value = this.plant.valueOf(gaugeId)
    const t = Math.max(0, Math.min(1, (value - g.min) / (g.max - g.min)))
    const minMark = polar(135, MARK_RADIUS)
    const maxMark = polar(45, MARK_RADIUS)
    const tip = polar(135 + 270 * t, NEEDLE_RADIUS)
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

  read(gaugeId: string): Promise<ReadResult> {
    const started = getTime()
    return new Promise<ReadResult>((resolve) => {
      const finish = () => {
        const g = gaugeById(SAMPLE_UMS_ROUND, gaugeId)
        let parsed: ParseResult
        if (this.mode !== "fixture" || !g) {
          parsed = {ok: false, why: "reader mode '" + this.mode + "' is not available in this build"}
        } else {
          parsed = parseReader(this.buildFixtureJson(gaugeId) as string, CROP, CROP)
        }
        const ms = Math.round((getTime() - started) * 1000)
        const kind = g ? propose(g, parsed, null, 0, null).kind : "CANT_READ"
        print("SIGHTGLASS_READ gauge=" + gaugeId + " mode=" + this.mode + " ms=" + ms + " tokens=null kind=" + kind)
        resolve({parsed: parsed, ms: ms, tokens: null, mode: this.mode as ReaderMode})
      }
      const ev = this.createEvent("DelayedCallbackEvent")
      ev.bind(finish)
      ev.reset(Math.max(0, this.fixtureLatencyMs) / 1000)
    })
  }
}
