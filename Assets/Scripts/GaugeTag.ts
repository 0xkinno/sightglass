// GaugeTag.ts
// Owns: the UI Kit reading tag anchored beside one dial: an idle dot you pinch to read, then a 9 x 5 cm plate
// with the value or state, and a decision bar of large buttons under it.
// Expects @inputs: gaugeId, material (vertex colour, for the tone strip).
// Must not: hold reading state or make decisions. SightglassMain tells it what to show through show(...)
// and listens to onAction. It is a passive view.

import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {BackPlate} from "SpectaclesUIKit 2.lspkg/Scripts/BackPlate"
import {Button} from "SpectaclesUIKit 2.lspkg/Scripts/Components/Button/Button"
import {RoundButton} from "SpectaclesUIKit 2.lspkg/Scripts/Components/Button/RoundButton"
import {FlexLayout} from "SpectaclesUIKit 2.lspkg/Scripts/Components/Layout2D/Flex/FlexLayout"
import {FlexItem} from "SpectaclesUIKit 2.lspkg/Scripts/Components/Layout2D/Flex/FlexItem"
import {FlexAlign, FlexDirection, FlexJustify} from "SpectaclesUIKit 2.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {MeshAcc, childObject, PALETTE, Rgba, toVec4} from "./SightglassMesh"

export type TagMode = "idle" | "reading" | "proposal" | "cant" | "adjust" | "decided"
export type TagTone = "neutral" | "normal" | "watch" | "alarm"
export type TagAction =
  | "READ"
  | "ACCEPT"
  | "CORRECT"
  | "BY_EYE"
  | "PLUS"
  | "MINUS"
  | "DONE"
  | "RECHECK"
  | "RETRY"

const ACTION_LABEL: {[k: string]: string} = {
  READ: "Read",
  ACCEPT: "Accept",
  CORRECT: "Correct",
  BY_EYE: "By eye",
  PLUS: "+",
  MINUS: "-",
  DONE: "Done",
  RECHECK: "Recheck",
  RETRY: "Retry",
}

// Text roles calibrated for 110 cm; the tag is read from about 140 cm.
const READ_DISTANCE_CM = 140
const BUTTON_Z = 0.08
const TONE_COLOR: {[k: string]: Rgba} = {
  neutral: PALETTE.neutral,
  normal: PALETTE.mint,
  watch: PALETTE.amber,
  alarm: PALETTE.coral,
}

function roleSize(base: number): number {
  return base * (READ_DISTANCE_CM / 110)
}

interface Slot {
  obj: SceneObject
  btn: Button
  label: Text
  action: TagAction | null
}

@component
export class GaugeTag extends BaseScriptComponent {
  static byId: {[id: string]: GaugeTag} = {}

  @ui.label('<span style="color: #60A5FA;">GaugeTag: reading tag and decision bar</span>')
  @ui.separator
  @ui.group_start("References")
  @input
  @hint("Round card gauge id this tag belongs to.")
  gaugeId: string = ""

  @input
  @hint("Vertex colour material for the tone strip on the plate.")
  material!: Material
  @ui.group_end

  @ui.group_start("Settings")
  @input
  @hint("Tag plate width in centimetres.")
  @widget(new SliderWidget(7, 14, 0.5))
  plateWidthCm: number = 9

  @input
  @hint("Tag plate height in centimetres.")
  @widget(new SliderWidget(4, 8, 0.5))
  plateHeightCm: number = 5

  @input
  @hint("Width of each decision button in centimetres. Targets must stay at least 4 cm.")
  @widget(new SliderWidget(4, 8, 0.2))
  buttonWidthCm: number = 4.8

  @input
  @hint("Height of each decision button in centimetres.")
  @widget(new SliderWidget(4, 6, 0.2))
  buttonHeightCm: number = 4.2

  @input
  @hint("Diameter of the idle dot you pinch to read, in centimetres.")
  @widget(new SliderWidget(2, 6, 0.5))
  dotDiameterCm: number = 4
  @ui.group_end

  private _onAction = new Event<TagAction>()
  get onAction(): PublicApi<TagAction> {
    return this._onAction.publicApi()
  }

