// RoundCard.ts
// Owns: the UI Kit round card. Low left of view, 0.8 m away, 20 cm below the eye line, with a lazy follow.
// It shows 'Evening round before UMS, n of 8', the next gauge, one state line, then at the end the summary,
// the Sign READY and Sign HOLD buttons, the three HOLD escalations, and the sent code.
// Expects @inputs: offsetRightCm, offsetDownCm, distanceCm, followSpeed.
// Must not: decide anything. SightglassMain pushes text and enabled flags in and listens to the events.

import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"
import {BackPlate} from "SpectaclesUIKit.lspkg/Scripts/BackPlate"
import {Button} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/Button"
import {FlexLayout} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexLayout"
import {FlexItem} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexItem"
import {FlexAlign, FlexDirection, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {ESCALATIONS} from "./Core/EvidenceGate"
import {childObject, PALETTE, Rgba, toVec4} from "./SightglassMesh"

export type CardTone = "neutral" | "normal" | "watch" | "alarm"

const CARD_DISTANCE_CM = 80
const BUTTON_Z = 0.08
const TONE_COLOR: {[k: string]: Rgba} = {
  neutral: PALETTE.neutral,
  normal: PALETTE.mint,
  watch: PALETTE.amber,
  alarm: PALETTE.coral,
}

function sz(base: number): number {
  return base * (CARD_DISTANCE_CM / 110)
}

@component
export class RoundCard extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">RoundCard: round progress, summary and sign</span>')
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("How far to the left of the eye line the card sits, in centimetres.")
  @widget(new SliderWidget(0, 40, 1))
  offsetLeftCm: number = 12

  @input
  @hint("How far below the eye line the card sits, in centimetres.")
  @widget(new SliderWidget(0, 40, 1))
  offsetDownCm: number = 34

  @input
  @hint("Distance in front of the eyes, in centimetres. 80 is 0.8 m.")
  @widget(new SliderWidget(50, 120, 5))
  distanceCm: number = 80

  @input
  @hint("How quickly the card catches up with your head. Lower is lazier.")
  @widget(new SliderWidget(0.5, 8, 0.5))
  followSpeed: number = 2.5

  @input
  @hint("Card width in centimetres.")
  @widget(new SliderWidget(16, 34, 1))
  widthCm: number = 24
  @ui.group_end

  private _onSignReady = new Event<void>()
  private _onSignHold = new Event<void>()
  private _onEscalation = new Event<number>()
  get onSignReady(): PublicApi<void> {
    return this._onSignReady.publicApi()
  }
  get onSignHold(): PublicApi<void> {
    return this._onSignHold.publicApi()
  }
  get onEscalation(): PublicApi<number> {
    return this._onEscalation.publicApi()
  }

  private headerT!: Text
  private nextT!: Text
  private stateT!: Text
  private summaryT!: Text
  private resultT!: Text
  private signRow!: SceneObject
  private escGroup!: SceneObject
  private flex!: FlexLayout
  private readyBtn!: Button
  private holdBtn!: Button
  private readyLabel!: Text
  private holdLabel!: Text
  private _signReadyEnabled: boolean = false
  private _signHoldEnabled: boolean = false
  private _signRowVisible: boolean = false
  private _escVisible: boolean = false
  private placed: boolean = false

  get headerText(): string {
    return this.headerT.text
  }
  get nextText(): string {
    return this.nextT.text
  }
  get stateText(): string {
    return this.stateT.text
  }
  get summaryText(): string {
    return this.summaryT.text
  }
  get resultText(): string {
    return this.resultT.text
  }
  get signReadyEnabled(): boolean {
    return this._signRowVisible && this._signReadyEnabled
  }
  get signHoldEnabled(): boolean {
    return this._signRowVisible && this._signHoldEnabled
  }
  get signRowVisible(): boolean {
    return this._signRowVisible
  }
  get escalationsVisible(): boolean {
    return this._escVisible
  }

  onAwake() {
    this.sceneObject.createComponent("Component.Canvas")
    const plate = this.sceneObject.createComponent(BackPlate.getTypeName()) as BackPlate
    plate.size = new vec2(this.widthCm, 10)
    plate.onInitialized.add(() => {
      // Light translucent plate: the stock plates are dark, which reads as transparent on the additive display.
      plate.style = "simple"
      ;(plate as any).roundedRectangle.backgroundColor = new vec4(0.5, 0.58, 0.68, 0.55)
    })

    const content = childObject(this.sceneObject, "Content", new vec3(0, 0, 0.6))
    this.flex = content.createComponent(FlexLayout.getTypeName()) as FlexLayout
    const flex = this.flex
    flex.onInitialized.add(() => {
      flex.width = this.widthCm
      flex.height = -1
      flex.direction = FlexDirection.Column
      flex.justifyContent = FlexJustify.Start
      flex.alignItems = FlexAlign.Center
      flex.rowGap = 0.7
      flex.paddingTop = 1.2
      flex.paddingBottom = 1.2
      flex.paddingLeft = 1.2
      flex.paddingRight = 1.2
    })
    flex.onLayoutComplete.add((r) => {
      plate.size = new vec2(r.containerWidth, r.containerHeight)
    })

    const innerW = this.widthCm - 2.4
    this.headerT = this.addText(content, "Header", innerW, 1.8, 41, false)
    this.nextT = this.addText(content, "Next", innerW, 1.5, 38, false)
    this.stateT = this.addText(content, "State", innerW, 3.4, 39, true)
    this.summaryT = this.addText(content, "Summary", innerW, 1.8, 41, true)
    this.summaryT.sceneObject.enabled = false

    this.signRow = this.addRow(content, "SignRow", innerW, 3.8)
    const bw = (innerW - 0.8) / 2
    const ready = this.addButton(this.signRow, "Sign READY", bw, 3.6, () => this.pressSignReady())
    this.readyBtn = ready.btn
    this.readyLabel = ready.label
    const hold = this.addButton(this.signRow, "Sign HOLD", bw, 3.6, () => this.pressSignHold())
    this.holdBtn = hold.btn
    this.holdLabel = hold.label
    this.signRow.enabled = false

    this.escGroup = this.addColumn(content, "Escalations", innerW)
    for (let i = 0; i < ESCALATIONS.length; i++) {
      const idx = i
      this.addButton(this.escGroup, ESCALATIONS[i], innerW, 3.4, () => this.pressEscalation(idx))
    }
    this.escGroup.enabled = false

    this.resultT = this.addText(content, "Result", innerW, 3.0, 41, true)
    this.resultT.sceneObject.enabled = false

    this.headerT.text = ""
    this.createEvent("LateUpdateEvent").bind(() => this.follow())
  }

  // Text and state pushed in by SightglassMain.
  setHeader(text: string): void {
    this.headerT.text = text
  }

  setNext(text: string): void {
    this.nextT.text = text
  }

  setState(text: string, tone: CardTone): void {
    this.stateT.text = text
    this.stateT.textFill.color = toVec4(TONE_COLOR[tone])
  }

  setSummary(text: string | null): void {
    this.summaryT.sceneObject.enabled = text !== null
    this.summaryT.text = text === null ? "" : text
    this.flex.refreshChildren()
  }

  // The sign row appears once every gauge is in a state. READY is disabled while any alarm stands.
  showSignRow(visible: boolean, readyEnabled: boolean): void {
    this._signRowVisible = visible
    this._signReadyEnabled = readyEnabled
    this._signHoldEnabled = visible
    this.signRow.enabled = visible
    this.readyBtn.inactive = !readyEnabled
    this.readyLabel.textFill.color = new vec4(1, 1, 1, readyEnabled ? 1 : 0.35)
    this.holdBtn.inactive = !visible
    this.flex.refreshChildren()
  }

  showEscalations(visible: boolean): void {
    this._escVisible = visible
    this.escGroup.enabled = visible
    this.flex.refreshChildren()
  }

  showSigned(code: string, line: string): void {
    this.signRow.enabled = false
    this.escGroup.enabled = false
    this._signRowVisible = false
    this._escVisible = false
    this.resultT.sceneObject.enabled = true
    this.resultT.text = line
    this.resultT.textFill.color = toVec4(PALETTE.mint)
    this.flex.refreshChildren()
  }

  // Same as pressing the button.
  pressSignReady(): boolean {
    if (!this.signReadyEnabled) return false
    this._onSignReady.invoke()
    return true
  }

  pressSignHold(): boolean {
    if (!this.signHoldEnabled) return false
    this._onSignHold.invoke()
    return true
  }

  pressEscalation(i: number): boolean {
    if (!this._escVisible || i < 0 || i >= ESCALATIONS.length) return false
    this._onEscalation.invoke(i)
    return true
  }

  private addText(parent: SceneObject, name: string, w: number, h: number, base: number, wrap: boolean): Text {
    const so = childObject(parent, name)
    const t = so.createComponent("Component.Text") as Text
    t.text = ""
    t.depthTest = true
    t.size = sz(base)
    t.horizontalAlignment = HorizontalAlignment.Center
    t.verticalAlignment = VerticalAlignment.Center
    t.horizontalOverflow = wrap ? HorizontalOverflow.Wrap : HorizontalOverflow.Overflow
    t.verticalOverflow = VerticalOverflow.Overflow
    t.layoutRect = Rect.create(-w / 2, w / 2, -h / 2, h / 2)
    so.createComponent(FlexItem.getTypeName())
    return t
  }

  private addRow(parent: SceneObject, name: string, w: number, h: number): SceneObject {
    const so = childObject(parent, name)
    const f = so.createComponent(FlexLayout.getTypeName()) as FlexLayout
    f.onInitialized.add(() => {
      f.width = w
      f.height = h
      f.direction = FlexDirection.Row
      f.justifyContent = FlexJustify.Center
      f.alignItems = FlexAlign.Center
      f.columnGap = 0.8
    })
    const item = so.createComponent(FlexItem.getTypeName()) as FlexItem
    item.overrideWidth = w
    item.overrideHeight = h
    return so
  }

  private addColumn(parent: SceneObject, name: string, w: number): SceneObject {
    const so = childObject(parent, name)
    const f = so.createComponent(FlexLayout.getTypeName()) as FlexLayout
    const h = ESCALATIONS.length * 3.4 + (ESCALATIONS.length - 1) * 0.5
    f.onInitialized.add(() => {
      f.width = w
      f.height = h
      f.direction = FlexDirection.Column
      f.justifyContent = FlexJustify.Start
      f.alignItems = FlexAlign.Center
      f.rowGap = 0.5
    })
    const item = so.createComponent(FlexItem.getTypeName()) as FlexItem
    item.overrideWidth = w
    item.overrideHeight = h
    return so
  }

  private addButton(
    parent: SceneObject,
    text: string,
    w: number,
    h: number,
    onPress: () => void,
  ): {btn: Button; label: Text} {
    const so = childObject(parent, "Btn " + text)
    const btn = so.createComponent(Button.getTypeName()) as Button
    btn.onInitialized.add(() => {
      btn.size = new vec3(w, h, 1)
    })
    const item = so.createComponent(FlexItem.getTypeName()) as FlexItem
    item.overrideWidth = w
    item.overrideHeight = h

    const lo = childObject(so, "Label", new vec3(0, 0, BUTTON_Z))
    const t = lo.createComponent("Component.Text") as Text
    t.text = text
    t.depthTest = true
    t.size = sz(39)
    t.horizontalAlignment = HorizontalAlignment.Center
    t.verticalAlignment = VerticalAlignment.Center
    t.horizontalOverflow = HorizontalOverflow.Overflow
    t.verticalOverflow = VerticalOverflow.Overflow
    t.layoutRect = Rect.create(-w / 2 + 0.2, w / 2 - 0.2, -1.2, 1.2)
    btn.onTriggerUp.add(onPress)
    return {btn: btn, label: t}
  }

  // Lazy follow: ease toward a spot low left of the view, then face the head. Never rigidly stuck to it.
  private follow(): void {
    const cam = WorldCameraFinderProvider.getInstance()
    const camPos = cam.getWorldPosition()
    const rot = cam.getTransform().getWorldRotation()
    const target = camPos.add(rot.multiplyVec3(new vec3(-this.offsetLeftCm, -this.offsetDownCm, -this.distanceCm)))
    const tr = this.sceneObject.getTransform()
    let pos = target
    if (this.placed) {
      const k = 1 - Math.exp(-getDeltaTime() * this.followSpeed)
      pos = vec3.lerp(tr.getWorldPosition(), target, k)
    }
    this.placed = true
    tr.setWorldPosition(pos)
    const dx = camPos.x - pos.x
    const dz = camPos.z - pos.z
    tr.setWorldRotation(quat.angleAxis(Math.atan2(dx, dz), vec3.up()))
  }
}
