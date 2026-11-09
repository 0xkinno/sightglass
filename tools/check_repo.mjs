// check_repo.mjs
// Fails the build when the repo breaks its own rules:
//  1. no em or en dashes, emoji or hype words in README, docs, devpost text, web copy
//  2. no names from reference/banned_names.txt anywhere committed (that file is gitignored)
//  3. LEAF scenario count in Assets/Tests/LeafIndex.ts matches docs/FACTS.json
//  4. every number in README's "Measured" table exists in docs/FACTS.json (best effort)
//  5. no tracked secrets files or local-only folders
import {readFileSync, existsSync, readdirSync, statSync} from "node:fs"
import {execSync} from "node:child_process"
import {join, extname} from "node:path"

const fail = []
const tracked = execSync("git ls-files", {encoding: "utf8"}).split("\n").filter(Boolean)

const TEXT_EXT = new Set([".md", ".ts", ".tsx", ".mjs", ".js", ".json", ".css", ".html", ".yml", ".yaml", ".txt"])
const COPY_GLOBS = (p) =>
  p === "README.md" || p.startsWith("docs/") || p.startsWith("devpost/") || p.startsWith("web/app/") || p.startsWith("web/components/") || /^[A-Z_]+\.md$/.test(p)

const HYPE = ["revolutionary", "paradigm", "cutting-edge", "seamless", "world-class", "zero-trust", "military-grade", "game-changing", "blazing"]
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u

for (const p of tracked) {
  if (p.startsWith("Packages/") || p.includes("node_modules") || !TEXT_EXT.has(extname(p))) continue
  if (!existsSync(p) || statSync(p).size > 2_000_000) continue
  const s = readFileSync(p, "utf8")
  if (COPY_GLOBS(p)) {
    if (/[–—]/.test(s)) fail.push(`${p}: contains an em or en dash`)
    if (EMOJI.test(s)) fail.push(`${p}: contains an emoji`)
    for (const w of HYPE) if (new RegExp(`\\b${w}\\b`, "i").test(s)) fail.push(`${p}: hype word "${w}"`)
  }
}

// 2. banned names (competitor and sample names) live only in a gitignored file
const banned = existsSync("reference/banned_names.txt")
  ? readFileSync("reference/banned_names.txt", "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
  : []
if (tracked.some((p) => p.startsWith("reference/"))) fail.push("reference/ is tracked; it must stay gitignored")
for (const p of tracked) {
  if (p.startsWith("Packages/") || !TEXT_EXT.has(extname(p)) || !existsSync(p)) continue
  const s = readFileSync(p, "utf8").toLowerCase()
  for (const n of banned) if (s.includes(n.toLowerCase())) fail.push(`${p}: mentions a reference project ("${n}")`)
}

// 3 and 4. counts agree with FACTS
if (existsSync("docs/FACTS.json")) {
  const facts = JSON.parse(readFileSync("docs/FACTS.json", "utf8"))
  if (existsSync("Assets/Tests/LeafIndex.ts")) {
    const idx = readFileSync("Assets/Tests/LeafIndex.ts", "utf8")
    const n = (idx.match(/\{\s*id:\s*"/g) || []).length
    if (facts.leaf && facts.leaf.registered !== undefined && facts.leaf.registered !== n) {
      fail.push(`FACTS.leaf.registered is ${facts.leaf.registered} but LeafIndex registers ${n}`)
    }
  }
  if (existsSync("README.md")) {
    const readme = readFileSync("README.md", "utf8")
    const m = readme.split("## Measured")[1]
    if (m) {
      const section = m.split("\n## ")[0]
      const flat = JSON.stringify(facts)
      for (const num of section.match(/\b\d+(?:\.\d+)?%?/g) || []) {
        const bare = num.replace("%", "")
        if (bare.length >= 2 && !flat.includes(bare)) fail.push(`README Measured mentions ${num}, not found in docs/FACTS.json`)
      }
    }
  }
}

// 5. local-only files
for (const p of tracked) {
  if (/(^|\/)\.env(\.|$)/.test(p) && !p.endsWith(".example")) fail.push(`${p}: env file is tracked`)
  if (p.startsWith("eval/data/images/")) fail.push(`${p}: dataset images must not be committed`)
  if (p.includes("/Cache/") || p.endsWith(".mcp.json")) fail.push(`${p}: local Lens Studio file is tracked`)
}

if (fail.length) {
  console.error("check_repo failed:\n" + fail.map((f) => "  - " + f).join("\n"))
  process.exit(1)
}
console.log(`check_repo passed (${tracked.length} tracked files)`)