  private dotObj!: SceneObject
  private plateObj!: SceneObject
  private barObj!: SceneObject
  private barFlex!: FlexLayout
  private headText!: Text
  private detailText!: Text
  private toneObj!: SceneObject
  private slots: Slot[] = []
  private _mode: TagMode = "idle"
  private _tone: TagTone = "neutral"
  private _head: string = ""
  private _detail: string = ""
  private _actions: TagAction[] = []
  private ready: boolean = false

  // State readers for tests and for SightglassMain.
  get mode(): TagMode {
    return this._mode
  }
  get tone(): TagTone {
    return this._tone
  }
  get headlineText(): string {
    return this._head
  }
  get detailLine(): string {
    return this._detail
  }
  // The text a person reads on the tag: headline then detail.
  get visibleText(): string {
    return this._mode === "idle" ? "" : this._detail.length > 0 ? this._head + "\n" + this._detail : this._head
  }
  get buttons(): TagAction[] {
    return this._actions.slice()
  }
  get dotVisible(): boolean {
    return this._mode === "idle"
  }
  get isOpen(): boolean {
    return this._mode === "reading" || this._mode === "proposal" || this._mode === "cant" || this._mode === "adjust"
  }

  onAwake() {
    GaugeTag.byId[this.gaugeId] = this
    this.sceneObject.createComponent("Component.Canvas")
    this.buildDot()
    this.buildPlate()
    this.buildBar()
    this.ready = true
    this.show("idle", "", "", "neutral", [])
  }

  // Idle: dot only. Anything else: plate with text, plus the buttons that apply.
  show(mode: TagMode, head: string, detail: string, tone: TagTone, actions: TagAction[]): void {
    this._mode = mode
    this._head = head
    this._detail = detail
    this._tone = tone
    this._actions = actions.slice(0, this.slots.length)
    if (!this.ready) return
    this.dotObj.enabled = mode === "idle"
    this.plateObj.enabled = mode !== "idle"
    this.barObj.enabled = mode !== "idle" && this._actions.length > 0
    if (mode === "idle") return

    const col = toVec4(TONE_COLOR[tone])
    this.headText.text = head
    this.headText.size = roleSize(head.length > 8 ? 39 : 48)
    this.headText.textFill.color = col
    this.detailText.text = detail
    this.detailText.textFill.color = col
    this.toneObj.enabled = tone !== "neutral"
    this.paintTone(TONE_COLOR[tone])

    for (let i = 0; i < this.slots.length; i++) {
      const s = this.slots[i]
      const a = i < this._actions.length ? this._actions[i] : null
      s.action = a
      s.obj.enabled = a !== null
      if (a !== null) s.label.text = ACTION_LABEL[a]
    }
    this.barFlex.refreshChildren()
  }

  // Same as pressing the button with this action. Returns false if the tag is not offering it.
  press(action: TagAction): boolean {
    if (action === "READ") {
      if (this._mode !== "idle") return false
    } else if (this._actions.indexOf(action) < 0) {
      return false
    }
    this._onAction.invoke(action)
    return true
  }

  private buildDot(): void {
    this.dotObj = childObject(this.sceneObject, "Dot")
    const dot = this.dotObj.createComponent(RoundButton.getTypeName()) as RoundButton
    dot.onInitialized.add(() => {
      dot.size = new vec3(this.dotDiameterCm, this.dotDiameterCm, 1)
    })
    dot.onTriggerUp.add(() => this.press("READ"))
  }

