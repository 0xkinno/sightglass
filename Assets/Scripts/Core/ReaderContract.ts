// ReaderContract.ts
// The one contract between the camera frame and the model. Shared by the Lens (through Snap's
// Remote Service Gateway) and by the offline evaluation (through the Gemini API directly), so
// both run exactly the same prompt, schema and parser.
//
// The model is asked to POINT, not to READ. It returns pixel positions and whether the dial is
// legible. It may also return its own guess of the value ("modelValue"), which is recorded for
// the comparison in the evaluation and shown to nobody as the answer.

import {DialPoints, Pt} from "./DialGeometry"

export const READER_MODEL = "gemini-2.5-flash"

export const READER_PROMPT = [
  "You are looking at one analog dial gauge, cropped from what a ship's engineer is looking at.",
  "Do not estimate the reading. Locate points on the dial face in pixel coordinates of this image,",
  "origin top left, x to the right, y down. Return JSON only, matching the schema.",
  "center: the pivot of the needle.",
  "needle_tip: the end of the needle that points at the scale (not the tail).",
  "min_mark: the scale mark with the lowest printed value. min_label: that printed value.",
  "max_mark: the scale mark with the highest printed value. max_label: that printed value.",
  "unit: the unit printed on the dial face, or empty if none.",
  "legible: false if glare, fog, dirt, motion blur or framing hides the needle tip or either end mark.",
  "If legible is false, still fill the other fields with your best guess and say why in reason.",
  "model_value: your own reading of the gauge as a number, for comparison only.",
].join("\n")

// Gemini responseSchema (OpenAPI subset). Keep property names snake_case; the parser maps them.
export const READER_SCHEMA = {
  type: "OBJECT",
  properties: {
    legible: {type: "BOOLEAN"},
    reason: {type: "STRING"},
    image_width: {type: "NUMBER"},
    image_height: {type: "NUMBER"},
    center: {type: "OBJECT", properties: {x: {type: "NUMBER"}, y: {type: "NUMBER"}}, required: ["x", "y"]},
    needle_tip: {type: "OBJECT", properties: {x: {type: "NUMBER"}, y: {type: "NUMBER"}}, required: ["x", "y"]},
    min_mark: {type: "OBJECT", properties: {x: {type: "NUMBER"}, y: {type: "NUMBER"}}, required: ["x", "y"]},
    max_mark: {type: "OBJECT", properties: {x: {type: "NUMBER"}, y: {type: "NUMBER"}}, required: ["x", "y"]},
    min_label: {type: "NUMBER"},
    max_label: {type: "NUMBER"},
    unit: {type: "STRING"},
    model_value: {type: "NUMBER"},
  },
  required: ["legible", "center", "needle_tip", "min_mark", "max_mark", "min_label", "max_label"],
}

export interface ReaderOutput {
  legible: boolean
  reason: string
  points: DialPoints
  minLabel: number
  maxLabel: number
  unit: string
  modelValue: number | null
}

export type ParseResult = {ok: true; out: ReaderOutput} | {ok: false; why: string}

function isNum(v: unknown): v is number {
  return typeof v === "number" && isFinite(v)
}

function pt(v: unknown): Pt | null {
  if (v === null || typeof v !== "object") return null
  const o = v as {x?: unknown; y?: unknown}
  if (!isNum(o.x) || !isNum(o.y)) return null
  return {x: o.x, y: o.y}
}

// Strict parse. Anything malformed is a refusal, never a default.
export function parseReader(text: string, imgW: number, imgH: number): ParseResult {
  let raw: unknown
  try {
    const t = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim()
    raw = JSON.parse(t)
  } catch (_e) {
    return {ok: false, why: "model output is not JSON"}
  }
  if (raw === null || typeof raw !== "object") return {ok: false, why: "model output is not an object"}
  const o = raw as Record<string, unknown>
  if (typeof o.legible !== "boolean") return {ok: false, why: "legible missing"}
  const center = pt(o.center)
  const needleTip = pt(o.needle_tip)
  const minMark = pt(o.min_mark)
  const maxMark = pt(o.max_mark)
  if (!center || !needleTip || !minMark || !maxMark) return {ok: false, why: "a point is missing"}
  for (const p of [center, needleTip, minMark, maxMark]) {
    // allow a small margin; a point far outside the crop is a hallucination
    if (p.x < -0.05 * imgW || p.x > 1.05 * imgW || p.y < -0.05 * imgH || p.y > 1.05 * imgH) {
      return {ok: false, why: "a point lies outside the image"}
    }
  }
  if (!isNum(o.min_label) || !isNum(o.max_label)) return {ok: false, why: "scale labels missing"}
  return {
    ok: true,
    out: {
      legible: o.legible,
      reason: typeof o.reason === "string" ? o.reason : "",
      points: {center, needleTip, minMark, maxMark},
      minLabel: o.min_label,
      maxLabel: o.max_label,
      unit: typeof o.unit === "string" ? o.unit : "",
      modelValue: isNum(o.model_value) ? o.model_value : null,
    },
  }
}

// Gemini generateContent body, identical for RSG and the direct API.
export function readerRequestBody(jpegBase64: string) {
  return {
    contents: [
      {
        role: "user",
        parts: [{inlineData: {mimeType: "image/jpeg", data: jpegBase64}}, {text: READER_PROMPT}],
      },
    ],
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: READER_SCHEMA,
    },
  }
}
