// facts.mjs
// Reads the evidence files and the unit test run, and writes docs/FACTS.json and web/lib/facts.json.
// README "Measured", the web /proof page and the video captions use only these numbers.
// Usage: node scripts/facts.mjs
import fs from "node:fs"
import {spawnSync} from "node:child_process"

const read = (p) => (fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "")

function readAcc(path) {
  const rows = []
  for (const l of read(path).split("\n")) {
    if (!l.startsWith("SIGHTGLASS_ACC arm=")) continue
    const o = {}
    for (const m of l.matchAll(/(\w+)=(\S+)/g)) o[m[1]] = m[2]
    rows.push(o)
  }
  return rows
}
const num = (v) => (v === undefined || v === "null" ? null : Number(v))
const med = (xs) => {
  const a = xs.filter((x) => x !== null).sort((p, q) => p - q)
  return a.length ? a[Math.floor(a.length / 2)] : null
}
const mean = (xs) => {
  const a = xs.filter((x) => x !== null)
  return a.length ? a.reduce((s, x) => s + x, 0) / a.length : null
}
const r2 = (x) => (x === null ? null : Math.round(x * 100) / 100)

function summarise(path) {
  const rows = readAcc(path).filter((r) => !r.skipped)
  const arm = (name) => {
    const rs = rows.filter((r) => r.arm === name)
    const legible = rs.filter((r) => r.expectCant !== "true")
    const read = legible.filter((r) => r.kind !== "CANT_READ")
    const err = read.map((r) => Math.abs(num(r.errTicks)))
    const fog = rs.filter((r) => r.expectCant === "true")
    return {
      captures: rs.length,
      legibleCaptures: legible.length,
      read: read.length,
      cantReadOnLegible: legible.length - read.length,
      medianAbsErrTicks: r2(med(err)),
      meanAbsErrTicks: r2(mean(err)),
      maxAbsErrTicks: r2(err.length ? Math.max(...err) : null),
      within1Tick: err.filter((e) => e <= 1).length,
      within2Ticks: err.filter((e) => e <= 2).length,
      medianMs: med(rs.map((r) => num(r.ms))),
      foggedCaptures: fog.length,
      foggedCantRead: fog.filter((r) => r.kind === "CANT_READ").length,
      falseAlarms: legible.filter((r) => r.verdict === "ALARM" && r.gauge !== "ME-LO-IN").length,
    }
  }
  const gauges = [...new Set(rows.map((r) => r.gauge))]
  const perGauge = {}
  for (const g of gauges) {
    const rs = rows.filter((r) => r.gauge === g && r.arm === "hide" && r.kind !== "CANT_READ")
    perGauge[g] = {
      reads: rs.length,
      meanAbsErrTicks: r2(mean(rs.map((r) => Math.abs(num(r.errTicks))))),
      modelValueMeanAbsErrTicks: r2(mean(rs.map((r) => (num(r.modelValue) === null ? null : Math.abs((num(r.modelValue) - num(r.truth)) / num(r.minorTick)))))),
    }
  }
  return {hide: arm("hide"), show: arm("show"), perGauge}
}

const suite = read("devpost/evidence/leaf-p5-suite.log")
const suiteMain = suite.split("# c1 in live mode")[0]
const liveBlock = suite.split("# c1 in live mode")[1] || ""
const passed = (suiteMain.match(/LEAF_INLENS PASSED/g) || []).length
const failedMain = (suiteMain.match(/LEAF_INLENS FAILED/g) || []).length
const pinch = /pinch-targets measured=(\d+) problems=(\d+)/.exec(suite)
const proofs = read("devpost/evidence/break-proofs.log")

const t = spawnSync(process.execPath, ["node_modules/tsx/dist/cli.mjs", "--test", "tests/core.test.ts"], {encoding: "utf8"})
const out = (t.stdout || "") + (t.stderr || "")
const tp = /pass (\d+)/.exec(out)
const tf = /fail (\d+)/.exec(out)

const facts = {
  generatedBy: "scripts/facts.mjs",
  generatedAt: new Date().toISOString(),
  coreTests: {passed: tp ? Number(tp[1]) : null, failed: tf ? Number(tf[1]) : null},
  leaf: {
    scenarios: passed + failedMain,
    passedOnFixtureReader: passed,
    c1Live: /FAILED c1-pinch-dot-reads/.test(liveBlock) ? "failed" : /PASSED c1-pinch-dot-reads/.test(liveBlock) ? "passed" : "not run",
  },
  breakProofs: {planted: (proofs.match(/^## /gm) || []).length, wentRed: (proofs.match(/LEAF_INLENS FAILED/g) || []).length, backToGreen: (proofs.match(/GREEN:[\s\S]*?PASSED/g) || []).length},
  pinchTargets: pinch ? {measured: Number(pinch[1]), problems: Number(pinch[2])} : null,
  send: {
    realPostStatus: /SIGHTGLASS_SEND status=(\d+) ms=\d+ bytes=\d+ ok=true url=https:\/\/sightglass/.exec(suite) ? Number(/SIGHTGLASS_SEND status=(\d+) ms=\d+ bytes=\d+ ok=true url=https:\/\/sightglass/.exec(suite)[1]) : null,
    forcedFailureStatus: /status=(500) ms=\d+ bytes=\d+ ok=false/.exec(suite) ? 500 : null,
  },
  previewReads: {
    shipped: summarise("devpost/evidence/preview-reads.log"),
    scaleHintTried: summarise("devpost/evidence/preview-reads-scale-hint.log"),
  },
  tokensPerRead: null,
  tokensNote: "The gateway response carries no usage count, so tokens are not recorded.",
  wildSet: {run: false, note: "Pre-registered in eval/PREREGISTRATION.md. Not run: it needs a Gemini API key and the MeasureBench download."},
}
fs.mkdirSync("docs", {recursive: true})
fs.writeFileSync("docs/FACTS.json", JSON.stringify(facts, null, 2) + "\n")
fs.mkdirSync("web/lib", {recursive: true})
fs.writeFileSync("web/lib/facts.json", JSON.stringify(facts, null, 2) + "\n")
console.log(JSON.stringify({coreTests: facts.coreTests, leaf: facts.leaf, breakProofs: facts.breakProofs, pinch: facts.pinchTargets, send: facts.send, hide: facts.previewReads.shipped.hide, tried: facts.previewReads.scaleHintTried.hide}, null, 1))