  private buildPlate(): void {
    this.plateObj = childObject(this.sceneObject, "Plate")
    const plate = this.plateObj.createComponent(BackPlate.getTypeName()) as BackPlate
    plate.size = new vec2(this.plateWidthCm, this.plateHeightCm)
    plate.onInitialized.add(() => {
      // Light translucent plate: the stock plates are dark, which reads as transparent on the additive display.
      plate.style = "simple"
      ;(plate as any).roundedRectangle.backgroundColor = new vec4(0.5, 0.58, 0.68, 0.55)
    })

    // Tone strip along the top of the plate: mint, amber or coral by verdict.
    this.toneObj = childObject(this.plateObj, "ToneStrip", new vec3(0, this.plateHeightCm / 2 - 0.25, 0.3))
    this.paintTone(PALETTE.mint)

    const content = childObject(this.plateObj, "Content", new vec3(0, 0, 0.6))
    const flex = content.createComponent(FlexLayout.getTypeName()) as FlexLayout
    flex.onInitialized.add(() => {
      flex.width = this.plateWidthCm
      flex.height = this.plateHeightCm
      flex.direction = FlexDirection.Column
      flex.justifyContent = FlexJustify.Center
      flex.alignItems = FlexAlign.Center
      flex.rowGap = 0.2
      flex.paddingLeft = 0.4
      flex.paddingRight = 0.4
      flex.paddingTop = 0.5
      flex.paddingBottom = 0.3
    })

    const innerW = this.plateWidthCm - 0.8
    this.headText = this.makeText(content, "Head", innerW, 1.8)
    this.detailText = this.makeText(content, "Detail", innerW, 2.1)
    this.detailText.size = roleSize(38)
  }

  private paintTone(c: Rgba): void {
    if (!this.toneObj) return
    const old = this.toneObj.getComponent("Component.RenderMeshVisual") as RenderMeshVisual | null
    if (old) old.destroy()
    const m = new MeshAcc()
    m.rect(0, 0, this.plateWidthCm - 1.2, 0.3, c)
    m.attach(this.toneObj, this.material)
  }

  private makeText(parent: SceneObject, name: string, w: number, h: number): Text {
    const so = childObject(parent, name)
    const t = so.createComponent("Component.Text") as Text
    t.text = ""
    t.depthTest = true
    t.size = roleSize(48)
    t.horizontalAlignment = HorizontalAlignment.Center
    t.verticalAlignment = VerticalAlignment.Center
    t.horizontalOverflow = HorizontalOverflow.Overflow
    t.verticalOverflow = VerticalOverflow.Overflow
    t.layoutRect = Rect.create(-w / 2, w / 2, -h / 2, h / 2)
    so.createComponent(FlexItem.getTypeName())
    return t
  }

  // Decision bar under the plate, left aligned with it, three button slots in a row.
  private buildBar(): void {
    const n = 3
    const gap = 0.4
    const barW = n * this.buttonWidthCm + (n - 1) * gap
    this.barObj = childObject(
      this.sceneObject,
      "DecisionBar",
      new vec3(-this.plateWidthCm / 2 + barW / 2, -(this.plateHeightCm / 2 + 0.5 + this.buttonHeightCm / 2), 0.6),
    )
    this.barFlex = this.barObj.createComponent(FlexLayout.getTypeName()) as FlexLayout
    const flex = this.barFlex
    flex.onInitialized.add(() => {
      flex.width = barW
      flex.height = this.buttonHeightCm
      flex.direction = FlexDirection.Row
      flex.justifyContent = FlexJustify.Start
      flex.alignItems = FlexAlign.Center
      flex.columnGap = gap
    })

    for (let i = 0; i < n; i++) {
      const so = childObject(this.barObj, "Slot" + i)
      const btn = so.createComponent(Button.getTypeName()) as Button
      btn.onInitialized.add(() => {
        btn.size = new vec3(this.buttonWidthCm, this.buttonHeightCm, 1)
      })
      const item = so.createComponent(FlexItem.getTypeName()) as FlexItem
      item.overrideWidth = this.buttonWidthCm
      item.overrideHeight = this.buttonHeightCm

      const lo = childObject(so, "Label", new vec3(0, 0, BUTTON_Z))
      const t = lo.createComponent("Component.Text") as Text
      t.text = ""
      t.depthTest = true
      t.size = roleSize(39)
      t.horizontalAlignment = HorizontalAlignment.Center
      t.verticalAlignment = VerticalAlignment.Center
      t.horizontalOverflow = HorizontalOverflow.Overflow
      t.verticalOverflow = VerticalOverflow.Overflow
      t.layoutRect = Rect.create(-this.buttonWidthCm / 2 + 0.2, this.buttonWidthCm / 2 - 0.2, -1.2, 1.2)

      const slot: Slot = {obj: so, btn: btn, label: t, action: null}
      this.slots.push(slot)
      btn.onTriggerUp.add(() => {
        if (slot.action !== null) this.press(slot.action)
      })
    }
  }
}
