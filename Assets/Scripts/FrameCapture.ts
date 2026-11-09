// FrameCapture.ts
// Owns: the single requestCamera() call, the composite crop and the JPEG for one dial.
// The composite is the scene Render Target (camera feed plus everything the scene camera draws), so
// whatever the engineer sees is what the reader gets. The crop is the dial's projected rim plus padding.
// Expects @inputs: cropTexture (ScreenCropTexture asset), sceneRenderTarget, mainCamera, overlayRoots.
// Must not: read the plant, decide values, or call the model.

import {GaugeStationView} from "./GaugeStationView"

export interface Capture {
  ok: boolean
  why: string
  gaugeId: string
  jpegB64: string
  w: number
  h: number
  frameRef: string
  overlayHiddenFrame: boolean
  ms: number
  bytes: number
  stretchX: number
}

const FACE_RADIUS_CM = 7.5

@component
export class FrameCapture extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">FrameCapture: composite crop of one dial</span>')
  @ui.separator
  @ui.group_start("References")
  @input
  @hint("Screen crop texture asset. Its input is set to the scene render target.")
  cropTexture!: Texture

  @input
  @hint("Render target the main camera draws into (camera feed plus virtual scene).")
  sceneRenderTarget!: Texture

  @input
  @hint("Main camera. Used to project the dial rim to screen space.")
  mainCamera!: Camera

  @input
  @hint("Everything that is overlay: tags, round card, chevron. Disabled for the capture frame.")
  overlayRoots: SceneObject[] = []
  @ui.group_end

  @ui.group_start("Settings")
  @input
  @hint("Padding around the projected rim, in percent of the rim size.")
  @widget(new SliderWidget(0, 40, 1))
  paddingPct: number = 15

  @input
  @hint("Smallest crop edge in pixels. Smaller crops are refused as too far away.")
  @widget(new SliderWidget(32, 400, 8))
  minCropPx: number = 96

  @input
  @hint("Evidence: print the JPEG of the first N captures to the log as SIGHTGLASS_B64 lines.")
  @widget(new SliderWidget(0, 20, 1))
  dumpFirst: number = 0
  @ui.group_end

  private cameraModule: CameraModule = require("LensStudio:CameraModule")
  private camTex: Texture | null = null
  private updates: number = 0
  private frames: {[ref: string]: string} = {}
  private order: string[] = []
  private counter: number = 0
  private busy: boolean = false
  // What the overlay looked like at the moment the JPEG was taken, for the overlay-hidden scenario.
  lastOverlayAtEncode: {roots: boolean[]; bands: boolean[]} | null = null

  onAwake() {
    this.createEvent("OnStartEvent").bind(() => this.start())
    this.createEvent("UpdateEvent").bind(() => {
      this.updates += 1
    })
  }

  private start(): void {
    // The only requestCamera call in the project. It keeps the camera awake; the crop reads the composite.
    const req = CameraModule.createCameraRequest()
    req.cameraId = CameraModule.CameraId.Default_Color
    this.camTex = this.cameraModule.requestCamera(req)
    const provider = this.camTex.control as CameraTextureProvider
    provider.onNewFrame.add(() => {})
    const crop = this.cropTexture.control as RectCropTextureProvider
    crop.inputTexture = this.sceneRenderTarget
    print("SIGHTGLASS_CAPTURE_READY rt=" + this.sceneRenderTarget.getWidth() + "x" + this.sceneRenderTarget.getHeight() + " camAspect=" + this.mainCamera.aspect + " fov=" + this.mainCamera.fov + " stretchX=" + this.stretchX().toFixed(3))
  }

  // Horizontal squash of the composite: render target aspect over the camera projection aspect.
  // 1 means pixels are square in the world. The reader's x coordinates are divided by this before readDial.
  stretchX(): number {
    const rtAspect = this.sceneRenderTarget.getWidth() / this.sceneRenderTarget.getHeight()
    return rtAspect / this.mainCamera.aspect
  }

  get frameCount(): number {
    return this.order.length
  }

  frameB64(ref: string): string | null {
    return this.frames[ref] !== undefined ? this.frames[ref] : null
  }

  private waitUpdates(n: number): Promise<void> {
    return new Promise<void>((resolve) => {
      const target = this.updates + n
      const ev = this.createEvent("UpdateEvent")
      ev.bind(() => {
        if (this.updates >= target) {
          ev.enabled = false
          resolve()
        }
      })
    })
  }

  private fail(gaugeId: string, why: string): Capture {
    return {ok: false, why: why, gaugeId: gaugeId, jpegB64: "", w: 0, h: 0, frameRef: "", overlayHiddenFrame: false, ms: 0, bytes: 0, stretchX: 1}
  }

  // Screen-space box (0..1, y down) of the dial rim, or null if any part is behind the camera.
  private rimBox(view: GaugeStationView): {minX: number; maxX: number; minY: number; maxY: number} | null {
    const world = view.sceneObject.getTransform().getWorldTransform()
    const inv = this.mainCamera.getTransform().getInvertedWorldTransform()
    let minX = 9
    let maxX = -9
    let minY = 9
    let maxY = -9
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2
      const p = world.multiplyPoint(new vec3(FACE_RADIUS_CM * Math.cos(a), FACE_RADIUS_CM * Math.sin(a), 0))
      if (inv.multiplyPoint(p).z >= 0) return null
      const s = this.mainCamera.worldSpaceToScreenSpace(p)
      minX = Math.min(minX, s.x)
      maxX = Math.max(maxX, s.x)
      minY = Math.min(minY, s.y)
      maxY = Math.max(maxY, s.y)
    }
    return {minX: minX, maxX: maxX, minY: minY, maxY: maxY}
  }

  // Can the whole dial (with padding) be captured from here? Used by drivers that wait for the view.
  dialInView(gaugeId: string): boolean {
    const view = GaugeStationView.byId[gaugeId]
    return !!view && this.cropFor(view) !== null
  }

  private cropFor(view: GaugeStationView): {left: number; right: number; top: number; bottom: number; px: number} | null {
    const box = this.rimBox(view)
    if (!box) return null
    const rtW = this.sceneRenderTarget.getWidth()
    const rtH = this.sceneRenderTarget.getHeight()
    const cx = (box.minX + box.maxX) / 2
    const cy = (box.minY + box.maxY) / 2
    const wPx = (box.maxX - box.minX) * rtW
    const hPx = (box.maxY - box.minY) * rtH
    const half = (Math.max(wPx, hPx) * (1 + this.paddingPct / 100)) / 2
    const x0 = cx - half / rtW
    const x1 = cx + half / rtW
    const y0 = cy - half / rtH
    const y1 = cy + half / rtH
    if (x0 < 0 || x1 > 1 || y0 < 0 || y1 > 1) return null
    if (half * 2 < this.minCropPx) return null
    return {left: 2 * x0 - 1, right: 2 * x1 - 1, top: 1 - 2 * y0, bottom: 1 - 2 * y1, px: Math.round(half * 2)}
  }

  private setOverlay(on: boolean, saved: boolean[], bands: boolean[], ids: string[]): void {
    for (let i = 0; i < this.overlayRoots.length; i++) {
      const o = this.overlayRoots[i]
      if (!o) continue
      o.enabled = on ? saved[i] : false
    }
    for (let i = 0; i < ids.length; i++) {
      const v = GaugeStationView.byId[ids[i]]
      if (v) v.setBandVisible(on ? bands[i] : false)
    }
  }

  // Capture one dial. hideOverlay true is the normal path: overlay off for the capture frame, back on after.
  async capture(gaugeId: string, hideOverlay: boolean): Promise<Capture> {
    if (this.busy) return this.fail(gaugeId, "capture busy")
    const view = GaugeStationView.byId[gaugeId]
    if (!view) return this.fail(gaugeId, "unknown gauge")
    const rect = this.cropFor(view)
    if (!rect) return this.fail(gaugeId, "dial not fully in view or too small")
    this.busy = true
    const t0 = getTime()
    const saved = this.overlayRoots.map((o) => (o ? o.enabled : false))
    const ids = Object.keys(GaugeStationView.byId)
    const bands = ids.map((id) => GaugeStationView.byId[id].bandVisible)
    try {
      const crop = this.cropTexture.control as RectCropTextureProvider
      crop.inputTexture = this.sceneRenderTarget
      crop.cropRect.left = rect.left
      crop.cropRect.right = rect.right
      crop.cropRect.top = rect.top
      crop.cropRect.bottom = rect.bottom
      if (hideOverlay) this.setOverlay(false, saved, bands, ids)
      await this.waitUpdates(4)
      this.lastOverlayAtEncode = {
        roots: this.overlayRoots.map((o) => (o ? o.enabled : false)),
        bands: ids.map((id) => GaugeStationView.byId[id].bandVisible),
      }
      const b64: string = await new Promise<string>((resolve, reject) => {
        Base64.encodeTextureAsync(this.cropTexture, (s) => resolve(s), () => reject("encode failed"), CompressionQuality.HighQuality, EncodingType.Jpg)
      })
      if (hideOverlay) this.setOverlay(true, saved, bands, ids)
      const w = this.cropTexture.getWidth()
      const h = this.cropTexture.getHeight()
      this.counter += 1
      const ref = "F" + this.counter + "-" + gaugeId
      this.frames[ref] = b64
      this.order.push(ref)
      while (this.order.length > 8) {
        const old = this.order.shift() as string
        delete this.frames[old]
      }
      const bytes = (Base64.decode(b64) as unknown as Uint8Array).length
      const ms = Math.round((getTime() - t0) * 1000)
      print("SIGHTGLASS_CAPTURE gauge=" + gaugeId + " crop=" + w + "x" + h + " bytes=" + bytes + " overlayHidden=" + hideOverlay + " ms=" + ms)
      if (this.counter <= this.dumpFirst) print("SIGHTGLASS_B64 ref=" + ref + " overlayHidden=" + hideOverlay + " b64=" + b64)
      this.busy = false
      return {ok: true, why: "", gaugeId: gaugeId, jpegB64: b64, w: w, h: h, frameRef: ref, overlayHiddenFrame: hideOverlay, ms: ms, bytes: bytes, stretchX: this.stretchX()}
    } catch (e) {
      if (hideOverlay) this.setOverlay(true, saved, bands, ids)
      this.busy = false
      return this.fail(gaugeId, "capture failed: " + String(e))
    }
  }
}
