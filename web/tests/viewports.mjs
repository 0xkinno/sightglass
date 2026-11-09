// viewports.mjs
// Headless Chrome check of the web door on six viewports, plus the handover flow against a base URL.
// Checks per page and viewport: no horizontal scroll, every text node inside the viewport width, the headline,
// hero instrument, nav and buttons do not overlap, axe finds no serious or critical violation, no console errors.
// Screenshots go to docs/screens/web-<page>-<width>.jpg.
// Usage: node tests/viewports.mjs [baseUrl] [--shots]   (default http://localhost:3100)
import {chromium} from "playwright-core"
import fs from "node:fs"
import path from "node:path"
import {createRequire} from "node:module"

const require = createRequire(import.meta.url)
const axeSource = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8")
const base = process.argv.find((a) => a.startsWith("http")) || "http://localhost:3100"
const shots = process.argv.includes("--shots")
const VIEWPORTS = [
  [393, 852, "iphone"],
  [412, 915, "android"],
  [820, 1180, "tablet"],
  [1366, 768, "laptop"],
  [1440, 900, "desktop"],
  [1920, 1080, "wide"],
]
const PAGES = ["/", "/how", "/proof", "/judge", "/handover"]
const out = path.resolve("../docs/screens")
fs.mkdirSync(out, {recursive: true})

const browser = await chromium.launch({executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true})
const problems = []
const log = []
let checks = 0

function overlap(a, b) {
  return !(a.x + a.width <= b.x + 0.5 || b.x + b.width <= a.x + 0.5 || a.y + a.height <= b.y + 0.5 || b.y + b.height <= a.y + 0.5)
}

for (const [w, h, name] of VIEWPORTS) {
  const ctx = await browser.newContext({viewport: {width: w, height: h}, deviceScaleFactor: 1, reducedMotion: "reduce"})
  for (const p of PAGES) {
    const page = await ctx.newPage()
    const errors = []
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text())
    })
    page.on("pageerror", (e) => errors.push(String(e)))
    const res = await page.goto(base + p, {waitUntil: "networkidle"})
    const tag = `${name} ${w}x${h} ${p}`
    checks++
    if (!res || res.status() >= 400) problems.push(`${tag}: HTTP ${res && res.status()}`)
    // no horizontal scroll
    const sw = await page.evaluate(() => ({sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth}))
    checks++
    if (sw.sw > sw.cw + 1) problems.push(`${tag}: horizontal scroll ${sw.sw} > ${sw.cw}`)
    // every text node inside the viewport width
    const outside = await page.evaluate(() => {
      const bad = []
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
      let n
      while ((n = walker.nextNode())) {
        if (!n.textContent.trim()) continue
        const el = n.parentElement
        if (!el || getComputedStyle(el).visibility === "hidden" || el.closest("[hidden],details:not([open]) ul")) continue
        if (el.closest(".tblwrap, .skip")) continue
        const r = document.createRange()
        r.selectNodeContents(n)
        for (const q of r.getClientRects()) if (q.width > 0 && (q.right > window.innerWidth + 1 || q.left < -1)) bad.push(n.textContent.trim().slice(0, 40))
      }
      return bad.slice(0, 3)
    })
    checks++
    if (outside.length) problems.push(`${tag}: text outside viewport: ${outside.join(" | ")}`)
    // overlap checks on the landing and the other pages' key blocks
    const boxes = await page.evaluate(() => {
      const q = (s) => [...document.querySelectorAll(s)].filter((e) => e.getBoundingClientRect().width > 0).map((e) => {
        const r = e.getBoundingClientRect()
        return {x: r.x, y: r.y + window.scrollY, width: r.width, height: r.height, label: (e.textContent || e.tagName).trim().slice(0, 30)}
      })
      return {nav: q(".nav"), h1: q("h1"), instrument: q(".instrument"), buttons: q(".hero .btn, main .btn"), stats: q(".stats > *")}
    })
    const groups = [...boxes.h1, ...boxes.instrument, ...boxes.buttons, ...boxes.stats]
    for (let i = 0; i < groups.length; i++)
      for (let j = i + 1; j < groups.length; j++) {
        checks++
        if (overlap(groups[i], groups[j])) problems.push(`${tag}: overlap between "${groups[i].label}" and "${groups[j].label}"`)
      }
    // axe
    await page.evaluate(axeSource)
    const ax = await page.evaluate(async () => {
      const r = await window.axe.run(document, {resultTypes: ["violations"]})
      return r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id + " x" + v.nodes.length)
    })
    checks++
    if (ax.length) problems.push(`${tag}: axe ${ax.join(", ")}`)
    checks++
    if (errors.length) problems.push(`${tag}: console errors ${errors.slice(0, 2).join(" | ").slice(0, 200)}`)
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 500) {
        window.scrollTo(0, y)
        await new Promise((r) => setTimeout(r, 40))
      }
      window.scrollTo(0, 0)
    })
    if (shots && (p === "/" || p === "/proof" || p === "/how")) {
      const f = `web-${p === "/" ? "home" : p.slice(1)}-${w}.jpg`
      await page.screenshot({path: path.join(out, f), fullPage: true, type: "jpeg", quality: 72})
      log.push(f)
    }
    await page.close()
  }
  await ctx.close()
}
await browser.close()
console.log(`checks run: ${checks}, problems: ${problems.length}`)
for (const p of problems) console.log("PROBLEM " + p)
if (log.length) console.log("screenshots: " + log.length)
process.exit(problems.length ? 1 : 0)
