// PlantSim.ts
// Owns: the ground truth value of every stand-in gauge in the preview, a scripted evening with small noise.
// Expects @inputs: driftSeconds.
// Must not: be read by the reading path in a real build. In P3 only the fixture reader and the needles read it.

import {UMS_EVENING_ROUND, gaugeById} from "./Core/RoundPlan"

// Steady values for every gauge except ME-LO-IN, which drifts over the round (a clogging filter).
const SCRIPTED: {[id: string]: number} = {
  "ME-JCW-OUT": 82,
  "ME-SCAV": 2.6,
  "FO-SUP": 8.5,
  "SW-PUMP": 2.8,
  "AE1-LO": 5.2, // plausible, but the glass is fogged so the reader cannot see it
  "AIR-START": 28,
  "STG-OIL": 48,
}

const LO_START = 3.0
const LO_END = 1.6

@component
export class PlantSim extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">PlantSim: stand-in plant values</span>')
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Seconds for the main engine LO inlet pressure to drift from 3.0 to 1.6 bar.")
  @widget(new SliderWidget(10, 600, 5))
  driftSeconds: number = 60

  @input
  @hint("Share of one minor tick used as needle noise. 0 is a perfectly still needle.")
  @widget(new SliderWidget(0, 0.5, 0.05))
  noiseTicks: number = 0.15
  @ui.group_end

  private startedAt: number = 0
  private progressOverride: number | null = null

  onAwake() {
    this.startedAt = getTime()
  }

  // Restart the evening clock (the drift starts again from 3.0 bar).
  startRound(): void {
    this.startedAt = getTime()
    this.progressOverride = null
  }

  // Tests can pin the drift position: 0 gives 3.0 bar, 1 gives 1.6 bar.
  setProgress(p: number): void {
    this.progressOverride = Math.max(0, Math.min(1, p))
  }

  clearProgress(): void {
    this.progressOverride = null
  }

  roundProgress(): number {
    if (this.progressOverride !== null) return this.progressOverride
    return Math.max(0, Math.min(1, (getTime() - this.startedAt) / Math.max(1, this.driftSeconds)))
  }

  isFogged(id: string): boolean {
    return id === "AE1-LO"
  }

  // True value on the gauge right now, in the gauge's own unit.
  valueOf(id: string): number {
    const g = gaugeById(UMS_EVENING_ROUND, id)
    if (!g) return 0
    const base = id === "ME-LO-IN" ? LO_START + (LO_END - LO_START) * this.roundProgress() : SCRIPTED[id] !== undefined ? SCRIPTED[id] : (g.min + g.max) / 2
    let phase = 0
    for (let i = 0; i < id.length; i++) phase += id.charCodeAt(i)
    const noise = Math.sin(getTime() * 1.3 + phase) * g.minorTick * this.noiseTicks
    return Math.max(g.min, Math.min(g.max, base + noise))
  }
}
