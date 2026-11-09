// SightglassMesh.ts
// Owns: small MeshBuilder helpers shared by the dial, panel, tag accent and chevron scripts.
// Expects: a vertex colour material (vertexBaseColorMaterial) passed in by the caller.
// Must not: hold scene state. All shapes lie in the local XY plane and face +Z.

export type Rgba = [number, number, number, number]

export class MeshAcc {
  private verts: number[] = []
  private idx: number[] = []
  private n: number = 0

  private v(x: number, y: number, c: Rgba): void {
    this.verts.push(x, y, 0, 0, 0, 1, c[0], c[1], c[2], c[3])
    this.n += 1
  }

  // Counter clockwise as seen from +Z: p0 bottom left, p1 bottom right, p2 top right, p3 top left.
  quad(p0: vec2, p1: vec2, p2: vec2, p3: vec2, c: Rgba): void {
    const b = this.n
    this.v(p0.x, p0.y, c)
    this.v(p1.x, p1.y, c)
    this.v(p2.x, p2.y, c)
    this.v(p3.x, p3.y, c)
    this.idx.push(b, b + 1, b + 2, b, b + 2, b + 3)
  }

  rect(cx: number, cy: number, w: number, h: number, c: Rgba): void {
    const x0 = cx - w / 2
    const x1 = cx + w / 2
    const y0 = cy - h / 2
    const y1 = cy + h / 2
    this.quad(new vec2(x0, y0), new vec2(x1, y0), new vec2(x1, y1), new vec2(x0, y1), c)
  }

  tri(a: vec2, b: vec2, c: vec2, col: Rgba): void {
    const i = this.n
    this.v(a.x, a.y, col)
    this.v(b.x, b.y, col)
    this.v(c.x, c.y, col)
    this.idx.push(i, i + 1, i + 2)
  }

  disc(cx: number, cy: number, r: number, segs: number, c: Rgba): void {
    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * Math.PI * 2
      const a1 = ((i + 1) / segs) * Math.PI * 2
      this.tri(
        new vec2(cx, cy),
        new vec2(cx + r * Math.cos(a0), cy + r * Math.sin(a0)),
        new vec2(cx + r * Math.cos(a1), cy + r * Math.sin(a1)),
        c,
      )
    }
  }

  // Annular sector between math angles a0 and a1 (radians, counter clockwise, a1 > a0).
  arc(r0: number, r1: number, a0: number, a1: number, c: Rgba): void {
    const steps = Math.max(2, Math.ceil(Math.abs(a1 - a0) / (Math.PI / 36)))
    for (let i = 0; i < steps; i++) {
      const s0 = a0 + ((a1 - a0) * i) / steps
      const s1 = a0 + ((a1 - a0) * (i + 1)) / steps
      this.quad(
        new vec2(r0 * Math.cos(s0), r0 * Math.sin(s0)),
        new vec2(r1 * Math.cos(s0), r1 * Math.sin(s0)),
        new vec2(r1 * Math.cos(s1), r1 * Math.sin(s1)),
        new vec2(r0 * Math.cos(s1), r0 * Math.sin(s1)),
        c,
      )
    }
  }

  // Thin line from a to b with the given thickness.
  line(a: vec2, b: vec2, thick: number, c: Rgba): void {
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.sqrt(dx * dx + dy * dy)
    if (len < 1e-6) return
    const nx = (-dy / len) * (thick / 2)
    const ny = (dx / len) * (thick / 2)
    this.quad(
      new vec2(a.x - nx, a.y - ny),
      new vec2(b.x - nx, b.y - ny),
      new vec2(b.x + nx, b.y + ny),
      new vec2(a.x + nx, a.y + ny),
      c,
    )
  }

  // Attach the accumulated geometry to a new RenderMeshVisual on the given object.
  attach(obj: SceneObject, material: Material): RenderMeshVisual {
    const builder = new MeshBuilder([
      {name: "position", components: 3},
      {name: "normal", components: 3, normalized: true},
      {name: "color", components: 4},
    ])
    builder.topology = MeshTopology.Triangles
    builder.indexType = MeshIndexType.UInt16
    builder.appendVerticesInterleaved(this.verts)
    builder.appendIndices(this.idx)
    const rmv = obj.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    rmv.mesh = builder.getMesh()
    rmv.mainMaterial = material
    builder.updateMesh()
    return rmv
  }
}

export function childObject(parent: SceneObject, name: string, pos?: vec3): SceneObject {
  const o = global.scene.createSceneObject(name)
  o.setParent(parent)
  if (pos) o.getTransform().setLocalPosition(pos)
  return o
}

// Display palette. Additive display: avoid near black for anything that must be seen.
export const PALETTE = {
  mint: [0.45, 0.92, 0.72, 1] as Rgba,
  amber: [1.0, 0.78, 0.28, 1] as Rgba,
  coral: [1.0, 0.45, 0.4, 1] as Rgba,
  neutral: [0.95, 0.97, 1.0, 1] as Rgba,
}

export function toVec4(c: Rgba): vec4 {
  return new vec4(c[0], c[1], c[2], c[3])
}
