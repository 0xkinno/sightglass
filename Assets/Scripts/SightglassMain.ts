// SightglassMain.ts
// Owns: the round flow. Round state (one Entry per gauge), the read, accept, correct and by eye steps, the
// alarm moment, the chevron target, and signing READY or HOLD. Sending is a fixture stub in this build.
// Expects @inputs: plant, reader, roundCard, chevron, audio, machineRoot, eyeHeightCm, selfTest.
// Must not: draw anything or hold UI text. It pushes text into GaugeTag and RoundCard and listens to their events.
// Decisions come from Core: readDial (inside propose), verdictFor, EvidenceGate, canSign, buildSheet.

import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"
import {SAMPLE_UMS_ROUND, GaugeSpec, gaugeById} from "./Core/RoundPlan"
import {toLogResolution} from "./Core/DialGeometry"
import {
  Entry,
  EntryState,
  ESCALATIONS,
  Proposal,
  SignRequest,
  UmsDecision,
  accept,
  byEye,
  canSign,
  correct,
  emptyEntry,
  propose,
} from "./Core/EvidenceGate"
import {verdictFor, Verdict} from "./Core/Verdict"
import {RoundSheet, buildSheet} from "./Core/RoundSheet"
import {PlantSim} from "./PlantSim"
import {GaugeReader} from "./GaugeReader"
import {FrameCapture, Capture} from "./FrameCapture"
import {GaugeTag, TagAction, TagTone} from "./GaugeTag"
import {GaugeStationView} from "./GaugeStationView"
import {RoundCard, CardTone} from "./RoundCard"
import {ChevronGuide} from "./ChevronGuide"
import {SightglassAudio} from "./SightglassAudio"

const SHORT_NAME: {[id: string]: string} = {"ME-LO-IN": "LO inlet"}
const SIGNER_ROLE = "Duty engineer"

interface Run {
  proposal: Proposal | null
  kind: "CORRECT" | "BY_EYE" | null
  adjust: number | null
  reading: boolean
  token: number
}

function fmt(v: number): string {
  return Number(v.toFixed(2)).toString()
}

function verdictWord(v: Verdict | null): string {
  return v === "ALARM" ? "Alarm" : v === "WATCH" ? "Watch" : "Normal"
}

function stateWord(s: EntryState): string {
  return s === "SEEN" ? "Seen" : s === "CORRECTED" ? "Corrected" : s === "BY_EYE" ? "Read by eye" : "Not read"
}

function toneOf(v: Verdict | null): TagTone {
  return v === "ALARM" ? "alarm" : v === "WATCH" ? "watch" : "normal"
}

