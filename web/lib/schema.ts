import {z} from "zod"

const num = z.number().finite()
const pt = z.object({x: num, y: num}).strict()
const points = z.object({center: pt, needleTip: pt, minMark: pt, maxMark: pt}).strict()
const verdict = z.enum(["NORMAL", "WATCH", "ALARM"])

export const entrySchema = z
  .object({
    gaugeId: z.string().min(1).max(40),
    state: z.enum(["NOT_READ", "SEEN", "CORRECTED", "BY_EYE"]),
    value: num.nullable(),
    computedValue: num.nullable(),
    verdict: verdict.nullable(),
    frameRef: z.string().max(80).nullable(),
    points: points.nullable(),
    notes: z.array(z.string().max(300)).max(12),
    atMs: num.nullable(),
  })
  .strict()

const unit = z.number().finite().min(-0.05).max(1.05)
const upt = z.object({x: unit, y: unit}).strict()
// Where the reader placed the four points, as fractions of the crop image (0 to 1 across, 0 to 1 down).
export const overlaySchema = z.object({center: upt, needleTip: upt, minMark: upt, maxMark: upt}).strict()

export const ID_RE = /^[A-Za-z0-9._-]{3,80}$/

export const sheetSchema = z
  .object({
    schema: z.literal("sightglass.round.v1"),
    roundId: z.string().regex(ID_RE),
    planId: z.string().max(80),
    planName: z.string().max(120),
    startedAtMs: num,
    signedAtMs: num,
    decision: z.enum(["READY", "HOLD"]),
    escalation: z.string().max(200).nullable(),
    signer: z.string().min(1).max(80),
    entries: z.array(entrySchema).min(1).max(40),
    counts: z.object({seen: num, corrected: num, byEye: num, alarm: num, watch: num}).strict(),
    source: z.enum(["lens-studio-preview", "specs-device"]),
  })
  .strict()

export const MAX_BODY_BYTES = 2 * 1024 * 1024
export const MAX_FRAME_CHARS = 400_000 // base64 chars per frame
export const MAX_FRAMES = 12

export const postSchema = z
  .object({
    sheet: sheetSchema,
    digest: z.string().regex(/^[0-9a-f]{64}$/),
    // frameRef -> data URL of the crop that was sent to the reader (jpeg or png)
    frames: z
      .record(z.string().max(80), z.string().max(MAX_FRAME_CHARS).regex(/^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/))
      .refine((r) => Object.keys(r).length <= MAX_FRAMES, "too many frames")
      .optional(),
    // frameRef -> points as fractions of the crop. Outside the digest, like the frames.
    overlays: z
      .record(z.string().max(80), overlaySchema)
      .refine((r) => Object.keys(r).length <= MAX_FRAMES, "too many overlays")
      .optional(),
  })
  .strict()

export const countersignSchema = z
  .object({
    digest: z.string().regex(/^[0-9a-f]{64}$/),
    role: z.string().trim().min(1).max(80),
    note: z.string().trim().max(500).optional(),
  })
  .strict()

export interface Countersign {
  role: string
  note: string
  atMs: number
}

export interface StoredRound {
  digest: string
  receivedAtMs: number
  sheet: z.infer<typeof sheetSchema>
  frames: Record<string, string>
  overlays?: Record<string, z.infer<typeof overlaySchema>>
  countersigns: Countersign[]
  recorded?: boolean
}
