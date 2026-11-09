// ChevronGuide.ts
// Owns: a small chevron at the edge of the view that points to the next gauge when that gauge is out of view,
// and the soft click from the gauge's direction when it appears.
// Expects @inputs: material (vertex colour), audio, view limits.
// Must not: choose the next gauge. SightglassMain calls setTarget.

import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"
import {MeshAcc, childObject, PALETTE} from "./SightglassMesh"
import {SightglassAudio} from "./SightglassAudio"

@component
export class ChevronGuide extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">ChevronGuide: edge chevron to the next gauge</span>')
  @ui.separator
  @ui.group_start("References")
  @input
  @hint("Vertex colour material for the chevron mesh.")
  material!: Material

  @input
  @hint("Spatial audio cues. The click plays from the direction of the gauge.")
  audio!: SightglassAudio
  @ui.group_end

  @ui.group_start("Settings")
  @input
  @hint("Horizontal half angle of the comfortable view, in degrees. Beyond it the gauge counts as out of view.")
  @widget(new SliderWidget(10, 40, 1))
  viewHalfWidthDeg: number = 22

  @input
  @hint("Vertical half angle of the comfortable view, in degrees.")
  @widget(new SliderWidget(8, 30, 1))
  viewHalfHeightDeg: number = 14

  @input
  @hint("Distance of the chevron in front of the eyes, in centimetres.")
  @widget(new SliderWidget(40, 120, 5))
  distanceCm: number = 80

  @input
  @hint("Chevron size in centimetres.")
  @widget(new SliderWidget(1.5, 6, 0.5))
  sizeCm: number = 3
  @ui.group_end

  private art!: SceneObject
  private target: vec3 | null = null
  private targetId: string | null = null
  private clickedFor: string | null = null
  private _visible: boolean = false

  get visible(): boolean {
    return this._visible
  }
  get pointsAt(): string | null {
    return this._visible ? this.targetId : null
  }

  // id is the gauge the chevron guides to, pos its world centre. Null hides the chevron.
  setTarget(id: string | null, pos: vec3 | null): void {
    this.targetId = id
    this.target = pos
    if (id === null) this.clickedFor = null
  }

  onAwake() {
    this.art = childObject(this.sceneObject, "ChevronArt")
    const m = new MeshAcc()
    const s = this.sizeCm / 2
    m.line(new vec2(-0.4 * s, 1.0 * s), new vec2(0.6 * s, 0), 0.5 * s, PALETTE.amber)
    m.line(new vec2(0.6 * s, 0), new vec2(-0.4 * s, -1.0 * s), 0.5 * s, PALETTE.amber)
    m.attach(this.art, this.material)
    this.art.enabled = false
    this.createEvent("LateUpdateEvent").bind(() => this.update())
  }

  private update(): void {
    if (this.target === null || this.targetId === null) {
      this.setVisible(false)
      return
    }
    const cam = WorldCameraFinderProvider.getInstance()
    const camPos = cam.getWorldPosition()
    const rot = cam.getTransform().getWorldRotation()
    const v = rot.invert().multiplyVec3(this.target.sub(camPos))
    let inView = false
    if (v.z < 0) {
      const yaw = (Math.atan2(v.x, -v.z) * 180) / Math.PI
      const pitch = (Math.atan2(v.y, -v.z) * 180) / Math.PI
      inView = Math.abs(yaw) < this.viewHalfWidthDeg && Math.abs(pitch) < this.viewHalfHeightDeg
    }
    if (inView) {
      this.setVisible(false)
      return
    }
    let dx = v.x
    let dy = v.y
    const len = Math.sqrt(dx * dx + dy * dy)
    if (len < 1e-3) {
      dx = -1
      dy = 0
    } else {
      dx /= len
      dy /= len
    }
    const edgeX = Math.tan((this.viewHalfWidthDeg * Math.PI) / 180) * this.distanceCm * 0.8
    const edgeY = Math.tan((this.viewHalfHeightDeg * Math.PI) / 180) * this.distanceCm * 0.8
    const local = new vec3(dx * edgeX, dy * edgeY, -this.distanceCm)
    const tr = this.art.getTransform()
    tr.setWorldPosition(camPos.add(rot.multiplyVec3(local)))
    tr.setWorldRotation(rot.multiply(quat.angleAxis(Math.atan2(dy, dx), vec3.forward())))
    this.setVisible(true)
    if (this.clickedFor !== this.targetId) {
      this.clickedFor = this.targetId
      const dir = this.target.sub(camPos).normalize()
      this.audio.playClickAt(camPos.add(dir.uniformScale(100)))
    }
  }

  private setVisible(v: boolean): void {
    this._visible = v
    this.art.enabled = v
    if (!v) this.clickedFor = null
  }
}