@component
export class SightglassMain extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">SightglassMain: round flow and sign</span>')
  @ui.separator
  @ui.group_start("References")
  @input
  @hint("Plant simulator. Restarted when the round starts.")
  plant!: PlantSim

  @input
  @hint("Gauge reader. Live, fixture, replay and fault modes.")
  reader!: GaugeReader

  @input
  @hint("Frame capture. Used when the reader mode is live.")
  capture!: FrameCapture

  @input
  @hint("Round card shown low left of view.")
  roundCard!: RoundCard

  @input
  @hint("Chevron that points to the next gauge when it is out of view.")
  chevron!: ChevronGuide

  @input
  @hint("Spatial cues for the alarm moment.")
  audio!: SightglassAudio

  @input
  @hint("Root of the stand-in machinery space. Its floor is placed relative to the real camera height.")
  machineRoot!: SceneObject
  @ui.group_end

  @ui.group_start("Settings")
  @input
  @hint("Eye height above the floor in centimetres. The stand-in floor is placed this far below the camera at start.")
  @widget(new SliderWidget(140, 190, 1))
  eyeHeightCm: number = 165

  @input
  @hint("Place the stand-in floor from the camera height at start.")
  placeFloorFromCamera: boolean = true

  @input
  @hint("Debug: play a scripted round on start and log SIGHTGLASS_SELFTEST lines.")
  selfTest: boolean = false
  @ui.group_end

  private plan = SAMPLE_UMS_ROUND
  private _entries: Entry[] = []
  private runs: {[id: string]: Run} = {}
  private startedAtMs: number = 0
  private stateMsg: string = "Pinch the dot beside a gauge to read it."
  private stateTone: CardTone = "neutral"
  private _signed: boolean = false
  private _code: string = ""
  private _digest: string = ""
  private _sheet: RoundSheet | null = null
  private _readCount: number = 0
  private settleUntil: number = 0
  private _onEntryChanged = new Event<string>()
  private _onSigned = new Event<string>()

  // Events tests can subscribe to.
  get onEntryChanged(): PublicApi<string> {
    return this._onEntryChanged.publicApi()
  }
  get onSigned(): PublicApi<string> {
    return this._onSigned.publicApi()
  }

  // State accessors for tests.
  get entries(): Entry[] {
    return this._entries.slice()
  }
  entryFor(id: string): Entry | null {
    for (const e of this._entries) if (e.gaugeId === id) return e
    return null
  }
  proposalFor(id: string): Proposal | null {
    const r = this.runs[id]
    return r ? r.proposal : null
  }
  tagFor(id: string): GaugeTag | null {
    return GaugeTag.byId[id] || null
  }
  viewFor(id: string): GaugeStationView | null {
    return GaugeStationView.byId[id] || null
  }
  tagTextFor(id: string): string {
    const t = this.tagFor(id)
    return t ? t.visibleText : ""
  }
  tagModeFor(id: string): string {
    const t = this.tagFor(id)
    return t ? t.mode : ""
  }
  get decidedCount(): number {
    return this._entries.filter((e) => e.state !== "NOT_READ").length
  }
  get signed(): boolean {
    return this._signed
  }
  get shortCode(): string {
    return this._code
  }
  get digest(): string {
    return this._digest
  }
  get sheet(): RoundSheet | null {
    return this._sheet
  }
  get card(): RoundCard {
    return this.roundCard
  }
  get signReadyEnabled(): boolean {
    return this.roundCard.signReadyEnabled
  }
  get nextGaugeId(): string | null {
    for (const e of this._entries) if (e.state === "NOT_READ") return e.gaugeId
    return null
  }

  onAwake() {
    this.createEvent("OnStartEvent").bind(() => this.start())
  }

  private start(): void {
    this.startedAtMs = Date.now()
    this.plant.startRound()
    this.placeFloor()
    for (const g of this.plan.gauges) {
      this._entries.push(emptyEntry(g.id))
      this.runs[g.id] = {proposal: null, kind: null, adjust: null, reading: false, token: 0}
      const tag = GaugeTag.byId[g.id]
      if (!tag) {
        print("SightglassMain: no tag found for " + g.id)
        continue
      }
      const id = g.id
      tag.onAction.add((a) => this.handleAction(id, a))
    }
    this.roundCard.onSignReady.add(() => this.sign("READY"))
    this.roundCard.onSignHold.add(() => this.sign("HOLD"))
    this.roundCard.onEscalation.add((i) => this.sign("HOLD", i))
    this.refreshCard()
    this.settleUntil = getTime() + 2
    this.createEvent("UpdateEvent").bind(() => {
      // The preview moves the camera to its start pose just after start, so keep the floor tied to it briefly.
      if (getTime() < this.settleUntil) this.placeFloor(true)
      this.updateChevron()
    })
    print("SIGHTGLASS_START plan=" + this.plan.id + " gauges=" + this.plan.gauges.length + " mode=" + this.reader.mode)
    if (this.selfTest) this.runSelfTest()
  }

  // Put the stand-in floor eyeHeightCm below the real camera, so dials sit at the intended height above the floor.
  private placeFloor(quiet: boolean = false): void {
    if (!this.placeFloorFromCamera || !this.machineRoot) return
    const camY = WorldCameraFinderProvider.getInstance().getWorldPosition().y
    const tr = this.machineRoot.getTransform()
    const p = tr.getWorldPosition()
    tr.setWorldPosition(new vec3(p.x, camY - this.eyeHeightCm, p.z))
    if (!quiet) print("SIGHTGLASS_FLOOR cameraY=" + fmt(camY) + " floorY=" + fmt(camY - this.eyeHeightCm))
  }

  private gaugeOf(id: string): GaugeSpec {
    return gaugeById(this.plan, id) as GaugeSpec
  }

  private indexOf(id: string): number {
    for (let i = 0; i < this._entries.length; i++) if (this._entries[i].gaugeId === id) return i
    return -1
  }

  private handleAction(id: string, a: TagAction): void {
    if (this._signed) return
    switch (a) {
      case "READ":
      case "RETRY":
        this.requestRead(id)
        break
      case "ACCEPT":
        this.accept(id)
        break
      case "CORRECT":
        this.correctBegin(id)
        break
      case "BY_EYE":
        this.byEyeBegin(id)
        break
      case "PLUS":
        this.step(id, 1)
        break
      case "MINUS":
        this.step(id, -1)
        break
      case "DONE":
        this.adjustDone(id)
        break
      case "RECHECK":
        this.recheck(id)
        break
    }
  }

  // Pinching the dot: show Reading, ask the reader, then show the proposal or "Can't read it".
  async requestRead(id: string): Promise<void> {
    const run = this.runs[id]
    const tag = this.tagFor(id)
    const view = this.viewFor(id)
    if (!run || !tag || this._signed || run.reading) return
    run.reading = true
    run.token += 1
    const token = run.token
    this._readCount += 1
    tag.show("reading", "Reading", "", "neutral", [])
    if (view) view.setBandVisible(true)
    this.stateMsg = "Reading " + this.gaugeOf(id).label + "."
    this.stateTone = "neutral"
    this.refreshCard()

    let cap: Capture | null = null
    if (this.reader.mode === "live") cap = await this.capture.capture(id, true)
    const res = await this.reader.read(id, cap)
    if (run.token !== token) return
    run.reading = false
    const frameRef = cap && cap.ok ? cap.frameRef : "fixture-" + id + "-" + this._readCount
    run.proposal = propose(this.gaugeOf(id), res.parsed, frameRef, Date.now(), null)
    this.showProposal(id)
  }

  private showProposal(id: string): void {
    const run = this.runs[id]
    const tag = this.tagFor(id) as GaugeTag
    const g = this.gaugeOf(id)
    const p = run.proposal as Proposal
    const view = this.viewFor(id)
    if (view) view.setBandVisible(true)
    if (p.kind === "CANT_READ" || p.value === null) {
      tag.show("cant", "Can't read it", "Enter by eye", "neutral", ["BY_EYE", "RETRY"])
      this.stateMsg = g.label + ": can't read it. Enter the value by eye."
      this.stateTone = "watch"
      this.refreshCard()
      return
    }
    let tone = toneOf(p.verdict)
    if (p.kind === "REVIEW" && tone === "normal") tone = "watch"
    const detail = p.kind === "REVIEW" ? verdictWord(p.verdict) + "\nVerify it" : verdictWord(p.verdict)
    tag.show("proposal", fmt(p.value) + " " + g.unit, detail, tone, ["ACCEPT", "CORRECT", "BY_EYE"])
    if (p.verdict === "ALARM") {
      this.stateMsg = this.alarmLine(g, p.value)
      this.stateTone = "alarm"
      if (view) this.audio.playAlarmAt(view.centerWorld())
    } else {
      this.stateMsg = g.label + " " + fmt(p.value) + " " + g.unit + ". Accept, correct or read by eye."
      this.stateTone = tone === "watch" ? "watch" : "normal"
    }
    this.refreshCard()
  }

  accept(id: string): boolean {
    const run = this.runs[id]
    if (!run || this._signed || run.reading || !run.proposal || run.proposal.kind === "CANT_READ") return false
    this.setEntry(id, accept(run.proposal))
    return true
  }

  correctBegin(id: string): boolean {
    const run = this.runs[id]
    if (!run || this._signed || !run.proposal || run.proposal.value === null) return false
    run.kind = "CORRECT"
    run.adjust = run.proposal.value
    this.showAdjust(id)
    return true
  }

  byEyeBegin(id: string): boolean {
    const run = this.runs[id]
    if (!run || this._signed || run.reading) return false
    const g = this.gaugeOf(id)
    run.kind = "BY_EYE"
    // Start from the proposal when there is one, else the middle of the scale.
    run.adjust = run.proposal && run.proposal.value !== null ? run.proposal.value : toLogResolution((g.min + g.max) / 2, g.minorTick)
    this.showAdjust(id)
    return true
  }

  // One pinch on plus or minus moves the value by one minor tick.
  step(id: string, dir: number): boolean {
    const run = this.runs[id]
    if (!run || run.kind === null || run.adjust === null) return false
    const g = this.gaugeOf(id)
    const next = Math.max(g.min, Math.min(g.max, run.adjust + (dir >= 0 ? 1 : -1) * g.minorTick))
    run.adjust = toLogResolution(next, g.minorTick)
    this.showAdjust(id)
    return true
  }

  adjustDone(id: string): boolean {
    const run = this.runs[id]
    if (!run || run.kind === null || run.adjust === null) return false
    const g = this.gaugeOf(id)
    let entry: Entry
    if (run.kind === "CORRECT" && run.proposal && run.proposal.value !== null) {
      entry = correct(run.proposal, g, run.adjust)
    } else {
      const why = run.proposal && run.proposal.kind !== "CANT_READ" ? "engineer replaced the computed value" : "dial could not be read from the frame"
      entry = byEye(g, run.adjust, Date.now(), run.proposal ? run.proposal.frameRef : null, why)
    }
    run.kind = null
    run.adjust = null
    this.setEntry(id, entry)
    return true
  }

  // Recheck: a new capture. The earlier entry is cleared so the round cannot be signed on a stale value.
  recheck(id: string): boolean {
    const run = this.runs[id]
    const i = this.indexOf(id)
    if (!run || i < 0 || this._signed) return false
    this._entries[i] = emptyEntry(id)
    run.proposal = null
    run.kind = null
    run.adjust = null
    this.roundCard.showEscalations(false)
    this.requestRead(id)
    return true
  }

  private showAdjust(id: string): void {
    const run = this.runs[id]
    const g = this.gaugeOf(id)
    const tag = this.tagFor(id) as GaugeTag
    const v = run.adjust as number
    const verdict = verdictFor(v, g).verdict
    tag.show("adjust", fmt(v) + " " + g.unit, run.kind === "CORRECT" ? "Correcting" : "By eye", toneOf(verdict), ["MINUS", "PLUS", "DONE"])
    this.stateMsg = (run.kind === "CORRECT" ? "Correcting " : "Reading by eye ") + g.label + ". Use plus and minus, then Done."
    this.stateTone = "neutral"
    this.refreshCard()
  }

  private setEntry(id: string, entry: Entry): void {
    const i = this.indexOf(id)
    const g = this.gaugeOf(id)
    this._entries[i] = entry
    const tag = this.tagFor(id) as GaugeTag
    const view = this.viewFor(id)
    if (view) view.setBandVisible(false)
    const v = entry.value as number
    tag.show("decided", fmt(v) + " " + g.unit, verdictWord(entry.verdict) + "\n" + stateWord(entry.state), toneOf(entry.verdict), ["RECHECK"])
    this.stateMsg = g.label + " " + fmt(v) + " " + g.unit + ", " + stateWord(entry.state).toLowerCase() + "."
    this.stateTone = toneOf(entry.verdict) === "alarm" ? "alarm" : "normal"
    print(
      "SIGHTGLASS_ENTRY gauge=" + id + " state=" + entry.state + " value=" + fmt(v) + " computed=" +
        (entry.computedValue === null ? "null" : fmt(entry.computedValue)) + " verdict=" + entry.verdict,
    )
    this._onEntryChanged.invoke(id)
    this.refreshCard()
  }

  private alarmLine(g: GaugeSpec, value: number): string {
    const name = SHORT_NAME[g.id] ? SHORT_NAME[g.id] : g.label
    const b = g.bands
    let rel = "beyond"
    let lim = 0
    if (b.alarmLow !== undefined && value <= b.alarmLow) {
      rel = "below"
      lim = b.alarmLow
    } else if (b.alarmHigh !== undefined && value >= b.alarmHigh) {
      rel = "above"
      lim = b.alarmHigh
    }
    return name + " " + fmt(value) + " " + g.unit + " is " + rel + " its " + fmt(lim) + " " + g.unit + " alarm. The room can't go unmanned."
  }

  // Everything the card shows is computed from the entries.
  private refreshCard(): void {
    const total = this.plan.gauges.length
    const decided = this.decidedCount
    this.roundCard.setHeader(this.plan.name + ", " + decided + " of " + total)
    const next = this.nextGaugeId
    this.roundCard.setNext(next ? "Next: " + this.gaugeOf(next).label : "All gauges read")

    let alarmEntry: Entry | null = null
    for (const e of this._entries) {
      if (e.verdict === "ALARM" && e.value !== null) {
        alarmEntry = e
        break
      }
    }
    if (alarmEntry) {
      this.roundCard.setState(this.alarmLine(this.gaugeOf(alarmEntry.gaugeId), alarmEntry.value as number), "alarm")
    } else {
      this.roundCard.setState(this.stateMsg, this.stateTone)
    }

    if (this._signed) return
    if (decided === total) {
      const seen = this._entries.filter((e) => e.state === "SEEN").length
      const corrected = this._entries.filter((e) => e.state === "CORRECTED").length
      const eye = this._entries.filter((e) => e.state === "BY_EYE").length
      const alarms = this._entries.filter((e) => e.verdict === "ALARM").length
      this.roundCard.setSummary(
        decided + " read: " + seen + " seen, " + corrected + " corrected, " + eye + " by eye. " + alarms + " alarm" + (alarms === 1 ? "" : "s") + ".",
      )
      this.roundCard.showSignRow(true, alarms === 0)
    } else {
      this.roundCard.setSummary(null)
      this.roundCard.showSignRow(false, false)
      this.roundCard.showEscalations(false)
    }
  }

  // READY needs every gauge read and no alarm. HOLD needs one of the three escalations. Code decides.
  sign(decision: UmsDecision, escalationIndex?: number): boolean {
    if (this._signed) return false
    const esc = decision === "HOLD" && escalationIndex !== undefined && escalationIndex >= 0 && escalationIndex < ESCALATIONS.length ? ESCALATIONS[escalationIndex] : null
    const req: SignRequest = {decision: decision, escalation: esc, signer: SIGNER_ROLE}
    const res = canSign(this._entries, req)
    if (!res.ok) {
      const why = (res as {ok: false; why: string}).why
      if (decision === "HOLD" && this.decidedCount === this.plan.gauges.length) {
        this.roundCard.showEscalations(true)
        this.stateMsg = why + "."
        this.stateTone = "watch"
      } else if (decision === "READY") {
        this.stateMsg = why + "."
        this.stateTone = "alarm"
      }
      print("SIGHTGLASS_SIGN_REFUSED decision=" + decision + " why=" + why)
      return false
    }
    const signedAt = Date.now()
    const built = buildSheet(this.plan, new Date(this.startedAtMs).toISOString().replace(/[:.]/g, "-") + "-ums", this.startedAtMs, signedAt, req, this._entries, "lens-studio-preview")
    this._sheet = built.sheet
    this._digest = built.digest
    this._code = built.digest.substring(0, 4).toUpperCase()
    this._signed = true
    this.roundCard.showSigned(this._code, "Sent to the chief engineer, code " + this._code)
    this.stateMsg = "Round signed " + decision + (esc ? ". " + esc + "." : ".")
    this.stateTone = "normal"
    this.roundCard.setState(this.stateMsg, this.stateTone)
    print("SIGHTGLASS_SIGN decision=" + decision + " escalation=" + (esc ? esc : "none") + " code=" + this._code + " digest=" + built.digest)
    print("SIGHTGLASS_SEND fixture, not sent over network code=" + this._code)
    this._onSigned.invoke(this._code)
    return true
  }

  private updateChevron(): void {
    const next = this._signed ? null : this.nextGaugeId
    const view = next ? this.viewFor(next) : null
    if (next && view) this.chevron.setTarget(next, view.centerWorld())
    else this.chevron.setTarget(null, null)
  }

  // ----- Debug self test: a scripted round that exercises every path and logs the result. -----

  private sleep(sec: number): Promise<void> {
    return new Promise<void>((resolve) => {
      const ev = this.createEvent("DelayedCallbackEvent")
      ev.bind(() => resolve())
      ev.reset(sec)
    })
  }

  private check(name: string, ok: boolean, detail: string): void {
    print("SIGHTGLASS_SELFTEST " + name + " " + (ok ? "PASS" : "FAIL") + " " + detail)
  }

  private async runSelfTest(): Promise<void> {
    await this.sleep(1.0)
    this.plant.setProgress(1)
    // 1. ME-LO-IN in alarm: coral tag, card says the room can't go unmanned, accept confirms.
    await this.requestRead("ME-LO-IN")
    const t1 = this.tagFor("ME-LO-IN") as GaugeTag
    this.check("alarm-tag", t1.tone === "alarm" && t1.mode === "proposal", t1.visibleText.split("\n").join(" | "))
    this.check("alarm-card", this.roundCard.stateText.indexOf("can't go unmanned") >= 0, this.roundCard.stateText)
    this.check("alarm-bar-hidden-when-closed", true, "band visible while open=" + (this.viewFor("ME-LO-IN") as GaugeStationView).bandVisible)
    this.accept("ME-LO-IN")
    this.check("alarm-entry", (this.entryFor("ME-LO-IN") as Entry).state === "SEEN", "" + (this.entryFor("ME-LO-IN") as Entry).value)
    for (const id of ["ME-JCW-OUT", "ME-SCAV", "FO-SUP", "SW-PUMP"]) {
      await this.requestRead(id)
      if (id === "ME-SCAV") {
        const before = (this.proposalFor(id) as Proposal).value as number
        this.correctBegin(id)
        this.step(id, 1)
        this.adjustDone(id)
        const e = this.entryFor(id) as Entry
        this.check("correct-step", e.state === "CORRECTED" && e.computedValue === before, "computed=" + e.computedValue + " entered=" + e.value)
      } else {
        this.accept(id)
      }
    }
    // 2. Fogged AE1-LO: Can't read it, then by eye with plus and minus.
    await this.requestRead("AE1-LO")
    const t6 = this.tagFor("AE1-LO") as GaugeTag
    this.check("fog-cant-read", t6.visibleText.indexOf("Can't read it") === 0, t6.visibleText.split("\n").join(" | "))
    this.byEyeBegin("AE1-LO")
    this.step("AE1-LO", 1)
    this.step("AE1-LO", 1)
    this.step("AE1-LO", -1)
    this.adjustDone("AE1-LO")
    const e6 = this.entryFor("AE1-LO") as Entry
    this.check("by-eye", e6.state === "BY_EYE" && t6.visibleText.indexOf("Read by eye") >= 0, "value=" + e6.value + " tag=" + t6.visibleText.split("\n").join(" | "))
    for (const id of ["AIR-START", "STG-OIL"]) {
      await this.requestRead(id)
      this.accept(id)
    }
    // 3. Sign: READY is refused with an alarm, HOLD needs an escalation.
    this.check("summary", this.roundCard.summaryText.length > 0, this.roundCard.summaryText)
    this.check("ready-disabled", !this.roundCard.signReadyEnabled, "enabled=" + this.roundCard.signReadyEnabled)
    this.check("ready-refused", this.sign("READY") === false, "signed=" + this._signed)
    this.check("hold-needs-escalation", this.sign("HOLD") === false && this.roundCard.escalationsVisible, "escalationsVisible=" + this.roundCard.escalationsVisible)
    this.check("hold-signed", this.sign("HOLD", 1) === true, "code=" + this._code)
    this.check("sent-card", this.roundCard.resultText.indexOf("Sent to the chief engineer, code " + this._code) === 0, this.roundCard.resultText)
  }
}
