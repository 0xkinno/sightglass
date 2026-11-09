// StationPanel.ts
// Owns: the stand-in machinery panel behind a station's dials, and its label.
// Expects @inputs: material (vertex colour), label, widthCm, heightCm.
// Must not: hold readings. It is labelled as a stand-in so nobody mistakes it for a real engine room.

import {MeshAcc, childObject, Rgba} from "./SightglassMesh"

const PANEL_COLOR: Rgba = [0.34, 0.42, 0.5, 1]
const EDGE_COLOR: Rgba = [0.55, 0.65, 0.74, 1]

@component
export class StationPanel extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">StationPanel: stand-in panel</span>')
  @ui.separator
  @ui.group_start("References")
  @input
  @hint("Vertex colour material used for the panel plate.")
  material!: Material
  @ui.group_end

  @ui.group_start("Settings")
  @input
  @hint("Station name printed on the panel.")
  label: string = "Station"

  @input
  @hint("Panel width in centimetres.")
  @widget(new SliderWidget(40, 160, 5))
  widthCm: number = 120

  @input
  @hint("Panel height in centimetres.")
  @widget(new SliderWidget(30, 100, 2))
  heightCm: number = 56

  @input
  @hint("Panel centre height above the floor, in centimetres. Dials sit at the same height.")
  @widget(new SliderWidget(80, 200, 5))
  centreHeightCm: number = 140
  @ui.group_end

  onAwake() {
    const art = childObject(this.sceneObject, "PanelArt", new vec3(0, this.centreHeightCm, -1.5))
    art.createComponent("Component.Canvas")

    const plate = childObject(art, "Plate")
    const pm = new MeshAcc()
    pm.rect(0, 0, this.widthCm, this.heightCm, PANEL_COLOR)
    pm.attach(plate, this.material)

    const edge = childObject(art, "Edge", new vec3(0, 0, 0.1))
    const em = new MeshAcc()
    const t = 0.8
    em.rect(0, this.heightCm / 2 - t / 2, this.widthCm, t, EDGE_COLOR)
    em.rect(0, -this.heightCm / 2 + t / 2, this.widthCm, t, EDGE_COLOR)
    em.rect(-this.widthCm / 2 + t / 2, 0, t, this.heightCm, EDGE_COLOR)
    em.rect(this.widthCm / 2 - t / 2, 0, t, this.heightCm, EDGE_COLOR)
    em.attach(edge, this.material)

    const title = childObject(art, "Label", new vec3(0, this.heightCm / 2 - 3.4, 0.4))
    const tx = title.createComponent("Component.Text") as Text
    tx.text = this.label + " (stand-in)"
    tx.size = 58
    tx.depthTest = true
    tx.horizontalAlignment = HorizontalAlignment.Center
    tx.verticalAlignment = VerticalAlignment.Center
    tx.horizontalOverflow = HorizontalOverflow.Overflow
    tx.verticalOverflow = VerticalOverflow.Overflow
    tx.layoutRect = Rect.create(-this.widthCm / 2 + 2, this.widthCm / 2 - 2, -1.5, 1.5)
    tx.textFill.color = new vec4(0.95, 0.97, 1, 1)
  }
}
