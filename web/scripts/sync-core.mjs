// Copies the Core files the door needs from Assets/Scripts/Core so the door and the Lens verify the
// same digest. Vercel builds from web/ only, so the copies are committed. Run: npm run sync-core
// Use --check to fail when a copy differs from the source.
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(here, "../../Assets/Scripts/Core");
const dst = path.resolve(here, "../lib/core");
const check = process.argv.includes("--check");
if (!fs.existsSync(src)) {
  console.log("sync-core: source not found (building from web/ only), using committed copies");
  process.exit(0);
}
let bad = 0;
for (const f of fs.readdirSync(src).filter((n) => n.endsWith(".ts"))) {
  const a = fs.readFileSync(path.join(src, f), "utf8");
  const p = path.join(dst, f);
  const b = fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null;
  if (a !== b) {
    if (check) { console.error("differs:", f); bad++; } else fs.writeFileSync(p, a);
  }
}
if (bad) process.exit(1);
console.log(check ? "sync-core: copies match" : "sync-core: copied");
