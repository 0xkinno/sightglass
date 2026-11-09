// run_eval.ts
// Two arms on the same pre-registered real-world dial images, same model, temperature 0:
//   A  "read it":  the model is asked for the reading (MeasureBench's own question and answer format)
//   B  "point it": the model points (ReaderContract), our DialGeometry computes the value or refuses
// The product additionally takes the scale from the round card a person set. The wild set has no
// round card, so arm B uses the model's own min and max labels here; that is the harder test.
//
// Run from the repo root (needs GEMINI_API_KEY from Google AI Studio):
//   npm i -D tsx @google/genai image-size
//   npx tsx eval/run_eval.ts --arm both --limit 200
// Writes eval/results/<date>/raw.jsonl and summary.json. scripts/facts.ts reads summary.json.

import {readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync} from "node:fs"
import {GoogleGenAI} from "@google/genai"
import {READER_MODEL, READER_PROMPT, READER_SCHEMA, parseReader} from "../Assets/Scripts/Core/ReaderContract"
import {readDial} from "../Assets/Scripts/Core/DialGeometry"

type Interval = [number, number]
interface Item {
  question_id: string
  question: string
  evaluator: string
  evaluator_kwargs: unknown
  width: number
  height: number
}

function argOf(name: string, dflt: string): string {
  const i = process.argv.indexOf("--" + name)
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt
}

// MeasureBench stores accepted answer ranges in evaluator_kwargs. Inspect a few rows first and
// adapt this parser if the shape differs; commit the change before running (pre-registration).
function intervalsOf(kw: unknown): Interval[] {
  const k = typeof kw === "string" ? JSON.parse(kw) : kw
  const out: Interval[] = []
  const take = (v: unknown) => {
    if (Array.isArray(v) && v.length === 2 && typeof v[0] === "number" && typeof v[1] === "number") out.push([v[0], v[1]])
  }
  if (k && typeof k === "object") {
    const o = k as Record<string, unknown>
    if (o.interval) take(o.interval)
    if (Array.isArray(o.intervals)) for (const v of o.intervals) take(v)
    if (o.min !== undefined && o.max !== undefined) take([Number(o.min), Number(o.max)])
  }
  if (out.length === 0) throw new Error("unknown evaluator_kwargs shape: " + JSON.stringify(kw).slice(0, 200))
  return out
}

const within = (v: number, iv: Interval[]) => iv.some(([lo, hi]) => v >= Math.min(lo, hi) && v <= Math.max(lo, hi))

function parseAnswerLine(text: string): number | null {
  const m = text.match(/Answer:\s*(-?[0-9]+(?:\.[0-9]+)?)/i)
  return m ? Number(m[1]) : null
}

async function withRetry<T>(fn: () => Promise<T>, tries = 4): Promise<T> {
  let last: unknown
  for (let i = 0; i < tries; i++) {
    try {
      return await fn()
    } catch (e) {
      last = e
      await new Promise((r) => setTimeout(r, 4000 * (i + 1)))
    }
  }
  throw last
}

async function main() {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error("GEMINI_API_KEY is not set")
  const ai = new GoogleGenAI({apiKey: key})
  const arm = argOf("arm", "both")
  const limit = Number(argOf("limit", "200"))
  const pauseMs = Number(argOf("pause", "6500")) // free tier friendly; lower it on a paid key
  const day = new Date().toISOString().slice(0, 10)
  const dir = `eval/results/${day}`
  if (!existsSync(dir)) mkdirSync(dir, {recursive: true})
  const rawPath = `${dir}/raw.jsonl`

  const items: Item[] = readFileSync("eval/data/items.jsonl", "utf8").trim().split("\n").map((l) => JSON.parse(l)).slice(0, limit)
  let a = {n: 0, answered: 0, correct: 0}
  let b = {n: 0, answered: 0, correct: 0, refused: 0}
  let bRefusedWhereARight = 0
  let bWrongAccepted = 0
  let aWrong = 0

  for (const it of items) {
    const iv = intervalsOf(it.evaluator_kwargs)
    const jpeg = readFileSync(`eval/data/images/${it.question_id}.jpg`).toString("base64")
    const rec: Record<string, unknown> = {question_id: it.question_id, intervals: iv}

    let aRight = false
    if (arm === "both" || arm === "A") {
      const prompt = (it.question || "What is the reading of the instrument?") +
        "\nProvide your final answer on the last line in the format: Answer: <value> <unit>."
      const res = await withRetry(() =>
        ai.models.generateContent({
          model: READER_MODEL,
          contents: [{role: "user", parts: [{inlineData: {mimeType: "image/jpeg", data: jpeg}}, {text: prompt}]}],
          config: {temperature: 0},
        }),
      )
      const v = parseAnswerLine(res.text ?? "")
      a.n++
      if (v !== null) a.answered++
      aRight = v !== null && within(v, iv)
      if (aRight) a.correct++
      else aWrong++
      rec.A = {value: v, right: aRight, text: (res.text ?? "").slice(-200)}
      await new Promise((r) => setTimeout(r, pauseMs))
    }

    if (arm === "both" || arm === "B") {
      const res = await withRetry(() =>
        ai.models.generateContent({
          model: READER_MODEL,
          contents: [{role: "user", parts: [{inlineData: {mimeType: "image/jpeg", data: jpeg}}, {text: READER_PROMPT}]}],
          config: {temperature: 0, responseMimeType: "application/json", responseSchema: READER_SCHEMA as never},
        }),
      )
      b.n++
      const parsed = parseReader(res.text ?? "", it.width, it.height)
      let v: number | null = null
      let why = ""
      if (!parsed.ok) why = "parse: " + parsed.why
      else if (!parsed.out.legible) why = "illegible: " + parsed.out.reason
      else {
        const r = readDial(parsed.out.points, {min: parsed.out.minLabel, max: parsed.out.maxLabel, unit: parsed.out.unit, minorTick: 0})
        if (r.ok) v = r.value
        else why = "geometry: " + r.reason
      }
      if (v === null) {
        b.refused++
        if (aRight) bRefusedWhereARight++
      } else {
        b.answered++
        if (within(v, iv)) b.correct++
        else bWrongAccepted++
      }
      rec.B = {value: v, refused: v === null, why, modelValue: parsed.ok ? parsed.out.modelValue : null}
      await new Promise((r) => setTimeout(r, pauseMs))
    }
    appendFileSync(rawPath, JSON.stringify(rec) + "\n")
    process.stdout.write(".")
  }

  const summary = {
    date: day,
    model: READER_MODEL,
    dataset: "FlagEval/MeasureBench real_world, dial, pre-registered sample (eval/SELECTION.txt)",
    n: items.length,
    armA_read: {...a, accuracy_all: a.n ? a.correct / a.n : null, wrong: aWrong},
    armB_point: {
      ...b,
      accuracy_all: b.n ? b.correct / b.n : null,
      accuracy_when_answered: b.answered ? b.correct / b.answered : null,
      wrong_but_answered: bWrongAccepted,
      refused_where_A_was_right: bRefusedWhereARight,
    },
    note: "Both error directions are reported: wrong answers that would reach a person, and refusals of readable dials.",
  }
  writeFileSync(`${dir}/summary.json`, JSON.stringify(summary, null, 2))
  console.log("\n" + JSON.stringify(summary, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
